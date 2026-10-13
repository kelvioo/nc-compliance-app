// Turns the short error codes raised by our database functions into
// sentences people can act on.
const MESSAGES = {
  version_conflict: "Someone else on your team saved changes a moment ago. We've loaded their latest version — please re-apply your last edit.",
  subscription_required: "Your trial or subscription has ended, so the workspace is read-only. Choose a plan under Billing to keep working.",
  forbidden: "Your role doesn't allow that. Ask an admin on your team.",
  seat_limit_reached: "You've reached the team size included in your plan. Upgrade under Billing to add more people.",
  already_member: "That person is already on your team.",
  invalid_role: "That role can't be assigned.",
  invitation_not_found: "This invitation link isn't valid.",
  invitation_used: "This invitation has already been used.",
  invitation_expired: "This invitation has expired. Ask your admin to send a new one.",
  invitation_email_mismatch: "This invitation was sent to a different email address. Sign in with that address to accept it.",
  not_authenticated: "Please sign in again.",
};

export function friendlyError(err) {
  const msg = (err && (err.message || err.error_description || String(err))) || "Something went wrong.";
  for (const [code, text] of Object.entries(MESSAGES)) {
    if (msg.includes(code)) return text;
  }
  return msg;
}
