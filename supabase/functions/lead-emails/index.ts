// Automatic emails for leads from the free NC Compliance Check.
//
//   POST { lead_id }   from the leads insert trigger: send the results email.
//   POST { sweep: true } from pg_cron once a day: send any results email that
//                      failed, then the day-2 and day-5 follow-ups to leads
//                      who haven't signed up or unsubscribed.
//   GET ?unsubscribe=<token>  link in every email; stops all follow-ups.
//   POST { contact_id } from the contact_messages insert trigger: email the
//                      enquiry to the product owner (reply-to the sender)
//                      and send the sender an acknowledgement.
//
// POSTs must carry the cron secret from Vault (x-cron-secret). Deployed with
// verify_jwt = false. Secrets: RESEND_API_KEY, EMAIL_FROM, APP_URL, ADMIN_EMAIL.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "";
const APP_URL = (Deno.env.get("APP_URL") || "https://nccompliance.com.ng").replace(/\/$/, "");
const SELF_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/lead-emails`;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "";
const DAY = 86400000;

type Lead = {
  id: string; name: string; company: string; email: string; score: number | null; created_at: string;
  result: { band?: string; owed?: { section: string; name: string; due: string | null; label: string; why: string }[]; actions?: { text: string; tone: string }[] };
  results_sent_at: string | null; nurture_1_at: string | null; nurture_2_at: string | null;
  unsubscribed_at: string | null; unsubscribe_token: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const pretty = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const daysTo = (d: string) => Math.ceil((Date.parse(d) - Date.now()) / DAY);
const BAND: Record<string, [string, string]> = {
  good: ["Good standing", "#2f8f5b"], risk: ["At risk", "#b97a1c"], high: ["High risk", "#c0392b"],
};

function shell(lead: Lead, title: string, body: string, cta: { label: string; url: string }) {
  const unsub = `${SELF_URL}?unsubscribe=${lead.unsubscribe_token}`;
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d2329">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px">
    <div style="margin-bottom:16px"><img src="${APP_URL}/email-logo.png" width="190" height="39" alt="NC Compliance" style="display:block;border:0"></div>
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e3e6ea">
      <h1 style="font-size:20px;margin:0 0 14px">${esc(title)}</h1>
      ${body}
      <p style="margin:26px 0 6px"><a href="${cta.url}" style="background:#E6A23C;color:#1A1103;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;display:inline-block">${esc(cta.label)}</a></p>
    </div>
    <p style="font-size:11px;color:#8a939c;margin:16px 0 0"><a href="https://www.linkedin.com/company/nc-compliance" style="color:#0A66C2;text-decoration:none;font-weight:bold">Follow NC Compliance on LinkedIn</a> for NCDMB deadline reminders and tips.</p>
    <p style="font-size:11px;color:#8a939c;margin-top:8px;line-height:1.6">You're receiving this because you took the free NC Compliance Check at nccompliance.com.ng and asked for your results.
    <a href="${unsub}" style="color:#8a939c">Unsubscribe</a> · NC Compliance Limited (RC 9951252), Port Harcourt, Nigeria. Independent software, not affiliated with NCDMB.</p>
  </div></body></html>`;
}

