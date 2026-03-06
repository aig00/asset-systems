import React, { useEffect, useState, useRef, useCallback } from "react";
import ExcelJS from "exceljs";
import { SpeedInsights } from "@vercel/speed-insights/react";
import NCT_logong from "../assets/NCT_logong.png";
import { useTabVisibility } from "../hooks/useTabVisibility";
import {
  LayoutDashboard,
  Table,
  ClipboardList,
  LogOut,
  TrendingUp,
  Package,
  Trash2,
  BarChart3,
  Plus,
  Download,
  ChevronRight,
  X,
  Lock,
  Moon,
  Sun,
  Mail,
  Shield,
  User,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../supabaseClient";
import useSupabaseRealtime from "../hooks/useSupabaseRealtime";
import AddAssetForm from "../components/AddAssetForm";
import AssetSummary from "../components/AssetSummary";
import DashboardCharts from "../components/DashboardCharts";
import DownpaymentTable from "../components/DownpaymentTable";
import { SignOutModal } from "./SignOutModal";

const Dashboard = () => {
const { user, role, verifyPin, checkPinLockStatus } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const isPageVisible = useTabVisibility();
  
  // Track pending requests to avoid stale states
  const abortControllersRef = useRef({
    assets: null,
    transactions: null,
    logs: null,
  });
  
  const [assets, setAssets] = useState([]);
  const [transactions, setTransactions] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [stats, setStats] = useState({
    totalValue: 0,
    active: 0,
    disposed: 0,
    depreciation: 0,
  });
  const [logs, setLogs] = useState([]);
  const [currentView, setCurrentView] = useState("dashboard");
  const [showAmortization, setShowAmortization] = useState(false);
  const [amortizationDates, setAmortizationDates] = useState({
    start: "2026-02",
    end: "2027-12",
  });
  
  // Track paid months in dashboard amortization schedule
  const [paidMonths, setPaidMonths] = useState(new Set());
  
  // Reset paid months when amortization modal opens
  useEffect(() => {
    if (showAmortization) {
      setPaidMonths(new Set());
    }
  }, [showAmortization]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAction, setPinAction] = useState("");
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  // Fetch transactions from the new table
  const fetchTransactions = async () => {
    try {
      // Cancel any pending requests
      if (abortControllersRef.current.transactions) {
        abortControllersRef.current.transactions.abort();
      }
      
      const { data, error } = await supabase
        .from("downpayment_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        return;
      }

      // Group transactions by asset_id
      const grouped = {};
      data.forEach((txn) => {
        if (!grouped[txn.asset_id]) {
          grouped[txn.asset_id] = [];
        }
        grouped[txn.asset_id].push(txn);
      });
      setTransactions(grouped);
    } catch (err) {
      console.error("Unexpected error in fetchTransactions:", err);
    }
  };

  // Calculate total downpayment for an asset (from transactions + legacy)
  const getTotalDownpayment = (asset) => {
    const assetTransactions = transactions[asset.id] || [];
    const txnTotal = assetTransactions.reduce(
      (sum, txn) => sum + (parseFloat(txn.amount) || 0),
      0
    );
    const legacyTotal = parseFloat(asset.downpayment_amount) || 0;
    return txnTotal + legacyTotal;
  };

  // Set default view based on role - accountant can only access assets
  useEffect(() => {
    if (role === "accountant") {
      setCurrentView("summary");
    }
  }, [role]);

  // OPTIMIZATION: Memoize amortization schedule to avoid recalculating on every render
  // This function was being called 3 times per render in the modal
  const amortizationSchedule = React.useMemo(() => {
    if (!amortizationDates.start || !amortizationDates.end) return [];

    const start = new Date(amortizationDates.start);
    const end = new Date(amortizationDates.end);
    const schedule = [];

    // Normalize to start of month
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endTime = new Date(end.getFullYear(), end.getMonth(), 1).getTime();

    while (current.getTime() <= endTime) {
      let monthlyTotal = 0;

      assets.forEach((asset) => {
        if (asset.status !== "Active" || !asset.purchase_date) return;

        // Parse purchase date as local to avoid timezone issues and ensure start is next month
        const [pYear, pMonth] = asset.purchase_date.split("-").map(Number);
        const startDepreciationDate = new Date(pYear, pMonth, 1); // pMonth is 1-based, so this creates 1st of next month

        const lifeYears = parseFloat(asset.useful_life_years) || 0;
        if (lifeYears <= 0) return;

        const endDepreciationDate = new Date(startDepreciationDate);
        endDepreciationDate.setFullYear(
          endDepreciationDate.getFullYear() + lifeYears,
        );

        if (current >= startDepreciationDate && current < endDepreciationDate) {
          const cost = parseFloat(asset.total_cost) || 0;
          const salvage = parseFloat(asset.salvage_value) || 0;
          const monthlyDep = (cost - salvage) / (lifeYears * 12);
          monthlyTotal += monthlyDep;
        }
      });

      schedule.push({
        date: current.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        amount: monthlyTotal,
      });

      current.setMonth(current.getMonth() + 1);
    }
    return schedule;
  }, [assets, amortizationDates.start, amortizationDates.end]);

  // OPTIMIZATION: Memoize amortization total to avoid recalculating
  const amortizationTotal = React.useMemo(() => {
    return amortizationSchedule.reduce((sum, item) => sum + item.amount, 0);
  }, [amortizationSchedule]);

  const fetchAssets = async (isBackground = false) => {
    // Only show loading overlay if it's not a background fetch or if we have no data yet
    const shouldShowLoading = !isBackground || assets.length === 0;
    if (shouldShowLoading) setIsDataLoading(true);
    try {
      // Cancel any pending requests
      if (abortControllersRef.current.assets) {
        abortControllersRef.current.assets.abort();
      }
      
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching assets:", error);
        setIsDataLoading(false);
        return;
      }
      
      // Auto-transfer logic: Check for assets that reached 100% payment
      // and automatically change status from Pending to Active
      const pendingUpdates = [];
      for (const asset of data) {
        // Calculate total downpayment from transactions
        const assetTransactions = transactions[asset.id] || [];
        const txnTotal = assetTransactions.reduce(
          (sum, txn) => sum + (parseFloat(txn.amount) || 0),
          0
        );
        const legacyTotal = parseFloat(asset.downpayment_amount) || 0;
        const totalDownpayment = txnTotal + legacyTotal;
        
        const totalCost = parseFloat(asset.total_cost) || 0;
        const paymentCompletion = totalCost > 0 ? (totalDownpayment / totalCost) * 100 : 0;
        
        // If payment is 100% and status is still Pending, auto-transfer to Active
        if (paymentCompletion >= 100 && asset.status === "Pending") {
          pendingUpdates.push(asset.id);
        }
      }
      
      // Perform auto-transfer updates
      let finalData = data;
      if (pendingUpdates.length > 0) {
        for (const assetId of pendingUpdates) {
          const { error: updateError } = await supabase
            .from("assets")
            .update({ status: "Active" })
            .eq("id", assetId);
          
          if (updateError) {
            console.error("Error auto-transferring asset:", updateError);
          }
        }
        
        // Re-fetch only if updates were made
        const { data: updatedData, error: refetchError } = await supabase
          .from("assets")
          .select("*")
          .order("created_at", { ascending: false });
        
        finalData = refetchError ? data : updatedData;
      }
      
      setAssets(finalData);
      calculateStats(finalData);
    } catch (err) {
      console.error("Unexpected error in fetchAssets:", err);
      // Keep previous data on error to avoid blank screen
    } finally {
      setIsDataLoading(false);
      if (shouldShowLoading) setIsDataLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalValue = data.reduce(
      (sum, item) => sum + (parseFloat(item.total_cost) || 0),
      0,
    );
    const active = data.filter((i) => i.status === "Active").length;
    const disposed = data.filter((i) => i.status === "Disposed").length;
    const depreciation = data
      .filter((i) => i.status === "Active")
      .reduce((sum, item) => {
        const cost = parseFloat(item.total_cost) || 0;
        const salvage = parseFloat(item.salvage_value) || 0;
        const life = parseInt(item.useful_life_years) || 1;
        return sum + (cost - salvage) / life;
      }, 0);
    setStats({ totalValue, active, disposed, depreciation });
  };

const fetchLogs = async () => {
    try {
      // Cancel any pending requests
      if (abortControllersRef.current.logs) {
        abortControllersRef.current.logs.abort();
      }
      
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching logs:", error);
        return;
      }
      
      // Filter out INSERT action type from logs
      const filteredLogs = (data || []).filter(log => log.action_type !== "INSERT");
      setLogs(filteredLogs);
    } catch (err) {
      console.error("Unexpected error in fetchLogs:", err);
    }
  };

  const handleLogout = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.from("logs").insert({
        user_email: user?.email,
        action_type: "LOGOUT",
        details: {
          logout_time: new Date().toISOString(),
          message: "User logged out",
        },
      });
      sessionStorage.removeItem("hasLoggedLogin");
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
      setShowSignOutModal(false);
    }
  };

  const exportLogs = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("System Logs");
    
    // Add headers
    worksheet.columns = [
      { header: "Timestamp", key: "created_at", width: 20 },
      { header: "User", key: "user_email", width: 30 },
      { header: "Action", key: "action_type", width: 15 },
      { header: "Details", key: "details", width: 40 },
    ];
    
    // Add data
    logs.forEach((log) => {
      worksheet.addRow({
        created_at: new Date(log.created_at).toLocaleString(),
        user_email: log.user_email,
        action_type: log.action_type,
        details: JSON.stringify(log.details),
      });
    });
    
    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "System_Logs.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const deleteLogs = async () => {
    if (!window.confirm("Are you sure you want to PERMANENTLY DELETE all system logs? This action cannot be undone.")) return;

    const { error } = await supabase
      .from("logs")
      .delete()
      .neq("id", 0);

    if (error) {
      console.error("Error deleting logs:", error);
      alert("Failed to delete logs");
    } else {
      await supabase.from("logs").insert({ 
        user_email: user?.email, 
        action_type: "DELETE_LOGS",
        details: { message: "All logs cleared by admin" }
      });
      fetchLogs();
    }
  };

