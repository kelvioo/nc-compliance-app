import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { orgAccess } from "../lib/plans";
import { canEdit, canManage } from "../lib/roles";
import { friendlyError } from "../lib/errors";
import { FullPageLoader } from "../components/ui";
import { useWorkspace } from "./useWorkspace";
import { Sidebar } from "./Sidebar";
import { AccessBanner } from "./AccessBanner";
import { Dashboard } from "../views/Dashboard";
import { EntriesView } from "../views/EntriesView";
import { QuotaView } from "../views/QuotaView";
import { NCPlanView } from "../views/NCPlanView";
import { QuarterlyReportsView } from "../views/QuarterlyReportsView";
import { NCDFView } from "../views/NCDFView";
import { AnnualReportView } from "../views/AnnualReportView";
import { OtherStatutoryView } from "../views/OtherStatutoryView";
import { CarbonView } from "../views/CarbonView";
import { ReportView } from "../views/ReportView";
import { TeamView } from "../views/TeamView";
import { BillingView } from "../views/BillingView";
import { SettingsView } from "../views/SettingsView";
import { OperationsAssuranceView } from "../views/labs/OperationsAssuranceView";
import { MarketplaceView } from "../views/labs/MarketplaceView";

const LAST_ORG_KEY = "nc_last_org";

// Experimental modules stay out of the product until they are finished.
export const LABS_ENABLED = import.meta.env.VITE_ENABLE_LABS === "true";

const REPORT_VIEWS = {
  dashboard: (p) => <Dashboard {...p} />,
  entries: (p) => <EntriesView {...p} />,
  quota: (p) => <QuotaView {...p} />,
  carbon: (p) => <CarbonView {...p} />,
  report: (p) => <ReportView {...p} />,
  ncplan: (p) => <NCPlanView {...p} />,
  calendar: (p) => <QuarterlyReportsView {...p} />,
  forecast: (p) => <QuarterlyReportsView {...p} lockTab="forecast" />,
  procServices: (p) => <QuarterlyReportsView {...p} lockTab="procServices" />,
  procMaterials: (p) => <QuarterlyReportsView {...p} lockTab="procMaterials" />,
  marine: (p) => <QuarterlyReportsView {...p} lockTab="marine" />,
  ncdf: (p) => <NCDFView {...p} />,
  annual: (p) => <AnnualReportView {...p} />,
  training: (p) => <OtherStatutoryView {...p} lockTab="training" />,
  rnd: (p) => <OtherStatutoryView {...p} lockTab="rnd" />,
  tech: (p) => <OtherStatutoryView {...p} lockTab="tech" />,
  insurance: (p) => <OtherStatutoryView {...p} lockTab="insurance" />,
  legal: (p) => <OtherStatutoryView {...p} lockTab="legal" />,
  financial: (p) => <OtherStatutoryView {...p} lockTab="financial" />,
  succession: (p) => <OtherStatutoryView {...p} lockTab="succession" />,
  ...(LABS_ENABLED ? {
    assurance: (p) => <OperationsAssuranceView {...p} />,
    marketplace: (p) => <MarketplaceView {...p} />,
  } : {}),
};

export default function WorkspaceApp() {
  const { view } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState(null);
  const [orgId, setOrgIdState] = useState(() => {
    try { return localStorage.getItem(LAST_ORG_KEY); } catch { return null; }
  });
  const [toast, setToast] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const notify = useCallback((message, tone = "error") => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadMemberships = useCallback(async () => {
    const { data, error } = await supabase
      .from("memberships")
      .select("role, organizations(*)")
      .eq("user_id", user.id)
      .order("created_at");
    if (error) { notify(friendlyError(error)); setMemberships([]); return; }
    setMemberships(data.filter((m) => m.organizations));
  }, [user.id, notify]);

  useEffect(() => { loadMemberships(); }, [loadMemberships]);

  const current = useMemo(() => {
    if (!memberships || memberships.length === 0) return null;
    return memberships.find((m) => m.organizations.id === orgId) || memberships[0];
  }, [memberships, orgId]);

  const selectOrg = useCallback((id) => {
    setOrgIdState(id);
    try { localStorage.setItem(LAST_ORG_KEY, id); } catch { /* private mode */ }
    navigate("/app/dashboard");
  }, [navigate]);

  const ws = useWorkspace(current?.organizations.id, { onError: notify });

  if (!memberships) return <FullPageLoader label="Loading your workspace…" />;
  if (memberships.length === 0) return <Navigate to="/onboarding" replace />;

  const org = current.organizations;
  const role = current.role;
  const access = orgAccess(org);
  const editable = canEdit(role) && access.hasAccess;

  const accountViews = {
    team: () => <TeamView org={org} role={role} notify={notify} onChanged={loadMemberships} />,
    billing: () => <BillingView org={org} role={role} notify={notify} />,
    settings: () => <SettingsView org={org} role={role} notify={notify} onSaved={loadMemberships} />,
  };

  const isReportView = Boolean(REPORT_VIEWS[view]);
  if (!isReportView && !accountViews[view]) return <Navigate to="/app/dashboard" replace />;

  // Viewers and expired workspaces can browse everything but not save.
  const guardedSetData = (next) => {
    if (!editable) {
      notify(canEdit(role) ? friendlyError("subscription_required") : "You have view-only access to this company. Ask an admin to change your role.");
      return Promise.resolve();
    }
    return ws.setData(next);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([ws.reload(), loadMemberships()]);
    setRefreshing(false);
  };

  let body;
  if (!isReportView) {
    body = accountViews[view]();
  } else if (ws.loadError) {
    body = <div className="nc-main-content"><p className="nc-checkout-error">{ws.loadError}</p></div>;
  } else if (ws.loading || !ws.data) {
    body = <div className="nc-inline-loader">Loading workspace…</div>;
  } else {
    const data = { ...ws.data, id: org.id, name: org.name };
    body = REPORT_VIEWS[view]({ data, setData: guardedSetData });
  }

  return (
    <div className="nc-layout">
      <div className="no-print">
        <Sidebar
          view={view}
          org={org}
          role={role}
          memberships={memberships}
          onSelectOrg={selectOrg}
          userEmail={user.email}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          labsEnabled={LABS_ENABLED}
        />
      </div>
      <div className="nc-main-content-wrap">
        <AccessBanner access={access} role={role} canManageBilling={canManage(role)} />
        {body}
      </div>
      {toast && (
        <div className={`nc-toast ${toast.tone === "success" ? "is-success" : ""}`} role="status" key={toast.id}>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}
