import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and " +
    "VITE_SUPABASE_ANON_KEY as environment variables (see README)."
  );
}

// An expired or already-used confirmation or reset link comes back with the
// error in the URL. Read it before the client and router clear it away, so the
// sign-in page can explain what happened instead of showing a blank form.
function readAuthLinkError() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  if (!params.get("error") && !params.get("error_code")) return null;
  return params.get("error_code") === "otp_expired"
    ? "That link has expired or was already used. Enter your email to get a new one."
    : `That link didn't work${params.get("error_description") ? ` (${params.get("error_description").replace(/\+/g, " ")})` : ""}. Please try again.`;
}
export const authLinkError = readAuthLinkError();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