const handleExportClick = () => {
    if (role !== "admin" && role !== "head")
      return alert("Access Restricted: Only Admin or Head can export logs.");
    
    // Check if account is locked
    const lockStatus = checkPinLockStatus();
    if (lockStatus.isLocked) {
      setPinError(`Account locked. Try again in ${lockStatus.remainingTime}`);
      return;
    }
    
    setPinAction("export");
    setShowPinModal(true);
    setPinInput("");
    setPinError("");
  };

  const handleDeleteLogsClick = () => {
    if (role !== "admin")
      return alert("Access Restricted: Only Admin can delete logs.");
    
    const lockStatus = checkPinLockStatus();
    if (lockStatus.isLocked) {
      setPinError(`Account locked. Try again in ${lockStatus.remainingTime}`);
      return;
    }
    
    setPinAction("delete");
    setShowPinModal(true);
    setPinInput("");
    setPinError("");
  };

  const verifyPinAndAction = async () => {
    if (!pinInput || pinInput.length !== 4) {
      setPinError("Please enter a 4-digit PIN");
      return;
    }

    // Use secure PIN verification from AuthContext
    const result = await verifyPin(pinInput);
    
    if (result.success) {
      if (pinAction === "export") {
        exportLogs();
      } else if (pinAction === "delete") {
        deleteLogs();
      }
      setShowPinModal(false);
    } else {
      setPinError(result.error || "Incorrect PIN. Please try again.");
    }
  };

