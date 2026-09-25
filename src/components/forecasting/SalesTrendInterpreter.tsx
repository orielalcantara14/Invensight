import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

interface SeriesPoint {
  date: string;
  actual_sales: number | null;
  forecast_sales?: number | null;
}

interface SalesTrendInterpreterProps {
  series: SeriesPoint[];
}

interface MonthMetric {
  key: string;
  monthName: string;
  shortMonth: string;
  monthOnly: string;
  totalSales: number;
  recordedDays: number;
  totalDaysInMonth: number;
  isPartial: boolean;
  dailyAverage: number;
  peakDay: { date: string; sales: number } | null;
  lowestDay: { date: string; sales: number } | null;
  prevMonthName: string | null;
  diffSales: number | null;
  changePct: number | null;
  isBest: boolean;
  isLowest: boolean;
}

function formatPhp(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
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

export function SalesTrendInterpreter({ series }: SalesTrendInterpreterProps) {
  // Filter only actual past sales
  const actualSeries = useMemo(() => {
    return series
      .filter((s) => s.actual_sales !== null && s.actual_sales !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [series]);

  const minDate = actualSeries[0]?.date || "2024-01-01";
  const maxDate = actualSeries[actualSeries.length - 1]?.date || new Date().toISOString().split("T")[0];

  // Default range: empty (shows current/latest month by default)
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Group transactions by calendar month & compute month-to-month metrics
  const monthlyData = useMemo(() => {
    let pointsInRange = actualSeries;
    if (rangeStart && rangeEnd) {
      pointsInRange = actualSeries.filter(
        (s) => s.date >= rangeStart && s.date <= rangeEnd
      );
    } else if (rangeStart) {
      pointsInRange = actualSeries.filter((s) => s.date >= rangeStart);
    } else if (rangeEnd) {
      pointsInRange = actualSeries.filter((s) => s.date <= rangeEnd);
    } else {
      // Default when datepicker is empty: only show current/latest calendar month
      const latestDate = actualSeries[actualSeries.length - 1]?.date || new Date().toISOString().split("T")[0];
      const currentYM = latestDate.substring(0, 7);
      pointsInRange = actualSeries.filter((s) => s.date.startsWith(currentYM));
    }

    if (pointsInRange.length === 0) {
      return {
        months: [] as MonthMetric[],
        totalRevenue: 0,
        avgMonthlySales: 0,
        bestMonth: null as MonthMetric | null,
        lowestMonth: null as MonthMetric | null,
        latestGrowthPct: null as number | null,
        latestPrevMonthName: null as string | null,
        totalMonths: 0,
        totalDays: 0,
      };
    }

    // Group points by "YYYY-MM"
    const groups: { [key: string]: SeriesPoint[] } = {};
    for (const pt of pointsInRange) {
      const ym = pt.date.substring(0, 7);
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(pt);
    }

    const sortedKeys = Object.keys(groups).sort();

    // 1st pass: build monthly totals
    const rawMonths = sortedKeys.map((ym) => {
      const pts = groups[ym];
      const [yearStr, monthStr] = ym.split("-");
      const year = parseInt(yearStr, 10);
      const monthIdx = parseInt(monthStr, 10) - 1;

      const dateObj = new Date(year, monthIdx, 1);
      const monthName = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const shortMonth = dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const monthOnly = dateObj.toLocaleDateString("en-US", { month: "long" });

      const totalDaysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const totalSales = pts.reduce((sum, p) => sum + (p.actual_sales || 0), 0);
      const recordedDays = pts.length;
      const dailyAverage = recordedDays > 0 ? totalSales / recordedDays : 0;

      // Check if partial month
      const isPartial =
        recordedDays < totalDaysInMonth ||
        pts[0]?.date !== `${ym}-01` ||
        pts[pts.length - 1]?.date !== `${ym}-${String(totalDaysInMonth).padStart(2, "0")}`;

      const sortedPts = [...pts].sort((a, b) => (b.actual_sales || 0) - (a.actual_sales || 0));
      const peakDay = sortedPts[0] ? { date: sortedPts[0].date, sales: sortedPts[0].actual_sales || 0 } : null;
      const lowestDay = sortedPts[sortedPts.length - 1]
        ? { date: sortedPts[sortedPts.length - 1].date, sales: sortedPts[sortedPts.length - 1].actual_sales || 0 }
        : null;

      return {
        key: ym,
        monthName,
        shortMonth,
        monthOnly,
        totalSales,
        recordedDays,
        totalDaysInMonth,
        isPartial,
        dailyAverage,
        peakDay,
        lowestDay,
      };
    });

    const maxSales = Math.max(...rawMonths.map((m) => m.totalSales));
    const minSales = Math.min(...rawMonths.map((m) => m.totalSales));

    // 2nd pass: Calculate month-to-month change percentage using previous month as denominator
    const months: MonthMetric[] = rawMonths.map((curr, idx) => {
      let changePct: number | null = null;
      let diffSales: number | null = null;
      let prevMonthName: string | null = null;

      if (idx > 0) {
        const prev = rawMonths[idx - 1];
        prevMonthName = prev.monthOnly;
        diffSales = curr.totalSales - prev.totalSales;
        if (prev.totalSales > 0) {
          changePct = ((curr.totalSales - prev.totalSales) / prev.totalSales) * 100;
        } else if (curr.totalSales > 0) {
          changePct = 100;
        } else {
          changePct = 0;
        }
      } else {
        // For the earliest or single month displayed, check if historical data has the prior month
        const [yStr, mStr] = curr.key.split("-");
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        const priorDate = new Date(y, m - 2, 1);
        const priorYM = `${priorDate.getFullYear()}-${String(priorDate.getMonth() + 1).padStart(2, "0")}`;
        const priorPts = actualSeries.filter((s) => s.date.startsWith(priorYM));
        if (priorPts.length > 0) {
          const priorTotal = priorPts.reduce((sum, p) => sum + (p.actual_sales || 0), 0);
          prevMonthName = priorDate.toLocaleDateString("en-US", { month: "long" });
          diffSales = curr.totalSales - priorTotal;
          if (priorTotal > 0) {
            changePct = ((curr.totalSales - priorTotal) / priorTotal) * 100;
          }
        }
      }

      return {
        ...curr,
        prevMonthName,
        diffSales,
        changePct,
        isBest: rawMonths.length > 1 && curr.totalSales === maxSales,
        isLowest: rawMonths.length > 1 && curr.totalSales === minSales,
      };
    });

    const totalRevenue = months.reduce((sum, m) => sum + m.totalSales, 0);
    const avgMonthlySales = months.length > 0 ? totalRevenue / months.length : 0;
    const bestMonth = months.reduce(
      (best, m) => (!best || m.totalSales > best.totalSales ? m : best),
      months[0] || null
    );
    const lowestMonth = months.reduce(
      (worst, m) => (!worst || m.totalSales < worst.totalSales ? m : worst),
      months[0] || null
    );

    const latestMonth = months[months.length - 1];
    const latestGrowthPct = latestMonth?.changePct ?? null;
    const latestPrevMonthName = latestMonth?.prevMonthName ?? null;

    return {
      months,
      totalRevenue,
      avgMonthlySales,
      bestMonth,
      lowestMonth,
      latestGrowthPct,
      latestPrevMonthName,
      totalMonths: months.length,
      totalDays: pointsInRange.length,
    };
  }, [actualSeries, rangeStart, rangeEnd]);

  return (
    <div className="bg-card rounded-2xl shadow-xs border border-border/60 overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-5 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Monthly Sales Performance & Trend Analysis
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Month-over-month revenue comparison and calendar month sales velocity.
            </p>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <DateRangePicker
            dateFrom={rangeStart}
            dateTo={rangeEnd}
            onDateChange={(from, to) => {
              setRangeStart(from || "");
              setRangeEnd(to || "");
            }}
            placeholder="Select date range"
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Revenue */}
          <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Total Revenue
            </span>
            <div className="text-xl font-bold font-mono text-foreground truncate">
              {formatPhp(monthlyData.totalRevenue)}
            </div>
            <div className="text-xs text-muted-foreground pt-1.5 flex items-center justify-between border-t border-border/40">
              <span>Timeframe:</span>
              <span className="font-semibold text-foreground font-mono">
                {monthlyData.totalMonths} {monthlyData.totalMonths === 1 ? "month" : "months"}
              </span>
            </div>
          </div>

          {/* Card 2: Average Monthly Sales */}
          <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Average Monthly Sales
            </span>
            <div className="text-xl font-bold font-mono text-foreground truncate">
              {formatPhp(monthlyData.avgMonthlySales)}
            </div>
            <div className="text-xs text-muted-foreground pt-1.5 flex items-center justify-between border-t border-border/40">
              <span>Per Month Mean:</span>
              <span className="font-semibold text-foreground font-mono">
                {monthlyData.totalDays} {monthlyData.totalDays === 1 ? "day" : "days"}
              </span>
            </div>
          </div>

          {/* Card 3: Best Sales Month */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Best Sales Month
              </span>
              <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
              {formatPhp(monthlyData.bestMonth?.totalSales || 0)}
            </div>
            <div className="text-xs text-muted-foreground pt-1.5 flex items-center justify-between border-t border-border/40">
              <span>Month:</span>
              <span className="font-semibold text-foreground font-mono truncate">
                {monthlyData.bestMonth?.shortMonth || "N/A"}
              </span>
            </div>
          </div>

          {/* Card 4: Lowest Sales Month */}
          <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Lowest Sales Month
            </span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 truncate">
              {formatPhp(monthlyData.lowestMonth?.totalSales || 0)}
            </div>
            <div className="text-xs text-muted-foreground pt-1.5 flex items-center justify-between border-t border-border/40">
              <span>Month:</span>
              <span className="font-semibold text-foreground font-mono truncate">
                {monthlyData.lowestMonth?.shortMonth || "N/A"}
              </span>
            </div>
          </div>

          {/* Card 5: Latest Month Growth */}
          <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Current Month Growth
            </span>
            <div className="text-xl font-bold font-mono truncate flex items-center gap-1">
              {monthlyData.latestGrowthPct !== null ? (
                monthlyData.latestGrowthPct >= 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-0.5 inline" />
                    +{monthlyData.latestGrowthPct.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center">
                    <TrendingDown className="w-4 h-4 mr-0.5 inline" />
                    {monthlyData.latestGrowthPct.toFixed(1)}%
                  </span>
                )
              ) : (
                <span className="text-muted-foreground text-sm font-semibold">Baseline Month</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground pt-1.5 flex items-center justify-between border-t border-border/40">
              <span>Reference:</span>
              <span className="font-semibold text-foreground font-mono truncate">
                {monthlyData.latestPrevMonthName ? `vs ${monthlyData.latestPrevMonthName}` : "—"}
              </span>
            </div>
          </div>
        </div>



        {/* Monthly Sales Performance Table */}
        <div className="rounded-xl border border-border/70 overflow-hidden shadow-xs">
          <div className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Monthly Sales Performance
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Exact monthly totals and percentage change calculated with the previous month as baseline.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/40">
              {monthlyData.months.length} {monthlyData.months.length === 1 ? "Month" : "Months"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border/50">
                <tr>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Recorded Days</th>
                  <th className="py-3 px-4">Daily Average</th>
                  <th className="py-3 px-4 font-bold text-foreground">Total Sales</th>
                  <th className="py-3 px-4">Change vs Previous Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card">
                {monthlyData.months.map((m, idx) => (
                  <tr key={m.key} className="hover:bg-muted/30 transition-colors">
                    {/* Month Name */}
                    <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                      <span>{m.monthName}</span>
                      {m.isPartial && (
                        <span className="text-[9px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                          Partial ({m.recordedDays}d)
                        </span>
                      )}
                      {m.isBest && (
                        <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          ★ Best Month
                        </span>
                      )}
                    </td>

                    {/* Recorded Days */}
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {m.recordedDays} / {m.totalDaysInMonth} days
                    </td>

                    {/* Daily Average */}
                    <td className="py-3 px-4 text-foreground font-mono">
                      {formatPhp(m.dailyAverage)}/day
                    </td>

                    {/* Total Sales */}
                    <td className="py-3 px-4 font-bold font-mono text-foreground text-sm">
                      {formatPhp(m.totalSales)}
                    </td>

                    {/* Change vs Previous Month */}
                    <td className="py-3 px-4 font-mono font-semibold">
                      {m.changePct === null ? (
                        <span className="text-muted-foreground font-normal">—</span>
                      ) : m.changePct > 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          +{m.changePct.toFixed(1)}% vs {m.prevMonthName}
                        </span>
                      ) : m.changePct < 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {m.changePct.toFixed(1)}% vs {m.prevMonthName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/40">
                          <Minus className="w-3 h-3" />
                          0.0% vs {m.prevMonthName}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
}
