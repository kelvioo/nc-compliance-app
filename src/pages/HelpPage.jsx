import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Mail } from "lucide-react";
import { Brand } from "../components/ui";
import { LINKEDIN_URL, SUPPORT_EMAIL } from "../lib/config";
import { TRIAL_DAYS } from "../lib/plans";
import { usePageMeta } from "../lib/usePageMeta";
import { LegalFooter, LinkedInIcon } from "./LegalPage";

const A = ({ to, children }) => <Link to={to}>{children}</Link>;

const GUIDES = [
  {
    id: "getting-started", title: "Getting started", items: [
      { q: "How do I set up my company?", a: <>
        <ol>
          <li>Create your account and add your company name. Your {TRIAL_DAYS}-day trial starts straight away.</li>
          <li>Open <b>Settings</b> and add your NCDMB / NCEC registration number and billing email. Every report uses them.</li>
          <li>Open <b>Team</b> and invite colleagues as preparers, reviewers or approvers.</li>
          <li>Start logging data in <b>Spend log</b>, <b>Expat quota</b> and the quarterly contracts register.</li>
        </ol>
        <p>The <b>Home</b> page shows a checklist of what's left, your upcoming NCDMB deadlines and anything about to expire.</p>
        <p>Want to see a finished example first? Open the <A to="/demo">live demo</A>.</p>
      </> },
      { q: "Which NCDMB reports do I owe?", a: <>
        <p>It depends on your contracts, vessels and expatriates. Take the free <A to="/check">NC Compliance Check</A>. In two minutes it lists the reports you're likely to owe and their next due dates.</p>
        <p>In the app, the <b>Compliance calendar</b> shows every quarterly and annual deadline for your company.</p>
      </> },
    ],
  },
  {
    id: "data", title: "Recording your data", items: [
      { q: "How do I log spend?", a: <>
        <p>Open <b>Spend log</b>. Choose the date and category (Nigerian or expatriate labour, local or imported equipment, local or foreign services), then enter the vendor, project and amount. Amounts can be in naira or US dollars; dollars are converted at the rate set on the <b>NC position</b> page.</p>
        <p>Your Nigerian Content percentage updates as you go, and every report uses the same entries, so you only type each payment once. <b>Raw spend log (CSV)</b> on the summary report exports everything.</p>
      </> },
      { q: "How is the Nigerian Content percentage worked out?", a: <>
        <p>Local spend (Nigerian labour, local equipment, local services) divided by total spend. <b>NC position</b> compares it with your target and projects next quarter from your recent trend.</p>
        <p>This is a working figure for tracking. Reconcile it with NCDMB's official methodology before formal submission.</p>
      </> },
      { q: "How do I track expatriates and succession plans?", a: <>
        <p>In <b>Expat quota</b>, add each approved position with the number of approved slots and Nigerian understudies; progress bars show how far each role is localised.</p>
        <p>In <b>Succession Plan (§33)</b>, record the understudy's name, target date and progress for every expatriate position.</p>
      </> },
    ],
  },
  {
    id: "reports", title: "Preparing NCDMB reports", items: [
      { q: "Job Forecast (§18) and Procurement (§24) reports", a: <>
        <p>Add each contract, subcontract or purchase order once in the contracts register with its value in US dollars, status and quarter. The app splits them automatically:</p>
        <ul>
          <li><b>US$1 million or more</b> → Job Forecast Report (§18)</li>
          <li><b>Below US$1 million</b> → Procurement Report, split into Services and Materials (§24)</li>
        </ul>
        <p>Choose the quarter at the top of each report. Quarterly reports are due 30 days before the quarter starts.</p>
      </> },
      { q: "Marine Services Utilization (§24)", a: <p>Add each vessel with its contractor, NIMASA details, project, in-country and out-of-country spend, and Nigerian and expatriate crew on board. It appears on the Marine report for its quarter.</p> },
      { q: "NC Performance Report (§60), NCDF, NC Plan and the others", a: <>
        <ul>
          <li><b>NC Performance (§60)</b> is built from your spend, contracts, expatriates and carbon data for the year. Due 60 days into the following year.</li>
          <li><b>NCDF & NCFCC (§104)</b>: record each 1% remittance with its reference, and your NCFCC certificate dates.</li>
          <li><b>NC Plan</b>: project description, personnel, procurement, fabrication, vessels and contracting strategy.</li>
          <li><b>Employment & Training, R&D, Technology Transfer, Insurance, Legal, Financial services</b>: fill in the plan and log activities as they happen.</li>
        </ul>
      </> },
      { q: "How do I prepare everything for NCDMB at once?", a: <>
        <p>Open <b>Submission pack</b>. Choose the quarterly reports or the NC Performance Report (§60) and the period. You'll see every report in the pack and whether it's approved.</p>
        <ul>
          <li>Enter who signs the cover letter once; it's remembered.</li>
          <li><b>Download pack (PDF)</b> gives you a cover letter addressed to NCDMB plus every report, in one file. <b>Download all reports (Excel)</b> gives one workbook with a sheet per report.</li>
          <li>Until every report is approved, the pack is marked <b>DRAFT</b>. Once they are, <b>Save to Documents & email approvers</b> stores the pack and emails your owners, admins and approvers a download link.</li>
        </ul>
        <p>Then submit the pack through NCDMB's portal or official email, and record each submission with NCDMB's reference. There's no public way for software to file with NCDMB on a company's behalf, so the final submission comes from your company.</p>
      </> },
      { q: "How do I download a report for submission?", a: <>
        <p>Every report has three buttons at the top:</p>
        <ul>
          <li><b>Download PDF</b>: a clean A4 document in NCDMB's layout, named after your company, report and period.</li>
          <li><b>Download Excel</b>: the same report as a spreadsheet, with amounts as numbers.</li>
          <li><b>Print</b>: your browser's print window, if you prefer paper.</li>
        </ul>
      </> },
    ],
  },
  {
    id: "team", title: "Team, approvals and submissions", items: [
      { q: "What can each role do?", a: <ul>
        <li><b>Owner / Admin</b>: everything, including team, billing and settings.</li>
        <li><b>Approver</b>: approves reports and records the NCDMB submission.</li>
        <li><b>Reviewer</b>: reviews reports a preparer has sent.</li>
        <li><b>Preparer</b>: enters data and sends reports for review.</li>
        <li><b>Viewer</b>: can see everything but not change anything.</li>
      </ul> },
      { q: "How does the approval workflow work?", a: <>
        <p>Each report and period moves through <b>Not started → In review → Reviewed → Approved → Submitted to NCDMB</b>. Use the bar at the top of each report. When you've submitted to NCDMB, the approver records the date and NCDMB's reference number, and the full history is kept.</p>
        <p><b>Submissions</b> shows where every report stands for the current period.</p>
      </> },
      { q: "Who gets the reminder emails?", a: <p>Owners, admins and approvers, plus your billing email, get reminders 14, 7, 3 and 1 day before each quarterly and annual deadline, and when a stored document is about to expire.</p> },
    ],
  },
  {
    id: "documents", title: "Documents", items: [
      { q: "What should I upload?", a: <p>Your NCEC / NOGIC JQS certificate, expatriate quota approvals, NCDF receipts, NC Plan approval letters and NCDMB acknowledgements. Add an expiry date and you'll be warned 30, 7 and 1 day before it lapses. Files are private to your company.</p> },
    ],
  },
  {
    id: "billing", title: "Plans and billing", items: [
      { q: "What happens when my trial ends?", a: <p>Your workspace becomes read-only until you choose a plan. Nothing is deleted: you can still view and download everything. We email you 3 days and 1 day before the trial ends.</p> },
      { q: "How do I pay?", a: <>
        <p>Open <b>Billing</b>, choose a plan and pay by card or bank transfer through Paystack. Plans are paid yearly in naira and <b>do not renew automatically</b>: we email you 30 and 7 days before your year ends.</p>
        <p>Paying before your year ends adds the new year on top, so you never lose paid time.</p>
        <p><b>Founding customers:</b> the first 20 companies to pay get 30% off any plan, and keep that price for two years from their first payment. Billing shows whether the offer is still open.</p>
      </> },
      { q: "Can we pay by invoice?", a: <p>Yes. Email {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : "us"} with your company name and plan, and we'll send an invoice. Your plan is activated when payment arrives.</p> },
      { q: "Refunds", a: <p>If you're unhappy within 7 days of your first payment, email us for a full refund. See the <A to="/terms">terms of service</A>.</p> },
    ],
  },
  {
    id: "account", title: "Account and security", items: [
      { q: "I forgot my password", a: <p>On the sign-in page click <A to="/forgot-password">Forgot password?</A> and we'll email you a reset link.</p> },
      { q: "Is our data safe?", a: <p>Data is encrypted in transit and at rest, and each company's data is separated at the database level, so only people your admins invite can see it. Every change is recorded in the audit log under <b>Settings</b>. See our <A to="/privacy">privacy policy</A>.</p> },
    ],
  },
];

const text = (node) => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return text(node.props?.children);
};

export default function HelpPage() {
  usePageMeta("Help centre · NC Compliance", "/help");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GUIDES;
    return GUIDES.map((g) => ({ ...g, items: g.items.filter((it) => `${it.q} ${text(it.a)}`.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length);
  }, [query]);

  return (
    <div className="nc-landing nc-legal nc-help">
      <header className="nc-landing-nav">
        <Link to="/" className="nc-brand-link" aria-label="NC Compliance home"><Brand /></Link>
        <div className="nc-landing-nav-cta">
          <Link to="/app" className="nc-btn nc-btn-primary">Open my workspace</Link>
        </div>
      </header>
      <main className="nc-help-body">
        <h1>Help centre</h1>
        <p className="nc-help-sub">Short guides for everything in NC Compliance.</p>
        <label className="nc-help-search">
          <Search size={16} />
          <input type="search" placeholder="Search, e.g. download PDF, approval, trial" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {!query && (
          <nav className="nc-help-toc">{GUIDES.map((g) => <a key={g.id} href={`#${g.id}`}>{g.title}</a>)}</nav>
        )}
        {filtered.length === 0 && <p className="nc-help-sub">No guides match "{query}". Try another word, or email us below.</p>}
        {filtered.map((g) => (
          <section key={g.id} id={g.id} className="nc-help-section">
            <h2>{g.title}</h2>
            {g.items.map((it) => (
              <details key={it.q} open={Boolean(query)}>
                <summary>{it.q}</summary>
                <div className="nc-help-answer">{it.a}</div>
              </details>
            ))}
          </section>
        ))}
        {SUPPORT_EMAIL && (
          <div className="nc-help-contact">
            <Mail size={18} />
            <div><strong>Still stuck?</strong> Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your company name and what you were trying to do.</div>
          </div>
        )}
        <div className="nc-help-contact">
          <LinkedInIcon size={18} />
          <div><strong>Stay ahead of deadlines.</strong> <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">Follow NC Compliance on LinkedIn</a> for NCDMB deadline reminders and reporting tips.</div>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
