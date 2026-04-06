import {
  TrendingUp,
  Calendar,
  Activity,
  Loader2,
  CloudRain,
  Sun,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
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
  if (t === "up") return "Trending Up";
  if (t === "down") return "Trending Down";
  return "Stable Expected";
}

// Custom Dot to show Payday 💰 or Weekend 🏍️
const CustomIconDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload.event_icon) return null;
  const icon = payload.event_icon === "payday" ? "💰" : "🏍️";
  return (
    <text x={cx} y={cy - 10} textAnchor="middle" fontSize={16}>
      {icon}
    </text>
  );
};

export function Forecasting() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesForecastResponse | null>(null);
  const [clearView, setClearView] = useState(false);

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
        interval: [s.lower_bound, s.upper_bound],
        smoothed_sales: s.smoothed_sales ?? s.forecast_sales,
        trend_component: s.trend_component ?? 0,
        event_icon: s.event_icon,
      };
    });
  }, [data]);

  const showCharts = chartData.length > 0 && !loading;

  const trendIcon = data?.trend_direction === "up" ? (
    <Sun className="w-8 h-8 text-amber-500" />
  ) : data?.trend_direction === "down" ? (
    <CloudRain className="w-8 h-8 text-slate-400" />
  ) : (
    <Calendar className="w-8 h-8 text-blue-400" />
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Forecasting Report</h1>
          <p className="text-gray-500 mt-1">
            See the predicted rhythm of your shop. Sunny peaks and cloudy lulls ahead.
          </p>
          {data?.served_from_cache && data?.cache_generated_at && (
            <p className="mt-2 text-xs text-gray-400 font-medium">
              Data snapshot from {new Date(data.cache_generated_at).toLocaleString()}
            </p>
          )}
        </div>

        {showCharts && (
          <button
            onClick={() => setClearView(!clearView)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${clearView
                ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
              }`}
          >
            {clearView ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            {clearView ? "Clear View Active" : "Enable Clear View"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-white to-sky-50 p-6 rounded-3xl shadow-sm border border-sky-100 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sky-800 font-medium tracking-wide text-sm uppercase">Business Climate</span>
            {trendIcon}
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {loading ? "…" : data ? trendLabel(data.trend_direction) : "N/A"}
          </div>
          <div className="text-sm text-sky-600 mt-2 font-medium">Predicted rhythm over the next 30 days</div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 font-medium tracking-wide text-sm uppercase">Total Forecast (30D)</span>
            <TrendingUp className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {loading ? "…" : formatPhp(data?.next_period_forecast ?? null)}
          </div>
          <div className="text-sm text-gray-500 mt-2 font-medium">Estimated revenue generation</div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 font-medium tracking-wide text-sm uppercase">AI Confidence</span>
            <Activity className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {loading
              ? "…"
              : data?.forecast_accuracy != null
                ? `${data.forecast_accuracy.toFixed(0)}%`
                : "N/A"}
          </div>
          <div className="text-sm text-gray-500 mt-2 font-medium">Reliability based on historical data</div>
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
          <span className="font-medium">Synthesizing forecast patterns…</span>
        </div>
      )}

      {!loading && !error && showCharts && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
          {clearView && (
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {clearView ? "Smooth Trend Line" : "Raw Sales Data & Clouds"}
            </h2>
            <p className="text-sm text-gray-500 max-w-2xl">
              {clearView
                ? "Noise removed. Showing the underlying rhythm and path of your business."
                : "Actual daily sales paths, combined with the AI's blue safety cloud. Orange line is the exact prediction model."}
            </p>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number, name: string) => {
                    const cleanName = name === 'interval' ? 'Safety Cloud' : name;
                    return [formatPhp(v), cleanName];
                  }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                {/* Confidence Cloud */}
                {!clearView && (
                  <Area
                    type="monotone"
                    dataKey="interval"
                    name="Safety Cloud"
                    stroke="none"
                    fill="#bae6fd"
                    fillOpacity={0.5}
                    isAnimationActive={true}
                  />
                )}

                {/* Raw vs Smoothed selection */}
                {clearView ? (
                  <Line
                    type="monotone"
                    dataKey="smoothed_sales"
                    name="Smoothed Path"
                    stroke="#8b5cf6"
                    strokeWidth={4}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
                  />
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="forecast_sales"
                      name="AI Prediction"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={<CustomIconDot />}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual_sales"
                      name="Actual Sales"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Key Legend explanation */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-gray-500 bg-gray-50 p-4 rounded-2xl">
            <div className="flex items-center gap-1.5"><span className="text-base">💰</span> = Predicted Payday Surge</div>
            <div className="flex items-center gap-1.5"><span className="text-base">🏍️</span> = Predicted Weekend Surge</div>
          </div>
        </div>
      )}

      {/* Simplified Product Demand Section - Just a minimal highlight */}
      {!loading && !error && data?.product_forecasts && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Quick Velocity Scan (Top Expected)</h2>
            <p className="text-sm text-gray-500">Highest predicted 30-day demand from your catalog.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">30d Demand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.product_forecasts.slice(0, 5).map(p => (
                  <tr key={p.product_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">{p.product_name}</td>
                    <td className="py-4 px-6 text-right font-bold text-indigo-600">{p.predicted_demand_30d.toFixed(1)} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && !showCharts && (
        <div className="mb-8 rounded-3xl border border-gray-200 bg-gray-50 p-12 text-center flex flex-col items-center">
          <CloudRain className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">Not Enough Data</h3>
          <p className="text-gray-500 mt-1 max-w-sm">No series data returned. Ensure the API is running and regular sales exist in the database for the weather report to generate.</p>
        </div>
      )}
    </div>
  );
}
