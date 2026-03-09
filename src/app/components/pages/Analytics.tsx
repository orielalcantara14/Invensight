import { TrendingUp, AlertTriangle, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "react-router";

export function Analytics() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="text-gray-600 mt-1">Comprehensive analytics and predictive insights for inventory management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Forecast Accuracy</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">N/A</div>
          <div className="text-sm text-gray-500 mt-1">No data available</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Low Stock Alerts</span>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-500 mt-1">Items below threshold</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Prediction Models</span>
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">2</div>
          <div className="text-sm text-gray-500 mt-1">Active models</div>
        </div>
      </div>

      {/* Analytics Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Forecasting Module */}
        <Link to="/forecasting" className="block group">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Sales Forecasting (SSA)
                  </h3>
                  <p className="text-sm text-gray-500">Singular Spectrum Analysis</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-gray-600 mb-4">
              Advanced time series analysis using Singular Spectrum Analysis to predict future sales trends and demand patterns.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Active</span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">Last updated: N/A</span>
            </div>
          </div>
        </Link>

        {/* Stock Prediction Module */}
        <Link to="/stock-prediction" className="block group">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-orange-500 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    Stock Prediction
                  </h3>
                  <p className="text-sm text-gray-500">Inventory Level Forecasting</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
            </div>
            <p className="text-gray-600 mb-4">
              Predictive analytics for optimal stock levels, identifying potential stockouts and overstock situations before they occur.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Active</span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">Last updated: N/A</span>
            </div>
          </div>
        </Link>
      </div>
          </div>
  );
}
