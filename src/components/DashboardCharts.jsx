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

const COLORS = ["#10B981", "#EF4444", "#F59E0B", "#3B82F6"];

const DashboardCharts = ({ assets }) => {
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
      .slice(0, 10); // Top 10 categories
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
      .slice(0, 10); // Top 10 categories
  }, [assets]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Pie Chart - Asset Status Distribution */}
      <div className="bg-white p-8 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-6">
          Asset Status Distribution
        </h3>
        <div className="h-64">
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
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {statusData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart - Asset Value by Category */}
      <div className="bg-white p-8 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-6">
          Asset Value by Category (Top 10)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => [`₱${value.toLocaleString()}`, "Value"]}
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart - Assets by Company */}
      <div className="bg-white p-8 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-6">
          Asset Count by Company
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={companyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart - Asset Count by Category */}
      <div className="bg-white p-8 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-6">
          Asset Count by Category (Top 10)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryCountData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
