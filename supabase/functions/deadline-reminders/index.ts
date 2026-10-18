// Daily reminder emails, run by pg_cron (see the reminders migration).
//
//  * NCDMB deadlines: 14, 7, 3 and 1 day(s) before each quarterly
//    (§18 / §24, due 30 days before the quarter starts) and annual
//    (§60, due 60 days into the year) submission — same rules as the
//    in-app compliance calendar.
//  * Trial ending (3 and 1 day before) and plan expiry (30 and 7 days before).
//  * Documents in the vault expiring in 30, 7 and 1 day(s).
//  * A daily summary for the product owner (ADMIN_EMAIL): sign-ups, payments,
//    compliance-check leads, trials about to end.
//
// Each reminder is claimed in reminder_log before sending, so it goes out at
// most once per company, report, deadline and lead time even if the job runs
// twice. Deployed with verify_jwt = false; callers must send the cron secret
// stored in Vault (checked by public.verify_cron_secret).
//
// Secrets: RESEND_API_KEY, EMAIL_FROM, APP_URL, ADMIN_EMAIL (optional).
// Without the first three it does a dry run.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");
const LOGO_URL = `${(APP_URL || "https://nccompliance.com.ng").replace(/\/$/, "")}/email-logo.png`;
const CAN_SEND = Boolean(RESEND_API_KEY && EMAIL_FROM && APP_URL);
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "";
const DOC_LEADS = [30, 7, 1];

const DAY = 86400000;
const DEADLINE_LEADS = [14, 7, 3, 1];
const TRIAL_LEADS = [3, 1];
const RENEWAL_LEADS = [30, 7];

