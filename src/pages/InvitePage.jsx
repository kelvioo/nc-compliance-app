import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { roleLabel } from "../lib/roles";
import { friendlyError } from "../lib/errors";
import { Brand, btnPrimary, FullPageLoader } from "../components/ui";

export default function InvitePage() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("get_invitation", { p_token: token }).then(({ data }) => setInvite(data?.[0] || null));
  }, [token]);

  if (loading || invite === undefined) return <FullPageLoader />;

  const accept = async () => {
    setBusy(true);
    const { data: orgId, error: err } = await supabase.rpc("accept_invitation", { p_token: token });
    if (err) { setError(friendlyError(err)); setBusy(false); return; }
    try { localStorage.setItem("nc_last_org", orgId); } catch { /* private mode */ }
    navigate("/app/dashboard", { replace: true });
  };

  const next = encodeURIComponent(`/invite/${token}`);
  let content;
  if (!invite) {
    content = <><h1>Invitation not found</h1><p className="nc-auth-sub">This link isn't valid. Ask your admin to send a new invitation.</p></>;
  } else if (invite.accepted || invite.expired) {
    content = <>
      <h1>{invite.accepted ? "Invitation already used" : "Invitation expired"}</h1>
      <p className="nc-auth-sub">{invite.accepted ? "If that was you, just sign in." : "Ask your admin at " + invite.org_name + " to send a new one."}</p>
      <Link to="/login">Sign in</Link>
    </>;
  } else {
    const wrongUser = user && user.email?.toLowerCase() !== invite.email.toLowerCase();
    content = <>
      <Users size={30} color="#E6A23C" />
      <h1>Join {invite.org_name}</h1>
      <p className="nc-auth-sub">
        You've been invited as <strong>{roleLabel(invite.role)}</strong> on NC Compliance, where your team prepares its NCDMB reports.
      </p>
      {!user && (
        <div className="nc-auth-form">
          <Link to={`/signup?next=${next}&email=${encodeURIComponent(invite.email)}`} style={{ ...btnPrimary, justifyContent: "center", textDecoration: "none" }}>
            Create your account
          </Link>
          <p className="nc-auth-links"><span>Already have one? <Link to={`/login?next=${next}&email=${encodeURIComponent(invite.email)}`}>Sign in</Link></span></p>
        </div>
      )}
      {user && wrongUser && (
        <div className="nc-form-error">
          This invitation is for <strong>{invite.email}</strong>, but you're signed in as {user.email}.{" "}
          <button className="nc-link-button" onClick={() => supabase.auth.signOut()}>Sign out</button> and use the invited address.
        </div>
      )}
      {user && !wrongUser && (
        <button style={{ ...btnPrimary, justifyContent: "center", width: "100%" }} onClick={accept} disabled={busy}>
          {busy ? "Joining…" : `Join ${invite.org_name}`}
        </button>
      )}
      {error && <div className="nc-form-error" role="alert">{error}</div>}
    </>;
  }

  return (
    <div className="nc-auth-page">
      <div className="nc-auth-card">
        <Link to="/" className="nc-auth-brand"><Brand /></Link>
        {content}
      </div>
    </div>
  );
}
