# NC Compliance

Self-serve SaaS for Nigerian oil & gas companies to track Nigerian Content
data and produce their statutory NCDMB reports. Companies sign up, get a
14-day trial, invite their team, and pay yearly via Paystack.

- **Frontend:** React 19 + Vite + React Router, deployed on Vercel
- **Backend:** Supabase: Auth, Postgres with row-level security, Edge Functions, pg_cron

## How it fits together

| Piece | Where |
|---|---|
| Landing, sign-up, onboarding, invites | `src/pages/` |
| Workspace shell (sidebar, banners, saving) | `src/app/` |
| Report screens (spend log, §18/§24/§60 reports, NC Plan…) | `src/views/` |
| Team / Billing / Settings | `src/views/TeamView.jsx`, `BillingView.jsx`, `SettingsView.jsx` |
| Database schema, security rules, functions | `supabase/migrations/` |
| Paystack checkout + webhook | `supabase/functions/billing` |
| Invite emails | `supabase/functions/send-email` |
| Daily deadline / trial / renewal emails | `supabase/functions/deadline-reminders` (run by pg_cron at 07:00 Lagos time) |

**Data model.** Each company is an `organization`. People join through
`memberships` with a role (owner, admin, approver, reviewer, preparer, viewer).
A company's compliance data is one JSON document in `workspaces`, saved only
through `save_workspace()`, which rejects stale saves (`version_conflict`)
instead of overwriting a teammate's work. Every change is written to
`audit_log`. Clients can't write to any table directly; every write goes
through a function that checks the caller's role and whether the
subscription is active.

**Plans.** Prices are in the `plans` table (the server charges from there;
`src/lib/plans.js` is display copy only, so keep the two in step). Trials
last 14 days. When a trial or plan lapses, the workspace becomes read-only
and the data is kept.

## Local development

```bash
cp .env.example .env.local   # fill in the publishable key
npm install
npm run dev
npm run lint && npm run build
```

## Going live checklist

1. **Vercel:** import this repo and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   (and optionally `VITE_SUPPORT_EMAIL`). `vercel.json` already routes all paths to the SPA.
2. **Supabase → Authentication → URL configuration:** set *Site URL* to the
   production domain and add `https://<domain>/**` to *Redirect URLs*.
3. **Supabase → Authentication → SMTP:** add a custom SMTP sender. The built-in one
   only sends a handful of emails per hour, which isn't enough for sign-up confirmations.
4. **Edge Function secrets** (Supabase → Edge Functions → Secrets):
   - `PAYSTACK_SECRET_KEY`: enables checkout
   - `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `NC Compliance <hello@yourdomain.com>`), `APP_URL`
     (e.g. `https://yourdomain.com`): enable invite and reminder emails
5. **Paystack dashboard → Settings → API Keys & Webhooks:** set the webhook URL to
   `https://utexliymdbzevaamuhbf.supabase.co/functions/v1/billing`.
6. Apply `supabase/migrations/20261013090200_remove_member.sql` (it needs
   approval because it contains a `DELETE`). Until it's applied, "Remove" and "Leave"
   on the Team page won't work.
7. Publish a privacy policy and terms of service, and review them against the Nigeria
   Data Protection Act 2023.

## Labs

The unfinished *Operations assurance* and *Deal rooms & trade* modules are
hidden. To show them, set `VITE_ENABLE_LABS=true`.
