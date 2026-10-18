import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../components/ui";
import { SUPPORT_EMAIL } from "../lib/config";
import { TRIAL_DAYS } from "../lib/plans";
import WhatsAppButton from "../components/WhatsAppButton";
import { usePageMeta } from "../lib/usePageMeta";

const UPDATED = "15 October 2026";
const SITE = "nccompliance.com.ng";

function Contact() {
  return SUPPORT_EMAIL
    ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    : <>the contact details on <Link to="/">{SITE}</Link></>;
}

function Privacy() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="nc-legal-meta">Last updated {UPDATED}</p>
      <p>
        This policy explains how NC Compliance ("we", "us") collects and uses personal data when you use {SITE} and
        the NC Compliance app. We follow the Nigeria Data Protection Act 2023 (NDPA) and the rules of the Nigeria Data
        Protection Commission (NDPC).
      </p>

      <h2>1. Who is responsible for your data</h2>
      <p>
        For your account, billing and how you use the service, we are the <strong>data controller</strong>.
      </p>
      <p>
        For the compliance records your company puts into its workspace (spend, contracts, staff positions, vessels,
        documents), your company is the controller and we are its <strong>data processor</strong>. We only process
        that data to provide the service to your company.
      </p>
      <p>Contact us about privacy at <Contact />.</p>

      <h2>2. What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, work email address, password (stored only as a secure hash) and your role in your company's workspace.</li>
        <li><strong>Compliance check:</strong> if you use the free compliance check on our website and choose to send us your details, we keep your name, company, email, phone number (if given) and your answers, so we can follow up about your results.</li>
        <li><strong>Company details:</strong> company name, type (operator or contractor), NCEC or registration numbers and the billing email you give us.</li>
        <li><strong>Workspace content:</strong> the data, reports and documents your team enters or uploads. This can include names and job titles of staff, such as expatriate positions or Nigerian understudies.</li>
        <li><strong>Payment records:</strong> plan, amount, date and Paystack reference. Paystack handles your card details; we never see or store your card number.</li>
        <li><strong>Usage and security records:</strong> sign-in times, an audit log of changes in your workspace, and technical logs (such as IP address and browser) kept by our hosting providers.</li>
      </ul>

      <h2>3. Why we use it, and our lawful basis</h2>
      <ul>
        <li><strong>To provide the service</strong> (accounts, workspaces, reports, team invitations and document storage). Basis: performance of our contract with you or your company.</li>
        <li><strong>To send service emails</strong> (sign-up confirmation, password resets, invitations, NCDMB deadline, trial, renewal and document-expiry reminders). Basis: contract. These emails are part of the service; your company's admins control who is in the workspace.</li>
        <li><strong>To take payments and keep financial records.</strong> Basis: contract and legal obligation.</li>
        <li><strong>To keep the service secure,</strong> prevent misuse and fix problems. Basis: our legitimate interests.</li>
        <li><strong>To follow up on a compliance check you asked us about.</strong> Basis: your consent, which you can withdraw at any time by emailing us.</li>
        <li><strong>To answer your questions</strong> and tell you about important changes. Basis: contract and legitimate interests.</li>
      </ul>
      <p>We do not sell personal data, and we do not use it for advertising.</p>

      <h2>4. Who we share it with</h2>
      <p>We use these service providers. Each one processes data only on our instructions:</p>
      <ul>
        <li><strong>Supabase:</strong> database, sign-in and file storage, hosted in London, United Kingdom.</li>
        <li><strong>Vercel:</strong> website hosting and delivery, and anonymous visit statistics (pages viewed, country and device type, with no cookies and nothing that identifies you).</li>
        <li><strong>Resend:</strong> sending emails, from servers in Ireland (EU).</li>
        <li><strong>Paystack:</strong> card and bank payments, in Nigeria.</li>
      </ul>
      <p>
        We may also disclose data if Nigerian law or a valid order from a court or regulator requires it. We never give
        your workspace data to NCDMB or any other body on your behalf. You decide what you submit.
      </p>

      <h2>5. Transfers outside Nigeria</h2>
      <p>
        Some of our providers store or process data outside Nigeria, mainly in the United Kingdom and the European
        Union. Both have data protection laws the NDPA recognises as adequate. We also rely on our providers'
        contractual data protection commitments, as allowed under sections 41–43 of the NDPA.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li><strong>Account and workspace data:</strong> for as long as the account exists. If a trial or plan ends, the workspace becomes read-only and the data is kept so you can come back to it. Ask us to delete it at any time.</li>
        <li><strong>After a deletion request:</strong> we delete the workspace and its files within 30 days. Backups are overwritten within a further 30 days.</li>
        <li><strong>Payment records:</strong> six years, as Nigerian tax law requires.</li>
        <li><strong>Security logs:</strong> usually no longer than 90 days.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>Under the NDPA you can ask us to:</p>
      <ul>
        <li>give you a copy of your personal data;</li>
        <li>correct data that is wrong or incomplete;</li>
        <li>delete your data;</li>
        <li>restrict or object to how we use it;</li>
        <li>send your data to you or another provider in a machine-readable format (data portability);</li>
        <li>withdraw consent, where we rely on consent.</li>
      </ul>
      <p>
        Email <Contact /> and we will reply within 30 days. If your request is about your company's workspace content,
        we may refer you to your company's admins, because they control that data.
      </p>
      <p>
        If you are unhappy with how we handle your data, you can complain to the Nigeria Data Protection Commission
        (<a href="https://ndpc.gov.ng" target="_blank" rel="noreferrer">ndpc.gov.ng</a>).
      </p>

      <h2>8. Security</h2>
      <p>
        All data is encrypted in transit (HTTPS) and at rest. Each company's data is separated at the database level,
        so only members of a workspace can read it, and every change is recorded in an audit log. Staff access to
        customer data is limited to what we need to support you. If a breach is likely to put your rights at risk, we
        will tell the NDPC within 72 hours, and tell you without undue delay.
      </p>

      <h2>9. Cookies and local storage</h2>
      <p>
        We do not use advertising or tracking cookies. We count visits with Vercel Web Analytics, which sets no cookies and does not identify you. Your browser stores a sign-in session and a few preferences,
        such as the last company you opened, so the app works. These are strictly necessary and need no consent.
      </p>

      <h2>10. Children</h2>
      <p>The service is for businesses and is not meant for anyone under 18.</p>

      <h2>11. Changes to this policy</h2>
      <p>
        If we make an important change, we will update the date above and tell account owners by email before the change
        takes effect.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1>Terms of service</h1>
      <p className="nc-legal-meta">Last updated {UPDATED}</p>
      <p>
        These terms are an agreement between NC Compliance ("we", "us") and the organisation that creates a workspace
        ("you", "your company"). By creating an account or using the service, you accept these terms on behalf of your
        company and confirm that you are authorised to do so.
      </p>

      <h2>1. The service</h2>
      <p>
        NC Compliance is online software for recording Nigerian Content data and preparing reports in the layouts of
        the Nigerian Content Development and Monitoring Board's (NCDMB) published templates.
      </p>
      <p>
        <strong>We are independent of NCDMB.</strong> We are not affiliated with or endorsed by it, and we do not submit
        anything to NCDMB for you. We may improve or change features over time.
      </p>

      <h2>2. Your responsibilities</h2>
      <ul>
        <li>You are responsible for the accuracy and completeness of everything you enter, and for what you submit to NCDMB or any other authority. Our deadlines, calculations and templates are aids. Check them against current NCDMB guidance and your approved methodology.</li>
        <li>Keep passwords safe, and only invite people who should see your company's data. You are responsible for activity under your workspace's accounts.</li>
        <li>Only upload data you have the right to use, and handle staff personal data in line with the Nigeria Data Protection Act 2023.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>
        Do not misuse the service. That includes breaking the law, uploading malware, trying to reach other companies'
        data, testing our security without written permission, reselling the service without our agreement, or putting
        excessive load on our systems.
      </p>
      <p>We may suspend accounts that do this, and will tell you why where we lawfully can.</p>

      <h2>4. Free trial</h2>
      <p>
        New workspaces get a {TRIAL_DAYS}-day free trial with all features. No card is needed. When the trial ends, the
        workspace becomes read-only until you choose a plan. Your data is kept.
      </p>

      <h2>5. Plans, payment and renewal</h2>
      <ul>
        <li>Plans are billed yearly in Nigerian naira at the prices shown on our website when you buy. Payment is through Paystack, or by invoice where we agree.</li>
        <li>A plan runs for 12 months from payment. If you renew before it ends, the new year starts when the current one finishes, so you lose no paid time.</li>
        <li>Plans <strong>do not renew automatically</strong>. We email you before your plan ends. If you don't renew, the workspace becomes read-only and your data is kept.</li>
        <li>If you are unhappy within 7 days of your first payment, contact us for a full refund. Otherwise fees are non-refundable, except where Nigerian law requires a refund.</li>
        <li>We may change prices for future periods. Any change applies from your next renewal, never to a period you have already paid for.</li>
      </ul>

      <h2>6. Your data</h2>
      <p>
        Your company owns its workspace data. You give us permission to host and process it only to provide and support
        the service, as described in our <Link to="/privacy">privacy policy</Link>.
      </p>
      <p>
        You can export your reports at any time. We will delete your workspace within 30 days if the owner asks.
      </p>

      <h2>7. Availability and support</h2>
      <p>
        We work to keep the service available and back up data regularly, but we cannot promise it will be
        uninterrupted or error-free. Contact us at <Contact /> for help.
      </p>

      <h2>8. Liability</h2>
      <p>The service is provided "as is", to the extent the law allows.</p>
      <p>
        We are not liable for indirect or consequential losses, lost profits, or penalties and sanctions arising from
        reports or submissions you make. Our total liability for any claim is limited to the fees your company paid us
        in the 12 months before the claim.
      </p>
      <p>Nothing in these terms limits liability that cannot be limited under Nigerian law.</p>

      <h2>9. Ending the agreement</h2>
      <p>
        You can stop using the service at any time, and the workspace owner can ask us to delete the workspace.
      </p>
      <p>
        We may end or suspend the agreement if you seriously breach these terms. We will normally give notice and a
        chance to fix the problem first.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        If we make an important change, we will email workspace owners at least 14 days before it takes effect.
        Continuing to use the service after that means you accept the new terms.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria. We will try to settle any dispute
        informally first. If that fails, the courts of Nigeria have jurisdiction.
      </p>
    </>
  );
}

