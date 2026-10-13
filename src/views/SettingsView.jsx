import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import { canManage, ORG_TYPES } from "../lib/roles";
import { friendlyError } from "../lib/errors";
import { Field, inputStyle, btnPrimary } from "../components/ui";

const ACTION_LABELS = {
  "organization.created": "created the company workspace",
  "organization.updated": "updated company settings",
  "workspace.saved": "saved changes",
  "member.invited": "invited a team member",
  "member.joined": "joined the team",
  "member.role_changed": "changed a member's role",
  "member.removed": "removed a team member",
  "billing.activated": "activated a paid plan",
};

function describe(entry) {
  const base = ACTION_LABELS[entry.action] || entry.action;
  const d = entry.detail || {};
  if (entry.action === "workspace.saved" && d.sections?.length) return `${base} to ${d.sections.join(", ")}`;
  if (entry.action === "member.invited") return `invited ${d.email} as ${d.role}`;
  if (entry.action === "member.joined") return `joined as ${d.role}`;
  if (entry.action === "billing.activated") return `activated the ${d.plan} plan`;
  return base;
}

export function SettingsView({ org, role, notify, onSaved }) {
  const manager = canManage(role);
  const canAudit = manager || role === "approver";
  const [form, setForm] = useState({
    name: org.name, org_type: org.org_type, ncdmb_reg_no: org.ncdmb_reg_no || "", billing_email: org.billing_email || "",
  });
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState([]);
  const [emails, setEmails] = useState({});

  const loadAudit = useCallback(async () => {
    if (!canAudit) return;
    const [{ data: rows }, { data: members }] = await Promise.all([
      supabase.from("audit_log").select("id, user_id, action, detail, created_at")
        .eq("org_id", org.id).order("created_at", { ascending: false }).limit(100),
      supabase.rpc("list_members", { p_org: org.id }),
    ]);
    setAudit(rows || []);
    setEmails(Object.fromEntries((members || []).map((m) => [m.user_id, m.email])));
  }, [org.id, canAudit]);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc("update_organization", {
      p_org: org.id, p_name: form.name, p_org_type: form.org_type,
      p_ncdmb_reg_no: form.ncdmb_reg_no, p_billing_email: form.billing_email,
    });
    setSaving(false);
    if (error) { notify(friendlyError(error)); return; }
    notify("Company settings saved.", "success");
    onSaved();
    loadAudit();
  };

  return (
    <div className="nc-main-content nc-premium-page">
      <div className="nc-premium-heading">
        <div>
          <span>ACCOUNT</span>
          <h1>Settings</h1>
          <p>Company details used on your NCDMB report headers, and a full history of who changed what.</p>
        </div>
      </div>

      <form onSubmit={save} className="nc-card nc-settings-form">
        <Field label="Company name">
          <input style={inputStyle} value={form.name} disabled={!manager} required minLength={2}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Company type">
          <select style={inputStyle} value={form.org_type} disabled={!manager}
            onChange={(e) => setForm({ ...form, org_type: e.target.value })}>
            {ORG_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="NCDMB / NCEC registration number">
          <input style={inputStyle} value={form.ncdmb_reg_no} disabled={!manager}
            onChange={(e) => setForm({ ...form, ncdmb_reg_no: e.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Billing email (receipts and renewal reminders)">
          <input style={inputStyle} type="email" value={form.billing_email} disabled={!manager}
            onChange={(e) => setForm({ ...form, billing_email: e.target.value })} placeholder="finance@company.com" />
        </Field>
        {manager && <button style={btnPrimary} type="submit" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save settings"}</button>}
      </form>

      {canAudit && (
        <>
          <h2 className="nc-section-title">Audit trail</h2>
          <div className="nc-table-card">
            <table className="nc-table">
              <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
              <tbody>
                {audit.length === 0 && <tr><td colSpan={3}>No activity yet.</td></tr>}
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(a.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td>{a.user_id ? (emails[a.user_id] || "Former member") : "System"}</td>
                    <td>{describe(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
