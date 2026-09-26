import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  itemName?: string;
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Delete",
  message,
  itemName,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div className="flex-1 pr-6 sm:pr-0">
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2">
                {title}
              </h3>
              {itemName && (
                <p className="text-xs sm:text-sm font-medium text-muted-foreground bg-muted/50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg mb-2 sm:mb-3 break-all">
                  {itemName}
                </p>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
