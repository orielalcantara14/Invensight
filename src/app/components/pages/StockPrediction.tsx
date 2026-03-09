import { AlertTriangle, TrendingDown, Package, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";

const stockPredictions: any[] = [];

const stockoutRiskData: any[] = [];

const criticalItems: any[] = [];

export function StockPrediction() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Stock Prediction & Analysis</h1>
        <p className="text-gray-600 mt-1">Predict stockouts and optimize inventory levels</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">High Risk Items</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">N/A</div>
          <div className="text-sm text-gray-500 mt-1">No data available</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Medium Risk Items</span>
            <TrendingDown className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">N/A</div>
          <div className="text-sm text-gray-500 mt-1">No data available</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Low Risk Items</span>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">N/A</div>
          <div className="text-sm text-gray-500 mt-1">No data available</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Avg Days to Stockout</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">N/A</div>
          <div className="text-sm text-gray-500 mt-1">No data available</div>
        </div>
      </div>

      {/* Stockout Risk Chart */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stockout Risk Analysis</h2>
        <div className="flex items-center justify-center h-[300px] text-gray-400">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No risk analysis data available</p>
            <p className="text-sm mt-1">Add inventory and sales data to analyze stockout risk</p>
          </div>
        </div>
      </div>

      {/* Stock Predictions Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">30/60/90 Day Stock Predictions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  30 Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  60 Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90 Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recommended Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urgency
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No stock predictions available</p>
                  <p className="text-sm text-gray-400 mt-1">System requires sales history to generate predictions</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Items Alert */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Critical Items Requiring Immediate Action</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="text-center">
              <p className="text-gray-500 font-medium">No critical items</p>
              <p className="text-sm text-gray-400 mt-1">Items at risk of stockout will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
