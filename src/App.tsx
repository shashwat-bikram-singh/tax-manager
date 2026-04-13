import { Navigate, Route, Routes } from "react-router-dom"
import MainLayout from "./components/layout/Mainlayout"
import NotFound from "./pages/NotFound"
import Dashboard from "./components/dashboard/Dashboard"
import Login from "./pages/login/Login";
import SubofficeList from "./components/suboffices/suboffice";
import UserList from "./components/user/user";
import ProtectedRoute from "./ProtectedRoute";
import FiscalyearList from "./components/fiscalyear/fiscalyear";
import DocumentNumberingList from "./components/documentNumbering/documentNumbering";
import { useEffect, useState, type ReactNode } from "react";
import SuperAdminLayout from "./superadmin-Layout/setup-layout";
import SuperAdminDashboard from "./superadmin-Layout/super-admin-dashboard";
import OfficeListPage from "./superadmin-Layout/Office/office-list";
import UserReport from "./components/report/report";
import RevenueReport from "./components/report/revenue-report";


// Super admin private route
const SuperAdminRoute = ({ children }: { children: ReactNode }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const officeId = parseInt(sessionStorage.getItem("OfficeId") || "1"); // Default to 1 to avoid accidental super admin access
    setIsSuperAdmin(!!token && officeId === 0);
    setAuthChecked(true);
  }, []);

  if (!authChecked) return null;

  return isSuperAdmin ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {


  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Super Admin routes */}
      <Route
        path="/super-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="offices" element={<OfficeListPage />} />
      </Route>

      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      } >
        <Route index element={<Dashboard />} />
        <Route path="suboffice" element={<SubofficeList />} />
        <Route path="user" element={<UserList />} />
        <Route path="fiscalyear" element={<FiscalyearList />} />
        <Route path="documentnumbering" element={<DocumentNumberingList />} />
        <Route path="user-report" element={<UserReport />} />
        <Route path="revenue-report" element={<RevenueReport />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
