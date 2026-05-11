import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import MainLayout from "./components/layout/Mainlayout"
import NotFound from "./pages/NotFound"
import Dashboard from "./components/dashboard/Dashboard"
import LeaderboardPage from "./components/dashboard/LeaderboardPage"
import Login from "./pages/login/Login";
import SubofficeList from "./components/suboffices/office";
import UserList from "./components/user/user";
import ProtectedRoute from "./ProtectedRoute";
import FiscalyearList from "./components/fiscalyear/fiscalyear";
import FiscalyearForm from "./components/fiscalyear/fiscalyear-form";
import PropertyList from "./components/property/property";
import PropertyForm from "./components/property/PropertyForm";
import EditProperty from "./components/property/property-edit";
import { useEffect, useState, type ReactNode } from "react";
import SuperAdminLayout from "./superadmin-Layout/setup-layout";
import SuperAdminDashboard from "./superadmin-Layout/super-admin-dashboard";
import OfficeListPage from "./superadmin-Layout/Office/office-list";

import DocumentForm from "./components/document/documentForm";
import DocumentList from "./components/document/document";
import OfficeForm from "./components/suboffices/office-form";
import TaxPayerList from "./components/tax-payer/tax-payer";
import TaxPayerForm from "./components/tax-payer/tax-payment-form";
import { MeasurementConverter } from "./components/Converter/converter";
import TaxComplianceReport from "./components/report/tax-compliance-report"
import Report from "./components/report/report";

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
  const navigate = useNavigate();

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
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="office" element={<SubofficeList />} />
        <Route path="user" element={<UserList />} />
        <Route path="fiscalyear" element={<FiscalyearList />} />
        <Route path="fiscalyear/add" element={<FiscalyearForm mode="add" />} />
        <Route path="fiscalyear/edit/:id" element={<FiscalyearForm mode="edit" />} />
        <Route path="property" element={<PropertyList />} />
        <Route path="property/add" element={<PropertyForm mode="add" onSuccess={() => navigate("/property")} />} />
        <Route path="property/edit/:id" element={<EditProperty />} />
        <Route path="document-vault" element={<DocumentList />} />
        <Route path="office-form" element={<OfficeForm mode="add" />} />
        <Route path="documentForm/add" element={<DocumentForm mode="add" onSuccess={() => navigate("/documentForm")} />} />
        <Route path="converter" element={<MeasurementConverter />} />
        <Route path="tax-compliance" element={<TaxPayerList />} />
        <Route path="tax-compliance-report" element={<TaxComplianceReport />} />
        <Route path="result" element={<Report />} />
        <Route path="tax-payer/add" element={<TaxPayerForm mode="add" onSuccess={() => navigate("/tax-compliance")} onCancel={() => navigate("/tax-compliance")} />} />
        <Route path="tax-payer/edit/:id" element={<TaxPayerForm mode="edit" onCancel={() => navigate("/tax-compliance")} />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
