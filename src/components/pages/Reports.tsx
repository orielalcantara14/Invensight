import { FileText, Download, TrendingUp, Package, DollarSign, Loader2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { api } from "@/services/api";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/export";
import { ProtectedAction } from "../ProtectedAction";

interface GeneratedReport {
  id: number;
  reportType: string;
  dateRange: string;
  generatedDate: string;
  generatedBy: string;
}

const reportTypes = [
  { id: 1, name: "Sales Report", type: "sales", description: "Comprehensive sales analysis and trends", icon: DollarSign },
  { id: 2, name: "Inventory Report", type: "inventory", description: "Current stock levels and movements", icon: Package },
  { id: 4, name: "Supplier Performance", type: "supplier", description: "Supplier delivery and quality metrics", icon: FileText },
];

export function Reports() {
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.get<GeneratedReport[]>("/api/reports/history");
      setGeneratedReports(data);
    } catch (error) {
      toast.error("Failed to load report history");
    } finally {
      setLoading(false);
    }
  };

  const deleteReportRecord = async (id: number) => {
    try {
      await api.delete(`/api/reports/${id}`);
      toast.success("Report record removed");
      fetchHistory();
    } catch (error) {
      toast.error("Failed to remove record");
    }
  };

  const handleGenerate = async () => {
    if (!selectedType) {
      toast.error("Please select a report type");
      return;
    }
    
    // Inventory and Forecast do not actually need date boundaries technically in the backend, but we send them anyway
    if (!startDate || !endDate) {
      toast.error("Please specify a valid date range");
      return;
    }

    try {
      setIsGenerating(true);
      toast.info("Compiling data...", { id: "generate_toast" });
      
      const payload = {
        report_type: selectedType,
        start_date: startDate,
        end_date: endDate
      };

      const data = await api.post<any[]>("/api/reports/generate", payload);
      
      if (!data || data.length === 0) {
        toast.dismiss("generate_toast");
        toast.warning("No data found for the selected criteria.");
      } else {
        exportToExcel(data, `${reportTypes.find(t => t.type === selectedType)?.name}_${format(new Date(), "yyyyMMdd")}`);
        toast.success("Report successfully generated and downloaded!", { id: "generate_toast" });
      }
      
      fetchHistory();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate report", { id: "generate_toast" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Generate and view business intelligence reports</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Type</option>
              {reportTypes.map((type) => (
                <option key={type.id} value={type.type}>{type.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <ProtectedAction module="Reports" action="Export">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !selectedType}
                className="w-full bg-blue-600 text-white px-4 py-2 flex justify-center items-center gap-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin"/> : "Generate Report"}
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>


      {/* Generated Reports */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Previously Generated Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading history...</td>
                </tr>
              ) : generatedReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No reports generated yet</p>
                    <p className="text-sm text-gray-400 mt-1">Generate your first report to get started</p>
                  </td>
                </tr>
              ) : (
                generatedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{report.reportType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.dateRange}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.generatedDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.generatedBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <ProtectedAction module="Reports" action="Delete">
                        <button onClick={() => deleteReportRecord(report.id)} className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors" title="Delete record from history">
                          <Trash2 className="w-4 h-4" /> Clear
                        </button>
                      </ProtectedAction>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}