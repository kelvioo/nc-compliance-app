// Paystack billing for NC Compliance.
//
// POST with a user's JWT:
//   { action: "checkout", orgId, plan, callbackUrl } -> { authorization_url }
//   { action: "verify", reference }                   -> { ok, plan }
// POST from Paystack (x-paystack-signature header): webhook events.
//
// Deployed with verify_jwt = false because Paystack's webhook carries no
// Supabase JWT; user actions check the JWT themselves below.
//
// Secrets: PAYSTACK_SECRET_KEY (required to take payments).
//          ADMIN_EMAIL, RESEND_API_KEY, EMAIL_FROM (optional: email the owner on each payment).
import { createClient, type User } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const PAYSTACK_API = "https://api.paystack.co";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function paystack(path: string, init: RequestInit = {}) {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status === false) throw new Error(body.message || `Paystack error ${res.status}`);
  return body.data;
}

// Best effort: tell the product owner a payment landed.
async function notifyAdmin(orgName: string, planId: string, amountKobo: number, reference: string) {
  if (!ADMIN_EMAIL || !RESEND_API_KEY || !EMAIL_FROM) return;
  const naira = (amountKobo / 100).toLocaleString("en-NG");
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM, to: [ADMIN_EMAIL],
        subject: `New payment: ₦${naira} from ${orgName}`,
        html: `<p><strong>${esc(orgName)}</strong> paid <strong>₦${naira}</strong> for the <strong>${esc(planId)}</strong> plan.</p><p>Reference: ${esc(reference)}</p>`,
      }),
    });
  } catch (err) {
    console.error("admin notification failed", err);
  }
}

async function isBillingManager(orgId: string, userId: string) {
  const { data } = await admin.from("memberships").select("role")
    .eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  return data?.role === "owner" || data?.role === "admin";
}

// Applies a successful Paystack transaction exactly once. The conditional
// update on `payments` is the lock: whichever of webhook / verify flips the
// row to success first extends the subscription; the other is a no-op.
async function activate(tx: any) {
  const reference: string = tx.reference;
  const orgId: string | undefined = tx.metadata?.org_id;
  const planId: string | undefined = tx.metadata?.plan;
  if (tx.status !== "success" || !orgId || !planId) return { ok: false, error: "Payment was not successful." };

  const { data: plan } = await admin.from("plans").select("id, price_kobo").eq("id", planId).single();
  if (!plan || tx.currency !== "NGN" || Number(tx.amount) < Number(plan.price_kobo)) {
    console.error("payment does not match plan", reference, tx.amount, tx.currency, planId);
    return { ok: false, error: "Payment amount doesn't match the plan. Please contact support." };
  }

  await admin.from("payments").upsert(
    { reference, org_id: orgId, plan: planId, amount_kobo: tx.amount, status: "initialized" },
    { onConflict: "reference", ignoreDuplicates: true },
  );
  const { data: claimed } = await admin.from("payments")
    .update({ status: "success", paid_at: tx.paid_at ?? new Date().toISOString(), amount_kobo: tx.amount, raw: tx })
    .eq("reference", reference).neq("status", "success")
    .select("reference");
  if (!claimed || claimed.length === 0) return { ok: true, plan: planId, already: true };

  const { data: org } = await admin.from("organizations")
    .select("name, subscription_status, current_period_end").eq("id", orgId).single();
  const now = new Date();
  const currentEnd = org?.current_period_end ? new Date(org.current_period_end) : null;
  // Paying early stacks the new year on top of the time already paid for.
  const start = org?.subscription_status === "active" && currentEnd && currentEnd > now ? currentEnd : now;
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);

  await admin.from("organizations").update({
    plan: planId,
    subscription_status: "active",
    current_period_end: end.toISOString(),
    paystack_customer_code: tx.customer?.customer_code ?? null,
  }).eq("id", orgId);

  await admin.from("audit_log").insert({
    org_id: orgId,
    user_id: tx.metadata?.user_id ?? null,
    action: "billing.activated",
    detail: { plan: planId, reference, amount_kobo: tx.amount, period_end: end.toISOString() },
  });
  await notifyAdmin(org?.name ?? orgId, planId, Number(tx.amount), reference);
  return { ok: true, plan: planId };
}

