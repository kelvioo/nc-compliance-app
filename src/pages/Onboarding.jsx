import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ORG_TYPES } from "../lib/roles";
import { friendlyError } from "../lib/errors";
import { Brand, Field, inputStyle, btnPrimary } from "../components/ui";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", orgType: "operator", regNo: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const { data: orgId, error: err } = await supabase.rpc("create_organization", {
      p_name: form.name, p_org_type: form.orgType, p_ncdmb_reg_no: form.regNo,
    });
    if (err) { setError(friendlyError(err)); setBusy(false); return; }
    try { localStorage.setItem("nc_last_org", orgId); } catch { /* private mode */ }
    navigate("/app/home", { replace: true });
  };

  return (
    <div className="nc-auth-page">
      <div className="nc-auth-card is-wide">
        <div className="nc-auth-brand"><Brand /></div>
        <div className="nc-steps"><span className={step >= 1 ? "is-done" : ""} /><span className={step >= 2 ? "is-done" : ""} /></div>

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="nc-auth-form">
            <h1>What does your company do?</h1>
            <p className="nc-auth-sub">You can change this later in Settings.</p>
            <div className="nc-choice-grid">
              {ORG_TYPES.map((t) => (
                <label key={t.id} className={`nc-choice ${form.orgType === t.id ? "is-selected" : ""}`}>
                  <input type="radio" name="orgType" value={t.id} checked={form.orgType === t.id}
                    onChange={() => setForm({ ...form, orgType: t.id })} />
                  <strong>{t.label}</strong>
                  <span>{t.description}</span>
                </label>
              ))}
            </div>
            <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }}>Continue <ArrowRight size={16} /></button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={create} className="nc-auth-form">
            <h1>{form.orgType === "consultant" ? "Your first client company" : "Your company"}</h1>
            <p className="nc-auth-sub">This appears on every report you generate. You can change it later in Settings.</p>
            <Field label="Company name">
              <input style={inputStyle} required minLength={2} maxLength={120} autoFocus
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Delta Basin Energy Ltd" />
            </Field>
            <Field label="NCDMB / NCEC registration number (optional)">
              <input style={inputStyle} maxLength={60}
                value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value })} placeholder="You can add this later" />
            </Field>
            {error && <div className="nc-form-error" role="alert">{error}</div>}
            <div className="nc-form-row">
              <button type="button" className="nc-link-button" onClick={() => setStep(1)}>Back</button>
              <button type="submit" style={btnPrimary} disabled={busy}>
                {busy ? <Loader2 size={16} className="nc-spin" /> : null} Start my 30-day free trial
              </button>
            </div>
            <p className="nc-auth-legal">Joining a colleague's company instead? Open the invitation link they sent you.</p>
          </form>
        )}
      </div>
    </div>
  );
}
