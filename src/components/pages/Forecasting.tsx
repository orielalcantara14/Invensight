import {
  TrendingUp,
  Calendar,
  Activity,
  Loader2,
  TrendingDown,
  Activity as ForecastIcon,
  Layers,
  AlertTriangle,
  PackageCheck,
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
  LabelList,
  Label,
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-4 rounded-2xl shadow-xl border border-border animate-in fade-in zoom-in duration-200">
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">{label}</p>
          <div className="space-y-2">
            {payload.map((item: any, index: number) => {
              if (item.name === 'Confidence Interval' || item.name === 'Upper Bound' || item.name === 'Lower Bound') return null;
              return (
                <div key={index} className="flex items-center justify-between gap-8">
                  <span className="text-sm font-medium text-muted-foreground">{item.name} :</span>
                  <span className="text-sm font-bold text-foreground">{formatPhp(item.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartRef1 = useRef<HTMLDivElement>(null);

  const reorderCount = useMemo(() => {
    if (!data?.product_forecasts) return 0;
    return data.product_forecasts.filter(p => p.reorder_by).length;
  }, [data]);

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

    const nowStr = new Date().toISOString().split('T')[0];

    const processed = filtered.map((s, i) => {
      const isFuture = s.date > nowStr;
      let actual_sales = isFuture ? null : s.actual_sales;
      let forecast_sales = s.forecast_sales;
      let lower_bound = s.lower_bound;
      let upper_bound = s.upper_bound;
      let trend = s.trend_component ?? 0;

      // Apply 7-day rolling average ONLY for Annual View (1y)
      if (resolution === '1y') {
        const windowSize = 7;
        const start = Math.max(0, i - (windowSize - 1));
        const chunk = filtered.slice(start, i + 1);

        const avg = (key: string) => {
          const valid = chunk.filter(c => c[key] !== null && c[key] !== undefined);
          if (valid.length === 0) return null;
          return valid.reduce((acc, curr) => acc + (curr[key] ?? 0), 0) / valid.length;
        };

        // For actuals, we only average up to today
        const historyChunk = chunk.filter(c => c.date <= nowStr);
        actual_sales = isFuture ? null : (historyChunk.length > 0
          ? historyChunk.reduce((acc, curr) => acc + (curr.actual_sales ?? 0), 0) / historyChunk.length
          : actual_sales);

        forecast_sales = avg('forecast_sales') ?? forecast_sales;
        lower_bound = avg('lower_bound') ?? lower_bound;
        upper_bound = avg('upper_bound') ?? upper_bound;
        trend = avg('trend_component') ?? trend;
      }

      return {
        date: s.date,
        label: s.date.slice(5),
        actual_sales,
        forecast_sales,
        lower_bound,
        upper_bound,
        interval: [lower_bound, upper_bound],
        trend,
        seasonal: s.seasonal_component ?? 0,
        holidays: s.holidays_component ?? 0,
        yearly: s.yearly_component ?? 0,
        weekly: s.weekly_component ?? 0,
      };
    });

    return processed;
  }, [data, resolution]);

  useEffect(() => {
    if (rawChartData.length > 0) {
      setZoomRange({ start: 0, end: rawChartData.length - 1 });
    }
  }, [rawChartData]);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const initialRange = useRef({ start: 0, end: 0 });

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

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;
      initialRange.current = { ...zoomRange };
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const container = chartRef1.current;
      if (!container) return;

      const deltaX = e.clientX - startX.current;
      const containerWidth = container.getBoundingClientRect().width;
      const rangeLength = initialRange.current.end - initialRange.current.start;
      const pointsPerPixel = rangeLength / containerWidth;
      const shift = Math.round(deltaX * pointsPerPixel);

      setZoomRange(() => {
        let newStart = initialRange.current.start - shift;
        let newEnd = initialRange.current.end - shift;

        // Constraint checking
        if (newStart < 0) {
          const adj = -newStart;
          newStart = 0;
          newEnd = Math.min(rawChartData.length - 1, newEnd + adj);
        }
        if (newEnd >= rawChartData.length) {
          const adj = newEnd - (rawChartData.length - 1);
          newEnd = rawChartData.length - 1;
          newStart = Math.max(0, newStart - adj);
        }

        return { start: newStart, end: newEnd };
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const c1 = chartRef1.current;

    if (c1) {
      c1.addEventListener('wheel', handleWheelManual, { passive: false });
      c1.addEventListener('mousedown', handleMouseDown, { capture: true });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (c1) {
        c1.removeEventListener('wheel', handleWheelManual);
        c1.removeEventListener('mousedown', handleMouseDown, { capture: true });
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
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


  const showCharts = rawChartData.length > 0 && !loading;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Forecasting Report
          </h1>
          <p className="text-muted-foreground mt-1">AI-driven sales projections and trend analysis.</p>
        </div>

        <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
          {(["7d", "30d", "1y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setResolution(r)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${resolution === r
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-8 rounded-3xl shadow-lg text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
            <span className="text-indigo-200 font-medium tracking-wider text-xs uppercase mb-2 block">Predicted Revenue (30D)</span>
            <div className="text-4xl font-bold mb-2 tracking-tight">
              {loading ? "…" : formatPhp(data?.next_period_forecast ?? null)}
            </div>
            <p className="text-indigo-200/80 text-sm">Aggregated AI projection for the next cycle.</p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-3xl shadow-sm border border-border flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 p-8 text-emerald-500/5 group-hover:scale-110 transition-transform duration-500">
            <Activity size={120} />
          </div>
          <div className="relative z-10">
            <span className="text-muted-foreground font-medium tracking-wider text-xs uppercase mb-2 block">Model Confidence</span>
            <div className="text-4xl font-bold text-foreground mb-2">
              {loading ? "…" : data?.forecast_accuracy != null ? `${data.forecast_accuracy.toFixed(1)}%` : "N/A"}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                  style={{ width: `${data?.forecast_accuracy ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card p-8 rounded-3xl shadow-sm border border-border flex flex-col justify-center relative group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 p-8 text-primary/5 group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle size={120} />
          </div>
          <div className="relative z-10">
            <span className="text-muted-foreground font-medium tracking-wider text-xs uppercase mb-2 block">Restock Necessity</span>
            <div className="text-4xl font-bold text-foreground mb-2">
              {loading ? "…" : `${reorderCount} Products`}
            </div>
            <div className="flex items-center gap-2 mt-4">
              {reorderCount > 0 ? (
                <>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse" />
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Action Required</span>
                </>
              ) : (
                <>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Stock Optimal</span>
                </>
              )}
            </div>
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
            className="bg-card p-8 rounded-3xl shadow-sm border border-border relative group cursor-grab active:cursor-grabbing"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">Main Sales Interval</h2>
                <p className="text-sm text-muted-foreground">Actual vs Predicted with Confidence Intervals</p>
              </div>
              <div className="p-2.5 bg-muted rounded-xl text-muted-foreground group-hover:text-primary transition-colors">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="h-[450px] w-full cursor-grab active:cursor-grabbing">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 45, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorInterval" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" strokeOpacity={0.1} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={40}
                    interval="preserveStartEnd"
                    dy={12}
                  >
                    <Label value="OrderDate" offset={-5} position="insideBottom" fill="#64748b" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  </XAxis>
                  <YAxis
                    domain={yDomainMain}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  >
                    <Label value="SaleNet" angle={-90} position="insideLeft" offset={10} fill="#64748b" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  </YAxis>
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#64748b', strokeWidth: 1, strokeOpacity: 0.2 }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={40}
                    iconType="rect"
                    formatter={(val) => <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">{val === 'forecast_sales' ? 'Forecast' : val === 'actual_sales' ? 'Observed' : val}</span>}
                  />

                  <Area
                    type="monotone"
                    dataKey="interval"
                    stroke="none"
                    fill="#94a3b8"
                    fillOpacity={0.3}
                    name="Confidence Interval"
                    activeDot={false}
                    tooltipType="none"
                  />

                  <Line
                    type="monotone"
                    dataKey="upper_bound"
                    name="Upper Bound"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  <Line
                    type="monotone"
                    dataKey="lower_bound"
                    name="Lower Bound"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  <Line
                    type="monotone"
                    dataKey="actual_sales"
                    name="Observed"
                    stroke="#000000"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#000000', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#000000', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  >
                    <LabelList
                      dataKey="actual_sales"
                      position="top"
                      offset={10}
                      content={(props: any) => {
                        const { x, y, value } = props;
                        const isSignificant = value > 10000;
                        if (!isSignificant) return null;
                        return (
                          <text x={x} y={y - 10} fill="#000000" fontSize={10} fontWeight="bold" textAnchor="middle">
                            {`${(value / 1000).toFixed(1)}k`}
                          </text>
                        );
                      }}
                    />
                  </Line>

                  <Line
                    type="monotone"
                    dataKey="forecast_sales"
                    name="AI Predicted"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }}
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
        </div>
      )}

      {!loading && !error && data?.product_forecasts && resolution !== "1y" && (
        <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
            <div>
              <h2 className="text-lg font-bold text-foreground">Demand Velocity Scan</h2>
              <p className="text-sm text-muted-foreground">Products with highest projected throughput.</p>
            </div>
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
              Catalog Insights
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product Name</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Confidence</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">30d Demand Estimate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.product_forecasts.slice(0, 6).map(p => (
                  <tr key={p.product_id} className="hover:bg-muted/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-medium text-foreground text-sm">{p.product_name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${p.confidence * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{(p.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg font-bold text-sm">
                        {p.predicted_demand_30d.toFixed(0)} units
                        <TrendingUp className="w-3.5 h-3.5" />
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
