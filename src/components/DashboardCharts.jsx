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

const COLORS = ["#10B981", "#EF4444", "#F59E0B", "#3B82F6"];

// Custom tooltip for dark mode
const CustomTooltip = ({ active, payload, label }) => {
  const { isDark } = useTheme();
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: isDark ? '#262626' : '#fff',
        border: `1px solid ${isDark ? 'rgba(220,38,38,0.3)' : '#fde8e8'}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        <p style={{ color: isDark ? '#f5f5f5' : '#111827', fontWeight: 600, marginBottom: 4 }}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: 13 }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardCharts = ({ assets }) => {
  const { isDark } = useTheme();

  // Calculate data for Pie Chart - Asset Status Distribution
  const statusData = React.useMemo(() => {
    const statusCounts = assets.reduce((acc, asset) => {
      const status = asset.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [assets]);

  // Calculate data for Bar Chart - Asset Value by Category
  const categoryData = React.useMemo(() => {
    const categoryValues = assets.reduce((acc, asset) => {
      const category = asset.category || "Uncategorized";
      const value = parseFloat(asset.total_cost) || 0;
      acc[category] = (acc[category] || 0) + value;
      return acc;
    }, {});

    return Object.entries(categoryValues)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [assets]);

  // Calculate data for Bar Chart - Assets by Company
  const companyData = React.useMemo(() => {
    const companyCounts = assets.reduce((acc, asset) => {
      const company = asset.current_company || "Unknown";
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(companyCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [assets]);

  // Calculate data for Bar Chart - Asset Count by Category
  const categoryCountData = React.useMemo(() => {
    const categoryCounts = assets.reduce((acc, asset) => {
      const category = asset.category || "Uncategorized";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryCounts)
      .map(([name, value]) => ({
        name,
        count: value,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [assets]);

  // Dark mode colors for chart elements
  const gridColor = isDark ? '#333333' : '#e5e7eb';
  const axisColor = isDark ? '#737373' : '#6b7280';
  const textColor = isDark ? '#a3a3a3' : '#374151';

  return (
    <>
      <style>{`
        .charts-root {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 32px;
          width: 100%;
        }
        @media (min-width: 768px) {
          .charts-root {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .chart-card {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #fde8e8;
          box-shadow: 0 3px 20px rgba(220,38,38,0.08);
          padding: 32px;
          width: 100%;
        }
        .chart-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 24px;
        }
        .chart-container {
          height: 280px;
          width: 100%;
        }
        
        /* Dark mode support */
        .dark .chart-card {
          background: #1a1a1a;
          border-color: rgba(220,38,38,0.15);
        }
        .dark .chart-title {
          color: #f3f4f6;
        }
      `}</style>

      <div className="charts-root">
        {/* Pie Chart - Asset Status Distribution */}
        <div className="chart-card">
          <h3 className="chart-title">Asset Status Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: axisColor }}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ color: textColor }}
                  formatter={(value) => <span style={{ color: textColor }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Asset Value by Category */}
        <div className="chart-card">
          <h3 className="chart-title">Asset Value by Category (Top 10)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: axisColor }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip content={<CustomTooltip />} formatter={(value) => [`₱${value.toLocaleString()}`, "Value"]} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Assets by Company */}
        <div className="chart-card">
          <h3 className="chart-title">Asset Count by Company</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: axisColor }} />
                <YAxis tick={{ fontSize: 12, fill: axisColor }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Asset Count by Category */}
        <div className="chart-card">
          <h3 className="chart-title">Asset Count by Category (Top 10)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryCountData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: axisColor }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12, fill: axisColor }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardCharts;
