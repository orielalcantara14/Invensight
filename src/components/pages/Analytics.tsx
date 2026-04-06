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
import { Link, useNavigate } from "react-router-dom";
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Live overview of your shop's performance and inventory health.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 font-medium">
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Syncing latest data...</span>
        </div>
      )}

      {/* Main Bank-App Style Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* The Big Number: Today's Sales */}
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-indigo-200 font-medium tracking-wide uppercase text-sm">Today's Revenue</p>
              <div className="mt-2 text-6xl md:text-7xl font-extrabold tracking-tight">
                {formatCurrency(overview?.today_sales_total)}
              </div>
            </div>

            <div className="mt-10 flex items-end justify-between">
              <div>
                <p className="text-indigo-200 text-sm">Forecast Accuracy</p>
                <div className="text-2xl font-semibold flex items-center gap-2">
                  {overview?.forecast_accuracy != null ? `${overview.forecast_accuracy.toFixed(0)}%` : "—"}
                  <TrendingUp className="w-5 h-5 opacity-70" />
                </div>
              </div>

              <Link
                to="/sales"
                className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2"
              >
                View Sales <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Top Sellers Panel */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Top Sellers (30 Days)
          </h2>

          <div className="flex-1 flex flex-col justify-center space-y-4">
            {overview?.top_sellers && overview.top_sellers.length > 0 ? (
              overview.top_sellers.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-full text-2xl shadow-sm ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                    {idx === 0 ? <Crown className="w-6 h-6 text-amber-500 absolute -translate-y-4 translate-x-4 rotate-12" /> : null}
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 truncate">{item.category || "Uncategorized"}</p>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-6 text-sm">
                No sufficient sales data yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Traffic Light Stock Area */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Inventory Pulse</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Red: Out of stock */}
          <button
            onClick={() => navigate("/inventory?status=Out+of+Stock")}
            className="group relative bg-white border border-red-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-4xl font-extrabold text-gray-900 mb-1">{overview?.items_out ?? 0}</div>
              <div className="text-red-600 font-semibold mb-1">Run out today!</div>
              <div className="text-sm text-gray-500">Tap to see which items need immediate restock.</div>
            </div>
          </button>

          {/* Yellow: Running low */}
          <button
            onClick={() => navigate("/inventory?status=Low")}
            className="group relative bg-white border border-amber-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-4xl font-extrabold text-gray-900 mb-1">{overview?.items_low ?? 0}</div>
              <div className="text-amber-600 font-semibold mb-1">Running out soon.</div>
              <div className="text-sm text-gray-500">Approaching reorder limits.</div>
            </div>
          </button>

          {/* Green: Plenty of stock */}
          <button
            onClick={() => navigate("/inventory?status=Normal")}
            className="group relative bg-white border border-emerald-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-4xl font-extrabold text-gray-900 mb-1">{overview?.items_ok ?? 0}</div>
              <div className="text-emerald-600 font-semibold mb-1">Plenty of stock.</div>
              <div className="text-sm text-gray-500">Healthy inventory levels.</div>
            </div>
          </button>

        </div>
      </div>

      {/* Advanced Tools Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Intelligence Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Link to="/forecasting" className="block group">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-indigo-500 hover:shadow-lg transition-all h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition-colors">
                    <TrendingUp className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      Forecasting Report
                    </h3>
                    <p className="text-sm text-gray-500">Revenue forecasting & trends</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
              </div>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                See the upcoming rhythm of your shop. Analyzes past sales to predict sunny peaks and cloudy lulls, complete with smooth view filters.
              </p>
              <div className="text-xs font-medium text-gray-400">
                Last updated: {formatShortDate(overview?.cache_generated_at)}
              </div>
            </div>
          </Link>

          <Link to="/stock-prediction" className="block group">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-indigo-500 hover:shadow-lg transition-all h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition-colors">
                    <PackageCheck className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      Stock Prediction List
                    </h3>
                    <p className="text-sm text-gray-500">Automated purchase workflows</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
              </div>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                Don't guess what to buy. Turn AI predictions directly into actionable purchase order drafts with clear days-to-stockout countdowns.
              </p>
              <div className="text-xs font-medium text-gray-400">
                Data generated by Prophet AI models
              </div>
            </div>
          </Link>

        </div>
      </div>

    </div>
  );
}
