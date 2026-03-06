import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * Custom hook for Supabase realtime subscription with robust reconnection logic
 * 
 * Features:
 * - Listens for database changes (INSERT, UPDATE, DELETE)
 * - Monitors connection status (SUBSCRIBED, CLOSED, CHANNEL_ERROR)
 * - Exponential backoff with jitter for reconnection
 * - Connection stability detection
 * - Grace period for React's double-invoke in development mode
 * - Stable channel name to prevent creating new channels on reconnect
 * - Individual subscription per table (required for Supabase realtime)
 */
export const useSupabaseRealtime = ({ 
  tables = [], 
  onDataChange = () => {},
  enabled = true 
}) => {
  // Refs for managing state without triggering re-renders
  const channelsRef = useRef([]);
  const isReconnecting = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const isUnmounted = useRef(false);
  const reconnectAttempts = useRef(0);
  const connectionStable = useRef(false);
  const initialConnectionMade = useRef(false);
  const gracePeriodTimer = useRef(null);
  
  const maxReconnectAttempts = 10;
  const baseDelay = 2000; // 2 seconds base delay
  const maxDelay = 30000; // 30 seconds max delay
  const gracePeriodMs = 1500; // 1.5 seconds grace period for React's double-invoke

  // State for debugging/UI
  const [connectionStatus, setConnectionStatus] = useState("CLOSED");

  // Calculate exponential backoff with jitter
  const getBackoffDelay = useCallback(() => {
    const exponentialDelay = baseDelay * Math.pow(2, reconnectAttempts.current);
    const jitter = Math.random() * 1000; // 0-1 second random jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
  }, []);

  // Clean up existing channels
  const cleanupChannels = useCallback(() => {
    if (channelsRef.current.length > 0) {
      console.log("[Realtime] Cleaning up old channels...", channelsRef.current.length);
      try {
        // Remove all channels
        channelsRef.current.forEach(channel => {
          supabase.removeChannel(channel);
        });
      } catch (err) {
        console.warn("[Realtime] Error removing channels:", err);
      }
      channelsRef.current = [];
    }
    
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear grace period timer
    if (gracePeriodTimer.current) {
      clearTimeout(gracePeriodTimer.current);
      gracePeriodTimer.current = null;
    }
  }, []);

  // Check if we should attempt reconnection
  const shouldReconnect = useCallback(() => {
    if (isUnmounted.current) {
      console.log("[Realtime] Skipping reconnect - component unmounted");
      return false;
    }
    
    if (isReconnecting.current) {
      console.log("[Realtime] Reconnect already in progress, skipping...");
      return false;
    }
    
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.warn("[Realtime] Max reconnect attempts reached, stopping...");
      return false;
    }
    
    return true;
  }, []);

  // Initialize or reinitialize the realtime channels (one per table)
  const initRealtime = useCallback(() => {
    if (!shouldReconnect()) {
      return;
    }

    // Clean up any existing channels before creating new ones
    cleanupChannels();

    // Mark as reconnecting
    isReconnecting.current = true;
    reconnectAttempts.current += 1;

    console.log(`[Realtime] Initializing channels (attempt ${reconnectAttempts.current}/${maxReconnectAttempts}) for tables:`, tables);

    // Use a STABLE channel name based on tables only
    // This ensures we reuse the same channels on reconnect attempts
    const tablesSorted = [...tables].sort().join("-");
    const channelName = `asset-system-${tablesSorted}`;

    // If we already have a successful connection, try to reuse the channels
    if (channelsRef.current.length > 0 && connectionStable.current) {
      console.log("[Realtime] Reusing existing stable channels");
      isReconnecting.current = false;
      return;
    }

    // Create individual channels for each table
    // Supabase realtime requires specific table names (not wildcards)
    const newChannels = [];
    let subscribedCount = 0;
    let hasError = false;

    tables.forEach((tableName) => {
      // Create a unique channel name for each table
      const tableChannelName = `${channelName}-${tableName}`;
      
      const channel = supabase.channel(tableChannelName, {
        config: {
          broadcast: { self: false },
        },
      });

      // Set up event handlers for each table
      channel
        // Handle status changes
        .on("system", { event: "*" }, (payload) => {
          // Supabase sometimes sends error events even when subscribed - ignore if we have subscription
          if (payload.status === "error" && payload.message?.includes("Unable to subscribe")) {
            // This is a known Supabase quirk - subscription may still work
            console.log(`[Realtime] System event (ignored) for ${tableName}:`, payload.message);
            return;
          }
          console.log(`[Realtime] System event for ${tableName}:`, payload);
        })
        // Subscribe to database changes for THIS SPECIFIC TABLE
        .on(
          "postgres_changes",
          {
            event: "*", // Listen for all events (INSERT, UPDATE, DELETE)
            schema: "public",
            table: tableName, // SPECIFIC TABLE - this is the fix!
          },
          (payload) => {
            console.log(`[Realtime] Database change detected in ${tableName}:`, payload);
            
            // Trigger the callback with the change info
            onDataChange({
              table: tableName,
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              payload,
            });
          }
        )
        // Subscribe with status callbacks
        .subscribe((status) => {
          console.log(`[Realtime] Channel ${tableName} status:`, status);
          
          // Update overall status based on all channels
          if (status === "SUBSCRIBED") {
            subscribedCount++;
            // Check if all channels are subscribed
            if (subscribedCount === tables.length) {
              setConnectionStatus("SUBSCRIBED");
              console.log("[Realtime] All channels successfully connected!");
              isReconnecting.current = false;
              reconnectAttempts.current = 0;
              connectionStable.current = true;
              initialConnectionMade.current = true;
            }
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (!hasError) {
              hasError = true;
              setConnectionStatus(status);
              connectionStable.current = false;
              
              // Only schedule reconnect if we've already had an initial connection
              // or if this is the first attempt that failed
              if (initialConnectionMade.current) {
                scheduleReconnect();
              } else {
                console.log(`[Realtime] Initial connection failed for ${tableName}, retrying...`);
                isReconnecting.current = false;
                scheduleReconnect();
              }
            }
          }
        });

      newChannels.push(channel);
    });

    // Store channel references
    channelsRef.current = newChannels;

    // Helper function to schedule reconnection
    function scheduleReconnect() {
      if (!shouldReconnect()) {
        return;
      }

      // Clean up the closed channels
      cleanupChannels();

      // Mark as reconnecting
      isReconnecting.current = true;
      
      const delay = getBackoffDelay();
      console.log(`[Realtime] Scheduling reconnect in ${Math.round(delay/1000)}s (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);

      // Wait before reconnecting
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmounted.current) {
          console.log("[Realtime] Executing scheduled reconnect...");
          isReconnecting.current = false; // Reset flag before calling initRealtime
          initRealtime();
        }
      }, delay);
    }
  }, [tables, onDataChange, cleanupChannels, shouldReconnect, getBackoffDelay]);

  // Initialize the realtime subscription
  useEffect(() => {
    // Don't initialize if disabled or no tables specified
    if (!enabled || tables.length === 0) {
      console.log("[Realtime] Disabled or no tables to listen to");
      return;
    }

    console.log("[Realtime] Setting up realtime subscription for tables:", tables);
    
    // Set the unmount flag to false
    isUnmounted.current = false;
    
    // Apply grace period to handle React's double-invoke in development mode
    // This gives time for the initial mount effects to settle before connecting
    gracePeriodTimer.current = setTimeout(() => {
      if (!isUnmounted.current && !initialConnectionMade.current) {
        console.log("[Realtime] Grace period ended, initializing connection...");
        initRealtime();
      }
    }, gracePeriodMs);

    // Cleanup on unmount
    return () => {
      console.log("[Realtime] Cleaning up realtime subscription...");
      isUnmounted.current = true;
      cleanupChannels();
    };
  }, [tables.join(","), enabled]); // Re-run if tables change

  // Force reconnect method
  const forceReconnect = useCallback(() => {
    console.log("[Realtime] Force reconnect requested");
    reconnectAttempts.current = 0;
    isReconnecting.current = false;
    connectionStable.current = false;
    initialConnectionMade.current = false;
    cleanupChannels();
    // Use setTimeout to ensure cleanup completes first
    setTimeout(() => {
      initRealtime();
    }, 100);
  }, [cleanupChannels, initRealtime]);

  // Return methods for manual control
  return {
    // Force reconnect manually
    reconnect: forceReconnect,
    // Get current connection status
    isConnected: () => {
      return channelsRef.current.length > 0 && connectionStable.current;
    },
    // Get status for debugging/UI
    getStatus: () => connectionStatus,
  };
};

export default useSupabaseRealtime;

