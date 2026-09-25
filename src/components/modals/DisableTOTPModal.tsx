import React, { useState } from "react";
import { ShieldAlert, X, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";

interface DisableTOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess: () => void;
}

export function DisableTOTPModal({ isOpen, onClose, userId, onSuccess }: DisableTOTPModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your current account password.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.disableTOTP({
        user_id: userId,
        password: password.trim()
      });
      toast.success("Authenticator App has been disabled.");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to disable Authenticator. Check your password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity" 
        onClick={() => {
          if (!submitting) onClose();
        }} 
      />

      <div className="relative bg-card rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto border border-border/80 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer disabled:opacity-50 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleDisable} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Disable Authenticator App</h3>
              <p className="text-xs text-muted-foreground">Revert back to Email OTP verification</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter your current account password to confirm disabling two-factor authentication via Authenticator App.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                disabled={submitting}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your current password"
                className="w-full rounded-xl border border-border/70 pl-3 pr-10 py-2.5 text-xs font-semibold outline-none focus:border-primary bg-muted/20 hover:bg-muted/30 text-foreground transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-xs font-medium text-rose-500 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 rounded-xl border border-border/60 text-xs font-bold uppercase tracking-wider hover:bg-muted/40 transition-colors text-muted-foreground disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !password}
              className="flex-1 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors text-xs font-bold uppercase tracking-wider shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Disable 2FA</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
