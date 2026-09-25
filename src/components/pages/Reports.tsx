import React, { useState, useEffect, useMemo, useRef } from "react";
import { FileText, Download, TrendingUp, Package, PhilippinePeso, Loader2, Trash2, Crown, Eye, Layers, Repeat, Wrench, Search, X, Check, ChevronDown, Printer } from "lucide-react";
import { format } from "date-fns";
import { api, type AnalyticsOverview, type GeneratedReport, type Category, type Supplier, type Product } from "@/services/api";
import { toast } from "sonner";
import { ProtectedAction } from "../ProtectedAction";
import { ReportViewer } from "../ReportViewer";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";

const reportTypes = [
  { id: 1, name: "Sales Report", type: "sales", description: "Comprehensive sales analysis and trends", icon: PhilippinePeso },
  { id: 2, name: "Inventory Report", type: "inventory", description: "Current stock levels and movements", icon: Package },
  { id: 3, name: "Product & Category", type: "product_category", description: "Catalog sorting and investment summary", icon: Layers },
  { id: 4, name: "Supplier Performance", type: "supplier", description: "Supplier delivery and quality metrics", icon: FileText },
  { id: 5, name: "Orders & Returns", type: "orders_returns", description: "PO summaries and RMA trend tracking", icon: Repeat },
  { id: 6, name: "Services Report", type: "services", description: "Mechanic jobs and service revenue tracking", icon: Wrench },
];

