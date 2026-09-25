import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Pencil,
  Shield,
  User,
} from "lucide-react";
import { api, API_URL, type Profile as ProfileType, type ProfileActivityItem } from "@/services/api";
import { getSession, setSession } from "@/auth/session";
import { cn } from "@/lib/utils";
import { EmailVerificationModal } from "@/components/modals/EmailVerificationModal";
import { toast } from "sonner";

const getAvatarUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}${path}`;
};

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

export function formatDisplayFullName(full?: string | null): string {
  if (!full) return "";
  const t = full.trim();
  if (t.includes(",")) {
    const { first, middle, last } = splitFullName(t);
    const mid = middle ? (middle.length === 1 ? `${middle}.` : middle) : "";
    if (first && last) {
      return mid ? `${first} ${mid} ${last}` : `${first} ${last}`;
    }
    return [first, mid, last].filter(Boolean).join(" ") || t;
  }
  return t;
}

function formatMemberSince(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatActivityTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (isToday) return `Today at ${time}`;
    if (isYesterday) return `Yesterday at ${time}`;
    return (
      d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + ` at ${time}`
    );
  } catch {
    return iso;
  }
}

function passwordChangedLabel(iso: string | null): string {
  if (!iso) return "Never changed";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Never changed";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000) return "Just now";
    if (diffMs < 3600000) {
      const mins = Math.floor(diffMs / 60000);
      return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
    }
    if (diffMs < 86400000 && d.getDate() === now.getDate()) {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
    }
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  } catch {
    return "Never changed";
  }
}

export function Profile() {
  const session = getSession();
  const userId = session?.user_id;

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [activity, setActivity] = useState<ProfileActivityItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [pendingNewEmail, setPendingNewEmail] = useState("");

  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  const load = useCallback(async () => {
    if (userId == null) return;
    setLoadError(null);
    try {
      const [p, a] = await Promise.all([
        api.getProfile(userId),
        api.getProfileActivity(userId, 10),
      ]);
      setProfile(p);
      setActivity(a);
      const { first, middle, last } = splitFullName(p.full_name);
      setFirstName(first);
      setMiddleName(middle);
      setLastName(last);
      setEmail(p.email ?? "");
      setAddress(p.address ?? "");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

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
      toast.success("Email address updated successfully.");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Email verification failed");
      return false;
    }
  };

  const handleSaveProfile = async () => {
    if (userId == null || !profile) return;
    setSaveError(null);
    const full_name = joinFullName(firstName, middleName, lastName);
    if (!full_name) {
      setSaveError("Enter a first or last name.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile(userId, {
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
        toast.success("Profile updated successfully.");
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || userId == null) return;

    setUploading(true);
    try {
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
      toast.success("Avatar updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (userId == null) return;
    setPwdError(null);
    const requirements = [
      { label: "Minimum 8 characters", met: newPwd.length >= 8 },
      { label: "At least one uppercase letter", met: /[A-Z]/.test(newPwd) },
      { label: "At least one number", met: /[0-9]/.test(newPwd) },
      { label: "At least one special character", met: /[^a-zA-Z0-9]/.test(newPwd) },
    ];

    const unmet = requirements.filter((r) => !r.met);
    if (unmet.length > 0) {
      setPwdError(`Missing: ${unmet.map((r) => r.label).join(", ")}`);
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    setPwdSaving(true);
    try {
      await api.changePassword({
        current_password: currentPwd,
        new_password: newPwd,
      }, userId);
      setPwdOpen(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      toast.success("Password changed successfully.");
      await load();
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setPwdSaving(false);
    }
  };

  if (userId == null) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Not signed in.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="p-8 text-center max-w-sm mx-auto">
        <p className="text-red-650 text-xs font-semibold uppercase tracking-wider mb-4" role="alert">
          {loadError ?? "Profile unavailable."}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="w-full py-2 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const displayName = formatDisplayFullName(profile.full_name) || profile.username;
  const roleLabel = profile.role || "—";
  const locationShort =
    profile.address?.split("\n")[0]?.trim() ||
    profile.address?.trim() ||
    "—";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Toast / status messages handled via sonner toast */}
      
      {/* Page Title */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and personal preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Summary Card */}
        <aside className="lg:col-span-4">
          <div className="overflow-hidden rounded-lg border border-border/55 bg-card shadow-xs">
            <div className="p-6 text-center">
              <div className="relative mx-auto mb-4 h-24 w-24">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-border/55 bg-muted/20 text-muted-foreground shadow-sm">
                  {profile.avatar_url && !avatarImgError ? (
                    <img
                      src={getAvatarUrl(profile.avatar_url)}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      onError={() => setAvatarImgError(true)}
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground/60" strokeWidth={1.75} />
                  )}
                </div>
                <label
                  htmlFor="avatar-file-input"
                  className={cn(
                    "absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm border border-border/50 transition-transform hover:scale-105",
                    uploading && "pointer-events-none opacity-60"
                  )}
                  title="Upload profile picture"
                >
                  <Camera className="h-4 w-4" />
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploading}
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              <h2 className="text-lg font-bold text-foreground">
                {displayName}
              </h2>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">{roleLabel}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Shield className="h-3 w-3 text-muted-foreground/70" />
                  {profile.role || "User"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>
            <ul className="divide-y divide-border/40 px-5 py-2 text-xs font-semibold text-muted-foreground">
              <li className="flex justify-between gap-4 py-3">
                <span>Member since</span>
                <span className="text-right font-mono text-foreground">
                  {formatMemberSince(profile.created_date)}
                </span>
              </li>
              <li className="flex items-start justify-between gap-4 py-3">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  Location
                </span>
                <span className="max-w-[60%] text-right text-foreground">
                  {locationShort}
                </span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Main Details Panel */}
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-lg border border-border/55 bg-card p-6 shadow-xs">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Profile information
              </h3>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => {
                    const { first, middle, last } = splitFullName(profile.full_name);
                    setFirstName(first);
                    setMiddleName(middle);
                    setLastName(last);
                    setEmail(profile.email ?? "");
                    setAddress(profile.address ?? "");
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-2 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors border border-border/50 shadow-xs cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit profile
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setSaveError(null);
                      const { first, middle, last } = splitFullName(profile.full_name);
                      setFirstName(first);
                      setMiddleName(middle);
                      setLastName(last);
                      setEmail(profile.email ?? "");
                      setAddress(profile.address ?? "");
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 border border-border/50 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveProfile()}
                    className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-50 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-lg border border-border/50 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              )}
            </div>

            {saveError ? (
              <p className="mb-4 text-xs font-semibold text-red-650" role="alert">
                {saveError}
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  First name
                </label>
                {editing ? (
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Chris Dennis"
                    className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                  />
                ) : (
                  <p className="mt-1.5 text-xs font-semibold text-foreground">
                    {splitFullName(profile.full_name).first || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Middle name / Initial
                </label>
                {editing ? (
                  <input
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="e.g. Limon or L."
                    className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                  />
                ) : (
                  <p className="mt-1.5 text-xs font-semibold text-foreground">
                    {splitFullName(profile.full_name).middle || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Last name / Surname
                </label>
                {editing ? (
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Logatoc"
                    className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                  />
                ) : (
                  <p className="mt-1.5 text-xs font-semibold text-foreground">
                    {splitFullName(profile.full_name).last || "—"}
                  </p>
                )}
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email address
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                  />
                ) : (
                  <p className="mt-1.5 text-xs font-semibold text-foreground font-mono">
                    {profile.email?.trim() || "—"}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Address
                </label>
                {editing ? (
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
                  />
                ) : (
                  <p className="mt-1.5 text-xs font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                    {profile.address?.trim() || "—"}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="rounded-lg border border-border/55 bg-card p-6 shadow-xs">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Security settings
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide">Password</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last changed {passwordChangedLabel(profile.password_changed_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPwdOpen(true);
                    setPwdError(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-900 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-border/50 rounded-lg transition-colors shadow-xs"
                >
                  Change password
                </button>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="rounded-lg border border-border/55 bg-card p-6 shadow-xs">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Recent activity
            </h3>
            {activity.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No recent activity yet.</p>
            ) : (
              <div className="max-h-[360px] overflow-y-auto pr-2 scrollbar-thin">
                <ul className="space-y-4">
                  {activity.map((item) => (
                    <li
                      key={item.log_id}
                      className="flex gap-3 border-b border-border/40 pb-4 last:border-0 last:pb-0"
                    >
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">
                          {item.action}
                        </p>
                        {item.details ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.details}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-muted-foreground/75 font-mono">
                          {formatActivityTime(item.timestamp)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      {pwdOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwd-dialog-title"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-4 sm:p-6 border border-border/50 shadow-lg">
            <h2
              id="pwd-dialog-title"
              className="text-lg font-bold text-foreground uppercase tracking-tight"
            >
              Change password
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your current password and choose a new one.
            </p>
            {pwdError ? (
              <p className="mt-3 text-xs font-semibold text-red-655" role="alert">
                {pwdError}
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Current password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? "text" : "password"}
                    autoComplete="current-password"
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

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? "text" : "password"}
                    autoComplete="new-password"
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

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">
                    Confirm new password
                  </label>
                  {confirmPwd && (
                    <span className={cn("text-[10px] font-bold", confirmPwd === newPwd ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                      {confirmPwd === newPwd ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? "text" : "password"}
                    autoComplete="new-password"
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
            <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password Requirements</h3>
              <ul className="space-y-2">
                {[
                  { label: "Minimum 8 characters", met: newPwd.length >= 8 },
                  { label: "At least one uppercase letter", met: /[A-Z]/.test(newPwd) },
                  { label: "At least one number", met: /[0-9]/.test(newPwd) },
                  { label: "At least one special character", met: /[^a-zA-Z0-9]/.test(newPwd) },
                ].map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-[10px] font-bold uppercase transition-colors">
                    <div className={cn("w-1.5 h-1.5 rounded-full", req.met ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-300')} />
                    <span className={req.met ? 'text-foreground' : 'text-muted-foreground/70'}>{req.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPwdOpen(false);
                  setPwdError(null);
                  setCurrentPwd("");
                  setNewPwd("");
                  setConfirmPwd("");
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 border border-border/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pwdSaving}
                onClick={() => void handleChangePassword()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-50 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-lg border border-border/50 transition-colors disabled:opacity-60"
              >
                <Lock className="h-3.5 w-3.5" />
                {pwdSaving ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
