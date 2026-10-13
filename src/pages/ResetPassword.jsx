import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Brand, Field, inputStyle, btnPrimary } from "../components/ui";

// Shown when someone arrives from a password-reset email.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    navigate("/app", { replace: true });
  };

  return (
    <div className="nc-auth-page">
      <div className="nc-auth-card">
        <div className="nc-auth-brand"><Brand /></div>
        <h1>Choose a new password</h1>
        <form onSubmit={submit} className="nc-auth-form">
          <Field label="New password">
            <input style={inputStyle} type="password" required minLength={8} autoComplete="new-password" autoFocus
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </Field>
          {error && <div className="nc-form-error" role="alert">{error}</div>}
          <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
