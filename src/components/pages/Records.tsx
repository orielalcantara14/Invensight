import { Search, Filter, Download, Plus, AlertTriangle, CheckCircle, XCircle, ClipboardCheck, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const inspectionLogs: any[] = [];

const quarantineStock: any[] = [];

const inspectionStats: any[] = [];

const issueDistribution: any[] = [];

export function Records() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"inspection" | "quarantine">("inspection");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredInspections = inspectionLogs.filter(
    (log) =>
      log.inspectionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.inspectedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuarantine = quarantineStock.filter(
    (item) =>
      item.quarantineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.issueType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInspected = inspectionLogs.reduce((sum, log) => sum + log.totalReceived, 0);
  const totalPassed = inspectionLogs.reduce((sum, log) => sum + log.passedQty, 0);
  const totalFailed = inspectionLogs.reduce((sum, log) => sum + log.failedQty, 0);

  const currentData = activeTab === "inspection" ? filteredInspections : filteredQuarantine;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Records</h1>
            <p className="text-muted-foreground mt-1">Track product inspections and manage quarantine stock</p>
          </div>
          <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            New Inspection
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Total Inspected</span>
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground">N/A</div>
          <div className="text-sm text-muted-foreground mt-1">No data available</div>
        </div>

        <div className="bg-card p-4 sm:p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Passed</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-muted-foreground/70">N/A</div>
          <div className="text-sm text-muted-foreground mt-1">No data available</div>
        </div>

        <div className="bg-card p-4 sm:p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Failed</span>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-muted-foreground/70">N/A</div>
          <div className="text-sm text-muted-foreground mt-1">No data available</div>
        </div>

        <div className="bg-card p-4 sm:p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">In Quarantine</span>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-muted-foreground/70">N/A</div>
          <div className="text-sm text-muted-foreground mt-1">No data available</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Inspection Trend */}
        <div className="lg:col-span-2 bg-card p-4 sm:p-6 rounded-lg shadow border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Inspection Results Trend</h2>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground/70">
            <div className="text-center">
              <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No inspection data available</p>
              <p className="text-sm mt-1">Start inspecting products to see trends</p>
            </div>
          </div>
        </div>

        {/* Issue Distribution */}
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Issue Types Distribution</h2>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground/70">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No issue data</p>
              <p className="text-sm mt-1">Data not available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-lg shadow border border-border">
        <div className="border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab("inspection")}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "inspection"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Inspection Logs
              </div>
            </button>
            <button
              onClick={() => setActiveTab("quarantine")}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "quarantine"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Quarantine Stock
              </div>
            </button>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {activeTab === "inspection" ? "All Inspection Records" : "Quarantine Inventory"}
            </h2>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground/70" />
            <input
              type="text"
              placeholder={
                activeTab === "inspection"
                  ? "Search by inspection ID, product name, or inspector..."
                  : "Search by quarantine ID, product name, supplier, or issue type..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Inspection Log Table */}
        {activeTab === "inspection" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Inspection ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Received
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Passed Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Failed Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Pass Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Inspected By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-muted-foreground font-medium">No inspection records available</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Create a new inspection to start tracking quality</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {totalPages > 1 && activeTab === "inspection" && (
              <div className="px-6 py-4 border-t border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(endIndex, filteredInspections.length)}</span> of{" "}
                      <span className="font-medium">{filteredInspections.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-muted/50 px-3 py-1.5 border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      >
                        <option value={3}>3</option>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                      </select>
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) handlePageChange(currentPage - 1);
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((page, index) =>
                        page === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={page === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) handlePageChange(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </>
        )}

        {/* Quarantine Stock Table */}
        {activeTab === "quarantine" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quarantine ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Issue Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Discovery Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-muted-foreground font-medium">No quarantined items</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Items that fail quality checks will appear here</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
