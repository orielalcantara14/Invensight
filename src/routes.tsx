import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./layouts/Layout";
import { RequireAuth } from "./components/RequireAuth";
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
import { UserManagement } from "./components/pages/UserManagement";
import { Users } from "./components/pages/Users";
import { AuditLog } from "./components/pages/AuditLog";
import { Profile } from "./components/pages/Profile";
import { Settings } from "./components/pages/Settings";
import { NotFound } from "./components/pages/NotFound";
import { POS } from "./components/pos/POS";

function RootLayout() {
  return (
    <RequireAuth>
      <Layout />
    </RequireAuth>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/pos",
    element: (
      <RequireAuth>
        <POS />
      </RequireAuth>
    ),
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "sales", Component: Sales },
      { path: "inventory", Component: Inventory },
      { path: "products", Component: Products },
      { path: "suppliers", Component: Suppliers },
      { path: "orders", Component: Orders },
      { path: "analytics", Component: Analytics },
      { path: "forecasting", Component: Forecasting },
      { path: "stock-prediction", Component: StockPrediction },
      { path: "reports", Component: Reports },
      { path: "user-management", Component: UserManagement },
      { path: "users", Component: Users },
      { path: "audit-log", Component: AuditLog },
      { path: "profile", Component: Profile },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
