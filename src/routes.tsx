import { createMemoryRouter, Navigate } from "react-router";
import { Layout } from "./layouts/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { ModuleGuard } from "./components/ModuleGuard";
import { getSession, clearSession } from "./auth/session";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { Login } from "./components/pages/Login";
import { Dashboard } from "./components/pages/Dashboard";
import { Sales } from "./components/pages/Sales";
import { Inventory } from "./components/pages/Inventory";
import { Products } from "./components/pages/Products";
import { Suppliers } from "./components/pages/Suppliers";
import { Orders } from "./components/pages/Orders";
import { Analytics } from "./components/pages/Analytics";
import { Forecasting } from "./components/pages/Forecasting";
import { StockPrediction } from "./components/pages/StockPrediction";
import { Reports } from "./components/pages/Reports";
import { Users } from "./components/pages/Users";
import { AuditLog } from "./components/pages/AuditLog";
import { Profile } from "./components/pages/Profile";
import { Settings } from "./components/pages/Settings";
import { Notifications } from "./components/pages/Notifications";
import { NotFound } from "./components/pages/NotFound";
import { ArchivePage } from "./components/pages/Archive";
import { Mechanics } from "./components/pages/Mechanics";
import { POS } from "./components/pos/POS";

function RootLayout() {
  const session = getSession();
  const currentRole = (session?.role ?? "").trim().toLowerCase();

  if (currentRole === "cashier") {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  return (
    <RequireAuth>
      <Layout />
    </RequireAuth>
  );
}

// Clean address bar to root "/" to mask subpaths (except during active payment return query)
if (typeof window !== "undefined" && window.location.pathname !== "/" && !window.location.search.includes("payment=")) {
  try {
    window.history.replaceState(null, "", "/");
  } catch {
    // Ignore
  }
}

const ROUTE_STORAGE_KEY = "invensight_last_route";

const currentSession = getSession();
let initialPath = "/login";

if (currentSession) {
  const isCashier = (currentSession.role ?? "").trim().toLowerCase() === "cashier";
  const urlSearch = typeof window !== "undefined" ? window.location.search : "";
  const isPaymentReturn = urlSearch.includes("payment=");

  if (isPaymentReturn) {
    initialPath = `/pos${urlSearch}`;
  } else if (isCashier) {
    initialPath = "/pos";
  } else {
    const savedRoute = typeof window !== "undefined" ? sessionStorage.getItem(ROUTE_STORAGE_KEY) : null;
    initialPath = savedRoute && savedRoute !== "/login" && savedRoute !== "/" ? savedRoute : "/dashboard";
  }
}

export const router = createMemoryRouter([
  {
    path: "/login",
    Component: Login,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/pos",
    element: <RequireAuth><POS /></RequireAuth>,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/",
    Component: RootLayout,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <ModuleGuard module="Dashboard"><Dashboard /></ModuleGuard> },
      { path: "sales", element: <ModuleGuard module="Sales"><Sales /></ModuleGuard> },
      { path: "inventory", element: <ModuleGuard module="Inventory"><Inventory /></ModuleGuard> },
      { path: "products", element: <ModuleGuard module="Products"><Products /></ModuleGuard> },
      { path: "suppliers", element: <ModuleGuard module="Suppliers"><Suppliers /></ModuleGuard> },
      { path: "orders", element: <ModuleGuard module="Orders"><Orders /></ModuleGuard> },
      { path: "analytics", element: <ModuleGuard module="Reports"><Analytics /></ModuleGuard> },
      { path: "forecasting", element: <ModuleGuard module="Forecasting"><Forecasting /></ModuleGuard> },
      { path: "stock-prediction", element: <ModuleGuard module="Stock Prediction"><StockPrediction /></ModuleGuard> },
      { path: "reports", element: <ModuleGuard module="Reports"><Reports /></ModuleGuard> },
      { path: "users", element: <ModuleGuard module="User Management"><Users /></ModuleGuard> },
      { path: "mechanics", element: <ModuleGuard module="Mechanic Services"><Mechanics /></ModuleGuard> },
      { path: "audit-log", element: <ModuleGuard module="Audit Log"><AuditLog /></ModuleGuard> },
      { path: "archive", element: <ModuleGuard module="Archive"><ArchivePage /></ModuleGuard> },
      { path: "profile", Component: Profile },
      { path: "settings", Component: Settings },
      { path: "notifications", Component: Notifications },
      { path: "*", Component: NotFound },
    ],
  },
], {
  initialEntries: [initialPath],
});

router.subscribe((state) => {
  if (typeof window !== "undefined") {
    if (state?.location) {
      const currentLoc = state.location;
      const fullPath = (currentLoc.pathname || "/") + (currentLoc.search || "") + (currentLoc.hash || "");
      if (fullPath && fullPath !== "/login") {
        sessionStorage.setItem(ROUTE_STORAGE_KEY, fullPath);
      }
    }
    // Permanently mask address bar to root "/" (conceals /sales, /pos, /inventory, etc.)
    try {
      if (window.location.pathname !== "/" && !window.location.search.includes("payment=")) {
        window.history.replaceState(null, "", "/");
      }
    } catch {
      // Ignore
    }
  }
});
