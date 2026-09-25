import {
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Crown,
  CheckCircle,
  XCircle,
  PackageCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { api, type AnalyticsOverview } from "@/services/api";

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatCurrency(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function getCategoryIcon(cat: string | undefined) {
  if (!cat) return "📦";
  const c = cat.toLowerCase();
  if (c.includes("plug")) return "🔌";
  if (c.includes("tire") || c.includes("tyre")) return "🛞";
  if (c.includes("oil") || c.includes("lubricant")) return "🛢️";
  if (c.includes("battery")) return "🔋";
  if (c.includes("brake")) return "🛑";
  if (c.includes("chain") || c.includes("sprocket")) return "⛓️";
  if (c.includes("helmet") || c.includes("gear")) return "🪖";
  return "📦";
}

export function Analytics() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getAnalyticsOverview();
        if (!cancelled) setOverview(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Live overview of your shop's performance and inventory health.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 font-medium">
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          <span>Syncing latest data...</span>
        </div>
      )}

      {/* Main Bank-App Style Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* The Big Number: Today's Sales */}
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-5 sm:p-8 text-white border border-zinc-800/80 shadow-md">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-[0.02] rounded-full blur-2xl animate-pulse"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-zinc-400 font-bold tracking-wider uppercase text-xs">Today's Revenue</p>
              <div className="mt-2 text-3xl sm:text-5xl md:text-6xl font-black tracking-tight font-mono text-zinc-50">
                {formatCurrency(overview?.today_sales_total)}
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between">
              <div>
                <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Forecast Accuracy</p>
                <div className="text-xl font-bold flex items-center gap-2 text-zinc-300 font-mono mt-0.5">
                  {overview?.forecast_accuracy != null ? `${overview.forecast_accuracy.toFixed(0)}%` : "—"}
                  <TrendingUp className="w-4 h-4 text-emerald-500 opacity-80" />
                </div>
              </div>

              <Link
                to="/sales"
                className="bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 transition-colors px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                View Sales <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Top Sellers Panel */}
        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-xs border border-border/50 flex flex-col">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            Top Products (30 Days)
          </h2>

          <div className="flex-1 flex flex-col justify-center space-y-3">
            {overview?.top_sellers && overview.top_sellers.length > 0 ? (
              overview.top_sellers.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl shadow-xs border border-border/30 bg-muted/40`}>
                    {idx === 0 ? <Crown className="w-5 h-5 text-amber-500 absolute -translate-y-3.5 translate-x-3.5 rotate-12" /> : null}
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-medium mt-0.5">{item.category || "Uncategorized"}</p>
                  </div>
                  <div className="text-xs font-bold text-foreground font-mono">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground/75 py-6 text-xs">
                No sufficient sales data yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Traffic Light Stock Area */}
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Inventory Pulse</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">

          {/* Red: Out of stock */}
          <button
            onClick={() => navigate("/inventory?status=Out+of+Stock")}
            className="group relative bg-card border border-border/50 p-4 sm:p-6 rounded-xl shadow-xs hover:border-red-400 dark:hover:border-red-900/60 transition-all text-left overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Out of Stock</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground mb-1 font-mono">{overview?.items_out ?? 0}</div>
              <div className="text-red-650 dark:text-red-400 text-xs font-semibold mb-1">Run out today!</div>
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">Items requiring immediate restock.</div>
            </div>
          </button>

          {/* Yellow: Running low */}
          <button
            onClick={() => navigate("/inventory?status=Low")}
            className="group relative bg-card border border-border/50 p-4 sm:p-6 rounded-xl shadow-xs hover:border-amber-400 dark:hover:border-amber-900/60 transition-all text-left overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground mb-1 font-mono">{overview?.items_low ?? 0}</div>
              <div className="text-amber-650 dark:text-amber-455 text-xs font-semibold mb-1">Running out soon.</div>
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">Approaching reorder limits.</div>
            </div>
          </button>

          {/* Green: Plenty of stock */}
          <button
            onClick={() => navigate("/inventory?status=Normal")}
            className="group relative bg-card border border-border/50 p-4 sm:p-6 rounded-xl shadow-xs hover:border-emerald-400 dark:hover:border-emerald-900/60 transition-all text-left overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Healthy Stock</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground mb-1 font-mono">{overview?.items_ok ?? 0}</div>
              <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">Plenty of stock.</div>
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">Inventory levels are healthy.</div>
            </div>
          </button>

        </div>
      </div>

      {/* Advanced Tools Section */}
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Intelligence Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

          <Link to="/forecasting" className="block group">
            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-xs border border-border/50 hover:border-zinc-400 transition-all h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700/80 transition-colors border border-border/30">
                    <TrendingUp className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-zinc-950 dark:group-hover:text-zinc-50 transition-colors">
                      Forecasting Report
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Revenue forecasting & trends</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
              </div>
              <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
                See the upcoming rhythm of your shop. Analyzes past sales to predict sunny peaks and cloudy lulls, complete with smooth view filters.
              </p>
              <div className="text-[10px] font-semibold text-muted-foreground/60 font-mono">
                Last updated: {formatShortDate(overview?.cache_generated_at)}
              </div>
            </div>
          </Link>

          <Link to="/stock-prediction" className="block group">
            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-xs border border-border/50 hover:border-zinc-400 transition-all h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700/80 transition-colors border border-border/30">
                    <PackageCheck className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-zinc-950 dark:group-hover:text-zinc-50 transition-colors">
                      Stock Prediction List
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Automated purchase workflows</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
              </div>
              <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
                Don't guess what to buy. Turn AI predictions directly into actionable purchase order drafts with clear days-to-stockout countdowns.
              </p>
              <div className="text-[10px] font-semibold text-muted-foreground/60 font-mono">
                Data generated by Prophet AI models
              </div>
            </div>
          </Link>

        </div>
      </div>

    </div>
  );
}
