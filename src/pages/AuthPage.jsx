import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { Brand, Field, inputStyle, btnPrimary } from "../components/ui";
import { usePageMeta } from "../lib/usePageMeta";

const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";

// Only follow redirects back into this app, never to another site.
function safeNext(raw) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

const COPY = {
  signin: { title: "Welcome back", sub: "Sign in to your compliance workspace.", cta: "Sign in" },
  signup: { title: "Start your 30-day free trial", sub: "No card required. Set up your company in under two minutes.", cta: "Create account" },
  forgot: { title: "Reset your password", sub: "We'll email you a link to choose a new one.", cta: "Send reset link" },
};

export default function AuthPage({ mode }) {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  usePageMeta(
    mode === "signup" ? "Start your free trial · NC Compliance" : mode === "forgot" ? "Reset password · NC Compliance" : "Sign in · NC Compliance",
    mode === "signup" ? "/signup" : mode === "forgot" ? "/forgot-password" : "/login",
  );
  const [sentTo, setSentTo] = useState(null);

  if (!loading && user && mode !== "forgot") return <Navigate to={next || "/app"} replace />;

  const copy = COPY[mode];
  const keepNext = next ? `?next=${encodeURIComponent(next)}` : "";

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate(next || "/app", { replace: true });
      } else if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}${next || "/onboarding"}` },
        });
        if (err) throw err;
        if (data.session) navigate(next || "/onboarding", { replace: true });
        else setSentTo(email);
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (err) throw err;
        setSentTo(email);
      }
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "That email and password don't match an account." : err.message);
    }
    setBusy(false);
  };

  const google = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next || "/app"}` },
    });
  };

  return (
    <div className="nc-auth-page">
      <div className="nc-auth-card">
        <Link to="/" className="nc-auth-brand"><Brand /></Link>
        {sentTo ? (
          <div className="nc-auth-sent">
            <MailCheck size={32} color="#4FAE7E" />
            <h1>Check your email</h1>
            <p>
              We sent a {mode === "forgot" ? "password reset" : "confirmation"} link to <strong>{sentTo}</strong>.
              Open it on this device to continue.
            </p>
            <Link to={`/login${keepNext}`}>Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1>{copy.title}</h1>
            <p className="nc-auth-sub">{copy.sub}</p>
            {GOOGLE_ENABLED && mode !== "forgot" && (
              <>
                <button type="button" className="nc-oauth-button" onClick={google}>Continue with Google</button>
                <div className="nc-auth-divider"><span>or</span></div>
              </>
            )}
            <form onSubmit={submit} className="nc-auth-form">
              <Field label="Work email">
                <input style={inputStyle} type="email" required autoComplete="email" autoFocus
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </Field>
              {mode !== "forgot" && (
                <Field label="Password">
                  <input style={inputStyle} type="password" required minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "At least 8 characters" : ""} />
                </Field>
              )}
              {error && <div className="nc-form-error" role="alert">{error}</div>}
              <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={busy}>
                {busy && <Loader2 size={16} className="nc-spin" />} {copy.cta}
              </button>
            </form>
            <div className="nc-auth-links">
              {mode === "signin" && <>
                <Link to={`/forgot-password${keepNext}`}>Forgot password?</Link>
                <span>New here? <Link to={`/signup${keepNext}`}>Start a free trial</Link></span>
              </>}
              {mode === "signup" && <span>Already have an account? <Link to={`/login${keepNext}`}>Sign in</Link></span>}
              {mode === "forgot" && <Link to={`/login${keepNext}`}>Back to sign in</Link>}
            </div>
            {mode === "signup" && (
              <p className="nc-auth-legal">By creating an account you agree to our <Link to="/terms" target="_blank">Terms of service</Link> and <Link to="/privacy" target="_blank">Privacy policy</Link>. You remain responsible for the accuracy of what you submit to NCDMB.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
