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
import { jwtDecode } from "jwt-decode";

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
function getTokenRole(): string {
  const token = sessionStorage.getItem("token");
  if (!token) return "";
  try {
    const decoded: any = jwtDecode(token);
    return (decoded?.Role ?? decoded?.role ?? "").toLowerCase();
  } catch {
    return "";
  }
}

// ─── AUTHENTICATED ROUTE ──────────────────────────────────────────────────────
// Allows any logged-in user
const AuthenticatedRoute = ({ children }: { children: ReactNode }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    setIsAuthenticated(!!token);
    setAuthChecked(true);
  }, []);

  if (!authChecked) return null;

  return isAuthenticated ? <>{children}</> : <Navigate to="/generic-page" replace />;
};

// ─── SUPER ADMIN ROUTE ────────────────────────────────────────────────────────
// Only allows SuperAdmin; redirects everyone else to /app (dashboard)
const SuperAdminRoute = ({ children }: { children: ReactNode }) => {
  const role = getTokenRole();
  if (role !== "superadmin") return <Navigate to="/app" replace />;
  return <>{children}</>;
};
const AdministrationRoute = ({ children }: { children: ReactNode }) => {
  const role = getTokenRole();
  if (role !== "superadmin" && role !== "admin") return <Navigate to="/app" replace />;
  return <>{children}</>;
};

// ─── APP ──────────────────────────────────────────────────────────────────────
function App() {
  const navigate = useNavigate();

  return (
    <Routes>

      {/* Redirect root to generic-page */}
      <Route path="/" element={<GenericPage />} />

      {/* Public pages */}
      <Route path="/generic-page" element={<GenericPage />} />
      <Route path="/login" element={<Login />} />

      {/* Protected routes for all authenticated users */}
      <Route
        path="/app"
        element={
          <AuthenticatedRoute>
            <MainLayout />
          </AuthenticatedRoute>
        }
      >
        {/* Dashboard — default landing page after login */}
        <Route index element={<Dashboard />} />

        {/* ── SuperAdmin-only routes ── */}
        <Route
          path="office"
          element={
            <SuperAdminRoute>
              <SubofficeList />
            </SuperAdminRoute>
          }
        />
        <Route
          path="office-form"
          element={
            <SuperAdminRoute>
              <OfficeForm mode="add" />
            </SuperAdminRoute>
          }
        />
        <Route
          path="fiscalyear"
          element={
            <SuperAdminRoute>
              <FiscalyearList />
            </SuperAdminRoute>
          }
        />
        <Route
          path="fiscalyear/add"
          element={
            <SuperAdminRoute>
              <FiscalyearForm mode="add" />
            </SuperAdminRoute>
          }
        />
        <Route
          path="fiscalyear/edit/:id"
          element={
            <SuperAdminRoute>
              <FiscalyearForm mode="edit" />
            </SuperAdminRoute>
          }
        />
        <Route path="tax-compliance" element={<AdministrationRoute><TaxPayerList /></AdministrationRoute>} />
        <Route path="tax-compliance-report" element={<AdministrationRoute><TaxComplianceReport /></AdministrationRoute>} />
        <Route path="result" element={<AdministrationRoute><Report /></AdministrationRoute>} />
        <Route path="summary-report" element={<AdministrationRoute><SummaryReport /></AdministrationRoute>} />
        <Route path="analytic-engine" element={<AdministrationRoute><AnalyticEngine /></AdministrationRoute>} />
        <Route path="leaderboardPage" element={<SuperAdminRoute><LeaderboardPage /></SuperAdminRoute>} />
        <Route path="user" element={<AdministrationRoute><UserList /></AdministrationRoute>} />
        {/* ── Routes for all authenticated users ── */}

        <Route path="property" element={<PropertyList />} />
        <Route path="property/add" element={<PropertyForm mode="add" onSuccess={() => navigate("/app/property")} />} />
        <Route path="property/edit/:id" element={<EditProperty />} />
        <Route path="document-vault" element={<DocumentList />} />
        <Route path="document-vault/add" element={<DocumentForm mode="add" onSuccess={() => navigate("/app/document-vault")} />} />
        <Route path="tax-payer/add" element={<TaxPayerForm mode="add" onSuccess={() => navigate("/app/tax-compliance")} onCancel={() => navigate("/app/tax-compliance")} />} />
        <Route path="tax-payer/edit/:id" element={<TaxPayerForm mode="edit" onCancel={() => navigate("/app/tax-compliance")} />} />
        <Route path="converter" element={<MeasurementConverter />} />

      </Route>

      {/* Catch-all for unknown routes */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default App;