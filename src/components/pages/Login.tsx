import React, { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Key, Mail, ChevronLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { api, type LoginResult } from "@/services/api";
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

  // Login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // MFA states
  const [otp, setOtp] = useState("");
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);

  // Password Reset / Change states
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession() && view === "login") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
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
        // Trigger EmailJS MFA
        // Since the backend generated the OTP, we'll try to get it if it was returned (for this specific request)
        // or the backend sent it already. The user asked for EmailJS on frontend.
        const otpCode = (result as any).otp || "";

        setView("mfa");
        toast.info("A verification code has been sent to your email.");
      } else {
        finalizeLogin(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const sendMFAMail = async (res: any, code: string) => {
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_OTP_TEMPLATE_ID,
        {
          Username: res.username,
          Password: password, // The temp pass they just used
          passcode: code,
          time: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
          email: res.email // Corrected from to_email to match template
        },
        EMAILJS_PUBLIC_KEY
      );
    } catch (e) {
      console.error("EmailJS Error:", e);
      // We don't toast error here to avoid confusing the user if it's a transient issue, 
      // but log it for debugging.
    }
  };

  // Re-triggering EmailJS if the login result has the code
  useEffect(() => {
    if (view === "mfa" && loginResult && (loginResult as any).otp) {
      sendMFAMail(loginResult, (loginResult as any).otp);
    }
  }, [view, loginResult]);

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginResult || !otp) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyOTP({ user_id: loginResult.user_id, otp: otp.trim() });
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
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.forgotPassword(email.trim());
      if (res.otp) {
        // Send OTP via EmailJS
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_OTP_TEMPLATE_ID,
          {
            Username: res.username || "User",
            Password: "---", // Only OTP for forgot pass
            passcode: res.otp,
            time: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
            email: email.trim() // Corrected from to_email
          },
          EMAILJS_PUBLIC_KEY
        );
      }
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
      special: /[!@#$%^&*]/.test(pass)
    };
  };

  const complexity = validatePasswordComplexity(newPassword);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full grid grid-cols-1 md:grid-cols-2">
        {/* Left Panel: Branding */}
        <div className="bg-black flex items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-transparent pointer-events-none"></div>
          <div className="text-center z-10">
            <div className="border-2 border-white/20 rounded-lg p-8 inline-block backdrop-blur-sm">
              <h1 className="text-5xl font-bold mb-2">
                <span className="text-white">Jonb</span>
                <span className="text-red-600">rix</span>
              </h1>
              <p className="text-white text-xs tracking-[0.2em] uppercase mt-2 font-medium opacity-80">
                Motorcycle Parts and
                <br />
                Accessories
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel: Content */}
        <div className="p-12 flex flex-col justify-center min-h-[520px]">
          {/* Header Section */}
          <div className="mb-8">
            {view !== "login" && (
              <button
                onClick={() => {
                  setView("login");
                  setError(null);
                }}
                className="mb-4 flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Login
              </button>
            )}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {view === "login" && "Welcome"}
              {view === "mfa" && "Verification"}
              {view === "change_password" && "Update Password"}
              {view === "forgot_password" && "Reset Request"}
              {view === "reset_password" && "New Password"}
            </h2>
            <p className="text-gray-500 text-sm">
              {view === "login" && "Sign in with your Username"}
              {view === "mfa" && "We've sent a 6-digit code to your email"}
              {view === "change_password" && "Please set a new secure password"}
              {view === "forgot_password" && "Enter your email to receive a reset code"}
              {view === "reset_password" && "Enter the code and your new password"}
            </p>
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Password</label>
                    <button
                      type="button"
                      onClick={() => setView("forgot_password")}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
                >
                  {loading ? "AUTHENTICATING…" : "LOGIN"}
                </button>
              </form>
            )}

            {view === "mfa" && (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Verification Code</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-xl tracking-[0.5em] font-bold text-center"
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? "VERIFYING…" : "VERIFY CODE"}
                </button>
              </form>
            )}

            {view === "change_password" && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-relaxed">
                    First login required security check. Please choose a new password.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 py-2">
                  <RequirementItem label="8-12 Chars" met={complexity.length} />
                  <RequirementItem label="Uppercase" met={complexity.upper} />
                  <RequirementItem label="Lowercase" met={complexity.lower} />
                  <RequirementItem label="Number" met={complexity.number} />
                  <RequirementItem label="Special" met={complexity.special} />
                </div>
                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !Object.values(complexity).every(Boolean)}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
                >
                  {loading ? "UPDATING…" : "UPDATE & FINISH"}
                </button>
              </form>
            )}

            {view === "forgot_password" && (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="registered@email.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? "SENDING…" : "SEND RESET CODE"}
                </button>
              </form>
            )}

            {view === "reset_password" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Reset Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-bold text-center tracking-[0.3em]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || otp.length < 6 || !Object.values(complexity).every(Boolean)}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
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
      <span className={`text-[8px] font-bold uppercase tracking-widest ${met ? "text-green-600" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}
