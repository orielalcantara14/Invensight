import React, { useState, useEffect } from "react";
import { X, Save, Calendar, Activity, FileText } from "lucide-react";
import { AuditLogEntry } from "@/services/api";

interface EditAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logId: number, data: Partial<AuditLogEntry>) => Promise<void>;
  log: AuditLogEntry | null;
}

export function EditAuditLogModal({ isOpen, onClose, onSave, log }: EditAuditLogModalProps) {
  const [formData, setFormData] = useState<Partial<AuditLogEntry>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (log) {
      // Format timestamp for datetime-local input
      // Log timestamp is likely "2026-05-12 16:46:49.123456" or similar
      let formattedTime = "";
      try {
        const d = new Date(log.timestamp);
        if (!isNaN(d.getTime())) {
            // Adjust to local ISO format for datetime-local (YYYY-MM-DDThh:mm)
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      } catch (e) {
        console.error("Failed to parse date", e);
      }

      setFormData({
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        timestamp: formattedTime,
        details: log.details || "",
      });
    }
  }, [log]);

  if (!isOpen || !log) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Convert datetime-local back to ISO/SQL format
      const finalData = { ...formData };
      if (finalData.timestamp) {
          finalData.timestamp = new Date(finalData.timestamp).toISOString();
      }
      await onSave(log.log_id, finalData);
      onClose();
    } catch (error) {
      alert("Failed to update log: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-200">
        <div className="bg-primary p-4 sm:p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 text-white min-w-0 pr-2">
            <Activity className="w-6 h-6 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold truncate">Edit Audit Entry #{log.log_id}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Action</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.action || ""}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                  placeholder="e.g. UPDATE_PRODUCT"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Timestamp</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="datetime-local"
                  value={formData.timestamp || ""}
                  onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Details</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <textarea
                  value={formData.details || ""}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  rows={4}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm leading-relaxed"
                  placeholder="Additional context about the activity..."
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