// OPTIMIZATION 7: Combined useEffect for initial data fetching and login recording
  useEffect(() => {
    const initializeData = async () => {
      // Fetch initial data
      fetchAssets();
      fetchTransactions();
      fetchLogs();
      
// Record login (only once per session)
      if (user?.email && !sessionStorage.getItem("hasLoggedLogin")) {
        await supabase
          .from("logs")
          .insert({ 
            user_email: user.email, 
            action_type: "LOGIN",
            details: {
              login_time: new Date().toISOString(),
              message: "User logged in"
            }
          });
        sessionStorage.setItem("hasLoggedLogin", "true");
        fetchLogs();
      }
    };
    
    initializeData();
  }, [role, user]);

  // Track previous visibility state to detect when tab becomes visible again
  const prevIsPageVisibleRef = useRef(isPageVisible);
  
  // OPTIMIZATION 8: Auto-refresh data when tab becomes visible
  // Fallback: If realtime connection is lost or not working, refresh on tab visibility
  useEffect(() => {
    // Only refresh when tab transitions from hidden to visible
    if (isPageVisible && !prevIsPageVisibleRef.current && assets.length > 0) {
      // Page just became visible - refresh data as fallback for realtime
      console.log("Page became visible - refreshing data (fallback for realtime)");
      fetchAssets();
      fetchTransactions();
      fetchLogs();
    }
    // Update previous visibility state
    prevIsPageVisibleRef.current = isPageVisible;
  }, [isPageVisible]);

  // ═══════════════════════════════════════════════════════════════
  // SUPABASE REALTIME SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════
  
  // Handle database changes from realtime subscription
  const handleRealtimeChange = useCallback((change) => {
    const { table, eventType, new: newRecord, old: oldRecord } = change;
    console.log(`[Realtime] ${table} table changed: ${eventType}`, { newRecord, oldRecord });
    
    // Add a small delay to ensure database has processed the change
    setTimeout(() => {
      // Refresh relevant data based on which table changed
      switch (table) {
        case "assets":
          console.log("[Realtime] Refreshing assets...");
          fetchAssets(true); // true = background fetch (no loading indicator)
          break;
        case "logs":
          console.log("[Realtime] Refreshing logs...");
          fetchLogs();
          break;
        case "downpayment_transactions":
          console.log("[Realtime] Refreshing transactions...");
          fetchTransactions();
          break;
        default:
          // Refresh all data for unknown changes
          console.log("[Realtime] Refreshing all data...");
          fetchAssets(true);
          fetchTransactions();
          fetchLogs();
      }
    }, 300); // Small delay to ensure DB has committed
  }, [fetchAssets, fetchLogs, fetchTransactions]);

  // Initialize realtime subscription
  useSupabaseRealtime({
    tables: ["assets", "logs", "downpayment_transactions"],
    onDataChange: handleRealtimeChange,
    enabled: !!user, // Only enable when user is authenticated
  });

  // Role-based navigation items
  const allNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "summary", label: "Asset", icon: Table },
    { id: "downpayment", label: "Downpayment", icon: TrendingUp },
    { id: "logs", label: "Logs", icon: ClipboardList, adminOnly: true },
  ];

  // Filter nav items based on role
  const navItems = allNavItems.filter(item => !item.adminOnly || role === "admin");

  const actionTypeColor = (type) => {
    if (
      type === "DELETE_ASSET" ||
      type === "DISPOSE_ASSET" ||
      type === "LOGOUT" ||
      type === "DELETE_LOGS"
    )
      return "log-badge-red";
    if (type === "CREATE_ASSET" || type === "LOGIN") return "log-badge-green";
    if (type === "TRANSFER_ASSET") return "log-badge-amber";
    return "log-badge-gray";
  };

  const statCards = [
    {
      label: "Total Asset Value",
      value: `₱${stats.totalValue.toLocaleString()}`,
      icon: TrendingUp,
      badge: "TOTAL",
      iconGradient: "linear-gradient(135deg, #dc2626, #f87171)",
      cardAccent: "linear-gradient(90deg, #dc2626, #f87171)",
      badgeColor: "#dc2626",
      badgeBg: "#fef2f2",
      badgeBorder: "#fecaca",
    },
    {
      label: "Active Assets",
      value: stats.active,
      icon: Package,
      badge: "LIVE",
      iconGradient: "linear-gradient(135deg, #ef4444, #f43f5e)",
      cardAccent: "linear-gradient(90deg, #ef4444, #fb7185)",
      badgeColor: "#ef4444",
      badgeBg: "#fff1f1",
      badgeBorder: "#fecaca",
    },
    {
      label: "Disposed Assets",
      value: stats.disposed,
      icon: Trash2,
      badge: "RETIRED",
      iconGradient: "linear-gradient(135deg, #b91c1c, #dc2626)",
      cardAccent: "linear-gradient(90deg, #b91c1c, #ef4444)",
      badgeColor: "#b91c1c",
      badgeBg: "#fff5f5",
      badgeBorder: "#fecaca",
    },
    {
      label: "Annual Depreciation",
      value: `₱${stats.depreciation.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      icon: BarChart3,
      badge: "YEARLY",
      iconGradient: "linear-gradient(135deg, #991b1b, #b91c1c)",
      cardAccent: "linear-gradient(90deg, #991b1b, #dc2626)",
      badgeColor: "#991b1b",
      badgeBg: "#fff5f5",
      badgeBorder: "#fecaca",
      onClick: () => setShowAmortization(true),
    },
  ];

  return (
    <>
      <SpeedInsights />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #root {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .dash-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          width: 100%;
          background: #faf8f8;
          background-image:
            radial-gradient(ellipse 900px 600px at 95% -5%, rgba(220,38,38,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 700px 450px at 85% 0%, rgba(254,226,226,0.5) 0%, transparent 65%),
            radial-gradient(ellipse 500px 350px at 0% 100%, rgba(255,241,241,0.4) 0%, transparent 65%),
            radial-gradient(ellipse 600px 400px at 50% 60%, rgba(220,38,38,0.02) 0%, transparent 60%);
        }
        .dash-title { font-family: 'Syne', sans-serif; }

        /* ── NAV - LEFT SIDEBAR FLOATING CARD ── */
        .nav-bar {
          position: fixed; top: 20px; left: 20px; z-index: 50;
          width: 260px;
          height: calc(100vh - 40px);
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(220,38,38,0.12);
          box-shadow: 
            0 4px 24px rgba(220,38,38,0.12),
            0 12px 48px rgba(0,0,0,0.08);
          display: flex; flex-direction: column;
          overflow-y: auto;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-bar:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 8px 32px rgba(220,38,38,0.15),
            0 16px 64px rgba(0,0,0,0.12);
        }
        .nav-inner {
          width: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          padding: 20px 16px;
        }
        .nav-top {
          display: flex; flex-direction: column; align-items: center;
          padding-bottom: 20px; border-bottom: 1px solid #fde8e8;
          margin-bottom: 16px;
        }
        .nav-bottom {
          margin-top: auto;
          padding-top: 16px; border-top: 1px solid #fde8e8;
        }
        
        .brand { 
          display: flex; flex-direction: column; align-items: center; gap: 12px; 
          text-decoration: none; flex-shrink: 0; padding: 8px 0;
        }
.brand-mark {
          width: 72px; height: 72px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }
        .brand-mark:hover {
          transform: scale(1.05);
        }
        .brand-mark img {
          filter: drop-shadow(0 2px 4px rgba(220,38,38,0.2));
        }
        .brand-mark span {
          font-family: 'Syne', sans-serif;
          font-size: 20px; font-weight: 800; color: #fff;
        }
        .brand-name {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700; color: #1a1a1a;
          white-space: nowrap;
          text-align: center;
          line-height: 1.3;
        }
        .brand-name em { font-style: normal; color: #dc2626; }

        .nav-tabs { 
          display: flex; flex-direction: column; 
          gap: 6px; flex: 1;
        }
        .nav-tab {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          font-size: 14px; font-weight: 500;
          color: #9ca3af;
          border: none; background: none; cursor: pointer;
          border-radius: 12px;
          transition: all 0.2s ease;
          white-space: nowrap;
          text-align: left;
        }
        .nav-tab:hover { 
          color: #374151; 
          background: #fff5f5;
        }
        .nav-tab.active { 
          color: #dc2626; 
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          box-shadow: 0 2px 8px rgba(220,38,38,0.13);
          position: relative;
        }
        .nav-tab.active::before {
          content: '';
          position: absolute;
          left: 0; top: 7px; bottom: 7px;
          width: 3px;
          background: linear-gradient(180deg, #dc2626, #f87171);
          border-radius: 0 3px 3px 0;
        }

        /* ── ENHANCED USER CHIP ── */
        .user-chip {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          background: linear-gradient(145deg, #fff5f5, #fff0f0);
          border: 1px solid #fecaca;
          border-radius: 16px;
          padding: 18px 14px;
          width: 100%;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .user-chip::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #dc2626, #f87171, #dc2626);
          opacity: 0.7;
        }
        .user-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(220,38,38,0.15);
        }
        .user-avatar-wrapper {
          position: relative;
          padding: 3px;
          background: linear-gradient(135deg, #dc2626, #f43f5e);
          border-radius: 50%;
        }
        .user-avatar {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #dc2626, #f43f5e);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 700; color: #fff;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(220,38,38,0.3);
          position: relative;
          z-index: 1;
        }
        .user-avatar-ring {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border-radius: 50%;
          border: 2px solid rgba(220,38,38,0.2);
          animation: pulse-ring 2s ease-in-out infinite;
        }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.7; }
        }
        .user-info {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          width: 100%;
        }
        .user-email-wrapper {
          display: flex; align-items: center; gap: 6px;
          width: 100%;
          justify-content: center;
        }
        .user-email-icon {
          color: #dc2626;
          flex-shrink: 0;
        }
        .user-email {
          font-size: 12px; color: #4b5563;
          max-width: 180px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          text-align: center;
          font-weight: 500;
        }
        .role-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          background: linear-gradient(135deg, #fff1f1, #fee2e2);
          border: 1px solid #fecaca; color: #dc2626;
          padding: 5px 12px; border-radius: 20px;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(220,38,38,0.1);
        }
        .role-badge-icon {
          display: flex;
        }
        .user-greeting {
          font-size: 11px; color: #9ca3af;
          margin-top: 2px;
          font-weight: 500;
        }
        .logout-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%;
          font-size: 13px; font-weight: 600;
          color: #ef4444; 
          background: #fff; 
          border: 1px solid #fee2e2; 
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
          padding: 12px;
          border-radius: 14px;
          margin-top: 12px;
          box-shadow: 0 2px 5px rgba(239,68,68,0.05);
        }
        .logout-btn:hover { 
          color: #dc2626; 
          background: #fef2f2;
          border-color: #fecaca;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220,38,38,0.1);
        }
        .logout-btn:active {
          transform: translateY(0);
        }

        /* ── PAGE LAYOUT ── */
        .page-main {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
          padding: 48px 32px 80px 300px; /* Added left padding for sidebar */
        }
        @media (max-width: 768px) {
          .page-main { padding: 48px 20px 80px 20px; }
          .nav-bar { 
            position: fixed; top: 0; left: 0; right: 0; 
            width: 100%; height: auto; max-height: 60vh;
            border-radius: 0 0 20px 20px;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
          }
          .nav-bar.open { transform: translateY(0); }
        }

        /* Page header */
        .page-header { margin-bottom: 32px; }
        .section-eyebrow {
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.13em; text-transform: uppercase;
          color: #ef4444; margin-bottom: 5px;
        }
        .page-title {
          font-family: 'Syne', sans-serif;
          font-size: 28px; font-weight: 800; color: #111827;
          line-height: 1.15;
        }
        .page-subtitle { font-size: 14px; color: #9ca3af; margin-top: 5px; }

        /* ── STAT CARDS ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 32px;
          margin-bottom: 40px;
          width: 100%;
        }
        @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 28px; } }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; } }
        @media (max-width: 560px)  { .stats-grid { grid-template-columns: 1fr; gap: 20px; } }
        @media (max-width: 400px)  { .stats-grid { grid-template-columns: 1fr; gap: 16px; } }

        /* ── STAT CARDS ── */
        .stat-card {
          position: relative;
          background: #fff;
          border-radius: 18px;
          border: 1px solid #f0eef0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04);
          overflow: hidden;
          padding: 26px 26px 22px;
          transition: transform 0.24s cubic-bezier(.22,.61,.36,1), box-shadow 0.24s ease;
          min-width: 0;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 18px 42px rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.06);
        }
        .stat-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3.5px;
          background: var(--card-accent, linear-gradient(90deg, #dc2626, #f87171));
          border-radius: 18px 18px 0 0;
        }
        .stat-card-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 16px;
        }
        .stat-icon-box {
          width: 44px; height: 44px;
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover .stat-icon-box {
          transform: scale(1.08) rotate(-3deg);
          box-shadow: 0 6px 18px rgba(0,0,0,0.2);
        }
        .stat-badge {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 3px 9px; border-radius: 20px;
          line-height: 1.7; border: 1px solid;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .stat-label { font-size: 13px; color: #9ca3af; font-weight: 500; margin-bottom: 5px; }
        .stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 26px; font-weight: 800; color: #111827;
          line-height: 1.1;
          overflow: visible;
          white-space: normal;
          word-wrap: break-word;
          word-break: break-all;
          letter-spacing: -0.5px;
        }
        .stat-footer {
          display: flex; align-items: center; gap: 4px;
          margin-top: 14px; padding-top: 12px;
          border-top: 1px solid #f3f3f3;
          font-size: 12px; color: #c4c4c4;
        }

        /* ── PORTFOLIO HEALTH ── */
        .health-card {
          background: #fff;
          border-radius: 18px;
          border: 1px solid #f0eef0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.055);
          padding: 34px 38px;
          width: 100%;
          margin-bottom: 40px;
        }
        .health-metrics {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0;
          margin-top: 28px;
        }
        .health-metric {
          padding: 0 48px 0 0;
          min-width: 0;
          /* Allow wrapping on small screens */
          flex-shrink: 0;
        }
        .health-metric:first-child { padding-left: 0; }
        @media (max-width: 768px) {
          .health-metrics { flex-direction: column; align-items: flex-start; gap: 20px; }
          .health-metric { padding: 0; }
          .h-divider { display: none; }
        }
        .metric-label { font-size: 14px; color: #9ca3af; font-weight: 500; margin-bottom: 5px; }
        .metric-value {
          font-family: 'Syne', sans-serif;
          font-size: 24px; font-weight: 800; color: #111827;
          display: flex; align-items: baseline; gap: 6px;
        }
        .metric-unit { font-size: 13px; color: #9ca3af; font-weight: 400; font-family: 'DM Sans', sans-serif; }
        .metric-sub { font-size: 12px; color: #d1d5db; margin-top: 4px; }
        .prog-track {
          width: 160px; height: 6px;
          background: #fde8e8;
          border-radius: 99px;
          overflow: hidden;
          margin-top: 8px;
        }
        @media (max-width: 768px) { .prog-track { width: 100%; max-width: 240px; } }
        .prog-fill {
          height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, #dc2626, #f87171);
          transition: width 0.8s cubic-bezier(.22,.61,.36,1);
        }
        .prog-fill-dark { background: linear-gradient(90deg, #991b1b, #dc2626); }
        .h-divider {
          width: 1px; height: 60px; align-self: center;
          background: linear-gradient(180deg, transparent, #fca5a5 50%, transparent);
          margin-right: 32px; flex-shrink: 0;
        }

        /* ── ANALYTICS SECTION ── */
        .analytics-section {
          margin-top: 40px;
          width: 100%;
        }
        .analytics-header {
          margin-bottom: 28px;
        }

        /* ── SHARED VIEW STYLES ── */
        .view-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .content-card {
          background: #fff;
          border-radius: 18px;
          border: 1px solid #f0eef0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.055);
          overflow: hidden;
          width: 100%;
          position: relative;
        }
        .loading-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          border-radius: 18px;
        }
        .loading-spinner {
          width: 32px; height: 32px;
          border: 3px solid #fde8e8;
          border-top: 3px solid #dc2626;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn-red {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: #fff; font-size: 14px; font-weight: 600;
          padding: 10px 20px; border-radius: 11px; border: none; cursor: pointer;
          box-shadow: 0 4px 16px rgba(220,38,38,0.28);
          transition: filter 0.15s, transform 0.15s, box-shadow 0.15s;
          flex-shrink: 0; letter-spacing: 0.01em;
        }
        .btn-red:hover { filter: brightness(1.07); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(220,38,38,0.38); }
        .btn-red:active { transform: translateY(0); }
        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          background: #fff; color: #dc2626; font-size: 14px; font-weight: 600;
          padding: 10px 20px; border-radius: 11px; border: 1.5px solid #fecaca; cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          flex-shrink: 0; letter-spacing: 0.01em;
        }
        .btn-outline:hover { background: #fef2f2; border-color: #f87171; transform: translateY(-1px); }

        /* ── LOG TABLE ── */
        .log-table-head {
          background: #fff7f7;
          border-bottom: 1px solid #fde8e8;
          padding: 13px 28px;
          display: grid;
          grid-template-columns: 1.2fr 1.2fr 1fr 2fr;
          gap: 16px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #ef4444;
        }
        @media (max-width: 768px) {
          .log-table-head { grid-template-columns: 1fr 1fr; }
          .log-row { grid-template-columns: 1fr 1fr; }
        }
        .log-scroll { max-height: 580px; overflow-y: auto; }
        .log-scroll::-webkit-scrollbar { width: 6px; }
        .log-scroll::-webkit-scrollbar-track { background: #fff7f7; }
        .log-scroll::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 4px; }
        .log-row {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr 1fr 2fr;
          gap: 16px;
          padding: 20px 28px;
          border-bottom: 1px solid #fff1f1;
          align-items: center;
          transition: background 0.12s;
        }
        .log-row:hover { background: #fff8f8; }
        .log-row:last-child { border-bottom: none; }
        .log-time { font-size: 14px; color: #6b7280; font-family: monospace; }
        .log-user { font-size: 14px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .log-action { font-size: 14px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .log-details { font-size: 13px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .log-badge {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 3px 9px; border-radius: 99px; border: 1px solid;
          display: inline-block;
        }
        .log-badge-red   { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .log-badge-green { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
        .log-badge-amber { background: #fffbeb; color: #d97706; border-color: #fde68a; }
        .log-badge-gray  { background: #f9fafb; color: #6b7280; border-color: #e5e7eb; }

        /* ── ANIMATIONS ── */
        .anim { animation: fadeUp 0.38s cubic-bezier(.22,.61,.36,1) both; }
        .d1{animation-delay:.05s} .d2{animation-delay:.10s}
        .d3{animation-delay:.15s} .d4{animation-delay:.20s} .d5{animation-delay:.25s}
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── MODAL ── */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .modal-card {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 500px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
          overflow: hidden;
          animation: fadeUp 0.25s cubic-bezier(.22,.61,.36,1);
          display: flex; flex-direction: column;
          max-height: 85vh;
        }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
        .modal-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: #111827; }
        .close-btn { background: none; border: none; cursor: pointer; color: #9ca3af; transition: color 0.2s; }
        .close-btn:hover { color: #dc2626; }
        .modal-body { padding: 24px; overflow-y: auto; }
        .date-inputs { display: flex; gap: 16px; margin-bottom: 24px; }
        .date-field { flex: 1; }
        .date-label { display: block; font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .date-input { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #374151; outline: none; transition: border-color 0.2s; }
        .date-input:focus { border-color: #dc2626; }
        .sched-list { display: flex; flex-direction: column; gap: 0; border: 1px solid #f3f4f6; border-radius: 12px; overflow: hidden; }
        .sched-row { display: flex; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .sched-row:last-child { border-bottom: none; }
        .sched-row:nth-child(even) { background: #faf9f9; }
        .sched-date { font-weight: 500; color: #4b5563; }
        .sched-amount { font-weight: 700; color: #dc2626; font-family: 'Syne', sans-serif; }
        .sched-total { background: #fff1f1 !important; border-top: 2px solid #fecaca; }
        .sched-total .sched-date { color: #991b1b; font-weight: 700; }
        .sched-total .sched-amount { color: #991b1b; font-size: 16px; }
        .sched-row-paid { background: #f0fdf4 !important; }
        .sched-row-paid .sched-date { color: #16a34a; }
        .sched-row-paid .sched-amount { color: #16a34a; }
        .sched-paid-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 6px;
          border: 1px solid #bbf7d0; background: #fff;
          color: #16a34a; cursor: pointer;
          transition: all 0.15s;
          margin-left: 8px; flex-shrink: 0;
        }
        .sched-paid-btn:hover { background: #f0fdf4; border-color: #16a34a; }
        .sched-paid-btn.paid { background: #16a34a; border-color: #16a34a; color: #fff; }
        .sched-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .sched-counter { font-size: 12px; color: #6b7280; display: flex; gap: 12px; }
        .sched-counter-paid { color: #16a34a; font-weight: 600; }
        .sched-counter-remaining { color: #d97706; font-weight: 600; }
        .sched-mark-all-btn {
          font-size: 11px; font-weight: 600; padding: 5px 10px;
          border-radius: 6px; border: 1px solid #bbf7d0;
          background: #f0fdf4; color: #16a34a; cursor: pointer;
          transition: all 0.15s;
        }
        .sched-mark-all-btn:hover { background: #dcfce7; }

        /* ── DARK MODE ── */
        .dark .dash-root {
          background: #0d0c0c;
          background-image:
            radial-gradient(ellipse 900px 600px at 95% -5%, rgba(220,38,38,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 700px 450px at 85% 0%, rgba(220,38,38,0.08) 0%, transparent 65%),
            radial-gradient(ellipse 500px 350px at 0% 100%, rgba(220,38,38,0.05) 0%, transparent 65%);
        }
        .dark .nav-bar { background: rgba(18,16,16,0.96); border-color: rgba(220,38,38,0.18); }
        .dark .nav-top, .dark .nav-bottom { border-color: rgba(220,38,38,0.15); }
        .dark .brand-name { color: #e5e5e5; }
        .dark .nav-tab { color: #737373; }
        .dark .nav-tab:hover { color: #e5e5e5; background: rgba(220,38,38,0.1); }
        .dark .nav-tab.active { background: linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.1)); }
        .dark .user-chip { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.2); }
        .dark .user-chip:hover { box-shadow: 0 8px 24px rgba(220,38,38,0.25); }
        .dark .user-email { color: #a3a3a3; }
        .dark .user-email-icon { color: #f87171; }
        .dark .user-greeting { color: #737373; }
        .dark .role-badge { background: rgba(220,38,38,0.15); border-color: rgba(220,38,38,0.3); color: #fca5a5; }
        .dark .user-avatar-ring { border-color: rgba(220,38,38,0.3); }
        .dark .logout-btn {
          background: rgba(26,26,26,0.95);
          border-color: #3f2a2a;
          color: #f87171;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .dark .logout-btn:hover { 
          background: #450a0a;
          border-color: #7f1d1d;
          color: #fca5a5;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .dark .page-title { color: #f5f5f5; }
        .dark .page-subtitle { color: #737373; }
        .dark .stat-card { background: #1c1c1c; border-color: rgba(255,255,255,0.06); box-shadow: 0 2px 16px rgba(0,0,0,0.25); }
        .dark .stat-card:hover { box-shadow: 0 18px 42px rgba(0,0,0,0.35); }
        .dark .stat-value { color: #f5f5f5; }
        .dark .stat-label { color: #737373; }
        .dark .stat-footer { color: #404040; border-top-color: rgba(255,255,255,0.05); }
        .dark .health-card { background: #1c1c1c; border-color: rgba(255,255,255,0.06); box-shadow: 0 2px 16px rgba(0,0,0,0.2); }
        .dark .metric-value { color: #f5f5f5; }
        .dark .metric-label { color: #737373; }
        .dark .metric-sub { color: #525252; }
        .dark .prog-track { background: rgba(220,38,38,0.15); }
        .dark .content-card { background: #1c1c1c; border-color: rgba(255,255,255,0.06); box-shadow: 0 2px 16px rgba(0,0,0,0.25); }
        .dark .btn-outline { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.3); }
        .dark .btn-outline:hover { background: rgba(220,38,38,0.2); }
        .dark .log-table-head { background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.15); color: #fca5a5; }
        .dark .log-row { border-color: rgba(220,38,38,0.08); }
        .dark .log-row:hover { background: rgba(220,38,38,0.05); }
        .dark .log-time, .dark .log-user, .dark .log-detail { color: #a3a3a3; }
        .dark .log-scroll::-webkit-scrollbar-track { background: #262626; }
        .dark .log-scroll::-webkit-scrollbar-thumb { background: #525252; }
        .dark .log-badge-red { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
        .dark .log-badge-green { background: #052e16; color: #4ade80; border-color: #166534; }
        .dark .log-badge-amber { background: #451a03; color: #fbbf24; border-color: #78350f; }
        .dark .log-badge-gray { background: #374151; color: #a3a3a3; border-color: #4b5563; }
        .dark .modal-card { background: #1a1a1a; border-color: rgba(220,38,38,0.15); }
        .dark .modal-title { color: #f5f5f5; }
        .dark .modal-header { border-color: rgba(220,38,38,0.15); }
        .dark .date-input { background: #262626; border-color: #404040; color: #e5e5e5; }
        .dark .sched-row { border-color: #333; }
        .dark .sched-row:nth-child(even) { background: #262626; }
      `}</style>

      <div className="dash-root">
        {/* ── NAVBAR ── */}
        <nav className="nav-bar">
          <div className="nav-inner">
            {/* Top Section - Brand */}
            <div className="nav-top">
              <div className="brand">
                <div className="brand-mark">
<img src={NCT_logong} alt="NCT Logo" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                </div>
                <span className="brand-name">
                  NCT Transnational<br /><em>Corp</em>
                </span>
              </div>
            </div>

            {/* Middle Section - Navigation Tabs */}
            <div className="nav-tabs">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentView(id)}
                  className={`nav-tab${currentView === id ? " active" : ""}`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            {/* Bottom Section - User Info & Logout */}
            <div className="nav-bottom">
              <div className="user-chip" style={isDark ? { background: 'rgba(26,21,21,0.95)', borderColor: '#3f2a2a' } : {}}>
                <div className="user-avatar-wrapper">
                  <div className="user-avatar">
                    {user?.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="user-avatar-ring"></div>
                </div>
                <div className="user-info">
                  <div className="user-email-wrapper">
                    <Mail size={12} className="user-email-icon" />
                    <span className="user-email" title={user?.email}>{user?.email}</span>
                  </div>
                  <span className="role-badge">
                    <span className="role-badge-icon"><Shield size={10} /></span>
                    {role}
                  </span>
                  <span className="user-greeting">Welcome back!</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button 
                  onClick={toggleTheme}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    padding: '12px',
                    borderRadius: '14px',
                    border: '1.5px solid',
                    borderColor: isDark ? '#3f2a2a' : '#fecaca',
                    background: isDark ? '#1a1515' : '#fff5f5',
                    color: isDark ? '#fca5a5' : '#dc2626',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button className="logout-btn" onClick={handleLogout} title="Sign Out" style={{ marginTop: 0, width: 'auto', flex: 1 }}>
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* ── MAIN ── */}
        <main className="page-main">
          {/* ═══ DASHBOARD ═══ */}
          {currentView === "dashboard" && (
            <div>
              <div className="page-header anim">
                <p className="section-eyebrow">Overview</p>
                <h2 className="page-title dash-title">Asset Dashboard</h2>
                <p className="page-subtitle">
                  Real-time snapshot of your asset portfolio
                </p>
              </div>

              {/* Stat cards */}
              <div className="stats-grid">
                {statCards.map(
                  (
                    {
                      label,
                      value,
                      icon: Icon,
                      badge,
                      iconGradient,
                      cardAccent,
                      badgeColor,
                      badgeBg,
                      badgeBorder,
                      darkBadgeBg,
                      darkBadgeBorder,
                      onClick,
                    },
                    i,
                  ) => (
                    <div
                      key={label}
                      className={`stat-card anim d${i + 1}`}
                      onClick={onClick}
                      style={{
                        '--card-accent': cardAccent,
                        cursor: onClick ? 'pointer' : 'default',
                      }}
                    >
                      <div className="stat-card-top">
                        <div
                          className="stat-icon-box"
                          style={{ background: iconGradient }}
                        >
                          <Icon size={20} color="#fff" strokeWidth={2.2} />
                        </div>
                        <span
                          className="stat-badge"
                          style={{
                            color: badgeColor,
                            background: badgeBg,
                            borderColor: badgeBorder,
                          }}
                        >
                          {badge}
                        </span>
                      </div>
                      <p className="stat-label">{label}</p>
                      <p className="stat-value">{value}</p>
                      <div className="stat-footer">
                        <ChevronRight size={12} />
                        <span>Updated just now</span>
                      </div>
                    </div>
                  ),
                )}
              </div>

              {/* Portfolio Health */}
              <div className="health-card anim d5">
                <p className="section-eyebrow">Portfolio Health</p>
                <div className="health-metrics">
                  <div className="health-metric">
                    <p className="metric-label">Utilization Rate</p>
                    <div className="metric-value">
                      {assets.length > 0
                        ? Math.round((stats.active / assets.length) * 100)
                        : 0}
                      %<span className="metric-unit">active</span>
                    </div>
                    <div className="prog-track">
                      <div
                        className="prog-fill"
                          style={{
                          width: `${assets.length > 0 ? (stats.active / assets.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="h-divider" />

                  <div className="health-metric">
                    <p className="metric-label">Total Assets Tracked</p>
                    <div className="metric-value">{assets.length}</div>
                    <p className="metric-sub">across all categories</p>
                  </div>

                  <div className="h-divider" />

                  <div className="health-metric">
                    <p className="metric-label">Disposal Rate</p>
                    <div className="metric-value">
                      {assets.length > 0
                        ? Math.round((stats.disposed / assets.length) * 100)
                        : 0}
                      %<span className="metric-unit">disposed</span>
                    </div>
                    <div className="prog-track">
                      <div
                        className="prog-fill prog-fill-dark"
                        style={{
                          width: `${assets.length > 0 ? (stats.disposed / assets.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics embedded in dashboard */}
              <div className="analytics-section anim d5">
                <div className="analytics-header">
                  <p className="section-eyebrow">Analytics</p>
                  <h2 className="page-title dash-title">Asset Reports</h2>
                </div>
                <DashboardCharts assets={assets} />
              </div>
            </div>
          )}

          {/* ═══ LOGS ═══ */}
          {currentView === "logs" && (
            <div>
              <div className="view-header anim">
                <div>
                  <p className="section-eyebrow">Admin</p>
                  <h2 className="page-title dash-title">System Logs</h2>
                  <p className="page-subtitle">
                    {logs.length} entries recorded
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button className="btn-outline" onClick={handleExportClick}>
                    <Download size={17} /> Export XLSX
                  </button>
                  <button className="btn-outline" onClick={handleDeleteLogsClick} style={{ borderColor: "#fecaca", color: "#dc2626", background: "#fff1f1" }}>
                    <Trash2 size={17} /> Clear Logs
                  </button>
                </div>
              </div>
              <div className="content-card anim d1">
                <div className="log-table-head">
                  <span>Timestamp</span>
                  <span>User</span>
                  <span>Action</span>
                  <span>Details</span>
                </div>
                <div className="log-scroll">
                  {logs.length === 0 ? (
                    <div
                      style={{
                        padding: "56px 0",
                        textAlign: "center",
                        color: "#d1d5db",
                        fontSize: 13,
                      }}
                    >
                      No logs found.
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="log-row">
                        <span className="log-time">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <span className="log-user">{log.user_email}</span>
                        <span className="log-action">
                          <span
                            className={`log-badge ${actionTypeColor(log.action_type)}`}
                          >
                            {log.action_type}
                          </span>
                        </span>
                        <span className="log-details">
                          {(() => {
                            const details = log.details;
                            if (!details) return "No additional details";
                            
                            // Handle different action types with their specific details
                            switch (log.action_type) {
                              case "CREATE_ASSET":
                                return `Asset "${details.asset_name}" (${details.tag_number}) • Category: ${details.category} • Cost: ₱${parseFloat(details.total_cost || 0).toLocaleString()} • Status: ${details.status}`;
                              
                              case "TRANSFER_ASSET":
                                return `Asset "${details.asset_name}" (${details.tag_number}) • From: ${details.from_company} → To: ${details.to_company} • Status: ${details.status}`;
                              
                              case "DISPOSE_ASSET":
                                return `Asset "${details.asset_name}" (${details.tag_number}) • Category: ${details.category} • Disposal Reason: ${details.disposal_reason || "N/A"}`;
                              
                              case "DELETE_ASSET":
                                return `Asset "${details.asset_name}" (${details.tag_number}) • Category: ${details.category} • Status: ${details.status}`;
                              
                              case "EDIT_ASSET":
                                const changes = [];
                                if (details.old_status !== details.new_status) {
                                  changes.push(`Status: ${details.old_status} → ${details.new_status}`);
                                }
                                if (details.old_company !== details.new_company) {
                                  changes.push(`Company: ${details.old_company} → ${details.new_company}`);
                                }
                                if (details.old_category !== details.new_category) {
                                  changes.push(`Category: ${details.old_category} → ${details.new_category}`);
                                }
                                return changes.length > 0 ? changes.join(" • ") : "No changes detected";
                              
                              case "UPDATE_DOWNPAYMENT":
                                return `Asset "${details.asset_name}" (${details.tag_number}) • Amount: ₱${parseFloat(details.old_amount || 0).toLocaleString()} → ₱${parseFloat(details.new_amount || 0).toLocaleString()} • Date: ${details.old_date} → ${details.new_date}`;
                              
                              case "DELETE_DOWNPAYMENT":
                                return `Asset "${details.asset_name}" (${details.tag_number}) • Amount: ₱${parseFloat(details.deleted_amount || 0).toLocaleString()} • Date: ${details.deleted_date}`;
                              
                              case "LOGIN":
                                return "User logged in successfully";
                              
                              case "LOGOUT":
                                return "User logged out successfully";
                              
                              case "DELETE_LOGS":
                                return "All system logs cleared by admin";
                              
                              default:
                                return details.message || "No additional details";
                            }
                          })()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SUMMARY ═══ */}
          {currentView === "summary" && (
            <div>
              <div className="view-header anim">
                <div>
                  <p className="section-eyebrow">Inventory</p>
                  <h2 className="page-title dash-title">Asset Inventory</h2>
                  <p className="page-subtitle">{assets.length} total records</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn-outline"
                    onClick={() => {
                      fetchAssets();
                      fetchLogs();
                    }}
                    disabled={isDataLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={16} style={{ animation: isDataLoading ? 'spin 1s linear infinite' : 'none' }} />
                    Refresh
                  </button>
                  <button
                    className="btn-red"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus size={18} /> Add New Asset
                  </button>
                </div>
              </div>
              <div className="content-card anim d1">
                <AssetSummary
                  assets={assets}
                  userRole={role}
                  userEmail={user?.email}
                  refreshData={() => {
                    fetchAssets();
                    fetchLogs();
                  }}
                  showPendingOnly={false}
                />
              </div>
            </div>
          )}

          {/* ═══ DOWNPAYMENT SECTION ═══ */}
          {currentView === "downpayment" && (
            <div>
              <div className="view-header anim">
                <div>
                  <p className="section-eyebrow">Payment Tracking</p>
                  <h2 className="page-title dash-title">Downpayment Assets</h2>
                  <p className="page-subtitle">
                    Track installment payments and payment progress for assets
                  </p>
                </div>
              </div>
              <div className="content-card anim d1">
                <DownpaymentTable
                  assets={assets}
                  userRole={role}
                  userEmail={user?.email}
                  refreshData={() => {
                    fetchAssets();
                    fetchLogs();
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {showAddForm && (
        <AddAssetForm
          userEmail={user?.email}
          onComplete={() => {
            setShowAddForm(false);
            fetchAssets();
            fetchLogs();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {showAmortization && (
        <div
          className="modal-overlay"
          onClick={() => setShowAmortization(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Monthly Amortization</h3>
              <button
                className="close-btn"
                onClick={() => setShowAmortization(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="date-inputs">
                <div className="date-field">
                  <label className="date-label">From</label>
                  <input
                    type="month"
                    className="date-input"
                    value={amortizationDates.start}
                    onChange={(e) =>
                      setAmortizationDates({
                        ...amortizationDates,
                        start: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="date-field">
                  <label className="date-label">To</label>
                  <input
                    type="month"
                    className="date-input"
                    value={amortizationDates.end}
                    onChange={(e) =>
                      setAmortizationDates({
                        ...amortizationDates,
                        end: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="sched-header">
                  <div className="sched-counter">
                    <span className="sched-counter-paid">{paidMonths.size} paid</span>
                    <span className="sched-counter-remaining">{amortizationSchedule.filter(s => s.amount > 0).length - paidMonths.size} remaining</span>
                  </div>
                  <button 
                    className="sched-mark-all-btn"
                    onClick={() => {
                      const allDates = amortizationSchedule.filter(s => s.amount > 0).map(s => s.date);
                      setPaidMonths(new Set(allDates));
                    }}
                  >
                    Mark All as Paid
                  </button>
                </div>

              <div className="sched-list">
                {amortizationSchedule.length > 0 ? (
                  <>
                    {amortizationSchedule.map((item, idx) => (
                      <div key={idx} className={`sched-row${paidMonths.has(item.date) ? ' sched-row-paid' : ''}`}>
                        <span className="sched-date">{item.date}</span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="sched-amount">
                            ₱
                            {item.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {item.amount > 0 && (
                            <button
                              className={`sched-paid-btn${paidMonths.has(item.date) ? ' paid' : ''}`}
                              onClick={() => {
                                const newPaid = new Set(paidMonths);
                                if (newPaid.has(item.date)) {
                                  newPaid.delete(item.date);
                                } else {
                                  newPaid.add(item.date);
                                }
                                setPaidMonths(newPaid);
                              }}
                              title={paidMonths.has(item.date) ? "Mark as unpaid" : "Mark as paid"}
                            >
                              {paidMonths.has(item.date) ? '✓' : ''}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="sched-row sched-total">
                      <span className="sched-date">Total Period</span>
                      <span className="sched-amount">
                        ₱
                        {amortizationTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "#9ca3af",
                    }}
                  >
                    No amortization data for this period.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "360px" }}
          >
            <div className="modal-header">
              <h3
                className="modal-title"
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <Lock size={18} color="#dc2626" /> {pinAction === "delete" ? "Confirm Deletion" : "Admin Authorization"}
              </h3>
              <button
                className="close-btn"
                onClick={() => setShowPinModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  marginBottom: "20px",
                  lineHeight: "1.5",
                }}
              >
                This action is restricted. Please enter the{" "}
                <strong>Admin PIN</strong> to {pinAction === "delete" ? "permanently delete all logs" : "download the system logs"}.
              </p>
              <input
                type="password"
                className="date-input"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                style={{
                  textAlign: "center",
                  fontSize: "18px",
                  letterSpacing: "4px",
                  fontWeight: "bold",
                }}
                autoFocus
              />
              {pinError && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginTop: "10px",
                    textAlign: "center",
                    fontWeight: "500",
                  }}
                >
                  {pinError}
                </p>
              )}
              <button
                className="btn-red"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: "24px",
                }}
                onClick={verifyPinAndAction}
              >
                {pinAction === "delete" ? "Verify & Delete" : "Verify & Download"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleConfirmSignOut}
        isSigningOut={isSigningOut}
      />
    </>
  );
};

export default Dashboard;
