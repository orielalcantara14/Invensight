import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
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
  Monitor,
  Bell,
  User,
  Archive,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clearSession, getSession, getLastActivity, setLastActivity, getStoredTimeout, setStoredTimeout } from "@/auth/session";
import { api } from "@/services/api";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shopName, setShopName] = useState("Jonbrix");
  const [shopTagline, setShopTagline] = useState("Motorcycle Parts & Accessories");

  const displayName = session?.full_name?.trim() || session?.username || "User";
  const roleLabel = session?.role || "—";

  useEffect(() => {
    const currentRole = (session?.role ?? "").trim().toLowerCase();
    if (currentRole === "cashier") {
      navigate("/pos", { replace: true });
    }
  }, [session, navigate]);

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
    const fetchCount = async () => {
      try {
        const res = await api.get<{is_read: boolean}[]>("/api/notifications/");
        setUnreadCount(res.filter((n) => !n.is_read).length);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCount();
    const inv = setInterval(fetchCount, 30000);
    return () => clearInterval(inv);
  }, []);

  // --- Inactivity Timeout Tracker (Cross-Tab Synced) ---
  useEffect(() => {
    if (!session) return;

    // Load initial timeout
    const loadTimeout = async () => {
      try {
        const settings = await api.get<Record<string, any>>("/api/settings/user");
        if (settings?.session_timeout) {
          setStoredTimeout(parseInt(settings.session_timeout));
        }
      } catch (e) {
        console.error("Failed to load timeout setting", e);
      }
    };
    loadTimeout();

    const handleActivity = () => {
      setLastActivity();
    };

    const handleStorageChange = (e: StorageEvent) => {
      // If session was cleared in another tab, redirect
      if (e.key === "invensight_session" && !e.newValue) {
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keypress", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(() => {
      const timeoutMinutes = getStoredTimeout();
      if (timeoutMinutes <= 0) return;

      const now = Date.now();
      const lastActivity = getLastActivity();
      const inactiveMs = now - lastActivity;
      const timeoutMs = timeoutMinutes * 60 * 1000;

      if (inactiveMs >= timeoutMs) {
        console.log("Session timed out after", timeoutMinutes, "minutes");
        handleLogout();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [session, navigate]);

  interface NavigationItem {
    name: string;
    path: string;
    icon: any;
    submenu?: NavigationItem[];
  }

  const navigation: NavigationItem[] = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Products", path: "/products", icon: PackageSearch },
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
    if (session?.username?.toLowerCase() === "rootadminnginamo") return true;
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
      "Stock Prediction": "Stock Prediction"
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

  const handleLogout = async () => {
    try {
      await api.logout(session?.user_id || 0);
    } catch (err) {
      console.error("Logout log failed:", err);
    }
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-[260px]" : "w-[72px]"
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col`}
      >
        {/* Header — Brand section */}
        <div className={`border-b border-sidebar-border transition-all duration-300 ${sidebarOpen ? "px-4 py-4" : "px-2 py-3"}`}>
          <div className="flex items-center justify-between gap-2">
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                    <span className="text-white font-black text-sm">{shopName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-bold text-base text-foreground leading-tight tracking-tight truncate">{shopName}</h1>
                    <p className="text-[10px] text-muted-foreground/70 font-medium truncate">{shopTagline}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors shrink-0"
                  title="Collapse sidebar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="w-full flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="text-white font-black text-sm">{shopName.charAt(0).toUpperCase()}</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                  title="Expand sidebar"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {sidebarOpen && session && (
            <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <p className="text-[10px] text-muted-foreground font-semibold truncate" title={session.full_name}>
                {session.full_name}
                {session.role ? ` · ${session.role}` : ""}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${sidebarOpen ? 'px-3 py-4' : 'px-2 py-4'}`}>
          {/* Section label */}
          {sidebarOpen && (
            <p className="px-3 mb-3 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">Navigation</p>
          )}
          
          <div className="space-y-0.5">
            {filteredNavigation.map((item, index) => {
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
                    <div className="my-3 mx-3 h-px bg-sidebar-border" />
                  )}
                  <div className="relative group">
                    <Link
                      to={item.path}
                      className={`flex items-center ${sidebarOpen ? 'gap-3 px-3' : 'justify-center'} py-2.5 rounded-xl transition-all duration-200 relative ${
                        isActive
                          ? "bg-primary/10 dark:bg-primary/15 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      {/* Active left indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                      )}
                      
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 shrink-0 ${
                        isActive 
                          ? "bg-primary text-white shadow-md shadow-primary/20" 
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}>
                        <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                      </div>
                      
                      {sidebarOpen && (
                        <span className={`text-[13px] flex-1 truncate ${isActive ? "font-bold" : "font-medium"}`}>
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
                          className="p-1 hover:bg-gray-200/50 rounded transition-colors"
                        >
                          <ChevronDown
                            className={`w-4 h-4 flex-shrink-0 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      )}
                    </Link>
                    
                    {/* Tooltip for collapsed sidebar */}
                    {!sidebarOpen && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:flex items-center pointer-events-none">
                        <div className="bg-foreground text-background text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                          {item.name}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Submenu items */}
                  {hasSubmenu && sidebarOpen && isExpanded && (
                    <div className="mt-1 space-y-1">
                      {item.submenu!.map(subitem => {
                        const SubIcon = subitem.icon;
                        const isSubActive = location.pathname === subitem.path;
                        return (
                          <Link
                            key={subitem.path}
                            to={subitem.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ml-6 ${
                              isSubActive
                                ? "bg-accent/20 text-foreground"
                                : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-foreground"
                            }`}
                          >
                            <SubIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium">{subitem.name}</span>
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
        <div className={`border-t border-sidebar-border ${sidebarOpen ? 'p-4' : 'p-2'}`}>
          <button
            onClick={handleLogout}
            className={`flex items-center ${sidebarOpen ? 'gap-3 px-3' : 'justify-center'} py-2.5 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 w-full group`}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors group-hover:bg-red-100 dark:group-hover:bg-red-900/30">
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </div>
            {sidebarOpen && <span className="text-[13px] font-medium">Logout</span>}
          </button>
          {sidebarOpen && (
            <div className="flex items-center gap-2 mt-3 px-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-muted-foreground/50 font-semibold">© 2026 Jonbrix · v1.0</p>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header — profile, notifications, settings */}
        <header className="flex h-16 flex-shrink-0 items-center justify-end gap-4 border-b border-header-border bg-header px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Single profile card: avatar, name, role, notifications (matches profile page reference) */}
            <div className="flex items-center gap-0 rounded-xl border border-header-border bg-card py-2 pl-3 pr-2 shadow-sm sm:pl-4 sm:pr-3">
              <Link
                to="/profile"
                className="flex min-w-0 max-w-[min(100vw-12rem,16rem)] items-center gap-3 pr-2 transition-colors hover:opacity-90 sm:max-w-[18rem]"
                title="My profile"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary/80 text-white shadow-sm ring-2 ring-white/20">
                  <User className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </Link>

              <div className="relative flex items-center">
                <Link
                  to="/notifications"
                  className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-50 hover:text-slate-800"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" strokeWidth={2} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>


            <Link
              to="/settings"
              className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
            </Link>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
