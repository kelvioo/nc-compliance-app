import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, XCircle, CalendarClock, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Brand, Field, inputStyle } from "../components/ui";
import { REPORTS, currentPeriod } from "../lib/reports";
import { daysUntil } from "../lib/compliance";
import { usePageMeta } from "../lib/usePageMeta";
import { LegalFooter } from "./LegalPage";

const QUESTIONS = [
  { id: "orgType", q: "What kind of company are you?", options: [["operator", "Operator / asset owner"], ["contractor", "Contractor or service company"]] },
  { id: "bigContracts", q: "In the next quarter, will you bid for or award contracts or purchase orders worth US$1 million or more?", options: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]] },
  { id: "smallContracts", q: "Do you award contracts, subcontracts or purchase orders below US$1 million?", options: [["yes", "Yes"], ["no", "No"]] },
  { id: "vessels", q: "Do you charter vessels or use marine services?", options: [["yes", "Yes"], ["no", "No"]] },
  { id: "expats", q: "Do you employ expatriates in Nigeria?", options: [["yes", "Yes"], ["no", "No"]] },
  { id: "ncec", q: "Is your NCEC / NOGIC JQS certificate valid today?", options: [["yes", "Yes, it's valid"], ["expired", "Expired or expiring soon"], ["no", "We don't have one"], ["unsure", "Not sure"]] },
  { id: "ncdf", q: "Is the 1% NCDF levy deducted or remitted on your upstream contracts?", options: [["yes", "Yes, with receipts"], ["no", "No"], ["unsure", "Not sure"]] },
  { id: "late", q: "In the last 12 months, did you file any NCDMB report late, or miss one?", options: [["no", "No, always on time"], ["yes", "Yes"], ["unsure", "Not sure"]] },
  { id: "tracking", q: "How do you track Nigerian Content data today?", options: [["software", "A dedicated system"], ["spreadsheets", "Spreadsheets and email"], ["none", "We don't track it regularly"]] },
];

const byId = (id) => REPORTS.find((r) => r.id === id);

function analyse(a) {
  const owed = [];
  const add = (id, why) => { const r = byId(id); if (r) owed.push({ r, why, ...currentPeriod(r) }); };
  if (a.bigContracts !== "no") add("forecast", "Contracts or POs of US$1M+ planned next quarter");
  if (a.smallContracts === "yes") {
    add("procServices", "Contracts below US$1M — services");
    add("procMaterials", "Purchase orders below US$1M — materials");
  }
  if (a.vessels === "yes") add("marine", "Vessels or marine services used");
  add("annual", "Every company in the industry files a yearly performance report");
  add("training", "Employment & training of Nigerians");
  if (a.expats === "yes") add("succession", "One succession plan per expatriate position");
  if (a.orgType === "operator") add("ncplan", "Required before bidding or awarding work on a project");
  add("ncdf", "1% of every upstream contract");

  const actions = [];
  let score = 100;
  const hit = (pts, text, tone = "red") => { score -= pts; actions.push({ text, tone }); };
  if (a.ncec === "no") hit(25, "Get an NCEC / NOGIC JQS certificate. Without it you can't bid for most industry work.");
  if (a.ncec === "expired") hit(20, "Renew your NCEC certificate now. Bids from companies with lapsed certificates are usually disqualified.");
  if (a.ncec === "unsure") hit(10, "Check your NCEC certificate's expiry date and set a reminder.", "amber");
  if (a.ncdf === "no") hit(20, "Start remitting (or confirming deduction of) the 1% NCDF levy, and keep every receipt.");
  if (a.ncdf === "unsure") hit(10, "Confirm the 1% NCDF levy is being deducted on each contract and collect the receipts.", "amber");
  if (a.late === "yes") hit(15, "Late filings draw NCDMB queries and sanctions. Put every deadline on a shared calendar with reminders.");
  if (a.late === "unsure") hit(5, "List the reports you owe and their due dates, so nothing slips.", "amber");
  if (a.tracking === "none") hit(15, "Record spend, contracts and expatriate positions as they happen, not at deadline time.");
  if (a.tracking === "spreadsheets") hit(5, "Spreadsheets break down at deadline time. Keep one shared record that every report pulls from.", "amber");
  if (a.bigContracts === "unsure") hit(5, "Check next quarter's procurement plan for anything at or above US$1M; it must be on the Job Forecast.", "amber");
  if (a.expats === "yes") actions.push({ text: "Keep a named Nigerian understudy and a dated succession plan for every expatriate position.", tone: "amber" });

  score = Math.max(0, Math.min(100, score));
  const band = score >= 80 ? "good" : score >= 55 ? "risk" : "high";
  return { owed: owed.sort((x, y) => (x.due || "9999").localeCompare(y.due || "9999")), actions, score, band };
}

const BANDS = {
  good: { label: "Good standing", icon: CheckCircle2, text: "You're in good shape. Keep it that way by putting every deadline and certificate on autopilot." },
  risk: { label: "At risk", icon: AlertTriangle, text: "There are gaps NCDMB could query. Fix the items below before your next deadline." },
  high: { label: "High risk", icon: XCircle, text: "Several gaps could lead to NCDMB sanctions or lost bids. Start with the red items below." },
};

const fmt = (d) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

