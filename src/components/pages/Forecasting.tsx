import { TrendingUp, Calendar, Activity, Loader2 } from "lucide-react";
import {
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect, useMemo } from "react";
import { api, type SalesForecastResponse } from "@/services/api";

function formatPhp(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "N/A";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function trendLabel(t: string) {
  if (t === "up") return "Up";
  if (t === "down") return "Down";
  return "Flat";
}

export function Forecasting() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesForecastResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getSalesForecast(90);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load forecast");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(() => {
    if (!data?.series?.length) return [];
    return data.series.map((s) => {
      const d = s.date.slice(5);
      return {
        label: d,
        actual_sales: s.actual_sales,
        forecast_sales: s.forecast_sales,
        lower_bound: s.lower_bound,
        upper_bound: s.upper_bound,
        trend_component: s.trend_component ?? 0,
        weekly_component: s.weekly_component ?? 0,
      };
    });
  }, [data]);

  const hasSeasonalBreakdown = useMemo(
    () => data?.series?.some((s) => s.trend_component != null) ?? false,
    [data]
  );

  const showCharts = chartData.length > 0 && !loading;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sales forecasting</h1>
        <p className="text-gray-600 mt-1">
          Daily revenue outlook with forecast and confidence bands from your sales history.
        </p>
        {data?.served_from_cache && data?.cache_generated_at && (
          <p className="mt-2 text-sm text-gray-500">
            Last updated {new Date(data.cache_generated_at).toLocaleString()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Next 30 days (forecast sum)</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? "…" : formatPhp(data?.next_period_forecast ?? null)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Based on recent daily revenue</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">In-sample accuracy</span>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading
              ? "…"
              : data?.forecast_accuracy != null
                ? `${data.forecast_accuracy.toFixed(0)}%`
                : "N/A"}
          </div>
          <div className="text-sm text-gray-500 mt-1">Compared to days with recorded sales</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Trend direction</span>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? "…" : data ? trendLabel(data.trend_direction) : "N/A"}
          </div>
          <div className="text-sm text-gray-500 mt-1">Based on recent pattern</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading forecast…</span>
        </div>
      )}

      {!loading && !error && showCharts && (
        <>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Trend and seasonal pattern</h2>
            <p className="text-sm text-gray-500 mb-4">
              {hasSeasonalBreakdown
                ? "Estimated trend and weekly variation from your sales series"
                : "Add more daily sales history to see trend and seasonal detail"}
            </p>
            <div className="h-[320px] w-full">
              {hasSeasonalBreakdown ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
                    <Tooltip formatter={(v: number) => formatPhp(v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="trend_component"
                      name="Trend"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="weekly_component"
                      name="Weekly seasonal"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Trend detail appears once enough daily sales history is available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Forecast vs actual</h2>
            <p className="text-sm text-gray-500 mb-4">
              Orange = forecast; dashed = lower and upper band; blue = actual revenue
            </p>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <Tooltip formatter={(v: number) => formatPhp(v)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="lower_bound"
                    name="Lower (80%)"
                    stroke="#93c5fd"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="upper_bound"
                    name="Upper (80%)"
                    stroke="#93c5fd"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast_sales"
                    name="Forecast"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual_sales"
                    name="Actual"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!loading && !error && !showCharts && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          No series data returned. Ensure the API is running and sales exist in the database.
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Product-level demand (30 days)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predicted demand (30d)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder by
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days to stockout
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!loading && data?.product_forecasts?.length ? (
                data.product_forecasts.map((p) => (
                  <tr key={p.product_id}>
                    <td className="px-6 py-3 text-sm text-gray-900">{p.product_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.current_stock}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.predicted_demand_30d.toFixed(1)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.reorder_by ?? "—"}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{(p.confidence * 100).toFixed(0)}%</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {p.days_to_stockout != null ? p.days_to_stockout.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">
                      {loading ? "Loading…" : "No products in inventory"}
                    </p>
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
