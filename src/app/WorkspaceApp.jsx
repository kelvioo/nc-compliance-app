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
import { TeamView } from "../views/TeamView";
import { BillingView } from "../views/BillingView";
import { SettingsView } from "../views/SettingsView";
import { HomeView } from "../views/HomeView";
import { SubmissionsView } from "../views/SubmissionsView";
import { DocumentsView } from "../views/DocumentsView";
import { PackView } from "../views/PackView";
import { useSubmissions } from "./useSubmissions";
import { ReportHeader } from "./ReportHeader";
import { REPORT_VIEWS, LABS_ENABLED } from "./reportViews";
import { reportById } from "../lib/reports";

const LAST_ORG_KEY = "nc_last_org";

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
    navigate("/app/home");
  }, [navigate]);

  const ws = useWorkspace(current?.organizations.id, { onError: notify });
  const submissions = useSubmissions(current?.organizations.id, notify);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    supabase.rpc("am_platform_admin").then(({ data }) => setIsPlatformAdmin(Boolean(data)));
  }, []);

  if (!memberships) return <FullPageLoader label="Loading your workspace…" />;
  if (memberships.length === 0) return <Navigate to="/onboarding" replace />;

  const org = current.organizations;
  const role = current.role;
  const access = orgAccess(org);
  const editable = canEdit(role) && access.hasAccess;

  const accountViews = {
    submissions: () => <SubmissionsView submissions={submissions} />,
    documents: () => <DocumentsView org={org} editable={editable} notify={notify} />,
    team: () => <TeamView org={org} role={role} notify={notify} onChanged={loadMemberships} />,
    billing: () => <BillingView org={org} role={role} notify={notify} />,
    settings: () => <SettingsView org={org} role={role} notify={notify} onSaved={loadMemberships} />,
  };

  const isReportView = Boolean(REPORT_VIEWS[view]);
  const isHome = view === "home";
  const isPack = view === "pack";
  if (!isHome && !isPack && !isReportView && !accountViews[view]) return <Navigate to="/app/home" replace />;

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
    await Promise.all([ws.reload(), loadMemberships(), submissions.reload()]);
    setRefreshing(false);
  };

  let body;
  if (!isReportView && !isHome && !isPack) {
    body = accountViews[view]();
  } else if (ws.loadError) {
    body = <div className="nc-main-content"><p className="nc-checkout-error">{ws.loadError}</p></div>;
  } else if (ws.loading || !ws.data) {
    body = <div className="nc-inline-loader">Loading workspace…</div>;
  } else {
    const data = { ...ws.data, id: org.id, name: org.name };
    if (isHome) {
      body = <HomeView data={data} org={org} submissions={submissions} />;
    } else if (isPack) {
      body = <PackView data={data} setData={guardedSetData} org={org} submissions={submissions} editable={editable} notify={notify} />;
    } else {
      body = (
        <>
          {reportById(view) && (
            <ReportHeader reportId={view} role={role} submissions={submissions} editable={editable} notify={notify} />
          )}
          {REPORT_VIEWS[view]({ data, setData: guardedSetData, editable })}
        </>
      );
    }
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
          isPlatformAdmin={isPlatformAdmin}
          submissions={submissions}
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
