// Display copy for the pricing page and billing screen. The amount actually
// charged comes from the `plans` table on the server, never from here.
export const PLANS = [
  {
    id: "starter", name: "Starter", price: 150000, seats: 5,
    tagline: "For a single asset or a contractor's compliance desk.",
    features: ["All 15 NCDMB report templates", "Deadline calendar & email reminders", "Review & approval workflow", "Document vault with expiry alerts", "Up to 5 team members"],
  },
  {
    id: "operations", name: "Operations", price: 450000, seats: 25, recommended: true,
    tagline: "For operators and service companies with several teams.",
    features: ["Everything in Starter", "Up to 25 team members", "Room for preparers, reviewers and approvers across departments", "Full audit trail and filing history"],
  },
  {
    id: "enterprise", name: "Enterprise", price: 1000000, seats: null,
    tagline: "For multi-asset operators and compliance consultancies.",
    features: ["Everything in Operations", "Unlimited team members", "Priority onboarding & data import", "Dedicated account manager"],
  },
];

export const TRIAL_DAYS = 30;

export function planName(id) {
  if (id === "trial") return "Free trial";
  return PLANS.find((p) => p.id === id)?.name || id;
}

// Mirrors private.org_has_access() in the database, which is what actually
// enforces it; this copy only drives what the UI shows.
export function orgAccess(org) {
  const now = Date.now();
  if (!org) return { hasAccess: false, trialing: false, daysLeft: 0 };
  if (org.subscription_status === "active") {
    const end = org.current_period_end ? new Date(org.current_period_end).getTime() : Infinity;
    return { hasAccess: end > now, trialing: false, daysLeft: Math.ceil((end - now) / 86400000) };
  }
  if (org.subscription_status === "trialing") {
    const end = new Date(org.trial_ends_at).getTime();
    return { hasAccess: end > now, trialing: true, daysLeft: Math.max(0, Math.ceil((end - now) / 86400000)) };
  }
  return { hasAccess: false, trialing: false, daysLeft: 0 };
}
