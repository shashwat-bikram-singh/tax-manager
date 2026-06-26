import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import MainLayout from "./components/layout/Mainlayout"
import NotFound from "./pages/NotFound"
import Dashboard from "./components/dashboard/Dashboard"
import Login from "./pages/login/Login";
import SubofficeList from "./components/suboffices/office";
import UserList from "./components/user/user";
import FiscalyearList from "./components/fiscalyear/fiscalyear";
import FiscalyearForm from "./components/fiscalyear/fiscalyear-form";
import PropertyList from "./components/property/property";
import PropertyForm from "./components/property/PropertyForm";
import EditProperty from "./components/property/property-edit";
import { useEffect, useState, type ReactNode } from "react";
import DocumentForm from "./components/document/documentForm";
import DocumentList from "./components/document/document";
import OfficeForm from "./components/suboffices/office-form";
import TaxPayerList from "./components/tax-payer/tax-payer";
import TaxPayerForm from "./components/tax-payer/tax-payment-form";
import { MeasurementConverter } from "./components/Converter/converter";
import TaxComplianceReport from "./components/report/tax-compliance-report"
import Report from "./components/report/report";
import GenericPage from "./components/generic-page/generic-page";
import LeaderboardPage from "./components/dashboard/LeaderboardPage";
import SummaryReport from "./components/report/summary-report";
import AnalyticEngine from "./components/report/analytic-engine";

// Unified authentication wrapper to allow any logged-in user (Admin or SuperAdmin)
const AuthenticatedRoute = ({ children }: { children: ReactNode }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    setIsAuthenticated(!!token);
    setAuthChecked(true);
  }, []);

  if (!authChecked) return null; // or a spinner

  return isAuthenticated ? <>{children}</> : <Navigate to="/generic-page" replace />;
};

function App() {
  const navigate = useNavigate();

  return (
    <Routes>

      {/* Redirect root to generic-page */}
      <Route path="/" element={<GenericPage />} />

      {/* Public initial page */}
      <Route path="/generic-page" element={<GenericPage />} />

      {/* Public login page */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes for authenticated users */}
      <Route
        path="/app"
        element={
          <AuthenticatedRoute>
            <MainLayout />
          </AuthenticatedRoute>
        }
      >
        {/* Dashboard is the default landing page after login */}
        <Route index element={<Dashboard />} />

        <Route path="office" element={<SubofficeList />} />
        <Route path="leaderboardPage" element={<LeaderboardPage />} />
        <Route path="user" element={<UserList />} />
        <Route path="fiscalyear" element={<FiscalyearList />} />
        <Route path="fiscalyear/add" element={<FiscalyearForm mode="add" />} />
        <Route path="fiscalyear/edit/:id" element={<FiscalyearForm mode="edit" />} />
        <Route path="property" element={<PropertyList />} />
        <Route path="property/add" element={<PropertyForm mode="add" onSuccess={() => navigate("/app/property")} />} />
        <Route path="property/edit/:id" element={<EditProperty />} />
        <Route path="document-vault" element={<DocumentList />} />
        <Route path="document-vault/add" element={<DocumentForm mode="add" onSuccess={() => navigate("/app/document-vault")} />} />
        <Route path="office-form" element={<OfficeForm mode="add" />} />
        <Route path="tax-payer/add" element={<TaxPayerForm mode="add" onSuccess={() => navigate("/app/tax-compliance")} onCancel={() => navigate("/app/tax-compliance")} />} />
        <Route path="tax-payer/edit/:id" element={<TaxPayerForm mode="edit" onCancel={() => navigate("/app/tax-compliance")} />} />
        <Route path="converter" element={<MeasurementConverter />} />
        <Route path="tax-compliance" element={<TaxPayerList />} />
        <Route path="tax-compliance-report" element={<TaxComplianceReport />} />
        <Route path="result" element={<Report />} />
        <Route path="summary-report" element={<SummaryReport />} />
        <Route path="analytic-engine" element={<AnalyticEngine />} />
      </Route>

      {/* Catch-all for unknown routes */}
      <Route path="/app" element={<NotFound />} />

    </Routes>
  )
}

export default App