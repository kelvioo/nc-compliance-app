import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Copy, Trash2, Mail, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ROLES, roleLabel, canManage } from "../lib/roles";
import { friendlyError } from "../lib/errors";
import { useAuth } from "../auth/AuthProvider";
import { Field, inputStyle, btnPrimary, btnGhost } from "../components/ui";

const inviteLink = (token) => `${window.location.origin}/invite/${token}`;

export function TeamView({ org, role, notify, onChanged }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const manager = canManage(role);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [form, setForm] = useState({ email: "", role: "preparer" });
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState(null);
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_members", { p_org: org.id });
    if (error) notify(friendlyError(error)); else setMembers(data);
    if (manager) {
      const { data: inv } = await supabase.from("invitations")
        .select("id, email, role, token, expires_at")
        .eq("org_id", org.id).is("accepted_at", null).order("created_at", { ascending: false });
      setInvites(inv || []);
    }
  }, [org.id, manager, notify]);

  useEffect(() => { load(); }, [load]);

  const copy = async (token) => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      notify("Couldn't copy automatically — select the link and copy it.");
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { data: token, error } = await supabase.rpc("create_invitation", {
      p_org: org.id, p_email: form.email, p_role: form.role,
    });
    if (error) {
      notify(friendlyError(error));
    } else {
      setLastLink(token);
      setForm({ email: "", role: form.role });
      // Email delivery is best effort; the copyable link always works.
      const { data: sent } = await supabase.functions.invoke("send-email", {
        body: { type: "invite", token },
      }).catch(() => ({ data: null }));
      notify(sent?.sent ? `Invitation emailed to ${form.email}.` : "Invitation created — copy the link below and send it to them.", "success");
      load();
    }
    setBusy(false);
  };

  const changeRole = async (userId, newRole) => {
    const { error } = await supabase.rpc("set_member_role", { p_org: org.id, p_user: userId, p_role: newRole });
    if (error) notify(friendlyError(error)); else { notify("Role updated.", "success"); load(); }
  };

  const remove = async (member) => {
    const self = member.user_id === user.id;
    const prompt = self ? `Leave ${org.name}? You'll lose access to its data.` : `Remove ${member.email} from ${org.name}?`;
    if (!window.confirm(prompt)) return;
    const { error } = await supabase.rpc("remove_member", { p_org: org.id, p_user: member.user_id });
    if (error) { notify(friendlyError(error)); return; }
    if (self) { await onChanged(); navigate("/app/home"); return; }
    notify("Removed from the team.", "success");
    load();
  };

  const revoke = async (id) => {
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) notify(friendlyError(error)); else load();
  };

  const assignable = ROLES.filter((r) => r.id !== "owner" && (r.id !== "admin" || role === "owner"));

  return (
    <div className="nc-main-content nc-premium-page">
      <div className="nc-premium-heading">
        <div>
          <span>ACCOUNT</span>
          <h1>Team</h1>
          <p>Invite the people who prepare, review and approve your NCDMB submissions. Everyone signs in with their own account, and every change is recorded against their name.</p>
        </div>
      </div>

      {manager && (
        <form onSubmit={invite} className="nc-card nc-invite-form">
          <Field label="Work email">
            <input style={inputStyle} type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="colleague@company.com" />
          </Field>
          <Field label="Role">
            <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {assignable.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Field>
          <button style={btnPrimary} type="submit" disabled={busy}><UserPlus size={16} /> {busy ? "Inviting…" : "Send invite"}</button>
          <p className="nc-form-help">{ROLES.find((r) => r.id === form.role)?.description}</p>
        </form>
      )}

      {lastLink && (
        <div className="nc-card nc-link-box">
          <Mail size={16} />
          <code>{inviteLink(lastLink)}</code>
          <button style={btnGhost} onClick={() => copy(lastLink)}>{copied === lastLink ? <Check size={14} /> : <Copy size={14} />} Copy link</button>
        </div>
      )}

      <h2 className="nc-section-title">Members ({members.length})</h2>
      <div className="nc-table-card">
        <table className="nc-table">
          <thead><tr><th>Email</th><th>Role</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {members.map((m) => {
              const editableRow = manager && m.role !== "owner" && m.user_id !== user.id && (m.role !== "admin" || role === "owner");
              return (
                <tr key={m.user_id}>
                  <td>{m.email}{m.user_id === user.id && <span className="nc-pill">You</span>}</td>
                  <td>
                    {editableRow ? (
                      <select style={{ ...inputStyle, padding: "6px 8px" }} value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value)}>
                        {assignable.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    ) : roleLabel(m.role)}
                  </td>
                  <td>{new Date(m.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="nc-table-actions">
                    {(editableRow || (m.user_id === user.id && m.role !== "owner")) && (
                      <button style={btnGhost} onClick={() => remove(m)}>
                        <Trash2 size={14} /> {m.user_id === user.id ? "Leave" : "Remove"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {manager && invites.length > 0 && (
        <>
          <h2 className="nc-section-title">Pending invitations</h2>
          <div className="nc-table-card">
            <table className="nc-table">
              <thead><tr><th>Email</th><th>Role</th><th>Expires</th><th /></tr></thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td>{roleLabel(i.role)}</td>
                    <td>{new Date(i.expires_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</td>
                    <td className="nc-table-actions">
                      <button style={btnGhost} onClick={() => copy(i.token)}>{copied === i.token ? <Check size={14} /> : <Copy size={14} />} Link</button>
                      <button style={btnGhost} onClick={() => revoke(i.id)}><Trash2 size={14} /> Revoke</button>
                    </td>
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
