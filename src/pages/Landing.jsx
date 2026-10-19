import { Link } from "react-router-dom";
import {
  ArrowRight, CalendarClock, CheckCircle2, ClipboardList, FileText, ShieldCheck, BellRing, History, Send, FolderLock,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { FOUNDING, PLANS, TRIAL_DAYS } from "../lib/plans";
import { useFoundingOfferOpen } from "../lib/founding";
import { PriceTag } from "../components/PriceTag";
import { STATUTORY_REPORTS, getQuarterOptions, nextQuarterly30DayDeadline, daysUntil } from "../lib/compliance";
import { Brand } from "../components/ui";
import { SUPPORT_EMAIL } from "../lib/config";
import { LegalFooter } from "./LegalPage";

const FEATURES = [
  { icon: CalendarClock, title: "Never miss a deadline", text: "Every quarterly and annual NCDMB due date worked out for you, with email reminders to your team 14, 7, 3 and 1 day before." },
  { icon: Send, title: "Prepare → review → approve → submit", text: "Each report moves through your team's sign-off, then you record the NCDMB submission and reference. A full filing history, always." },
  { icon: FileText, title: "All 15 statutory templates", text: "Job Forecast (§18), Procurement and Marine (§24), Performance (§60), NC Plan, NCDF and more — laid out like NCDMB's own forms, ready to print." },
  { icon: FolderLock, title: "Certificates that never lapse", text: "Store your NCEC certificate, expatriate quota approvals and NCDF receipts. We warn you 30 days before anything expires." },
  { icon: ClipboardList, title: "One log, every report", text: "Record Nigerian vs foreign spend, contracts, expatriate positions and vessels once. Every template pulls from the same numbers." },
  { icon: History, title: "Audit trail", text: "See who changed what, who approved it and when. Everyone signs in with their own account and role." },
];

const STEPS = [
  { n: "1", title: "Create your workspace", text: "Sign up with your work email and add your company. Takes two minutes." },
  { n: "2", title: "Log your activity", text: "Enter spend, contracts, expatriate positions and vessels as they happen, in one shared workspace." },
  { n: "3", title: "Generate and submit", text: "Open any NCDMB report, review it with your team, and print or export it for submission." },
];

const FAQ = [
  { q: "Is NC Compliance affiliated with NCDMB?", a: "No. NC Compliance is an independent software tool. It organises your data into the layouts of NCDMB's published reporting templates; your company remains responsible for what it submits and for using its approved methodology." },
  { q: "Where is our data stored?", a: "In a managed PostgreSQL database (Supabase) in the London region, encrypted in transit and at rest. Each company's data is isolated at the database level, so only people your admins invite can see it." },
  { q: "Do I need a card to start the trial?", a: `No. You get ${TRIAL_DAYS} days with every feature. At the end, choose a plan to keep editing — your data stays safe and readable either way.` },
  { q: "Can we pay by invoice or bank transfer?", a: `Yes. Card payments go through Paystack; for procurement-led purchases we can issue an invoice instead${SUPPORT_EMAIL ? ` — email ${SUPPORT_EMAIL}` : ""}.` },
  { q: "We're a consultancy preparing reports for several clients. Does that work?", a: "Yes. One login can belong to several company workspaces, and you can switch between them from the sidebar." },
];

export default function Landing() {
  const { user } = useAuth();
  const foundingOpen = useFoundingOfferOpen();
  const nextDeadline = nextQuarterly30DayDeadline(new Date());
  const days = daysUntil(new Date(nextDeadline), new Date());
  const nextQuarter = getQuarterOptions().find((q) => q.deadline >= new Date(new Date().setHours(0, 0, 0, 0)));

  return (
    <div className="nc-landing">
      <header className="nc-landing-nav">
        <Brand />
        <nav>
          <a href="#features">Features</a>
          <a href="#reports">Reports</a>
          <a href="#pricing">Pricing</a>
          <Link to="/demo">Live demo</Link>
          <Link to="/check">Free check</Link>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nc-landing-nav-cta">
          {user ? (
            <Link to="/app" className="nc-btn nc-btn-primary">Open workspace</Link>
          ) : (
            <>
              <Link to="/login" className="nc-btn nc-btn-ghost">Sign in</Link>
              <Link to="/signup" className="nc-btn nc-btn-primary">Start free trial</Link>
            </>
          )}
        </div>
      </header>

      <section className="nc-hero">
        <div className="nc-hero-copy">
          <span className="nc-eyebrow">For Nigerian operators &amp; oil and gas service companies</span>
          <h1>NCDMB compliance reports, done in hours — not weeks.</h1>
          <p>
            Track Nigerian Content spend, expatriate quotas and contracts in one shared workspace, then produce every
            statutory NCDMB report from the same numbers. No more chasing spreadsheets before each deadline.
          </p>
          <div className="nc-hero-cta">
            <Link to="/signup" className="nc-btn nc-btn-primary nc-btn-lg">Start your {TRIAL_DAYS}-day free trial <ArrowRight size={18} /></Link>
            <Link to="/demo" className="nc-btn nc-btn-ghost nc-btn-lg">See a live demo</Link>
          </div>
          <p className="nc-hero-note">No card required · Set up in two minutes · <Link to="/demo">Try the demo without signing up</Link></p>
        </div>

        <div className="nc-hero-preview" aria-hidden="true">
          <div className="nc-preview-card">
            <div className="nc-preview-top">
              <span>Nigerian Content position · sample</span><b>Q{Math.floor(new Date().getMonth() / 3) + 1}</b>
            </div>
            <div className="nc-preview-gauge"><div style={{ width: "72%" }} /><i style={{ left: "70%" }} /></div>
            <div className="nc-preview-stats">
              <div><small>NC achieved</small><strong>72.4%</strong></div>
              <div><small>Target</small><strong>70%</strong></div>
              <div><small>Status</small><strong className="is-good">On track</strong></div>
            </div>
          </div>
          <div className="nc-preview-card">
            <div className="nc-preview-top"><span>Upcoming deadlines</span><BellRing size={14} /></div>
            {["Job Forecast Report (§18)", "Procurement Report — Services (§24)", "Marine Services Utilization (§24)"].map((r) => (
              <div className="nc-preview-row" key={r}>
                <span>{r}</span><em>{days >= 0 ? `${days} days` : "due"}</em>
              </div>
            ))}
            <div className="nc-preview-foot">For {nextQuarter?.quarterLabel} · due {nextQuarter?.deadlineLabel}</div>
          </div>
        </div>
      </section>

      <section className="nc-check-banner">
        <div>
          <strong>Not sure which NCDMB reports you owe, or when?</strong>
          <span>Take the free 2-minute NC Compliance Check. Get your compliance score, the reports you're likely to owe and your next deadlines. No sign-up.</span>
        </div>
        <Link to="/check" className="nc-btn nc-btn-primary">Check my compliance <ArrowRight size={16} /></Link>
      </section>

      <section id="features" className="nc-section">
        <h2>Everything your compliance desk needs, in one place</h2>
        <p className="nc-section-sub">Replace the spreadsheets, email threads and last-minute scrambles with a single source of truth for your Nigerian Content obligations.</p>
        <div className="nc-feature-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="nc-feature">
              <Icon size={22} color="#E6A23C" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nc-section">
        <h2>How it works</h2>
        <div className="nc-steps-grid">
          {STEPS.map((s) => (
            <article key={s.n} className="nc-step">
              <span>{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="reports" className="nc-section">
        <h2>Covers the NOGICD Act reporting schedule</h2>
        <p className="nc-section-sub">Based on NCDMB's published Monitoring &amp; Evaluation reporting templates.</p>
        <div className="nc-report-grid">
          {STATUTORY_REPORTS.map((r) => (
            <div key={r.name} className="nc-report-chip">
              <ShieldCheck size={14} /> <span>{r.name}</span> <small>§{r.section}</small>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="nc-section">
        <h2>Simple annual pricing</h2>
        <p className="nc-section-sub">Every plan starts with a {TRIAL_DAYS}-day free trial of all features. Prices in naira, billed yearly.</p>
        {foundingOpen && (
          <p className="nc-founding-banner"><strong>Founding customer offer:</strong> the first {FOUNDING.companies} companies get {FOUNDING.percentOff}% off any plan, locked for {FOUNDING.years} years.</p>
        )}
        <div className="nc-pricing-grid">
          {PLANS.map((p) => (
            <article key={p.id} className={`nc-price-card ${p.recommended ? "is-recommended" : ""}`}>
              {p.recommended && <span className="nc-price-badge">Most popular</span>}
              <h3>{p.name}</h3>
              <PriceTag plan={p} founding={foundingOpen} />
              <p>{p.tagline}</p>
              <ul>
                {p.features.map((f) => <li key={f}><CheckCircle2 size={15} /> {f}</li>)}
              </ul>
              <Link to="/signup" className={`nc-btn ${p.recommended ? "nc-btn-primary" : "nc-btn-ghost"}`}>Start free trial</Link>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="nc-section nc-faq">
        <h2>Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <section className="nc-final-cta">
        <h2>Your next NCDMB deadline is {days >= 0 ? `${days} days away` : "here"}.</h2>
        <p>Get your team set up before it arrives.</p>
        <Link to="/signup" className="nc-btn nc-btn-primary nc-btn-lg">Start free trial <ArrowRight size={18} /></Link>
      </section>

      <LegalFooter />
    </div>
  );
}
