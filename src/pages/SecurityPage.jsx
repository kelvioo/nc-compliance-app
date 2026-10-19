import { Link } from "react-router-dom";
import { CreditCard, Database, FileLock2, History, KeyRound, Lock, ShieldCheck, Users } from "lucide-react";
import { SUPPORT_EMAIL } from "../lib/config";
import { usePageMeta } from "../lib/usePageMeta";
import { PublicPage } from "./PublicPage";

// Only claims that are true of how the app is built and hosted today.
const POINTS = [
  { icon: Lock, title: "Encrypted in transit and at rest", text: "Every connection uses HTTPS (TLS). Your database and stored files are encrypted at rest by our hosting provider." },
  { icon: Database, title: "Each company's data kept separate", text: "Row-level security in the database checks every request against company membership, so one company can never read another's records." },
  { icon: Users, title: "Role-based access", text: "People join only by invitation from your admins, as owner, admin, approver, reviewer, preparer or viewer. Viewers can see but not change anything." },
  { icon: History, title: "Audit trail", text: "Changes, approvals and NCDMB submissions are recorded with who did them and when, so you can always show how a report was prepared." },
  { icon: FileLock2, title: "Private document storage", text: "Certificates and submission packs are stored privately per company and opened through short-lived, signed download links." },
  { icon: KeyRound, title: "Secure sign-in", text: "Each person signs in with their own account. Sign-in credentials are hashed, never stored in readable form, and account recovery goes to the verified email address." },
  { icon: CreditCard, title: "Payments through Paystack", text: "Card and bank payments are handled by Paystack. NC Compliance never sees or stores your card details." },
  { icon: ShieldCheck, title: "Nigeria Data Protection Act 2023", text: "We process personal data in line with the NDPA. Your company owns its compliance data; we process it only to provide the service." },
];

export default function SecurityPage() {
  usePageMeta("Security & data protection · NC Compliance", "/security");
  return (
    <PublicPage>
      <section className="nc-public-hero">
        <span className="nc-eyebrow">Security &amp; data protection</span>
        <h1>Your compliance data, protected</h1>
        <p>
          NCDMB reports contain contract values, vendor details and staffing information. Here is how NC Compliance
          keeps that information private and under your company's control.
        </p>
      </section>

      <section className="nc-public-section">
        <div className="nc-security-grid">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="nc-feature">
              <Icon size={22} color="#E6A23C" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nc-public-section nc-public-prose">
        <h2>Where your data is hosted</h2>
        <p>
          The application is served by <strong>Vercel</strong>. Your company's records and files are held in a
          managed PostgreSQL database and file store run by <strong>Supabase</strong> on Amazon Web Services in the
          <strong> London (UK)</strong> region.
        </p>

        <h2>Your data belongs to you</h2>
        <ul>
          <li>Download any report as PDF or Excel, and your full spend log as CSV, at any time.</li>
          <li>If your subscription ends, your workspace becomes read-only. Nothing is deleted, and you can still view and export it.</li>
          <li>Ask us to delete your company's workspace and we will remove its data, except records we must keep by law (such as payment records).</li>
        </ul>

        <h2>Questions from your IT or procurement team</h2>
        <p>
          We're happy to answer security questionnaires and vendor-onboarding questions.
          {SUPPORT_EMAIL ? <> Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or use the <Link to="/contact">contact form</Link>.</> : <> Use the <Link to="/contact">contact form</Link>.</>}
          {" "}To report a security concern, email us with the details and we'll respond promptly.
        </p>
        <p>See also our <Link to="/privacy">privacy policy</Link> and <Link to="/terms">terms of service</Link>.</p>
      </section>
    </PublicPage>
  );
}
