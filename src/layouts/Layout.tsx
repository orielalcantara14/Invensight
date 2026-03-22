import { Outlet, Link, useLocation } from "react-router";
import { LayoutDashboard, ShoppingCart, Package, TrendingUp, AlertTriangle, Menu, Users, FileText, Truck, Settings, History, BarChart3, PackageSearch, LogOut, ChevronDown, ChevronRight, Monitor } from "lucide-react";
import { useState } from "react";

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "POS Management", path: "/pos-management", icon: Monitor },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Products", path: "/products", icon: PackageSearch },
    { name: "Suppliers", path: "/suppliers", icon: Truck },
    { name: "Orders", path: "/orders", icon: FileText },
    { name: "Stock Movements", path: "/stock-movements", icon: History },
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
        { name: "Audit Log", path: "/audit-log", icon: Settings }
      ]
    },
  ];

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

  const handleLogout = () => {
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg">Jonbrix</h1>
                <p className="text-xs text-gray-400">Motorcycle Parts & Accessories</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
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
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm flex-1">{item.name}</span>}
                    {sidebarOpen && hasSubmenu && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleMenu(item.name);
                        }}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
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
                              ? "bg-blue-600 text-white"
                              : "text-gray-400 hover:bg-gray-800 hover:text-white"
                          }`}
                        >
                          <SubIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{subitem.name}</span>
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
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-300 hover:bg-red-600 hover:text-white w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
          {sidebarOpen && (
            <div className="text-xs text-gray-400 mt-4">
              <p>© 2026 Jonbrix</p>
              <p>Version 1.0</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}