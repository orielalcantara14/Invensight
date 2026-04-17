import {
  TrendingUp,
  Calendar,
  Activity,
  Loader2,
  TrendingDown,
  Activity as ForecastIcon,
  Layers,
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
  Brush,
} from "recharts";
import { useState, useEffect, useMemo, useRef } from "react";
import { api, type SalesForecastResponse } from "@/services/api";

type Resolution = "7d" | "30d" | "1y";

function formatPhp(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "N/A";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function Forecasting() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesForecastResponse | null>(null);
  const [resolution, setResolution] = useState<Resolution>("30d");
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);

  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getSalesForecast(365);
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

  const rawChartData = useMemo(() => {
    if (!data?.series?.length) return [];

    let filtered = data.series;
    const now = new Date();

    if (resolution === "7d") {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 14);
      const end = new Date();
      end.setDate(now.getDate() + 7);
      filtered = data.series.filter(s => {
        const d = new Date(s.date);
        return d >= cutoff && d <= end;
      });
    } else if (resolution === "30d") {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 60);
      const end = new Date();
      end.setDate(now.getDate() + 30);
      filtered = data.series.filter(s => {
        const d = new Date(s.date);
        return d >= cutoff && d <= end;
      });
    }

    return filtered.map((s) => ({
      date: s.date,
      label: s.date.slice(5),
      actual_sales: s.actual_sales,
      forecast_sales: s.forecast_sales,
      lower_bound: s.lower_bound,
      upper_bound: s.upper_bound,
      interval: [s.lower_bound, s.upper_bound],
      trend: s.trend_component ?? 0,
      seasonal: s.seasonal_component ?? 0,
      holidays: s.holidays_component ?? 0,
      yearly: s.yearly_component ?? 0,
      weekly: s.weekly_component ?? 0,
    }));
  }, [data, resolution]);

  useEffect(() => {
    if (rawChartData.length > 0) {
      setZoomRange({ start: 0, end: rawChartData.length - 1 });
    }
  }, [rawChartData]);

  useEffect(() => {
    if (!zoomRange || rawChartData.length === 0) return;

    const handleWheelManual = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      const currentRange = zoomRange.end - zoomRange.start;
      const step = Math.max(1, Math.floor(currentRange * 0.1));

      setZoomRange(prev => {
        if (!prev) return prev;
        let newStart = prev.start;
        let newEnd = prev.end;

        if (delta < 0) {
          newStart = Math.min(newEnd - 5, newStart + step);
          newEnd = Math.max(newStart + 5, newEnd - step);
        } else {
          newStart = Math.max(0, newStart - step);
          newEnd = Math.min(rawChartData.length - 1, newEnd + step);
        }
        return { start: newStart, end: newEnd };
      });
    };

    const c1 = chartRef1.current;
    const c2 = chartRef2.current;

    if (c1) c1.addEventListener('wheel', handleWheelManual, { passive: false });
    if (c2) c2.addEventListener('wheel', handleWheelManual, { passive: false });

    return () => {
      if (c1) c1.removeEventListener('wheel', handleWheelManual);
      if (c2) c2.removeEventListener('wheel', handleWheelManual);
    };
  }, [zoomRange, rawChartData.length]);

  const chartData = useMemo(() => {
    if (!zoomRange) return rawChartData;
    return rawChartData.slice(zoomRange.start, zoomRange.end + 1);
  }, [rawChartData, zoomRange]);

  const yDomainMain = useMemo(() => {
    if (!chartData.length) return [0, 'auto'];
    const mins = chartData.map(d => d.lower_bound ?? 0);
    const maxs = chartData.map(d => d.upper_bound ?? 0);
    const actuals = chartData.map(d => d.actual_sales ?? 0);

    const minVal = Math.min(...mins, ...actuals);
    const maxVal = Math.max(...maxs, ...actuals);

    return [Math.floor(minVal * 0.9), Math.ceil(maxVal * 1.1)] as [number, number];
  }, [chartData]);

  const yDomainDecomp = useMemo(() => {
    if (!chartData.length) return [0, 'auto'];
    const vals = chartData.flatMap(d => [d.trend, d.seasonal, d.holidays]);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    return [
      Math.floor(minVal - Math.abs(minVal * 0.1)),
      Math.ceil(maxVal + Math.abs(maxVal * 0.1))
    ] as [number, number];
  }, [chartData]);

  const showCharts = rawChartData.length > 0 && !loading;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900">
            Forecasting Report
          </h1>
        </div>

        <div className="flex items-center gap-3 bg-card p-1.5 rounded-2xl shadow-sm border border-border">
          {(["7d", "30d", "1y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setResolution(r)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${resolution === r
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
            >
              {r === "7d" ? "Next 7 Days" : r === "30d" ? "Monthly View" : "Annual View"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-primary/90 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp size={80} />
          </div>
          <div className="relative z-10">
            <span className="text-indigo-100 font-bold tracking-widest text-xs uppercase mb-2 block">Planned Revenue (30D)</span>
            <div className="text-4xl font-black mb-2 tracking-tighter">
              {loading ? "…" : formatPhp(data?.next_period_forecast ?? null)}
            </div>
            <p className="text-indigo-200 text-sm font-medium">Aggregated AI projection for the next cycle.</p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2rem] shadow-sm border border-border flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-emerald-500/10 group-hover:scale-110 transition-transform duration-500">
            <Activity size={80} />
          </div>
          <div className="relative z-10">
            <span className="text-muted-foreground/70 font-bold tracking-widest text-xs uppercase mb-2 block">Model Confidence</span>
            <div className="text-4xl font-black text-foreground mb-2">
              {loading ? "…" : data?.forecast_accuracy != null ? `${data.forecast_accuracy.toFixed(1)}%` : "N/A"}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                  style={{ width: `${data?.forecast_accuracy ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2rem] shadow-sm border border-border flex flex-col justify-center">
          <span className="text-muted-foreground/70 font-bold tracking-widest text-xs uppercase mb-2 block">Forecast Engine</span>
          <div className="text-2xl font-black text-foreground mb-1 capitalize">
            {data?.forecast_engine || "Prophet AI"}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">Operational</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="absolute inset-0 bg-indigo-600/20 blur-xl rounded-full" />
          </div>
          <span className="font-bold text-muted-foreground/70 animate-pulse tracking-widest uppercase text-xs">Synthesizing Prophet Model…</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border-2 border-red-100 bg-red-50/50 p-6 text-red-800 text-sm font-bold flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-2xl"><TrendingDown className="w-6 h-6" /></div>
          {error}
        </div>
      )}

      {!loading && !error && showCharts && (
        <div className="space-y-8">
          <div 
            ref={chartRef1}
            className="bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden relative group cursor-ns-resize"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Main Sales Interval</h2>
                <p className="text-sm font-medium text-slate-400">Scroll wheel to zoom • Actual vs Predicted with Confidence Intervals</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-2xl text-slate-400 group-hover:text-blue-400 transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorInterval" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={yDomainMain}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: '#334155', strokeWidth: 1 }}
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '1.5rem', 
                      border: '1px solid #334155', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                      color: '#fff' 
                    }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(v: number, name: string) => [formatPhp(v), name]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={40}
                    iconType="circle"
                    formatter={(val) => <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{val}</span>}
                  />

                  <Area
                    type="monotone"
                    dataKey="interval"
                    stroke="none"
                    fill="url(#colorInterval)"
                    fillOpacity={1}
                    name="Prediction Interval"
                    activeDot={false}
                    tooltipType="none"
                  />

                  <Line
                    type="monotone"
                    dataKey="upper_bound"
                    name="Upper Bound"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  <Line
                    type="monotone"
                    dataKey="lower_bound"
                    name="Lower Bound"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  <Line
                    type="monotone"
                    dataKey="actual_sales"
                    name="Observed"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeOpacity={0.9}
                    dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />

                  <Line
                    type="monotone"
                    dataKey="forecast_sales"
                    name="AI Predicted"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  />

                  <Brush
                    dataKey="date"
                    height={40}
                    stroke="#334155"
                    fill="#1e293b"
                    travellerWidth={12}
                    startIndex={0}
                    endIndex={chartData.length - 1}
                  >
                    <ComposedChart data={chartData}>
                      <Area type="monotone" dataKey="forecast_sales" fill="#3b82f6" fillOpacity={0.1} stroke="none" />
                    </ComposedChart>
                  </Brush>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            ref={chartRef2}
            className="bg-card p-8 rounded-[2.5rem] shadow-sm border border-border overflow-hidden relative group cursor-ns-resize"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight italic">Model Decomposition</h2>
                <p className="text-sm font-medium text-muted-foreground/70">Scroll wheel to zoom • Additive components: Trend + Seasonality + Holidays</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-2xl text-muted-foreground/70 group-hover:text-indigo-600 transition-colors">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={yDomainDecomp}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number, name: string) => [formatPhp(v), name]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={40}
                    iconType="circle"
                    formatter={(val) => <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">{val}</span>}
                  />

                  <Line
                    type="monotone"
                    dataKey="trend"
                    name="Trend [g(t)]"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="seasonal"
                    name="Seasonality [s(t)]"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Area
                    type="step"
                    dataKey="holidays"
                    name="Holidays [h(t)]"
                    fill="#ec4899"
                    fillOpacity={0.4}
                    stroke="#ec4899"
                    strokeWidth={1}
                  />

                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="#e2e8f0"
                    fill="#fff"
                    startIndex={0}
                    endIndex={chartData.length - 1}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && data?.product_forecasts && resolution !== "1y" && (
        <div className="bg-card rounded-[2.5rem] shadow-sm border border-border overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-muted/50/30">
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tight">Demand Velocity Scan</h2>
              <p className="text-sm font-medium text-muted-foreground/70">Products with highest 30-day projected throughput.</p>
            </div>
            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest">
              Catalog Insights
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-card">
                  <th className="py-6 px-8 text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">Product Name</th>
                  <th className="py-6 px-8 text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] text-center">Confidence</th>
                  <th className="py-6 px-8 text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] text-right">30d Demand Estimate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.product_forecasts.slice(0, 6).map(p => (
                  <tr key={p.product_id} className="hover:bg-indigo-50/30 transition-all duration-300 group">
                    <td className="py-6 px-8">
                      <div className="font-bold text-foreground group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm">{p.product_name}</div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${p.confidence * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground/70">{(p.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-sm">
                        {p.predicted_demand_30d.toFixed(0)} units
                        <TrendingUp className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && !showCharts && (
        <div className="mb-8 rounded-3xl border border-border bg-muted/50 p-12 text-center flex flex-col items-center">
          <ForecastIcon className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-foreground">Not Enough Data</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">No series data returned. Ensure the API is running and regular sales exist in the database for the forecast model to generate.</p>
        </div>
      )}
    </div>
  );
}
