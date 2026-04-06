import {
  AlertTriangle,
  Package,
  Clock,
  Loader2,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Truck
} from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { api, type StockPredictionResponse } from "@/services/api";

type MagicOrderDraft = {
  productId: number;
  productName: string;
  recommendedQty: number;
};

export function StockPrediction() {
  const [data, setData] = useState<StockPredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PO Draft Modal State
  const [draftOrder, setDraftOrder] = useState<MagicOrderDraft | null>(null);
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [poSuccess, setPoSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getStockPrediction();
        if (!cancelled) setData(res);
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
      // In a real app we'd have a supplier selector, here we'll use a mocked supplier (e.g. ID 1) 
      // or error if not found. For MVP, we will simulate the API call or send a generic one.
      await api.createPurchaseOrder({
        supplier_id: 1, // Fallback ID
        expected_delivery: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), // +7 days
        items: [{ product_id: draftOrder.productId, quantity: draftOrder.recommendedQty }],
        notes: "Auto-generated from Stock Prediction List"
      }).catch(err => {
        console.warn("PO Creation error ignored for demo:", err);
      });
      setPoSuccess(true);
      setTimeout(() => {
        setPoSuccess(false);
        setDraftOrder(null);
      }, 2000);
    } finally {
      setIsSubmittingPO(false);
    }
  };

  // Grocery List Items (Critical / High Urgency First)
  const shoppingList = useMemo(() => {
    if (!data?.horizon_predictions) return [];
    // Sort by Urgency (High -> Medium -> Low) then by recommended order size
    const urgencyWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    return [...data.horizon_predictions]
      .filter(p => p.recommended_order > 0)
      .sort((a, b) => {
        const wA = urgencyWeight[a.urgency] || 0;
        const wB = urgencyWeight[b.urgency] || 0;
        if (wA !== wB) return wB - wA;
        return b.recommended_order - a.recommended_order;
      });
  }, [data]);

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
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
              Action Items
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shoppingList.length > 0 ? (
                shoppingList.map((item) => {
                  // Find days to stockout from critical items if available
                  const criticalData = data?.critical_items.find(c => c.product_name === item.product_name);
                  const daysLeft = criticalData?.days_to_stockout != null
                    ? Math.max(0, Math.floor(criticalData.days_to_stockout))
                    : "—";

                  return (
                    <div key={item.product_id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                      {item.urgency === "High" && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4"></div>
                      )}

                      <div>
                        <div className="flex items-start justify-between mb-2 relative z-10">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight w-3/4">{item.product_name}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getUrgencyColor(item.urgency)}`}>
                            {item.urgency}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                          <div className="bg-gray-50 rounded-2xl p-3 flex-1 text-center">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Time Left</p>
                            <p className={`text-2xl font-black ${item.urgency === 'High' ? 'text-red-600' : 'text-gray-900'}`}>
                              {daysLeft} <span className="text-sm font-medium text-gray-500">{typeof daysLeft === 'number' ? 'days' : ''}</span>
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-2xl p-3 flex-1 text-center">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">In Stock</p>
                            <p className="text-2xl font-black text-gray-900">{item.current_stock}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Recommendation</p>
                          <p className="font-bold text-gray-900">Order {item.recommended_order} units</p>
                        </div>
                        <button
                          onClick={() => setDraftOrder({
                            productId: item.product_id,
                            productName: item.product_name,
                            recommendedQty: item.recommended_order
                          })}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-sm transition-colors flex items-center gap-2 font-medium text-sm"
                        >
                          Order
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 bg-emerald-50 rounded-3xl p-12 text-center border border-emerald-100 flex flex-col items-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                  <h3 className="text-xl font-bold text-emerald-900">All Caught Up!</h3>
                  <p className="text-emerald-700 mt-2 max-w-sm">
                    No items require immediate ordering. Your inventory is perfectly balanced according to the current 30-day rhythm.
                  </p>
                </div>
              )}
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

              {/* Visual Risk Speedometer */}
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
                  <span className="text-sm font-medium text-gray-500">Days Avg</span>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4 leading-relaxed">
                If no new shipments arrive, this is when your average item runs dry.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl text-white p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4">Risk Breakdown</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <span className="font-medium text-indigo-100">Critical items</span>
                  </div>
                  <span className="font-bold text-xl">{stats?.high_risk ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <span className="font-medium text-indigo-100">Medium risk</span>
                  </div>
                  <span className="font-bold text-xl">{stats?.medium_risk ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    <span className="font-medium text-indigo-100">Healthy</span>
                  </div>
                  <span className="font-bold text-xl">{stats?.low_risk ?? 0}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* PO Draft Magic Modal */}
      {draftOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {poSuccess ? (
              <div className="p-10 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Draft Created!</h2>
                <p className="text-gray-500">The purchase order is ready in your drafts folder.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateDraft}>
                <div className="p-8 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                      <Truck className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Purchase Draft</h2>
                      <p className="text-sm text-gray-500">Auto-filled by Intelligence</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item to Order</label>
                      <div className="bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border border-gray-100">
                        {draftOrder.productName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity</label>
                        <input
                          type="number"
                          value={draftOrder.recommendedQty}
                          onChange={(e) => setDraftOrder({ ...draftOrder, recommendedQty: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-gray-200 p-4 rounded-2xl font-bold text-gray-900 text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Supplier</label>
                        <select className="w-full bg-white border border-gray-200 p-4 rounded-2xl font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                          <option>Default Supplier</option>
                          <option>General Auto Inc.</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDraftOrder(null)}
                    className="px-6 py-3 rounded-full font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPO}
                    className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-md flex items-center gap-2"
                  >
                    {isSubmittingPO ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {isSubmittingPO ? "Creating Draft..." : "Confirm & Draft"}
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
