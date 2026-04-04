import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, AlertTriangle, CheckCircle, Truck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";
import { api, type DashboardStats } from "@/services/api";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.getDashboardStats()
      .then(res => {
        if (!cancelled) {
          setStats(res);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error("Dashboard error:", err);
          setError(err.message || "Failed to load dashboard data");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    api.getUpcomingDeliveries()
      .then(res => {
        setUpcomingDeliveries(res.deliveries || []);
      })
      .catch(err => {
        console.error("Failed to load upcoming deliveries:", err);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-red-50 p-8 rounded-lg border border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={() => { setLoading(true); setError(null); window.location.reload(); }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Revenue", value: stats ? `₱${stats.total_revenue.toLocaleString()}` : "N/A", icon: DollarSign, color: "text-green-600" },
    { label: "Total Transactions", value: stats ? stats.total_transactions.toLocaleString() : "N/A", icon: ShoppingCart, color: "text-blue-600" },
    { label: "Completed Sales", value: stats ? stats.completed_sales.toLocaleString() : "N/A", icon: CheckCircle, color: "text-green-600" },
    { label: "Failed Payments", value: stats ? stats.failed_payments.toLocaleString() : "N/A", icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Sales & Inventory Management System</p>
      </div>

      {/* Expected Delivery Reminder */}
      {upcomingDeliveries.length > 0 && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
          <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              {upcomingDeliveries.length === 1 
                ? "You have an expected delivery arriving tomorrow." 
                : `You have ${upcomingDeliveries.length} expected deliveries arriving tomorrow.`}
            </h3>
            <div className="mt-2 space-y-1">
              {upcomingDeliveries.map((delivery) => (
                <p key={delivery.order_id} className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Order #{delivery.order_id}</strong> from {delivery.supplier_name || "Unknown Supplier"} - {delivery.total_items} item{delivery.total_items !== 1 ? "s" : ""}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">{kpi.label}</span>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="flex items-center text-gray-400 text-sm mt-2">
              <span>{stats ? "Updated just now" : "No data available"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sales Trend & Forecast */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend & Forecast</h2>
          <div className="h-[300px]">
            {stats && stats.sales_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.sales_trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₱${value.toLocaleString()}`, ""]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Line 
                    type="monotone" 
                    dataKey="actual_sales" 
                    name="Actual Sales" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecast_sales" 
                    name="Forecast" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No sales data available</p>
                  <p className="text-sm mt-1">Start adding sales to see trends</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h2>
          <div className="h-[300px]">
            {stats && stats.sales_by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.sales_by_category}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="category"
                  >
                    {stats.sales_by_category.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `₱${value.toLocaleString()} (${props.payload.percentage}%)`, 
                      name
                    ]}
                  />
                  <Legend verticalAlign="bottom" height={36} layout="horizontal" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No category data</p>
                  <p className="text-sm mt-1">Data not available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Top Selling Products</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats && stats.top_products.length > 0 ? (
                stats.top_products.map((product, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.units_sold}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.current_stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === "Critical" ? "bg-red-100 text-red-800" :
                        product.status === "Low" ? "bg-orange-100 text-orange-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No product data available</p>
                    <p className="text-sm text-gray-400 mt-1">Add products to start tracking sales</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
