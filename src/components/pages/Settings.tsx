import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { api, API_URL, type ProfileActivityItem } from "@/services/api";
import { getSession, setSession, setStoredTimeout, DEFAULT_TIMEOUT_BY_ROLE } from "@/auth/session";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, Bell, Lock, LayoutGrid, Database,
  ShieldCheck, Clock, KeyRound, Palette, Check, Monitor,
  Sun, Moon, Save, Store, Percent, BrainCircuit, RotateCw,
  MapPin, Phone, FileText, User, Camera, Shield, Download, Upload, FileUp,
  Eye, EyeOff, Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/format";
import { EmailVerificationModal } from "@/components/modals/EmailVerificationModal";
import { SetupTOTPModal } from "@/components/modals/SetupTOTPModal";
import { DisableTOTPModal } from "@/components/modals/DisableTOTPModal";
import { RestoreDatabaseModal } from "@/components/modals/RestoreDatabaseModal";
import defaultLoginBg from "@/assets/login_bg.webp";

function splitFullName(full: string): { first: string; middle: string; last: string } {
  const t = (full || "").trim();
  if (!t) return { first: "", middle: "", last: "" };

  if (t.includes(",")) {
    const [sn, ...restArr] = t.split(",");
    const last = (sn || "").trim();
    const rest = restArr.join(",").trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: "", middle: "", last };
    if (parts.length === 1) return { first: parts[0], middle: "", last };
    const middle = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(" ");
    return { first, middle, last };
  }

  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts[1] };
  if (parts.length === 3) return { first: parts[0], middle: parts[1], last: parts[2] };

  const last = parts[parts.length - 1];
  const middle = parts[parts.length - 2];
  const first = parts.slice(0, -2).join(" ");
  return { first, middle, last };
}

function joinFullName(first: string, middle: string, last: string): string {
  const f = first.trim();
  const m = middle.trim();
  const l = last.trim();
  if (l && f) {
    return m ? `${l}, ${f} ${m}` : `${l}, ${f}`;
  }
  if (l) return l;
  if (f) return m ? `${f} ${m}` : f;
  return m;
}

