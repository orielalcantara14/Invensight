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
          api.getStockPrediction({ useCache: false }),
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
    // Cap at 100 days for the meter
    const val = Math.min(stats.avg_days_to_stockout, 100);
    return [{ value: val }];
  }, [stats]);

  const handleCreateDraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draftOrder) return;
    setIsSubmittingPO(true);
    try {
      await api.createPurchaseOrder({
        supplier_id: draftOrder.supplierId,
        expected_delivery: draftOrder.expectedDelivery,
        items: draftOrder.items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          unit_price: i.unitPrice
        })),
        notes: "AI Generated Magic Order from Stock Prediction"
      });
      setPoSuccess(true);
      setTimeout(() => {
        setPoSuccess(false);
        setDraftOrder(null);
        // Optional: refresh data
        api.getStockPrediction().then(setData);
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsSubmittingPO(false);
    }
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stock Prediction List</h1>
          <p className="text-gray-500 mt-1">
            Your automated grocery list. AI turns stock predictions directly into draft orders.
          </p>
          {data?.served_from_cache && data?.cache_generated_at && (
            <p className="mt-2 text-xs text-gray-400 font-medium">
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
        <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Building your shopping list…</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: The Grocery List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-indigo-600" />
                Action Items
              </h2>

              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all shadow-sm"
                  />
                </div>

                {/* Urgency Filter */}
                <div className="relative w-full md:w-44">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="All">All Risks</option>
                    <option value="High">High Urgency</option>
                    <option value="Medium">Medium Urgency</option>
                    <option value="Low">Low (Healthy)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <p className="text-sm text-gray-500 font-medium">
                  {filteredList.length} recommendations available
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedList.length > 0 ? (
                  paginatedList.map((item) => {
                    const criticalData = data?.critical_items.find(c => c.product_name === item.product_name);
                    const daysLeft = criticalData?.days_to_stockout != null
                      ? Math.max(0, Math.floor(criticalData.days_to_stockout))
                      : "—";

                    return (
                      <div key={item.product_id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between group">
                        {item.urgency === "High" && (
                          <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        )}

                        <div>
                          <div className="flex items-start justify-between mb-2 relative z-10">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight w-3/4 group-hover:text-indigo-600 transition-colors">{item.product_name}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getUrgencyColor(item.urgency)}`}>
                              {item.urgency}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mt-4">
                            <div className="bg-gray-50 group-hover:bg-indigo-50/30 rounded-2xl p-3 flex-1 text-center transition-colors">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Time Left</p>
                              <p className={`text-2xl font-black ${item.urgency === 'High' ? 'text-red-600' : 'text-gray-900'}`}>
                                {daysLeft} <span className="text-xs font-bold text-gray-500">{typeof daysLeft === 'number' ? 'DAYS' : ''}</span>
                              </p>
                            </div>
                            <div className="bg-gray-50 group-hover:bg-indigo-50/30 rounded-2xl p-3 flex-1 text-center transition-colors">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">In Stock</p>
                              <p className="text-2xl font-black text-gray-900">{item.current_stock}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Recommendation</p>
                            <p className="font-black text-gray-900 text-lg">Order {item.recommended_order}</p>
                          </div>
                          <button
                            onClick={() => {
                              const finalSupplierId = item.supplier_id || suppliers.find(s => s.supplier_name === item.supplier_name)?.supplier_id || suppliers[0]?.supplier_id || 0;
                              setDraftOrder({
                                supplierId: finalSupplierId,
                                expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                                items: [{ id: item.product_id, name: item.product_name, quantity: item.recommended_order }]
                              });
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-100 transition-all hover:scale-110 active:scale-95 flex items-center gap-2 font-bold text-xs"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Order
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">No predictions found</h3>
                    <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
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
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-600" />
              Shop Pulse
            </h2>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Average Time To Stockout</h3>
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
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: '#f1f5f9' }}
                      dataKey="value"
                      cornerRadius={10}
                      fill={stats?.avg_days_to_stockout != null && stats.avg_days_to_stockout < 14 ? '#ef4444' : '#10b981'}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                  <span className="text-4xl font-black text-gray-900">
                    {stats?.avg_days_to_stockout?.toFixed(0) ?? "—"}
                  </span>
                  <span className="text-sm font-medium text-gray-500 font-bold uppercase tracking-widest">Days Avg</span>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed font-medium">
                Life expectancy of current inventory levels across active lines.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-[2.5rem] text-white p-8 shadow-xl">
              <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-6">Risk Composition</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]"></div>
                    <span className="font-bold text-indigo-50">Critical items</span>
                  </div>
                  <span className="font-black text-2xl text-white">{stats?.high_risk ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]"></div>
                    <span className="font-bold text-indigo-50">Medium risk</span>
                  </div>
                  <span className="font-black text-2xl text-white">{stats?.medium_risk ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                    <span className="font-bold text-indigo-50">Healthy</span>
                  </div>
                  <span className="font-black text-2xl text-white">{stats?.low_risk ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PO Draft Magic Modal */}
      {draftOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            {poSuccess ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-8 animate-bounce">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Draft Locked!</h2>
                <p className="text-gray-500 font-medium">Auto-generated procurement draft is now available in your orders management.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateDraft}>
                <div className="p-10 pb-8 border-b border-gray-50">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                      <Truck className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight">Purchase Draft</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Intelligence Active</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Item Priority</label>
                      <div className="bg-gray-50 p-5 rounded-3xl font-black text-gray-900 border border-gray-100/50 shadow-sm text-lg">
                        {draftOrder.items[0]?.name}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Fill Amount</label>
                        <input
                          type="number"
                          value={draftOrder.items[0]?.quantity || 0}
                          onChange={(e) => {
                            const newItems = [...draftOrder.items];
                            newItems[0].quantity = parseInt(e.target.value) || 0;
                            setDraftOrder({ ...draftOrder, items: newItems });
                          }}
                          className="w-full bg-white border border-gray-100 p-5 rounded-3xl font-black text-gray-900 text-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Supplier</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-white border border-gray-100 p-5 rounded-3xl font-bold text-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none pr-12"
                            value={draftOrder.supplierId}
                            onChange={(e) => setDraftOrder({...draftOrder, supplierId: parseInt(e.target.value)})}
                          >
                            {suppliers.map(s => (
                              <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gray-50/50 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setDraftOrder(null)}
                    className="px-8 py-4 rounded-3xl font-black text-xs text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPO}
                    className="px-8 py-4 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                  >
                    {isSubmittingPO ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-4 h-4" />}
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
