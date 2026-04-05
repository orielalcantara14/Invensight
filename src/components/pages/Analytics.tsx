import { TrendingUp, AlertTriangle, BarChart3, ArrowUpRight, Loader2 } from "lucide-react";
import { Link } from "react-router";
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

export function Analytics() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const acc =
    overview?.forecast_accuracy != null ? `${overview.forecast_accuracy.toFixed(0)}%` : loading ? "…" : "—";
  const lowTotal =
    overview != null ? overview.low_stock_count + overview.critical_stock_count : null;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">
          Sales and stock projections from your inventory and recent demand
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/forecasting" className="block group">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 group-hover:text-blue-600 transition-colors">Forecast accuracy</span>
              <TrendingUp className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{acc}</div>
            <div className="text-sm text-gray-500 mt-1">
              {overview?.forecast_accuracy != null
                ? "Compared to days with recorded sales"
                : "Add sales history to populate this metric"}
            </div>
          </div>
        </Link>

        <Link to="/inventory?status=Low" className="block group">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-orange-500 transition-all hover:shadow-lg h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 group-hover:text-orange-600 transition-colors">Low stock alerts</span>
              <AlertTriangle className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
              {loading ? "…" : lowTotal != null ? lowTotal : "—"}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {overview && overview.critical_stock_count > 0
                ? `${overview.critical_stock_count} critical, ${overview.low_stock_count} low`
                : "At or below reorder level"}
            </div>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Forecast tools</span>
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">2</div>
          <div className="text-sm text-gray-500 mt-1">Sales outlook and stock planning</div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {overview?.served_from_cache && overview.cache_generated_at
          ? `Cache snapshot: ${formatShortDate(overview.cache_generated_at)}`
          : overview?.cache_generated_at
            ? `Last updated: ${formatShortDate(overview.cache_generated_at)}`
            : "Scheduled refresh updates projections and accuracy."}
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 mb-6">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading overview…</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/forecasting" className="block group">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Sales forecast
                  </h3>
                  <p className="text-sm text-gray-500">Revenue trend and ranges</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-gray-600 mb-4">
              Daily revenue projection with confidence bands and trend detail when data allows.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{formatShortDate(overview?.cache_generated_at)}</span>
            </div>
          </div>
        </Link>

        <Link to="/stock-prediction" className="block group">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-orange-500 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    Stock prediction
                  </h3>
                  <p className="text-sm text-gray-500">30-day velocity · horizon table</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
            </div>
            <p className="text-gray-600 mb-4">
              Demand from recent sales, projected cover and recommended orders by SKU.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{formatShortDate(overview?.cache_generated_at)}</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
