import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  Menu,
  Users,
  FileText,
  Truck,
  Settings,
  History,
  BarChart3,
  PackageSearch,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Bell,
  User,
  Archive,
  Trash2,
  Wrench,
  UserCheck,
  X,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { clearSession, getSession, getLastActivity, setLastActivity, getStoredTimeout, setStoredTimeout, DEFAULT_TIMEOUT_BY_ROLE } from "@/auth/session";
import { api, API_URL } from "@/services/api";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const getAvatarUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}${path}`;
};

function formatDisplayFullName(full?: string | null): string {
  if (!full) return "";
  const t = full.trim();
  if (t.includes(",")) {
    const [sn, ...restArr] = t.split(",");
    const last = (sn || "").trim();
    const rest = restArr.join(",").trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return last;
    if (parts.length === 1) return `${parts[0]} ${last}`;
    const middle = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(" ");
    const mid = middle.length === 1 ? `${middle}.` : middle;
    return `${first} ${mid} ${last}`;
  }
  return t;
}

function formatCountdown(sec: number): string {
  if (sec <= 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [session, setSessionState] = useState(getSession());
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shopName, setShopName] = useState("Jonbrix");
  const [shopTagline, setShopTagline] = useState("Motorcycle Parts & Accessories");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const { brandTitle, brandSubtitle } = (() => {
    const raw = (shopName || "Jonbrix").trim();
    if (/^jonbrix/i.test(raw)) {
      const remainder = raw.replace(/^jonbrix/i, "").trim().replace(/^[-–—:]/, "").trim();
      return {
        brandTitle: "Jonbrix",
        brandSubtitle: remainder || shopTagline || "Motorcycle Parts & Accessories"
      };
    }
    return {
      brandTitle: raw,
      brandSubtitle: shopTagline || ""
    };
  })();

  useEffect(() => {
    setAvatarImgError(false);
  }, [session?.avatar_url]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const forceLogout = useCallback(async (isTimeout = false) => {
    setIsLoggingOut(true);
    const uid = session?.user_id;
    if (uid) {
      try {
        await api.logout(uid, isTimeout ? "Inactivity timeout" : "Manual logout");
      } catch {}
    }
    clearSession();
    setShowLogoutModal(false);
    setIsLoggingOut(false);
    if (isTimeout) {
      toast.warning("You have been logged out due to inactivity.", { id: "inactivity-timeout" });
    }
    navigate("/login", { replace: true });
  }, [session?.user_id, navigate]);

  const confirmLogout = useCallback(() => {
    void forceLogout(false);
  }, [forceLogout]);

  const handleLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const displayName = formatDisplayFullName(session?.full_name) || session?.username || "User";
  const roleLabel = session?.role || "—";

  useEffect(() => {
    const currentRole = (session?.role ?? "").trim().toLowerCase();
    if (currentRole === "cashier") {
      navigate("/pos", { replace: true });
    }
  }, [session, navigate]);

  // Close sidebar on initial mobile load
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const [activeMaintenance, setActiveMaintenance] = useState<{ is_active: boolean; target_time?: string; minutes?: number; message?: string; seconds_remaining: number } | null>(null);

  // Fetch shop identity from system settings
  useEffect(() => {
    const fetchShopIdentity = async () => {
      try {
        const res = await api.get<Record<string, string>>("/api/settings/system");
        if (res.shop_name) setShopName(res.shop_name);
        if (res.shop_tagline) setShopTagline(res.shop_tagline);
      } catch (e) {
        // Defaults remain
      }
    };
    fetchShopIdentity();
  }, []);

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const res = await api.get<{ is_active: boolean; target_time?: string; minutes?: number; message?: string; seconds_remaining?: number }>("/api/notifications/active-maintenance");
        const dismissed = sessionStorage.getItem("dismissed_maintenance_target");
        if (res && res.is_active && (!dismissed || (res.target_time && dismissed !== res.target_time))) {
          setActiveMaintenance({
            is_active: true,
            target_time: res.target_time,
            minutes: res.minutes,
            message: res.message || "Scheduled system update is starting soon.",
            seconds_remaining: res.seconds_remaining ?? 0,
          });
        } else {
          setActiveMaintenance(null);
        }
      } catch {
        // Ignore
      }
    };

    const fetchCount = async () => {
      try {
        fetchMaintenance();
        const res = await api.get<{is_read: boolean, type: string, message: string, notification_id: number}[]>("/api/notifications/");
        setUnreadCount(res.filter((n) => !n.is_read).length);

        // Notify user of any unread security alerts
        const unreadSecurityAlerts = res.filter((n) => n.type === "security_alert" && !n.is_read);
        unreadSecurityAlerts.forEach((n) => {
          const toastId = `security-alert-${n.notification_id}`;
          toast.error(n.message, {
            id: toastId,
            duration: 30000,
            action: {
              label: "Acknowledge",
              onClick: async () => {
                try {
                  await api.put(`/api/notifications/${n.notification_id}/read`);
                  fetchCount();
                } catch {
                  // Ignore
                }
              },
            },
          });
        });

        // Notify user of any unread system update announcements
        const unreadUpdates = res.filter((n) => n.type === "system_update" && !n.is_read);
        unreadUpdates.forEach((n) => {
          const toastId = `system-update-${n.notification_id}`;
          toast.info(n.message, {
            id: toastId,
            duration: 15000,
            action: {
              label: "Dismiss",
              onClick: async () => {
                try {
                  await api.put(`/api/notifications/${n.notification_id}/read`);
                  fetchCount();
                } catch (e) {
                  // Ignore
                }
              },
            },
          });
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchCount();
    const inv = setInterval(fetchCount, 15000);

    // Heartbeat to maintain active session
    if (session?.user_id) {
      api.heartbeat(session.user_id).catch(() => {});
    }
    const heartbeatInv = setInterval(() => {
      if (session?.user_id) {
        api.heartbeat(session.user_id).catch(() => {});
      }
    }, 45000);

    const handleNotificationsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.unreadCount === "number") {
        setUnreadCount(customEvent.detail.unreadCount);
      }
    };
    window.addEventListener("invensight_notifications_updated", handleNotificationsUpdate);

    return () => {
      clearInterval(inv);
      clearInterval(heartbeatInv);
      window.removeEventListener("invensight_notifications_updated", handleNotificationsUpdate);
    };
  }, []);

  // Tick down seconds remaining in real time
  useEffect(() => {
    if (!activeMaintenance?.is_active) return;
    const timer = setInterval(() => {
      setActiveMaintenance((prev) => {
        if (!prev || !prev.is_active) return null;
        const nextSec = prev.seconds_remaining - 1;
        return { ...prev, seconds_remaining: Math.max(0, nextSec) };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeMaintenance?.is_active]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setSessionState(getSession());
    };
    window.addEventListener("invensight_profile_updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("invensight_profile_updated", handleProfileUpdate);
    };
  }, []);

  // --- Inactivity Timeout Tracker (Cross-Tab Synced) ---
  useEffect(() => {
    if (!session) return;

    // Load initial timeout
    const loadTimeout = async () => {
      try {
        const currentRole = (session?.role ?? "").trim().toLowerCase();
        const roleDefault = DEFAULT_TIMEOUT_BY_ROLE[currentRole] ?? (currentRole === "cashier" ? 15 : 120);

        const [settings, sysSettings] = await Promise.all([
          api.get<Record<string, any>>("/api/settings/user").catch(() => ({})),
          api.get<Record<string, string>>("/api/settings/system").catch(() => ({}))
        ]);
        
        let timeoutLimit: number;
        if (currentRole === "cashier") {
          if (sysSettings?.cashier_session_timeout !== undefined && sysSettings.cashier_session_timeout !== "") {
            timeoutLimit = parseInt(sysSettings.cashier_session_timeout, 10);
          } else if (settings?.session_timeout !== undefined && settings.session_timeout !== "default") {
            timeoutLimit = parseInt(settings.session_timeout, 10);
          } else {
            timeoutLimit = 15;
          }
        } else {
          if (settings?.session_timeout !== undefined && settings.session_timeout !== "default") {
            timeoutLimit = parseInt(settings.session_timeout, 10);
          } else {
            timeoutLimit = roleDefault;
          }
        }

        setStoredTimeout(isNaN(timeoutLimit) ? roleDefault : timeoutLimit);
      } catch (e) {
        console.error("Failed to load timeout setting", e);
      }
    };
    loadTimeout();

    // Always initialize fresh activity on mount
    setLastActivity();

    const checkTimeout = () => {
      const currentRole = (session?.role ?? "").trim().toLowerCase();
      const stored = getStoredTimeout();
      const roleDefault = DEFAULT_TIMEOUT_BY_ROLE[currentRole] ?? (currentRole === "cashier" ? 15 : 120);
      const timeoutMinutes = stored !== null ? stored : roleDefault;

      if (timeoutMinutes <= 0) return;

      const now = Date.now();
      const lastActivity = getLastActivity();
      const inactiveMs = now - lastActivity;
      const timeoutMs = timeoutMinutes * 60 * 1000;

      if (inactiveMs >= timeoutMs) {
        console.log("Session timed out after", timeoutMinutes, "minutes");
        forceLogout(true);
      }
    };

    let lastActivityLogged = 0;
    const handleActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 2 seconds
      if (now - lastActivityLogged > 2000) {
        lastActivityLogged = now;
        setLastActivity();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      // If session was cleared in another tab, redirect
      if (e.key === "invensight_session" && !e.newValue) {
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("mousedown", handleActivity, { passive: true });
    window.addEventListener("keypress", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("focus", checkTimeout);
    document.addEventListener("visibilitychange", checkTimeout);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("invensight_settings_updated", loadTimeout);

    const interval = setInterval(checkTimeout, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("focus", checkTimeout);
      document.removeEventListener("visibilitychange", checkTimeout);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("invensight_settings_updated", loadTimeout);
      clearInterval(interval);
    };
  }, [session, navigate, forceLogout]);

  interface NavigationItem {
    name: string;
    path: string;
    icon: any;
    submenu?: NavigationItem[];
  }

  const navigation: NavigationItem[] = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Services", path: "/mechanics", icon: Wrench },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Products (Master List)", path: "/products", icon: PackageSearch },
    { name: "Suppliers", path: "/suppliers", icon: Truck },
    { name: "Orders and Return", path: "/orders", icon: FileText },
    { name: "Forecasting", path: "/forecasting", icon: TrendingUp },
    { name: "Stock Prediction", path: "/stock-prediction", icon: AlertTriangle },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Archive", path: "/archive", icon: Archive },
    { name: "Users & Roles", path: "/users", icon: Users },
    { name: "Audit Log", path: "/audit-log", icon: History },
  ];

  const hasPermission = (menuName: string) => {
    if (session?.is_root_admin) return true;
    const currentRole = (session?.role ?? "").trim().toLowerCase();
    
    // Cashiers are restricted solely to POS terminal
    if (currentRole === "cashier") {
        return menuName === "Sales"; // Or just return false if handled by POS-only UI
    }

    // Dashboard and High-level categories are allowed if sub-actions or specific view exists
    if (menuName === "Dashboard") {
        const p = session?.permissions?.["Dashboard"];
        return p?.some(a => a.toLowerCase() === "view");
    }

    // Direct module check using "View" action
    const nameMap: Record<string, string> = {
      "Orders and Return": "Orders",
      "Users & Roles": "User Management",
      "Audit Log": "Audit Log",
      "Archive": "Archive",
      "Reports": "Reports",
      "Forecasting": "Forecasting",
      "Stock Prediction": "Stock Prediction",
      "Services": "Mechanic Services",
      "Products (Master List)": "Products"
    };
    
    const target = nameMap[menuName] || menuName;
    const actions = session?.permissions?.[target];
    
    return actions?.some(a => a.toLowerCase() === "view") || false;
  };

  const filteredNavigation = navigation
    .map((item) => {
      if (item.submenu) {
        const filteredSub = item.submenu.filter((sub) => hasPermission(sub.name));
        return { ...item, submenu: filteredSub };
      }
      return item;
    })
    .filter((item) => {
      if (item.submenu) return item.submenu.length > 0 || hasPermission(item.name);
      return hasPermission(item.name);
    });

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  const handleMenuClick = (menuName: string, hasSubmenu: boolean) => {
    if (hasSubmenu) {
      toggleMenu(menuName);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300 relative overflow-hidden">
      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/55 z-40 md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-r border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-300 flex flex-col shrink-0 z-50",
          "fixed inset-y-0 left-0 md:static md:translate-x-0",
          sidebarOpen 
            ? "w-[250px] translate-x-0" 
            : "w-[250px] -translate-x-full md:w-[76px]"
        )}
      >
        {/* Header — Brand section */}
        <div className={`border-b border-zinc-100 dark:border-zinc-900/80 transition-all duration-300 ${sidebarOpen ? "px-5 py-5" : "px-2 py-4"}`}>
          <div className="flex items-start justify-between gap-2">
            {sidebarOpen ? (
              <>
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-300 dark:to-indigo-400 bg-clip-text text-transparent block">
                    {brandTitle}
                  </span>
                  {brandSubtitle && (
                    <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tracking-tight leading-tight mt-0.5 break-words">
                      {brandSubtitle}
                    </p>
                  )}
                  {shopTagline && shopTagline.toLowerCase() !== brandSubtitle.toLowerCase() && (
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 leading-snug mt-1 line-clamp-2">
                      {shopTagline}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors shrink-0 cursor-pointer mt-0.5"
                  title="Close sidebar"
                >
                  <X className="w-4 h-4 md:hidden" />
                  <ChevronLeft className="w-4 h-4 hidden md:block" />
                </button>
              </>
            ) : (
              <div className="w-full flex flex-col items-center gap-2">
                <span className="font-black text-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-300 dark:to-indigo-400 bg-clip-text text-transparent">
                  J
                </span>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${sidebarOpen ? 'px-3.5 py-4' : 'px-2 py-4'}`}>
          {/* Section label */}
          {sidebarOpen && (
            <p className="px-3 mb-2.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Navigation
            </p>
          )}
          
          <div className="space-y-1.5">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.path ? location.pathname === item.path : false;
              const isExpanded = expandedMenus.includes(item.name);
              const hasSubmenu = !!item.submenu;
              
              // Add visual separators between logical groups
              const showDivider = sidebarOpen && (
                item.name === "Suppliers" || 
                item.name === "Reports" ||
                item.name === "Users & Roles"
              );
              
              return (
                <div key={item.name}>
                  {showDivider && (
                    <div className="my-3 mx-2.5 h-px bg-zinc-200/60 dark:bg-zinc-800/60" />
                  )}
                  <div className="relative group">
                    <Link
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={cn(
                        "flex items-center transition-all duration-200 relative group cursor-pointer",
                        sidebarOpen ? "gap-3 px-3.5 py-2.5 rounded-xl text-sm" : "justify-center w-11 h-11 mx-auto rounded-xl",
                        isActive
                          ? "bg-white dark:bg-zinc-800/90 text-zinc-950 dark:text-white font-semibold shadow-md shadow-zinc-200/70 dark:shadow-black/50 border border-zinc-200/80 dark:border-zinc-700/60"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 font-medium"
                      )}
                    >
                      <Icon
                        className={cn(
                          "shrink-0 transition-transform duration-200",
                          sidebarOpen ? "w-[18px] h-[18px]" : "w-5 h-5",
                          isActive ? "text-violet-600 dark:text-violet-400 scale-105" : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                        )}
                        strokeWidth={isActive ? 2.2 : 1.75}
                      />
                      
                      {sidebarOpen && (
                        <span className="flex-1 truncate">
                          {item.name}
                        </span>
                      )}
                      
                      {sidebarOpen && hasSubmenu && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleMenu(item.name);
                          }}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded-md transition-colors"
                        >
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 shrink-0 transition-transform text-zinc-400",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      )}
                    </Link>
                    
                    {/* Tooltip for collapsed sidebar */}
                    {!sidebarOpen && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:flex items-center pointer-events-none">
                        <div className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-zinc-800 dark:border-zinc-200 whitespace-nowrap">
                          {item.name}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Submenu items */}
                  {hasSubmenu && sidebarOpen && isExpanded && (
                    <div className="mt-1 space-y-1 ml-5 pl-2 border-l border-zinc-200/70 dark:border-zinc-800/70">
                      {item.submenu!.map(subitem => {
                        const SubIcon = subitem.icon;
                        const isSubActive = location.pathname === subitem.path;
                        return (
                          <Link
                            key={subitem.path}
                            to={subitem.path}
                            onClick={() => {
                              if (window.innerWidth < 768) {
                                setSidebarOpen(false);
                              }
                            }}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all",
                              isSubActive
                                ? "bg-white dark:bg-zinc-800/80 text-zinc-950 dark:text-white font-semibold shadow-xs border border-zinc-200/60 dark:border-zinc-700/50"
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/30"
                            )}
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{subitem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className={`border-t border-zinc-100 dark:border-zinc-900/80 ${sidebarOpen ? 'p-3.5 space-y-1.5' : 'p-2 space-y-2'}`}>
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "flex items-center rounded-xl transition-all duration-150 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer",
              sidebarOpen ? "justify-between w-full px-3 py-2 text-xs font-semibold" : "justify-center w-11 h-11 mx-auto"
            )}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div className="flex items-center gap-2.5">
              {isDark ? (
                <Moon className="w-4 h-4 text-violet-400 shrink-0" strokeWidth={2} />
              ) : (
                <Sun className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2} />
              )}
              {sidebarOpen && <span>{isDark ? "Dark Mode" : "Light Mode"}</span>}
            </div>
            {sidebarOpen && (
              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full">
                {isDark ? "Dark" : "Light"}
              </span>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center rounded-xl transition-all duration-150 text-zinc-600 dark:text-zinc-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 cursor-pointer",
              sidebarOpen ? "gap-2.5 px-3 py-2 w-full text-xs font-semibold" : "w-11 h-11 mx-auto justify-center"
            )}
            title="Logout"
          >
            <LogOut className="w-4 h-4 shrink-0 transition-colors" strokeWidth={1.8} />
            {sidebarOpen && <span>Logout</span>}
          </button>

          {sidebarOpen && (
            <div className="flex items-center gap-1.5 px-3 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">© 2026 Jonbrix · v1.0</p>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* System Maintenance / Update Real-Time Live Countdown Banner */}
        {activeMaintenance && activeMaintenance.is_active && (
          <div className="bg-amber-500/15 dark:bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5 font-medium">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800 dark:text-amber-300">
                {activeMaintenance.seconds_remaining > 0 ? "⚡ Scheduled System Update" : "🚨 Update In Progress"}
              </span>
              <span className="font-mono font-bold bg-amber-500/25 px-2 py-0.5 rounded text-amber-950 dark:text-amber-100 border border-amber-500/30">
                {formatCountdown(activeMaintenance.seconds_remaining)}
              </span>
              <span className="truncate max-w-[500px] text-zinc-600 dark:text-zinc-400 hidden sm:inline text-[11px]">
                • {activeMaintenance.message}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (activeMaintenance?.target_time) {
                    sessionStorage.setItem("dismissed_maintenance_target", activeMaintenance.target_time);
                  }
                  window.location.reload();
                }}
                className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
              >
                Reload App
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeMaintenance?.target_time) {
                    sessionStorage.setItem("dismissed_maintenance_target", activeMaintenance.target_time);
                  }
                  setActiveMaintenance(null);
                }}
                className="p-1 rounded-md hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 transition-colors cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Top header — profile, notifications, settings */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between gap-2 sm:gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md px-3 sm:px-6">
          {/* Left side mobile navigation toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="md:hidden font-extrabold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight truncate max-w-[100px] min-[400px]:max-w-[140px] hidden min-[340px]:inline-block">
              {brandTitle}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Single profile card: avatar, name, role, notifications (matches profile page reference) */}
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-border/40 bg-zinc-50/50 dark:bg-zinc-900/30 py-1 pl-2 sm:pl-3 pr-1.5">
              <Link
                to="/profile"
                className="flex min-w-0 max-w-[8rem] sm:max-w-[16rem] items-center gap-2 sm:gap-2.5 pr-1.5 sm:pr-2 transition-colors hover:opacity-90"
                title="My profile"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm border border-border/55">
                  {session?.avatar_url && !avatarImgError ? (
                    <img
                      src={getAvatarUrl(session.avatar_url)}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      onError={() => setAvatarImgError(true)}
                    />
                  ) : (
                    <User className="h-3.5 w-3.5" strokeWidth={2.2} />
                  )}
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="truncate text-xs font-semibold leading-none text-zinc-800 dark:text-zinc-200">
                    {displayName}
                  </p>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">{roleLabel}</p>
                </div>
              </Link>

              <div className="relative flex items-center">
                <Link
                  to="/notifications"
                  className="relative rounded-md p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" strokeWidth={2} />
                  {unreadCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>


            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-violet-600" />}
            </button>

            <Link
              to="/settings"
              className="rounded-lg p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Confirm Logout</h3>
                <p className="text-xs text-muted-foreground">Are you sure you want to log out?</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You will be signed out of your account on this device. Any unsaved changes or active drafts will be cleared.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-border/70 hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={confirmLogout}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
