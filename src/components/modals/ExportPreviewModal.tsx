import React, { useState, useMemo, useEffect } from "react";
import { X, Download, FileSpreadsheet, Trash2, Search, Calendar, Filter, CheckSquare, Square } from "lucide-react";
import { exportToExcel } from "@/utils/export";

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  filename: string;
  title?: string;
}

export function ExportPreviewModal({ 
  isOpen, 
  onClose, 
  data, 
  filename, 
  title = "Export Wizard" 
}: ExportPreviewModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [moduleFilters, setModuleFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());

  // Detect which columns are good for dropdown filtering (e.g. Status, Role, Category)
  const filterableKeys = useMemo(() => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.filter(k => 
      ["status", "role", "category", "module", "type", "priority", "reason", "supplier"].includes(k.toLowerCase())
    );
  }, [data]);

  // Get unique values for those columns
  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    filterableKeys.forEach(key => {
      const values = Array.from(new Set(data.map(item => item[key]?.toString()).filter(Boolean)));
      options[key] = values as string[];
    });
    return options;
  }, [data, filterableKeys]);

  // Actual filtering logic
  const filteredData = useMemo(() => {
    return data.filter((item, idx) => {
      // Search term filter
      const matchesSearch = searchTerm === "" || Object.values(item).some(val => 
        val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Date range filter
      // Checks for common date keys: created_at, timestamp, date, invoice_date, last_updated, return_date
      const dateKey = Object.keys(item).find(k => 
        ["created_at", "timestamp", "date", "invoice_date", "last_updated", "return_date"].includes(k.toLowerCase())
      );
      let matchesDate = true;
      if (dateKey && (startDate || endDate)) {
        const itemDateValue = item[dateKey];
        if (itemDateValue) {
          const itemDate = new Date(itemDateValue).getTime();
          if (startDate && itemDate < new Date(startDate).getTime()) matchesDate = false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end.getTime()) matchesDate = false;
          }
        }
      }

      // Module-specific dropdown filters
      const matchesModuleFilters = Object.entries(moduleFilters).every(([key, value]) => {
        return !value || item[key]?.toString() === value;
      });

      return matchesSearch && matchesDate && matchesModuleFilters;
    });
  }, [data, searchTerm, startDate, endDate, moduleFilters]);

  // Initialize selection when modal opens
  useEffect(() => {
    if (isOpen && data.length > 0) {
      setSelectedIds(new Set(data.map((item, idx) => item.id || idx)));
    } else if (!isOpen) {
      // Clear filters when closing? Optional, but keeps it clean
      setSearchTerm("");
      setStartDate("");
      setEndDate("");
      setModuleFilters({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    const finalData = data.filter((item, idx) => selectedIds.has(item.id || idx));
    // Re-filter the matched ones against the UI filters to be safe, 
    // though selectedIds should already restrict them.
    // Actually, users might expect that ONLY visible items get exported if they checked "Select All Filtered".
    
    // Diskarte: We export exactly what's in selectedIds.
    exportToExcel(finalData, filename);
    onClose();
  };

  const visibleIds = filteredData.map((item, idx) => {
    // We need to find the correct index in the original data or use unique ID
    // Since filteredData is a subset of data, it's safer to always use unique ID or find original index
    const originalIdx = data.findIndex(d => d === item);
    return item.id || originalIdx;
  });

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

  const toggleSelectFiltered = () => {
    const newSet = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleIds.forEach(id => newSet.delete(id));
    } else {
      visibleIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const toggleSelectItem = (id: any) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const keys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== "id") : [];

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300 shadow-2xl">
      <div className="bg-card bg-background rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-border dark:border-gray-800">
        
        {/* Modern Header */}
        <div className="bg-gray-900 dark:bg-black text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] rounded-full -mr-40 -mt-40 animate-pulse"></div>
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-gradient-to-br from-primary to-indigo-700 rounded-3xl shadow-xl shadow-primary/20 transform hover:scale-110 hover:rotate-3 transition-all duration-300">
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter">{title}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                  <p className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-[0.2em]">
                    {filteredData.length} records matching • {selectedIds.size} selected for export
                  </p>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 bg-card/5 hover:bg-card/10 rounded-2xl transition-all hover:rotate-90 duration-300 group ring-1 ring-white/10"
            >
              <X className="w-6 h-6 text-muted-foreground/70 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Powerful Filter Toolbar */}
        <div className="p-8 bg-card bg-background border-b border-border dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[300px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="Quick search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-muted/50/50 bg-card border-2 border-transparent border-border rounded-2xl text-sm focus:border-primary focus:bg-card dark:focus:bg-gray-800 outline-none transition-all shadow-sm"
              />
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2 bg-muted/50 bg-card p-2 rounded-2xl border-2 border-transparent border-border ring-gray-100 dark:ring-gray-800 shadow-sm">
              <div className="flex items-center gap-2 px-3 text-muted-foreground/70 border-r border-border">
                <Calendar className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Range</span>
              </div>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs focus:ring-0 px-2 font-bold dark:text-gray-300"
              />
              <span className="text-gray-300 font-light">to</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs focus:ring-0 px-2 font-bold dark:text-gray-300"
              />
            </div>

            {/* Dynamic Dropdowns */}
            {filterableKeys.map(key => (
              <div key={key} className="relative group min-w-[140px]">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors">
                  <Filter className="w-full h-full" />
                </div>
                <select
                  value={moduleFilters[key] || ""}
                  onChange={(e) => setModuleFilters(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full pl-10 pr-10 py-4 bg-muted/50 bg-card border-2 border-transparent border-border rounded-2xl text-xs font-black appearance-none focus:border-primary outline-none cursor-pointer shadow-sm uppercase tracking-tighter"
                >
                  <option value="">{key.replace(/_/g, " ")}</option>
                  {filterOptions[key].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/70">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            ))}
          </div>

          {/* Selection Utilities */}
          <div className="flex items-center justify-between mt-6 border-t border-gray-50 dark:border-gray-800 pt-6">
            <div className="flex items-center gap-6">
              <button 
                onClick={toggleSelectFiltered}
                className={`flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all active:scale-95 ${allVisibleSelected ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"}`}
              >
                {allVisibleSelected ? (
                  <><Trash2 className="w-4 h-4" /> Deselect Visible</>
                ) : (
                  <><CheckSquare className="w-4 h-4" /> Select All Filtered</>
                )}
              </button>
              <div className="h-6 w-px bg-muted dark:border-gray-800"></div>
              <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
                <span className="text-primary">{selectedIds.size}</span> items staged for export
              </p>
            </div>
            
            {(searchTerm || startDate || endDate || Object.values(moduleFilters).some(v => v)) && (
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setStartDate("");
                  setEndDate("");
                  setModuleFilters({});
                }}
                className="text-xs font-black text-muted-foreground/70 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
              >
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* Styled Scrollable Table Area */}
        <div className="flex-1 overflow-auto p-8 bg-muted/50/30 dark:bg-gray-950 italic-scrollbar">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-gray-300 dark:text-muted-foreground animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-muted bg-card rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-xl font-black italic">No matches found</p>
              <p className="text-xs opacity-60 mt-2 font-bold uppercase tracking-widest">Adjust filters or try a different search</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border dark:border-gray-800 rounded-[2rem] bg-card bg-background shadow-xl shadow-black/5">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50/50 bg-card/30 border-b border-border dark:border-gray-800 text-muted-foreground/70 font-black">
                  <tr>
                    <th className="px-6 py-5 w-14"></th>
                    {keys.map((key) => (
                      <th key={key} className="px-6 py-5 uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">
                        {key.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50 text-muted-foreground dark:text-muted-foreground/70">
                  {filteredData.map((row, idx) => {
                    // Match with original data index if id is missing
                    const originalIdx = data.findIndex(d => d === row);
                    const rowId = row.id || originalIdx;
                    const isSelected = selectedIds.has(rowId);
                    return (
                      <tr 
                        key={idx} 
                        className={`group transition-all duration-200 cursor-pointer ${isSelected ? "bg-primary/10/40 dark:bg-blue-900/10" : "hover:bg-muted/50 dark:hover:bg-blue-900/5"}`}
                        onClick={() => toggleSelectItem(rowId)}
                      >
                        <td className="px-6 py-5">
                          <div className={`transition-all transform group-active:scale-90 ${isSelected ? "text-primary" : "text-gray-300 group-hover:text-muted-foreground/70"}`}>
                            {isSelected ? <CheckSquare className="w-5 h-5 fill-primary/10" /> : <Square className="w-5 h-5" />}
                          </div>
                        </td>
                        {keys.map((key) => (
                          <td key={key} className="px-6 py-5 whitespace-nowrap text-xs font-black tracking-tight dark:text-gray-300">
                            {row[key]?.toString() || "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Premium Footer */}
        <div className="p-10 bg-card bg-background border-t border-border dark:border-gray-800 flex justify-between items-center bg-gradient-to-t from-gray-50/50 to-white dark:from-black dark:to-gray-900">
          <div className="flex flex-col">
            <h4 className="text-lg font-black text-foreground text-foreground leading-tight">Ready for Download</h4>
            <p className="text-[11px] text-muted-foreground/70 font-bold uppercase tracking-widest mt-1">
              Processed <span className="text-primary font-black">{selectedIds.size}</span> records • Optimized for <span className="text-emerald-500 font-black">XLSX</span>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={onClose}
              className="px-8 py-3 text-xs font-black text-muted-foreground/70 hover:text-foreground dark:hover:text-white transition-all uppercase tracking-[0.2em]"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedIds.size === 0}
              className="group relative flex items-center gap-4 bg-gray-900 dark:bg-primary text-white px-12 py-4 rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20 disabled:grayscale disabled:opacity-30 disabled:scale-100 disabled:shadow-none font-black text-xs uppercase tracking-widest"
            >
              <Download className="w-4 h-4 group-hover:animate-bounce" />
              Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
