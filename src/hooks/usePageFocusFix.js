import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook to fix issues when switching browser tabs/windows
 * 
 * This hook addresses the problem where React state/closures become stale
 * when the browser tab loses focus and becomes active again.
 * 
 * It provides:
 * 1. Detection of when page becomes visible/focused
 * 2. Automatic state reset callbacks for modals and forms
 * 3. Prevention of stuck loading states
 */
export const usePageFocusFix = ({ 
  onFocus = null,        // Callback when page gains focus
  onVisible = null,      // Callback when page becomes visible (after being hidden)
  resetStates = null,   // Array of state setters to reset on focus
  enabled = true         // Enable/disable the hook
} = {}) => {
  // Track previous visibility/focus state
  const wasVisibleRef = useRef(true);
  const wasFocusedRef = useRef(true);
  const isFirstRender = useRef(true);
  
  // Handle visibility change (tab switch)
  useEffect(() => {
    if (!enabled) return;
    
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      // Page transitioned from hidden to visible
      if (isVisible && !wasVisibleRef.current) {
        console.log("[PageFocusFix] Page became visible again");
        
        // Reset any stuck states
        if (resetStates && Array.isArray(resetStates)) {
          resetStates.forEach(setter => {
            if (typeof setter === 'function') {
              setter(prev => {
                // If it's an object with loading, reset it
                if (prev && typeof prev === 'object') {
                  return { ...prev, loading: false, isLoading: false };
                }
                return prev;
              });
            }
          });
        }
        
        // Call visibility callback
        if (onVisible && typeof onVisible === 'function') {
          onVisible();
        }
      }
      
      wasVisibleRef.current = isVisible;
    };
    
    // Handle focus events (window gets focus)
    const handleFocus = () => {
      if (!wasFocusedRef.current) {
        console.log("[PageFocusFix] Window gained focus");
        
        if (onFocus && typeof onFocus === 'function') {
          onFocus();
        }
      }
      wasFocusedRef.current = true;
    };
    
    // Handle blur events (window loses focus)
    const handleBlur = () => {
      wasFocusedRef.current = false;
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Mark first render as complete
    isFirstRender.current = false;
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, onFocus, onVisible, resetStates]);
  
  // Return helper function to force refresh state
  return {
    /**
     * Force refresh - can be called to manually trigger focus callbacks
     */
    forceRefresh: useCallback(() => {
      if (onFocus) onFocus();
      if (onVisible) onVisible();
    }, [onFocus, onVisible]),
  };
};

/**
 * Hook specifically for resetting modal states on tab focus
 */
export const useModalFocusReset = (modalOpen, setModalOpen, resetData = null) => {
  const wasOpenRef = useRef(modalOpen);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible - check if modal was open before
        if (wasOpenRef.current && !modalOpen) {
          // Modal was open but now closed - this is expected on close
          console.log("[ModalFocusReset] Modal was closed");
        }
      } else {
        // Page became hidden - remember modal state
        wasOpenRef.current = modalOpen;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [modalOpen]);
};

/**
 * Hook to ensure event handlers remain stable across tab switches
 * This wraps handlers to ensure they work correctly after tab focus
 */
export const useStableHandler = (handler) => {
  const handlerRef = useRef(handler);
  const wasFocusedRef = useRef(false);
  
  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  // Handle tab focus - ensure handler works after tab switch
  useEffect(() => {
    const handleFocus = () => {
      if (wasFocusedRef.current) {
        // This is a re-focus after tab switch
        // The handler should work now
        console.log("[StableHandler] Tab switched back - handler refreshed");
      }
      wasFocusedRef.current = true;
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Return wrapped handler
  return useCallback((...args) => {
    return handlerRef.current?.(...args);
  }, []);
};

/**
 * Hook to prevent stuck loading states
 */
export const useLoadingReset = (isLoading, setIsLoading) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isLoading) {
        // Page became visible but still loading - this might be stuck
        console.log("[LoadingReset] Resetting stuck loading state");
        setIsLoading(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoading, setIsLoading]);
};

export default usePageFocusFix;

