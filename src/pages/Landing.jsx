import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CalendarClock, CheckCircle2, ClipboardList, FileText, ShieldCheck, BellRing, History, Send, FolderLock, PackageCheck,
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
  { icon: PackageCheck, title: "One-click submission pack", text: "At period end, get a cover letter addressed to NCDMB and every approved report in a single PDF, ready to sign and submit." },
];

const SHOTS = [
  { id: "home", label: "Home", src: "/screens/home.webp", caption: "Upcoming NCDMB deadlines, approval status and expiring certificates at a glance.", demo: "/demo" },
  { id: "report", label: "NCDMB reports", src: "/screens/report.webp", caption: "Reports laid out like NCDMB's templates, ready to download as PDF or Excel.", demo: "/demo/forecast" },
  { id: "approvals", label: "Approvals", src: "/screens/approvals.webp", caption: "Every report moves from preparation to review, approval and NCDMB submission.", demo: "/demo/submissions" },
  { id: "pack", label: "Submission pack", src: "/screens/pack.webp", caption: "A cover letter and every report for the period in one PDF.", demo: "/demo/pack" },
];

function Showcase() {
  const [active, setActive] = useState(SHOTS[0].id);
  const shot = SHOTS.find((s) => s.id === active);
  return (
    <section id="product" className="nc-section nc-showcase">
      <h2>See it in action</h2>
      <p className="nc-section-sub">The real app, shown with our sample company. Open the live demo to click through it yourself.</p>
      <div className="nc-showcase-tabs" role="tablist">
        {SHOTS.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === active} className={s.id === active ? "is-active" : ""} onClick={() => setActive(s.id)}>{s.label}</button>
        ))}
      </div>
      <figure className="nc-showcase-frame">
        <div className="nc-showcase-chrome"><i /><i /><i /><span>nccompliance.com.ng/app</span></div>
        <img src={shot.src} alt={`${shot.label}: ${shot.caption}`} width="1200" height="750" loading="lazy" />
      </figure>
      <p className="nc-showcase-caption">{shot.caption} <Link to={shot.demo}>Try it in the demo <ArrowRight size={14} /></Link></p>
    </section>
  );
}

const STEPS = [
  { n: "1", title: "Create your workspace", text: "Sign up with your work email and add your company. Takes two minutes." },
  { n: "2", title: "Log your activity", text: "Enter spend, contracts, expatriate positions and vessels as they happen, in one shared workspace." },
  { n: "3", title: "Approve and submit", text: "Your team reviews and approves each report, then you download the whole submission pack — cover letter and reports — in one PDF." },
];

const FAQ = [
  { q: "Is NC Compliance affiliated with NCDMB?", a: "No. NC Compliance is an independent software tool. It organises your data into the layouts of NCDMB's published reporting templates; your company remains responsible for what it submits and for using its approved methodology." },
  { q: "Where is our data stored?", a: "In a managed PostgreSQL database (Supabase) in the London region, encrypted in transit and at rest. Each company's data is isolated at the database level, so only people your admins invite can see it." },
  { q: "Do I need a card to start the trial?", a: `No. You get ${TRIAL_DAYS} days with every feature. At the end, choose a plan to keep editing — your data stays safe and readable either way.` },
  { q: "Can we pay by invoice or bank transfer?", a: `Yes. Card payments go through Paystack; for procurement-led purchases we can issue an invoice instead${SUPPORT_EMAIL ? ` — email ${SUPPORT_EMAIL}` : ""}.` },
  { q: "We're a consultancy preparing reports for several clients. Does that work?", a: "Yes. One login can belong to several company workspaces, and you can switch between them from the sidebar." },
  { q: "Which NCDMB reports does it cover?", a: "Job Forecast (§18), Procurement — Materials and Services, and Marine (§24), Succession Plan (§33), NC Performance (§60), NCDF & NCFCC (§104), the NC Plan, and the Employment & Training, R&D, Technology Transfer, Insurance, Legal and Financial services reports." },
  { q: "Can NC Compliance submit to NCDMB for us?", a: "NCDMB doesn't offer a public way for software to file on a company's behalf, so the final submission comes from your company. NC Compliance prepares everything up to that point: approved reports and a cover letter in one PDF, ready to upload or email to NCDMB." },
  { q: "What happens when the trial ends?", a: "Your workspace becomes read-only until you choose a plan. Nothing is deleted, and you can still view and download everything." },
  { q: "Can you help us get started or move our spreadsheets in?", a: "Yes. Send us a message from the contact page and we'll help you set up your workspace and bring your existing records across. Enterprise plans include guided onboarding." },
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
          <a href="#product">Product</a>
          <a href="#pricing">Pricing</a>
          <Link to="/demo">Live demo</Link>
          <Link to="/check">Free check</Link>
          <Link to="/about">About</Link>
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

      <Showcase />

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
        <p className="nc-section-sub">Read how we protect your data on our <Link to="/security">security page</Link>, or <Link to="/contact">send us a question</Link>.</p>
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