export default function LegalPage({ doc }) {
  usePageMeta(`${doc === "privacy" ? "Privacy policy" : "Terms of service"} · NC Compliance`, `/${doc}`);
  useEffect(() => { window.scrollTo(0, 0); }, [doc]);

  return (
    <div className="nc-landing nc-legal">
      <header className="nc-landing-nav">
        <Link to="/" className="nc-brand-link" aria-label="NC Compliance home"><Brand /></Link>
        <div className="nc-landing-nav-cta">
          <Link to="/" className="nc-btn nc-btn-primary">Back to home</Link>
        </div>
      </header>
      <article className="nc-legal-body">
        {doc === "privacy" ? <Privacy /> : <Terms />}
        <p className="nc-legal-switch">
          {doc === "privacy"
            ? <>See also our <Link to="/terms">terms of service</Link>.</>
            : <>See also our <Link to="/privacy">privacy policy</Link>.</>}
        </p>
      </article>
      <LegalFooter />
      <WhatsAppButton />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="nc-landing-footer">
      <Brand size={14} />
      <span>Independent software. Not affiliated with or endorsed by NCDMB.</span>
      <span className="nc-footer-links">
        {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>}
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <span>© {new Date().getFullYear()} NC Compliance</span>
      </span>
    </footer>
  );
}
