import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import NCT_logong from "@/assets/NCT_logong.png";
import { useTabVisibility } from "@/hooks/useTabVisibility";
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
  X,
  Lock,
  Moon,
  Sun,
  RefreshCw,
  Bell,
  ChevronRight,
  ChevronLeft,
  Menu,
  Grid,
  List,
  Filter,
  Search,
  Sparkles,
  Star,
  Zap,
  Rocket,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "../supabaseClient";
import useSupabaseRealtime from "@/hooks/useSupabaseRealtime";
import AddAssetForm from "@/components/AddAssetForm";
import AssetSummary from "@/components/AssetSummary";
import DashboardCharts from "@/components/DashboardCharts";
import DownpaymentTable from "@/components/DownpaymentTable";
import { SignOutModal } from "@/pages/SignOutModal";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import "./Dashboard.css";

// ============================================================================
// MODERN DASHBOARD - Bento Box Layout (2026 Design Standards)
// ============================================================================

const COLORS = {
  brand: "#dc2626",
  brandLight: "#f87171",
  brand50: "#fef2f2",
  emerald: "#10b981",
  emerald50: "#ecfdf5",
  amber: "#f59e0b",
  amber50: "#fffbeb",
  rose: "#f43f5e",
  rose50: "#fff1f2",
  indigo: "#6366f1",
  indigo50: "#eef2ff",
  slate: "#64748b",
  slate50: "#f8fafc",
};

const STATUS_COLORS = {
  Active: "#10b981",
  Disposed: "#dc2626",
  Transferred: "#f59e0b",
  Pending: "#6366f1",
};

