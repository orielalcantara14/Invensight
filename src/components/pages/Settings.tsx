import { Settings as SettingsIcon, Bell, Lock, LayoutGrid, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { api, type ProfileActivityItem } from "@/services/api";
import { getSession, setStoredTimeout } from "@/auth/session";
import { toast } from "sonner";
import { 
  ShieldCheck, History, Clock, KeyRound, Palette, Check, Monitor, 
  Sun, Moon, Save, Store, Percent, BrainCircuit, RotateCw, MapPin, Phone, FileText
} from "lucide-react";

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

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center gap-3">
        <Bell className="w-6 h-6 text-foreground" strokeWidth={2.5} />
        <h2 className="text-xl font-bold text-foreground">Notification Settings</h2>
      </div>
      <div className="p-6 space-y-4">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className="space-y-1">
              <p className="font-bold text-foreground text-sm">{t.label}</p>
              <p className="text-xs text-muted-foreground">Receive notifications for {t.label.toLowerCase()}</p>
            </div>
            <Switch
              checked={settings[t.key] ?? true}
              onCheckedChange={(val) => updateSetting(t.key, val)}
              className="data-[state=checked]:bg-cyan-500"
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
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ProfileActivityItem[]>([]);
  const [timeout, setTimeout] = useState("0");

  // Password state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadSecurityData();
    }
  }, [userId]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const [logData, settings] = await Promise.all([
        api.getSecurityLogs(userId!),
        api.get<Record<string, any>>("/api/settings/user")
      ]);
      setLogs(logData);
      if (settings?.session_timeout) {
        setTimeout(settings.session_timeout);
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
      setStoredTimeout(parseInt(val));
      toast.success("Session timeout updated");
    } catch (e) {
      toast.error("Failed to update timeout");
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading security settings...</div>;

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <KeyRound className="w-5 h-5 text-foreground" />
          <h2 className="text-xl font-bold text-foreground">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Current Password</label>
              <input
                type="password"
                required
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="w-full rounded-xl border border-border p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">New Password</label>
              <input
                type="password"
                required
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full rounded-xl border border-border p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full rounded-xl border border-border p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
          </div>
          
          {/* Password Requirements */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground">Password Requirements</h3>
            <ul className="space-y-2">
              {requirements.map((req, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs font-medium transition-colors">
                  <div className={`w-2 h-2 rounded-full ${req.met ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                  <span className={req.met ? 'text-foreground' : 'text-muted-foreground/70'}>{req.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwdLoading}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {pwdLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Session Timeout */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Clock className="w-5 h-5 text-foreground" />
          <h2 className="text-xl font-bold text-foreground">Session Management</h2>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-bold text-foreground text-sm">Inactivity Timeout</p>
            <p className="text-xs text-muted-foreground">Automatically log out after a period of inactivity</p>
          </div>
          <select
            value={timeout}
            onChange={(e) => handleTimeoutChange(e.target.value)}
            className="rounded-xl border border-border p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-card font-semibold"
          >
            <option value="0">Never</option>
            <option value="15">15 Minutes</option>
            <option value="30">30 Minutes</option>
            <option value="60">1 Hour</option>
            <option value="240">4 Hours</option>
            <option value="1440">24 Hours</option>
          </select>
        </div>
      </div>

      {/* Login History */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-foreground" />
          <h2 className="text-xl font-bold text-foreground">Security History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Action</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Details</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted-foreground">No security events found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-muted/50/50 transition-colors">
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.action === 'FAILED_LOGIN' || log.action === 'ACCOUNT_LOCKOUT'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground truncate max-w-xs">{log.details || '—'}</td>
                    <td className="p-4 text-muted-foreground/70 font-medium">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme, accentColor, setAccentColor, isCompact, setIsCompact } = useTheme();
  
  // Local state for "Save" functionality
  const [localTheme, setLocalTheme] = useState(theme);
  const [localAccent, setLocalAccent] = useState(accentColor);
  const [localCompact, setLocalCompact] = useState(isCompact);
  const [saving, setSaving] = useState(false);

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
      // Update global context (persists to localStorage)
      setTheme(localTheme);
      setAccentColor(localAccent);
      setIsCompact(localCompact);
      
      // Update backend
      await api.put("/api/settings/user", {
        theme: localTheme,
        accent_color: localAccent,
        compact_mode: localCompact,
      });
      
      toast.success("Appearance settings saved successfully");
    } catch (e) {
      toast.error("Failed to save settings to profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center gap-3">
        <Palette className="w-6 h-6 text-foreground" strokeWidth={2.5} />
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold text-foreground">Appearance Settings</h2>
          <p className="text-xs text-muted-foreground font-medium">Customize the look and feel of your dashboard</p>
        </div>
      </div>
      
      <div className="p-6 space-y-8">
        {/* Theme Selection */}
        <section className="space-y-4">
          <label className="text-sm font-bold text-foreground">Theme</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "light", label: "Light", icon: Sun, gradient: "from-blue-400 to-purple-500" },
              { id: "dark", label: "Dark", icon: Moon, iconFill: "fill-current", gradient: "from-gray-800 to-slate-900" },
              { id: "system", label: "Auto", icon: Monitor, gradient: "from-indigo-600 via-primary/90 to-purple-600" },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setLocalTheme(t.id as any);
                    setTheme(t.id as any);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 ${
                    localTheme === t.id 
                      ? "border-primary bg-primary/10/30 ring-4 ring-primary/10" 
                      : "border-border hover:border-border"
                  }`}
                >
                  <div className={`h-22 rounded-xl bg-gradient-to-br ${t.gradient} mb-3 shadow-lg group-hover:scale-[1.02] transition-transform`} />
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${localTheme === t.id ? "text-primary" : "text-foreground"}`}>
                      {t.label} {localTheme === t.id && "(Active)"}
                    </span>
                    <Icon className={`w-4 h-4 ${localTheme === t.id ? "text-primary" : "text-muted-foreground/70"}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Accent Color Selection */}
        <section className="space-y-4">
          <label className="text-sm font-bold text-foreground">Accent Color</label>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setLocalAccent(c.id);
                  setAccentColor(c.id);
                }}
                className={`relative w-10 h-10 rounded-full transition-all duration-300 border-2 overflow-hidden flex items-center justify-center ${
                  localAccent === c.id ? "border-gray-900 scale-110 shadow-lg" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              >
                {localAccent === c.id && (
                  <Check className="w-5 h-5 text-white drop-shadow-md" strokeWidth={4} />
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="h-px bg-muted" />

        {/* Compact Mode */}
        <section className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-bold text-foreground text-sm">Compact Mode</p>
            <p className="text-xs text-muted-foreground font-medium">Reduce spacing for more content visibility</p>
          </div>
          <Switch
            checked={localCompact}
            onCheckedChange={(val) => {
              setLocalCompact(val);
              setIsCompact(val);
            }}
            className="data-[state=checked]:bg-primary"
          />
        </section>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Appearance"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get<Record<string, string>>("/api/settings/system");
      setSettings(res);
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

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading system settings...</div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-foreground" strokeWidth={2.5} />
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold text-foreground">Global System Settings</h2>
              <p className="text-xs text-muted-foreground font-medium">Configure core parameters for the entire organization</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 shadow-md"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save All Changes"}
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Shop Identity */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-4 h-4 text-cyan-500" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Shop Identity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  Shop Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.shop_name || "Jonbrix"}
                    onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 pl-10 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-muted/20"
                  />
                  <Store className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground/60" />
                </div>
                <p className="text-[10px] text-muted-foreground/70">Displayed on the sidebar header and receipts.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  Shop Tagline
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.shop_tagline || "Motorcycle Parts & Accessories"}
                    onChange={(e) => setSettings({ ...settings, shop_tagline: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 pl-10 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-muted/20"
                  />
                  <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground/60" />
                </div>
                <p className="text-[10px] text-muted-foreground/70">Short description shown below the shop name in the sidebar.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  Contact Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.shop_contact || "+63 912 345 6789"}
                    onChange={(e) => setSettings({ ...settings, shop_contact: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 pl-10 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-muted/20"
                  />
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground/60" />
                </div>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  Business Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.shop_address || "Cebu City, Philippines"}
                    onChange={(e) => setSettings({ ...settings, shop_address: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 pl-10 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-muted/20"
                  />
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground/60" />
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-muted" />

          {/* Financial Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Financial & POS</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Sales Tax Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={parseFloat(settings.tax_rate || "0.03") * 100}
                    onChange={(e) => setSettings({ ...settings, tax_rate: (parseFloat(e.target.value) / 100).toString() })}
                    className="w-full rounded-xl border border-border p-3 pr-10 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-muted/20 font-mono"
                  />
                  <span className="absolute right-3.5 top-3.5 text-muted-foreground/60 font-bold">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Receipt Footer Note</label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.receipt_footer || "Thank you for shopping with us!"}
                    onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 pl-10 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-muted/20"
                  />
                  <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground/60" />
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-muted" />

          {/* Analytics Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <BrainCircuit className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">AI Analytics Engine</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                These values are pre-configured for optimal accuracy. Modifying them may affect forecasting reliability. Only change if you fully understand the impact.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground">Prediction Confidence (%)</label>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">Recommended: 99.9%</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  max="99.9"
                  min="50"
                  value={parseFloat(settings.forecast_confidence || "0.999") * 100}
                  onChange={(e) => setSettings({ ...settings, forecast_confidence: (parseFloat(e.target.value) / 100).toString() })}
                  className="w-full rounded-xl border border-border p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-muted/20"
                />
                <p className="text-[10px] text-muted-foreground/70">Controls the width of the prediction range on forecasting charts. Higher = wider, safer range.</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground">Forecast Horizon (Days)</label>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">Recommended: 30</span>
                </div>
                <input
                  type="number"
                  value={settings.forecast_horizon || "30"}
                  onChange={(e) => setSettings({ ...settings, forecast_horizon: e.target.value })}
                  className="w-full rounded-xl border border-border p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-muted/20"
                />
                <p className="text-[10px] text-muted-foreground/70">How many days into the future the AI predicts. Shorter = more accurate, longer = more planning time.</p>
              </div>
            </div>
          </section>
        </div>
      </form>

      {/* Maintenance */}
      <div className="bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/50 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <RotateCw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-orange-900 dark:text-orange-100">System Maintenance</h3>
            <p className="text-xs text-orange-800/70 dark:text-orange-400/70 max-w-md">
              Manually clear the analytics cache if you notice data discrepancies. 
              The system will re-calculate all forecasts on the next request.
            </p>
          </div>
        </div>
        <button
          onClick={clearCache}
          disabled={clearing}
          className="whitespace-nowrap flex items-center gap-2 bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${clearing ? "animate-spin" : ""}`} />
          {clearing ? "Clearing..." : "Force Refresh Cache"}
        </button>
      </div>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState("Display Theme");
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";

  const tabs = [
    { name: "Notifications", icon: Bell, description: "Alerts & preferences", accent: "from-blue-500 to-cyan-500", activeBg: "bg-blue-50 dark:bg-blue-950/30", activeText: "text-blue-600 dark:text-blue-400", activeBorder: "border-blue-500" },
    { name: "Security", icon: Lock, description: "Password & sessions", accent: "from-amber-500 to-orange-500", activeBg: "bg-amber-50 dark:bg-amber-950/30", activeText: "text-amber-600 dark:text-amber-400", activeBorder: "border-amber-500" },
    { name: "Display Theme", icon: LayoutGrid, description: "Appearance & colors", accent: "from-violet-500 to-purple-500", activeBg: "bg-violet-50 dark:bg-violet-950/30", activeText: "text-violet-600 dark:text-violet-400", activeBorder: "border-violet-500" },
    { name: "System", icon: Database, description: "AI engine & store info", accent: "from-emerald-500 to-teal-500", activeBg: "bg-emerald-50 dark:bg-emerald-950/30", activeText: "text-emerald-600 dark:text-emerald-400", activeBorder: "border-emerald-500" },
  ];

  const activeTabData = tabs.find(t => t.name === activeTab) || tabs[0];

  const toggleDarkMode = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header with gradient accent */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your InvenSight experience</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Redesigned Sidebar — Vertical pill rail with colored accents */}
        <aside className="w-full md:w-80 flex-shrink-0">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Sidebar header */}
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Configuration</p>
            </div>
            <nav className="p-2">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? `${tab.activeBg} ${tab.activeText}`
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {/* Active indicator strip */}
                    {isActive && (
                      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b ${tab.accent} transition-all`} />
                    )}
                    
                    {/* Icon with gradient background when active */}
                    <div className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-br ${tab.accent} shadow-lg shadow-current/10`
                        : "bg-muted/50 group-hover:bg-muted"
                    }`}>
                      <Icon className={`w-4.5 h-4.5 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} strokeWidth={2} />
                    </div>

                    {/* Text */}
                    <div className="text-left flex-1 min-w-0">
                      <p className={`text-sm font-bold leading-tight ${isActive ? "" : "text-foreground"}`}>{tab.name}</p>
                      <p className={`text-[10px] mt-0.5 truncate ${isActive ? "opacity-70" : "text-muted-foreground/70"}`}>{tab.description}</p>
                    </div>

                    {/* Active chevron */}
                    {isActive && (
                      <svg className={`w-4 h-4 shrink-0 ${tab.activeText}`} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === "Display Theme" ? (
            <AppearanceSettings />
          ) : activeTab === "Notifications" ? (
            <NotificationSettings />
          ) : activeTab === "Security" ? (
            <SecuritySettings />
          ) : activeTab === "System" ? (
            <SystemSettings />
          ) : (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 text-gray-300 mb-4">
                {(() => {
                  const Icon = tabs.find(t => t.name === activeTab)?.icon || SettingsIcon;
                  return <Icon className="w-8 h-8" />;
                })()}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{activeTab}</h3>
              <p className="text-muted-foreground text-sm">Settings for {activeTab} are coming soon.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
