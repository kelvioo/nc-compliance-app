import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BellRing, CalendarPlus, CheckCircle2, FileDown, Mail } from "lucide-react";
import { daysUntil } from "../lib/compliance";
import { deadlinesFor, downloadDeadlinesIcs } from "../lib/deadlines";
import { supabase } from "../lib/supabase";
import { usePageMeta } from "../lib/usePageMeta";
import { DeadlineBadge } from "../components/ui";
import { PublicPage } from "./PublicPage";

const longDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

// "Email me before each deadline": free reminders 14 and 3 days before.
function ReminderSignup() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("idle");
  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.rpc("subscribe_deadlines", { p_email: email, p_company: company });
    setStatus(error ? "error" : "done");
  };
  if (status === "done") {
    return (
      <p className="nc-remind-done" role="status">
        <CheckCircle2 size={18} /> You're on the list. We've sent a confirmation to <strong>{email}</strong>, and we'll email you 14 and 3 days before every deadline.
      </p>
    );
  }
  return (
    <form className="nc-remind-form" onSubmit={submit}>
      <input type="email" required placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Work email" maxLength={200} />
      <input placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company" maxLength={160} />
      <button type="submit" className="nc-btn nc-btn-primary" disabled={status === "sending"}>
        <Mail size={16} /> {status === "sending" ? "Signing you up…" : "Email me reminders"}
      </button>
      {status === "error" && <p className="nc-remind-error" role="alert">That didn't work. Check the email address and try again.</p>}
      <p className="nc-remind-note">Free. One email 14 days and one 3 days before each deadline. Unsubscribe with one click. See our <Link to="/privacy">privacy policy</Link>.</p>
    </form>
  );
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

      <section className="nc-public-section nc-remind">
        <div className="nc-remind-card">
          <h2><Mail size={18} /> Email me before each deadline</h2>
          <ReminderSignup />
        </div>
        <div className="nc-remind-card">
          <h2><CalendarPlus size={18} /> Add them to my calendar</h2>
          <p>One file with every upcoming deadline and reminders 14 and 3 days before. Works with Google Calendar, Outlook and iPhone.</p>
          <button type="button" className="nc-btn nc-btn-ghost" onClick={downloadDeadlinesIcs}><CalendarPlus size={16} /> Download calendar file</button>
          <p className="nc-remind-note">Google Calendar: open calendar.google.com → Settings → Import, and choose the file.</p>
        </div>
      </section>

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
        <p className="nc-hero-note"><FileDown size={14} style={{ verticalAlign: -2 }} /> <a href="/samples/NC-Compliance-sample-submission-pack.pdf" target="_blank" rel="noopener">See a sample submission pack (PDF)</a></p>
      </section>
    </PublicPage>
  );
}
