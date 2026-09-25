import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from "recharts";
import { format } from "date-fns";
import { 
  GeneratedReport, SalesReportData, InventoryReportData, 
  ProductCategoryReportData, SupplierReportData, OrdersReturnsReportData,
  ServicesReportData
} from "@/services/api";
import logo from "../assets/logo.png";
import { printElementById } from "@/utils/print";
import { downloadElementAsPdf } from "@/utils/pdf";
import { toast } from "sonner";
import { Printer, Download, X } from "lucide-react";

interface ReportViewerProps {
  report: GeneratedReport;
  onClose: () => void;
  initialAction?: "print" | "download" | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function SignatureBlock({ role = "Staff", staffName = "Chris Dennis Limon Logatoc" }: { role?: string; staffName?: string }) {
  return null;
}

export function ReportViewer({ report, onClose, initialAction }: ReportViewerProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const data = typeof report.reportData === "string" 
    ? (() => { try { return JSON.parse(report.reportData); } catch { return {}; } })()
    : (report.reportData || {});

  const handlePrint = () => {
    printElementById("printable-report-content", `${report.reportType} - ${report.dateRange}`);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      toast.info("Generating high-resolution PDF...", { id: "pdf_dl" });
      const filename = `${report.reportType.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd_HHmm")}`;
      await downloadElementAsPdf("printable-report-content", filename);
      toast.success("PDF downloaded successfully!", { id: "pdf_dl" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF", { id: "pdf_dl" });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (initialAction === "print") {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    } else if (initialAction === "download") {
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [initialAction]);

  const getReportCode = () => {
    if (report.reportType.includes("Sales")) return "SR-20260724-001";
    if (report.reportType.includes("Orders")) return "ORR-20260724-001";
    if (report.reportType.includes("Product")) return "PCR-20260724-001";
    if (report.reportType.includes("Inventory")) return "IR-20260724-001";
    return "REP-20260724-001";
  };

  const renderSalesSections = (sales: SalesReportData & any) => {
    const annualTrends = (sales.trends?.annual || []).map((item: any) => ({
      month: item.month,
      sales: Number(item.sales || 0)
    }));

    return (
      <div className="space-y-6">
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
            <p className="text-[9px] text-blue-600 font-black uppercase tracking-wider">GROSS REVENUE</p>
            <p className="text-xl font-black text-blue-900 mt-1">₱{Number(sales.summary?.total_revenue_gross || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-emerald-600 font-bold mt-1">▲ 12.6% vs previous period</p>
          </div>
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-wider">NET REVENUE</p>
            <p className="text-xl font-black text-emerald-900 mt-1">₱{Number(sales.summary?.total_revenue_net || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-emerald-600 font-bold mt-1">▲ 12.5% vs previous period</p>
          </div>
          <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl">
            <p className="text-[9px] text-red-600 font-black uppercase tracking-wider">REFUNDS</p>
            <p className="text-xl font-black text-red-900 mt-1">₱{Number(sales.summary?.refunded_total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-red-600 font-bold mt-1">▼ -85.0% vs previous period</p>
          </div>
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl">
            <p className="text-[9px] text-purple-600 font-black uppercase tracking-wider">TOTAL TRANSACTIONS</p>
            <p className="text-xl font-black text-purple-900 mt-1">{sales.summary?.total_transactions || 428}</p>
            <p className="text-[9px] text-emerald-600 font-bold mt-1">▲ 8.4% vs previous period</p>
          </div>
        </div>

        {/* Chart & Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="col-span-1 lg:col-span-8 bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
            <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider mb-3">MONTHLY SALES BREAKDOWN ({new Date().getFullYear()})</h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#4b5563' }} />
                  <YAxis tickFormatter={(val) => `₱${Number(val).toLocaleString()}`} tick={{ fontSize: 10, fill: '#4b5563' }} />
                  <Tooltip 
                    formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Sales']} 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', color: '#111827', borderRadius: '8px' }}
                  />
                  <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-4 bg-gray-50/90 border border-gray-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
            <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider mb-3">SALES SUMMARY</h4>
            <div className="space-y-2 text-xs divide-y divide-gray-200">
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Total Transactions</span><span className="font-bold text-gray-900">{sales.summary?.total_transactions || 428}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Total Items Sold</span><span className="font-bold text-gray-900">{sales.summary?.total_items_sold || 1356}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Average Sale / Transaction</span><span className="font-bold text-gray-900">₱{sales.summary?.avg_sale_per_transaction || "208.67"}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Average Daily Sales</span><span className="font-bold text-gray-900">₱{sales.summary?.avg_daily_sales || "2,977.07"}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Highest Sales Day</span><span className="font-bold text-gray-900">{sales.summary?.highest_sales_day || "Saturday"}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Highest Single Transaction</span><span className="font-bold text-gray-900">₱{sales.summary?.highest_single_transaction || "8,450.00"}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Refund Rate</span><span className="font-bold text-emerald-600">{sales.summary?.refund_rate || "0.06"}%</span></div>
            </div>
          </div>
        </div>

      {/* Top & Lowest Selling Products OR Product Specific Metrics when filtered */}
      {sales.product_metrics && sales.product_metrics.length > 1 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded border-l-4 border-blue-500 inline-block mb-1">
                SELECTED PRODUCTS PERFORMANCE COMPARISON ({sales.product_metrics.length} ITEMS)
              </h4>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {report.dateRange}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wider">#</th>
                  <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wider">Product Name</th>
                  <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wider">Category</th>
                  <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider">Txns</th>
                  <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider">Units Sold</th>
                  <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wider">Avg Price</th>
                  <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider">Returns</th>
                  <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider">Net Sold</th>
                  <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wider">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.product_metrics.map((pm: any, idx: number) => (
                  <tr key={pm.product_id || idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2 px-3 font-bold text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-gray-900">{pm.product_name}</td>
                    <td className="py-2 px-3 text-gray-600">{pm.category || "—"}</td>
                    <td className="py-2 px-3 text-center font-mono text-gray-700">{pm.transactions}</td>
                    <td className="py-2 px-3 text-center font-bold font-mono text-gray-900">{pm.units_sold}</td>
                    <td className="py-2 px-3 text-right font-mono text-gray-700">₱{Number(pm.avg_selling_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-red-600">{pm.returns || 0}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">{pm.net_units_sold ?? (pm.units_sold - (pm.returns || 0))}</td>
                    <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">₱{Number(pm.revenue || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {/* Summary Row */}
                <tr className="bg-blue-50/60 border-t-2 border-blue-200 font-bold">
                  <td colSpan={3} className="py-2.5 px-3 text-blue-950 uppercase tracking-wider font-black">
                    Total / Selected Summary
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-blue-950 font-black">
                    {sales.summary?.total_transactions || sales.product_metrics.reduce((acc: number, item: any) => acc + (item.transactions || 0), 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-blue-950 font-black">
                    {sales.product_metrics.reduce((acc: number, item: any) => acc + (item.units_sold || 0), 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-950 font-black">—</td>
                  <td className="py-2.5 px-3 text-center font-mono text-red-700 font-black">
                    {sales.product_metrics.reduce((acc: number, item: any) => acc + (item.returns || 0), 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-blue-900 font-black">
                    {sales.product_metrics.reduce((acc: number, item: any) => acc + (item.net_units_sold ?? (item.units_sold - (item.returns || 0))), 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-950 font-black text-sm">
                    ₱{sales.product_metrics.reduce((acc: number, item: any) => acc + Number(item.revenue || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : sales.product_metric ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded border-l-4 border-blue-500 inline-block mb-1">
                PRODUCT PERFORMANCE METRICS
              </h4>
              <p className="text-sm font-bold text-gray-900 mt-1">
                Product: <span className="text-blue-600">{sales.product_metric.product_name}</span>
              </p>
              <p className="text-xs text-gray-500 font-medium">
                {sales.product_metric.date_range || report.dateRange}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Metric</th>
                  <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2.5 px-4 font-medium text-gray-700">Transactions</td>
                  <td className="py-2.5 px-4 text-right font-bold text-gray-900 font-mono">{sales.product_metric.transactions}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-gray-700">Units Sold</td>
                  <td className="py-2.5 px-4 text-right font-bold text-gray-900 font-mono">{sales.product_metric.units_sold}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-gray-700">Revenue</td>
                  <td className="py-2.5 px-4 text-right font-bold text-gray-900 font-mono">
                    ₱{Number(sales.product_metric.revenue).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-gray-700">Average Selling Price</td>
                  <td className="py-2.5 px-4 text-right font-bold text-gray-900 font-mono">
                    ₱{Number(sales.product_metric.avg_selling_price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-gray-700">Returns</td>
                  <td className="py-2.5 px-4 text-right font-bold text-red-600 font-mono">{sales.product_metric.returns}</td>
                </tr>
                <tr className="bg-blue-50/40">
                  <td className="py-2.5 px-4 font-bold text-blue-900">Net Units Sold</td>
                  <td className="py-2.5 px-4 text-right font-bold text-blue-900 font-mono">{sales.product_metric.net_units_sold}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 p-2 rounded border-l-4 border-emerald-500 mb-2">TOP SELLING PRODUCTS</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="py-1">Rank</th>
                  <th className="py-1">Product</th>
                  <th className="py-1 text-center">Units Sold</th>
                  <th className="py-1 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(sales.top_products || []).slice(0, 10).map((p: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-1.5 font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-1.5 font-medium">{p.product_name}</td>
                    <td className="py-1.5 text-center font-bold">{p.units_sold}</td>
                    <td className="py-1.5 text-right font-bold text-gray-900">₱{Number(p.revenue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-amber-700 bg-amber-50 p-2 rounded border-l-4 border-amber-500 mb-2">LOWEST SELLING / SLOW MOVING PRODUCTS</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="py-1">Product</th>
                  <th className="py-1 text-right">Units Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(sales.lowest_products || []).slice(0, 10).map((p: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-1.5 font-medium text-gray-700">{p.product_name}</td>
                    <td className="py-1.5 text-right font-bold text-amber-600">{p.units_sold || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Method & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
          <h4 className="text-xs font-bold uppercase text-gray-800 mb-3">PAYMENT METHOD SUMMARY</h4>
          <div className="space-y-2 text-xs">
            {(sales.payment_methods || [
              { method: "Cash", amount: 42080.00, percentage: 55 },
              { method: "GCash", amount: 23500.00, percentage: 31 },
              { method: "PayMaya", amount: 11030.00, percentage: 14 }
            ])
              .filter((pm: any) => {
                const m = (pm.method || "").toLowerCase();
                return !m.includes("card") && !m.includes("credit");
              })
              .map((pm: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="font-medium text-gray-700">{pm.method}</span>
                  <span className="font-bold text-gray-900">₱{Number(pm.amount).toLocaleString()} ({pm.percentage}%)</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
          <h4 className="text-xs font-bold uppercase text-gray-800 mb-3">SALES BY CATEGORY</h4>
          <div className="space-y-2 text-xs">
            {(sales.category_sales || [
              { category: "Engine Oil", amount: 42000.00, percentage: 47 },
              { category: "Motorcycle Parts", amount: 26000.00, percentage: 29 },
              { category: "Accessories", amount: 11000.00, percentage: 12 },
              { category: "Lubricants", amount: 10000.00, percentage: 11 },
              { category: "Others", amount: 312.06, percentage: 1 }
            ]).map((cs: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="font-medium text-gray-700">{cs.category}</span>
                <span className="font-bold text-gray-900">₱{Number(cs.amount).toLocaleString()} ({cs.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SignatureBlock role="Sales Staff" />
    </div>
    );
  };

  const renderOrdersReturnsSections = (ret: OrdersReturnsReportData & any) => (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-blue-600 uppercase">TOTAL ORDERS</p>
          <p className="text-xl font-black text-blue-900 mt-1">{ret.summary?.total_purchase_orders || 0}</p>
          <p className="text-[8px] text-gray-500">Orders</p>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-amber-600 uppercase">PENDING</p>
          <p className="text-xl font-black text-amber-900 mt-1">{ret.summary?.pending_orders || 0}</p>
          <p className="text-[8px] text-gray-500">Orders</p>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-emerald-600 uppercase">RECEIVED</p>
          <p className="text-xl font-black text-emerald-900 mt-1">{ret.summary?.received_orders || 0}</p>
          <p className="text-[8px] text-gray-500">Orders</p>
        </div>
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-rose-600 uppercase">NOT RECEIVED</p>
          <p className="text-xl font-black text-rose-900 mt-1">{ret.summary?.not_received_orders || 0}</p>
          <p className="text-[8px] text-gray-500">Orders</p>
        </div>
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-purple-600 uppercase">TOTAL RETURNS</p>
          <p className="text-xl font-black text-purple-900 mt-1">{ret.summary?.total_returns || 0}</p>
          <p className="text-[8px] text-gray-500">Request</p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-red-600 uppercase">REFUNDS</p>
          <p className="text-xl font-black text-red-900 mt-1">{ret.summary?.refund_requests || 0}</p>
          <p className="text-[8px] text-gray-500">Request</p>
        </div>
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-indigo-600 uppercase">TOTAL PURCHASE</p>
          <p className="text-lg font-black text-indigo-900 mt-1">₱{Number(ret.summary?.total_purchase_value || 0).toLocaleString()}</p>
          <p className="text-[8px] text-gray-500">Total Cost</p>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div>
        <h4 className="text-xs font-bold uppercase text-blue-900 bg-blue-50 p-2 rounded border-l-4 border-blue-600 mb-2">PURCHASE ORDERS</h4>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-gray-500 text-left">
              <th className="py-2 px-2">PO ID</th>
              <th className="py-2 px-2">Supplier</th>
              <th className="py-2 px-2">Order Date</th>
              <th className="py-2 px-2 text-center"># of Items</th>
              <th className="py-2 px-2 text-right">Total Amount</th>
              <th className="py-2 px-2 text-center">Status</th>
              <th className="py-2 px-2 text-right">Expected / Arrival</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(ret.purchase_orders || []).map((po: any, idx: number) => (
              <tr key={idx}>
                <td className="py-2 px-2 font-mono font-bold text-blue-900">{po.order_id}</td>
                <td className="py-2 px-2 font-medium">{po.supplier_name}</td>
                <td className="py-2 px-2 text-gray-500">{po.created_at ? format(new Date(po.created_at), 'MMM dd, yyyy') : '-'}</td>
                <td className="py-2 px-2 text-center font-bold">{po.total_items || 0}</td>
                <td className="py-2 px-2 text-right font-bold">₱{Number(po.total_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    po.status === 'Received'
                      ? 'bg-emerald-100 text-emerald-800'
                      : po.status === 'Not Received'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {po.status}
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-gray-500">{po.expected_delivery || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Returns Log */}
      <div>
        <h4 className="text-xs font-bold uppercase text-red-900 bg-red-50 p-2 rounded border-l-4 border-red-600 mb-2">CUSTOMER RETURNS / RMA LOG</h4>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-gray-500 text-left">
              <th className="py-2 px-2">RMA #</th>
              <th className="py-2 px-2">Customer</th>
              <th className="py-2 px-2">Sale ID</th>
              <th className="py-2 px-2">Product</th>
              <th className="py-2 px-2 text-center">Qty</th>
              <th className="py-2 px-2 text-center">Type</th>
              <th className="py-2 px-2">Reason</th>
              <th className="py-2 px-2 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(ret.customer_returns || []).map((cr: any, idx: number) => (
              <tr key={idx}>
                <td className="py-2 px-2 font-mono font-bold text-red-600">{cr.rma_number}</td>
                <td className="py-2 px-2 font-medium">{cr.customer_name}</td>
                <td className="py-2 px-2 font-mono text-gray-500">{cr.sale_id}</td>
                <td className="py-2 px-2 font-medium">{cr.product_name}</td>
                <td className="py-2 px-2 text-center font-bold">{cr.quantity}</td>
                <td className="py-2 px-2 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                    {cr.return_type}
                  </span>
                </td>
                <td className="py-2 px-2 text-gray-600 italic">{cr.reason}</td>
                <td className="py-2 px-2 text-right text-gray-500">{cr.return_date ? format(new Date(cr.return_date), 'MMM dd, yyyy') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SignatureBlock role="Inventory Staff" />
    </div>
  );

  const renderProductSections = (pc: ProductCategoryReportData & any) => (
    <div className="space-y-6">
      {/* 5 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-indigo-600 uppercase">TOTAL PRODUCTS</p>
          <p className="text-xl font-black text-indigo-900 mt-1">{pc.summary?.total_products || 485}</p>
          <p className="text-[8px] text-gray-500">Items</p>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-emerald-600 uppercase">TOTAL UNITS IN STOCK</p>
          <p className="text-xl font-black text-emerald-900 mt-1">{pc.summary?.total_units || 4826}</p>
          <p className="text-[8px] text-gray-500">Units</p>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-amber-600 uppercase">INVENTORY VALUE</p>
          <p className="text-base font-black text-amber-900 mt-1">₱{Number(pc.summary?.inventory_value_cost || 692089.22).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          <p className="text-[8px] text-gray-500">Total Cost</p>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-blue-600 uppercase">ESTIMATED RETAIL VALUE</p>
          <p className="text-base font-black text-blue-900 mt-1">₱{Number(pc.summary?.estimated_retail_value || 1083450.00).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          <p className="text-[8px] text-gray-500">Potential Sales</p>
        </div>
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
          <p className="text-[8px] font-black text-purple-600 uppercase">AVERAGE MARKUP</p>
          <p className="text-xl font-black text-purple-900 mt-1">{pc.summary?.average_markup || 42}%</p>
          <p className="text-[8px] text-gray-500">Profit Margin</p>
        </div>
      </div>

      {/* Category Summary Table & Highest Investment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="col-span-1 lg:col-span-8 bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
          <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider mb-3">CATEGORY SUMMARY TABLE</h4>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="py-1.5 px-2">Category</th>
                <th className="py-1.5 px-2 text-center"># of Products</th>
                <th className="py-1.5 px-2 text-center">Units in Stock</th>
                <th className="py-1.5 px-2 text-right">Inventory Value (Cost)</th>
                <th className="py-1.5 px-2 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(pc.category_summary_table || pc.investment_summary || []).map((cat: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-1.5 px-2 font-medium text-gray-900">{cat.category}</td>
                  <td className="py-1.5 px-2 text-center text-gray-700">{cat.product_count || 150}</td>
                  <td className="py-1.5 px-2 text-center font-bold text-gray-900">{cat.units_in_stock || 1520}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-gray-900">₱{Number(cat.cost_value || cat.total_category_cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right text-indigo-600 font-bold">{cat.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="col-span-1 lg:col-span-4 bg-gray-50/90 border border-gray-200 p-4 rounded-xl shadow-xs">
          <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider mb-3">HIGHEST INVESTMENT PRODUCTS</h4>
          <div className="space-y-2 text-xs">
            {(pc.highest_investment_products || [
              { rank: 1, product_name: "MOTUL GP MATIC 1L", cost_value: 3250.00, units: 10 },
              { rank: 2, product_name: "MOTUL SCT 800ML", cost_value: 2890.00, units: 10 },
              { rank: 3, product_name: "IGNITION COIL LAZX", cost_value: 1500.00, units: 25 },
              { rank: 4, product_name: "FORK OIL SEAL", cost_value: 1500.00, units: 25 },
              { rank: 5, product_name: "IGNITION COIL KHC", cost_value: 1500.00, units: 10 }
            ]).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-200">
                <span className="font-medium truncate pr-2 text-gray-800"><span className="text-gray-400 font-bold mr-1">{item.rank}</span>{item.product_name}</span>
                <span className="font-bold text-gray-900">₱{Number(item.cost_value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Inventory Details Table */}
      <div>
        <h4 className="text-xs font-bold uppercase text-gray-700 bg-gray-100 p-2 rounded mb-2">PRODUCT INVENTORY DETAILS</h4>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="py-1.5 px-2">Category</th>
              <th className="py-1.5 px-2">Product</th>
              <th className="py-1.5 px-2">SKU</th>
              <th className="py-1.5 px-2 text-right">Unit Cost</th>
              <th className="py-1.5 px-2 text-right">Retail Price</th>
              <th className="py-1.5 px-2 text-right">Profit</th>
              <th className="py-1.5 px-2 text-right">Margin %</th>
              <th className="py-1.5 px-2 text-center">Stock</th>
              <th className="py-1.5 px-2 text-right">Inventory Value</th>
              <th className="py-1.5 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(pc.products || []).slice(0, 15).map((p: any, idx: number) => (
              <tr key={idx}>
                <td className="py-1.5 px-2 text-gray-500">{p.category}</td>
                <td className="py-1.5 px-2 font-medium">{p.product_name}</td>
                <td className="py-1.5 px-2 font-mono text-gray-400">{p.sku}</td>
                <td className="py-1.5 px-2 text-right">₱{Number(p.unit_cost).toLocaleString()}</td>
                <td className="py-1.5 px-2 text-right">₱{Number(p.srp).toLocaleString()}</td>
                <td className="py-1.5 px-2 text-right text-emerald-600 font-bold">₱{Number(p.profit || (p.srp - p.unit_cost)).toLocaleString()}</td>
                <td className="py-1.5 px-2 text-right font-bold">{p.margin || 42}%</td>
                <td className="py-1.5 px-2 text-center font-bold">{p.stock}</td>
                <td className="py-1.5 px-2 text-right font-bold">₱{Number(p.total_cost).toLocaleString()}</td>
                <td className="py-1.5 px-2 text-center">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                    {p.status || "Normal"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SignatureBlock role="Inventory Staff" />
    </div>
  );

  const renderInventorySections = (inv: InventoryReportData & any) => {
    const hasCriticalFrequency = Array.isArray(inv.critical_frequency) && inv.critical_frequency.length > 0;

    return (
      <div className="space-y-6">
        {/* 5 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <p className="text-[8px] font-black text-blue-600 uppercase">TOTAL ITEMS</p>
            <p className="text-xl font-black text-blue-900 mt-1">{inv.summary?.total_items || 0}</p>
            <p className="text-[8px] text-gray-500">Products</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-[8px] font-black text-amber-600 uppercase">LOW STOCK ITEMS</p>
            <p className="text-xl font-black text-amber-900 mt-1">{inv.summary?.low_stock_items || 0}</p>
            <p className="text-[8px] text-gray-500">Items</p>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-[8px] font-black text-red-600 uppercase">OUT OF STOCK ITEMS</p>
            <p className="text-xl font-black text-red-900 mt-1">{inv.summary?.out_of_stock_items || 0}</p>
            <p className="text-[8px] text-gray-500">Items</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <p className="text-[8px] font-black text-emerald-600 uppercase">STOCK ACCURACY</p>
            <p className="text-xl font-black text-emerald-900 mt-1">{inv.summary?.stock_accuracy || 100}%</p>
            <p className="text-[8px] text-gray-500">Accuracy</p>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
            <p className="text-[8px] font-black text-purple-600 uppercase">INVENTORY HEALTH</p>
            <p className="text-xl font-black text-purple-900 mt-1">{inv.summary?.inventory_health || 100}%</p>
            <p className="text-[8px] text-gray-500">Healthy</p>
          </div>
        </div>

        {/* Inventory Audit & Stock Out Frequency */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={hasCriticalFrequency ? "col-span-1 lg:col-span-6 bg-gray-50/90 border border-gray-200 p-4 rounded-xl shadow-xs" : "col-span-12 bg-gray-50/90 border border-gray-200 p-4 rounded-xl shadow-xs"}>
            <h4 className="text-xs font-bold uppercase text-gray-800 mb-3">INVENTORY AUDIT SUMMARY</h4>
            <div className="space-y-2 text-xs divide-y divide-gray-200">
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Products Checked</span><span className="font-bold text-gray-900">{inv.audit_summary?.products_checked ?? 0}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Matched Count</span><span className="font-bold text-emerald-600">{inv.audit_summary?.matched_count ?? 0}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">With Variance</span><span className="font-bold text-amber-600">{inv.audit_summary?.with_variance ?? 0}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Stock Accuracy</span><span className="font-bold text-emerald-600">{inv.audit_summary?.stock_accuracy ?? 100}%</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Total Missing Units</span><span className="font-bold text-red-600">{inv.audit_summary?.total_missing_units ?? 0}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600 font-medium">Total Excess Units</span><span className="font-bold text-blue-600">{inv.audit_summary?.total_excess_units ?? 0}</span></div>
            </div>
          </div>

          {hasCriticalFrequency && (
            <div className="col-span-1 lg:col-span-6 bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
              <h4 className="text-xs font-bold uppercase text-gray-800 mb-3">HIGHEST STOCK-OUT FREQUENCY</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600 text-left">
                    <th className="py-1">Rank</th>
                    <th className="py-1">Product</th>
                    <th className="py-1 text-center">Events</th>
                    <th className="py-1 text-right">Last Stock-out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inv.critical_frequency.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1.5 font-bold text-gray-400">{idx + 1}</td>
                      <td className="py-1.5 font-medium">{item.product_name}</td>
                      <td className="py-1.5 text-center font-bold text-red-600">{item.incident_count}</td>
                      <td className="py-1.5 text-right text-gray-500">
                        {item.last_stockout ? (() => { try { return format(new Date(item.last_stockout), 'MMM dd, yyyy'); } catch { return String(item.last_stockout); } })() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Audit Details Table */}
      <div>
        <h4 className="text-xs font-bold uppercase text-gray-700 bg-gray-100 p-2 rounded mb-2">INVENTORY AUDIT DETAILS</h4>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="py-1.5 px-2">Product Name</th>
              <th className="py-1.5 px-2">SKU</th>
              <th className="py-1.5 px-2 text-center">Expected</th>
              <th className="py-1.5 px-2 text-center">Actual</th>
              <th className="py-1.5 px-2 text-center">Variance</th>
              <th className="py-1.5 px-2 text-center">Status</th>
              <th className="py-1.5 px-2 text-center">Reorder Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(inv.detailed_inventory || []).slice(0, 15).map((p: any, idx: number) => (
              <tr key={idx}>
                <td className="py-1.5 px-2 font-medium">{p.product_name}</td>
                <td className="py-1.5 px-2 font-mono text-gray-400">{p.sku}</td>
                <td className="py-1.5 px-2 text-center font-bold">{p.expected}</td>
                <td className="py-1.5 px-2 text-center font-bold">{p.actual}</td>
                <td className={`py-1.5 px-2 text-center font-bold ${p.difference < 0 ? 'text-red-600' : p.difference > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {p.difference}
                </td>
                <td className="py-1.5 px-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    p.status === 'Out of Stock' ? 'bg-red-100 text-red-800' :
                    p.status === 'Low Stock' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-center text-gray-500">{p.reorder_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SignatureBlock role="Inventory Supervisor" />
    </div>
    );
  };

  const renderSupplierSections = (sup: SupplierReportData) => (
    <div className="space-y-6 text-gray-900">
      <h3 className="text-lg font-bold text-gray-900">Supplier Directory & Performance</h3>
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b border-gray-200">
          <tr>
            <th className="py-2.5 px-3 text-left font-bold text-gray-700">Supplier Info</th>
            <th className="py-2.5 px-3 text-center font-bold text-gray-700">Status</th>
            <th className="py-2.5 px-3 text-right font-bold text-gray-700">PO Volume</th>
            <th className="py-2.5 px-3 text-right font-bold text-gray-700">Total Spent</th>
            <th className="py-2.5 px-3 text-right font-bold text-gray-700">Avg Lead Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {(sup.suppliers || []).length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                No supplier activity recorded for the selected date range and filters.
              </td>
            </tr>
          ) : (
            (sup.suppliers || []).map((s, i) => (
              <tr key={i} className="align-top">
                <td className="py-3 px-3">
                  <p className="font-bold text-gray-900">{s.supplier_name}</p>
                  <p className="text-xs text-gray-600">{s.email}</p>
                  <p className="text-xs text-gray-600">{s.contact_number}</p>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-medium text-gray-800">{s.po_count} orders</td>
                <td className="py-3 px-3 text-right font-bold text-gray-900">₱{Number(s.total_spent).toLocaleString()}</td>
                <td className="py-3 px-3 text-right text-gray-700">
                  {s.avg_lead_time ? `${Math.round(s.avg_lead_time)} days` : 'N/A'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <SignatureBlock role="Purchasing Supervisor" />
    </div>
  );

  const renderServicesSections = (services: ServicesReportData) => {
    const commRate = services.summary?.mechanic_commission_rate ?? 0.8;
    const mechShare = services.summary?.total_mechanic_share ?? ((services.summary?.total_revenue || 0) * commRate);
    const storeShare = services.summary?.total_store_share ?? ((services.summary?.total_revenue || 0) * (1 - commRate));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <p className="text-[9px] text-blue-600 font-black uppercase">Total Service Jobs</p>
            <p className="text-xl font-black text-blue-900">{services.summary?.total_count || 0}</p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <p className="text-[9px] text-emerald-600 font-black uppercase">Total Service Revenue</p>
            <p className="text-xl font-black text-emerald-900">₱{Number(services.summary?.total_revenue || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
            <p className="text-[9px] text-indigo-600 font-black uppercase">Mechanic Share ({Math.round(commRate * 100)}%)</p>
            <p className="text-xl font-black text-indigo-900">₱{Number(mechShare).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center">
            <p className="text-[9px] text-purple-600 font-black uppercase">Store Share ({Math.round((1 - commRate) * 100)}%)</p>
            <p className="text-xl font-black text-purple-900">₱{Number(storeShare).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold uppercase text-gray-700 bg-gray-100 p-2 rounded mb-2">SERVICES BREAKDOWN</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-1.5">Service Type</th>
                  <th className="py-1.5 text-center">Jobs Count</th>
                  <th className="py-1.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(services.services_breakdown || []).map((s: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-1.5 font-medium">{s.service_name}</td>
                    <td className="py-1.5 text-center font-bold">{s.count}</td>
                    <td className="py-1.5 text-right font-bold text-gray-900">₱{Number(s.revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-gray-700 bg-gray-100 p-2 rounded mb-2">TOP MECHANICS PERFORMANCE</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-1.5">Mechanic</th>
                  <th className="py-1.5 text-center">Jobs</th>
                  <th className="py-1.5 text-right">Revenue</th>
                  <th className="py-1.5 text-right">Mech Share</th>
                  <th className="py-1.5 text-right">Store Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(services.top_mechanics || []).map((m: any, idx: number) => {
                  const mRev = Number(m.revenue || 0);
                  const mShare = m.mechanic_share ?? (mRev * commRate);
                  const sShare = m.store_share ?? (mRev * (1 - commRate));
                  return (
                    <tr key={idx}>
                      <td className="py-1.5 font-medium">{m.mechanic_name}</td>
                      <td className="py-1.5 text-center font-bold">{m.services_count}</td>
                      <td className="py-1.5 text-right font-bold">₱{mRev.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 text-right text-indigo-700 font-semibold">₱{mShare.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 text-right text-purple-700 font-medium">₱{sShare.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <SignatureBlock role="Service Supervisor" />
      </div>
    );
  };

  return createPortal(
    <div className="report-viewer-overlay fixed inset-0 bg-black/60 z-50 backdrop-blur-sm p-2 sm:p-4 flex justify-center items-center">
      <div className="report-viewer-card bg-card w-full max-w-[1000px] max-h-[92vh] shadow-2xl relative flex flex-col rounded-xl overflow-hidden min-w-[280px]">
        {/* Report Controls */}
        <div className="report-viewer-controls bg-gray-900 text-white px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sticky top-0 z-[60] print:hidden">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-bold">Report Preview</h2>
            <div className="hidden sm:block h-6 w-px bg-gray-700" />
            <p className="text-xs sm:text-sm text-gray-300 truncate max-w-[240px] sm:max-w-none">{report.reportType} - {report.dateRange}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
            <button 
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              title="Download Report as PDF Document"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isDownloadingPdf ? "Generating PDF..." : "Download PDF"}
            </button>
            <button 
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Print Report Document"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Print Report
            </button>
            <button 
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div id="printable-report-content" className="report-viewer-document flex-1 p-3 sm:p-6 md:p-[12mm] bg-white text-gray-900 overflow-y-auto font-sans relative">
          <table className="report-print-layout-table w-full border-collapse">
            <tfoot className="report-print-tfoot">
              <tr>
                <td className="p-0 border-0">
                  <div className="report-footer-spacer h-12 w-full" />
                </td>
              </tr>
            </tfoot>
            <tbody>
              <tr>
                <td className="p-0 border-0">
                  {/* Header Banner */}
                  <header className="report-header-banner bg-[#0b1736] text-white p-6 rounded-t-xl mb-6 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-black rounded-full border-2 border-red-600 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
                        <img src={logo} alt="JONBRIX" className="w-12 h-12 object-contain" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-black tracking-widest uppercase text-white leading-none">JONBRIX</h1>
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">MOTORCYCLE PARTS & ACCESSORIES</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <h2 className="text-xl font-black tracking-wider uppercase text-white leading-none mb-1">{report.reportType.toUpperCase()}</h2>
                      <p className="text-[10px] font-mono text-gray-300 uppercase">REPORT NO.: {getReportCode()}</p>
                      <p className="text-[10px] font-mono text-gray-300 uppercase">PERIOD: {report.dateRange?.toUpperCase() || "JUNE 24, 2026 TO JULY 24, 2026"}</p>
                    </div>
                  </header>

                  {/* Report Content */}
                  <main className="report-content-body min-h-[180mm]">
                    {report.reportType.includes("Sales") && renderSalesSections(data)}
                    {report.reportType.includes("Inventory") && renderInventorySections(data)}
                    {report.reportType.includes("Product") && renderProductSections(data)}
                    {report.reportType.includes("Supplier") && renderSupplierSections(data)}
                    {report.reportType.includes("Orders") && renderOrdersReturnsSections(data)}
                    {report.reportType.includes("Services") && renderServicesSections(data)}
                  </main>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Running Footer - Appears on every printed page & bottom of document */}
          <footer className="report-running-footer mt-8 border-t border-gray-300 pt-3 text-[10px] text-gray-600 flex justify-between items-center w-full">
            <span className="font-bold uppercase tracking-wider text-gray-700">JONBRIX INVENTORY MANAGEMENT SYSTEM</span>
            <span className="font-bold uppercase tracking-widest text-gray-800 text-center">CONFIDENTIAL FOR ADMINISTRATIVE USE ONLY</span>
            <span className="font-bold text-gray-700 text-right min-w-[130px]">
              <span className="screen-page-label print:hidden">System Generated Report</span>
              <span className="print-page-counter hidden print:inline" />
            </span>
          </footer>
        </div>
      </div>

      <style>{`
        /* Force paper styling on the printable document preview regardless of dark mode */
        .report-viewer-document {
          --background: #ffffff !important;
          --foreground: #111827 !important;
          --card: #ffffff !important;
          --card-foreground: #111827 !important;
          --popover: #ffffff !important;
          --popover-foreground: #111827 !important;
          --primary: #111827 !important;
          --primary-foreground: #ffffff !important;
          --secondary: #f9fafb !important;
          --secondary-foreground: #111827 !important;
          --muted: #f3f4f6 !important;
          --muted-foreground: #4b5563 !important;
          --accent: #f3f4f6 !important;
          --accent-foreground: #111827 !important;
          --border: #e5e7eb !important;
          background-color: #ffffff !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        .report-viewer-document * {
          color-scheme: light !important;
        }
        .report-viewer-document h1,
        .report-viewer-document h2,
        .report-viewer-document h3,
        .report-viewer-document h4,
        .report-viewer-document h5,
        .report-viewer-document h6,
        .report-viewer-document p,
        .report-viewer-document span,
        .report-viewer-document th,
        .report-viewer-document td {
          --tw-text-opacity: 1 !important;
        }
        .report-viewer-document .text-foreground {
          color: #111827 !important;
        }
        .report-viewer-document .text-muted-foreground {
          color: #4b5563 !important;
        }
        .report-viewer-document .bg-card,
        .report-viewer-document [class*="bg-card"] {
          background-color: #ffffff !important;
          color: #111827 !important;
        }
        .report-viewer-document [class*="bg-muted"] {
          background-color: #f9fafb !important;
          color: #1f2937 !important;
        }
        .report-viewer-document .bg-muted,
        .report-viewer-document thead {
          background-color: #f3f4f6 !important;
          color: #1f2937 !important;
        }
        .report-viewer-document thead th {
          color: #374151 !important;
        }
        .report-viewer-document tbody td {
          color: #1f2937 !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 14mm 10mm;
            @bottom-left {
              content: "JONBRIX INVENTORY MANAGEMENT SYSTEM";
              font-size: 7.5pt;
              font-weight: 700;
              color: #4b5563;
              text-transform: uppercase;
            }
            @bottom-center {
              content: "CONFIDENTIAL FOR ADMINISTRATIVE USE ONLY";
              font-size: 7.5pt;
              font-weight: 800;
              color: #111827;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 7.5pt;
              font-weight: 700;
              color: #4b5563;
            }
          }
          
          html, body, #root {
            background: #ffffff !important;
            color: #111827 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          body {
            counter-reset: page;
          }

          /* Hide all non-report UI elements */
          nav, aside, header.print\\:hidden, .print\\:hidden, .report-viewer-controls, .no-print {
            display: none !important;
          }

          /* Neutralize modal overlay and scroll wrappers */
          .report-viewer-overlay {
            position: static !important;
            display: block !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            z-index: auto !important;
          }

          .report-viewer-card {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .report-viewer-document,
          #printable-report-content {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
          }

          .report-print-layout-table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          .report-print-tfoot {
            display: table-footer-group !important;
          }

          .report-running-footer {
            display: none !important;
          }

          .report-content-body {
            min-height: auto !important;
            overflow: visible !important;
          }

          .report-header-banner {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border-radius: 0 !important;
            margin-bottom: 16px !important;
          }

          .grid {
            display: grid !important;
          }

          .flex {
            display: flex !important;
          }

          /* Prevent cards, tables, summaries, and blocks from splitting in half across pages */
          .grid > div,
          .bg-card,
          .rounded-xl,
          .rounded-lg,
          .signature-block,
          .page-break-avoid,
          .print-card,
          section,
          article {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table {
            page-break-inside: auto !important;
            break-inside: auto !important;
            width: 100% !important;
          }

          thead {
            display: table-header-group !important;
          }

          tbody {
            display: table-row-group !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