const QUARTERLY_REPORTS = [
  "Job Forecast Report (§18)",
  "Procurement Report — Materials (§24)",
  "Procurement Report — Services (§24)",
  "Marine Services Utilization Report (§24)",
];

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// Calendar dates in Lagos time (UTC+1, no daylight saving), as UTC midnights.
function lagosToday() {
  const now = new Date(Date.now() + 3600000);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const pretty = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function upcomingDeadlines(today: number) {
  const year = new Date(today).getUTCFullYear();
  const list: { key: string; deadline: number; title: string; reports: string[] }[] = [];
  for (const y of [year, year + 1]) {
    for (let q = 0; q < 4; q++) {
      const start = Date.UTC(y, q * 3, 1);
      list.push({
        key: `quarterly:${y}-Q${q + 1}`,
        deadline: start - 30 * DAY,
        title: `Q${q + 1} ${y} quarterly NCDMB reports`,
        reports: QUARTERLY_REPORTS,
      });
    }
    list.push({
      key: `annual:${y}`,
      deadline: Date.UTC(y, 0, 1) + 60 * DAY,
      title: `${y} NC Performance Report (§60)`,
      reports: ["NC Performance Report (§60)"],
    });
  }
  return list.filter((d) => d.deadline >= today);
}

function layout(title: string, bodyHtml: string, cta: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d2329">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="margin-bottom:16px"><img src="${LOGO_URL}" width="190" height="39" alt="NC Compliance" style="display:block;border:0"></div>
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e3e6ea">
      <h1 style="font-size:20px;margin:0 0 14px">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="margin:26px 0 6px"><a href="${cta.url}" style="background:#E6A23C;color:#1A1103;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>
    </div>
    <p style="font-size:11px;color:#8a939c;margin-top:16px">You're receiving this because you're an owner, admin or approver of this company on NC Compliance. Deadlines follow NCDMB's published reporting schedule; always confirm against current NCDMB guidance.</p>
  </div></body></html>`;
}

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) console.error("resend error", res.status, await res.text());
  return res.ok;
}

type Org = {
  id: string; name: string; subscription_status: string; trial_ends_at: string; current_period_end: string | null;
};

function hasAccess(org: Org, now: number) {
  if (org.subscription_status === "active") return !org.current_period_end || new Date(org.current_period_end).getTime() > now;
  if (org.subscription_status === "trialing") return new Date(org.trial_ends_at).getTime() > now;
  return false;
}

// Claims a reminder slot, sends, and releases the claim if sending fails.
async function remind(org: Org, key: string, deadline: number, lead: number, subject: string, html: string, log: string[]) {
  const { data: claimed, error } = await admin.from("reminder_log")
    .upsert({ org_id: org.id, report_key: key, deadline: iso(deadline), days_before: lead },
      { onConflict: "org_id,report_key,deadline,days_before", ignoreDuplicates: true })
    .select("org_id");
  if (error) { console.error(error); return; }
  if (!claimed || claimed.length === 0) return; // already sent

  const { data: recipients } = await admin.rpc("org_notification_emails", { p_org: org.id });
  const to = [...new Set((recipients ?? []).map((r: { email: string }) => r.email).filter(Boolean))] as string[];
  const ok = to.length > 0 && await sendEmail(to, subject, html);
  if (!ok) {
    await admin.from("reminder_log").delete()
      .match({ org_id: org.id, report_key: key, deadline: iso(deadline), days_before: lead });
    return;
  }
  log.push(`${org.name}: ${subject} -> ${to.length} recipient(s)`);
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret") ?? "";
  const { data: valid } = await admin.rpc("verify_cron_secret", { p_secret: secret });
  if (!valid) return new Response("unauthorized", { status: 401 });

  const now = Date.now();
  const today = lagosToday();
  const deadlines = upcomingDeadlines(today);
  const due = deadlines.flatMap((d) =>
    DEADLINE_LEADS.filter((lead) => (d.deadline - today) / DAY === lead).map((lead) => ({ ...d, lead })));

  const { data: orgs, error } = await admin.from("organizations")
    .select("id, name, subscription_status, trial_ends_at, current_period_end");
  if (error) return new Response(error.message, { status: 500 });

  const planned: string[] = [];
  const sent: string[] = [];

  for (const org of (orgs ?? []) as Org[]) {
    const active = hasAccess(org, now);

    if (active) {
      for (const d of due) {
        const subject = `${d.lead === 1 ? "Due tomorrow" : `Due in ${d.lead} days`}: ${d.title} — ${org.name}`;
        planned.push(`${org.name}: ${subject}`);
        if (!CAN_SEND) continue;
        const html = layout(
          `${d.title} due ${pretty(d.deadline)}`,
          `<p style="line-height:1.6">These submissions for <strong>${escapeHtml(org.name)}</strong> are due to NCDMB in <strong>${d.lead} day${d.lead === 1 ? "" : "s"}</strong>:</p>
           <ul style="line-height:1.8">${d.reports.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`,
          { label: "Open compliance calendar", url: `${APP_URL}/app/calendar` },
        );
        await remind(org, d.key, d.deadline, d.lead, subject, html, sent);
      }
    }

    if (org.subscription_status === "trialing" && active) {
      const end = Date.parse(org.trial_ends_at.slice(0, 10));
      const lead = Math.round((end - today) / DAY);
      if (TRIAL_LEADS.includes(lead)) {
        const subject = `Your NC Compliance trial ends in ${lead} day${lead === 1 ? "" : "s"} — ${org.name}`;
        planned.push(`${org.name}: ${subject}`);
        if (CAN_SEND) {
          await remind(org, "trial_end", end, lead, subject, layout(
            "Your free trial is ending",
            `<p style="line-height:1.6">The free trial for <strong>${escapeHtml(org.name)}</strong> ends on ${pretty(end)}. Choose a plan to keep editing — your data stays safe either way, but the workspace becomes read-only.</p>`,
            { label: "Choose a plan", url: `${APP_URL}/app/billing` },
          ), sent);
        }
      }
    }

    if (org.subscription_status === "active" && org.current_period_end && active) {
      const end = Date.parse(org.current_period_end.slice(0, 10));
      const lead = Math.round((end - today) / DAY);
      if (RENEWAL_LEADS.includes(lead)) {
        const subject = `Your NC Compliance plan expires in ${lead} days — ${org.name}`;
        planned.push(`${org.name}: ${subject}`);
        if (CAN_SEND) {
          await remind(org, "renewal", end, lead, subject, layout(
            "Time to renew",
            `<p style="line-height:1.6">The plan for <strong>${escapeHtml(org.name)}</strong> is paid through ${pretty(end)}. Renew before then to avoid the workspace becoming read-only.</p>`,
            { label: "Renew now", url: `${APP_URL}/app/billing` },
          ), sent);
        }
      }
    }
  }

  // Documents about to expire, grouped into one email per company per lead time.
  const { data: expiring } = await admin.rpc("expiring_documents", { p_days: DOC_LEADS });
  const orgById = new Map(((orgs ?? []) as Org[]).map((o) => [o.id, o]));
  const docGroups = new Map<string, { org: Org; lead: number; docs: { id: string; title: string; expires_on: string }[] }>();
  for (const d of (expiring ?? []) as { org_id: string; id: string; title: string; expires_on: string; days_left: number }[]) {
    const org = orgById.get(d.org_id);
    if (!org || !hasAccess(org, now)) continue;
    const key = `${d.org_id}:${d.days_left}`;
    if (!docGroups.has(key)) docGroups.set(key, { org, lead: d.days_left, docs: [] });
    docGroups.get(key)!.docs.push(d);
  }
  for (const { org, lead, docs } of docGroups.values()) {
    const subject = `${docs.length === 1 ? docs[0].title : `${docs.length} documents`} expire${docs.length === 1 ? "s" : ""} in ${lead} day${lead === 1 ? "" : "s"} — ${org.name}`;
    planned.push(`${org.name}: ${subject}`);
    if (!CAN_SEND) continue;
    const html = layout(
      "Documents expiring soon",
      `<p style="line-height:1.6">These records for <strong>${escapeHtml(org.name)}</strong> expire in <strong>${lead} day${lead === 1 ? "" : "s"}</strong>. Start the renewal now so your NCDMB compliance isn't interrupted.</p>
       <ul style="line-height:1.8">${docs.map((d) => `<li>${escapeHtml(d.title)} — ${pretty(Date.parse(d.expires_on))}</li>`).join("")}</ul>`,
      { label: "Open documents", url: `${APP_URL}/app/documents` },
    );
    await remind(org, `docs:${docs.map((d) => d.id).sort().join(",").slice(0, 300)}`, Date.parse(docs[0].expires_on), lead, subject, html, sent);
  }

  // Daily summary for the product owner.
  if (ADMIN_EMAIL && CAN_SEND) {
    const since = new Date(now - DAY).toISOString();
    const [{ data: newOrgs }, { data: paid }, { data: users }, { data: leads }] = await Promise.all([
      admin.from("organizations").select("name, org_type, created_at").gte("created_at", since),
      admin.from("payments").select("amount_kobo, plan, organizations(name)").eq("status", "success").gte("paid_at", since),
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from("leads").select("name, company, email, phone, score").gte("created_at", since).order("created_at"),
    ]);
    const newUsers = (users?.users ?? []).filter((u) => u.created_at >= since).length;
    const endingSoon = ((orgs ?? []) as Org[]).filter((o) => o.subscription_status === "trialing"
      && Date.parse(o.trial_ends_at) > now && Date.parse(o.trial_ends_at) - now < 3 * DAY);
    const revenue = (paid ?? []).reduce((sum, p: { amount_kobo: number }) => sum + Number(p.amount_kobo || 0), 0) / 100;
    if ((newOrgs ?? []).length || (paid ?? []).length || newUsers || endingSoon.length || (leads ?? []).length) {
      const list = (items: string[]) => items.length ? `<ul style="line-height:1.8">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` : "<p>None.</p>";
      const html = layout(
        "Your daily NC Compliance summary",
        `<p><strong>${(newOrgs ?? []).length}</strong> new companies · <strong>${newUsers}</strong> new users · <strong>₦${revenue.toLocaleString("en-NG")}</strong> revenue · <strong>${(leads ?? []).length}</strong> new leads (last 24 hours)</p>
         <h3 style="font-size:15px">New companies</h3>${list((newOrgs ?? []).map((o: { name: string; org_type: string }) => `${o.name} (${o.org_type})`))}
         <h3 style="font-size:15px">Payments</h3>${list((paid ?? []).map((p: any) => `${p.organizations?.name ?? "?"} — ₦${(Number(p.amount_kobo) / 100).toLocaleString("en-NG")} (${p.plan})`))}
         <h3 style="font-size:15px">New leads from the compliance check</h3>${list((leads ?? []).map((l: { name: string; company: string; email: string; phone: string | null; score: number }) => `${l.name}, ${l.company} — ${l.email}${l.phone ? `, ${l.phone}` : ""} (score ${l.score}/100)`))}
         <h3 style="font-size:15px">Trials ending within 3 days</h3>${list(endingSoon.map((o) => `${o.name} — ends ${pretty(Date.parse(o.trial_ends_at.slice(0, 10)))}`))}`,
        { label: "Open admin console", url: `${APP_URL}/admin` },
      );
      if (await sendEmail([ADMIN_EMAIL], `NC Compliance daily summary — ${iso(today)}`, html)) sent.push("admin digest");
    }
  }

  return new Response(JSON.stringify({ dryRun: !CAN_SEND, today: iso(today), planned, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