function resultsEmail(lead: Lead) {
  const [label, color] = BAND[lead.result.band ?? ""] ?? ["Your result", "#1d2329"];
  const owed = (lead.result.owed ?? []).map((r) =>
    `<tr><td style="padding:8px 10px;border-top:1px solid #eee"><strong>§${esc(r.section)} ${esc(r.name)}</strong><br><span style="color:#6b7580;font-size:12px">${esc(r.why)}</span></td>
     <td style="padding:8px 10px;border-top:1px solid #eee;white-space:nowrap;font-size:13px">${r.due ? `${pretty(r.due)}<br><span style="color:${daysTo(r.due) <= 30 ? "#c0392b" : "#6b7580"};font-size:12px">${daysTo(r.due)} days</span>` : `<span style="color:#6b7580">As required</span>`}</td></tr>`).join("");
  const actions = (lead.result.actions ?? []).map((a) =>
    `<li style="margin-bottom:8px;padding-left:4px;border-left:3px solid ${a.tone === "red" ? "#c0392b" : "#E6A23C"};padding:4px 0 4px 10px;list-style:none">${esc(a.text)}</li>`).join("");
  return shell(lead, `Your NC Compliance Check results, ${first(lead.name)}`, `
    <p style="line-height:1.6">Here are the results for <strong>${esc(lead.company)}</strong>.</p>
    <p style="font-size:30px;font-weight:bold;margin:10px 0 2px;color:${color}">${lead.score ?? "—"}/100 <span style="font-size:18px">· ${label}</span></p>
    <h3 style="font-size:15px;margin:22px 0 8px">Reports you're likely to owe NCDMB</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${owed}</table>
    ${actions ? `<h3 style="font-size:15px;margin:22px 0 8px">What to fix first</h3><ul style="padding:0;margin:0;font-size:14px;line-height:1.5">${actions}</ul>` : ""}
    <p style="line-height:1.6;margin-top:22px">NC Compliance tracks every one of these deadlines for you, reminds your team before each one, and produces each report in NCDMB's layout, ready to download as PDF or Excel. Free for 30 days, no card needed.</p>`,
    { label: "Start my free 30-day trial", url: `${APP_URL}/signup?email=${encodeURIComponent(lead.email)}` });
}

function nurture1(lead: Lead) {
  const next = (lead.result.owed ?? []).filter((r) => r.due && daysTo(r.due) > 0).sort((a, b) => a.due!.localeCompare(b.due!))[0];
  const line = next
    ? `<p style="line-height:1.6">Your next NCDMB deadline, the <strong>§${esc(next.section)} ${esc(next.name)}</strong>, is due on <strong>${pretty(next.due!)}</strong>. That's ${daysTo(next.due!)} days away.</p>`
    : `<p style="line-height:1.6">NCDMB deadlines come round every quarter.</p>`;
  return shell(lead, `${first(lead.name)}, your next NCDMB deadline is coming`, `${line}
    <p style="line-height:1.6">See how a compliance team prepares it in NC Compliance: open the live demo, click any report and download it as PDF. No sign-up, nothing to install.</p>`,
    { label: "Open the live demo", url: `${APP_URL}/demo` });
}

function nurture2(lead: Lead) {
  return shell(lead, `Get ${lead.company}'s NCDMB reports off your plate`, `
    <p style="line-height:1.6">Hi ${esc(first(lead.name))}, a last note about your compliance check.</p>
    <ul style="line-height:1.8;padding-left:18px">
      <li>Every NCDMB due date on one calendar, with email reminders 14, 7, 3 and 1 day before</li>
      <li>Spend, contracts, expatriates and vessels recorded once, used in every report</li>
      <li>Preparer → reviewer → approver sign-off and a full filing history</li>
      <li>Certificates tracked, with a warning 30 days before anything expires</li>
    </ul>
    <p style="line-height:1.6">Your 30-day trial is free and doesn't need a card. Set up takes about two minutes.</p>`,
    { label: "Start my free trial", url: `${APP_URL}/signup?email=${encodeURIComponent(lead.email)}` });
}

async function send(to: string, subject: string, html: string, replyTo?: string) {
  if (!RESEND_API_KEY || !EMAIL_FROM) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) console.error("resend error", res.status, await res.text());
  return res.ok;
}

// Marks the step first so a retry or a second run can't send it twice.
async function claimAndSend(lead: Lead, column: "results_sent_at" | "nurture_1_at" | "nurture_2_at", subject: string, html: string) {
  const { data } = await admin.from("leads").update({ [column]: new Date().toISOString() })
    .eq("id", lead.id).is(column, null).is("unsubscribed_at", null).select("id");
  if (!data?.length) return false;
  const ok = await send(lead.email, subject, html);
  if (!ok) await admin.from("leads").update({ [column]: null }).eq("id", lead.id);
  return ok;
}

const COLS = "id, name, company, email, score, created_at, result, results_sent_at, nurture_1_at, nurture_2_at, unsubscribed_at, unsubscribe_token";

async function sweep() {
  const log: string[] = [];
  const since = new Date(Date.now() - 14 * DAY).toISOString();
  const { data: leads } = await admin.from("leads").select(COLS).gte("created_at", since).is("unsubscribed_at", null);
  if (!leads?.length) return log;
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const signedUp = new Set((users?.users ?? []).map((u) => (u.email ?? "").toLowerCase()));
  for (const lead of leads as Lead[]) {
    const age = Date.now() - Date.parse(lead.created_at);
    if (!lead.results_sent_at && age < 3 * DAY) {
      if (await claimAndSend(lead, "results_sent_at", `Your NC Compliance Check results: ${lead.score}/100`, resultsEmail(lead))) log.push(`results: ${lead.email}`);
      continue;
    }
    if (signedUp.has(lead.email.toLowerCase())) continue;
    if (lead.results_sent_at && !lead.nurture_1_at && age >= 2 * DAY) {
      if (await claimAndSend(lead, "nurture_1_at", "Your next NCDMB deadline is coming", nurture1(lead))) log.push(`day 2: ${lead.email}`);
    } else if (lead.nurture_1_at && !lead.nurture_2_at && age >= 5 * DAY) {
      if (await claimAndSend(lead, "nurture_2_at", `Get ${lead.company}'s NCDMB reports off your plate`, nurture2(lead))) log.push(`day 5: ${lead.email}`);
    }
  }
  return log;
}

