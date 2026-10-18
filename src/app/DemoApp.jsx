import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Sparkles, Lock } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ReportHeader } from "./ReportHeader";
import { WorkspaceBase } from "./base";
import { REPORT_VIEWS } from "./reportViews";
import { HomeView } from "../views/HomeView";
import { SubmissionsView } from "../views/SubmissionsView";
import { reportById } from "../lib/reports";
import { usePageMeta } from "../lib/usePageMeta";
import { DEMO_DOCS, DEMO_ORG, DEMO_USER, sampleData, sampleSubmissions } from "../lib/sampleData";

const LOCKED = {
  documents: "Store your NCEC certificate, expatriate quota approvals and NCDF receipts, and get warned before anything expires.",
  team: "Invite preparers, reviewers and approvers so every report gets signed off before it goes to NCDMB.",
  billing: "Plans are paid yearly in naira through Paystack, after your free 30-day trial.",
  settings: "Add your company details and NCDMB registration number once; every report uses them.",
};

// The public demo: the real workspace screens running on a fictional company,
// entirely in the browser. Nothing is saved and no account is needed.
export default function DemoApp() {
  const { view = "home" } = useParams();
  usePageMeta("Live demo · NC Compliance", "/demo");
  const [data, setData] = useState(sampleData);
  const [rows, setRows] = useState(sampleSubmissions);
  const [toast, setToast] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((message, tone = "error") => setToast({ message, tone, id: Date.now() }), []);

  const submissions = useMemo(() => ({
    rows,
    loading: false,
    byKey: Object.fromEntries(rows.map((r) => [`${r.report_key}:${r.period}`, r])),
    reload: async () => {},
    setStatus: async (report, period, status, extra = {}) => {
      setRows((prev) => {
        const at = new Date().toISOString();
        const existing = prev.find((r) => r.report_key === report && r.period === period);
        const step = { status, by: DEMO_USER, at, note: extra.note || null };
        const next = {
          ...(existing || { report_key: report, period, history: [] }),
          status, updated_at: at, history: [...(existing?.history || []), step],
          ncdmb_reference: extra.reference ?? existing?.ncdmb_reference ?? null,
          submitted_on: extra.submittedOn ?? existing?.submitted_on ?? null,
        };
        return existing ? prev.map((r) => (r === existing ? next : r)) : [...prev, next];
      });
      notify("Updated in the demo. In your own workspace this is saved and your team is notified.", "success");
      return true;
    },
  }), [rows, notify]);

  const saveData = useCallback(async (next) => { setData(next); }, []);

  const isReport = Boolean(REPORT_VIEWS[view]);
  if (view !== "home" && view !== "submissions" && !isReport && !LOCKED[view]) return <Navigate to="/demo" replace />;

  const fullData = { ...data, id: DEMO_ORG.id, name: DEMO_ORG.name };
  let body;
  if (view === "home") {
    body = <HomeView data={fullData} org={DEMO_ORG} submissions={submissions} demo={{ docs: DEMO_DOCS, memberCount: 4, userEmail: DEMO_USER }} />;
  } else if (view === "submissions") {
    body = <SubmissionsView submissions={submissions} />;
  } else if (LOCKED[view]) {
    body = (
      <div className="nc-main-content nc-demo-locked">
        <Lock size={28} />
        <h1>Available in your own workspace</h1>
        <p>{LOCKED[view]}</p>
        <Link to="/signup" className="nc-btn nc-btn-primary">Start your free 30-day trial</Link>
      </div>
    );
  } else {
    body = (
      <>
        {reportById(view) && <ReportHeader reportId={view} role="owner" submissions={submissions} editable notify={notify} />}
        {REPORT_VIEWS[view]({ data: fullData, setData: saveData })}
      </>
    );
  }

  return (
    <WorkspaceBase.Provider value="/demo">
      <div className="nc-demo-bar no-print">
        <Sparkles size={15} />
        <span><strong>Live demo</strong> with a sample company. Click around, add entries, download reports. Nothing is saved.</span>
        <Link to="/signup" className="nc-btn nc-btn-primary">Start free trial</Link>
      </div>
      <div className="nc-layout nc-layout-demo">
        <div className="no-print">
          <Sidebar
            view={view}
            org={DEMO_ORG}
            role="owner"
            memberships={[{ role: "owner", organizations: DEMO_ORG }]}
            onSelectOrg={() => {}}
            userEmail={DEMO_USER}
            onRefresh={() => {}}
            refreshing={false}
            labsEnabled={false}
            isPlatformAdmin={false}
            submissions={submissions}
            demo
          />
        </div>
        <div className="nc-main-content-wrap">{body}</div>
        {toast && (
          <div className={`nc-toast ${toast.tone === "success" ? "is-success" : ""}`} role="status" key={toast.id}>
            {toast.message}
            <button onClick={() => setToast(null)} aria-label="Dismiss">×</button>
          </div>
        )}
      </div>
    </WorkspaceBase.Provider>
  );
}
