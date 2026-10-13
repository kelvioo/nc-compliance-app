import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Gauge, FileText, Users, LogOut, TrendingUp, ClipboardList, ShieldCheck, Leaf, RefreshCw,
  Layers, Ship, Package, CalendarClock, CreditCard, AlertTriangle, Handshake, Settings,
  UserPlus, ChevronDown, Plus, Building2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { roleLabel } from "../lib/roles";

const DATA_ITEMS = [
  { id: "entries", label: "Spend log", icon: ClipboardList },
  { id: "quota", label: "Expat quota", icon: Users },
  { id: "carbon", label: "Carbon intensity", icon: Leaf },
  { id: "report", label: "Report", icon: FileText },
];

const REPORT_ITEMS = [
  { id: "calendar", label: "Compliance calendar", icon: CalendarClock },
  { id: "ncplan", label: "NC Plan", icon: Layers },
  { id: "ncdf", label: "NCDF & NCFCC (§104)", icon: ShieldCheck },
  { id: "annual", label: "NC Performance Report (§60)", icon: TrendingUp },
  { id: "forecast", label: "Job Forecast (§18)", icon: FileText },
  { id: "procServices", label: "Procurement — Services (§24)", icon: FileText },
  { id: "procMaterials", label: "Procurement — Materials (§24)", icon: FileText },
  { id: "marine", label: "Marine Services Utilization (§24)", icon: Ship },
  { id: "insurance", label: "Insurance Report (§49)", icon: ShieldCheck },
  { id: "legal", label: "Legal Services (§51)", icon: ShieldCheck },
  { id: "financial", label: "Financial Services (§52)", icon: ShieldCheck },
  { id: "training", label: "Employment & Training (§29)", icon: Users },
  { id: "rnd", label: "R&D (§38/39)", icon: TrendingUp },
  { id: "succession", label: "Succession Plan (§33)", icon: ClipboardList },
  { id: "tech", label: "Technology Transfer (§44/46)", icon: Package },
];

const LAB_ITEMS = [
  { id: "assurance", label: "Operations assurance", icon: AlertTriangle },
  { id: "marketplace", label: "Deal rooms & trade", icon: Handshake },
];

const ACCOUNT_ITEMS = [
  { id: "team", label: "Team", icon: UserPlus },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

function NavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={`/app/${item.id}`}
      className={({ isActive }) => `nc-sidebar-nav-item ${isActive ? "is-active" : ""}`}
      title={item.label}
    >
      <Icon size={16} />
      <span className="nc-sidebar-label">{item.label}</span>
    </NavLink>
  );
}

export function Sidebar({ org, role, memberships, onSelectOrg, userEmail, onRefresh, refreshing, labsEnabled }) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="nc-sidebar" aria-label="Workspace">
      <div className="nc-sidebar-header">
        <button className="nc-org-switcher" onClick={() => setSwitcherOpen((o) => !o)} aria-expanded={switcherOpen}>
          <Building2 size={18} color="#E6A23C" />
          <span className="nc-sidebar-header-text">
            <strong>{org.name}</strong>
            <small>{roleLabel(role)}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        {switcherOpen && (
          <div className="nc-org-menu">
            {memberships.map((m) => (
              <button key={m.organizations.id} onClick={() => { setSwitcherOpen(false); onSelectOrg(m.organizations.id); }}
                className={m.organizations.id === org.id ? "is-current" : ""}>
                {m.organizations.name}
                <small>{roleLabel(m.role)}</small>
              </button>
            ))}
            <button onClick={() => navigate("/onboarding")}><Plus size={14} /> Add a company</button>
          </div>
        )}
      </div>

      <NavItem item={{ id: "dashboard", label: "Dashboard", icon: Gauge }} />

      <div className="nc-sidebar-group">
        {DATA_ITEMS.map((it) => <NavItem key={it.id} item={it} />)}
        <div className="nc-sidebar-label nc-sidebar-hint">Report pulls its numbers from these three</div>
      </div>

      <div className="nc-sidebar-section nc-sidebar-label">NCDMB reports</div>
      {REPORT_ITEMS.map((it) => <NavItem key={it.id} item={it} />)}

      {labsEnabled && (
        <>
          <div className="nc-sidebar-section nc-sidebar-label">Labs</div>
          {LAB_ITEMS.map((it) => <NavItem key={it.id} item={it} />)}
        </>
      )}

      <div className="nc-sidebar-section nc-sidebar-label">Account</div>
      {ACCOUNT_ITEMS.map((it) => <NavItem key={it.id} item={it} />)}

      <div className="nc-sidebar-spacer" />

      <button onClick={onRefresh} disabled={refreshing} className="nc-sidebar-logout">
        <RefreshCw size={15} className={refreshing ? "nc-spin" : undefined} />
        <span className="nc-sidebar-label">{refreshing ? "Refreshing…" : "Refresh data"}</span>
      </button>
      <div className="nc-sidebar-user nc-sidebar-label" title={userEmail}>{userEmail}</div>
      <button onClick={signOut} className="nc-sidebar-logout">
        <LogOut size={15} /> <span className="nc-sidebar-label">Sign out</span>
      </button>
      <a className="nc-sidebar-link" href="https://ncdmb.gov.ng/operational-guidelines/" target="_blank" rel="noopener noreferrer">
        <FileText size={13} /> <span className="nc-sidebar-label">NCDMB Operational Guidelines</span>
      </a>
    </nav>
  );
}