const TOPICS: Record<string, string> = {
  general: "General question", demo: "Book a walkthrough", pricing: "Pricing", invoice: "Pay by invoice",
  support: "Help with my account", partnership: "Partnership",
};

// Enquiry from the contact page: to the owner (reply goes to the sender),
// plus an acknowledgement to the sender. Claimed first so it sends once.
async function contact(id: string) {
  const { data: claimed } = await admin.from("contact_messages").update({ notified_at: new Date().toISOString() })
    .eq("id", id).is("notified_at", null).select("name, company, email, phone, topic, message");
  const m = claimed?.[0] as { name: string; company: string | null; email: string; phone: string | null; topic: string; message: string } | undefined;
  if (!m) return false;
  const topic = TOPICS[m.topic] ?? "Enquiry";
  const box = (inner: string) => `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d2329">
    <div style="max-width:580px;margin:0 auto;padding:32px 16px">
      <div style="margin-bottom:16px"><img src="${APP_URL}/email-logo.png" width="190" height="39" alt="NC Compliance" style="display:block;border:0"></div>
      <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e3e6ea">${inner}</div>
    </div></body></html>`;
  let ok = true;
  if (ADMIN_EMAIL) {
    ok = await send(ADMIN_EMAIL, `New enquiry (${topic}): ${m.name}${m.company ? `, ${m.company}` : ""}`, box(`
      <h1 style="font-size:20px;margin:0 0 14px">${esc(topic)}</h1>
      <p style="line-height:1.6;margin:0 0 4px"><strong>${esc(m.name)}</strong>${m.company ? ` · ${esc(m.company)}` : ""}</p>
      <p style="line-height:1.6;margin:0 0 16px"><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>${m.phone ? ` · ${esc(m.phone)}` : ""}</p>
      <div style="white-space:pre-wrap;line-height:1.6;border-left:3px solid #E6A23C;padding-left:12px">${esc(m.message)}</div>
      <p style="font-size:12px;color:#6b7580;margin-top:20px">Reply to this email to answer ${esc(first(m.name))} directly.</p>`), m.email);
  }
  await send(m.email, "We've received your message — NC Compliance", box(`
    <h1 style="font-size:20px;margin:0 0 14px">Thanks, ${esc(first(m.name))}</h1>
    <p style="line-height:1.6">We've received your message and will reply within one working day.</p>
    <p style="line-height:1.6">In the meantime, you can explore a complete sample company in the <a href="${APP_URL}/demo" style="color:#b97a1c">live demo</a>, or see which NCDMB reports your company owes with the free <a href="${APP_URL}/check" style="color:#b97a1c">2-minute compliance check</a>.</p>
    <p style="font-size:12px;color:#6b7580;margin-top:20px">Your message: “${esc(m.message.slice(0, 300))}${m.message.length > 300 ? "…" : ""}”</p>`));
  return ok;
}

const page = (msg: string) => new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>NC Compliance</title></head>
  <body style="margin:0;background:#0F1216;color:#EDEFF2;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box">
  <div style="max-width:420px;text-align:center"><p style="font-size:18px;line-height:1.5">${msg}</p><p><a href="${APP_URL}" style="color:#E6A23C">nccompliance.com.ng</a></p></div></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const token = url.searchParams.get("unsubscribe") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(token)) return page("This link isn't valid.");
    await admin.from("leads").update({ unsubscribed_at: new Date().toISOString() }).eq("unsubscribe_token", token).is("unsubscribed_at", null);
    return page("You're unsubscribed. We won't send you any more emails about your compliance check.");
  }

  const { data: valid } = await admin.rpc("verify_cron_secret", { p_secret: req.headers.get("x-cron-secret") ?? "" });
  if (!valid) return new Response("unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.sweep) return Response.json({ sent: await sweep() });
  if (body.contact_id) return Response.json({ sent: await contact(String(body.contact_id)) });

  if (body.lead_id) {
    const { data: lead } = await admin.from("leads").select(COLS).eq("id", String(body.lead_id)).maybeSingle();
    if (!lead) return Response.json({ sent: false });
    const ok = await claimAndSend(lead as Lead, "results_sent_at", `Your NC Compliance Check results: ${lead.score}/100`, resultsEmail(lead as Lead));
    return Response.json({ sent: ok });
  }
  return Response.json({ error: "nothing to do" }, { status: 400 });
});
