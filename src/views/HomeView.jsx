import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, FileWarning, CalendarClock, TrendingUp, FolderLock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { REPORTS, currentPeriod, statusLabel } from "../lib/reports";
import { calcTotals, daysUntil, fmtNaira } from "../lib/compliance";
import { DeadlineBadge } from "../components/ui";
import { useAuth } from "../auth/AuthProvider";

const fmt = (d) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// The company's daily starting point: what is due, what is missing, and how
// its Nigerian Content position looks.
export function HomeView({ data, org, submissions }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [memberCount, setMemberCount] = useState(1);

  useEffect(() => {
    supabase.from("documents").select("id, title, category, expires_on").eq("org_id", org.id)
      .then(({ data: d }) => setDocs(d || []));
    supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("org_id", org.id)
      .then(({ count }) => setMemberCount(count || 1));
  }, [org.id]);

  const { pct, local, foreign } = calcTotals(data.entries || []);
  const target = Number(data.target || 70);

  const upcoming = REPORTS
    .map((r) => ({ r, ...currentPeriod(r) }))
    .filter((x) => x.due)
    .map((x) => ({ ...x, row: submissions.byKey[`${x.r.id}:${x.period}`] }))
    .sort((a, b) => a.due.localeCompare(b.due));

  const expiring = docs
    .filter((d) => d.expires_on)
    .map((d) => ({ ...d, days: daysUntil(new Date(d.expires_on), new Date()) }))
    .filter((d) => d.days <= 60)
    .sort((a, b) => a.days - b.days);

  const checklist = [
    { done: Boolean(org.ncdmb_reg_no), label: "Add your NCDMB / NCEC registration number", to: "/app/settings" },
    { done: memberCount > 1, label: "Invite a colleague to review or approve", to: "/app/team" },
    { done: (data.entries || []).length > 0, label: "Log your first spend entry", to: "/app/entries" },
    { done: docs.length > 0, label: "Upload your NCEC certificate or quota approval", to: "/app/documents" },
    { done: (submissions.rows || []).length > 0, label: "Start your next quarterly submission", to: "/app/forecast" },
  ];
  const remaining = checklist.filter((c) => !c.done).length;
  const name = user?.email?.split("@")[0];

  return (
    <div className="nc-main-content nc-premium-page">
      <div className="nc-premium-heading">
        <div>
          <span>{org.name.toUpperCase()}</span>
          <h1>{greeting()}{name ? `, ${name}` : ""}</h1>
          <p>Here's what needs your attention for Nigerian Content compliance.</p>
        </div>
      </div>

      {remaining > 0 && (
        <section className="nc-card nc-checklist">
          <div className="nc-card-head">
            <h2>Get set up</h2>
            <span className="nc-muted-sm">{checklist.length - remaining} of {checklist.length} done</span>
          </div>
          <div className="nc-progress"><div style={{ width: `${((checklist.length - remaining) / checklist.length) * 100}%` }} /></div>
          <ul>
            {checklist.map((c) => (
              <li key={c.label} className={c.done ? "is-done" : ""}>
                {c.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                {c.done ? <span>{c.label}</span> : <Link to={c.to}>{c.label} <ArrowRight size={13} /></Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="nc-home-grid">
        <section className="nc-card">
          <div className="nc-card-head"><h2><CalendarClock size={16} /> Upcoming submissions</h2><Link to="/app/submissions">All submissions</Link></div>
          <table className="nc-table nc-table-plain">
            <tbody>
              {upcoming.map(({ r, label, due, row }) => (
                <tr key={r.id}>
                  <td><Link to={`/app/${r.id}`} className="nc-row-link">§{r.section} {r.name}</Link><div className="nc-muted-sm">{label} · due {fmt(due)}</div></td>
                  <td><span className={`nc-status nc-status-${row?.status || "draft"}`}>{statusLabel(row?.status)}</span></td>
                  <td style={{ textAlign: "right" }}>{row?.status !== "submitted" && <DeadlineBadge days={daysUntil(new Date(due), new Date())} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="nc-card">
          <div className="nc-card-head"><h2><TrendingUp size={16} /> Nigerian Content position</h2><Link to="/app/dashboard">Details</Link></div>
          <div className="nc-big-number" style={{ color: pct >= target ? "#4FAE7E" : pct >= target - 10 ? "#E6A23C" : "#D9534F" }}>{pct.toFixed(1)}%</div>
          <div className="nc-muted-sm">Target {target}% · {(data.entries || []).length} spend entries</div>
          <div className="nc-split-bar"><div style={{ width: `${Math.min(100, pct)}%` }} /></div>
          <div className="nc-split-legend"><span>Nigerian {fmtNaira(local)}</span><span>Foreign {fmtNaira(foreign)}</span></div>
          {(data.entries || []).length === 0 && <p className="nc-muted-sm">Log spend to see your position. <Link to="/app/entries">Add an entry</Link></p>}
        </section>

        <section className="nc-card">
          <div className="nc-card-head"><h2><FolderLock size={16} /> Certificates & approvals</h2><Link to="/app/documents">Documents</Link></div>
          {expiring.length === 0 ? (
            <p className="nc-muted-sm">{docs.length === 0
              ? <>No documents yet. Upload your NCEC certificate, expatriate quota approvals and NCDF receipts so you're warned before anything expires. <Link to="/app/documents">Upload</Link></>
              : "Nothing expires in the next 60 days."}</p>
          ) : (
            <ul className="nc-expiry-list">
              {expiring.map((d) => (
                <li key={d.id}>
                  <FileWarning size={15} color={d.days < 0 ? "#D9534F" : "#E6A23C"} />
                  <span>{d.title}</span>
                  <em className={d.days < 0 ? "is-danger" : ""}>{d.days < 0 ? `Expired ${fmt(d.expires_on)}` : d.days === 0 ? "Expires today" : `${d.days} days left`}</em>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