function ProfileSettings() {
  const session = getSession();
  const userId = session?.user_id;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [pendingNewEmail, setPendingNewEmail] = useState("");
  const [avatarImgError, setAvatarImgError] = useState(false);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const p = await api.getProfile(userId!);
      setProfile(p);
      const { first, middle, last } = splitFullName(p.full_name || "");
      setFirstName(first);
      setMiddleName(middle);
      setLastName(last);
      setEmail(p.email || "");
      setAddress(p.address || "");
    } catch (e) {
      toast.error("Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (otp: string): Promise<boolean> => {
    try {
      const updated = await api.verifyEmail(userId!, otp);
      setProfile(updated);
      setVerificationOpen(false);
      setEditing(false);

      const s = getSession();
      if (s) {
        setSession({
          ...s,
          email: updated.email ?? null,
        });
      }
      window.dispatchEvent(new Event("invensight_profile_updated"));
      toast.success("Email address updated successfully");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Email verification failed");
      return false;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const full_name = joinFullName(firstName, middleName, lastName);
      const updated = await api.updateProfile(userId!, {
        full_name,
        email: email.trim() || null,
        address: address.trim() || null,
      });
      setProfile(updated);

      const s = getSession();
      if (s) {
        setSession({
          ...s,
          full_name: updated.full_name,
        });
      }
      window.dispatchEvent(new Event("invensight_profile_updated"));

      if (updated.email_verification_required) {
        setPendingNewEmail(email.trim());
        setVerificationOpen(true);
        toast.info("Verification code sent to your current email address.");
      } else {
        if (s) {
          setSession({
            ...s,
            full_name: updated.full_name,
            email: updated.email ?? null,
          });
        }
        setEditing(false);
        toast.success("Profile details updated");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    try {
      setUploading(true);
      const updated = await api.uploadAvatar(userId, file);
      setProfile(updated);

      const s = getSession();
      if (s) {
        setSession({
          ...s,
          avatar_url: updated.avatar_url,
        });
      }
      window.dispatchEvent(new Event("invensight_profile_updated"));
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const getAvatarUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${API_URL}${path}`;
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground text-xs italic">Loading profile...</div>;

  return (
    <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
      <div className="p-5 border-b border-border/50 flex items-center gap-2.5 bg-muted/5">
        <User className="w-5 h-5 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Profile Information</h2>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Manage your personal profile details</p>
        </div>
      </div>
      <div className="p-5 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/40">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border border-border/60 flex items-center justify-center text-muted-foreground text-3xl font-bold uppercase shadow-inner">
              {profile?.avatar_url && !avatarImgError ? (
                <img
                  src={getAvatarUrl(profile.avatar_url)}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={() => setAvatarImgError(true)}
                />
              ) : (
                <span>{(profile?.full_name || profile?.username || "?")[0]}</span>
              )}
            </div>
            <label className={cn(
              "absolute bottom-0 right-0 w-8 h-8 rounded-full border border-border/60 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-all",
              uploading ? "opacity-50 pointer-events-none" : ""
            )}>
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{profile?.full_name || profile?.username}</h3>
            <p className="text-xs text-muted-foreground font-semibold">{profile?.email || "No email set"}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/50 text-[9px] font-bold uppercase text-muted-foreground bg-muted/20">
                <Shield className="w-3 h-3" />
                {profile?.role || "User"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Employee ID: {profile?.employee_id || "N/A"}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">First Name</label>
              <input
                type="text"
                required
                disabled={!editing}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John Rovhic"
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Middle Name</label>
              <input
                type="text"
                disabled={!editing}
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Optional / Initial"
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Last Name</label>
              <input
                type="text"
                required
                disabled={!editing}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sohitado"
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</label>
              <input
                type="email"
                disabled={!editing}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Business Address</label>
              <textarea
                disabled={!editing}
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    loadProfile();
                  }}
                  className="px-4 py-2 rounded-lg border border-border/50 text-xs font-bold uppercase hover:bg-muted/40 transition-all text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Details"}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      <EmailVerificationModal
        isOpen={verificationOpen}
        onClose={() => setVerificationOpen(false)}
        onVerify={handleVerifyEmail}
        currentEmail={profile?.email || ""}
        newEmail={pendingNewEmail}
      />
    </div>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get<Record<string, boolean>>("/api/settings/user");
      setSettings(res);
    } catch (e) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: boolean) => {
    const prevSettings = { ...settings };
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await api.put("/api/settings/user", newSettings);
      toast.success("Settings updated");
    } catch (e) {
      toast.error("Failed to update settings");
      setSettings(prevSettings);
    }
  };

  const toggles = [
    { key: "out_of_stock", label: "Out of Stock Alerts" },
    { key: "order_completed", label: "Order Completed" },
    { key: "stock_movement", label: "Stock Movements" },
    { key: "sales_forecast", label: "Sales Forecast Update" },
    { key: "new_user", label: "New User Added" }
  ];

  if (loading) return <div className="p-12 text-center text-muted-foreground text-xs italic">Loading settings...</div>;

  return (
    <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
      <div className="p-5 border-b border-border/50 flex items-center gap-2.5 bg-muted/5">
        <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Notification Settings</h2>
      </div>
      <div className="p-5 space-y-4">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/10 transition-colors">
            <div className="space-y-1">
              <p className="font-bold text-foreground text-xs uppercase tracking-tight">{t.label}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">Receive notifications for {t.label.toLowerCase()}</p>
            </div>
            <Switch
              checked={settings[t.key] ?? true}
              onCheckedChange={(val) => updateSetting(t.key, val)}
              className="data-[state=checked]:bg-zinc-950 dark:data-[state=checked]:bg-zinc-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySettings() {
  const session = getSession();
  const userId = session?.user_id;
  const currentRole = (session?.role ?? "").trim().toLowerCase();
  const isRootAdmin = (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo";
  const isSuperAdminOrAdmin = ["super admin", "administrator", "system administrator"].includes(currentRole) || isRootAdmin;
  const isSystemAdminOnly = ["system administrator", "super admin"].includes(currentRole) || isRootAdmin;
  const roleDefaultMinutes = DEFAULT_TIMEOUT_BY_ROLE[currentRole] ?? 15;

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ProfileActivityItem[]>([]);
  const [timeout, setTimeout] = useState("default");
  const [cashierTimeout, setCashierTimeout] = useState("15");
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(true);
  const [savingMfa, setSavingMfa] = useState<boolean>(false);
  const [rolesList, setRolesList] = useState<string[]>(["System Administrator", "Administrator", "Manager", "Sales Staff", "Cashier"]);
  const [selectedMfaRole, setSelectedMfaRole] = useState<string>("Cashier");
  const [mfaRoles, setMfaRoles] = useState<string[]>([]);
  const [totpEnabled, setTotpEnabled] = useState<boolean>(false);
  const [setupTotpOpen, setSetupTotpOpen] = useState<boolean>(false);
  const [disableTotpOpen, setDisableTotpOpen] = useState<boolean>(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadSecurityData();
    }
  }, [userId]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const [logData, settings, sysSettings, fetchedRoles, userProfile] = await Promise.all([
        api.getSecurityLogs(userId!),
        api.get<Record<string, any>>("/api/settings/user").catch(() => ({})),
        api.get<Record<string, string>>("/api/settings/system").catch(() => ({})),
        api.getRoles().catch(() => []),
        api.getProfile(userId!).catch(() => null)
      ]);
      setLogs(logData);
      if (userProfile) {
        setTotpEnabled(!!userProfile.totp_enabled);
      }
      if (settings?.session_timeout) {
        setTimeout(settings.session_timeout);
      } else {
        setTimeout("default");
      }
      if (sysSettings?.cashier_session_timeout) {
        setCashierTimeout(sysSettings.cashier_session_timeout);
      }
      if (sysSettings?.mfa_enabled !== undefined) {
        setMfaEnabled(sysSettings.mfa_enabled !== "false");
      }

      const defaultRoleNames = ["System Administrator", "Administrator", "Manager", "Sales Staff", "Cashier"];
      const fetchedRoleNames = (fetchedRoles || []).map((r: any) => r.role_name || r.name).filter(Boolean);
      const combinedRoles = Array.from(new Set([...defaultRoleNames, ...fetchedRoleNames]));
      setRolesList(combinedRoles);
      if (!combinedRoles.includes(selectedMfaRole)) {
        setSelectedMfaRole(combinedRoles[0] || "Cashier");
      }

      if (sysSettings?.mfa_roles) {
        try {
          const parsed = JSON.parse(sysSettings.mfa_roles);
          if (Array.isArray(parsed)) {
            setMfaRoles(parsed.map((r: string) => r.toLowerCase()));
          }
        } catch {
          setMfaRoles(combinedRoles.map(r => r.toLowerCase()));
        }
      } else {
        setMfaRoles(combinedRoles.map(r => r.toLowerCase()));
      }
    } catch (e) {
      toast.error("Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { label: "Minimum 8 characters", met: newPwd.length >= 8 },
    { label: "At least one uppercase letter", met: /[A-Z]/.test(newPwd) },
    { label: "At least one number", met: /[0-9]/.test(newPwd) },
    { label: "At least one special character", met: /[^a-zA-Z0-9]/.test(newPwd) },
  ];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPwd === currentPwd) {
      toast.error("New password cannot be the same as your current password");
      return;
    }

    const unmet = requirements.filter(r => !r.met);
    if (unmet.length > 0) {
      toast.error(`Missing: ${unmet.map(r => r.label).join(", ")}`);
      return;
    }

    try {
      setPwdLoading(true);
      await api.changePassword({ current_password: currentPwd, new_password: newPwd }, userId!);
      toast.success("Password updated successfully");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e: any) {
      toast.error(e.message || "Failed to change password");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleTimeoutChange = async (val: string) => {
    try {
      setTimeout(val);
      await api.put("/api/settings/user", { session_timeout: val });
      if (val === "default") {
        setStoredTimeout(roleDefaultMinutes);
      } else {
        setStoredTimeout(parseInt(val));
      }
      toast.success("Session timeout updated");
    } catch (e) {
      toast.error("Failed to update timeout");
    }
  };

  const handleCashierTimeoutChange = async (val: string) => {
    try {
      setCashierTimeout(val);
      await api.put("/api/settings/system", { cashier_session_timeout: val });
      localStorage.setItem("cashier_session_timeout", val);
      window.dispatchEvent(new Event("invensight_settings_updated"));
      toast.success("Cashier POS inactivity timeout updated");
    } catch (e) {
      toast.error("Failed to update Cashier timeout");
    }
  };

  const handleMfaToggle = async (enabled: boolean) => {
    try {
      setSavingMfa(true);
      setMfaEnabled(enabled);
      await api.put("/api/settings/system", { mfa_enabled: enabled ? "true" : "false" });
      toast.success(enabled ? "MFA is now Enforced globally" : "MFA is now Disabled globally");
      window.dispatchEvent(new Event("invensight_settings_updated"));
    } catch (e: any) {
      setMfaEnabled(!enabled);
      toast.error(e.response?.data?.detail || "Failed to update MFA settings");
    } finally {
      setSavingMfa(false);
    }
  };

  const handleToggleRoleMfa = async (roleName: string) => {
    const lowerRole = roleName.toLowerCase();
    let updated: string[];
    if (mfaRoles.includes(lowerRole)) {
      updated = mfaRoles.filter(r => r !== lowerRole);
    } else {
      updated = [...mfaRoles, lowerRole];
    }
    setMfaRoles(updated);
    try {
      const payload: Record<string, string> = { mfa_roles: JSON.stringify(updated) };
      if (!mfaEnabled && updated.length > 0) {
        setMfaEnabled(true);
        payload.mfa_enabled = "true";
      }
      await api.put("/api/settings/system", payload);
      const isNowOn = updated.includes(lowerRole);
      toast.success(`${roleName}: MFA turned ${isNowOn ? "ON (Enforced)" : "OFF (Direct Login)"}`);
      window.dispatchEvent(new Event("invensight_settings_updated"));
    } catch {
      toast.error("Failed to update role MFA configuration");
      setMfaRoles(mfaRoles);
    }
  };

  const handleSelectAllRolesMfa = async (enableAll: boolean) => {
    const updated = enableAll ? rolesList.map(r => r.toLowerCase()) : [];
    setMfaRoles(updated);
    try {
      const payload: Record<string, string> = { mfa_roles: JSON.stringify(updated) };
      if (enableAll && !mfaEnabled) {
        setMfaEnabled(true);
        payload.mfa_enabled = "true";
      }
      await api.put("/api/settings/system", payload);
      toast.success(enableAll ? "MFA enabled for all roles" : "MFA disabled for all roles");
      window.dispatchEvent(new Event("invensight_settings_updated"));
    } catch {
      toast.error("Failed to update role MFA configuration");
      setMfaRoles(mfaRoles);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground text-xs italic">Loading security settings...</div>;

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center gap-2.5 bg-muted/5">
          <KeyRound className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? "text" : "password"}
                  required
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full rounded-lg border border-border/60 pl-3 pr-10 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">New Password</label>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  required
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full rounded-lg border border-border/60 pl-3 pr-10 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Confirm New Password</label>
                {confirmPwd && (
                  <span className={cn("text-[9px] font-bold", confirmPwd === newPwd ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {confirmPwd === newPwd ? "✓ Match" : "✗ No match"}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  required
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className={cn(
                    "w-full rounded-lg border pl-3 pr-10 py-2 text-xs font-semibold outline-none bg-muted/20 hover:bg-muted/40 text-foreground transition-all",
                    confirmPwd
                      ? confirmPwd === newPwd
                        ? "border-emerald-500/70 focus:border-emerald-500"
                        : "border-red-500/70 focus:border-red-500"
                      : "border-border/60 focus:border-zinc-400"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password Requirements</h3>
            <ul className="space-y-2">
              {requirements.map((req, idx) => (
                <li key={idx} className="flex items-center gap-2 text-[10px] font-bold uppercase transition-colors">
                  <div className={cn("w-1.5 h-1.5 rounded-full", req.met ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-300')} />
                  <span className={req.met ? 'text-foreground' : 'text-muted-foreground/70'}>{req.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwdLoading}
              className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs disabled:opacity-50"
            >
              {pwdLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Session Timeout */}
      <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center gap-2.5 bg-muted/5">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Session Management</h2>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Control inactivity timeouts and auto-logout thresholds</p>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-bold text-foreground text-xs uppercase tracking-tight">Your Inactivity Timeout</p>
              <p className="text-[10px] text-muted-foreground font-semibold">Automatically log out your personal account after a period of inactivity</p>
            </div>
            <select
              value={timeout}
              onChange={(e) => handleTimeoutChange(e.target.value)}
              className="bg-muted/20 border border-border/60 rounded-lg py-1.5 px-3 text-xs font-semibold outline-none appearance-none cursor-pointer text-foreground"
            >
              <option value="default">Use Role Default ({roleDefaultMinutes} min)</option>
              <option value="0">Never</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="240">4 Hours</option>
              <option value="1440">24 Hours</option>
            </select>
          </div>

          {isSuperAdminOrAdmin && (
            <>
              <div className="h-px bg-border/40" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-bold text-foreground text-xs uppercase tracking-tight">Cashier POS Inactivity Timeout</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">Automatically log out Cashier accounts operating the POS terminal when idle</p>
                </div>
                <select
                  value={cashierTimeout}
                  onChange={(e) => handleCashierTimeoutChange(e.target.value)}
                  className="bg-muted/20 border border-border/60 rounded-lg py-1.5 px-3 text-xs font-semibold outline-none appearance-none cursor-pointer text-foreground"
                >
                  <option value="5">5 Minutes</option>
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes (Standard)</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour (60 Minutes)</option>
                  <option value="120">2 Hours</option>
                  <option value="0">Never / Disabled (0)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Multi-Factor Authentication */}
      <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center gap-2.5 bg-muted/5">
          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Multi-Factor Authentication (MFA / 2FA)</h2>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Control email OTP verification on login</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-bold text-foreground text-xs uppercase tracking-tight">Authentication Status</p>
              <p className="text-[10px] text-muted-foreground font-semibold">Require a 6-digit email OTP verification code when logging in</p>
            </div>
            {isSystemAdminOnly ? (
              <Switch
                disabled={savingMfa}
                checked={mfaEnabled}
                onCheckedChange={handleMfaToggle}
              />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                {mfaEnabled ? "Enabled" : "Disabled"}
              </span>
            )}
          </div>

          {isSystemAdminOnly && (
            <>
              <div className="h-px bg-border/40" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-foreground text-xs uppercase tracking-tight">Role Verification</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">Select a role to enable or disable email OTP requirement</p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedMfaRole}
                    onChange={(e) => setSelectedMfaRole(e.target.value)}
                    className="bg-muted/20 border border-border/60 rounded-lg py-1.5 px-3 text-xs font-semibold outline-none appearance-none cursor-pointer text-foreground"
                  >
                    {rolesList.map((r) => {
                      const isRoleOn = mfaRoles.includes(r.toLowerCase());
                      return (
                        <option key={r} value={r}>
                          {r} ({isRoleOn ? "OTP Required" : "Disabled"})
                        </option>
                      );
                    })}
                  </select>

                  <Switch
                    checked={mfaRoles.includes(selectedMfaRole.toLowerCase())}
                    onCheckedChange={() => handleToggleRoleMfa(selectedMfaRole)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-border/40" />

          {/* Personal Authenticator App (TOTP) Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <p className="font-bold text-foreground text-xs uppercase tracking-tight">Authenticator App (Google / Microsoft / Authy)</p>
                {totpEnabled ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/50">
                    Not Configured
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold">
                {totpEnabled 
                  ? "Your account generates instant 6-digit verification codes on your phone. No email waiting required." 
                  : "Link your smartphone to get instant verification codes without waiting for email delivery."}
              </p>
            </div>

            <div>
              {totpEnabled ? (
                <button
                  type="button"
                  onClick={() => setDisableTotpOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Disable App
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSetupTotpOpen(true)}
                  className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Set Up Authenticator</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Login History */}
      <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Security History</h2>
          </div>
          {logs.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground font-semibold">
              {logs.length} Total Events
            </span>
          )}
        </div>
        <div className="overflow-x-auto max-h-[250px] overflow-y-auto divide-y divide-border/40">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-border/50 sticky top-0 z-10">
              <tr className="bg-muted/90 backdrop-blur-sm">
                <th className="px-6 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="px-6 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Details</th>
                <th className="px-6 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground text-xs italic">No security events found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-muted/20 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold",
                        log.action === 'FAILED_LOGIN' || log.action === 'ACCOUNT_LOCKOUT'
                          ? 'text-red-650 dark:text-red-500'
                          : 'text-emerald-650 dark:text-emerald-500'
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          log.action === 'FAILED_LOGIN' || log.action === 'ACCOUNT_LOCKOUT' ? 'bg-red-500' : 'bg-emerald-500'
                        )} />
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-xs text-muted-foreground truncate max-w-xs">{log.details || '—'}</td>
                    <td className="px-6 py-2.5 text-xs text-muted-foreground font-mono">
                      {formatDateTime(log.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {userId && (
        <>
          <SetupTOTPModal
            isOpen={setupTotpOpen}
            onClose={() => setSetupTotpOpen(false)}
            userId={userId}
            onSuccess={() => {
              setTotpEnabled(true);
              loadSecurityData();
            }}
          />
          <DisableTOTPModal
            isOpen={disableTotpOpen}
            onClose={() => setDisableTotpOpen(false)}
            userId={userId}
            onSuccess={() => {
              setTotpEnabled(false);
              loadSecurityData();
            }}
          />
        </>
      )}
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme, accentColor, setAccentColor, isCompact, setIsCompact, fontSize, setFontSize } = useTheme();

  const [localTheme, setLocalTheme] = useState(theme);
  const [localAccent, setLocalAccent] = useState(accentColor);
  const [localCompact, setLocalCompact] = useState(isCompact);
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [saving, setSaving] = useState(false);

  // Localization settings (store-wide)
  const [currencySymbol, setCurrencySymbol] = useState("₱");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  const session = getSession();
  const currentRole = (session?.role ?? "").trim().toLowerCase();
  const isRootAdmin = (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo";
  const isAdministrator = currentRole === "administrator";
  const isSuperAdmin = currentRole === "super admin" || currentRole === "system administrator";
  const canManageSystem = isRootAdmin || isAdministrator || isSuperAdmin || currentRole === "system administrator";

  useEffect(() => {
    loadLocalization();
  }, []);

  const loadLocalization = async () => {
    try {
      const res = await api.get<Record<string, string>>("/api/settings/system");
      if (res) {
        setCurrencySymbol(res.currency_symbol || "₱");
        setDateFormat(res.date_format || "MM/DD/YYYY");
      }
    } catch (e) {
      setCurrencySymbol(localStorage.getItem("currency_symbol") || "₱");
      setDateFormat(localStorage.getItem("date_format") || "MM/DD/YYYY");
    }
  };

  const colors = [
    { id: "blue", hex: "#3b82f6", label: "Classic Blue" },
    { id: "purple", hex: "#a855f7", label: "Royal Purple" },
    { id: "green", hex: "#22c55e", label: "Emerald Green" },
    { id: "orange", hex: "#f97316", label: "Vibrant Orange" },
    { id: "red", hex: "#ef4444", label: "Power Red" },
  ];

  const handleSave = async () => {
    try {
      setSaving(true);
      setTheme(localTheme);
      setAccentColor(localAccent);
      setIsCompact(localCompact);
      setFontSize(localFontSize);

      await api.put("/api/settings/user", {
        theme: localTheme,
        accent_color: localAccent,
        compact_mode: localCompact,
        font_size: localFontSize,
      });

      if (canManageSystem) {
        await api.put("/api/settings/system", {
          currency_symbol: currencySymbol,
          date_format: dateFormat,
        });
        localStorage.setItem("currency_symbol", currencySymbol);
        localStorage.setItem("date_format", dateFormat);
      }

      window.dispatchEvent(new Event("invensight_settings_updated"));
      toast.success("Appearance & Localization settings saved successfully");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
      <div className="p-5 border-b border-border/50 flex items-center gap-2.5 bg-muted/5">
        <Palette className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Appearance & Localization</h2>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Customize layouts and regional configurations</p>
        </div>
      </div>

      <div className="p-5 space-y-8">
        {/* Theme Selection */}
        <section className="space-y-4">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Theme</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: "light", label: "Light", icon: Sun, gradient: "from-zinc-100 to-zinc-200" },
              { id: "dark", label: "Dark", icon: Moon, gradient: "from-zinc-800 to-zinc-950" },
              { id: "system", label: "Auto", icon: Monitor, gradient: "from-zinc-400 to-zinc-700" },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setLocalTheme(t.id as any);
                    setTheme(t.id as any);
                  }}
                  className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-150 ${localTheme === t.id
                      ? "border-zinc-950 dark:border-zinc-100 bg-muted/20"
                      : "border-border/60 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                >
                  <div className={`h-16 rounded-lg bg-gradient-to-br ${t.gradient} mb-3 shadow-xs group-hover:scale-[1.02] transition-transform`} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {t.label}
                    </span>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Accent Color Selection */}
        <section className="space-y-4">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Accent Color</label>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setLocalAccent(c.id);
                  setAccentColor(c.id);
                }}
                className={`relative w-8 h-8 rounded-full transition-all border overflow-hidden flex items-center justify-center ${localAccent === c.id ? "border-zinc-950 dark:border-zinc-50 scale-105 shadow-sm" : "border-transparent hover:scale-105"
                  }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              >
                {localAccent === c.id && (
                  <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={4} />
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="h-px bg-border/40" />

        {/* Font Size Selection */}
        <section className="space-y-4">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Font Size (Scale)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { id: "small", label: "Small (16px)", sizeClass: "text-xs" },
              { id: "medium", label: "Medium (18px)", sizeClass: "text-sm" },
              { id: "large", label: "Large (20px)", sizeClass: "text-base" },
              { id: "extra-large", label: "Extra Large (22px)", sizeClass: "text-lg" },
            ].map((sz) => (
              <button
                key={sz.id}
                type="button"
                onClick={() => {
                  setLocalFontSize(sz.id as any);
                  setFontSize(sz.id as any);
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer",
                  localFontSize === sz.id
                    ? "border-zinc-950 dark:border-zinc-100 bg-muted/20"
                    : "border-border/60 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <span className={cn("font-bold text-foreground mb-1", sz.sizeClass)}>
                  Aa
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {sz.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="h-px bg-border/40" />

        {/* Compact Mode */}
        <section className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-bold text-foreground text-xs uppercase tracking-tight">Compact Mode</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Reduce spacing for more content visibility</p>
          </div>
          <Switch
            checked={localCompact}
            onCheckedChange={(val) => {
              setLocalCompact(val);
              setIsCompact(val);
            }}
            className="data-[state=checked]:bg-zinc-950 dark:data-[state=checked]:bg-zinc-100"
          />
        </section>

        <div className="h-px bg-border/40" />

        {/* Localization & Formatting Options */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Localization & Regional (Store-wide)</label>
            {!canManageSystem && (
              <span className="inline-flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase bg-muted/40 px-2 py-0.5 rounded border border-border/50">
                <Lock className="w-3 h-3 text-muted-foreground" /> Read-Only (Admin Managed)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Base Currency Symbol</label>
              <select
                value={currencySymbol}
                disabled={!canManageSystem}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full rounded-lg border border-border/60 py-2 px-3 text-xs font-semibold bg-muted/20 outline-none text-foreground cursor-pointer disabled:opacity-60"
              >
                <option value="₱">PHP (₱) Philippine Peso</option>
                <option value="$">USD ($) US Dollar</option>
                <option value="€">EUR (€) Euro</option>
                <option value="£">GBP (£) British Pound</option>
                <option value="¥">JPY (¥) Japanese Yen</option>
                <option value="A$">AUD (A$) Australian Dollar</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Date Format</label>
              <select
                value={dateFormat}
                disabled={!canManageSystem}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full rounded-lg border border-border/60 py-2 px-3 text-xs font-semibold bg-muted/20 outline-none text-foreground cursor-pointer disabled:opacity-60"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 06/21/2026)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 21/06/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-06-21)</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4 border-t border-border/40">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Appearance"}
          </button>
        </div>
      </div>
    </div>
  );
}

function POSSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPOSSettings();
  }, []);

  const loadPOSSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get<Record<string, string>>("/api/settings/system");
      if (res && res.pos_payment_methods) {
        const allowed = ["Cash", "GCash", "PayMaya"];
        res.pos_payment_methods = res.pos_payment_methods
          .split(",")
          .filter((m) => allowed.includes(m))
          .join(",");
      }
      setSettings(res || {});
    } catch (e) {
      toast.error("Failed to load POS settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put("/api/settings/system", settings);

      if (settings.tax_rate) localStorage.setItem("tax_rate", settings.tax_rate);
      if (settings.receipt_footer) localStorage.setItem("receipt_footer", settings.receipt_footer);
      if (settings.pos_default_view) localStorage.setItem("pos_default_view", settings.pos_default_view);
      if (settings.pos_payment_methods) localStorage.setItem("pos_payment_methods", settings.pos_payment_methods);
      if (settings.cashier_session_timeout) localStorage.setItem("cashier_session_timeout", settings.cashier_session_timeout);

      window.dispatchEvent(new Event("invensight_settings_updated"));
      toast.success("POS & Payment configurations updated");
    } catch (e) {
      toast.error("Failed to update POS settings");
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = (method: string, checked: boolean) => {
    const active = settings.pos_payment_methods ? settings.pos_payment_methods.split(",") : ["Cash"];
    const allowed = ["Cash", "GCash", "PayMaya"];
    let newActive = active.filter((m) => allowed.includes(m));
    if (checked) {
      if (!newActive.includes(method)) newActive.push(method);
    } else {
      newActive = newActive.filter(m => m !== method);
    }
    if (!newActive.includes("Cash")) newActive.push("Cash");
    setSettings({ ...settings, pos_payment_methods: newActive.join(",") });
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground text-xs italic">Loading POS settings...</div>;

  const paymentMethodsList = ["GCash", "PayMaya"];
  const currentMethods = settings.pos_payment_methods ? settings.pos_payment_methods.split(",") : ["Cash", "GCash", "PayMaya"];

  return (
    <form onSubmit={handleSave} className="bg-card rounded-lg border border-border/55 overflow-hidden">
      <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/5">
        <div className="flex items-center gap-2.5">
          <Store className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">POS & Checkout Settings</h2>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Customize layouts and payment methods for POS terminals</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="p-5 space-y-6">
        <section className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Enabled Payment Options</label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {paymentMethodsList.map((method) => {
              const isActive = currentMethods.includes(method);
              return (
                <div key={method} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/10 transition-colors">
                  <span className="text-xs font-bold text-foreground">{method}</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(val) => togglePaymentMethod(method, val)}
                    className="data-[state=checked]:bg-zinc-950 dark:data-[state=checked]:bg-zinc-100"
                  />
                </div>
              );
            })}
          </div>
        </section>

        <div className="h-px bg-border/40" />

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Sales Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={parseFloat(settings.tax_rate || "0.03") * 100}
              onChange={(e) => setSettings({ ...settings, tax_rate: (parseFloat(e.target.value) / 100).toString() })}
              className="w-full rounded-lg border border-border/60 p-2.5 text-xs font-semibold font-mono outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Receipt Footer Note</label>
            <input
              type="text"
              value={settings.receipt_footer || "Thank you for shopping with us!"}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
              className="w-full rounded-lg border border-border/60 p-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
            />
          </div>
        </section>

        <div className="h-px bg-border/40" />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cashier Inactivity Timeout</label>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Automatically log out Cashier accounts from the POS after this period of inactivity.
              </p>
            </div>
            <select
              value={settings.cashier_session_timeout || "15"}
              onChange={(e) => setSettings({ ...settings, cashier_session_timeout: e.target.value })}
              className="bg-muted/20 border border-border/60 rounded-lg py-2 px-3 text-xs font-semibold outline-none appearance-none cursor-pointer text-foreground min-w-[180px]"
            >
              <option value="5">5 Minutes</option>
              <option value="10">10 Minutes</option>
              <option value="15">15 Minutes (Standard)</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour (60 Minutes)</option>
              <option value="120">2 Hours</option>
              <option value="0">Never / Disabled (0)</option>
            </select>
          </div>
        </section>
      </div>
    </form>
  );
}

function BackupSettings() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const handleBackup = async () => {
    try {
      setBackingUp(true);
      const blob = await api.downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invensight_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Database backup generated successfully");
    } catch (e) {
      toast.error("Failed to generate backup");
    } finally {
      setBackingUp(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingRestoreFile(file);
    setIsRestoreModalOpen(true);
    e.target.value = "";
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreFile) return;
    try {
      setRestoring(true);
      const res = await api.restoreBackup(pendingRestoreFile);
      if (res.ok) {
        toast.success(res.message || "Database restored successfully!");
        setIsRestoreModalOpen(false);
        setPendingRestoreFile(null);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to restore database");
    } finally {
      setRestoring(false);
    }
  };

  const handleCancelRestore = () => {
    if (restoring) return;
    setIsRestoreModalOpen(false);
    setPendingRestoreFile(null);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const res = await api.importProductsCSV(file);
      toast.success(res.message || "Products bulk imported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to import products");
    } finally {
      setImporting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Product Name,Unit Cost,Retail Price,Stock,SKU,Category,Supplier,Unit of Measurement,Is Service\nMotorcycle Battery,1200.00,1650.00,10,BAT-001,Electrical,Jonbrix,pcs,False\nSpark Plug Tuning,250.00,350.00,0,,Service,Self,pcs,True\n";
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement("a");
    a.href = encodedUri;
    a.download = "invensight_product_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center gap-2.5 bg-muted/5">
          <Database className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Database Backup & Recovery</h2>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Secure, download and restore your organization's entire dataset</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl border border-border/50 bg-muted/5 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Download Full Data Dump</h3>
              <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                Generates a transaction-safe `.json` snapshot of all users, inventory, suppliers, sales reports, and configuration settings.
              </p>
            </div>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 font-sans"
            >
              <Download className="w-3.5 h-3.5" />
              {backingUp ? "Generating..." : "Download Backup JSON"}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-muted/5 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Restore Database State</h3>
              <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                Restore the database state using an existing `.json` backup file. <span className="text-red-500 font-bold">WARNING:</span> This will completely overwrite all existing tables!
              </p>
            </div>
            <label className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs flex items-center justify-center gap-2 cursor-pointer text-center font-sans">
              <Upload className="w-3.5 h-3.5" />
              {restoring ? "Restoring..." : "Upload & Restore JSON"}
              <input type="file" accept=".json" onChange={handleFileSelect} disabled={restoring} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center gap-2.5 bg-muted/5">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Bulk Product Import</h2>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Quickly seed the product catalog and starting stock levels via CSV</p>
          </div>
        </div>
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-6 bg-muted/5">
          <div className="space-y-1 max-w-lg text-left">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Import Products from CSV</h3>
            <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
              Upload a `.csv` product list. The import logic automatically maps or inserts missing categories, suppliers, builds SKUs, and configures matching inventory tracks.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={downloadCSVTemplate}
              className="px-4 py-2 rounded-lg border border-border/50 text-xs font-bold uppercase hover:bg-muted/40 transition-all text-muted-foreground"
            >
              Template CSV
            </button>
            <label className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs flex items-center justify-center gap-2 cursor-pointer font-sans">
              <FileUp className="w-3.5 h-3.5" />
              {importing ? "Importing..." : "Upload CSV file"}
              <input type="file" accept=".csv" onChange={handleCSVImport} disabled={importing} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Restore Database Confirmation Modal */}
      <RestoreDatabaseModal
        isOpen={isRestoreModalOpen}
        onClose={handleCancelRestore}
        onConfirm={handleConfirmRestore}
        file={pendingRestoreFile}
        isRestoring={restoring}
      />
    </div>
  );
}

function SystemSettings() {
  const session = getSession();
  const currentRole = (session?.role ?? "").trim().toLowerCase();
  const isRootAdmin = (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo" || currentRole === "root" || currentRole === "root admin";
  const isSuperAdmin = currentRole === "super admin" || currentRole === "superadmin" || isRootAdmin;
  const isSystemAdmin = currentRole === "system administrator" || isSuperAdmin;
  const canManageAiEngine = isSystemAdmin || isSuperAdmin || isRootAdmin;

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [sysRolesList, setSysRolesList] = useState<string[]>(["System Administrator", "Administrator", "Manager", "Sales Staff", "Cashier"]);
  const [selectedSysMfaRole, setSelectedSysMfaRole] = useState<string>("Cashier");

  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [maintenanceMinutes, setMaintenanceMinutes] = useState<number>(5);
  const [customMinutes, setCustomMinutes] = useState<string>("5");
  const [isCustomMin, setIsCustomMin] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [activeMaintenance, setActiveMaintenance] = useState<{ is_active: boolean; target_time?: string; minutes?: number; message?: string; seconds_remaining?: number } | null>(null);

  const handleUploadLoginBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error("Invalid file format. Please upload a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image file size exceeds 8MB limit. Please upload a smaller image.");
      e.target.value = "";
      return;
    }

    try {
      setUploadingBg(true);
      const res = await api.uploadLoginBackground(file);
      setSettings((prev) => ({ ...prev, login_background_url: res.login_background_url }));
      toast.success("Login background image updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload login background image");
    } finally {
      setUploadingBg(false);
      e.target.value = "";
    }
  };

  const handleResetLoginBg = async () => {
    try {
      setUploadingBg(true);
      await api.resetLoginBackground();
      setSettings((prev) => {
        const copy = { ...prev };
        delete copy.login_background_url;
        return copy;
      });
      toast.success("Login background reset to default!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset login background");
    } finally {
      setUploadingBg(false);
    }
  };

  const fetchActiveMaintenance = async () => {
    try {
      const res = await api.get<{ is_active: boolean; target_time?: string; minutes?: number; message?: string; seconds_remaining?: number }>("/api/notifications/active-maintenance");
      setActiveMaintenance(res);
    } catch {
      // Ignore
    }
  };

  const handleBroadcastMaintenance = async () => {
    try {
      setBroadcasting(true);
      const mins = isCustomMin ? Math.max(0, parseInt(customMinutes) || 0) : maintenanceMinutes;
      const msg = maintenanceMsg.trim() || `Scheduled system update will begin in ${mins} minutes. Active sessions may be affected. Please save your work.`;
      await api.post("/api/notifications/broadcast-maintenance", { message: msg, minutes: mins });
      toast.success(`System update alert broadcasted (${mins > 0 ? `${mins} mins countdown` : "Immediate"})`);
      setMaintenanceMsg("");
      fetchActiveMaintenance();
    } catch (e) {
      toast.error("Failed to broadcast alert");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleCancelMaintenance = async () => {
    try {
      setBroadcasting(true);
      await api.post("/api/notifications/cancel-maintenance", {});
      toast.success("Active update countdown cancelled.");
      fetchActiveMaintenance();
    } catch {
      toast.error("Failed to cancel maintenance alert");
    } finally {
      setBroadcasting(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchActiveMaintenance();
    const interval = setInterval(fetchActiveMaintenance, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [res, fetchedRoles] = await Promise.all([
        api.get<Record<string, string>>("/api/settings/system"),
        api.getRoles().catch(() => [])
      ]);
      setSettings(res);

      const defaultRoleNames = ["System Administrator", "Administrator", "Manager", "Sales Staff", "Cashier"];
      const fetchedRoleNames = (fetchedRoles || []).map((r: any) => r.role_name || r.name).filter(Boolean);
      const combined = Array.from(new Set([...defaultRoleNames, ...fetchedRoleNames]));
      setSysRolesList(combined);
      if (!combined.includes(selectedSysMfaRole)) {
        setSelectedSysMfaRole(combined[0] || "Cashier");
      }
    } catch (e) {
      toast.error("Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put("/api/settings/system", settings);
      if (settings.shop_name !== undefined) localStorage.setItem("shop_name", settings.shop_name);
      if (settings.shop_address !== undefined) localStorage.setItem("shop_address", settings.shop_address);
      if (settings.shop_tagline !== undefined) localStorage.setItem("shop_tagline", settings.shop_tagline);
      if (settings.shop_contact !== undefined) localStorage.setItem("shop_contact", settings.shop_contact);
      window.dispatchEvent(new Event("invensight_settings_updated"));
      toast.success("System settings updated");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const clearCache = async () => {
    try {
      setClearing(true);
      await api.post("/api/analytics/clear-cache", {});
      toast.success("Analytics cache cleared. Data will refresh on next visit.");
    } catch (e) {
      toast.error("Failed to clear cache");
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground text-xs italic">Loading system settings...</div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-card rounded-lg border border-border/55 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Global System Settings</h2>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Configure core parameters for the entire organization</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/30">
              <Store className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Shop Identity</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Shop Name</label>
                <input
                  type="text"
                  value={settings.shop_name || ""}
                  onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                  className="w-full rounded-lg border border-border/60 p-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Shop Tagline</label>
                <input
                  type="text"
                  value={settings.shop_tagline || ""}
                  onChange={(e) => setSettings({ ...settings, shop_tagline: e.target.value })}
                  className="w-full rounded-lg border border-border/60 p-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Contact Number</label>
                <input
                  type="text"
                  value={settings.shop_contact || ""}
                  onChange={(e) => setSettings({ ...settings, shop_contact: e.target.value })}
                  className="w-full rounded-lg border border-border/60 p-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Business Address</label>
                <input
                  type="text"
                  value={settings.shop_address || ""}
                  onChange={(e) => setSettings({ ...settings, shop_address: e.target.value })}
                  className="w-full rounded-lg border border-border/60 p-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                />
              </div>
            </div>
          </section>

          {canManageAiEngine && (
            <>
              <div className="h-px bg-border/40" />

              {/* Login Screen Customization (Super Admin, System Admin & Root Admin only) */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Login Screen Background</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                  {/* Preview Thumbnail */}
                  <div className="sm:col-span-5 relative rounded-xl overflow-hidden border border-border/70 shadow-sm aspect-video bg-zinc-950 flex items-center justify-center group">
                    <img
                      src={
                        settings.login_background_url
                          ? settings.login_background_url.startsWith("http") || settings.login_background_url.startsWith("data:")
                            ? settings.login_background_url
                            : `${API_URL}${settings.login_background_url}`
                          : defaultLoginBg
                      }
                      alt="Login Background Preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs">
                        Current Portal Background
                      </span>
                    </div>
                  </div>

                  {/* Upload & Actions */}
                  <div className="sm:col-span-7 space-y-3 text-left">
                    <div>
                      <p className="text-xs font-bold text-foreground">Custom Login Background</p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-relaxed">
                        Upload a high-resolution landscape photo (JPG, PNG, WebP max 8MB). The system automatically optimizes and compresses the image for fast portal load times.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold uppercase transition-all shadow-xs cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingBg ? "Uploading..." : "Upload New Picture"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          className="hidden"
                          disabled={uploadingBg}
                          onChange={handleUploadLoginBg}
                        />
                      </label>

                      {settings.login_background_url && (
                        <button
                          type="button"
                          onClick={handleResetLoginBg}
                          disabled={uploadingBg}
                          className="px-3.5 py-2 rounded-lg border border-border/70 bg-muted/20 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 text-muted-foreground text-xs font-bold uppercase transition-all cursor-pointer"
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {isSystemAdmin && (
            <>
              <div className="h-px bg-border/40" />

              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Security & Authentication (System Admin)</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Global Authentication</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        Require a 6-digit email OTP verification code when logging in
                      </p>
                    </div>
                    <Switch
                      checked={settings.mfa_enabled !== "false"}
                      onCheckedChange={(checked) => setSettings({ ...settings, mfa_enabled: checked ? "true" : "false" })}
                    />
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Role Verification</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        Select a role to enable or disable email OTP requirement
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {(() => {
                        let currentRoles: string[] = [];
                        if (settings.mfa_roles) {
                          try {
                            const p = JSON.parse(settings.mfa_roles);
                            if (Array.isArray(p)) currentRoles = p.map((x: string) => x.toLowerCase());
                          } catch {}
                        } else {
                          currentRoles = sysRolesList.map(r => r.toLowerCase());
                        }
                        const isSelectedRoleOn = currentRoles.includes(selectedSysMfaRole.toLowerCase());

                        return (
                          <>
                            <select
                              value={selectedSysMfaRole}
                              onChange={(e) => setSelectedSysMfaRole(e.target.value)}
                              className="bg-muted/20 border border-border/60 rounded-lg py-1.5 px-3 text-xs font-semibold outline-none appearance-none cursor-pointer text-foreground"
                            >
                              {sysRolesList.map((r) => {
                                const on = currentRoles.includes(r.toLowerCase());
                                return (
                                  <option key={r} value={r}>
                                    {r} ({on ? "OTP Required" : "Disabled"})
                                  </option>
                                );
                              })}
                            </select>

                            <Switch
                              checked={isSelectedRoleOn}
                              onCheckedChange={(chk) => {
                                const lower = selectedSysMfaRole.toLowerCase();
                                const updated = chk 
                                  ? Array.from(new Set([...currentRoles, lower]))
                                  : currentRoles.filter(x => x !== lower);
                                const updatedSettings: Record<string, string> = {
                                  ...settings,
                                  mfa_roles: JSON.stringify(updated)
                                };
                                if (chk && settings.mfa_enabled === "false") {
                                  updatedSettings.mfa_enabled = "true";
                                }
                                setSettings(updatedSettings);
                              }}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {canManageAiEngine && (
            <>
              <div className="h-px bg-border/40" />

              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                  <BrainCircuit className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">AI Analytics Engine</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Prediction Confidence (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      max="99.9"
                      min="50"
                      value={parseFloat(settings.forecast_confidence || "0.999") * 100}
                      onChange={(e) => setSettings({ ...settings, forecast_confidence: (parseFloat(e.target.value) / 100).toString() })}
                      className="w-full rounded-lg border border-border/60 p-2.5 text-xs font-semibold font-mono outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Forecast Horizon (Days)</label>
                    <input
                      type="number"
                      value={settings.forecast_horizon || "30"}
                      onChange={(e) => setSettings({ ...settings, forecast_horizon: e.target.value })}
                      className="w-full rounded-lg border border-border/60 p-2.5 text-xs font-semibold font-mono outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                    />
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </form>

      {/* Maintenance */}
      <div className="space-y-4 mt-6">
        <div className="bg-card rounded-lg border border-border/55 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <RotateCw className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-left">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">System Maintenance</h3>
              <p className="text-[10px] text-muted-foreground font-semibold">
                Manually clear the analytics cache if you notice data discrepancies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearCache}
            disabled={clearing}
            className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCw className={cn("w-3.5 h-3.5", clearing ? "animate-spin" : "")} />
            {clearing ? "Clearing..." : "Force Refresh Cache"}
          </button>
        </div>

        <div className="bg-card rounded-lg border border-border/55 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1 text-left">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Broadcast System Update Alert</h3>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  Notify all active users with a real-time countdown banner before a system deployment or restart.
                </p>
              </div>
            </div>

            {activeMaintenance?.is_active && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-[11px] font-bold">
                  Active Alert ({activeMaintenance.seconds_remaining ? `${Math.ceil(activeMaintenance.seconds_remaining / 60)}m left` : "Starting"})
                </span>
                <button
                  type="button"
                  onClick={handleCancelMaintenance}
                  disabled={broadcasting}
                  className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 rounded transition-colors cursor-pointer"
                >
                  Cancel Alert
                </button>
              </div>
            )}
          </div>

          {/* Countdown Preset Duration Options */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Countdown Notice Before Update
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Immediate (0m)", value: 0 },
                { label: "5 Mins", value: 5 },
                { label: "10 Mins", value: 10 },
                { label: "15 Mins", value: 15 },
                { label: "30 Mins", value: 30 },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setMaintenanceMinutes(preset.value);
                    setIsCustomMin(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                    !isCustomMin && maintenanceMinutes === preset.value
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 font-bold shadow-xs"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomMin(true)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                  isCustomMin
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 font-bold shadow-xs"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground"
                )}
              >
                Custom Minutes
              </button>
              {isCustomMin && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold bg-muted/30 border border-border/70 rounded-lg outline-none focus:ring-1 focus:ring-zinc-400 text-foreground"
                    placeholder="Mins"
                  />
                  <span className="text-xs text-muted-foreground font-semibold">mins</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Announcement Message
            </label>
            <textarea
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              placeholder={`Scheduled system update will begin in ${isCustomMin ? customMinutes : maintenanceMinutes} minutes. Active sessions may be affected. Please save your work.`}
              className="w-full text-xs p-3 rounded-lg border border-border/60 bg-muted/20 outline-none focus:border-zinc-400 text-foreground transition-all min-h-[60px]"
            />
          </div>

          <div className="flex items-center justify-end pt-1 border-t border-border/30">
            <button
              type="button"
              onClick={handleBroadcastMaintenance}
              disabled={broadcasting}
              className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase border border-border/50 shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              {broadcasting ? "Broadcasting..." : "Broadcast Alert"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const session = getSession();
  const currentRole = (session?.role ?? "").trim().toLowerCase();
  const isRootAdmin = (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo" || currentRole === "root" || currentRole === "root admin";
  const isSuperAdmin = currentRole === "super admin" || currentRole === "superadmin" || isRootAdmin;
  const isSystemAdmin = currentRole === "system administrator" || isSuperAdmin;
  const isAdministrator = currentRole === "administrator";
  const canManageSystem = isSystemAdmin || isSuperAdmin || isAdministrator || isRootAdmin;

  const [activeTab, setActiveTab] = useState("Profile");

  const allTabs = [
    { name: "Profile", icon: User, description: "Personal details & photo" },
    { name: "Appearance & Localization", icon: LayoutGrid, description: "Theme, colors & formats" },
    { name: "Notifications", icon: Bell, description: "Alerts & preferences" },
    { name: "Security", icon: Lock, description: "Password & sessions" },
    { name: "POS & Checkout", icon: Store, description: "POS layouts & checkouts" },
    { name: "System", icon: Database, description: isSystemAdmin ? "AI engine & organization info" : "Organization info & maintenance" },
    { name: "Database & Import", icon: RotateCw, description: "Backup, restore & CSV import" }
  ];

  const tabs = allTabs.filter(t => {
    if (t.name === "Database & Import") {
      return isSystemAdmin;
    }
    if (t.name === "POS & Checkout" || t.name === "System") {
      return canManageSystem;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 sm:mb-8 text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your InvenSight experience</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-card rounded-lg border border-border/55 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-muted/10 text-left">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Configuration</p>
            </div>
            <nav className="p-1.5 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative overflow-hidden text-left",
                      isActive
                        ? "bg-muted text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-zinc-950 dark:bg-zinc-50" />
                    )}

                    <div className={cn(
                      "relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150",
                      isActive
                        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950"
                        : "bg-muted/50 group-hover:bg-muted"
                    )}>
                      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold leading-tight uppercase tracking-tight">{tab.name}</p>
                      <p className="text-[9px] mt-0.5 truncate text-muted-foreground/80">{tab.description}</p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === "Appearance & Localization" ? (
            <AppearanceSettings />
          ) : activeTab === "Notifications" ? (
            <NotificationSettings />
          ) : activeTab === "Security" ? (
            <SecuritySettings />
          ) : activeTab === "System" ? (
            <SystemSettings />
          ) : activeTab === "Profile" ? (
            <ProfileSettings />
          ) : activeTab === "POS & Checkout" ? (
            <POSSettings />
          ) : activeTab === "Database & Import" ? (
            <BackupSettings />
          ) : (
            <div className="bg-card rounded-lg border border-border/55 p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-gray-300 mb-4">
                {(() => {
                  const Icon = tabs.find(t => t.name === activeTab)?.icon || SettingsIcon;
                  return <Icon className="w-6 h-6" />;
                })()}
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">{activeTab}</h3>
              <p className="text-muted-foreground text-xs font-semibold">Settings for {activeTab} are coming soon.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
