import { Link } from "react-router-dom";
import { ArrowRight, BellRing } from "lucide-react";
import { daysUntil } from "../lib/compliance";
import { usePageMeta } from "../lib/usePageMeta";
import { DeadlineBadge } from "../components/ui";
import { PublicPage } from "./PublicPage";

const QUARTERLY = ["Job Forecast Report (§18)", "Procurement Report — Materials (§24)", "Procurement Report — Services (§24)", "Marine Services Utilization Report (§24)"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const longDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

// The same rules the app and reminder emails use: quarterly reports are due
// 30 days before the quarter starts; the §60 report 60 days into the year.
function deadlinesFor(year) {
  const rows = [];
  for (let q = 0; q < 4; q++) {
    const start = new Date(year, q * 3, 1);
    const due = new Date(start); due.setDate(due.getDate() - 30);
    rows.push({ key: `${year}-Q${q + 1}`, due, period: `Q${q + 1} ${year} (${MONTH[q * 3]}–${MONTH[q * 3 + 2]} ${year})`, reports: QUARTERLY });
  }
  const annual = new Date(year, 0, 1); annual.setDate(annual.getDate() + 60);
  rows.push({ key: `${year}-S60`, due: annual, period: `Year ${year - 1}`, reports: ["NC Performance Report (§60)"] });
  return rows.sort((a, b) => a.due - b.due);
}

export default function DeadlinesPage() {
  const thisYear = new Date().getFullYear();
  usePageMeta(`NCDMB reporting deadlines ${thisYear}–${thisYear + 1} · NC Compliance`, "/ncdmb-deadlines");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rows = [...deadlinesFor(thisYear), ...deadlinesFor(thisYear + 1)]
    .filter((r) => r.due >= new Date(today.getFullYear(), today.getMonth() - 2, 1));
  const next = rows.find((r) => r.due >= today);

  return (
    <PublicPage>
      <section className="nc-public-hero">
        <span className="nc-eyebrow">Free resource</span>
        <h1>NCDMB reporting deadlines {thisYear}–{thisYear + 1}</h1>
        <p>
          Every quarterly and annual Nigerian Content reporting deadline, worked out from NCDMB's published rules:
          quarterly reports are due <strong>30 days before the quarter starts</strong>, and the NC Performance Report
          (§60) is due <strong>within 60 days of the start of the year</strong>.
        </p>
      </section>

      {next && (
        <section className="nc-public-section nc-next-deadline">
          <BellRing size={20} color="#E6A23C" />
          <div>
            <strong>Next deadline: {longDate(next.due)}</strong>
            <span>{next.reports.length > 1 ? "Quarterly reports" : next.reports[0]} for {next.period}</span>
          </div>
          <DeadlineBadge days={daysUntil(next.due, new Date())} />
        </section>
      )}

      <section className="nc-public-section">
        <div className="nc-table-card">
          <table className="nc-table nc-deadline-table">
            <thead><tr><th>Due date</th><th>Reports</th><th>Covers</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={r.due < today ? "is-past" : ""}>
                  <td style={{ whiteSpace: "nowrap" }}><strong>{longDate(r.due)}</strong></td>
                  <td>{r.reports.map((x) => <div key={x}>{x}</div>)}</td>
                  <td>{r.period}</td>
                  <td>{r.due < today ? <span className="nc-muted-sm">Passed</span> : <DeadlineBadge days={daysUntil(r.due, new Date())} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nc-public-note">
          Other reports (Employment &amp; Training, R&amp;D, Insurance, Legal, Financial services, Technology Transfer,
          Succession Plans and the NC Plan) follow their own schedules. Always confirm dates against current NCDMB
          guidance. NC Compliance is independent software, not affiliated with NCDMB.
        </p>
      </section>

      <section className="nc-public-cta">
        <h2>Get reminded before every deadline</h2>
        <p>NC Compliance emails your team 14, 7, 3 and 1 day before each deadline, shows which reports are approved, and puts the whole submission in one PDF.</p>
        <div className="nc-hero-cta">
          <Link to="/signup" className="nc-btn nc-btn-primary nc-btn-lg">Start free trial <ArrowRight size={18} /></Link>
          <Link to="/check" className="nc-btn nc-btn-ghost nc-btn-lg">Which reports do I owe?</Link>
        </div>
      </section>
    </PublicPage>
  );
}
