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

/* ── Multi-hue chart palette (modern, not all-red) ── */
const COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#dc2626", // brand red
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

/* Status-specific colors */
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
  return (
    <div
      style={{
        background: isDark ? "rgba(26,26,26,0.95)" : "rgba(255,255,255,0.97)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e8e5e3"}`,
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
        fontFamily: "'DM Sans', sans-serif",
        backdropFilter: "blur(8px)",
      }}
    >
      {label && (
        <p
          style={{
            color: isDark ? "#f5f5f5" : "#111827",
            fontWeight: 600,
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p
          key={i}
          style={{
            color: isDark ? "#d1d5db" : "#374151",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "3px 0",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: entry.color || entry.fill,
              flexShrink: 0,
            }}
          />
          <span style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>{entry.name}:</span>
          <strong style={{ color: isDark ? "#f5f5f5" : "#111827" }}>
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
  const grid   = isDark ? "rgba(255,255,255,0.06)" : "#f0eeec";
  const axis   = isDark ? "#525252" : "#9ca3af";
  const textColor = isDark ? "#a3a3a3" : "#6b7280";

  const cardStyle = {
    background:   isDark ? "var(--surface-3)" : "var(--surface)",
    borderRadius: "var(--radius-card)",
    border:       `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "var(--border)"}`,
    boxShadow:    "var(--shadow-card)",
    padding:      "24px",
    width:        "100%",
  };

  const titleStyle = {
    fontFamily:    "'Syne', system-ui, sans-serif",
    fontSize:      "15px",
    fontWeight:    700,
    color:         "var(--text-primary)",
    marginBottom:  "2px",
    letterSpacing: "-0.01em",
  };

  const subtitleStyle = {
    fontSize:     "12px",
    color:        textColor,
    marginBottom: "20px",
    fontWeight:   400,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px", width: "100%" }}>

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
              wrapperStyle={{ fontSize: 12, color: textColor, paddingTop: 8 }}
              formatter={(v) => <span style={{ color: textColor, fontSize: 12 }}>{v}</span>}
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
