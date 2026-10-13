import { Link } from "react-router-dom";
import { Clock, Lock, Eye } from "lucide-react";

export function AccessBanner({ access, role, canManageBilling }) {
  if (!access.hasAccess) {
    return (
      <div className="nc-banner is-danger no-print" role="alert">
        <Lock size={16} />
        <span>
          <strong>This workspace is read-only.</strong> Your {access.trialing ? "free trial" : "subscription"} has ended.
          {canManageBilling ? " Choose a plan to keep working — your data is safe." : " Ask your company admin to renew."}
        </span>
        {canManageBilling && <Link to="/app/billing" className="nc-banner-cta">Choose a plan</Link>}
      </div>
    );
  }
  if (access.trialing) {
    return (
      <div className="nc-banner no-print">
        <Clock size={16} />
        <span>
          <strong>{access.daysLeft} {access.daysLeft === 1 ? "day" : "days"} left</strong> in your free trial.
        </span>
        {canManageBilling && <Link to="/app/billing" className="nc-banner-cta">See plans</Link>}
      </div>
    );
  }
  if (role === "viewer") {
    return (
      <div className="nc-banner is-muted no-print">
        <Eye size={16} /> <span>You have view-only access to this company.</span>
      </div>
    );
  }
  return null;
}
