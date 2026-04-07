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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clearSession, getSession } from "@/auth/session";
import { api } from "@/services/api";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const displayName = session?.full_name?.trim() || session?.username || "User";
  const roleLabel = session?.role || "—";

  useEffect(() => {
    const currentRole = (session?.role ?? "").trim().toLowerCase();
    if (currentRole === "cashier") {
      navigate("/pos", { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get<{is_read: boolean}[]>("/api/notifications");
        setUnreadCount(res.filter((n) => !n.is_read).length);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCount();
    const inv = setInterval(fetchCount, 30000);
    return () => clearInterval(inv);
  }, []);

  const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Products", path: "/products", icon: PackageSearch },
    { name: "Suppliers", path: "/suppliers", icon: Truck },
    { name: "Orders", path: "/orders", icon: FileText },
    { 
      name: "Analytics", 
      path: "/analytics",
      icon: TrendingUp,
      submenu: [
        { name: "Forecasting", path: "/forecasting", icon: TrendingUp },
        { name: "Stock Prediction", path: "/stock-prediction", icon: AlertTriangle }
      ]
    },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { 
      name: "User Management", 
      path: "/user-management",
      icon: Users,
      submenu: [
        { name: "Users & Roles", path: "/users", icon: Users },
        { name: "Audit Log", path: "/audit-log", icon: Settings },
        { name: "Archive", path: "/archive", icon: Archive },
      ]
    },
  ];

  const hasPermission = (menuName: string) => {
    if (session?.username?.toLowerCase() === "rootadminnginamo") return true;
    const currentRole = (session?.role ?? "").trim().toLowerCase();
    if (currentRole === "cashier") return false;

    if (menuName === "Dashboard" || menuName === "Analytics" || menuName === "User Management") return true; // Let submenu handle inner blocks
    
    const nameMap: Record<string, string> = {
      "Orders": "Purchase Order",
      "Users & Roles": "Role Permissions" // or "User Management"
    };
    
    const target = nameMap[menuName] || menuName;
    
    // If we have User Management, the submenus are "Users & Roles" and "Audit Log".
    if (menuName === "Users & Roles") {
        const p1 = session?.permissions?.["User Management"];
        const p2 = session?.permissions?.["Role Permissions"];
        const canView1 = p1?.some(a => a.toLowerCase() === "view");
        const canView2 = p2?.some(a => a.toLowerCase() === "view");
        return canView1 || canView2;
    }

    // Archive is accessible to Administrators and Root Admin
    if (menuName === "Archive") {
      return true;
    }

    const actions = session?.permissions?.[target];
    if (actions) return actions.some(a => a.toLowerCase() === "view");

    return false;
  };

  const filteredNavigation = navigation.map(item => {
    if (item.submenu) {
      const filteredSub = item.submenu.filter(sub => hasPermission(sub.name));
      return { ...item, submenu: filteredSub };
    }
    return item;
  }).filter(item => {
    if (item.submenu) return item.submenu.length > 0;
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg text-gray-900">Jonbrix</h1>
                <p className="text-xs text-gray-500">Motorcycle Parts & Accessories</p>
                {session && (
                  <p className="text-xs text-gray-400 mt-2 truncate" title={session.full_name}>
                    {session.full_name}
                    {session.role ? ` · ${session.role}` : ""}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded text-gray-500"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.path ? location.pathname === item.path : false;
            const isExpanded = expandedMenus.includes(item.name);
            const hasSubmenu = !!item.submenu;
            
            return (
              <div key={item.name}>
                {/* Main menu item */}
                <div className="relative">
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm font-medium flex-1">{item.name}</span>}
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
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-600 hover:bg-red-50 hover:text-red-600 w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
          {sidebarOpen && (
            <div className="text-xs text-gray-400 mt-4">
              <p>© 2026 Jonbrix</p>
              <p>Version 1.0</p>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header — profile, notifications, settings */}
        <header className="flex h-16 flex-shrink-0 items-center justify-end gap-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Single profile card: avatar, name, role, notifications (matches profile page reference) */}
            <div className="flex items-center gap-0 rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-2 shadow-sm sm:pl-4 sm:pr-3">
              <Link
                to="/profile"
                className="flex min-w-0 max-w-[min(100vw-12rem,16rem)] items-center gap-3 pr-2 transition-colors hover:opacity-90 sm:max-w-[18rem]"
                title="My profile"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-violet-500 to-blue-600 text-white shadow-sm ring-2 ring-white">
                  <User className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="truncate text-sm font-semibold leading-tight text-gray-900">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500">{roleLabel}</p>
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