const Dashboard = () => {
  const { user, role, verifyPin, checkPinLockStatus } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const isPageVisible = useTabVisibility();

  const abortControllersRef = useRef({
    assets: null,
    transactions: null,
    logs: null,
  });

  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach((controller) => {
        if (controller) controller.abort();
      });
    };
  }, []);

  const [assets, setAssets] = useState([]);
  const [transactions, setTransactions] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [stats, setStats] = useState({
    totalValue: 0,
    active: 0,
    disposed: 0,
    depreciation: 0,
    pending: 0,
    transferred: 0,
  });
  const [logs, setLogs] = useState([]);
  const [currentView, setCurrentView] = useState("dashboard");
  
  // Sidebar state - collapsible
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Table filter state
  const [tableFilters, setTableFilters] = useState({
    search: "",
    category: "",
    status: "",
    company: "",
  });

  const [showAmortization, setShowAmortization] = useState(false);
  const [amortizationDates, setAmortizationDates] = useState({
    start: "2026-02",
    end: "2027-12",
  });
  const [paidMonths, setPaidMonths] = useState(new Set());

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAction, setPinAction] = useState("");

  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Mock sparkline data - in production this would come from historical data
  const sparklineData = useMemo(() => ({
    totalValue: [45, 52, 48, 58, 62, 55, 68, 72, 65, 75, 80, 85, 92, 88, 95, 100],
    active: [8, 10, 12, 11, 14, 15, 16, 18, 17, 20, 22, 21, 24, 23, 26, 28],
    disposed: [1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 7, 8],
    depreciation: [8000, 9200, 8800, 10500, 11200, 10800, 12500, 13200, 12800, 14500, 15200, 14800, 16500, 17200, 16800, 18500],
  }), []);

  useEffect(() => {
    if (showAmortization) {
      setPaidMonths(new Set());
    }
  }, [showAmortization]);

  useEffect(() => {
    if (role === "accountant") {
      setCurrentView("summary");
    }
  }, [role]);

  const fetchTransactions = async () => {
    try {
      if (abortControllersRef.current.transactions) {
        abortControllersRef.current.transactions.abort();
      }
      const controller = new AbortController();
      abortControllersRef.current.transactions = controller;
      
      const { data, error } = await supabase
        .from("downpayment_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .abortSignal(controller.signal);

      if (error) throw error;

      const grouped = {};
      (data || []).forEach((txn) => {
        if (!grouped[txn.asset_id]) {
          grouped[txn.asset_id] = [];
        }
        grouped[txn.asset_id].push(txn);
      });
      setTransactions(grouped);
    } catch (err) {
      if (err.name !== "AbortError" && !err.message?.includes("AbortError")) {
        console.error("Unexpected error in fetchTransactions:", err);
      }
    }
  };

  const fetchAssets = async (arg = false) => {
    const isBackground = typeof arg === "object" ? arg.isBackground : arg;
    const skipLoading = typeof arg === "object" ? arg.skipLoading : false;
    const shouldShowLoading = !skipLoading && (!isBackground || assets.length === 0);

    if (shouldShowLoading) setIsDataLoading(true);
    
    try {
      if (abortControllersRef.current.assets) {
        abortControllersRef.current.assets.abort();
      }
      const controller = new AbortController();
      abortControllersRef.current.assets = controller;
      
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false })
        .abortSignal(controller.signal);
      
      if (error) throw error;
      
      const dataList = data || [];
      const pendingUpdates = [];
      for (const asset of dataList) {
        const assetTransactions = transactions[asset.id] || [];
        const txnTotal = assetTransactions.reduce(
          (sum, txn) => sum + (parseFloat(txn.amount) || 0),
          0
        );
        const legacyTotal = parseFloat(asset.downpayment_amount) || 0;
        const totalDownpayment = txnTotal + legacyTotal;
        
        const totalCost = parseFloat(asset.total_cost) || 0;
        const paymentCompletion = totalCost > 0 ? (totalDownpayment / totalCost) * 100 : 0;
        
        if (paymentCompletion >= 100 && asset.status === "Pending") {
          pendingUpdates.push(asset.id);
        }
      }
      
      let finalData = dataList;
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
        
        const { data: updatedData, error: refetchError } = await supabase
          .from("assets")
          .select("*")
          .order("created_at", { ascending: false })
          .abortSignal(controller.signal);
        
        finalData = refetchError ? dataList : (updatedData || []);
      }
      
      setAssets(finalData);
      calculateStats(finalData);
    } catch (err) {
      if (err.name !== "AbortError" && !err.message?.includes("AbortError")) {
        console.error("Error in fetchAssets:", err);
      }
    } finally {
      if (shouldShowLoading) {
        setIsDataLoading(false);
      }
    }
  };

  const calculateStats = (data) => {
    const dataArr = data || [];
    const totalValue = dataArr.reduce(
      (sum, item) => sum + (parseFloat(item.total_cost) || 0),
      0
    );
    const active = dataArr.filter((i) => i.status === "Active").length;
    const disposed = dataArr.filter((i) => i.status === "Disposed").length;
    const pending = dataArr.filter((i) => i.status === "Pending").length;
    const transferred = dataArr.filter((i) => i.status === "Transferred").length;
    const depreciation = dataArr
      .filter((i) => i.status === "Active")
      .reduce((sum, item) => {
        const cost = parseFloat(item.total_cost) || 0;
        const salvage = parseFloat(item.salvage_value) || 0;
        const life = parseInt(item.useful_life_years) || 1;
        return sum + (cost - salvage) / life;
      }, 0);
    setStats({ totalValue, active, disposed, depreciation, pending, transferred });
  };

  const fetchLogs = async () => {
    try {
      if (abortControllersRef.current.logs) {
        abortControllersRef.current.logs.abort();
      }
      const controller = new AbortController();
      abortControllersRef.current.logs = controller;
      
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .abortSignal(controller.signal);
      
      if (error) throw error;
      
      const filteredLogs = (data || []).filter(log => log.action_type !== "INSERT");
      setLogs(filteredLogs);
    } catch (err) {
      if (err.name !== "AbortError" && !err.message?.includes("AbortError")) {
        console.error("Unexpected error in fetchLogs:", err);
      }
    }
  };

  const handleRefresh = async () => {
    setIsDataLoading(true);
    try {
      // Call fetches in parallel and wait for both to complete
      await Promise.all([
        fetchAssets({ isBackground: true, skipLoading: true }),
        fetchLogs()
      ]);
    } catch (error) {
      console.error("An error occurred during refresh:", error);
    } finally {
      // Always ensure the loading state is turned off
      setIsDataLoading(false);
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
    console.log("Exporting logs...");
  };

  const deleteLogs = async () => {
    if (!window.confirm("Are you sure you want to PERMANENTLY DELETE all system logs?")) return;

    // First fetch all log IDs, then delete them one by one
    const { data: logs, error: fetchError } = await supabase
      .from("logs")
      .select("id");

    if (fetchError) {
      console.error("Error fetching logs:", fetchError);
      alert("Failed to fetch logs");
      return;
    }

    if (!logs || logs.length === 0) {
      alert("No logs to delete");
      return;
    }

    // Delete all logs by their IDs
    const { error } = await supabase
      .from("logs")
      .delete()
      .in("id", logs.map(log => log.id));

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
    
    const lockStatus = checkPinLockStatus();
    if (lockStatus.isLocked) {
      setPinError("Account locked. Try again in " + lockStatus.remainingTime);
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
      setPinError("Account locked. Try again in " + lockStatus.remainingTime);
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

  useEffect(() => {
    const initializeData = async () => {
      fetchAssets();
      fetchTransactions();
      fetchLogs();
      
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

  const prevIsPageVisibleRef = useRef(isPageVisible);
  
  useEffect(() => {
    if (isPageVisible && !prevIsPageVisibleRef.current && assets.length > 0) {
      fetchAssets();
      fetchTransactions();
      fetchLogs();
    }
    prevIsPageVisibleRef.current = isPageVisible;
  }, [isPageVisible, assets.length]);

  const handleRealtimeChange = useCallback((change) => {
    const table = change?.table;
    console.log("[Realtime] " + table + " table changed");
    
    setTimeout(() => {
      switch (table) {
        case "assets":
          fetchAssets(true);
          break;
        case "logs":
          fetchLogs();
          break;
        case "downpayment_transactions":
          fetchTransactions();
          break;
        default:
          fetchAssets(true);
          fetchTransactions();
          fetchLogs();
      }
    }, 300);
  }, []);

  useSupabaseRealtime({
    tables: ["assets", "logs", "downpayment_transactions"],
    onDataChange: handleRealtimeChange,
    enabled: !!user,
  });

  const amortizationSchedule = useMemo(() => {
    if (!amortizationDates.start || !amortizationDates.end) return [];

    const start = new Date(amortizationDates.start);
    const end = new Date(amortizationDates.end);
    const schedule = [];

    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endTime = new Date(end.getFullYear(), end.getMonth(), 1).getTime();

    while (current.getTime() <= endTime) {
      let monthlyTotal = 0;

(assets || []).forEach((asset) => {
        if (asset.status !== "Active" || !asset.purchase_date) return;

        const dateParts = asset.purchase_date.split("-");
        const pYear = parseInt(dateParts[0]);
        const pMonth = parseInt(dateParts[1]);
        const startDepreciationDate = new Date(pYear, pMonth, 1);

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

  const amortizationTotal = useMemo(() => {
    return amortizationSchedule.reduce((sum, item) => sum + item.amount, 0);
  }, [amortizationSchedule]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const counts = assets.reduce((acc, a) => {
      const s = a.status || "Unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const allNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "summary", label: "Asset Inventory", icon: Table },
    { id: "downpayment", label: "Downpayment", icon: TrendingUp },
    { id: "logs", label: "System Logs", icon: ClipboardList, adminOnly: true },
  ];

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

  const formatLogDetails = (log) => {
    try {
      const details = log?.details;
      if (!details) return "No additional details";
      
      if (typeof details !== 'object') return String(details);
      
      const actionType = log?.action_type;
      
      switch (actionType) {
        case "CREATE_ASSET":
          return "Asset created";
        case "LOGIN":
          return "User logged in";
        case "LOGOUT":
          return "User logged out";
        case "DELETE_LOGS":
          return "Logs cleared by admin";
        default:
          return details?.message || "No additional details";
      }
    } catch (e) {
      return "No additional details";
    }
  };

  // Stat card data with colors
  const statCards = [
    {
      label: "Total Asset Value",
      value: "₱" + stats.totalValue.toLocaleString(),
      icon: TrendingUp,
      badge: "TOTAL",
      color: COLORS.indigo,
      bgColor: COLORS.indigo50,
      sparkline: sparklineData.totalValue,
    },
    {
      label: "Active Assets",
      value: stats.active,
      icon: Package,
      badge: "LIVE",
      color: COLORS.emerald,
      bgColor: COLORS.emerald50,
      sparkline: sparklineData.active,
    },
    {
      label: "Disposed Assets",
      value: stats.disposed,
      icon: Trash2,
      badge: "RETIRED",
      color: COLORS.brand,
      bgColor: COLORS.brand50,
      sparkline: sparklineData.disposed,
    },
    {
      label: "Annual Depreciation",
      value: "₱" + stats.depreciation.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      icon: BarChart3,
      badge: "YEARLY",
      color: COLORS.amber,
      bgColor: COLORS.amber50,
      sparkline: sparklineData.depreciation,
      onClick: () => setShowAmortization(true),
    },
  ];

  // Custom Sparkline Component
  const SparklineChart = ({ data, color }) => {
    const chartData = data.map((value, index) => ({ value }));
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    return (
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={`sparkGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="natural"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#sparkGradient-${color})`}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="cubic-bezier(0.22, 0.61, 0.36, 1)"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <>
      <SpeedInsights />
      <style>{`
        @keyframes dashSlideUp {
          0% { opacity: 0; transform: translateY(20px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .dash-slide-in {
          opacity: 0;
          animation: dashSlideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .dash-title {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #0f172a;
        }
        .dark .dash-title {
          color: #f1f5f9;
        }
      `}</style>
      
      <div className={`dash-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* ── Modern Sidebar ── */}
        <nav className={`dash-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="dash-brand">
            {!sidebarCollapsed && (
              <>
                <img src={NCT_logong} alt="NCT Logo" className="dash-logo" />
                <span className="dash-brand-name">NCT Transnational<br /><em>Corp</em></span>
              </>
            )}
            {sidebarCollapsed && (
              <img src={NCT_logong} alt="NCT Logo" className="dash-logo-mini" />
            )}
          </div>

          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          <div className="dash-nav-tabs">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCurrentView(id)}
                className={`dash-nav-tab ${currentView === id ? 'active' : ''}`}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            ))}
          </div>

          <div className="dash-user-section">
            <div className="dash-user-chip">
              <div className="dash-user-avatar" style={{ background: `linear-gradient(135deg, ${COLORS.brand}, ${COLORS.brandLight})` }}>
                {(user?.email?.[0] || "?").toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="dash-user-info">
                  <span className="dash-user-email">{user?.email || 'Unknown'}</span>
                  <span className="dash-user-role">{role || 'user'}</span>
                </div>
              )}
            </div>
            
            <div className="dash-action-buttons">
              <button 
                onClick={toggleTheme}
                className="dash-theme-btn"
                title={isDark ? "Light Mode" : "Dark Mode"}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button className="dash-logout-btn" onClick={handleLogout} title="Sign Out">
                <LogOut size={18} />
                {!sidebarCollapsed && <span>Sign Out</span>}
              </button>
            </div>
          </div>
        </nav>

        {/* ── Main Content ── */}
        <main className="dash-main">
          {/* Dashboard View - Bento Box Layout */}
          {currentView === "dashboard" && (
            <div className="dash-view" key="dashboard">
              <div className="dash-header">
                <div>
                  <h2 className="dash-title dash-slide-in">Asset Dashboard</h2>
                  <p className="dash-subtitle text-gray-600 dark:text-gray-400">Real-time snapshot of your asset portfolio</p>
                </div>
                <div className="dash-header-actions">
                  <button 
                    className="dash-btn" 
                    onClick={handleRefresh}
                    disabled={isDataLoading}
                  >
                    <RefreshCw size={16} className={isDataLoading ? "spin" : ""} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Bento Grid - Top Stats Row */}
              <div className="bento-grid">
                {statCards.map(({ label, value, icon: Icon, badge, color, bgColor, sparkline, onClick }, idx) => (
                  <div 
                    key={label} 
                    className="bento-card stat-card"
                    onClick={onClick}
                    style={{ cursor: onClick ? 'pointer' : 'default' }}
                  >
                    <div className="stat-card-header">
                      <div className="stat-icon-wrap" style={{ background: bgColor, color: color }}>
                        <Icon size={20} />
                      </div>
                      <span className="stat-badge" style={{ background: bgColor, color: color }}>{badge}</span>
                    </div>
                    <div className="stat-card-body">
                      <p className="stat-label">{label}</p>
                      <p className="stat-value">{value}</p>
                    </div>
                    <div className="stat-sparkline">
                      <SparklineChart data={sparkline} color={color} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-600 text-right pr-2 -mt-1">Last 30 Days</p>
                    <div className="stat-card-glow" style={{ background: color }} />
                  </div>
                ))}
              </div>

              {/* Bento Grid - Two Column Layout */}
              <div className="bento-grid-two">
                {/* Portfolio Health Card */}
                <div className="bento-card health-card">
                  <div className="card-header">
                    <h3 className="card-title">Portfolio Health</h3>
                    <span className="card-subtitle text-gray-600 dark:text-gray-400">Overview metrics</span>
                  </div>
                  <div className="health-metrics">
                    <div className="health-metric">
                      <div className="metric-ring" style={{ '--progress': `${assets.length > 0 ? (stats.active / assets.length) * 100 : 0}%`, '--color': COLORS.emerald }}>
                        <span className="metric-value">{assets.length > 0 ? Math.round((stats.active / assets.length) * 100) : 0}%</span>
                      </div>
                      <p className="metric-label">Utilization</p>
                    </div>
                    <div className="health-metric">
                      <div className="metric-ring" style={{ '--progress': `${assets.length > 0 ? (stats.pending / assets.length) * 100 : 0}%`, '--color': COLORS.indigo }}>
                        <span className="metric-value">{stats.pending}</span>
                      </div>
                      <p className="metric-label">Pending</p>
                    </div>
                    <div className="health-metric">
                      <div className="metric-ring" style={{ '--progress': `${assets.length > 0 ? (stats.transferred / assets.length) * 100 : 0}%`, '--color': COLORS.amber }}>
                        <span className="metric-value">{stats.transferred}</span>
                      </div>
                      <p className="metric-label">Transferred</p>
                    </div>
                  </div>
                </div>

                {/* Status Distribution Card */}
                <div className="bento-card status-card">
                  <div className="card-header">
                    <h3 className="card-title">Status Distribution</h3>
                    <span className="card-subtitle text-gray-600 dark:text-gray-400">Assets by status</span>
                  </div>
                  <div className="status-chart">
                    <ResponsiveContainer width="100%" height={160}>
                      <RePieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS.slate} />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="status-legend">
                      {statusData.map((item) => (
                        <div key={item.name} className="legend-item">
                          <span className="legend-dot" style={{ background: STATUS_COLORS[item.name] || COLORS.slate }} />
                          <span className="legend-label">{item.name}</span>
                          <span className="legend-value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Section */}
              <div className="bento-card analytics-card">
                <div className="card-header">
                  <h3 className="card-title">Asset Analytics</h3>
                  <span className="card-subtitle text-gray-600 dark:text-gray-400">Detailed breakdown</span>
                </div>
                <DashboardCharts assets={assets} />
              </div>
            </div>
          )}

          {/* Logs View */}
          {currentView === "logs" && (
            <div className="dash-view" key="logs">
              <div className="dash-header">
                <h2 className="dash-title dash-slide-in">System Logs</h2>
                <p className="dash-subtitle text-gray-600 dark:text-gray-400">{logs.length} entries recorded</p>
              </div>
              
              <div className="dash-logs-actions">
                <button className="dash-btn" onClick={handleExportClick}>
                  <Download size={16} /> Export
                </button>
                <button className="dash-btn dash-btn-danger" onClick={handleDeleteLogsClick}>
                  <Trash2 size={16} /> Clear
                </button>
              </div>

              <div className="dash-logs-list system-logs-list">
                <div className="dash-log-header">
                  <span>Timestamp</span>
                  <span>User</span>
                  <span>Action</span>
                  <span>Details</span>
                </div>
                {(logs || []).length === 0 ? (
                  <div className="dash-log-empty">No logs found.</div>
                ) : (
                  logs.slice(0, 50).map((log) => (
                    <div key={log.id} className="dash-log-row">
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                      <span>{log.user_email}</span>
                      <span>
                        <span className={`dash-log-badge ${actionTypeColor(log.action_type)}`}>
                          {log.action_type}
                        </span>
                      </span>
                      <span>{formatLogDetails(log)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Asset Summary View */}
          {currentView === "summary" && (
            <div className="dash-view" key="summary">
              <div className="dash-header">
                <h2 className="dash-title dash-slide-in">Asset Inventory</h2>
                <p className="dash-subtitle text-gray-600 dark:text-gray-400">{assets.length} total records</p>
              </div>
              
              <div className="dash-actions">
                <button
                  className="dash-btn"
                  onClick={handleRefresh}
                  disabled={isDataLoading}
                >
                  <RefreshCw size={16} className={isDataLoading ? "spin" : ""} /> Refresh
                </button>
                <button className="dash-btn dash-btn-primary" onClick={() => setShowAddForm(true)}>
                  <Plus size={16} /> Add Asset
                </button>
              </div>

              <AssetSummary
                assets={assets}
                userRole={role}
                userEmail={user?.email}
                refreshData={() => { fetchAssets(); fetchLogs(); }}
                showPendingOnly={false}
              />
            </div>
          )}

          {/* Downpayment View */}
          {currentView === "downpayment" && (
            <div className="dash-view" key="downpayment">
              <div className="dash-header">
                <h2 className="dash-title dash-slide-in">Downpayment Assets</h2>
                <p className="dash-subtitle text-gray-600 dark:text-gray-400">Track installment payments</p>
              </div>

              <DownpaymentTable
                assets={assets}
                userRole={role}
                userEmail={user?.email}
                refreshData={() => { fetchAssets(); fetchLogs(); }}
              />
            </div>
          )}
        </main>
      </div>

      {/* ── Modals ── */}
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
        <div className="dash-modal-overlay" onClick={() => setShowAmortization(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Monthly Amortization</h3>
              <button onClick={() => setShowAmortization(false)}><X size={18} /></button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-date-inputs">
                <div>
                  <label>From</label>
                  <input
                    type="month"
                    value={amortizationDates.start}
                    onChange={(e) => setAmortizationDates({ ...amortizationDates, start: e.target.value })}
                  />
                </div>
                <div>
                  <label>To</label>
                  <input
                    type="month"
                    value={amortizationDates.end}
                    onChange={(e) => setAmortizationDates({ ...amortizationDates, end: e.target.value })}
                  />
                </div>
              </div>
              <div className="dash-sched-list">
                {amortizationSchedule.map((item, idx) => (
                  <div key={idx} className="dash-sched-row">
                    <span>{item.date}</span>
                    <span>₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="dash-sched-total">
                  <span>Total</span>
                  <span>₱{amortizationTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="dash-modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="dash-modal dash-pin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3><Lock size={18} /> {pinAction === "delete" ? "Confirm Deletion" : "Admin Authorization"}</h3>
              <button onClick={() => setShowPinModal(false)}><X size={18} /></button>
            </div>
            <div className="dash-modal-body">
              <p>Enter Admin PIN to {pinAction === "delete" ? "delete logs" : "export logs"}.</p>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="• • • •"
                maxLength={4}
              />
              {pinError && <p className="dash-error">{pinError}</p>}
              <button className="dash-btn dash-btn-primary" onClick={verifyPinAndAction} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                Verify PIN
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
