import { Link } from "react-router-dom";
import { REPORTS, currentPeriod, statusLabel } from "../lib/reports";
import { daysUntil } from "../lib/compliance";
import { DeadlineBadge } from "../components/ui";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");

// Every report for its current period, plus everything submitted before.
export function SubmissionsView({ submissions }) {
  const current = REPORTS.filter((r) => r.id !== "ncdf").map((r) => {
    const p = currentPeriod(r);
    return { r, ...p, row: submissions.byKey[`${r.id}:${p.period}`] };
  }).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));

  const past = (submissions.rows || [])
    .filter((s) => s.status === "submitted")
    .sort((a, b) => (b.submitted_on || "").localeCompare(a.submitted_on || ""));

  const counts = current.reduce((acc, c) => { const s = c.row?.status || "draft"; acc[s] = (acc[s] || 0) + 1; return acc; }, {});

  return (
    <div className="nc-main-content nc-premium-page">
      <div className="nc-premium-heading">
        <div>
          <span>WORKFLOW</span>
          <h1>Submissions</h1>
          <p>Each report moves from <strong>Not started</strong> → <strong>In review</strong> → <strong>Approved</strong> → <strong>Submitted to NCDMB</strong>. Preparers send work for review, reviewers check it, and approvers sign it off and record the NCDMB submission.</p>
        </div>
      </div>

      <div className="nc-stat-row">
        {[["draft", "Not started"], ["in_review", "In review"], ["approved", "Approved"], ["submitted", "Submitted"]].map(([k, l]) => (
          <div key={k} className="nc-stat"><small>{l}</small><strong>{(counts[k] || 0) + (k === "in_review" ? counts.reviewed || 0 : 0)}</strong></div>
        ))}
      </div>

      <h2 className="nc-section-title">This period</h2>
      <div className="nc-table-card">
        <table className="nc-table">
          <thead><tr><th>Report</th><th>Period</th><th>Due</th><th>Status</th><th /></tr></thead>
          <tbody>
            {current.map(({ r, label, due, row }) => (
              <tr key={r.id}>
                <td><Link className="nc-row-link" to={`/app/${r.id}`}>§{r.section} {r.name}</Link></td>
                <td>{label}</td>
                <td style={{ whiteSpace: "nowrap" }}>{due ? <>{fmt(due)} {row?.status !== "submitted" && <DeadlineBadge days={daysUntil(new Date(due), new Date())} />}</> : <span className="nc-muted-sm">Confirm with NCDMB</span>}</td>
                <td><span className={`nc-status nc-status-${row?.status || "draft"}`}>{statusLabel(row?.status)}</span></td>
                <td className="nc-table-actions"><Link className="nc-btn-sm is-ghost" to={`/app/${r.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="nc-section-title">Submitted to NCDMB</h2>
      <div className="nc-table-card">
        <table className="nc-table">
          <thead><tr><th>Report</th><th>Period</th><th>Submitted</th><th>NCDMB reference</th></tr></thead>
          <tbody>
            {past.length === 0 && <tr><td colSpan={4} className="nc-muted-sm">Nothing recorded yet. When an approver records a submission it appears here as your filing history.</td></tr>}
            {past.map((s) => {
              const r = REPORTS.find((x) => x.id === s.report_key);
              return (
                <tr key={`${s.report_key}:${s.period}`}>
                  <td>{r ? `§${r.section} ${r.name}` : s.report_key}</td>
                  <td>{s.period}</td>
                  <td>{fmt(s.submitted_on)}</td>
                  <td>{s.ncdmb_reference || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
