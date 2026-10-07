import React, { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Lock, User, Key, Mail, ChevronLeft, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { api, API_URL, type LoginResult } from "@/services/api";
import logo from "@/assets/logo_login.png";
import loginBg from "@/assets/login_bg.webp";
import { getSession, setSession } from "@/auth/session";
import { toast } from "sonner";
import emailjs from "@emailjs/browser";

// EmailJS Configuration - Use environment variables in production
const EMAILJS_SERVICE_ID = "service_kzur8un";
const EMAILJS_AUTH_TEMPLATE_ID = "template_nn7zdgv"; // For credentials
const EMAILJS_OTP_TEMPLATE_ID = "template_3a3keqi";  // For OTP only
const EMAILJS_PUBLIC_KEY = "ZnEuZEpNlMgItPEBG";

export function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState<"login" | "mfa" | "change_password" | "forgot_password" | "reset_password">("login");
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);

  // Login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // MFA states
  const [otp, setOtp] = useState("");
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    // Fetch global login background if customized in System Settings
    api.get<Record<string, string>>("/api/settings/system")
      .then((res) => {
        if (res && res.login_background_url) {
          const u = res.login_background_url;
          const targetUrl = u.startsWith("http") || u.startsWith("data:") ? u : `${API_URL}${u}`;
          // Preload custom image before applying to prevent blank flash / 404
          const img = new Image();
          img.src = targetUrl;
          img.onload = () => {
            setCustomBgUrl(targetUrl);
          };
          img.onerror = () => {
            // Keep default high-performance background on failure
            setCustomBgUrl(null);
          };
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleResendOTP = async () => {
    if (!loginResult?.user_id || resending || resendCountdown > 0) return;
    setResending(true);
    setError(null);
    try {
      await api.resendOTP(loginResult.user_id);
      toast.success("A new verification code has been sent to your email.");
      setResendCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend verification code");
    } finally {
      setResending(false);
    }
  };

  // Password Reset / Change states
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession() && view === "login") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const u = username.trim();
    if (!u || !password) {
      setError("Enter your username or employee ID and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.login({ username: u, password });

      if (result.mfa_required) {
        setLoginResult(result);
        setView("mfa");
        if (result.mfa_method === "totp") {
          toast.info("Please enter the 6-digit code from your Authenticator app.");
        } else {
          setResendCountdown(60);
          toast.info("A verification code has been sent to your email.");
        }
      } else if (result.must_change_password) {
        setLoginResult(result);
        setView("change_password");
      } else {
        finalizeLogin(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!loginResult || !otp) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyOTP({ 
        user_id: loginResult.user_id, 
        otp: otp.trim() 
      });
      if (result.must_change_password) {
        setLoginResult(result);
        setView("change_password");
      } else {
        finalizeLogin(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginResult) return;
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.changePassword({
        current_password: password, // The temp pass they just used
        new_password: newPassword
      }, loginResult.user_id);

      toast.success("Password updated successfully!");
      finalizeLogin({ ...loginResult, must_change_password: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.forgotPassword(username.trim(), email.trim());
      setView("reset_password");
      toast.info("A reset code has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate reset");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.resetPassword({
        username,
        email,
        otp,
        new_password: newPassword
      });

      toast.success("Password reset successfully. Please login with your new password.");
      setView("login");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = (result: LoginResult) => {
    setSession({
      user_id: result.user_id,
      username: result.username,
      full_name: result.full_name,
      employee_id: result.employee_id,
      role: result.role,
      email: result.email ?? null,
      permissions: result.permissions,
      is_root_admin: (result as any).is_root_admin,
      avatar_url: result.avatar_url ?? null,
      session_token: result.session_token ?? null,
    });
    const isCashier = result.role?.toLowerCase() === "cashier";
    navigate(isCashier ? "/pos" : "/dashboard", { replace: true });
  };

  const validatePasswordComplexity = (pass: string) => {
    return {
      length: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      lower: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[^A-Za-z0-9]/.test(pass)
    };
  };

  const complexity = validatePasswordComplexity(newPassword);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative bg-zinc-950 bg-cover bg-center bg-no-repeat selection:bg-red-600 selection:text-white transition-all duration-300"
      style={{
        backgroundImage: `url(${customBgUrl || loginBg})`,
      }}
    >
      {/* Rich cinematic backdrop overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/65 to-black/80 backdrop-blur-xs z-0 pointer-events-none" />

      <div className="bg-card rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 relative z-10 border border-white/15">
        {/* Left Panel: Branding */}
        <div className="md:col-span-5 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-8 sm:p-10 flex flex-col items-center justify-between relative overflow-hidden text-center border-b md:border-b-0 md:border-r border-white/10">
          {/* Subtle Ambient red glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none z-0" />
          
          <div className="z-10 w-full flex flex-col items-center my-auto">
            {/* Logo Squircle */}
            <div className="relative w-36 h-36 bg-white rounded-2xl p-4 shadow-2xl flex items-center justify-center mb-5 border border-white/20 transition-transform duration-300 hover:scale-105">
              <img 
                src={logo} 
                alt="JONBRIX Logo" 
                className="h-full w-full object-contain" 
              />
            </div>
            
            <h1 className="text-white text-lg font-black tracking-[0.14em] uppercase leading-tight drop-shadow-sm">
              JONBRIX
              <span className="block text-xs font-bold text-zinc-400 tracking-wider mt-1">MOTORCYCLE PARTS & ACCESSORIES</span>
            </h1>
            <div className="w-8 h-1 bg-red-600 rounded-full my-3" />
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Sales & Inventory System
            </p>
          </div>

          <div className="z-10 mt-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>InvenSight System v1.0</span>
          </div>
        </div>

        {/* Right Panel: Content */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center min-h-[500px] bg-card">
          {/* Header Section */}
          <div className="mb-6">
            {view !== "login" && (
              <button
                onClick={() => {
                  setView("login");
                  setError(null);
                  setForceDisconnectAllowed(false);
                }}
                className="mb-4 flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Login
              </button>
            )}
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              {view === "login" && "Welcome Back"}
              {view === "mfa" && (loginResult?.mfa_method === "totp" ? "Authenticator Verification" : "Two-Step Verification")}
              {view === "change_password" && "Update Password"}
              {view === "forgot_password" && "Reset Password"}
              {view === "reset_password" && "Set New Password"}
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {view === "login" && "Sign in with your Username"}
              {view === "mfa" && (
                loginResult?.mfa_method === "totp"
                  ? "Enter the 6-digit code generated by your Authenticator app"
                  : "Enter the 6-digit verification code sent to your email"
              )}
              {view === "change_password" && "Please set a new secure password for your account"}
              {view === "forgot_password" && "Enter your registered email to receive a reset code"}
              {view === "reset_password" && "Enter the code and set your new password"}
            </p>
          </div>

          {/* Form Content */}
          <div className="space-y-5">
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-9 pr-4 py-2.5 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setView("forgot_password")}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-9 py-2.5 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 transition-all outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-200/50 dark:border-red-900/50">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
                >
                  {loading ? "AUTHENTICATING…" : "LOGIN"}
                </button>
              </form>
            )}

            {view === "mfa" && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {loginResult?.mfa_method === "totp" ? "Authenticator Code" : "Verification Code"}
                    </label>
                    {loginResult?.mfa_method !== "totp" && (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={resending || resendCountdown > 0}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        {resending ? "Sending…" : resendCountdown > 0 ? `Resend (${resendCountdown}s)` : "Resend Code"}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full pl-9 pr-4 py-3 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 rounded-lg text-lg font-mono font-bold tracking-[0.4em] text-center text-foreground placeholder:text-muted-foreground/40 transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-200/50 dark:border-red-900/50">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "VERIFYING…" : "VERIFY CODE"}
                </button>

                {loginResult?.mfa_method === "totp" && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setResending(true);
                          setError(null);
                          await api.resendOTP(loginResult.user_id);
                          setLoginResult({ ...loginResult, mfa_method: "email" });
                          setResendCountdown(60);
                          setOtp("");
                          toast.info("A backup verification code has been sent to your registered email.");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to send backup email code");
                        } finally {
                          setResending(false);
                        }
                      }}
                      disabled={resending}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {resending ? "Sending backup code..." : "Don't have your phone? Send code via email instead"}
                    </button>
                  </div>
                )}
              </form>
            )}

            {view === "change_password" && (
              <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200/50 dark:border-red-900/50">
                  <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    First login security check: Please set a new password.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-3 pr-9 py-2 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 transition-all outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Confirm Password
                    </label>
                    {confirmPassword && (
                      <span className={`text-[9px] font-bold ${confirmPassword === newPassword ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {confirmPassword === newPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className={`w-full pl-3 pr-9 py-2 bg-muted/20 hover:bg-muted/30 focus:bg-background border rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 transition-all outline-none ${
                        confirmPassword
                          ? confirmPassword === newPassword
                            ? "border-emerald-500/70 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                            : "border-red-500/70 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                          : "border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 py-1">
                  <RequirementItem label="Min 8 Chars" met={complexity.length} />
                  <RequirementItem label="Uppercase (A-Z)" met={complexity.upper} />
                  <RequirementItem label="Lowercase (a-z)" met={complexity.lower} />
                  <RequirementItem label="Number (0-9)" met={complexity.number} />
                  <RequirementItem label="Special (@#$%)" met={complexity.special} />
                </div>

                {error && (
                  <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-200/50 dark:border-red-900/50">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !newPassword || newPassword !== confirmPassword || !Object.values(complexity).every(Boolean)}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "UPDATING…" : "UPDATE & FINISH"}
                </button>
              </form>
            )}

            {view === "forgot_password" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full pl-9 pr-4 py-2.5 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 transition-all outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-200/50 dark:border-red-900/50">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "SENDING…" : "SEND RESET CODE"}
                </button>
              </form>
            )}

            {view === "reset_password" && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    6-Digit Reset Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 rounded-lg text-sm font-mono font-bold text-center tracking-[0.3em] text-foreground placeholder:text-muted-foreground/40 transition-all outline-none"
                    placeholder="000000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-3 pr-9 py-2 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 transition-all outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Confirm Password
                    </label>
                    {confirmPassword && (
                      <span className={`text-[9px] font-bold ${confirmPassword === newPassword ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {confirmPassword === newPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full pl-3 pr-9 py-2 bg-muted/20 hover:bg-muted/30 focus:bg-background border rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 transition-all outline-none ${
                        confirmPassword
                          ? confirmPassword === newPassword
                            ? "border-emerald-500/70 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                            : "border-red-500/70 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                          : "border-border/70 focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-200/50 dark:border-red-900/50">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6 || !Object.values(complexity).every(Boolean)}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "RESETTING…" : "RESET PASSWORD"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequirementItem({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1 h-1 rounded-full ${met ? "bg-green-500" : "bg-gray-300"}`} />
      <span className={`text-[8px] font-bold uppercase tracking-widest ${met ? "text-green-600" : "text-muted-foreground/70"}`}>
        {label}
      </span>
    </div>
  );
}



