import React, { useState, useEffect } from "react";
import { FileText, Download, TrendingUp, Package, DollarSign, Loader2, Trash2, Crown, Eye, Layers, Repeat } from "lucide-react";
import { format } from "date-fns";
import { api, type AnalyticsOverview, type GeneratedReport, type Category, type Supplier } from "@/services/api";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/export";
import { ProtectedAction } from "../ProtectedAction";
import { ReportViewer } from "../ReportViewer";

const reportTypes = [
  { id: 1, name: "Sales Report", type: "sales", description: "Comprehensive sales analysis and trends", icon: DollarSign },
  { id: 2, name: "Inventory Report", type: "inventory", description: "Current stock levels and movements", icon: Package },
  { id: 3, name: "Product & Category", type: "product_category", description: "Catalog sorting and investment summary", icon: Layers },
  { id: 4, name: "Supplier Performance", type: "supplier", description: "Supplier delivery and quality metrics", icon: FileText },
  { id: 5, name: "Orders & Returns", type: "orders_returns", description: "PO summaries and RMA trend tracking", icon: Repeat },
];

function formatCurrency(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function getCategoryIcon(cat: string | undefined) {
  if (!cat) return "📦";
  const c = cat.toLowerCase();
  if (c.includes("plug")) return "🔌";
  if (c.includes("tire") || c.includes("tyre")) return "🛞";
  if (c.includes("oil") || c.includes("lubricant")) return "🛢️";
  if (c.includes("battery")) return "🔋";
  if (c.includes("brake")) return "🛑";
  if (c.includes("chain") || c.includes("sprocket")) return "⛓️";
  if (c.includes("helmet") || c.includes("gear")) return "🪖";
  return "📦";
}

export function Reports() {
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterSupplier, setFilterSupplier] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    fetchHistory();
    fetchOverview();
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const [cats, sups] = await Promise.all([
        api.getCategories(),
        api.getSuppliers()
      ]);
      setCategories(cats);
      setSuppliers(sups);
    } catch (error) {
      console.error("Failed to fetch filters", error);
    }
  };

  const fetchOverview = async () => {
    try {
      const data = await api.getAnalyticsOverview();
      setOverview(data);
    } catch (error) {
      console.error("Failed to load overview data", error);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getReportHistory();
      setGeneratedReports(data);
    } catch (error) {
      toast.error("Failed to load report history");
    } finally {
      setLoading(false);
    }
  };

  const deleteReportRecord = async (id: number) => {
    try {
      await api.deleteReport(id);
      toast.success("Report record removed");
      fetchHistory();
    } catch (error) {
      toast.error("Failed to remove record");
    }
  };

  const handleGenerate = async () => {
    if (!selectedType) {
      toast.error("Please select a report type");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please specify a valid date range");
      return;
    }

    try {
      setIsGenerating(true);
      toast.info("Compiling high-fidelity data...", { id: "generate_toast" });

      const payload = {
        report_type: selectedType,
        start_date: startDate,
        end_date: endDate,
        category_id: filterCategory ? parseInt(filterCategory) : undefined,
        supplier_id: filterSupplier ? parseInt(filterSupplier) : undefined,
        status: filterStatus || undefined
      };

      const result = await api.generateReport(payload);

      if (!result.report_data || Object.keys(result.report_data).length === 0) {
        toast.dismiss("generate_toast");
        toast.warning("Generated, but no data entries found for this range.");
      } else {
        toast.success("Report successfully generated!", { id: "generate_toast" });
        // Automatically open the preview
        const newReportRecord = {
          id: result.report_id,
          reportType: reportTypes.find(t => t.type === selectedType)?.name || selectedType,
          dateRange: `${startDate} to ${endDate}`,
          generatedDate: format(new Date(), "yyyy-MM-dd hh:mm a"),
          generatedBy: "You",
          reportData: result.report_data
        };
        setPreviewReport(newReportRecord);
      }

      fetchHistory();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate report", { id: "generate_toast" });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsExcel = (report: GeneratedReport) => {
    if (!report.reportData) {
      toast.error("No data available for export in this record.");
      return;
    }

    // Flatten logic for Excel based on type
    let exportData: any[] = [];
    const type = report.reportType.toLowerCase();

    if (type.includes("sales")) {
      exportData = report.reportData.top_products || [];
    } else if (type.includes("inventory")) {
      exportData = report.reportData.detailed_inventory || [];
    } else if (type.includes("product")) {
      exportData = report.reportData.products || [];
    } else if (type.includes("supplier")) {
      exportData = report.reportData.suppliers || [];
    } else {
      // Fallback: convert whatever is at the root to a single-row object
      exportData = [report.reportData];
    }

    exportToExcel(exportData, `${report.reportType.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd")}`);
  };

  return (
    <div className="p-8">
      {previewReport && (
        <ReportViewer
          report={previewReport}
          onClose={() => setPreviewReport(null)}
        />
      )}

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 font-medium">Generate professional high-fidelity reports for JonBrix Motor Parts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card p-8 rounded-2xl shadow-xl border border-border">
            <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Generate New Report
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-black text-muted-foreground/70 uppercase tracking-widest mb-2">Report Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/50 border-2 border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-primary transition-all font-bold text-muted-foreground"
                >
                  <option value="">Select Type</option>
                  {reportTypes.map((type) => (
                    <option key={type.id} value={type.type}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-muted-foreground/70 uppercase tracking-widest mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                  className="w-full px-4 py-3 bg-muted/50 border-2 border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-primary transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-muted-foreground/70 uppercase tracking-widest mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="w-full px-4 py-3 bg-muted/50 border-2 border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-primary transition-all font-bold"
                />
              </div>

              <div className="flex items-end">
                <ProtectedAction module="Reports" action="Export">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedType}
                    className="w-full bg-gray-900 text-white px-6 py-3.5 flex justify-center items-center gap-2 rounded-xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all disabled:bg-gray-300 disabled:scale-100 font-black uppercase tracking-widest text-xs"
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Report"}
                  </button>
                </ProtectedAction>
              </div>
            </div>

            {/* Dynamic Filters Section */}
            {selectedType && (
              <div className="mt-8 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
                {(selectedType === "inventory" || selectedType === "product_category" || selectedType === "sales") && (
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-2">Filter by Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map(c => (
                        <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(selectedType === "supplier" || selectedType === "orders_returns") && (
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-2">Select Supplier</label>
                    <select
                      value={filterSupplier}
                      onChange={(e) => setFilterSupplier(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
                    >
                      <option value="">All Suppliers</option>
                      {suppliers.map(s => (
                        <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedType === "sales" && (
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-2">Payment Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
                    >
                      <option value="">All Transactions</option>
                      <option value="Completed">Completed</option>
                      <option value="Refunded">Refunded / Returned</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {selectedType === "supplier" && (
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-2">Supplier Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}

                {(selectedType === "orders_returns") && (
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-2">Record Filter</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="Received">Received (PO)</option>
                      <option value="Pending">Pending (PO)</option>
                      <option value="Refund">Refund (RMA)</option>
                      <option value="Exchange">Exchange (RMA)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Generated Reports History */}
          <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-muted/50/50">
              <h2 className="text-xl font-black text-foreground">Recently Compiled History</h2>
              <p className="text-sm text-muted-foreground font-medium">View or export previously generated business snapshots</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-card border-b-2 border-border">
                    <th className="px-8 py-4 text-left text-xs font-black text-muted-foreground/70 uppercase tracking-widest">Report Detail</th>
                    <th className="px-8 py-4 text-left text-xs font-black text-muted-foreground/70 uppercase tracking-widest">Date Range</th>
                    <th className="px-8 py-4 text-left text-xs font-black text-muted-foreground/70 uppercase tracking-widest">Generated At</th>
                    <th className="px-8 py-4 text-right text-xs font-black text-muted-foreground/70 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-16 text-center text-muted-foreground/70 font-bold italic">Loading historical records...</td>
                    </tr>
                  ) : generatedReports.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-100" />
                        <p className="text-foreground font-black text-lg">No reports generated yet</p>
                        <p className="text-sm text-muted-foreground/70 font-medium mt-1">Select criteria above to compile your first report</p>
                      </td>
                    </tr>
                  ) : (
                    generatedReports.map((report) => (
                      <tr key={report.id} className="hover:bg-primary/10/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground/70 group-hover:bg-blue-100 group-hover:text-primary transition-colors">
                              {reportTypes.find(t => t.name === report.reportType)?.icon ?
                                <span className="w-5 h-5">{React.createElement(reportTypes.find(t => t.name === report.reportType)!.icon, { className: "w-5 h-5" })}</span> :
                                <FileText className="w-5 h-5" />
                              }
                            </div>
                            <div>
                              <p className="font-black text-foreground">{report.reportType}</p>
                              <p className="text-xs text-muted-foreground/70 font-bold">By {report.generatedBy}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-muted-foreground italic bg-muted/50 px-3 py-1 rounded-lg inline-block border border-border">{report.dateRange}</p>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-muted-foreground">{report.generatedDate}</td>
                        <td className="px-8 py-5">
                          <div className="flex justify-end items-center gap-4">
                            <button
                              onClick={() => setPreviewReport(report)}
                              className="text-primary hover:text-blue-800 font-black text-xs uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all border border-transparent hover:border-blue-100"
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button
                              onClick={() => downloadAsExcel(report)}
                              className="text-muted-foreground hover:text-foreground font-black text-xs uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-all"
                            >
                              <Download className="w-4 h-4" /> XLS
                            </button>
                            <ProtectedAction module="Reports" action="Delete">
                              <button onClick={() => deleteReportRecord(report.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Remove from history">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </ProtectedAction>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Analytics Highlights */}
        <div className="space-y-8">
          <div className="bg-card rounded-3xl p-8 shadow-2xl border-4 border-gray-900/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-32 h-32" />
            </div>

            <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              Top Products
            </h2>

            <div className="space-y-5 relative z-10">
              {overview?.top_sellers && overview.top_sellers.length > 0 ? (
                overview.top_sellers.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 group/item">
                    <div className="text-sm font-black text-gray-300 group-hover/item:text-indigo-600 transition-colors w-4">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest">{item.category || "Uncategorized"}</p>
                    </div>
                    <div className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground/70 py-12 font-bold italic bg-muted/50 rounded-2xl border-2 border-dashed">
                  No recent sales data.
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black text-muted-foreground/70 uppercase tracking-widest">Inventory Status</span>
                <span className="text-xs font-black text-foreground uppercase tracking-widest">{overview ? (overview.items_out + overview.items_low + overview.items_ok) : 0} Total</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted shadow-inner">
                <div style={{ width: `${(overview?.items_out || 0) / (overview ? (overview.items_out + overview.items_low + overview.items_ok || 1) : 1) * 100}%` }} className="bg-red-500" />
                <div style={{ width: `${(overview?.items_low || 0) / (overview ? (overview.items_out + overview.items_low + overview.items_ok || 1) : 1) * 100}%` }} className="bg-amber-400" />
                <div style={{ width: `${(overview?.items_ok || 0) / (overview ? (overview.items_out + overview.items_low + overview.items_ok || 1) : 1) * 100}%` }} className="bg-green-500" />
              </div>
              <div className="flex justify-between mt-3 text-[9px] font-black uppercase tracking-tighter">
                <span className="text-red-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-600" /> OOS</span>
                <span className="text-amber-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> LOW</span>
                <span className="text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-600" /> OK</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}