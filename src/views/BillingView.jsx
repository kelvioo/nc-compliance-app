import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, LockKeyhole } from "lucide-react";
import { supabase } from "../lib/supabase";
import { FOUNDING, PLANS, orgAccess, planName } from "../lib/plans";
import { orgGetsFounding, useFoundingOfferOpen } from "../lib/founding";
import { PriceTag } from "../components/PriceTag";
import { canManage } from "../lib/roles";
import { fmtNaira } from "../lib/compliance";
import { friendlyError } from "../lib/errors";
import { btnPrimary } from "../components/ui";
import { SUPPORT_EMAIL } from "../lib/config";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

export function BillingView({ org, role, notify }) {
  const [busy, setBusy] = useState("");
  const [payments, setPayments] = useState([]);
  const manager = canManage(role);
  const access = orgAccess(org);
  const founding = orgGetsFounding(org, useFoundingOfferOpen());

  useEffect(() => {
    if (!manager) return;
    supabase.from("payments").select("reference, plan, amount_kobo, status, paid_at")
      .eq("org_id", org.id).order("created_at", { ascending: false })
      .then(({ data }) => setPayments(data || []));
  }, [org.id, manager]);

  const checkout = async (plan) => {
    setBusy(plan.id);
    const { data, error } = await supabase.functions.invoke("billing", {
      body: { action: "checkout", orgId: org.id, plan: plan.id, callbackUrl: `${window.location.origin}/billing/callback` },
    });
    if (error || !data?.authorization_url) {
      let message = data?.error || friendlyError(error);
      try { message = (await error?.context?.json())?.error || message; } catch { /* not JSON */ }
      notify(message || "Couldn't start checkout. Please try again.");
      setBusy("");
      return;
    }
    window.location.assign(data.authorization_url);
  };

  let status;
  if (org.subscription_status === "active" && access.hasAccess) {
    status = <>You're on the <strong>{planName(org.plan)}</strong> plan, paid through {fmtDate(org.current_period_end)}.</>;
  } else if (access.trialing && access.hasAccess) {
    status = <>Your free trial ends on <strong>{fmtDate(org.trial_ends_at)}</strong> ({access.daysLeft} days left). Choose a plan any time — you won't lose any data.</>;
  } else {
    status = <>Your {access.trialing ? "trial" : "subscription"} has ended and the workspace is read-only. Choose a plan to continue.</>;
  }

  return (
    <div className="nc-main-content nc-premium-page">
      <div className="nc-premium-heading">
        <div>
          <span>ACCOUNT</span>
          <h1>Billing</h1>
          <p>{status}</p>
        </div>
        <LockKeyhole color="#E6A23C" size={28} />
      </div>

      {!manager && <p className="nc-form-help">Only the company owner or an admin can change the plan.</p>}

      {founding && (
        <p className="nc-founding-banner">
          {org.founding_until
            ? <><strong>Founding customer:</strong> your {FOUNDING.percentOff}% founding price is locked until {fmtDate(org.founding_until)}.</>
            : <><strong>Founding customer offer:</strong> pay now and lock in {FOUNDING.percentOff}% off for {FOUNDING.years} years. Only for the first {FOUNDING.companies} companies.</>}
        </p>
      )}

      <div className="nc-plan-grid">
        {PLANS.map((plan) => {
          const current = org.plan === plan.id && org.subscription_status === "active" && access.hasAccess;
          return (
            <article className={`nc-plan-card ${plan.recommended ? "is-recommended" : ""}`} key={plan.id}>
              {plan.recommended && <span className="nc-best-value">MOST POPULAR</span>}
              <h2>{plan.name}</h2>
              <PriceTag plan={plan} founding={founding} className="nc-price" />
              <p>{plan.tagline}</p>
              <ul className="nc-feature-list">
                {plan.features.map((f) => <li key={f}><CheckCircle2 size={14} /> {f}</li>)}
              </ul>
              <button style={btnPrimary} disabled={!manager || Boolean(busy)} onClick={() => checkout(plan)}>
                <CreditCard size={16} />
                {busy === plan.id ? "Opening secure checkout…" : current ? `Renew ${plan.name} for another year` : `Choose ${plan.name}`}
              </button>
            </article>
          );
        })}
      </div>
      <p className="nc-billing-footnote">
        Payments are processed by Paystack. Plans are paid yearly in naira and never renew automatically — we'll remind you before your year ends.{SUPPORT_EMAIL && <> Need an invoice or bank transfer for procurement? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</>}
      </p>

      {manager && payments.length > 0 && (
        <>
          <h2 className="nc-section-title">Payment history</h2>
          <div className="nc-table-card">
            <table className="nc-table">
              <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.reference}>
                    <td>{p.paid_at ? fmtDate(p.paid_at) : "—"}</td>
                    <td>{planName(p.plan)}</td>
                    <td>{fmtNaira((p.amount_kobo || 0) / 100)}</td>
                    <td>{p.status}</td>
                    <td><code>{p.reference}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
