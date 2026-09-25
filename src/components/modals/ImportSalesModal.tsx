import React, { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { api, API_URL } from "@/services/api";
import { toast } from "sonner";

interface ImportSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportSalesModal({ isOpen, onClose, onSuccess }: ImportSalesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [deductInventory, setDeductInventory] = useState(false); // Default to false (Historical Mode)
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Please upload a valid .csv file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith(".csv")) {
        toast.error("Please upload a valid .csv file");
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a CSV file first");
      return;
    }

    setImporting(true);
    const toastId = toast.loading("Uploading and importing sales CSV...");

    try {
      const res = await api.importSales(file, deductInventory);
      toast.success(res.message || "Sales imported successfully!", { id: toastId });
      setFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to import sales.", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Import Sales CSV</h2>
              <p className="text-xs text-muted-foreground">Upload transaction records in bulk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Download Template */}
          <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-muted/30 border border-border/50 gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Need the CSV format?</p>
                <p className="text-[11px] text-muted-foreground truncate">Download template with required headers</p>
              </div>
            </div>
            <a
              href={`${API_URL}/api/sales/import-template`}
              download
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded-lg border border-border/50 transition-all flex items-center gap-1.5 shrink-0"
            >
              Template
            </a>
          </div>

          {/* Upload Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all ${
              file
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-border hover:border-emerald-500/40 hover:bg-muted/30"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv"
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground truncate max-w-[280px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB &bull; Click to replace
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Click to select or drag &amp; drop your CSV
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .csv files up to 10MB
                </p>
              </div>
            )}
          </div>

          {/* Skip Inventory Toggle */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-muted/40 border border-border/50">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!deductInventory}
                onChange={(e) => setDeductInventory(!e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500/30 accent-emerald-600 cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Skip inventory stock deduction
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When checked, sales will be imported into revenue records without deducting your live physical inventory stock. Uncheck only if importing current live sales.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-muted/20">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="px-4 sm:px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Sales
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
