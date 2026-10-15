import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Users, CreditCard, Activity, LayoutDashboard, Search, RefreshCw, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { friendlyError } from "../lib/errors";
import { planName } from "../lib/plans";
import { fmtNaira } from "../lib/compliance";
import { Brand, FullPageLoader } from "../components/ui";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtTime = (d) => (d ? new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—");
const naira = (kobo) => fmtNaira(Number(kobo || 0) / 100);
const ago = (d) => {
  if (!d) return "never";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

function accessOf(c) {
  const now = Date.now();
  if (c.subscription_status === "active" && (!c.current_period_end || new Date(c.current_period_end) > now)) return { label: "Paying", tone: "ok" };
  if (c.subscription_status === "trialing" && new Date(c.trial_ends_at) > now) {
    const days = Math.ceil((new Date(c.trial_ends_at) - now) / 86400000);
    return { label: `Trial · ${days}d left`, tone: days <= 7 ? "warn" : "info" };
  }
  return { label: "Lapsed", tone: "danger" };
}

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "activity", label: "Activity", icon: Activity },
];

function ManageCompany({ company, onDone, notify }) {
  const [form, setForm] = useState({
    plan: company.plan === "trial" ? "starter" : company.plan,
    periodEnd: (company.current_period_end || new Date(Date.now() + 365 * 864e5).toISOString()).slice(0, 10),
  });
  const [busy, setBusy] = useState(false);

  const apply = async (args, message) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_subscription", args);
    setBusy(false);
    if (error) { notify(friendlyError(error)); return; }
    notify(message, "success");
    onDone();
  };

  const extendTrial = (days) => {
    const base = Math.max(Date.now(), new Date(company.trial_ends_at).getTime());
    apply({ p_org: company.id, p_plan: "trial", p_status: "trialing", p_trial_ends_at: new Date(base + days * 864e5).toISOString() },
      `Trial extended by ${days} days.`);
  };

  return (
    <div className="nc-admin-manage">
      <div>
        <h4>Activate a paid plan (invoice / bank transfer)</h4>
        <div className="nc-admin-manage-row">
          <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
            <option value="starter">Starter</option><option value="operations">Operations</option><option value="enterprise">Enterprise</option>
          </select>
          <label>Paid through <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} /></label>
          <button className="nc-btn-sm" disabled={busy}
            onClick={() => apply({ p_org: company.id, p_plan: form.plan, p_status: "active", p_period_end: new Date(form.periodEnd + "T23:59:59").toISOString() },
              `${company.name} activated on ${planName(form.plan)}.`)}>Activate</button>
        </div>
      </div>
      <div>
        <h4>Trial</h4>
        <div className="nc-admin-manage-row">
          <button className="nc-btn-sm is-ghost" disabled={busy} onClick={() => extendTrial(7)}>+7 days</button>
          <button className="nc-btn-sm is-ghost" disabled={busy} onClick={() => extendTrial(14)}>+14 days</button>
          <button className="nc-btn-sm is-ghost" disabled={busy} onClick={() => extendTrial(30)}>+30 days</button>
        </div>
      </div>
      <div>
        <h4>Suspend</h4>
        <div className="nc-admin-manage-row">
          <button className="nc-btn-sm is-danger" disabled={busy}
            onClick={() => window.confirm(`Make ${company.name} read-only? Their data is kept.`) &&
              apply({ p_org: company.id, p_plan: company.plan, p_status: "canceled" }, `${company.name} set to read-only.`)}>
            Make read-only
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [allowed, setAllowed] = useState(null);
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [query, setQuery] = useState("");
  const [managing, setManaging] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const notify = useCallback((message, tone = "error") => setToast({ message, tone, id: Date.now() }), []);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, c, u, p, a] = await Promise.all([
      supabase.rpc("admin_overview"), supabase.rpc("admin_companies"), supabase.rpc("admin_users"),
      supabase.rpc("admin_payments"), supabase.rpc("admin_activity"),
    ]);
    const err = [o, c, u, p, a].find((r) => r.error)?.error;
    if (err) notify(friendlyError(err));
    setOverview(o.data); setCompanies(c.data || []); setUsers(u.data || []); setPayments(p.data || []); setActivity(a.data || []);
    setLoading(false);
  }, [notify]);

  const { user } = useAuth();
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    supabase.rpc("am_platform_admin").then(({ data }) => {
      setAllowed(Boolean(data));
      if (data) load();
    });
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => [c.name, c.owner_email, c.ncdmb_reg_no].some((v) => (v || "").toLowerCase().includes(q)));
  }, [companies, query]);

  if (allowed === null) return <FullPageLoader />;
  if (!allowed) {
    return (
      <div className="nc-auth-page"><div className="nc-auth-card">
        <Brand /><h1>Not authorised</h1><p className="nc-auth-sub">This page is only for the NC Compliance team.</p>
        <Link to="/app">Back to your workspace</Link>
        <button className="nc-link-button" onClick={signOut}>Sign out</button>
      </div></div>
    );
  }

  const kpis = overview ? [
    ["Revenue (30 days)", naira(overview.revenue_30d_kobo)],
    ["Revenue (all time)", naira(overview.revenue_total_kobo)],
    ["Paying companies", overview.paying],
    ["On trial", overview.trialing],
    ["Trials ending in 7 days", overview.trials_ending_7d],
    ["Lapsed / read-only", overview.lapsed],
    ["Companies", overview.companies],
    ["Users", overview.users],
    ["New companies (7 days)", overview.signups_7d],
    ["Active companies (7 days)", overview.active_companies_7d],
    ["Saves (7 days)", overview.saves_7d],
  ] : [];

  return (
    <div className="nc-admin">
      <header className="nc-admin-top">
        <Brand />
        <span className="nc-admin-badge">Admin console</span>
        <div className="nc-admin-top-actions">
          <button className="nc-btn-sm is-ghost" onClick={load} disabled={loading}><RefreshCw size={13} className={loading ? "nc-spin" : undefined} /> Refresh</button>
          <Link to="/app" className="nc-btn-sm is-ghost"><ArrowLeft size={13} /> My workspace</Link>
          <span className="nc-admin-user" title="Signed in as">{user?.email}</span>
          <button className="nc-btn-sm is-ghost" onClick={signOut}><LogOut size={13} /> Sign out</button>
        </div>
      </header>

      <nav className="nc-admin-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}><Icon size={15} /> {label}</button>
        ))}
      </nav>

      <main className="nc-admin-main">
        {tab === "overview" && (
          <>
            <div className="nc-kpi-grid">
              {kpis.map(([label, value]) => <div key={label} className="nc-kpi"><small>{label}</small><strong>{value}</strong></div>)}
            </div>
            <div className="nc-admin-two">
              <section className="nc-card">
                <div className="nc-card-head"><h2>Trials needing attention</h2></div>
                <table className="nc-table nc-table-plain"><tbody>
                  {companies.filter((c) => accessOf(c).tone === "warn").length === 0 && <tr><td className="nc-muted-sm">No trials ending this week.</td></tr>}
                  {companies.filter((c) => accessOf(c).tone === "warn").map((c) => (
                    <tr key={c.id}><td><strong>{c.name}</strong><div className="nc-muted-sm">{c.owner_email}</div></td><td>{accessOf(c).label}</td><td className="nc-muted-sm">active {ago(c.last_active)}</td></tr>
                  ))}
                </tbody></table>
              </section>
              <section className="nc-card">
                <div className="nc-card-head"><h2>Latest payments</h2></div>
                <table className="nc-table nc-table-plain"><tbody>
                  {payments.filter((p) => p.status === "success").length === 0 && <tr><td className="nc-muted-sm">No payments yet.</td></tr>}
                  {payments.filter((p) => p.status === "success").slice(0, 6).map((p) => (
                    <tr key={p.reference}><td><strong>{p.company}</strong><div className="nc-muted-sm">{planName(p.plan)}</div></td><td>{naira(p.amount_kobo)}</td><td className="nc-muted-sm">{fmt(p.paid_at)}</td></tr>
                  ))}
                </tbody></table>
              </section>
            </div>
          </>
        )}

        {tab === "companies" && (
          <>
            <div className="nc-admin-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company, owner email or NCDMB number" /></div>
            <div className="nc-table-card">
              <table className="nc-table">
                <thead><tr><th>Company</th><th>Status</th><th>Plan</th><th>Team</th><th>Last active</th><th>Saves (30d)</th><th>Revenue</th><th>Joined</th><th /></tr></thead>
                <tbody>
                  {filteredCompanies.map((c) => {
                    const a = accessOf(c);
                    return [
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong><div className="nc-muted-sm">{c.owner_email} · {c.org_type}{c.ncdmb_reg_no ? ` · ${c.ncdmb_reg_no}` : ""}</div></td>
                        <td><span className={`nc-chip is-${a.tone}`}>{a.label}</span></td>
                        <td>{planName(c.plan)}{c.current_period_end && c.subscription_status === "active" ? <div className="nc-muted-sm">to {fmt(c.current_period_end)}</div> : null}</td>
                        <td>{c.members}</td>
                        <td>{ago(c.last_active)}</td>
                        <td>{c.saves_30d}</td>
                        <td>{naira(c.revenue_kobo)}</td>
                        <td>{fmt(c.created_at)}</td>
                        <td className="nc-table-actions"><button className="nc-btn-sm is-ghost" onClick={() => setManaging(managing === c.id ? null : c.id)}>{managing === c.id ? "Close" : "Manage"}</button></td>
                      </tr>,
                      managing === c.id && (
                        <tr key={`${c.id}-manage`}><td colSpan={9}><ManageCompany company={c} notify={notify} onDone={() => { setManaging(null); load(); }} /></td></tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "users" && (
          <div className="nc-table-card">
            <table className="nc-table">
              <thead><tr><th>Email</th><th>Companies</th><th>Confirmed</th><th>Last sign-in</th><th>Signed up</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}><td>{u.email}</td><td>{u.companies || <span className="nc-muted-sm">No company yet</span>}</td><td>{u.confirmed ? "Yes" : <span className="nc-chip is-warn">Pending</span>}</td><td>{fmtTime(u.last_sign_in_at)}</td><td>{fmt(u.created_at)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "payments" && (
          <div className="nc-table-card">
            <table className="nc-table">
              <thead><tr><th>Date</th><th>Company</th><th>Plan</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={6} className="nc-muted-sm">No payments yet. Card payments appear here automatically once Paystack is connected.</td></tr>}
                {payments.map((p) => (
                  <tr key={p.reference}><td>{fmtTime(p.paid_at || p.created_at)}</td><td>{p.company}</td><td>{planName(p.plan)}</td><td>{naira(p.amount_kobo)}</td>
                    <td><span className={`nc-chip is-${p.status === "success" ? "ok" : "info"}`}>{p.status === "initialized" ? "Checkout started" : p.status}</span></td><td><code>{p.reference}</code></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "activity" && (
          <div className="nc-table-card">
            <table className="nc-table">
              <thead><tr><th>When</th><th>Company</th><th>Who</th><th>What</th></tr></thead>
              <tbody>
                {activity.map((a, i) => (
                  <tr key={i}><td style={{ whiteSpace: "nowrap" }}>{fmtTime(a.created_at)}</td><td>{a.company}</td><td>{a.user_email || "System"}</td>
                    <td>{a.action}{a.detail?.sections ? ` — ${a.detail.sections.join(", ")}` : a.detail?.report ? ` — ${a.detail.report} ${a.detail.period}: ${a.detail.status}` : a.detail?.plan ? ` — ${a.detail.plan}` : ""}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {toast && (
        <div className={`nc-toast ${toast.tone === "success" ? "is-success" : ""}`} role="status">{toast.message}
          <button onClick={() => setToast(null)} aria-label="Dismiss">×</button></div>
      )}
    </div>
  );
}
