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
  Upload,
  Download,
  History,
  FileSpreadsheet,
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
  LabelList,
  Label,
  ReferenceLine,
} from "recharts";
import { useState, useEffect, useMemo, useRef } from "react";
import { api, API_URL, type SalesForecastResponse } from "@/services/api";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { toast } from "sonner";
import { SalesTrendInterpreter } from "@/components/forecasting/SalesTrendInterpreter";

type Resolution = "7d" | "30d" | "1y";

function formatPhp(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "N/A";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompactPhp(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "₱0";
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(0)}k`;
  return `₱${n.toFixed(0)}`;
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function Forecasting() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesForecastResponse | null>(null);
  const [resolution, setResolution] = useState<Resolution>("30d");
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Historical chart state
  const defaultHistEnd = new Date().toISOString().split('T')[0];
  const defaultHistStart = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [historicalStartDate, setHistoricalStartDate] = useState("");
  const [historicalEndDate, setHistoricalEndDate] = useState("");
  const [historicalZoomRange, setHistoricalZoomRange] = useState<{ start: number; end: number } | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setImporting(true);
    const toastId = toast.loading("Uploading and importing historical sales CSV...");
    try {
      const res = await api.importHistoricalSales(file);
      toast.success(res.message, { id: toastId });
      
      // Re-fetch forecast data after a small delay
      setLoading(true);
      setTimeout(async () => {
        try {
          const resForecast = await api.getSalesForecast(365);
          setData(resForecast);
        } catch (err: any) {
          toast.error(err.message || "Failed to reload forecast data.");
        } finally {
          setLoading(false);
        }
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to import historical sales.", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload;

      return (
        <div className="bg-card/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-border/80 min-w-[210px] space-y-2.5 animate-in fade-in zoom-in duration-150">
          <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2">
            <p className="text-xs font-black text-foreground tracking-wide font-mono">{point?.date || label}</p>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
              Forecast
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {point?.upper_bound != null && (
              <div className="flex items-center justify-between gap-6">
                <span className="font-medium text-blue-600 dark:text-blue-400">Upper Range :</span>
                <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{formatPhp(point.upper_bound)}</span>
              </div>
            )}

            {point?.lower_bound != null && (
              <div className="flex items-center justify-between gap-6">
                <span className="font-medium text-red-500 dark:text-red-400">Lower Range :</span>
                <span className="font-bold font-mono text-red-500 dark:text-red-400">{formatPhp(point.lower_bound)}</span>
              </div>
            )}

            {point?.forecast_sales != null && (
              <div className="flex items-center justify-between gap-6">
                <span className="font-medium text-purple-600 dark:text-purple-400">Predicted Revenue :</span>
                <span className="font-bold font-mono text-purple-600 dark:text-purple-400">{formatPhp(point.forecast_sales)}</span>
              </div>
            )}
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

  const dynamicForecast = useMemo(() => {
    if (!data?.series?.length) return null;
    const nowStr = new Date().toISOString().split('T')[0];
    
    // For 30d (Semiannual), we want the total expected for the CURRENT month
    if (resolution === '30d') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      return data.series
        .filter(s => {
          const d = new Date(s.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, curr) => {
          // Use actual sales if available (past/today), otherwise use forecast
          const val = curr.actual_sales !== null && curr.date <= nowStr 
            ? curr.actual_sales 
            : (curr.forecast_sales ?? 0);
          return acc + val;
        }, 0);
    }

    // For 7d and 1y, we keep the "Next X days" logic
    const futureData = data.series.filter(s => s.date > nowStr);
    let daysToSum = 7;
    if (resolution === '1y') daysToSum = 365;

    const targetData = futureData.slice(0, daysToSum);
    return targetData.reduce((acc, curr) => acc + (curr.forecast_sales ?? 0), 0);
  }, [data, resolution]);

  const rawChartData = useMemo(() => {
    if (!data?.series?.length) return [];

    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];

    let futureDays = 30;
    if (resolution === '7d') {
      futureDays = 7;
    } else if (resolution === '30d') {
      futureDays = 30;
    } else if (resolution === '1y') {
      futureDays = 365;
    }

    const endFut = new Date();
    endFut.setDate(now.getDate() + futureDays);
    const endFutStr = endFut.toISOString().split('T')[0];

    const filtered = data.series.filter(s => s.date >= nowStr && s.date <= endFutStr);

    return filtered.map((s) => {
      const forecast_sales = s.forecast_sales ?? 0;
      const lower_bound = s.lower_bound ?? 0;
      const upper_bound = s.upper_bound ?? 0;

      return {
        date: s.date,
        label: s.date.slice(5),
        forecast_sales,
        lower_bound,
        upper_bound,
        confidence_band: [lower_bound, upper_bound],
        inner_band: [
          forecast_sales - (forecast_sales - lower_bound) * 0.5,
          forecast_sales + (upper_bound - forecast_sales) * 0.5,
        ],
        trend: s.trend_component ?? 0,
        seasonal: s.seasonal_component ?? 0,
        holidays: s.holidays_component ?? 0,
        yearly: s.yearly_component ?? 0,
        weekly: s.weekly_component ?? 0,
      };
    });
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
          newStart = Math.min(newEnd - 2, newStart + step);
          newEnd = Math.max(newStart + 2, newEnd - step);
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

  const { yDomainMain, yTicksMain } = useMemo(() => {
    if (!chartData.length) return { yDomainMain: [0, 'auto'] as any, yTicksMain: undefined };
    
    // Calculate the exact maximum value among visible points on screen
    const maxs = chartData.map(d => Math.max(d.upper_bound ?? 0, d.forecast_sales ?? 0, d.lower_bound ?? 0));
    const rawMax = Math.max(100, ...maxs);

    // Provide a small 6% headroom above the peak curve
    const targetMax = rawMax * 1.06;
    const exp = Math.floor(Math.log10(targetMax));
    const base = Math.pow(10, exp);
    const fraction = targetMax / base; // 1.0 to 9.99

    let step: number;
    if (fraction <= 1.5) {
      step = 0.25 * base;      // e.g. 12k -> step 2.5k (5 ticks)
    } else if (fraction <= 2.8) {
      step = 0.5 * base;       // e.g. 25k -> step 5k (5 ticks)
    } else if (fraction <= 5.5) {
      step = 1.0 * base;       // e.g. 50k -> step 10k (5 ticks)
    } else if (fraction <= 8.0) {
      step = 1.5 * base;       // e.g. 75k -> step 15k (5 ticks)
    } else {
      step = 2.0 * base;       // e.g. 95k -> step 20k (5 ticks)
    }

    step = Math.max(50, Math.round(step));
    const maxTick = Math.ceil(targetMax / step) * step;

    const ticks: number[] = [];
    for (let t = 0; t <= maxTick + (step * 0.01); t += step) {
      ticks.push(Math.round(t));
    }

    return {
      yDomainMain: [0, maxTick] as [number, number],
      yTicksMain: ticks,
    };
  }, [chartData]);

  // AI Forecast Intelligence & Alignment Summary
  const forecastInsight = useMemo(() => {
    if (!chartData || chartData.length === 0 || !data?.series) {
      return null;
    }

    const projectedPoints = chartData.filter(d => d.forecast_sales !== null && d.forecast_sales !== undefined);
    if (projectedPoints.length === 0) return null;

    const projectedTotal = projectedPoints.reduce((sum, p) => sum + (p.forecast_sales || 0), 0);
    const projectedDays = projectedPoints.length;
    const projectedDailyAvg = projectedDays > 0 ? projectedTotal / projectedDays : 0;

    const sortedBySales = [...projectedPoints].sort((a, b) => (b.forecast_sales || 0) - (a.forecast_sales || 0));
    const peakPoint = sortedBySales[0] || null;
    const lowestPoint = sortedBySales[sortedBySales.length - 1] || null;

    const avgUpper = projectedPoints.reduce((sum, p) => sum + (p.upper_bound || 0), 0) / projectedDays;
    const avgLower = projectedPoints.reduce((sum, p) => sum + (p.lower_bound || 0), 0) / projectedDays;
    const spread = avgUpper - avgLower;

    // Check historical actuals vs predicted alignment in past points
    const pastPoints = data.series.filter(
      s => s.actual_sales !== null && s.actual_sales !== undefined && s.lower_bound !== null && s.upper_bound !== null
    );
    const recentPast = pastPoints.slice(-30);
    let alignedCount = 0;
    for (const p of recentPast) {
      if ((p.actual_sales || 0) >= (p.lower_bound || 0) && (p.actual_sales || 0) <= (p.upper_bound || 0)) {
        alignedCount++;
      }
    }
    const accuracyRate = recentPast.length > 0 ? (alignedCount / recentPast.length) * 100 : null;

    // Compare with recent 14-day actual daily average
    const recentActuals = data.series.filter(s => s.actual_sales !== null && s.actual_sales !== undefined).slice(-14);
    const recentActualAvg = recentActuals.length > 0
      ? recentActuals.reduce((sum, s) => sum + (s.actual_sales || 0), 0) / recentActuals.length
      : 0;

    let growthVsRecentPct = 0;
    if (recentActualAvg > 0) {
      growthVsRecentPct = ((projectedDailyAvg - recentActualAvg) / recentActualAvg) * 100;
    }

    let trajectoryStatus = "Steady Sales";
    if (growthVsRecentPct > 5) {
      trajectoryStatus = "Growing Demand";
    } else if (growthVsRecentPct < -5) {
      trajectoryStatus = "Slight Cooling";
    }

    return {
      projectedTotal,
      projectedDays,
      projectedDailyAvg,
      peakPoint,
      lowestPoint,
      avgUpper,
      avgLower,
      accuracyRate,
      trajectoryStatus,
      recentActualAvg,
      growthVsRecentPct,
    };
  }, [chartData, data?.series]);

  // ── Historical chart data (with 7-day rolling average on actuals to reduce noise) ──
  const historicalChartData = useMemo(() => {
    if (!data?.series?.length) return [];
    const nowStr = new Date().toISOString().split('T')[0];

    const startDate = historicalStartDate || defaultHistStart;
    const endDate = historicalEndDate || defaultHistEnd;

    const filtered = data.series
      .filter(s => s.date >= startDate && s.date <= endDate && s.date <= nowStr);

    // Apply 7-day rolling average to smooth actual sales noise
    const windowSize = 7;
    return filtered.map((s, i) => {
      const start = Math.max(0, i - (windowSize - 1));
      const chunk = filtered.slice(start, i + 1);
      const validActuals = chunk
        .map(c => c.actual_sales)
        .filter((v): v is number => v !== null && v !== undefined);
      const smoothedActual = validActuals.length > 0
        ? validActuals.reduce((a, b) => a + b, 0) / validActuals.length
        : s.actual_sales;

      return {
        date: s.date,
        label: s.date.slice(5),
        actual_sales: smoothedActual,
        raw_actual: s.actual_sales,
        forecast_sales: s.forecast_sales,
        lower_bound: s.lower_bound,
        upper_bound: s.upper_bound,
        lower_interval: [s.lower_bound, s.forecast_sales],
        upper_interval: [s.forecast_sales, s.upper_bound],
        trend: s.trend_component ?? 0,
        seasonal: s.seasonal_component ?? 0,
        holidays: s.holidays_component ?? 0,
        yearly: s.yearly_component ?? 0,
        weekly: s.weekly_component ?? 0,
      };
    });
  }, [data, historicalStartDate, historicalEndDate]);

  useEffect(() => {
    if (historicalChartData.length > 0) {
      setHistoricalZoomRange({ start: 0, end: historicalChartData.length - 1 });
    }
  }, [historicalChartData]);

  const chartRef2 = useRef<HTMLDivElement>(null);
  const isDragging2 = useRef(false);
  const startX2 = useRef(0);
  const initialRange2 = useRef({ start: 0, end: 0 });

  useEffect(() => {
    if (!historicalZoomRange || historicalChartData.length === 0) return;

    const handleWheel2 = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      const currentRange = historicalZoomRange.end - historicalZoomRange.start;
      const step = Math.max(1, Math.floor(currentRange * 0.1));

      setHistoricalZoomRange(prev => {
        if (!prev) return prev;
        let newStart = prev.start;
        let newEnd = prev.end;
        if (delta < 0) {
          newStart = Math.min(newEnd - 5, newStart + step);
          newEnd = Math.max(newStart + 5, newEnd - step);
        } else {
          newStart = Math.max(0, newStart - step);
          newEnd = Math.min(historicalChartData.length - 1, newEnd + step);
        }
        return { start: newStart, end: newEnd };
      });
    };

    const handleMouseDown2 = (e: MouseEvent) => {
      isDragging2.current = true;
      startX2.current = e.clientX;
      initialRange2.current = { ...historicalZoomRange };
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove2 = (e: MouseEvent) => {
      if (!isDragging2.current) return;
      const container = chartRef2.current;
      if (!container) return;
      const deltaX = e.clientX - startX2.current;
      const containerWidth = container.getBoundingClientRect().width;
      const rangeLength = initialRange2.current.end - initialRange2.current.start;
      const pointsPerPixel = rangeLength / containerWidth;
      const shift = Math.round(deltaX * pointsPerPixel);

      setHistoricalZoomRange(() => {
        let newStart = initialRange2.current.start - shift;
        let newEnd = initialRange2.current.end - shift;
        if (newStart < 0) {
          const adj = -newStart;
          newStart = 0;
          newEnd = Math.min(historicalChartData.length - 1, newEnd + adj);
        }
        if (newEnd >= historicalChartData.length) {
          const adj = newEnd - (historicalChartData.length - 1);
          newEnd = historicalChartData.length - 1;
          newStart = Math.max(0, newStart - adj);
        }
        return { start: newStart, end: newEnd };
      });
    };

    const handleMouseUp2 = () => {
      isDragging2.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const c2 = chartRef2.current;
    if (c2) {
      c2.addEventListener('wheel', handleWheel2, { passive: false });
      c2.addEventListener('mousedown', handleMouseDown2, { capture: true });
    }
    window.addEventListener('mousemove', handleMouseMove2);
    window.addEventListener('mouseup', handleMouseUp2);

    return () => {
      if (c2) {
        c2.removeEventListener('wheel', handleWheel2);
        c2.removeEventListener('mousedown', handleMouseDown2, { capture: true });
      }
      window.removeEventListener('mousemove', handleMouseMove2);
      window.removeEventListener('mouseup', handleMouseUp2);
      document.body.style.cursor = '';
    };
  }, [historicalZoomRange, historicalChartData.length]);

  const historicalChartDataSliced = useMemo(() => {
    if (!historicalZoomRange) return historicalChartData;
    return historicalChartData.slice(historicalZoomRange.start, historicalZoomRange.end + 1);
  }, [historicalChartData, historicalZoomRange]);

  const yDomainHistorical = useMemo(() => {
    if (!historicalChartDataSliced.length) return [0, 'auto'];
    const vals = historicalChartDataSliced.flatMap(d => [
      d.actual_sales ?? 0,
      d.forecast_sales ?? 0,
      d.lower_bound ?? 0,
      d.upper_bound ?? 0,
    ]);
    const maxVal = Math.max(1000, ...vals);
    return [0, Math.ceil(maxVal * 1.12)] as [number, number];
  }, [historicalChartDataSliced]);

  const historicalInsight = useMemo(() => {
    if (!historicalChartDataSliced || historicalChartDataSliced.length === 0) return null;
    const days = historicalChartDataSliced.length;
    
    let totalActual = 0;
    let totalPredicted = 0;
    let totalAbsError = 0;
    let inBoundsCount = 0;
    let peakActual: { date: string; amount: number } | null = null;
    let peakPredicted: { date: string; amount: number } | null = null;

    historicalChartDataSliced.forEach((d) => {
      const act = d.raw_actual ?? d.actual_sales ?? 0;
      const pred = d.forecast_sales ?? 0;
      const lower = d.lower_bound ?? 0;
      const upper = d.upper_bound ?? 0;

      totalActual += act;
      totalPredicted += pred;
      totalAbsError += Math.abs(act - pred);

      if (act >= lower * 0.95 && act <= upper * 1.05) {
        inBoundsCount++;
      }

      if (!peakActual || act > peakActual.amount) {
        peakActual = { date: d.date, amount: act };
      }
      if (!peakPredicted || pred > peakPredicted.amount) {
        peakPredicted = { date: d.date, amount: pred };
      }
    });

    const avgDailyActual = totalActual / days;
    const avgDailyPredicted = totalPredicted / days;
    const avgDailyError = totalAbsError / days;
    const inBoundsPct = (inBoundsCount / days) * 100;
    const accuracyScore = Math.max(0, Math.min(100, 100 - (totalAbsError / (totalActual || 1)) * 100));
    const variancePct = totalActual > 0 ? ((totalPredicted - totalActual) / totalActual) * 100 : 0;

    return {
      days,
      totalActual,
      totalPredicted,
      avgDailyActual,
      avgDailyPredicted,
      avgDailyError,
      inBoundsPct,
      accuracyScore,
      variancePct,
      peakActual,
      peakPredicted,
    };
  }, [historicalChartDataSliced]);

  const HistoricalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      // Format date like "07-26" or fallback to label
      let dateDisplay = label;
      if (dataPoint?.date) {
        const parts = dataPoint.date.split("-");
        if (parts.length === 3) {
          dateDisplay = `${parts[1]}-${parts[2]}`;
        }
      }

      return (
        <div className="bg-card/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-border/80 min-w-[210px] space-y-2.5 animate-in fade-in zoom-in duration-150">
          <p className="text-xs font-black text-foreground tracking-wide">{dateDisplay}</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-6">
              <span className="font-medium text-blue-600 dark:text-blue-400">Upper Range :</span>
              <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                {dataPoint?.upper_bound != null ? formatPhp(dataPoint.upper_bound) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="font-medium text-red-500 dark:text-red-400">Lower Range :</span>
              <span className="font-bold font-mono text-red-500 dark:text-red-400">
                {dataPoint?.lower_bound != null ? formatPhp(dataPoint.lower_bound) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="font-medium text-purple-600 dark:text-purple-400">Predicted Revenue :</span>
              <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                {dataPoint?.forecast_sales != null ? formatPhp(dataPoint.forecast_sales) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Actual Revenue :</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {dataPoint?.actual_sales != null ? formatPhp(dataPoint.actual_sales) : "-"}
              </span>
            </div>
            {dataPoint?.raw_actual != null && (
              <div className="flex items-center justify-between gap-6 pt-1 border-t border-border/40 text-[11px]">
                <span className="text-muted-foreground font-medium">Raw Daily :</span>
                <span className="text-muted-foreground font-bold font-mono">{formatPhp(dataPoint.raw_actual)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const setHistoricalPreset = (preset: 'all' | '7d' | '30d' | '90d') => {
    const today = new Date().toISOString().split('T')[0];
    setHistoricalEndDate(today);
    if (preset === 'all') {
      // Use earliest date from data
      const earliest = data?.series?.[0]?.date ?? today;
      setHistoricalStartDate(earliest);
    } else {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
      const d = new Date(Date.now() - daysMap[preset] * 86400000);
      setHistoricalStartDate(d.toISOString().split('T')[0]);
    }
  };

  const showCharts = rawChartData.length > 0 && !loading;
  const showHistorical = !loading && !error && (data?.series?.length ?? 0) > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Forecasting Report
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">AI-driven sales projections and trend analysis.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center bg-muted/20 border border-border/50 rounded-full p-0.5 gap-0.5">
            {(["7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResolution(r)}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${resolution === r
                  ? "bg-card text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {r === "7d" ? "7 Days" : "Month"}
              </button>
            ))}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx"
            className="hidden"
          />

          <a
            href={`${API_URL}/api/analytics/import-template`}
            download
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-semibold rounded-full shadow-sm transition-all cursor-pointer border border-transparent"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" /> Template
          </a>

          <button
            onClick={handleImportClick}
            disabled={importing}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-full shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 border border-transparent"
          >
            <Upload className="w-4 h-4 text-white" /> Import CSV
          </button>
        </div>
      </div>

      {resolution !== '1y' && (
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-2xl gap-4">
          {/* Predicted Revenue Card */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 sm:p-6 rounded-xl shadow-xs text-white border border-zinc-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 p-10 opacity-[0.03] group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
              <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
              <span className="text-zinc-400 font-bold tracking-wider text-[10px] uppercase mb-3 block">
                Predicted Revenue ({resolution === '7d' ? '7D' : resolution === '1y' ? '1Y' : '30D'})
              </span>
              <div className="text-3xl sm:text-4xl font-black mb-2 tracking-tight font-mono text-zinc-50">
                {loading ? "…" : formatPhp(dynamicForecast ?? data?.next_period_forecast ?? null)}
              </div>
              <p className="text-zinc-500 text-xs font-medium max-w-[200px] leading-relaxed">Aggregated AI projection for the next cycle.</p>
            </div>
          </div>

          {/* Target Period Card */}
          <div className="bg-card p-4 sm:p-6 rounded-xl shadow-xs border border-border/50 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 p-12 text-zinc-500/[0.02] group-hover:scale-110 transition-transform duration-700 rotate-12">
              <Calendar size={130} />
            </div>
            <div className="relative z-10">
              <span className="text-muted-foreground/60 font-bold tracking-wider text-[10px] uppercase mb-3 block">Target Forecast Period</span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mb-3 tracking-tight">
                {resolution === '7d' ? 'Next 7 Days' : resolution === '1y' ? 'Next 12 Months' : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Active Projection Window
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-zinc-500 animate-spin" />
            <div className="absolute inset-0 bg-zinc-600/20 blur-xl rounded-full" />
          </div>
          <span className="font-bold text-muted-foreground/70 animate-pulse tracking-widest uppercase text-xs">Synthesizing Prophet Model…</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-red-800 text-sm font-bold flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-xl"><TrendingDown className="w-6 h-6" /></div>
          {error}
        </div>
      )}

      {!loading && !error && showCharts && (
        <div className="space-y-8">
          <div
            ref={chartRef1}
            className="bg-card p-6 rounded-xl shadow-xs border border-border/55 relative group cursor-grab active:cursor-grabbing"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">Sales Forecasting</h2>
                <p className="text-xs text-muted-foreground">Projected revenue trend with upper and lower confidence range</p>
              </div>
            </div>

            <div className="h-[460px] w-full cursor-grab active:cursor-grabbing">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 45, bottom: 20 }}>
                  <defs>
                    <linearGradient id="noaaBandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.16} />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.06} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.16} />
                    </linearGradient>
                    <linearGradient id="noaaInnerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.12} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" strokeOpacity={0.15} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    tickLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    minTickGap={30}
                    interval="preserveStartEnd"
                    dy={10}
                  >
                    <Label value="Date" offset={-6} position="insideBottom" fill="#64748b" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  </XAxis>
                  <YAxis
                    domain={yDomainMain}
                    ticks={yTicksMain}
                    allowDecimals={false}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v}`}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    tickLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    <Label value="Revenue" angle={-90} position="insideLeft" offset={10} fill="#64748b" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  </YAxis>

                  {/* Horizontal Baseline Reference */}
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.5} />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#64748b', strokeWidth: 1, strokeOpacity: 0.2 }}
                  />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={40}
                    iconType="line"
                    payload={[
                      { value: 'forecast_sales', type: 'line', id: 'forecast_sales', color: '#8b5cf6' },
                      { value: 'upper_bound', type: 'line', id: 'upper_bound', color: '#3b82f6' },
                      { value: 'lower_bound', type: 'line', id: 'lower_bound', color: '#ef4444' },
                    ]}
                    formatter={(val) => {
                      const labels: any = {
                        forecast_sales: 'Predicted Revenue',
                        upper_bound: 'Upper Range',
                        lower_bound: 'Lower Range'
                      };
                      return <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">{labels[val] || val}</span>;
                    }}
                  />

                  {/* Shaded Confidence Ribbon (Envelope between Lower & Upper Bound) */}
                  <Area
                    type="monotone"
                    dataKey="confidence_band"
                    stroke="none"
                    fill="url(#noaaBandGrad)"
                    name="Confidence Band"
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  <Area
                    type="monotone"
                    dataKey="inner_band"
                    stroke="none"
                    fill="url(#noaaInnerGrad)"
                    name="Inner Confidence Band"
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  {/* Forecast Model Line (Solid Violet) */}
                  <Line
                    type="monotone"
                    dataKey="forecast_sales"
                    name="Predicted Revenue"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#8b5cf6', stroke: 'var(--card)', strokeWidth: 2 }}
                    legendType="none"
                  />

                  {/* Upper Bound (Dashed Blue) & Lower Bound (Dashed Red) Lines */}
                  <Line
                    type="monotone"
                    dataKey="upper_bound"
                    name="Upper Range"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                  />

                  <Line
                    type="monotone"
                    dataKey="lower_bound"
                    name="Lower Range"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Forecast Summary Card */}
            {forecastInsight && (
              <div className="mt-6 pt-5 border-t border-border/50">
                <div className="p-6 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                      FORECAST SUMMARY
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                      {resolution === '7d' ? 'Next 7 Days' : resolution === '1y' ? 'Next 12 Months' : 'Next 30 Days'}
                    </p>
                  </div>

                  {/* Simple Plain-English Narrative */}
                  <p className="text-xs leading-relaxed text-foreground font-medium">
                    {resolution === '7d' ? (
                      <>
                        Your store is expected to make around <strong>{formatPhp(forecastInsight.projectedTotal)}</strong> over the next 7 days (about <strong>{formatPhp(forecastInsight.projectedDailyAvg)}/day</strong>). Highest sales are expected on <strong>{forecastInsight.peakPoint?.date ? formatDateDisplay(forecastInsight.peakPoint.date) : "the weekend"} ({formatPhp(forecastInsight.peakPoint?.forecast_sales)})</strong>.
                      </>
                    ) : resolution === '30d' ? (
                      <>
                        Your store is expected to make around <strong>{formatPhp(forecastInsight.projectedTotal)}</strong> over the next 30 days (about <strong>{formatPhp(forecastInsight.projectedDailyAvg)}/day</strong>). Highest sales are expected on <strong>{forecastInsight.peakPoint?.date ? formatDateDisplay(forecastInsight.peakPoint.date) : "N/A"} ({formatPhp(forecastInsight.peakPoint?.forecast_sales)})</strong>, with daily earnings typically between <strong>{formatPhp(forecastInsight.avgLower)}</strong> and <strong>{formatPhp(forecastInsight.avgUpper)}</strong>.
                      </>
                    ) : (
                      <>
                        Your store is projected to reach around <strong>{formatPhp(forecastInsight.projectedTotal)}</strong> over the next 12 months (about <strong>{formatPhp(forecastInsight.projectedDailyAvg)}/day</strong>). Highest demand is expected on <strong>{forecastInsight.peakPoint?.date ? formatDateDisplay(forecastInsight.peakPoint.date) : "N/A"} ({formatPhp(forecastInsight.peakPoint?.forecast_sales)})</strong>.
                      </>
                    )}
                  </p>

                  {/* 3 Simple Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs text-xs space-y-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                        EXPECTED DAILY SALES
                      </span>
                      <div className="font-mono font-black text-foreground text-base">
                        {formatPhp(forecastInsight.projectedDailyAvg)} / day
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {forecastInsight.growthVsRecentPct >= 0 ? "+" : ""}{forecastInsight.growthVsRecentPct.toFixed(1)}% vs recent average
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs text-xs space-y-1">
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                        HIGHEST EXPECTED DAY
                      </span>
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                        {formatPhp(forecastInsight.peakPoint?.forecast_sales || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium truncate">
                        {forecastInsight.peakPoint?.date ? formatDateDisplay(forecastInsight.peakPoint.date) : "N/A"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs text-xs space-y-1">
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                        EXPECTED DAILY RANGE
                      </span>
                      <div className="font-mono font-black text-foreground text-base">
                        {formatPhp(forecastInsight.avgLower)} – {formatPhp(forecastInsight.avgUpper)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium truncate">
                        Normal low to high range
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sales Trend & Date Range Comparison Interpreter ── */}
      {!loading && !error && data?.series && data.series.length > 0 && (
        <SalesTrendInterpreter series={data.series} />
      )}

      {/* ── Historical Forecast Fit Chart ── */}
      {showHistorical && (
        <div
          ref={chartRef2}
          className="bg-card p-6 rounded-xl shadow-xs border border-border/55 relative group cursor-grab active:cursor-grabbing"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/40">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">Forecast vs Actual Performance</h2>
                <p className="text-xs text-muted-foreground">How accurately the AI predicted your past revenue</p>
              </div>
            </div>

            {/* Date Range Picker */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <DateRangePicker
                dateFrom={historicalStartDate}
                dateTo={historicalEndDate}
                onDateChange={(from, to) => {
                  setHistoricalStartDate(from);
                  setHistoricalEndDate(to);
                }}
                placeholder="Select date range (30D default)"
              />
              <div className="flex items-center bg-muted/20 border border-border/50 rounded-lg p-0.5 gap-0.5">
                {(['7d', '30d', '90d', 'all'] as const).map((p) => {
                  const labels: Record<string, string> = { '7d': '7D', '30d': '30D', '90d': '90D', 'all': 'ALL' };
                  return (
                    <button
                      key={p}
                      onClick={() => setHistoricalPreset(p)}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground hover:bg-card transition-all duration-200"
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {historicalChartDataSliced.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Calendar className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-semibold">No data in selected range</p>
              <p className="text-xs mt-1">Try expanding the date range or selecting a different period.</p>
            </div>
          ) : (
            <div className="h-[450px] w-full cursor-grab active:cursor-grabbing">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historicalChartDataSliced} margin={{ top: 20, right: 30, left: 45, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorHistFit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                    <Label value="Date" offset={-5} position="insideBottom" fill="#64748b" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  </XAxis>
                  <YAxis
                    domain={yDomainHistorical}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  >
                    <Label value="Revenue" angle={-90} position="insideLeft" offset={10} fill="#64748b" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  </YAxis>
                  <Tooltip
                    content={<HistoricalTooltip />}
                    cursor={{ stroke: '#64748b', strokeWidth: 1, strokeOpacity: 0.2 }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={40}
                    iconType="line"
                    payload={[
                      { value: 'actual_sales', type: 'line', id: 'actual_sales', color: '#10b981' },
                      { value: 'forecast_sales', type: 'line', id: 'forecast_sales', color: '#8b5cf6' },
                      { value: 'upper_bound', type: 'line', id: 'upper_bound', color: '#3b82f6' },
                      { value: 'lower_bound', type: 'line', id: 'lower_bound', color: '#ef4444' },
                    ]}
                    formatter={(val) => {
                      const labels: any = {
                        actual_sales: 'Actual Revenue',
                        forecast_sales: 'Predicted Revenue',
                        upper_bound: 'Upper Range',
                        lower_bound: 'Lower Range'
                      };
                      return <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">{labels[val] || val}</span>;
                    }}
                  />

                  {/* Soft Upper (Blue) & Lower (Red) Confidence Fills */}
                  <Area
                    type="monotone"
                    dataKey="upper_interval"
                    stroke="none"
                    fill="#3b82f6"
                    fillOpacity={0.08}
                    name="Upper Confidence"
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  <Area
                    type="monotone"
                    dataKey="lower_interval"
                    stroke="none"
                    fill="#ef4444"
                    fillOpacity={0.08}
                    name="Lower Confidence"
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  {/* Model Fit Subtle Glow */}
                  <Area
                    type="monotone"
                    dataKey="forecast_sales"
                    stroke="none"
                    fill="url(#colorHistFit)"
                    name="Fit Glow"
                    activeDot={false}
                    tooltipType="none"
                    legendType="none"
                  />

                  {/* Upper Bound (Blue) & Lower Bound (Red) Lines */}
                  <Line
                    type="monotone"
                    dataKey="upper_bound"
                    name="Upper Range"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                  />

                  <Line
                    type="monotone"
                    dataKey="lower_bound"
                    name="Lower Range"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                  />

                  {/* Predicted Model Line */}
                  <Line
                    type="monotone"
                    dataKey="forecast_sales"
                    name="Predicted Model"
                    stroke="#8b5cf6"
                    strokeWidth={2.2}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 5, fill: '#8b5cf6', stroke: 'var(--card)', strokeWidth: 2 }}
                  />

                  {/* Actual Revenue Line */}
                  <Line
                    type="monotone"
                    dataKey="actual_sales"
                    name="Actual Revenue"
                    stroke="#10b981"
                    strokeWidth={2.8}
                    dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: 'var(--card)', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Historical Performance Summary Card */}
          {historicalInsight && (
            <div className="mt-6 pt-5 border-t border-border/50">
              <div className="p-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                    HISTORICAL PERFORMANCE SUMMARY
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                    Past {historicalInsight.days} Days Evaluation
                  </p>
                </div>

                {/* Simple Plain-English Narrative */}
                <p className="text-xs leading-relaxed text-foreground font-medium">
                  Over the selected {historicalInsight.days} days, your store recorded <strong>{formatPhp(historicalInsight.totalActual)}</strong> in actual revenue (about <strong>{formatPhp(historicalInsight.avgDailyActual)}/day</strong>), compared to <strong>{formatPhp(historicalInsight.totalPredicted)}</strong> projected by the AI model. Highest sales were recorded on <strong>{historicalInsight.peakActual?.date ? formatDateDisplay(historicalInsight.peakActual.date) : "N/A"} ({formatPhp(historicalInsight.peakActual?.amount || 0)})</strong>.
                </p>

                {/* 3 Simple Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs text-xs space-y-1">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      ACTUAL REVENUE RECORDED
                    </span>
                    <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {formatPhp(historicalInsight.totalActual)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      Avg {formatPhp(historicalInsight.avgDailyActual)} / day
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs text-xs space-y-1">
                    <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                      PREDICTED REVENUE
                    </span>
                    <div className="font-mono font-black text-purple-600 dark:text-purple-400 text-base">
                      {formatPhp(historicalInsight.totalPredicted)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      Variance: {historicalInsight.variancePct >= 0 ? "+" : ""}{historicalInsight.variancePct.toFixed(1)}% vs actual
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs text-xs space-y-1">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                      HIGHEST SALES RECORDED
                    </span>
                    <div className="font-mono font-black text-foreground text-base">
                      {formatPhp(historicalInsight.peakActual?.amount || 0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      {historicalInsight.peakActual?.date ? formatDateDisplay(historicalInsight.peakActual.date) : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !error && data?.product_forecasts && resolution !== "1y" && (
        <div className="bg-card rounded-lg shadow-xs border border-border/55 overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
            <div>
              <h2 className="text-sm font-bold text-foreground">Demand Velocity Scan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Products with highest projected throughput.</p>
            </div>
            <div className="px-2.5 py-0.5 border border-border/40 text-muted-foreground rounded text-[9px] font-bold uppercase tracking-wider">
              Catalog Insights
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b border-border/50">
                  <th className="py-3 px-6 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">Product Name</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider text-center">Confidence</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider text-right">30d Demand Estimate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card">
                {data.product_forecasts.slice(0, 6).map(p => (
                  <tr key={p.product_id} className="hover:bg-muted/10 dark:hover:bg-zinc-900/10 transition-colors group">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-foreground text-xs">{p.product_name}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1 bg-muted dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-600 dark:bg-zinc-400" style={{ width: `${p.confidence * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground font-mono">{(p.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-muted border border-border/40 text-foreground rounded font-bold text-xs font-mono">
                        {p.predicted_demand_30d.toFixed(0)}
                        <span className="text-[9px] font-medium text-muted-foreground uppercase">units</span>
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
