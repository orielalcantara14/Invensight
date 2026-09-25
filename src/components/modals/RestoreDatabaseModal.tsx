import React from "react";
import { AlertTriangle, Database, FileJson, X, RefreshCw } from "lucide-react";

interface RestoreDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  file: File | null;
  isRestoring?: boolean;
}

export function RestoreDatabaseModal({
  isOpen,
  onClose,
  onConfirm,
  file,
  isRestoring = false,
}: RestoreDatabaseModalProps) {
  if (!isOpen || !file) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => !isRestoring && onClose()}
      />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border/80 z-10 text-foreground">
        {/* Close Button */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-all disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header & Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-950/50 rounded-xl flex items-center justify-center border border-red-200 dark:border-red-900/50">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 pr-6 sm:pr-0">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Restore Database State
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirm database overwrite and point-in-time recovery
              </p>
            </div>
          </div>

          {/* Selected File Card */}
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3 sm:p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <FileJson className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {file.name}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Size: {formatFileSize(file.size)} • Type: JSON Backup
              </p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-3.5 text-xs text-red-700 dark:text-red-400 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <span>⚠️</span> Warning: Irreversible Action
            </p>
            <p className="leading-relaxed opacity-95 text-[11.5px]">
              Restoring this backup will completely overwrite all current database tables (inventory, sales, products, and configurations). All data recorded after this backup was created will be permanently replaced.
            </p>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="bg-muted/40 px-5 sm:px-6 py-3.5 sm:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-border/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-muted-foreground bg-card border border-border hover:bg-muted/60 rounded-lg transition-colors disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Restoring Database...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Yes, Restore Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
