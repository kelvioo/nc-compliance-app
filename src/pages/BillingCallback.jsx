import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { planName } from "../lib/plans";
import { Brand } from "../components/ui";

// Paystack sends the customer back here after checkout. The webhook is what
// normally activates the plan; verifying here as well means the customer
// sees their plan active straight away even if the webhook is delayed.
export default function BillingCallback() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const [state, setState] = useState({ status: "verifying" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!reference) { setState({ status: "error", message: "No payment reference was returned." }); return; }
    supabase.functions.invoke("billing", { body: { action: "verify", reference } }).then(async ({ data, error }) => {
      if (error || !data?.ok) {
        let message = data?.error;
        try { message = (await error?.context?.json())?.error || message; } catch { /* not JSON */ }
        setState({ status: "error", message: message || "We couldn't confirm this payment yet." });
      } else {
        setState({ status: "ok", plan: data.plan });
      }
    });
  }, [reference]);

  return (
    <div className="nc-auth-page">
      <div className="nc-auth-card">
        <div className="nc-auth-brand"><Brand /></div>
        {state.status === "verifying" && <><Loader2 size={30} className="nc-spin" /><h1>Confirming your payment…</h1></>}
        {state.status === "ok" && <>
          <CheckCircle2 size={34} color="#4FAE7E" />
          <h1>You're on the {planName(state.plan)} plan</h1>
          <p className="nc-auth-sub">Thank you. A receipt is on its way from Paystack.</p>
          <Link to="/app/billing">Go to your workspace</Link>
        </>}
        {state.status === "error" && <>
          <AlertTriangle size={30} color="#E6A23C" />
          <h1>Payment not confirmed</h1>
          <p className="nc-auth-sub">{state.message} If you were charged, your plan will activate automatically within a few minutes — or contact us with reference <code>{reference}</code>.</p>
          <Link to="/app/billing">Back to billing</Link>
        </>}
      </div>
    </div>
  );
}
