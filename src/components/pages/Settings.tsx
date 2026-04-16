import { Settings as SettingsIcon, Bell, Lock, LayoutGrid, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { api, type ProfileActivityItem } from "@/services/api";
import { getSession, setStoredTimeout } from "@/auth/session";
import { toast } from "sonner";
import { ShieldCheck, History, Clock, KeyRound, Palette, Check, Monitor, Sun, Moon, Save } from "lucide-react";

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

export function Settings() {
  const [activeTab, setActiveTab] = useState("Display Theme");
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";

  const tabs = [
    { name: "Notifications", icon: Bell },
    { name: "Security", icon: Lock },
    { name: "Display Theme", icon: LayoutGrid },
    { name: "System", icon: Database },
  ];

  const toggleDarkMode = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-72 flex-shrink-0">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-3">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold ${
                      isActive
                        ? "bg-cyan-100 text-cyan-500"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-cyan-500" : "text-foreground"}`} strokeWidth={2.5} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          {activeTab === "Display Theme" ? (
            <AppearanceSettings />
          ) : activeTab === "Notifications" ? (
            <NotificationSettings />
          ) : activeTab === "Security" ? (
            <SecuritySettings />
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
