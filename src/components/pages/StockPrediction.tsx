import {
  AlertTriangle,
  Package,
  Clock,
  Loader2,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  Filter,
  ChevronDown
} from "lucide-react";
import { ProtectedAction } from "@/components/ProtectedAction";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { api, type StockPredictionResponse, type StockHorizonPrediction, type Supplier } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MagicOrderDraft = {
  supplierId: number;
  expectedDelivery: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    purchaseUnit?: string;
    conversion?: string;
    conversionRate?: number;
    unitPrice?: number;
  }>;
};

export function StockPrediction() {
  const [data, setData] = useState<StockPredictionResponse | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PO Draft Modal State
  const [draftOrder, setDraftOrder] = useState<MagicOrderDraft | null>(null);
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [poSuccess, setPoSuccess] = useState(false);

  // Navigation State
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [res, sups] = await Promise.all([
          api.getStockPrediction(),
          api.getSuppliers()
        ]);
        if (!cancelled) {
          setData(res);
          setSuppliers(sups);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data?.risk_stats;

  // Visual Risk Meter Data (Speedometer)
  const speedometerData = useMemo(() => {
    if (!stats || stats.avg_days_to_stockout == null) return [{ value: 0 }];
    // Cap at 365 days for the meter to match backend logic
    const val = Math.min(stats.avg_days_to_stockout, 365);
    return [{ value: val }];
  }, [stats]);

  const executeCreateDraft = async () => {
    if (!draftOrder) return;
    setIsSubmittingPO(true);
    try {
      const orderedProductIds = new Set(draftOrder.items.map((i) => i.id));
      const orderedProductNames = new Set(draftOrder.items.map((i) => i.name.trim().toLowerCase()));

      await api.createPurchaseOrder({
        supplier_id: draftOrder.supplierId,
        expected_delivery: draftOrder.expectedDelivery,
        items: draftOrder.items.map((i) => {
          const pUnit = (i.purchaseUnit || "PCS").trim();
          const conv = (i.conversion || "").trim() || (pUnit === "BOX" ? "10 PCS / BOX" : `1 PCS / ${pUnit}`);
          const match = conv.match(/(\d+)/);
          const cRate = match ? (parseInt(match[1]) || 1) : (i.conversionRate || 1);
          return {
            product_id: i.id,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            purchase_unit: pUnit,
            conversion: conv,
            conversion_rate: cRate,
          };
        }),
        notes: "Stock Prediction",
      });

      // Instantly remove the ordered item from the recommendation list
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          horizon_predictions: (prev.horizon_predictions || []).filter((p) => !orderedProductIds.has(p.product_id)),
          critical_items: (prev.critical_items || []).filter((c) => !orderedProductNames.has(c.product_name.trim().toLowerCase())),
        };
      });

      setPoSuccess(true);
      setTimeout(() => {
        setPoSuccess(false);
        setDraftOrder(null);
        api.getStockPrediction({ useCache: false }).then(setData).catch(() => {});
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsSubmittingPO(false);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draftOrder) return;

    const item = draftOrder.items[0];
    if (!item.unitPrice || Number(item.unitPrice) <= 0) {
      toast.error("please input unit price");
      return;
    }

    await executeCreateDraft();
  };

  // Grocery List Items (Critical / High Urgency First)
  const filteredList = useMemo(() => {
    if (!data?.horizon_predictions) return [];

    return [...data.horizon_predictions]
      .filter(p => {
        // 1. Search Query Match
        const matchesSearch = p.product_name.toLowerCase().includes(searchQuery.toLowerCase());

        // 2. Urgency Filter Match
        const matchesUrgency = urgencyFilter === "All" || p.urgency === urgencyFilter;

        // Only show items that have a recommendation
        const hasOrder = p.recommended_order > 0;

        return matchesSearch && matchesUrgency && hasOrder;
      })
      .sort((a, b) => {
        const urgencyWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        const wA = urgencyWeight[a.urgency] || 0;
        const wB = urgencyWeight[b.urgency] || 0;
        if (wA !== wB) return wB - wA;
        return b.recommended_order - a.recommended_order;
      });
  }, [data, searchQuery, urgencyFilter]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, urgencyFilter, itemsPerPage]);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const getUrgencyColor = (urgency: string) => {
    if (urgency === "High") return "bg-red-50 text-red-700 border-red-200";
    if (urgency === "Medium") return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Stock Prediction List</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Your automated grocery list. AI turns stock predictions directly into draft orders.
          </p>
          {data?.served_from_cache && data?.cache_generated_at && (
            <p className="mt-2 text-xs text-muted-foreground/70 font-medium">
              Intelligence refreshed: {new Date(data.cache_generated_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Building your shopping list…</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content: The Grocery List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-zinc-500" />
                Action Items
              </h2>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-xs transition-all"
                  />
                </div>

                {/* Urgency Filter */}
                <div className="relative w-full sm:w-40">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-xs appearance-none cursor-pointer"
                  >
                    <option value="All">All Risks</option>
                    <option value="High">High Urgency</option>
                    <option value="Medium">Medium Urgency</option>
                    <option value="Low">Low (Healthy)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 sm:p-6 border border-border/55 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  {filteredList.length} recommendations available
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedList.length > 0 ? (
                  paginatedList.map((item) => {
                    const criticalData = data?.critical_items.find(c => c.product_name === item.product_name);
                    const daysLeft = criticalData?.days_to_stockout != null
                      ? Math.max(0, Math.floor(criticalData.days_to_stockout))
                      : "—";

                    return (
                      <div key={item.product_id} className="bg-card rounded-xl p-5 border border-border/50 hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between group">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-foreground text-sm leading-tight w-3/4 group-hover:text-zinc-950 dark:group-hover:text-zinc-50 transition-colors">{item.product_name}</h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold uppercase border tracking-wider",
                              item.urgency === "High" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40" :
                                item.urgency === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40" :
                                  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40"
                            )}>
                              {item.urgency}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-4">
                            <div className="bg-muted/20 border border-border/30 rounded-lg p-2.5 flex-1 text-center transition-colors">
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Time Left</p>
                              <p className={cn("text-lg font-bold font-mono", item.urgency === 'High' ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                                {daysLeft} <span className="text-[10px] font-semibold text-muted-foreground">{typeof daysLeft === 'number' ? 'd' : ''}</span>
                              </p>
                            </div>
                            <div className="bg-muted/20 border border-border/30 rounded-lg p-2.5 flex-1 text-center transition-colors">
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1">In Stock</p>
                              <p className="text-lg font-bold text-foreground font-mono">{item.current_stock}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-border/40 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Recommendation</p>
                            <p className="font-bold text-foreground text-sm font-mono mt-0.5">Order {item.recommended_order}</p>
                          </div>
                          <ProtectedAction module="Orders" action="Add">
                            <button
                              onClick={() => {
                                const finalSupplierId = item.supplier_id || suppliers.find(s => s.supplier_name === item.supplier_name)?.supplier_id || suppliers[0]?.supplier_id || 0;
                                setDraftOrder({
                                  supplierId: finalSupplierId,
                                  expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                                  items: [{ id: item.product_id, name: item.product_name, quantity: item.recommended_order, unitPrice: item.unit_price }]
                                });
                              }}
                              className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 p-2 rounded-lg transition-all flex items-center gap-1.5 font-bold text-xs shadow-xs"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Order
                            </button>
                          </ProtectedAction>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-foreground">No predictions found</h3>
                    <p className="text-muted-foreground text-xs mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border/40">
                <OrdersStyleTablePagination
                  itemCount={filteredList.length}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
            </div>
          </div>

          {/* Sidebar: Overall Pulse & Risk Meter */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              Shop Pulse
            </h2>

            <div className="bg-card rounded-xl shadow-xs border border-border/55 p-6">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 text-center">Average Time To Stockout</h3>
              <div className="h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="80%"
                    innerRadius="70%"
                    outerRadius="100%"
                    barSize={20}
                    data={speedometerData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <PolarAngleAxis type="number" domain={[0, 365]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: 'var(--muted)' }}
                      dataKey="value"
                      cornerRadius={10}
                      fill={stats?.avg_days_to_stockout != null && stats.avg_days_to_stockout < 14 ? '#ef4444' : '#10b981'}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                  <span className="text-4xl font-black text-foreground font-mono">
                    {stats?.avg_days_to_stockout?.toFixed(0) ?? "—"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Days Avg</span>
                </div>
              </div>
              <p className="text-center text-[11px] text-muted-foreground/70 mt-4 leading-relaxed font-medium">
                Estimated days of stock remaining based on daily sales.
              </p>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl text-white p-6 border border-zinc-800 shadow-md">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-6">Risk Composition</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                    <span className="font-semibold text-zinc-300 text-xs">Critical items</span>
                  </div>
                  <span className="font-bold text-lg text-zinc-100 font-mono">{stats?.high_risk ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                    <span className="font-semibold text-zinc-300 text-xs">Medium risk</span>
                  </div>
                  <span className="font-bold text-lg text-zinc-100 font-mono">{stats?.medium_risk ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
<div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                    <span className="font-semibold text-zinc-300 text-xs">Healthy</span>
                  </div>
                  <span className="font-bold text-lg text-zinc-100 font-mono">{stats?.low_risk ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PO Draft Magic Modal */}
      {draftOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-card rounded-2xl sm:rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            {poSuccess ? (
              <div className="p-8 sm:p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center mb-6 sm:mb-8 animate-bounce">
                  <CheckCircle2 className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3 sm:mb-4 tracking-tight">Draft Locked!</h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Auto-generated procurement draft is now available in your orders management.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateDraft} className="flex flex-col flex-1 min-h-0">
                <div className="p-4 sm:p-8 pb-4 sm:pb-6 border-b border-border/50 overflow-y-auto flex-1">
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                      <Truck className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Purchase Draft</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">AI Intelligence Active</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5 sm:space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-1.5">Item Priority</label>
                      <div className="bg-muted/40 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl font-bold text-foreground border border-border/50 text-xs sm:text-sm">
                        {draftOrder.items[0]?.name}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-1.5">Fill Amount</label>
                        <input
                          type="number"
                          min="1"
                          value={draftOrder.items[0]?.quantity || ""}
                          onChange={(e) => {
                            const newItems = [...draftOrder.items];
                            newItems[0].quantity = parseInt(e.target.value) || 0;
                            setDraftOrder({ ...draftOrder, items: newItems });
                          }}
                          className="w-full bg-card border border-border px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-foreground text-sm sm:text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                          placeholder="Qty"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-1.5">Purchase Unit</label>
                        <div className="relative">
                          <select
                            value={draftOrder.items[0]?.purchaseUnit || "BOX"}
                            onChange={(e) => {
                              const newItems = [...draftOrder.items];
                              newItems[0].purchaseUnit = e.target.value;
                              setDraftOrder({ ...draftOrder, items: newItems });
                            }}
                            className="w-full bg-card border border-border px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-foreground text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none pr-10"
                          >
                            <option value="BOX">BOX</option>
                            <option value="PCS">PCS</option>
                            <option value="SET">SET</option>
                            <option value="PACK">PACK</option>
                            <option value="ROLL">ROLL</option>
                            <option value="CAN">CAN</option>
                            <option value="BOTTLE">BOTTLE</option>
                            <option value="CASE">CASE</option>
                            <option value="TUBE">TUBE</option>
                            <option value="PAIR">PAIR</option>
                            <option value="TIN">TIN</option>
                            <option value="DRUM">DRUM</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-1.5">Conversion</label>
                        <input
                          type="text"
                          value={draftOrder.items[0]?.conversion || ""}
                          onChange={(e) => {
                            const newItems = [...draftOrder.items];
                            newItems[0].conversion = e.target.value;
                            const match = e.target.value.match(/(\d+)/);
                            if (match) {
                              newItems[0].conversionRate = parseInt(match[1]) || 1;
                            }
                            setDraftOrder({ ...draftOrder, items: newItems });
                          }}
                          className="w-full bg-card border border-border px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-foreground text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                          placeholder="e.g. 10 PCS / BOX"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-1.5">Unit Price (PHP)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={draftOrder.items[0]?.unitPrice !== undefined ? draftOrder.items[0]?.unitPrice : ""}
                          onChange={(e) => {
                            const newItems = [...draftOrder.items];
                            newItems[0].unitPrice = e.target.value === "" ? undefined : parseFloat(e.target.value);
                            setDraftOrder({ ...draftOrder, items: newItems });
                          }}
                          className="w-full bg-card border border-border px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-mono font-bold text-foreground text-sm sm:text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-1.5">Supplier</label>
                      <div className="relative">
                        <select
                          className="w-full bg-card border border-border px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-foreground text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none pr-10"
                          value={draftOrder.supplierId}
                          onChange={(e) => setDraftOrder({ ...draftOrder, supplierId: parseInt(e.target.value) })}
                        >
                          {suppliers.map(s => (
                            <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* Total Summary */}
                    <div className="p-3 bg-muted/20 border border-border/50 rounded-xl sm:rounded-2xl flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Grand Total:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">
                        ₱{((draftOrder.items[0]?.quantity || 0) * (draftOrder.items[0]?.unitPrice || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-muted/20 flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDraftOrder(null)}
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPO}
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmittingPO ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    {isSubmittingPO ? "Drafting..." : "Process Order"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
