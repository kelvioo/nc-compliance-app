import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, ShieldCheck, Target, Users } from "lucide-react";
import { LINKEDIN_URL, SUPPORT_EMAIL } from "../lib/config";
import { usePageMeta } from "../lib/usePageMeta";
import { PublicPage } from "./PublicPage";
import { LinkedInIcon } from "./LegalPage";

const FOUNDER_LINKEDIN = "https://www.linkedin.com/in/kelviniheanyiokah/";

const VALUES = [
  { icon: Target, title: "Built for Nigerian Content teams", text: "Every screen follows NCDMB's own reporting templates and deadlines, so compliance officers recognise what they see." },
  { icon: ShieldCheck, title: "Your data stays yours", text: "Each company's records are kept separate, only people you invite can see them, and you can export everything at any time." },
  { icon: Users, title: "Made for the whole team", text: "Preparers, reviewers and approvers each sign off in the app, so reports are checked before they reach NCDMB." },
];

// Founder photo: drop a square image at public/founder.jpg and it appears;
// until then the initials show.
function FounderPhoto() {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="nc-founder-photo is-initials" aria-hidden="true">KO</div>;
  return <img className="nc-founder-photo" src="/founder.jpg" alt="Kelvin Okah, Founder & CEO of NC Compliance" onError={() => setFailed(true)} />;
}

export default function AboutPage() {
  usePageMeta("About us · NC Compliance", "/about");
  return (
    <PublicPage>
      <section className="nc-public-hero">
        <span className="nc-eyebrow">About NC Compliance</span>
        <h1>Making NCDMB compliance simple for Nigerian oil &amp; gas companies</h1>
        <p>
          NC Compliance is reporting software for operators, contractors and service companies that report to the
          Nigerian Content Development and Monitoring Board. Teams record their spend, contracts, vessels and
          expatriate positions once, and every statutory report is prepared from the same numbers.
        </p>
      </section>

      <section className="nc-public-section nc-founder">
        <FounderPhoto />
        <div>
          <h2>Why we built it</h2>
          <p>
            Nigerian Content matters: it keeps contracts, jobs and skills in the country. But reporting on it has
            mostly meant spreadsheets passed between departments, numbers retyped for each template, and a rush
            before every quarterly deadline.
          </p>
          <p>
            We built NC Compliance so compliance teams can spend their time on the work itself, not on formatting.
            The data is entered once, reviewed and approved inside the app, and turned into NCDMB-ready reports
            with a clear record of who did what.
          </p>
          <p className="nc-founder-sign">
            <strong>Kelvin Okah</strong><br />Founder &amp; CEO
            <a href={FOUNDER_LINKEDIN} target="_blank" rel="noopener noreferrer" className="nc-founder-li"><LinkedInIcon size={15} /> LinkedIn</a>
          </p>
        </div>
      </section>

      <section className="nc-public-section">
        <h2>What we stand for</h2>
        <div className="nc-value-grid">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="nc-feature">
              <Icon size={22} color="#E6A23C" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nc-public-section nc-facts">
        <div><MapPin size={16} /> <span>Based in <strong>Port Harcourt, Rivers State, Nigeria</strong></span></div>
        {SUPPORT_EMAIL && <div><span>Email</span> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></div>}
        <div><LinkedInIcon size={15} /> <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">NC Compliance on LinkedIn</a></div>
      </section>

      <p className="nc-public-note">
        NC Compliance is independent software. It is not affiliated with or endorsed by NCDMB. Your company remains
        responsible for what it submits.
      </p>

      <section className="nc-public-cta">
        <h2>See it with your own data</h2>
        <div className="nc-hero-cta">
          <Link to="/signup" className="nc-btn nc-btn-primary nc-btn-lg">Start free trial <ArrowRight size={18} /></Link>
          <Link to="/contact" className="nc-btn nc-btn-ghost nc-btn-lg">Talk to us</Link>
        </div>
      </section>
    </PublicPage>
  );
}