function fmtVal(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0";
  return n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function Reports() {
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null);
  const [viewerAction, setViewerAction] = useState<"print" | "download" | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [filterSupplier, setFilterSupplier] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [productSearch, setProductSearch] = useState<string>("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return generatedReports.slice(start, start + itemsPerPage);
  }, [generatedReports, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchHistory();
    fetchOverview();
    fetchFilters();
  }, []);

  // Close product dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(generatedReports.length / itemsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [generatedReports.length, itemsPerPage, currentPage]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => !c.category_name.toLowerCase().includes("service"));
  }, [categories]);

  const searchableProducts = useMemo(() => {
    return products.filter(p => {
      if (filterCategory && p.category_id !== parseInt(filterCategory)) return false;
      if (!productSearch) return true;
      const q = productSearch.toLowerCase();
      return p.product_name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
    });
  }, [products, filterCategory, productSearch]);

  const toggleProductSelect = (productId: number) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllSearchableProducts = () => {
    const ids = searchableProducts.map(p => p.product_id);
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const clearAllSelectedProducts = () => {
    setSelectedProductIds([]);
  };

  const fetchFilters = async () => {
    try {
      const [cats, sups, prods] = await Promise.all([
        api.getCategories(),
        api.getSuppliers(),
        api.getProducts()
      ]);
      setCategories(cats);
      setSuppliers(sups);
      setProducts(prods.filter(p => !p.is_service));
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
        product_id: selectedProductIds.length === 1 ? selectedProductIds[0] : undefined,
        product_ids: selectedProductIds.length > 0 ? selectedProductIds : undefined,
        status: filterStatus || undefined
      };

      const result = await api.generateReport(payload);

      if (!result.report_data || Object.keys(result.report_data).length === 0) {
        toast.dismiss("generate_toast");
        toast.warning("Generated, but no data entries found for this range.");
      } else {
        toast.success("Report successfully generated!", { id: "generate_toast" });
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {previewReport && (
        <ReportViewer
          report={previewReport}
          initialAction={viewerAction}
          onClose={() => {
            setPreviewReport(null);
            setViewerAction(null);
          }}
        />
      )}

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Generate professional high-fidelity reports for JonBrix Motor Parts</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card p-4 sm:p-6 rounded-lg shadow-xs border border-border/55">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              Generate New Report
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Report Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setFilterCategory("");
                    setSelectedProductIds([]);
                    setProductSearch("");
                    setFilterSupplier("");
                    setFilterStatus("");
                  }}
                  className="w-full px-3 py-2 bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all font-medium text-sm"
                >
                  <option value="">Select Type</option>
                  {reportTypes.map((type) => (
                    <option key={type.id} value={type.type}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Date Range</label>
                <DateRangePicker
                  dateFrom={startDate}
                  dateTo={endDate}
                  onDateChange={(from, to) => {
                    setStartDate(from);
                    setEndDate(to);
                  }}
                  className="w-full"
                  placeholder="Select report date range"
                />
              </div>

              <div className="flex items-end">
                <ProtectedAction module="Reports" action="Export">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedType}
                    className="w-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors py-2 rounded-lg text-sm font-bold uppercase tracking-wider border border-border/50 shadow-xs flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                  </button>
                </ProtectedAction>
              </div>
            </div>

            {/* Dynamic Filters Section */}
            {selectedType && (
              <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-300">
                {(selectedType === "inventory" || selectedType === "product_category" || selectedType === "sales") && (
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Filter by Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => {
                        setFilterCategory(e.target.value);
                        setSelectedProductIds([]);
                      }}
                      className="w-full px-3 py-2 bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all font-medium text-sm cursor-pointer"
                    >
                      <option value="">All Categories</option>
                      {filteredCategories.map(c => (
                        <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(selectedType === "inventory" || selectedType === "product_category" || selectedType === "sales") && (
                  <div className="relative" ref={productDropdownRef}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Filter by Product {selectedProductIds.length > 0 && `(${selectedProductIds.length})`}
                      </label>
                      {selectedProductIds.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllSelectedProducts}
                          className="text-[10px] text-muted-foreground hover:text-red-500 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Clear ({selectedProductIds.length})
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="w-full px-3 py-2 bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all font-medium text-sm flex items-center justify-between text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {selectedProductIds.length === 0
                          ? "All Products"
                          : selectedProductIds.length === 1
                          ? products.find(p => p.product_id === selectedProductIds[0])?.product_name || "1 Selected"
                          : `${selectedProductIds.length} Products Selected`}
                      </span>
                      <div className="flex items-center gap-1">
                        {selectedProductIds.length > 0 && (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearAllSelectedProducts();
                            }}
                            className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Clear selection"
                          >
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </button>

                    {isProductDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-card text-foreground border border-border/80 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-in fade-in-50 zoom-in-95 duration-150 w-full sm:w-80">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Search product or SKU..."
                            className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-border/60 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground"
                            autoFocus
                          />
                        </div>

                        <div className="flex items-center justify-between px-1 py-0.5 text-[10px] text-muted-foreground border-b border-border/40 pb-1.5 font-bold uppercase tracking-wider">
                          <span>{selectedProductIds.length} of {products.length} Selected</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={selectAllSearchableProducts}
                              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              Select All ({searchableProducts.length})
                            </button>
                            <button
                              type="button"
                              onClick={clearAllSelectedProducts}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto divide-y divide-border/20 text-xs">
                          {searchableProducts.length > 0 ? (
                            searchableProducts.map((p) => {
                              const isChecked = selectedProductIds.includes(p.product_id);
                              return (
                                <button
                                  key={p.product_id}
                                  type="button"
                                  onClick={() => toggleProductSelect(p.product_id)}
                                  className={cn(
                                    "w-full px-2.5 py-2 text-left hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-between group cursor-pointer",
                                    isChecked && "bg-muted/60 font-semibold"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 truncate pr-2">
                                    <div className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                      isChecked
                                        ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-950"
                                        : "border-border/80 group-hover:border-zinc-400 bg-background"
                                    )}>
                                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <div className="truncate">
                                      <p className="font-medium text-foreground group-hover:text-blue-600 truncate">{p.product_name}</p>
                                      {p.sku && <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <p className="py-4 text-center text-muted-foreground text-xs">No products found</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Selected Product Pills/Chips */}
                    {selectedProductIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {selectedProductIds.slice(0, 6).map((pid) => {
                          const prod = products.find(p => p.product_id === pid);
                          if (!prod) return null;
                          return (
                            <span
                              key={pid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 text-[10px] font-semibold"
                            >
                              <span className="truncate max-w-[100px]">{prod.product_name}</span>
                              <button
                                type="button"
                                onClick={() => toggleProductSelect(pid)}
                                className="hover:text-red-500 cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          );
                        })}
                        {selectedProductIds.length > 6 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground">
                            +{selectedProductIds.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(selectedType === "supplier" || selectedType === "orders_returns") && (
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Select Supplier</label>
                    <select
                      value={filterSupplier}
                      onChange={(e) => setFilterSupplier(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all font-medium text-sm"
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
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Payment Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all font-medium text-sm"
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
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Supplier Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all font-medium text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}

                {(selectedType === "orders_returns") && (
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Record Filter</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all font-medium text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="Received">Received (PO)</option>
                      <option value="Pending">Pending (PO)</option>
                      <option value="Not Received">Not Received (PO)</option>
                      <option value="Refund">(RMA) Refund</option>
                      <option value="Exchange">(RMA) Exchange</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generated Reports History */}
          <div className="bg-card rounded-lg shadow-xs border border-border/55 overflow-hidden">
            <div className="p-5 border-b border-border/50 bg-muted/5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recently Compiled History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">View or export previously generated business snapshots</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Report Detail</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date Range</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Generated At</th>
                    <th className="px-6 py-3.5 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-card">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-xs italic">Loading historical records...</td>
                    </tr>
                  ) : generatedReports.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-pulse" />
                        <p className="font-semibold text-xs">No reports generated yet</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedReports.map((report) => (
                      <tr key={report.id} className="group hover:bg-muted/20 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground">
                              {reportTypes.find(t => t.name === report.reportType)?.icon ?
                                <span>{React.createElement(reportTypes.find(t => t.name === report.reportType)!.icon, { className: "w-4 h-4" })}</span> :
                                <FileText className="w-4 h-4" />
                              }
                            </div>
                            <div>
                              <p className="font-bold text-sm text-foreground">{report.reportType}</p>
                              <p className="text-xs text-muted-foreground">By {report.generatedBy}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-muted-foreground/80 bg-muted/20 px-2.5 py-1 rounded border border-border/50">{report.dateRange}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-muted-foreground font-mono">{report.generatedDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => {
                                setViewerAction(null);
                                setPreviewReport(report);
                              }}
                              className="text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:bg-muted p-1.5 rounded transition-all cursor-pointer"
                              title="View Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setViewerAction("print");
                                setPreviewReport(report);
                              }}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 p-1.5 rounded transition-all cursor-pointer"
                              title="Print Report"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setViewerAction("download");
                                setPreviewReport(report);
                              }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded transition-all cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <ProtectedAction module="Reports" action="Delete">
                              <button 
                                onClick={() => deleteReportRecord(report.id)} 
                                className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors cursor-pointer" 
                                title="Remove Record"
                              >
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

            {generatedReports.length > 0 && (
              <OrdersStyleTablePagination
                itemCount={generatedReports.length}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar - Analytics Highlights */}
        <div className="space-y-6">
          {/* Top Products Card */}
          <div className="bg-card rounded-2xl p-6 border border-border/70 shadow-sm relative overflow-hidden transition-all">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Top Products
                  </h2>
                  <p className="text-[11px] text-muted-foreground">Best sellers by gross revenue</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {overview?.top_sellers && overview.top_sellers.length > 0 ? (
                (() => {
                  const maxRev = Math.max(...overview.top_sellers.map(s => Number(s.revenue) || 1), 1);
                  return overview.top_sellers.slice(0, 5).map((item, idx) => {
                    const pct = Math.min(100, Math.max(12, ((Number(item.revenue) || 0) / maxRev) * 100));
                    return (
                      <div 
                        key={idx} 
                        className="group relative p-2.5 rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank Badge */}
                          <div 
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs font-mono",
                              idx === 0 
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-black"
                                : idx === 1
                                ? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-400/30 font-extrabold"
                                : idx === 2
                                ? "bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30 font-extrabold"
                                : "bg-muted/60 text-muted-foreground border border-border/40"
                            )}
                          >
                            {idx + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                              {item.category || "Uncategorized"}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono font-bold text-foreground">
                              ₱{fmtVal(item.revenue)}
                            </div>
                          </div>
                        </div>

                        {/* Relative Volume Progress Bar */}
                        <div className="w-full bg-muted/40 h-1 rounded-full overflow-hidden mt-2">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400 dark:bg-slate-500" : idx === 2 ? "bg-orange-500" : "bg-primary/50"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-center text-muted-foreground/70 py-8 text-sm italic border border-dashed border-border/70 rounded-xl bg-muted/10">
                  No recent sales data.
                </div>
              )}
            </div>

            {/* Inventory Status Card Section */}
            <div className="mt-6 pt-5 border-t border-border/60">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Inventory Status
                  </span>
                  <p className="text-[11px] text-muted-foreground">Current stock level distribution</p>
                </div>
                <span className="text-xs font-mono font-bold bg-muted/70 text-foreground px-2.5 py-1 rounded-full border border-border/50">
                  {overview ? (overview.items_out + overview.items_low + overview.items_ok).toLocaleString() : 0} Total
                </span>
              </div>

              {/* Progress Bar (Color coded) */}
              {(() => {
                const total = overview ? (overview.items_out + overview.items_low + overview.items_ok) : 0;
                const outPct = total > 0 ? ((overview?.items_out || 0) / total) * 100 : 0;
                const lowPct = total > 0 ? ((overview?.items_low || 0) / total) * 100 : 0;
                const okPct = total > 0 ? ((overview?.items_ok || 0) / total) * 100 : 0;

                return (
                  <>
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/60 p-0.5 border border-border/40 gap-0.5 mb-4">
                      {outPct > 0 && (
                        <div 
                          style={{ width: `${outPct}%` }} 
                          className="bg-rose-500 rounded-full transition-all duration-500" 
                          title={`Out of stock: ${overview?.items_out || 0}`}
                        />
                      )}
                      {lowPct > 0 && (
                        <div 
                          style={{ width: `${lowPct}%` }} 
                          className="bg-amber-500 rounded-full transition-all duration-500" 
                          title={`Low stock: ${overview?.items_low || 0}`}
                        />
                      )}
                      {okPct > 0 && (
                        <div 
                          style={{ width: `${okPct}%` }} 
                          className="bg-emerald-500 rounded-full transition-all duration-500" 
                          title={`Healthy stock: ${overview?.items_ok || 0}`}
                        />
                      )}
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/20 dark:border-rose-900/40 rounded-xl p-2.5 transition-all hover:bg-rose-500/15">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">OOS</span>
                        </div>
                        <p className="text-base font-black font-mono text-rose-700 dark:text-rose-300">
                          {(overview?.items_out || 0).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Out of Stock</p>
                      </div>

                      <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 dark:border-amber-900/40 rounded-xl p-2.5 transition-all hover:bg-amber-500/15">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Low</span>
                        </div>
                        <p className="text-base font-black font-mono text-amber-700 dark:text-amber-300">
                          {(overview?.items_low || 0).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Low Stock</p>
                      </div>

                      <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 dark:border-emerald-900/40 rounded-xl p-2.5 transition-all hover:bg-emerald-500/15">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">OK</span>
                        </div>
                        <p className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
                          {(overview?.items_ok || 0).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium mt-0.5">In Stock</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Top Mechanics Card */}
          <div className="bg-card rounded-2xl p-6 border border-border/70 shadow-sm relative overflow-hidden transition-all">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-xs">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Top Mechanics
                  </h2>
                  <p className="text-[11px] text-muted-foreground">Ranked by revenue & jobs completed</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {overview?.top_mechanics && overview.top_mechanics.length > 0 ? (
                (() => {
                  const maxMechRev = Math.max(...overview.top_mechanics.map(m => Number(m.revenue) || 1), 1);
                  return overview.top_mechanics.slice(0, 5).map((item, idx) => {
                    const pct = Math.min(100, Math.max(12, ((Number(item.revenue) || 0) / maxMechRev) * 100));
                    return (
                      <div 
                        key={idx} 
                        className="group relative p-2.5 rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs font-mono",
                              idx === 0 
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-black"
                                : idx === 1
                                ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-400/30 font-extrabold"
                                : idx === 2
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 font-extrabold"
                                : "bg-muted/60 text-muted-foreground border border-border/40"
                            )}
                          >
                            {idx + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                              {item.services_count} {item.services_count === 1 ? 'service job' : 'service jobs'}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono font-bold text-foreground">
                              ₱{fmtVal(item.revenue)}
                            </div>
                          </div>
                        </div>

                        {/* Relative Volume Progress Bar */}
                        <div className="w-full bg-muted/40 h-1 rounded-full overflow-hidden mt-2">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-indigo-500" : idx === 2 ? "bg-purple-500" : "bg-primary/50"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-center text-muted-foreground/70 py-8 text-sm italic border border-dashed border-border/70 rounded-xl bg-muted/10">
                  No recent service data.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}