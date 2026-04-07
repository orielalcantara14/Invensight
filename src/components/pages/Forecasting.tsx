import {
  TrendingUp,
  Calendar,
  Activity,
  Loader2,
  TrendingDown,
  Activity as ForecastIcon,
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
  ReferenceLine,
  Label,
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

// Icons removed for sanitization

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
        interval: [s.lower_bound, s.upper_bound],
        smoothed_sales: s.smoothed_sales ?? s.forecast_sales,
        trend_component: s.trend_component ?? 0,
        event_icon: s.event_icon,
      };
    });
  }, [data]);

  const showCharts = chartData.length > 0 && !loading;

  const trendIcon = data?.trend_direction === "up" ? (
    <TrendingUp className="w-8 h-8 text-emerald-500" />
  ) : data?.trend_direction === "down" ? (
    <TrendingDown className="w-8 h-8 text-red-500" />
  ) : (
    <Activity className="w-8 h-8 text-blue-400" />
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Forecasting Report</h1>
          <p className="text-gray-500 mt-1">
            Analyze projected sales intervals and revenue growth for the upcoming period.
          </p>
          {data?.served_from_cache && data?.cache_generated_at && (
            <p className="mt-2 text-xs text-gray-400 font-medium">
              Data snapshot from {new Date(data.cache_generated_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-white to-sky-50 p-6 rounded-3xl shadow-sm border border-sky-100 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sky-800 font-medium tracking-wide text-sm uppercase">Current AI Predicted</span>
            <Activity className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {loading ? "…" : data?.series?.length ? formatPhp(data.series[data.series.length - 31]?.forecast_sales) : "N/A"}
          </div>
          <div className="text-sm text-sky-600 mt-2 font-medium">Today's AI projected baseline</div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 font-medium tracking-wide text-sm uppercase">Total Forecast (30D)</span>
            <TrendingUp className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {loading ? "…" : formatPhp(data?.next_period_forecast ?? null)}
          </div>
          <div className="text-sm text-gray-500 mt-2 font-medium">AI-projected revenue generation</div>
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
                ? `${data.forecast_accuracy.toFixed(1)}%`
                : "N/A"}
          </div>
          <div className="text-sm text-gray-500 mt-2 font-medium">Statistical model confidence score</div>
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
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Sales Performance Forecast
            </h2>
            <p className="text-sm text-gray-500 max-w-2xl">
              Actual daily sales data compared against AI projections and historical patterns.
            </p>
          </div>

          <div className="h-[430px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 60, right: 30, left: 10, bottom: 10 }}>
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
                  formatter={(v: number, name: string) => [formatPhp(v), name]}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ paddingTop: '20px' }} 
                  payload={[
                    { value: 'AI Prediction', type: 'line', color: '#f97316' },
                    { value: 'Actual Sales', type: 'circle', color: '#3b82f6' },
                    { value: 'Confidence Interval', type: 'rect', color: '#f97316' }
                  ]}
                />

                {/* Confidence Interval (Base Layer) */}
                <Area
                  type="monotone"
                  dataKey="interval"
                  stroke="none"
                  fill="#f97316"
                  fillOpacity={0.15}
                  name="Confidence Interval"
                  tooltipType="none"
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
                <Line
                  type="monotone"
                  dataKey="forecast_sales"
                  name="AI Prediction"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={(props: any) => {
                    const { cx, cy, index } = props;
                    if (index === chartData.length - 1) {
                      return (
                        <circle key="last-dot" cx={cx} cy={cy} r={6} fill="#f97316" stroke="white" strokeWidth={2} />
                      );
                    }
                    return <g key={`dot-${index}`} />;
                  }}
                  activeDot={{ r: 6 }}
                />

                {/* Annotations matching reference image */}
                <>
                  {/* Last AI Predicted Point */}
                  {chartData.length > 0 && (
                    <ReferenceLine 
                      x={chartData[chartData.length - 1]?.label} 
                      stroke="#f97316" 
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                    >
                      <Label 
                        value="AI PREDICTED SALES" 
                        position="insideTopRight" 
                        dx={-10}
                        dy={-30}
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          fill: '#f97316',
                          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                    </ReferenceLine>
                  )}
                </>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Key Legend explanation removed */}
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
                    <td className="py-4 px-6 text-right font-bold text-indigo-600">{p.predicted_demand_30d.toFixed(0)} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && !showCharts && (
        <div className="mb-8 rounded-3xl border border-gray-200 bg-gray-50 p-12 text-center flex flex-col items-center">
          <ForecastIcon className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">Not Enough Data</h3>
          <p className="text-gray-500 mt-1 max-w-sm">No series data returned. Ensure the API is running and regular sales exist in the database for the forecast model to generate.</p>
        </div>
      )}
    </div>
  );
}
