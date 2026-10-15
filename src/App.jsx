import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import InvitePage from "./pages/InvitePage";
import BillingCallback from "./pages/BillingCallback";
import LegalPage from "./pages/LegalPage";
import { FullPageLoader } from "./components/ui";

// The workspace (all report screens) loads on demand, so the marketing
// and sign-in pages stay light.
const WorkspaceApp = lazy(() => import("./app/WorkspaceApp"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

export default function App() {
  const { recovering } = useAuth();
  if (recovering) return <ResetPassword />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="signin" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/privacy" element={<LegalPage doc="privacy" />} />
      <Route path="/terms" element={<LegalPage doc="terms" />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
      <Route path="/billing/callback" element={<RequireAuth><BillingCallback /></RequireAuth>} />
      <Route path="/app" element={<Navigate to="/app/home" replace />} />
      <Route path="/app/:view" element={<RequireAuth><Suspense fallback={<FullPageLoader label="Loading your workspace…" />}><WorkspaceApp /></Suspense></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><Suspense fallback={<FullPageLoader />}><AdminPage /></Suspense></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
