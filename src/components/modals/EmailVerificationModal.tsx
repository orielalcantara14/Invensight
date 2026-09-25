import React, { useState } from "react";
import { MailCheck, X } from "lucide-react";

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
  currentEmail: string;
  newEmail: string;
}

export function EmailVerificationModal({
  isOpen,
  onClose,
  onVerify,
  currentEmail,
  newEmail,
}: EmailVerificationModalProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const success = await onVerify(otp.trim());
      if (success) {
        setOtp("");
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify code.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => {
          if (!verifying) onClose();
        }}
      />

      {/* Modal Container */}
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-border/80 animate-in fade-in zoom-in duration-200">
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <button
            onClick={onClose}
            disabled={verifying}
            className="p-1 text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center text-red-650 dark:text-red-500">
                <MailCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 space-y-2.5 sm:space-y-3 pr-6 sm:pr-0">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Verify Email Update
                </h3>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We sent a 6-digit verification code to your current registered email address:
                </p>
                
                <p className="text-xs font-mono font-bold text-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40 inline-block break-all">
                  {currentEmail}
                </p>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Please enter the code below to authorize changing your email to <strong className="text-foreground break-all">{newEmail}</strong>.
                </p>

                <div className="pt-2">
                  <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    disabled={verifying}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-red-600/15 focus:border-red-600 focus:bg-white dark:focus:bg-zinc-900/80 text-foreground dark:text-white outline-none transition-all font-mono text-lg sm:text-xl tracking-[0.3em] sm:tracking-[0.4em] font-bold text-center placeholder:text-zinc-400"
                    required
                  />
                </div>

                {error && (
                  <p className="text-xs font-semibold text-red-650 dark:text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-muted/50 dark:bg-zinc-900/30 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-border/30">
            <button
              type="button"
              onClick={onClose}
              disabled={verifying}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 border border-border/50 rounded-lg transition-colors disabled:opacity-50 text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying || otp.length < 6}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg border border-border/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
            >
              {verifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950 rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Update"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
