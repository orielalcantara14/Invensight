import React, { useState, useEffect } from "react";
import { Smartphone, QrCode, ShieldCheck, Copy, Check, X, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";

interface SetupTOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess: () => void;
}

export function SetupTOTPModal({ isOpen, onClose, userId, onSuccess }: SetupTOTPModalProps) {
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadSetupData();
    } else {
      setCode("");
      setError(null);
      setCopied(false);
    }
  }, [isOpen, userId]);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.setupTOTP(userId);
      setSecret(res.secret);
      setQrCode(res.qr_code);
    } catch (err: any) {
      setError(err.message || "Failed to initialize Authenticator setup");
      toast.error("Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6) {
      setError("Please enter the complete 6-digit code from your app.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.enableTOTP({
        user_id: userId,
        secret,
        totp_code: cleanCode
      });
      toast.success("Authenticator App (2FA) successfully enabled!");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid 6-digit code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity" 
        onClick={() => {
          if (!submitting) onClose();
        }} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-border/80 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer disabled:opacity-50 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Set Up Authenticator App</h3>
              <p className="text-xs text-muted-foreground">Google Authenticator, Microsoft, or Authy</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Generating your secure QR code...</p>
            </div>
          ) : error && !qrCode ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <form onSubmit={handleVerifyAndEnable} className="space-y-5">
              {/* Step 1: Scan QR Code */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Scan this QR code</span>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 shadow-xs mx-auto max-w-[220px]">
                  {qrCode ? (
                    <img src={qrCode} alt="TOTP QR Code" className="w-44 h-44 object-contain rounded-md" />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center bg-gray-100 rounded-md text-gray-400">
                      <QrCode className="w-12 h-12" />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Open your Authenticator app, tap <strong className="text-foreground">+</strong>, and scan the QR code above.
                </p>

                {/* Manual Key Accordion/Box */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Can't scan? Enter key manually:</p>
                    <p className="font-mono font-bold text-foreground text-xs truncate tracking-wider mt-0.5 select-all">{secret}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-1.5 rounded-lg bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 shrink-0 transition-colors cursor-pointer"
                    title="Copy Secret Key"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Step 2: Verify Code */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Enter 6-digit confirmation code</span>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  disabled={submitting}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCode(val);
                    setError(null);
                  }}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.4em] font-mono text-xl font-bold py-2.5 px-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/30 focus:border-primary outline-none text-foreground transition-all"
                />

                {error && (
                  <p className="text-xs font-medium text-rose-500 flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
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
                  disabled={submitting || code.length !== 6}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-xs font-bold uppercase tracking-wider shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Verify & Enable</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
