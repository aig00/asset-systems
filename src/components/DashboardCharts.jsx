import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "../context/ThemeContext";

/* ── Modern Chart Palette (2026 Design Trends) ── */
const COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#dc2626", // brand red
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f43f5e", // rose
  "#a78bfa", // purple
];

/* Status-specific colors with modern accents */
const STATUS_COLORS = {
  Active:      "#10b981",
  Disposed:    "#dc2626",
  Transferred: "#f59e0b",
  Pending:     "#6366f1",
  Rejected:    "#9ca3af",
};

const CustomTooltip = ({ active, payload, label }) => {
  const { isDark } = useTheme();
  if (!active || !payload?.length) return null;
  
  const theme = {
    bg: isDark ? "rgba(17,17,17,0.95)" : "rgba(255,255,255,0.97)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(232,229,227,0.8)",
    text: isDark ? "#f5f5f5" : "#111827",
    muted: isDark ? "#9ca3af" : "#6b7280",
    subtle: isDark ? "#d1d5db" : "#374151",
  };

  return (
    <div
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "14px 18px",
        boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
        fontFamily: "'Inter', sans-serif",
        backdropFilter: "blur(12px)",
        borderImage: `linear-gradient(135deg, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(220,38,38,0.15)'}, transparent) 1`,
      }}
    >
      {label && (
        <p
          style={{
            color: theme.text,
            fontWeight: 600,
            fontSize: 13,
            marginBottom: 8,
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p
          key={i}
          style={{
            color: theme.subtle,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "4px 0",
            lineHeight: 1.4,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: entry.color || entry.fill,
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          />
          <span style={{ color: theme.muted, fontWeight: 500 }}>{entry.name}:</span>
          <strong style={{ color: theme.text, fontWeight: 700 }}>
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
          </strong>
        </p>
      ))}
    </div>
  );
};

const DashboardCharts = ({ assets }) => {
  const { isDark } = useTheme();

  /* Asset Status Distribution (Pie) */
  const statusData = React.useMemo(() => {
    const counts = assets.reduce((acc, a) => {
      const s = a.status || "Unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  /* Asset Value by Category (Bar) */
  const categoryData = React.useMemo(() => {
    const vals = assets.reduce((acc, a) => {
      const cat = a.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + (parseFloat(a.total_cost) || 0);
      return acc;
    }, {});
    return Object.entries(vals)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [assets]);

  /* Asset Count by LOB (Bar) */
  const companyData = React.useMemo(() => {
    const counts = assets.reduce((acc, a) => {
      const co = a.current_company || "Unknown";
      acc[co] = (acc[co] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  /* Asset Count by Category (Bar) */
  const categoryCountData = React.useMemo(() => {
    const counts = assets.reduce((acc, a) => {
      const cat = a.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [assets]);

  /* Theme-aware chart colors */
  const grid   = isDark ? "rgba(255,255,255,0.06)" : "rgba(232,229,227,0.6)";
  const axis   = isDark ? "#525252" : "#9ca3af";

  const cardStyle = {
    background:   "var(--surface-card)",
    borderRadius: "var(--radius-card)",
    border:       "1px solid var(--border)",
    boxShadow:    "var(--shadow-card)",
    padding:      "24px",
    width:        "100%",
    transition:   "all var(--duration-base) var(--ease-out)",
  };

  const titleStyle = {
    fontFamily:    "'Space Grotesk', system-ui, sans-serif",
    fontSize:      "16px",
    fontWeight:    700,
    color:         "var(--text-primary)", // This correctly uses CSS variables
    marginBottom:  "6px",
    letterSpacing: "-0.02em",
    textTransform: "uppercase",
  };

  const subtitleStyle = {
    fontSize:     "12px",
    color:        "var(--text-secondary)",
    marginBottom: "20px",
    fontWeight:   400,
    letterSpacing: "0.04em",
  };

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", 
      gap: "20px", 
      width: "100%" 
    }}>

      {/* ── Pie: Status Distribution ── */}
      <div style={cardStyle}>
        <p style={titleStyle}>Status Distribution</p>
        <p style={subtitleStyle}>Assets by current status</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {statusData.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ 
                fontSize: 12, 
                color: "var(--text-secondary)", 
                paddingTop: 8,
                fontFamily: "'Inter', sans-serif"
              }}
              formatter={(v) => <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bar: Value by Category ── */}
      <div style={cardStyle}>
        <p style={titleStyle}>Asset Value by Category</p>
        <p style={subtitleStyle}>Top 10 categories by total cost</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={categoryData} barSize={16}>
            <CartesianGrid strokeDasharray="2 4" stroke={grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: axis }}
              angle={-40}
              textAnchor="end"
              height={72}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: axis }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<CustomTooltip />}
              formatter={(v) => [`₱${v.toLocaleString()}`, "Value"]}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              fill="#6366f1"
              name="Value"
            >
              {categoryData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bar: Count by LOB ── */}
      <div style={cardStyle}>
        <p style={titleStyle}>Assets by LOB</p>
        <p style={subtitleStyle}>Count per line of business</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={companyData} barSize={18}>
            <CartesianGrid strokeDasharray="2 4" stroke={grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: axis }}
              angle={-30}
              textAnchor="end"
              height={64}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: axis }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Count">
              {companyData.map((_, i) => (
                <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bar: Count by Category ── */}
      <div style={cardStyle}>
        <p style={titleStyle}>Asset Count by Category</p>
        <p style={subtitleStyle}>Top 10 categories by quantity</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={categoryCountData} barSize={16}>
            <CartesianGrid strokeDasharray="2 4" stroke={grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: axis }}
              angle={-40}
              textAnchor="end"
              height={72}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: axis }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Count">
              {categoryCountData.map((_, i) => (
                <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardCharts;