async function checkout(user: User, body: any) {
  const { orgId, plan: planId, callbackUrl } = body ?? {};
  if (!orgId || !planId) return json({ error: "Missing company or plan." }, 400);
  if (!(await isBillingManager(orgId, user.id))) return json({ error: "Only the owner or an admin can change the plan." }, 403);

  let callback: URL;
  try { callback = new URL(callbackUrl); } catch { return json({ error: "Invalid callback URL." }, 400); }
  const local = callback.hostname === "localhost" || callback.hostname === "127.0.0.1";
  if (callback.pathname !== "/billing/callback" || (callback.protocol !== "https:" && !local)) {
    return json({ error: "Invalid callback URL." }, 400);
  }

  const { data: plan } = await admin.from("plans").select("id, price_kobo, purchasable").eq("id", planId).single();
  if (!plan?.purchasable) return json({ error: "That plan can't be purchased." }, 400);
  const { data: org } = await admin.from("organizations").select("id, name, billing_email").eq("id", orgId).single();
  if (!org) return json({ error: "Company not found." }, 404);

  const reference = `nc_${orgId.slice(0, 8)}_${Date.now().toString(36)}`;
  await admin.from("payments").insert({
    reference, org_id: orgId, plan: planId, amount_kobo: plan.price_kobo, status: "initialized",
  });

  const tx = await paystack("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: org.billing_email || user.email,
      amount: String(plan.price_kobo),
      currency: "NGN",
      reference,
      callback_url: callback.toString(),
      metadata: {
        org_id: orgId, plan: planId, user_id: user.id,
        custom_fields: [{ display_name: "Company", variable_name: "company", value: org.name }],
      },
    }),
  });
  return json({ authorization_url: tx.authorization_url, reference });
}

async function verify(user: User, body: any) {
  const reference = String(body?.reference ?? "");
  if (!reference) return json({ error: "Missing payment reference." }, 400);
  const { data: payment } = await admin.from("payments").select("org_id").eq("reference", reference).maybeSingle();
  if (!payment?.org_id || !(await isBillingManager(payment.org_id, user.id))) {
    return json({ error: "Payment not found for your company." }, 404);
  }
  const tx = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  const result = await activate(tx);
  return json(result, result.ok ? 200 : 400);
}

async function hmacSha512Hex(key: string, message: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function webhook(raw: string, signature: string) {
  if (!PAYSTACK_SECRET) return new Response("not configured", { status: 503 });
  const expected = await hmacSha512Hex(PAYSTACK_SECRET, raw);
  if (!timingSafeEqual(expected, signature)) return new Response("invalid signature", { status: 401 });

  const event = JSON.parse(raw);
  if (event.event === "charge.success" && event.data?.reference) {
    // Re-fetch from Paystack rather than trusting the event body alone.
    const tx = await paystack(`/transaction/verify/${encodeURIComponent(event.data.reference)}`);
    const result = await activate(tx);
    if (!result.ok) console.error("webhook activation failed", event.data.reference, result.error);
  }
  return new Response("ok", { status: 200 });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const raw = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    if (signature) return await webhook(raw, signature);

    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: "Please sign in again." }, 401);
    if (!PAYSTACK_SECRET) {
      return json({ error: "Online card payment isn't switched on yet. Please contact us to subscribe by invoice." }, 503);
    }

    const body = raw ? JSON.parse(raw) : {};
    if (body.action === "checkout") return await checkout(user, body);
    if (body.action === "verify") return await verify(user, body);
    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error." }, 500);
  }
});
