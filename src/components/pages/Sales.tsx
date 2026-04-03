import { Search, Download, ShoppingBag, Eye, Monitor, DollarSign, CheckCircle, XCircle, ShoppingCart } from "lucide-react";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import type { SaleRecord, SaleDetail } from "@/types";
import { api } from "@/services/api";
import { ViewInvoiceModal } from "@/components/modals/ViewInvoiceModal";
type ViewMode = "daily" | "monthly" | "annual";

export function Sales() {
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SaleDetail | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [salesStats, setSalesStats] = useState<{
    total_revenue: number;
    total_transactions: number;
    completed_sales: number;
    failed_payments: number;
    sales_performance: Array<{ label: string; revenue: number; transactions: number }>;
  } | null>(null);
  const [view, setView] = useState<ViewMode>("monthly");
  const [chartLoading, setChartLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo]);

  const fetchSalesStats = useCallback((viewMode: ViewMode) => {
    setChartLoading(true);
    api.getDashboardStats(viewMode)
      .then(res => {
        setSalesStats({
          total_revenue: res.total_revenue,
          total_transactions: res.total_transactions,
          completed_sales: res.completed_sales,
          failed_payments: res.failed_payments,
          sales_performance: res.sales_performance,
        });
      })
      .catch(err => {
        console.error("Failed to fetch sales stats:", err);
      })
      .finally(() => {
        setChartLoading(false);
      });
  }, []);

  useEffect(() => {
    api.getSales()
      .then((res) => {
        setSalesRecords(res.sales);
      })
      .catch((err) => {
        console.error("Failed to fetch sales:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSalesStats(view);
  }, [view, fetchSalesStats]);

  const formatPeso = (value: number) => {
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const kpis = [
    {
      label: "Total Revenue",
      value: salesStats ? formatPeso(salesStats.total_revenue) : "₱0.00",
      icon: DollarSign,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Total Transactions",
      value: salesStats ? salesStats.total_transactions.toLocaleString() : "0",
      icon: ShoppingCart,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Completed Sales",
      value: salesStats ? salesStats.completed_sales.toLocaleString() : "0",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Failed Payments",
      value: salesStats ? salesStats.failed_payments.toLocaleString() : "0",
      icon: XCircle,
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  const handleViewInvoice = async (invoiceId: number) => {
    setLoadingInvoice(true);
    try {
      const detail = await api.getSale(invoiceId);
      setSelectedInvoice(detail);
    } catch (err) {
      console.error("Failed to fetch sale details:", err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const filteredRecords = salesRecords.filter((record) => {
    const invoiceNumber = `INV-${String(record.invoice_id).padStart(6, "0")}`;
    const matchesSearch =
      invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.customer_info.toLowerCase().includes(searchTerm.toLowerCase());

    const recordDate = new Date(record.invoice_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    const matchesDateFrom = !fromDate || recordDate >= fromDate;
    const matchesDateTo = !toDate || recordDate <= toDate;

    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
            <p className="text-gray-600 mt-1">Track product sales with complete invoice details</p>
          </div>
          <Link
            to="/pos"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Monitor className="w-4 h-4" />
            POS Terminal
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`${kpi.bgColor} p-6 rounded-lg shadow-sm border border-gray-200`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">{kpi.label}</span>
              <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Sales Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Sales Performance</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("daily")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                view === "daily"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setView("monthly")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                view === "monthly"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setView("annual")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                view === "annual"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Annual
            </button>
          </div>
        </div>
        <div className="h-[300px]">
          {chartLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-gray-500 text-sm">Loading sales data...</p>
              </div>
            </div>
          ) : salesStats && salesStats.sales_performance.length > 0 ? (
            view === "daily" ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesStats.sales_performance} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    dy={8}
                    minTickGap={28}
                  />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(value) => `₱${value.toLocaleString()}`} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dx={10}
                    allowDecimals={false}
                    domain={[0, "auto"]}
                    tickFormatter={(v) => String(Math.round(Number(v)))}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) =>
                      name === "Revenue"
                        ? [formatPeso(value), name]
                        : [String(Math.round(Number(value))), name]
                    }
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="transactions"
                    name="Transactions"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesStats.sales_performance} barCategoryGap="24%" barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} interval={0} angle={view === "monthly" ? -28 : 0} textAnchor={view === "monthly" ? "end" : "middle"} height={view === "monthly" ? 56 : 32} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(value) => `₱${value.toLocaleString()}`} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dx={10}
                    allowDecimals={false}
                    domain={[0, "auto"]}
                    tickFormatter={(v) => String(Math.round(Number(v)))}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) =>
                      name === "Revenue"
                        ? [formatPeso(value), name]
                        : [String(Math.round(Number(value))), name]
                    }
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="transactions"
                    name="Transactions"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">No sales data available</p>
                <p className="text-sm text-gray-400 mt-1">Start making sales through POS Terminal to see performance</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Sales Transactions</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="From"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="To"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading sales records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No sales transactions available</p>
                    <p className="text-sm text-gray-400 mt-1">Create a new sale from the POS terminal to get started</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={record.invoice_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.customer_info}</div>
                      {record.contact_number && (
                        <div className="text-xs text-gray-500">{record.contact_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.items.length} item{record.items.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{record.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.payment_status === "Paid" ? "bg-green-100 text-green-800" :
                        record.payment_status === "Refunded" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {record.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewInvoice(record.invoice_id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <OrdersStyleTablePagination
            itemCount={filteredRecords.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>

      <ViewInvoiceModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        loading={loadingInvoice}
      />
    </div>
  );
}
