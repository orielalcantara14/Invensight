import { AlertTriangle, TrendingDown, Package, Clock, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { api, type StockPredictionResponse } from "@/services/api";

export function StockPrediction() {
  const [data, setData] = useState<StockPredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const riskBars = useMemo(() => {
    if (!data?.risk_stats) return [];
    const s = data.risk_stats;
    return [
      { name: "High", count: s.high_risk },
      { name: "Medium", count: s.medium_risk },
      { name: "Low", count: s.low_risk },
    ];
  }, [data]);

  const scatterData = useMemo(() => {
    if (!data?.risk_analysis?.length) return [];
    return data.risk_analysis
      .filter((r) => r.days_to_stockout != null && r.predicted_demand_30d > 0)
      .slice(0, 40)
      .map((r) => ({
        name: r.product_name.slice(0, 24),
        days: Number(r.days_to_stockout?.toFixed(1)),
        demand: r.predicted_demand_30d,
      }));
  }, [data]);

  const stats = data?.risk_stats;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Stock prediction</h1>
        <p className="text-gray-600 mt-1">
          Trailing 30-day sales velocity per SKU; horizon balances and order suggestions.
        </p>
        {data?.served_from_cache && data?.cache_generated_at && (
          <p className="mt-2 text-sm text-gray-500">
            Last updated {new Date(data.cache_generated_at).toLocaleString()}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 mb-6">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading…</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">High risk</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? "…" : (stats?.high_risk ?? "—")}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Medium risk</span>
            <TrendingDown className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? "…" : (stats?.medium_risk ?? "—")}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Low risk</span>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? "…" : (stats?.low_risk ?? "—")}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Avg. days to stockout</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading
              ? "…"
              : stats?.avg_days_to_stockout != null
                ? stats.avg_days_to_stockout.toFixed(1)
                : "—"}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk distribution</h2>
        <div className="h-[280px] w-full">
          {!loading && riskBars.some((b) => b.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBars} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="SKUs" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              {loading ? "Loading…" : "No classified risk (add sales and inventory)"}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Demand vs. cover (subset)</h2>
        <p className="text-sm text-gray-500 mb-4">Days to stockout vs. 30-day demand (top 40 with both metrics)</p>
        <div className="h-[300px] w-full">
          {!loading && scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="days" name="Days" unit=" d" />
                <YAxis type="number" dataKey="demand" name="Demand" />
                <ZAxis range={[40, 40]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="SKUs" data={scatterData} fill="#ea580c" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              {loading ? "Loading…" : "Not enough overlapping demand and cover data"}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">30 / 60 / 90 day projection</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  30d
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  60d
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90d
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urgency
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!loading && data?.horizon_predictions?.length ? (
                data.horizon_predictions.map((p) => (
                  <tr key={p.product_id}>
                    <td className="px-6 py-3 text-sm text-gray-900">{p.product_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.current_stock}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.stock_30d.toFixed(1)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.stock_60d.toFixed(1)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.stock_90d.toFixed(1)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.recommended_order}</td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={
                          p.urgency === "High"
                            ? "text-red-600 font-medium"
                            : p.urgency === "Medium"
                              ? "text-orange-600"
                              : "text-green-700"
                        }
                      >
                        {p.urgency}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {loading ? "Loading…" : "No inventory rows"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Critical SKUs</h2>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Days to stockout
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Suggested order
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!loading && data?.critical_items?.length ? (
                data.critical_items.map((c, i) => (
                  <tr key={`${c.product_name}-${i}`}>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.product_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {c.days_to_stockout != null ? c.days_to_stockout.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{c.recommended_order}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">
                    {loading ? "Loading…" : "None flagged"}
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
