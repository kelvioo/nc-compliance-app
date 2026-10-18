// Transactional emails triggered from the app.
//
// POST with a user's JWT: { type: "invite", token } -> { sent: boolean }
// Emails the invitation link to the invitee. Only the owner/admins of the
// inviting company can trigger it. If no email provider is configured the
// function returns { sent: false } and the app falls back to a copyable link.
//
// Secrets: RESEND_API_KEY, EMAIL_FROM (e.g. "NC Compliance <hello@yourdomain.com>"),
//          APP_URL (e.g. https://app.yourdomain.com) — optional, falls back to the request origin.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";
const LOGO_URL = `${(APP_URL || "https://nccompliance.com.ng").replace(/\/$/, "")}/email-logo.png`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d2329">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="margin-bottom:16px"><img src="${LOGO_URL}" width="190" height="39" alt="NC Compliance" style="display:block;border:0"></div>
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e3e6ea">
      <h1 style="font-size:20px;margin:0 0 14px">${escapeHtml(title)}</h1>
      ${bodyHtml}
      ${cta ? `<p style="margin:26px 0 6px"><a href="${cta.url}" style="background:#E6A23C;color:#1A1103;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>
      <p style="font-size:12px;color:#6b7580;word-break:break-all">Or paste this link into your browser: ${cta.url}</p>` : ""}
    </div>
    <p style="font-size:11px;color:#8a939c;margin-top:16px">NC Compliance is independent software and is not affiliated with NCDMB.</p>
  </div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !EMAIL_FROM) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) console.error("resend error", res.status, await res.text());
  return res.ok;
}

function appOrigin(req: Request) {
  if (APP_URL) return APP_URL.replace(/\/$/, "");
  const origin = req.headers.get("origin") ?? "";
  return /^https:\/\/[a-z0-9.-]+$/i.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin) ? origin : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: "Please sign in again." }, 401);

    const body = await req.json().catch(() => ({}));
    if (body.type !== "invite" || !body.token) return json({ error: "Unknown email type." }, 400);

    const { data: inv } = await admin.from("invitations")
      .select("email, role, token, org_id, accepted_at, organizations(name)")
      .eq("token", String(body.token)).maybeSingle();
    if (!inv || inv.accepted_at) return json({ error: "Invitation not found." }, 404);

    const { data: me } = await admin.from("memberships").select("role")
      .eq("org_id", inv.org_id).eq("user_id", user.id).maybeSingle();
    if (me?.role !== "owner" && me?.role !== "admin") return json({ error: "Not allowed." }, 403);

    const origin = appOrigin(req);
    if (!origin) return json({ sent: false });
    const orgName = (inv as any).organizations?.name ?? "your company";
    const url = `${origin}/invite/${inv.token}`;
    const html = layout(
      `Join ${orgName} on NC Compliance`,
      `<p style="line-height:1.6">${escapeHtml(user.email ?? "A colleague")} has invited you to join <strong>${escapeHtml(orgName)}</strong> as <strong>${escapeHtml(inv.role)}</strong>.</p>
       <p style="line-height:1.6">NC Compliance is where your team tracks Nigerian Content data and prepares its NCDMB reports. The invitation expires in 14 days.</p>`,
      { label: "Accept invitation", url },
    );
    const sent = await sendEmail(inv.email, `${orgName} invited you to NC Compliance`, html);
    return json({ sent });
  } catch (err) {
    console.error(err);
    return json({ error: "Unexpected error." }, 500);
  }
});