export default function ComplianceCheck() {
  usePageMeta("Free NC Compliance Check · NC Compliance", "/check");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [lead, setLead] = useState({ name: "", company: "", email: "", phone: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const done = step >= QUESTIONS.length;
  const result = useMemo(() => (done ? analyse(answers) : null), [done, answers]);
  const q = QUESTIONS[step];

  const choose = (value) => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    setStep((s) => s + 1);
  };

  const submitLead = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    const { error: err } = await supabase.rpc("submit_lead", {
      p_name: lead.name, p_company: lead.company, p_email: lead.email, p_phone: lead.phone,
      p_org_type: answers.orgType, p_score: result.score,
      p_answers: {
        answers,
        result: {
          band: result.band,
          owed: result.owed.map(({ r, why, due, label }) => ({ section: r.section, name: r.name, why, due, label })),
          actions: result.actions,
        },
      },
    });
    setSending(false);
    if (err) { setError("Please check your details and try again."); return; }
    setSent(true);
  };

  const band = result && BANDS[result.band];
  const BandIcon = band?.icon;
  const signupLink = `/signup?email=${encodeURIComponent(lead.email)}`;

  return (
    <div className="nc-landing nc-check">
      <header className="nc-landing-nav">
        <Link to="/" className="nc-brand-link" aria-label="NC Compliance home"><Brand /></Link>
        <div className="nc-landing-nav-cta">
          <Link to="/demo" className="nc-btn nc-btn-ghost">Live demo</Link>
          <Link to="/signup" className="nc-btn nc-btn-primary">Start free trial</Link>
        </div>
      </header>

      <main className="nc-check-main">
        {!done ? (
          <div className="nc-check-card">
            <span className="nc-check-eyebrow">Free NC Compliance Check · 2 minutes</span>
            <div className="nc-check-progress"><i style={{ width: `${(step / QUESTIONS.length) * 100}%` }} /></div>
            <small className="nc-check-count">Question {step + 1} of {QUESTIONS.length}</small>
            <h1>{q.q}</h1>
            <div className="nc-check-options">
              {q.options.map(([value, label]) => (
                <button key={value} className={answers[q.id] === value ? "is-selected" : ""} onClick={() => choose(value)}>
                  {label} <ArrowRight size={16} />
                </button>
              ))}
            </div>
            {step > 0 && <button className="nc-check-back" onClick={() => setStep((s) => s - 1)}><ArrowLeft size={14} /> Back</button>}
            <p className="nc-check-note">No sign-up needed. Your answers stay in your browser unless you choose to email yourself the results.</p>
          </div>
        ) : (
          <div className="nc-check-result">
            <div className={`nc-check-score is-${result.band}`}>
              <div className="nc-check-score-num">{result.score}<small>/100</small></div>
              <div>
                <h1><BandIcon size={22} /> {band.label}</h1>
                <p>{band.text}</p>
              </div>
            </div>

            <section className="nc-check-section">
              <h2><CalendarClock size={18} /> Reports you're likely to owe NCDMB</h2>
              <div className="nc-table-card">
                <table className="nc-table">
                  <thead><tr><th>Report</th><th>Why</th><th>Next due</th></tr></thead>
                  <tbody>
                    {result.owed.map(({ r, why, due, label }) => {
                      const days = due ? daysUntil(new Date(due), new Date()) : null;
                      return (
                        <tr key={r.id}>
                          <td><strong>§{r.section} {r.name}</strong><div className="nc-muted-sm">{label}</div></td>
                          <td className="nc-muted-sm">{why}</td>
                          <td>{due ? <>{fmt(due)}<div className={`nc-muted-sm ${days <= 30 ? "is-urgent" : ""}`}>{days} days</div></> : <span className="nc-muted-sm">As required</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {result.actions.length > 0 && (
              <section className="nc-check-section">
                <h2>What to fix first</h2>
                <ul className="nc-check-actions">
                  {result.actions.map((a, i) => <li key={i} className={`is-${a.tone}`}>{a.text}</li>)}
                </ul>
              </section>
            )}

            <section className="nc-check-cta">
              <div>
                <h2>Get all of this done in one place</h2>
                <p>NC Compliance tracks every deadline, reminds your team before each one, and produces each of these reports in NCDMB's layout. Free for 30 days.</p>
                <div className="nc-check-cta-buttons">
                  <Link to={lead.email ? signupLink : "/signup"} className="nc-btn nc-btn-primary">Start free trial <ArrowRight size={15} /></Link>
                  <Link to="/demo" className="nc-btn nc-btn-ghost">See a live demo</Link>
                </div>
              </div>

              {sent ? (
                <div className="nc-check-sent"><CheckCircle2 size={20} /> Done, {lead.name.split(" ")[0]}. Your full results are on their way to {lead.email}.</div>
              ) : (
                <form className="nc-check-form" onSubmit={submitLead}>
                  <strong>Email me my results and checklist</strong>
                  <Field label="Your name"><input required style={inputStyle} value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} /></Field>
                  <Field label="Company"><input required style={inputStyle} value={lead.company} onChange={(e) => setLead({ ...lead, company: e.target.value })} /></Field>
                  <Field label="Work email"><input required type="email" style={inputStyle} value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} /></Field>
                  <Field label="Phone (optional)"><input style={inputStyle} value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} /></Field>
                  {error && <p className="nc-form-error">{error}</p>}
                  <button className="nc-btn nc-btn-primary" disabled={sending}>{sending ? <Loader2 size={15} className="nc-spin" /> : null} Send me my checklist</button>
                  <small className="nc-muted-sm">We'll email your results and a couple of short follow-ups. Unsubscribe any time. See our <Link to="/privacy">privacy policy</Link>.</small>
                </form>
              )}
            </section>

            <button className="nc-check-back" onClick={() => { setStep(0); setAnswers({}); setSent(false); }}><ArrowLeft size={14} /> Start again</button>
            <p className="nc-check-note">This check is a guide based on the NOGICD Act 2010 and NCDMB's published reporting templates, not legal advice. Your exact obligations depend on your contracts and NCDMB's directions.</p>
          </div>
        )}
      </main>
      <LegalFooter />
    </div>
  );
}
