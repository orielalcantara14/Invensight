import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  Lock,
  MapPin,
  Pencil,
  Shield,
  User,
} from "lucide-react";
import { api, type Profile, type ProfileActivityItem } from "@/services/api";
import { getSession, setSession } from "@/auth/session";

function splitFullName(full: string): { first: string; last: string } {
  const t = full.trim();
  const i = t.indexOf(" ");
  if (i <= 0) return { first: t, last: "" };
  return { first: t.slice(0, i), last: t.slice(i + 1).trim() };
}

function joinFullName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim();
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
    const now = new Date();
    const diff = Math.floor(
      (now.getTime() - d.getTime()) / 86400000
    );
    if (diff < 0) return "Recently";
    if (diff === 0) return "Today";
    if (diff === 1) return "1 day ago";
    return `${diff} days ago`;
  } catch {
    return "—";
  }
}

const activityDotClass = ["bg-emerald-500", "bg-blue-500", "bg-violet-500"];

export function Profile() {
  const session = getSession();
  const userId = session?.user_id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<ProfileActivityItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

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
      const { first, last } = splitFullName(p.full_name);
      setFirstName(first);
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

  const handleSaveProfile = async () => {
    if (userId == null || !profile) return;
    setSaveError(null);
    const full_name = joinFullName(firstName, lastName);
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
      setEditing(false);
      const s = getSession();
      if (s) {
        setSession({
          ...s,
          full_name: updated.full_name,
          email: updated.email ?? null,
        });
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (userId == null) return;
    setPwdError(null);
    if (newPwd.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    setPwdSaving(true);
    try {
      await api.changePassword(userId, {
        current_password: currentPwd,
        new_password: newPwd,
      });
      setPwdOpen(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
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
        <p className="text-gray-600">Not signed in.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading profile…</p>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="p-8">
        <p className="text-red-600" role="alert">
          {loadError ?? "Profile unavailable."}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const displayName = profile.full_name.trim() || profile.username;
  const roleLabel = profile.role || "—";
  const locationShort =
    profile.address?.split("\n")[0]?.trim() ||
    profile.address?.trim() ||
    "—";

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-gray-600">
          View and manage your account information.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col items-center border-b border-gray-100 px-6 pb-6 pt-8">
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-violet-500 to-blue-600 text-white shadow-md ring-4 ring-white">
                  <User className="h-14 w-14" strokeWidth={1.5} />
                </div>
                <span
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow"
                  title="Photo upload is not available yet"
                  aria-hidden
                >
                  <Camera className="h-4 w-4" />
                </span>
              </div>
              <h2 className="mt-4 text-center text-lg font-semibold text-gray-900">
                {displayName}
              </h2>
              <p className="mt-1 text-center text-sm text-gray-500">
                {profile.email || "—"}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <Shield className="h-3.5 w-3.5" />
                {roleLabel}
              </span>
            </div>
            <ul className="divide-y divide-gray-100 px-6 py-4 text-sm">
              <li className="flex justify-between gap-4 py-3">
                <span className="text-gray-500">Member since</span>
                <span className="text-right font-medium text-gray-900">
                  {formatMemberSince(profile.created_date)}
                </span>
              </li>
              <li className="flex items-start justify-between gap-4 py-3">
                <span className="flex items-center gap-1 text-gray-500">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  Location
                </span>
                <span className="max-w-[60%] text-right font-medium text-gray-900">
                  {locationShort}
                </span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Profile information
              </h3>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setSaveError(null);
                      const { first, last } = splitFullName(profile.full_name);
                      setFirstName(first);
                      setLastName(last);
                      setEmail(profile.email ?? "");
                      setAddress(profile.address ?? "");
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveProfile()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              )}
            </div>

            {saveError ? (
              <p className="mb-4 text-sm text-red-600" role="alert">
                {saveError}
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  First name
                </label>
                {editing ? (
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {splitFullName(profile.full_name).first || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Last name
                </label>
                {editing ? (
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {splitFullName(profile.full_name).last || "—"}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Email address
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {profile.email?.trim() || "—"}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Address
                </label>
                {editing ? (
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                    {profile.address?.trim() || "—"}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Security settings
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">Password</p>
                  <p className="text-sm text-gray-500">
                    Last changed {passwordChangedLabel(profile.password_changed_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPwdOpen(true);
                    setPwdError(null);
                  }}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Change password
                </button>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Two-factor authentication
                  </p>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  title="Not available yet"
                  className="shrink-0 cursor-not-allowed rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-400"
                >
                  Enable 2FA
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Recent activity
            </h3>
            {activity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity yet.</p>
            ) : (
              <ul className="space-y-4">
                {activity.map((item, i) => (
                  <li
                    key={item.log_id}
                    className="flex gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                        activityDotClass[i % activityDotClass.length]
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.action}
                      </p>
                      {item.details ? (
                        <p className="mt-0.5 text-sm text-gray-600">
                          {item.details}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-gray-400">
                        {formatActivityTime(item.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {pwdOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwd-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="pwd-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Change password
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your current password and choose a new one.
            </p>
            {pwdError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {pwdError}
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">
                  Current password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">
                  New password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">
                  Confirm new password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPwdOpen(false);
                  setPwdError(null);
                  setCurrentPwd("");
                  setNewPwd("");
                  setConfirmPwd("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pwdSaving}
                onClick={() => void handleChangePassword()}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                {pwdSaving ? "Updating…" : "Update password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
