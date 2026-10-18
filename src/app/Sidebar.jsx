import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Gauge, FileText, Users, LogOut, TrendingUp, ClipboardList, ShieldCheck, Leaf, RefreshCw,
  Layers, Ship, Package, CalendarClock, CreditCard, AlertTriangle, Handshake, Settings,
  UserPlus, ChevronDown, ChevronRight, Plus, Building2, Home, Send, FolderLock, LayoutDashboard, LifeBuoy,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { roleLabel } from "../lib/roles";
import { currentPeriod, reportById } from "../lib/reports";
import { useWorkspaceBase } from "./base";

const MAIN_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "submissions", label: "Submissions", icon: Send },
  { id: "documents", label: "Documents", icon: FolderLock },
];

const DATA_ITEMS = [
  { id: "entries", label: "Spend log", icon: ClipboardList },
  { id: "quota", label: "Expat quota", icon: Users },
  { id: "carbon", label: "Carbon intensity", icon: Leaf },
  { id: "dashboard", label: "NC position", icon: Gauge },
  { id: "report", label: "NC summary report", icon: FileText },
];

const REPORT_ITEMS = [
  { id: "calendar", label: "Compliance calendar", icon: CalendarClock },
  { id: "forecast", label: "Job Forecast (§18)", icon: FileText },
  { id: "procServices", label: "Procurement — Services (§24)", icon: FileText },
  { id: "procMaterials", label: "Procurement — Materials (§24)", icon: FileText },
  { id: "marine", label: "Marine Services (§24)", icon: Ship },
  { id: "annual", label: "NC Performance (§60)", icon: TrendingUp },
  { id: "ncplan", label: "NC Plan", icon: Layers },
  { id: "ncdf", label: "NCDF & NCFCC (§104)", icon: ShieldCheck },
  { id: "training", label: "Employment & Training (§29)", icon: Users },
  { id: "rnd", label: "R&D (§38/39)", icon: TrendingUp },
  { id: "insurance", label: "Insurance (§49)", icon: ShieldCheck },
  { id: "legal", label: "Legal Services (§51)", icon: ShieldCheck },
  { id: "financial", label: "Financial Services (§52)", icon: ShieldCheck },
  { id: "tech", label: "Technology Transfer (§44/46)", icon: Package },
  { id: "succession", label: "Succession Plan (§33)", icon: ClipboardList },
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

const REPORTS_OPEN_KEY = "nc_reports_open";

function NavItem({ item, dot }) {
  const Icon = item.icon;
  const base = useWorkspaceBase();
  return (
    <NavLink
      to={`${base}/${item.id}`}
      className={({ isActive }) => `nc-sidebar-nav-item ${isActive ? "is-active" : ""}`}
      title={item.label}
    >
      <Icon size={16} />
      <span className="nc-sidebar-label">{item.label}</span>
      {dot && <i className={`nc-dot nc-dot-${dot}`} title={dot.replace("_", " ")} />}
    </NavLink>
  );
}

export function Sidebar({ org, role, memberships, onSelectOrg, userEmail, onRefresh, refreshing, labsEnabled, isPlatformAdmin, submissions, demo = false }) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(() => {
    try { return localStorage.getItem(REPORTS_OPEN_KEY) !== "0"; } catch { return true; }
  });
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleReports = () => {
    setReportsOpen((o) => {
      try { localStorage.setItem(REPORTS_OPEN_KEY, o ? "0" : "1"); } catch { /* private mode */ }
      return !o;
    });
  };

  // Status dot for the report's current period, so the list doubles as a
  // progress board.
  const dotFor = (id) => {
    const r = reportById(id);
    if (!r || id === "ncdf") return null;
    const row = submissions?.byKey[`${id}:${currentPeriod(r).period}`];
    return row?.status && row.status !== "draft" ? row.status : null;
  };

  return (
    <nav className="nc-sidebar" aria-label="Workspace">
      <div className="nc-sidebar-header">
        <button className="nc-org-switcher" onClick={() => !demo && setSwitcherOpen((o) => !o)} aria-expanded={switcherOpen}>
          <Building2 size={18} color="#E6A23C" />
          <span className="nc-sidebar-header-text">
            <strong>{org.name}</strong>
            <small>{roleLabel(role)}</small>
          </span>
          {!demo && <ChevronDown size={14} />}
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

      {MAIN_ITEMS.map((it) => <NavItem key={it.id} item={it} />)}

      <div className="nc-sidebar-section nc-sidebar-label">Track data</div>
      {DATA_ITEMS.map((it) => <NavItem key={it.id} item={it} />)}

      <button className="nc-sidebar-section nc-sidebar-label nc-section-toggle" onClick={toggleReports} aria-expanded={reportsOpen}>
        NCDMB reports {reportsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {reportsOpen && REPORT_ITEMS.map((it) => <NavItem key={it.id} item={it} dot={dotFor(it.id)} />)}

      {labsEnabled && (
        <>
          <div className="nc-sidebar-section nc-sidebar-label">Labs</div>
          {LAB_ITEMS.map((it) => <NavItem key={it.id} item={it} />)}
        </>
      )}

      {demo ? (
        <>
          <div className="nc-sidebar-spacer" />
          <Link to="/signup" className="nc-sidebar-cta">Start your free trial</Link>
          <Link to="/" className="nc-sidebar-logout"><LogOut size={15} /> <span className="nc-sidebar-label">Exit demo</span></Link>
        </>
      ) : (
        <>
        <div className="nc-sidebar-section nc-sidebar-label">Account</div>
        {ACCOUNT_ITEMS.map((it) => <NavItem key={it.id} item={it} />)}
        {isPlatformAdmin && (
          <Link to="/admin" className="nc-sidebar-nav-item nc-admin-link"><LayoutDashboard size={16} /> <span className="nc-sidebar-label">Admin console</span></Link>
        )}

        <div className="nc-sidebar-spacer" />

        <button onClick={onRefresh} disabled={refreshing} className="nc-sidebar-logout">
          <RefreshCw size={15} className={refreshing ? "nc-spin" : undefined} />
          <span className="nc-sidebar-label">{refreshing ? "Refreshing…" : "Refresh data"}</span>
        </button>
        <div className="nc-sidebar-user nc-sidebar-label" title={userEmail}>{userEmail}</div>
        <button onClick={signOut} className="nc-sidebar-logout">
          <LogOut size={15} /> <span className="nc-sidebar-label">Sign out</span>
        </button>
        </>
      )}
      <Link className="nc-sidebar-link" to="/help">
        <LifeBuoy size={13} /> <span className="nc-sidebar-label">Help & guides</span>
      </Link>
      <a className="nc-sidebar-link" href="https://ncdmb.gov.ng/operational-guidelines/" target="_blank" rel="noopener noreferrer">
        <FileText size={13} /> <span className="nc-sidebar-label">NCDMB Operational Guidelines</span>
      </a>
    </nav>
  );
}
