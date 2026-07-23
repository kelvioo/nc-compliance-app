import React, { useState, useEffect, useCallback } from "react";
import {
  Gauge, Plus, FileText, Users, LogOut, Building2, TrendingUp,
  Trash2, ChevronRight, ClipboardList, ShieldCheck, X, Loader2, Leaf, RefreshCw,
  Layers, Ship, HardHat, Package, CalendarClock
} from "lucide-react";

const CATS = [
  { id: "ngLabor", label: "Nigerian labor", group: "local" },
  { id: "expatLabor", label: "Expatriate labor", group: "foreign" },
  { id: "localEquip", label: "Local equipment", group: "local" },
  { id: "importEquip", label: "Imported equipment", group: "foreign" },
  { id: "localServices", label: "Local services", group: "local" },
  { id: "foreignServices", label: "Foreign services", group: "foreign" },
];

// Indicative CO2e emission factors, kg CO2e per unit consumed.
// Sources: typical IPCC / industry default factors. These are estimates for
// internal tracking only and should be validated against NUPRC/NCDMB or a
// certified carbon accounting methodology before external reporting.
const FUEL_TYPES = [
  { id: "diesel", label: "Diesel (generators, vehicles)", unit: "litres", factor: 2.68 },
  { id: "petrol", label: "Petrol / PMS", unit: "litres", factor: 2.31 },
  { id: "gasFlared", label: "Gas flared", unit: "scf", factor: 0.0549 },
  { id: "electricity", label: "Grid electricity", unit: "kWh", factor: 0.40 },
];

// Section 7 of the NOGICD Act / NCDMB's Nigerian Content Plan (NCP) template.
const PROCUREMENT_CATEGORIES = [
  { id: "longLead", label: "Long-lead item" },
  { id: "bulk", label: "Bulk material" },
  { id: "exclusive", label: "Exclusive category (NCDMB-reserved for Nigerian companies)" },
];
const AWARD_TYPES = [
  "Open competitive bidding", "Restricted / selective bidding", "Direct negotiation",
];
const BID_PLATFORMS = ["NipeX", "Paper-based"];

function blankNCPlan() {
  return {
    projectDescription: "",
    assetLocation: "",
    personnel: [],
    procurement: [],
    fabrication: [],
    installationCommissioning: "",
    vessels: [],
    contractingStrategy: { awardType: "", platform: "" },
  };
}

// Sections 18 & 24 of the NOGICD Act: contracts, subcontracts, and purchase
// orders are reported quarterly, split by a $1,000,000 threshold — Job
// Forecast Report for at/above it, Procurement Report for below it.
const CONTRACT_CATEGORIES = ["Contract", "Subcontract", "Purchase order"];
const CONTRACT_NATURE = ["Materials", "Services"]; // splits §24 Procurement Report into its two official templates
const CONTRACT_STATUSES = ["Planned / to be bid", "Bidding in progress", "Awarded", "Executed"];
const JOB_FORECAST_THRESHOLD_USD = 1000000;

function getQuarterOptions() {
  const now = new Date();
  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  const list = [];
  for (let i = 0; i < 5; i++) {
    let q = currentQ + i;
    let y = now.getFullYear();
    while (q > 4) { q -= 4; y += 1; }
    const startMonth = (q - 1) * 3;
    const start = new Date(y, startMonth, 1);
    const end = new Date(y, startMonth + 3, 0);
    const deadline = new Date(start);
    deadline.setDate(deadline.getDate() - 30);
    const fmt = (d) => d.toLocaleDateString("en-NG", { month: "short", year: "numeric" });
    list.push({
      id: `${y}-Q${q}`, quarterLabel: `Q${q} ${y}`,
      rangeLabel: `${fmt(start)} – ${fmt(end)}`,
      deadlineLabel: deadline.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }),
      deadline,
    });
  }
  return list;
}

// Sourced directly from NCDMB's own "Monitoring & Evaluation Reporting
// Templates" page (ncdmb.gov.ng/monitoring-evaluation-reporting-templates),
// which lists every statutory report under the NOGICD Act, 2010, its
// governing section, and its submission frequency.
const STATUTORY_REPORTS = [
  { section: "18", name: "Job Forecast Report",
    detail: "Contracts, subcontracts & purchase orders ≥ $1,000,000 expected to be bid or executed",
    freq: "quarterly-30days" },
  { section: "24", name: "Procurement Report — Materials",
    detail: "Contracts, subcontracts & purchase orders below $1,000,000 — materials",
    freq: "quarterly-30days" },
  { section: "24", name: "Procurement Report — Services",
    detail: "Contracts, subcontracts & purchase orders below $1,000,000 — services",
    freq: "quarterly-30days" },
  { section: "24", name: "Marine Services Utilization Report",
    detail: "Vessel and marine services utilization",
    freq: "quarterly-30days" },
  { section: "60", name: "NC Performance Report",
    detail: "Project progress & Nigerian Content performance for the year",
    freq: "annual-60days" },
  { section: "29", name: "Employment & Training Report", detail: "", freq: "quarterly" },
  { section: "39", name: "Research & Development Report", detail: "", freq: "quarterly" },
  { section: "49", name: "Insurance Services Report", detail: "", freq: "biannual" },
  { section: "51", name: "Legal Services Report", detail: "", freq: "biannual" },
  { section: "52", name: "Financial Services Report", detail: "", freq: "biannual" },
  { section: "29", name: "Employment & Training Plan", detail: "", freq: "annual" },
  { section: "38", name: "Research & Development Plan", detail: "", freq: "biannual" },
  { section: "44", name: "Technology Transfer Plan", detail: "", freq: "annual" },
  { section: "46", name: "Technology Transfer Report", detail: "", freq: "annual" },
  { section: "33", name: "Succession Plan", detail: "Submitted per approved expatriate position",
    freq: "per-expatriate" },
];

// Next occurrence of "30 days before the first day of the next quarter."
function nextQuarterly30DayDeadline(from) {
  const quarters = getQuarterOptions();
  const upcoming = quarters.find((q) => q.deadline >= from) || quarters[0];
  return upcoming.deadline;
}
// Next occurrence of "within 60 days of the beginning of the year."
function nextAnnual60DayDeadline(from) {
  let year = from.getFullYear();
  let deadline = new Date(year, 0, 1);
  deadline.setDate(deadline.getDate() + 60);
  if (deadline < from) {
    year += 1;
    deadline = new Date(year, 0, 1);
    deadline.setDate(deadline.getDate() + 60);
  }
  return deadline;
}
function daysUntil(date, from) {
  return Math.ceil((date.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0)) / 86400000);
}

const fmtNaira = (n) =>
  "\u20A6" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Data now lives in Supabase (Postgres), not the browser. This means the
// same company login pulls the same data on any device, in real time,
// instead of each browser/device having its own separate copy.
// See supabaseClient.js for the connection, and the SQL migration for the
// two database functions (nc_login_or_create, nc_save) this calls.
import { supabase } from "./supabaseClient";

function useCompanyStorage(session) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("nc_login_or_create", {
        p_id: session.id,
        p_name: session.name,
        p_pin: session.pin,
      });
      if (error) throw error;
      setData(result);
    } catch (e) {
      console.error("load failed", e);
      setData(null);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next) => {
    setData(next);
    try {
      const { error } = await supabase.rpc("nc_save", {
        p_id: session.id,
        p_pin: session.pin,
        p_data: next,
      });
      if (error) throw error;
    } catch (e) {
      console.error("save failed", e);
    }
  }, [session]);

  return { data, setData: save, loading, reload: load };
}

function Gauge_({ pct, target }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const angle = (clamped / 100) * 180;
  const targetAngle = (Math.max(0, Math.min(100, target)) / 100) * 180;
  const r = 90;
  const cx = 130, cy = 120;
  const toXY = (deg) => {
    const rad = (Math.PI / 180) * (180 - deg);
    return [cx - r * Math.cos(rad), cy - r * Math.sin(rad)];
  };
  const [nx, ny] = toXY(angle);
  const [tx, ty] = toXY(targetAngle);
  const status = clamped >= target ? "#4FAE7E" : clamped >= target - 10 ? "#E6A23C" : "#D9534F";

  const arcPath = (from, to, radius) => {
    const [x1, y1] = toXY(from);
    const [x2, y2] = toXY(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg viewBox="0 0 260 170" width="260" height="170" style={{ display: "block", margin: "0 auto" }}>
      <path d={arcPath(0, 180, r)} fill="none" stroke="#3A4552" strokeWidth="16" strokeLinecap="round" />
      {clamped > 0 && (
        <path d={arcPath(0, angle, r)} fill="none" stroke={status} strokeWidth="16" strokeLinecap="round" />
      )}
      <line x1={tx} y1={ty} x2={cx + (tx - cx) * 0.72} y2={cy + (ty - cy) * 0.72}
        stroke="#EDEFF2" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#EDEFF2" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#EDEFF2" strokeWidth="3" strokeLinecap="round" />
      <text x={cx} y={cy + 38} textAnchor="middle" fontFamily="IBM Plex Mono, monospace"
        fontSize="28" fontWeight="700" fill="#FFFFFF">{clamped.toFixed(1)}%</text>
      <text x={cx} y={cy + 58} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif"
        fontSize="11" letterSpacing="1.5" fill="#A6AFB9">NIGERIAN CONTENT</text>
    </svg>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#8D97A3" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle = {
  background: "#1A2028", border: "1px solid #2E3742", borderRadius: 6,
  color: "#EDEFF2", padding: "9px 11px", fontSize: 14, fontFamily: "IBM Plex Sans, sans-serif",
  outline: "none",
};

const btnPrimary = {
  background: "#E6A23C", color: "#1A1103", border: "none", borderRadius: 6,
  padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "IBM Plex Sans, sans-serif",
};

const btnGhost = {
  background: "transparent", color: "#8D97A3", border: "1px solid #2E3742", borderRadius: 6,
  padding: "9px 16px", fontSize: 13, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "IBM Plex Sans, sans-serif",
};

function LoginScreen({ onEnter }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (busy) return;
    if (!name.trim() || pin.trim().length < 4) {
      setError("Enter a company name and a PIN of at least 4 digits.");
      return;
    }
    setBusy(true);
    setError("");
    const id = slugify(name) || "company";
    try {
      const { error } = await supabase.rpc("nc_login_or_create", {
        p_id: id,
        p_name: name.trim(),
        p_pin: pin,
      });
      if (error) {
        if (error.message && error.message.includes("invalid_pin")) {
          setError("That PIN doesn't match this company's records.");
        } else {
          setError("Couldn't reach the server: " + error.message + ". Try again.");
        }
        setBusy(false);
        return;
      }
      onEnter({ id, name: name.trim(), pin });
    } catch (e2) {
      setError("Couldn't reach the server: " + (e2 && e2.message ? e2.message : "unknown error") + ". Try again.");
    }
    setBusy(false);
  };

  return (
    <div style={{
      minHeight: 560, display: "flex", alignItems: "center", justifyContent: "center",
      background: "#12161B", fontFamily: "IBM Plex Sans, sans-serif", padding: 24,
    }}>
      <div style={{ width: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <ShieldCheck size={22} color="#E6A23C" />
          <div>
            <div style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase",
              letterSpacing: 1.5, fontSize: 15, color: "#EDEFF2" }}>NC Compliance</div>
            <div style={{ fontSize: 12, color: "#8D97A3" }}>Nigerian Content report</div>
          </div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Company name">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AOS Orwell Limited" />
          </Field>
          <Field label="Access PIN (4+ digits, create one if new)">
            <input style={inputStyle} type="password" value={pin} inputMode="numeric"
              onChange={(e) => setPin(e.target.value)} placeholder="1234" />
          </Field>
          {error && <div style={{ color: "#D9534F", fontSize: 13 }}>{error}</div>}
          <button type="submit" onClick={submit}
            style={{ ...btnPrimary, justifyContent: "center", marginTop: 6, opacity: busy ? 0.7 : 1 }}>
            {busy ? <Loader2 size={16} /> : <ChevronRight size={16} />}
            {busy ? "Loading" : "Enter"}
          </button>
          <div style={{ fontSize: 12, color: "#5B6470", textAlign: "center", marginTop: 4 }}>
            New here? Just enter your company name and set a PIN — your workspace is created automatically.
          </div>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ view, setView, company, onLogout, onRefresh, refreshing }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Gauge },
    { id: "ncplan", label: "NC Plan", icon: Layers },
    { id: "quarterly", label: "Quarterly compliance", icon: CalendarClock },
    { id: "ncdf", label: "NCDF & NCFCC", icon: ShieldCheck },
    { id: "annual", label: "Annual report (§60)", icon: TrendingUp },
    { id: "other", label: "Other statutory reports", icon: ClipboardList },
    { id: "entries", label: "Spend log", icon: ClipboardList },
    { id: "quota", label: "Expat quota", icon: Users },
    { id: "carbon", label: "Carbon intensity", icon: Leaf },
    { id: "report", label: "Report", icon: FileText },
  ];
  return (
    <div style={{
      width: 200, background: "#0F1216", borderRight: "1px solid #2E3742",
      padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4,
      fontFamily: "IBM Plex Sans, sans-serif",
    }} className="nc-sidebar">
      <div className="nc-sidebar-header" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 20px" }}>
        <Building2 size={18} color="#E6A23C" />
        <div style={{ fontSize: 13, color: "#EDEFF2", fontWeight: 600, lineHeight: 1.3 }}>
          {company.name}
        </div>
      </div>
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.id;
        return (
          <button key={it.id} onClick={() => setView(it.id)} className="nc-sidebar-nav-item" style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            borderRadius: 6, border: "none", cursor: "pointer", textAlign: "left",
            background: active ? "#1A2028" : "transparent",
            color: active ? "#EDEFF2" : "#8D97A3", fontSize: 14,
            fontFamily: "IBM Plex Sans, sans-serif",
            borderLeft: active ? "2px solid #E6A23C" : "2px solid transparent",
          }}>
            <Icon size={16} />
            {it.label}
          </button>
        );
      })}
      <div className="nc-sidebar-spacer" style={{ flex: 1 }} />
      <button onClick={onRefresh} disabled={refreshing} className="nc-sidebar-logout" style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        borderRadius: 6, border: "none", background: "transparent", color: "#8D97A3",
        cursor: refreshing ? "default" : "pointer", fontSize: 13, fontFamily: "IBM Plex Sans, sans-serif",
        opacity: refreshing ? 0.6 : 1,
      }}>
        <RefreshCw size={15} style={refreshing ? { animation: "nc-spin 0.8s linear infinite" } : undefined} />
        {refreshing ? "Refreshing…" : "Refresh data"}
      </button>
      <button onClick={onLogout} className="nc-sidebar-logout" style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        borderRadius: 6, border: "none", background: "transparent", color: "#5B6470",
        cursor: "pointer", fontSize: 13, fontFamily: "IBM Plex Sans, sans-serif",
      }}>
        <LogOut size={15} /> Switch company
      </button>
      <a href="https://ncdmb.gov.ng/operational-guidelines/" target="_blank" rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
          borderRadius: 6, color: "#5B6470", cursor: "pointer", fontSize: 11,
          fontFamily: "IBM Plex Sans, sans-serif", textDecoration: "none", opacity: 0.8,
        }}>
        <FileText size={13} /> NCDMB Operational Guidelines
      </a>
      <a href="https://ncdmb.gov.ng/complaint-procedure/" target="_blank" rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
          borderRadius: 6, color: "#5B6470", cursor: "pointer", fontSize: 11,
          fontFamily: "IBM Plex Sans, sans-serif", textDecoration: "none", opacity: 0.8,
        }}>
        <ShieldCheck size={13} /> NCDMB Complaint Procedure
      </a>
    </div>
  );
}

// Shared letterhead used across every one of the 15 printable NCDMB reports,
// matching the real templates' layout: centered logo placeholder (left empty
// per instruction — no official NCDMB mark used), board name, rule, gray
// title band, and a form-field block. #printable already flips to white
// background / black text / gray borders at print time (see @media print).
function NCDMBLetterhead({ reportTitle, sectionRef, fields }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 10 }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", border: "1.5px dashed #5B6470",
          display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
          fontSize: 8, color: "#5B6470", marginBottom: 10, lineHeight: 1.2 }}>
          Company<br />logo
        </div>
        <div style={{ fontFamily: "IBM Plex Sans, sans-serif", fontWeight: 700, fontSize: 14,
          textAlign: "center", letterSpacing: 0.2 }}>
          NIGERIAN CONTENT DEVELOPMENT AND MONITORING BOARD<br />(NCDMB)
        </div>
      </div>
      <div style={{ borderBottom: "1px solid #999", marginBottom: 14 }} />
      <div style={{ background: "#EFEFEF", padding: "14px 16px", textAlign: "center", fontWeight: 700,
        fontSize: 13, marginBottom: 14 }}>
        {reportTitle}
      </div>
      {fields && fields.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {fields.map(([label, value], i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0",
              borderBottom: "1px solid #CCC", fontSize: 12 }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{label}:</div>
              <div>{value || "—"}</div>
            </div>
          ))}
        </div>
      )}
      {sectionRef && (
        <div style={{ fontSize: 10, color: "#5B6470", marginTop: 6 }}>NOGICD Act, 2010 — {sectionRef}</div>
      )}
    </div>
  );
}

function NCDMBFooter({ docName }) {
  return (
    <div style={{ display: "flex", fontSize: 9, borderTop: "1px solid #999", marginTop: 22, paddingTop: 6 }}>
      <div style={{ flex: 2 }}>Nigerian Content Development and Monitoring Board (NCDMB)</div>
      <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid #999", borderRight: "1px solid #999" }}>
        Prepared via NC Compliance Report
      </div>
      <div style={{ flex: 2, textAlign: "right" }}>{docName}</div>
    </div>
  );
}

function calcTotals(entries) {
  const totals = {};
  CATS.forEach((c) => (totals[c.id] = 0));
  entries.forEach((e) => { totals[e.category] = (totals[e.category] || 0) + Number(e.amount || 0); });
  const local = CATS.filter((c) => c.group === "local").reduce((s, c) => s + totals[c.id], 0);
  const foreign = CATS.filter((c) => c.group === "foreign").reduce((s, c) => s + totals[c.id], 0);
  const total = local + foreign;
  const pct = total > 0 ? (local / total) * 100 : 0;
  return { totals, local, foreign, total, pct };
}

// Groups entries by month and fits a simple linear trend across monthly NC%
// to project the position roughly one quarter (3 months) ahead. This is a
// lightweight indicative forecast based on your own logged data, not a
// certified projection.
function calcForecast(entries) {
  if (!entries || entries.length === 0) return null;
  const byMonth = {};
  entries.forEach((e) => {
    if (!e.date) return;
    const key = e.date.slice(0, 7); // YYYY-MM
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(e);
  });
  const months = Object.keys(byMonth).sort();
  if (months.length < 2) return null;

  const points = months.map((m, i) => {
    const { pct } = calcTotals(byMonth[m]);
    return { i, pct };
  });

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.i, 0);
  const sumY = points.reduce((s, p) => s + p.pct, 0);
  const sumXY = points.reduce((s, p) => s + p.i * p.pct, 0);
  const sumXX = points.reduce((s, p) => s + p.i * p.i, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const projected = intercept + slope * (n + 2); // ~3 months ahead
  return {
    monthsTracked: n,
    trendPerMonth: slope,
    projectedPct: Math.max(0, Math.min(100, projected)),
  };
}

function Dashboard({ data, setData }) {
  const { totals, local, foreign, total, pct } = calcTotals(data.entries);
  const forecast = calcForecast(data.entries);
  const [target, setTarget] = useState(data.target || 70);
  const [rate, setRate] = useState(data.exchangeRate || 1600);

  const saveTarget = async () => {
    await setData({ ...data, target: Number(target) });
  };
  const saveRate = async () => {
    await setData({ ...data, exchangeRate: Number(rate) || 1600 });
  };

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Compliance dashboard</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 24px" }}>
        Live Nigerian Content position across {data.entries.length} logged entries.
      </p>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 28 }}>
        <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
          padding: 20, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 260 }}>
          <Gauge_ pct={pct} target={target} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "#8D97A3" }}>Target</span>
            <input type="number" value={target} min={0} max={100}
              onChange={(e) => setTarget(e.target.value)} onBlur={saveTarget}
              style={{ ...inputStyle, width: 56, padding: "5px 8px", textAlign: "center" }} />
            <span style={{ fontSize: 12, color: "#8D97A3" }}>%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "#5B6470" }}>₦/$1</span>
            <input type="number" value={rate} min={1}
              onChange={(e) => setRate(e.target.value)} onBlur={saveRate}
              style={{ ...inputStyle, width: 80, padding: "5px 8px", textAlign: "center", fontSize: 12 }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <StatCard label="Local spend" value={fmtNaira(local)} accent="#4FAE7E" />
            <StatCard label="Foreign spend" value={fmtNaira(foreign)} accent="#D9534F" />
            <StatCard label="Total tracked" value={fmtNaira(total)} accent="#7FC4D6" />
          </div>
          {forecast && (
            <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#8D97A3", marginBottom: 6, letterSpacing: 0.5 }}>
                PROJECTED NC% (NEXT QUARTER)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 22, fontWeight: 700,
                  color: forecast.projectedPct >= target ? "#4FAE7E" : "#D9534F" }}>
                  {forecast.projectedPct.toFixed(1)}%
                </span>
                <span style={{ fontSize: 11, color: "#5B6470" }}>
                  based on {forecast.monthsTracked} months of data · trend {forecast.trendPerMonth >= 0 ? "+" : ""}
                  {forecast.trendPerMonth.toFixed(1)}pt/month
                </span>
              </div>
            </div>
          )}
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 12, color: "#8D97A3", marginBottom: 12, letterSpacing: 0.5 }}>
              SPEND BY CATEGORY
            </div>
            {CATS.map((c) => {
              const val = totals[c.id];
              const w = total > 0 ? (val / total) * 100 : 0;
              return (
                <div key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
                    color: "#EDEFF2", marginBottom: 4 }}>
                    <span>{c.label}</span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "#8D97A3" }}>
                      {fmtNaira(val)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#0F1216", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${w}%`, height: "100%",
                      background: c.group === "local" ? "#4FAE7E" : "#D9534F" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
      padding: "14px 16px", flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: "#8D97A3", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 18, fontWeight: 600, color: accent }}>
        {value}
      </div>
    </div>
  );
}

function EntriesView({ data, setData }) {
  const rate = data.exchangeRate || 1600;
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), category: CATS[0].id,
    vendor: "", amount: "", note: "", project: "", addedBy: "", currency: "NGN",
  });

  const addEntry = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    const enteredAmount = Number(form.amount);
    const ngnAmount = form.currency === "USD" ? enteredAmount * rate : enteredAmount;
    const entry = {
      id: Date.now().toString(36), ...form,
      amount: ngnAmount, originalAmount: enteredAmount, fxRate: form.currency === "USD" ? rate : null,
    };
    await setData({ ...data, entries: [entry, ...data.entries] });
    setForm({ ...form, vendor: "", amount: "", note: "" });
  };

  const removeEntry = async (id) => {
    await setData({ ...data, entries: data.entries.filter((e) => e.id !== id) });
  };

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 20px" }}>Spend log</h1>

      <form onSubmit={addEntry} className="nc-form-grid" style={{
        display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 10,
        background: "#1A2028", border: "1px solid #2E3742",
        borderRadius: 10, padding: 16, marginBottom: 22, rowGap: 12,
      }}>
        <Field label="Date">
          <input type="date" style={inputStyle} value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Category">
          <select style={inputStyle} value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Contract / project reference">
          <input style={inputStyle} value={form.project}
            onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Bonga North" />
        </Field>
        <Field label="Vendor / contractor">
          <input style={inputStyle} value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Amount">
          <div style={{ display: "flex", gap: 6 }}>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
              style={{ ...inputStyle, width: 74, flexShrink: 0 }}>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
            <input type="number" min="0" style={inputStyle} value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </div>
          {form.currency === "USD" && form.amount > 0 && (
            <div style={{ fontSize: 11, color: "#8D97A3", marginTop: 4 }}>
              ≈ {fmtNaira(Number(form.amount) * rate)} at ₦{rate.toLocaleString()}/$1
            </div>
          )}
        </Field>
        <Field label="Logged by">
          <input style={inputStyle} value={form.addedBy}
            onChange={(e) => setForm({ ...form, addedBy: e.target.value })} placeholder="Your name" />
        </Field>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <Field label="Note">
              <input style={inputStyle} value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" />
            </Field>
          </div>
          <button type="submit" style={btnPrimary}><Plus size={15} /> Add entry</button>
        </div>
      </form>

      <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
              {["Date", "Category", "Project", "Vendor", "Amount", "Note", "Logged by", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.entries.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>
                No entries yet. Log your first spend item above.
              </td></tr>
            )}
            {data.entries.map((e) => {
              const cat = CATS.find((c) => c.id === e.category);
              return (
                <tr key={e.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                  <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>{e.date}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ color: cat?.group === "local" ? "#4FAE7E" : "#D9534F" }}>●</span>{" "}
                    {cat?.label}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.project || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.vendor || "—"}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace", whiteSpace: "nowrap" }}>
                    {fmtNaira(e.amount)}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3", maxWidth: 160 }}>{e.note || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.addedBy || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => removeEntry(e.id)} style={{
                      background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotaView({ data, setData }) {
  const [form, setForm] = useState({ role: "", approvedSlots: "", nigerianUnderstudies: "" });

  const addPosition = async (e) => {
    e.preventDefault();
    if (!form.role.trim()) return;
    const pos = {
      id: Date.now().toString(36), role: form.role,
      approvedSlots: Number(form.approvedSlots || 0),
      nigerianUnderstudies: Number(form.nigerianUnderstudies || 0),
    };
    await setData({ ...data, expatPositions: [...(data.expatPositions || []), pos] });
    setForm({ role: "", approvedSlots: "", nigerianUnderstudies: "" });
  };

  const removePos = async (id) => {
    await setData({ ...data, expatPositions: data.expatPositions.filter((p) => p.id !== id) });
  };

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Expatriate quota report</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px" }}>
        Track approved expatriate positions against Nigerian understudy progress.
      </p>

      <form onSubmit={addPosition} style={{
        display: "grid", gridTemplateColumns: "1fr 160px 200px auto", gap: 10, alignItems: "end",
        background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 22,
      }}>
        <Field label="Position / role">
          <input style={inputStyle} value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Drilling Engineer" />
        </Field>
        <Field label="Approved slots">
          <input type="number" min="0" style={inputStyle} value={form.approvedSlots}
            onChange={(e) => setForm({ ...form, approvedSlots: e.target.value })} />
        </Field>
        <Field label="Nigerian understudies assigned">
          <input type="number" min="0" style={inputStyle} value={form.nigerianUnderstudies}
            onChange={(e) => setForm({ ...form, nigerianUnderstudies: e.target.value })} />
        </Field>
        <button type="submit" style={btnPrimary}><Plus size={15} /> Add</button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(data.expatPositions || []).length === 0 && (
          <div style={{ color: "#5B6470", fontSize: 13, padding: 10 }}>No positions logged yet.</div>
        )}
        {(data.expatPositions || []).map((p) => {
          const progress = p.approvedSlots > 0 ? (p.nigerianUnderstudies / p.approvedSlots) * 100 : 0;
          return (
            <div key={p.id} style={{ background: "#1A2028", border: "1px solid #2E3742",
              borderRadius: 10, padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#EDEFF2", fontSize: 14, marginBottom: 6 }}>{p.role}</div>
                <div style={{ height: 6, background: "#0F1216", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, progress)}%`, height: "100%", background: "#E6A23C" }} />
                </div>
              </div>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: "#8D97A3",
                whiteSpace: "nowrap" }}>
                {p.nigerianUnderstudies} / {p.approvedSlots} localised
              </div>
              <button onClick={() => removePos(p.id)} style={{
                background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NCPlanTab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
      borderRadius: 6, border: "1px solid " + (active ? "#E6A23C" : "#2E3742"),
      background: active ? "rgba(230,162,60,0.1)" : "transparent",
      color: active ? "#E6A23C" : "#8D97A3", cursor: "pointer", fontSize: 13,
      fontFamily: "IBM Plex Sans, sans-serif", whiteSpace: "nowrap",
    }}>
      <Icon size={14} /> {label}
    </button>
  );
}

function NCPlanView({ data, setData }) {
  const plan = data.ncPlan || blankNCPlan();
  const [section, setSection] = useState("overview");

  const savePlan = async (patch) => {
    await setData({ ...data, ncPlan: { ...plan, ...patch } });
  };

  const [overview, setOverview] = useState({
    projectDescription: plan.projectDescription, assetLocation: plan.assetLocation,
  });
  const saveOverview = () => savePlan(overview);

  const [installTxt, setInstallTxt] = useState(plan.installationCommissioning);
  const saveInstall = () => savePlan({ installationCommissioning: installTxt });

  const [personnelForm, setPersonnelForm] = useState({
    discipline: "", manningLevel: "", qualification: "", certification: "",
  });
  const addPersonnel = async (e) => {
    e.preventDefault();
    if (!personnelForm.discipline.trim()) return;
    const row = { id: Date.now().toString(36), ...personnelForm };
    await savePlan({ personnel: [...plan.personnel, row] });
    setPersonnelForm({ discipline: "", manningLevel: "", qualification: "", certification: "" });
  };
  const removePersonnel = (id) => savePlan({ personnel: plan.personnel.filter((p) => p.id !== id) });

  const [procForm, setProcForm] = useState({
    itemDescription: "", category: "longLead", estimatedValueUsd: "", sourcingStrategy: "",
  });
  const addProc = async (e) => {
    e.preventDefault();
    if (!procForm.itemDescription.trim()) return;
    const row = { id: Date.now().toString(36), ...procForm, estimatedValueUsd: Number(procForm.estimatedValueUsd || 0) };
    await savePlan({ procurement: [...plan.procurement, row] });
    setProcForm({ itemDescription: "", category: "longLead", estimatedValueUsd: "", sourcingStrategy: "" });
  };
  const removeProc = (id) => savePlan({ procurement: plan.procurement.filter((p) => p.id !== id) });

  const [fabForm, setFabForm] = useState({ location: "", tonnage: "", activities: "" });
  const addFab = async (e) => {
    e.preventDefault();
    if (!fabForm.location.trim()) return;
    const row = { id: Date.now().toString(36), ...fabForm, tonnage: Number(fabForm.tonnage || 0) };
    await savePlan({ fabrication: [...plan.fabrication, row] });
    setFabForm({ location: "", tonnage: "", activities: "" });
  };
  const removeFab = (id) => savePlan({ fabrication: plan.fabrication.filter((f) => f.id !== id) });

  const [vesselForm, setVesselForm] = useState({ vesselType: "", nigerianOwned: true, operator: "" });
  const addVessel = async (e) => {
    e.preventDefault();
    if (!vesselForm.vesselType.trim()) return;
    const row = { id: Date.now().toString(36), ...vesselForm };
    await savePlan({ vessels: [...plan.vessels, row] });
    setVesselForm({ vesselType: "", nigerianOwned: true, operator: "" });
  };
  const removeVessel = (id) => savePlan({ vessels: plan.vessels.filter((v) => v.id !== id) });

  const saveContracting = (patch) => savePlan({ contractingStrategy: { ...plan.contractingStrategy, ...patch } });

  const today = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
  const { pct } = calcTotals(data.entries);

  const tabs = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "personnel", label: "Personnel plan", icon: Users },
    { id: "procurement", label: "Procurement plan", icon: Package },
    { id: "fabrication", label: "Fabrication & install", icon: HardHat },
    { id: "vessels", label: "Vessel requirements", icon: Ship },
    { id: "contracting", label: "Contracting strategy", icon: FileText },
    { id: "preview", label: "Preview & export", icon: Layers },
  ];

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Nigerian Content Plan</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px" }}>
        Build the NCP document required before bidding or project start, structured to match NCDMB's
        submission format. Fill in each section, then generate a print-ready copy.
      </p>

      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {tabs.map((t) => (
          <NCPlanTab key={t.id} active={section === t.id} onClick={() => setSection(t.id)}
            icon={t.icon} label={t.label} />
        ))}
      </div>

      {section === "overview" && (
        <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
          padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
          <Field label="Project description">
            <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              value={overview.projectDescription}
              onChange={(e) => setOverview({ ...overview, projectDescription: e.target.value })}
              onBlur={saveOverview}
              placeholder="Scope, objectives, and context of the project this NCP covers." />
          </Field>
          <Field label="Asset location">
            <input style={inputStyle} value={overview.assetLocation}
              onChange={(e) => setOverview({ ...overview, assetLocation: e.target.value })}
              onBlur={saveOverview}
              placeholder="e.g. OML 58, Bonny Terminal, Rivers State" />
          </Field>
        </div>
      )}

      {section === "personnel" && (
        <>
          <form onSubmit={addPersonnel} style={{
            display: "grid", gridTemplateColumns: "1fr 140px 1fr 1fr auto", gap: 10, alignItems: "end",
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 20,
          }} className="nc-form-grid">
            <Field label="Discipline / role">
              <input style={inputStyle} value={personnelForm.discipline}
                onChange={(e) => setPersonnelForm({ ...personnelForm, discipline: e.target.value })}
                placeholder="e.g. Instrumentation Engineer" />
            </Field>
            <Field label="Manning level">
              <input style={inputStyle} value={personnelForm.manningLevel}
                onChange={(e) => setPersonnelForm({ ...personnelForm, manningLevel: e.target.value })}
                placeholder="e.g. 4" />
            </Field>
            <Field label="Qualification">
              <input style={inputStyle} value={personnelForm.qualification}
                onChange={(e) => setPersonnelForm({ ...personnelForm, qualification: e.target.value })}
                placeholder="e.g. BEng Electrical/Electronics" />
            </Field>
            <Field label="Certification">
              <input style={inputStyle} value={personnelForm.certification}
                onChange={(e) => setPersonnelForm({ ...personnelForm, certification: e.target.value })}
                placeholder="e.g. COREN registered" />
            </Field>
            <button type="submit" style={btnPrimary}><Plus size={15} /> Add</button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plan.personnel.length === 0 && (
              <div style={{ color: "#5B6470", fontSize: 13, padding: 10 }}>No personnel rows added yet.</div>
            )}
            {plan.personnel.map((p) => (
              <div key={p.id} style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
                padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1, color: "#EDEFF2", fontSize: 14 }}>{p.discipline}</div>
                <div style={{ fontSize: 12, color: "#8D97A3", width: 100 }}>Level {p.manningLevel || "—"}</div>
                <div style={{ fontSize: 12, color: "#8D97A3", flex: 1 }}>{p.qualification || "—"}</div>
                <div style={{ fontSize: 12, color: "#8D97A3", flex: 1 }}>{p.certification || "—"}</div>
                <button onClick={() => removePersonnel(p.id)} style={{
                  background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === "procurement" && (
        <>
          <form onSubmit={addProc} style={{
            display: "grid", gridTemplateColumns: "1.4fr 1fr 140px 1fr auto", gap: 10, alignItems: "end",
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 20,
          }} className="nc-form-grid">
            <Field label="Item description">
              <input style={inputStyle} value={procForm.itemDescription}
                onChange={(e) => setProcForm({ ...procForm, itemDescription: e.target.value })}
                placeholder="e.g. Subsea wellhead assembly" />
            </Field>
            <Field label="Category">
              <select style={inputStyle} value={procForm.category}
                onChange={(e) => setProcForm({ ...procForm, category: e.target.value })}>
                {PROCUREMENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Est. value (USD)">
              <input type="number" min="0" style={inputStyle} value={procForm.estimatedValueUsd}
                onChange={(e) => setProcForm({ ...procForm, estimatedValueUsd: e.target.value })} />
            </Field>
            <Field label="Sourcing strategy">
              <input style={inputStyle} value={procForm.sourcingStrategy}
                onChange={(e) => setProcForm({ ...procForm, sourcingStrategy: e.target.value })}
                placeholder="e.g. Local fabrication, NipeX bid" />
            </Field>
            <button type="submit" style={btnPrimary}><Plus size={15} /> Add</button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plan.procurement.length === 0 && (
              <div style={{ color: "#5B6470", fontSize: 13, padding: 10 }}>No procurement items added yet.</div>
            )}
            {plan.procurement.map((p) => (
              <div key={p.id} style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
                padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1.4, color: "#EDEFF2", fontSize: 14 }}>{p.itemDescription}</div>
                <div style={{ fontSize: 12, color: "#8D97A3", flex: 1 }}>
                  {PROCUREMENT_CATEGORIES.find((c) => c.id === p.category)?.label}
                </div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: "#8D97A3", width: 140 }}>
                  ${Number(p.estimatedValueUsd).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#8D97A3", flex: 1 }}>{p.sourcingStrategy || "—"}</div>
                <button onClick={() => removeProc(p.id)} style={{
                  background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === "fabrication" && (
        <>
          <form onSubmit={addFab} style={{
            display: "grid", gridTemplateColumns: "1fr 140px 1.4fr auto", gap: 10, alignItems: "end",
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 20,
          }} className="nc-form-grid">
            <Field label="Fabrication location">
              <input style={inputStyle} value={fabForm.location}
                onChange={(e) => setFabForm({ ...fabForm, location: e.target.value })}
                placeholder="e.g. Onne Fabrication Yard" />
            </Field>
            <Field label="Tonnage">
              <input type="number" min="0" style={inputStyle} value={fabForm.tonnage}
                onChange={(e) => setFabForm({ ...fabForm, tonnage: e.target.value })} />
            </Field>
            <Field label="Activities">
              <input style={inputStyle} value={fabForm.activities}
                onChange={(e) => setFabForm({ ...fabForm, activities: e.target.value })}
                placeholder="e.g. Structural steel fabrication, coating" />
            </Field>
            <button type="submit" style={btnPrimary}><Plus size={15} /> Add</button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {plan.fabrication.length === 0 && (
              <div style={{ color: "#5B6470", fontSize: 13, padding: 10 }}>No fabrication rows added yet.</div>
            )}
            {plan.fabrication.map((f) => (
              <div key={f.id} style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
                padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1, color: "#EDEFF2", fontSize: 14 }}>{f.location}</div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: "#8D97A3", width: 120 }}>
                  {Number(f.tonnage).toLocaleString()} t
                </div>
                <div style={{ fontSize: 12, color: "#8D97A3", flex: 1.4 }}>{f.activities || "—"}</div>
                <button onClick={() => removeFab(f.id)} style={{
                  background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: 20, maxWidth: 560 }}>
            <Field label="Installation & commissioning plan">
              <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                value={installTxt} onChange={(e) => setInstallTxt(e.target.value)} onBlur={saveInstall}
                placeholder="Sequence, methods, and milestones for installation and commissioning." />
            </Field>
          </div>
        </>
      )}

      {section === "vessels" && (
        <>
          <form onSubmit={addVessel} style={{
            display: "grid", gridTemplateColumns: "1fr 160px 1fr auto", gap: 10, alignItems: "end",
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 20,
          }} className="nc-form-grid">
            <Field label="Vessel type">
              <input style={inputStyle} value={vesselForm.vesselType}
                onChange={(e) => setVesselForm({ ...vesselForm, vesselType: e.target.value })}
                placeholder="e.g. Anchor Handling Tug Supply" />
            </Field>
            <Field label="Nigerian-owned">
              <select style={inputStyle} value={vesselForm.nigerianOwned ? "yes" : "no"}
                onChange={(e) => setVesselForm({ ...vesselForm, nigerianOwned: e.target.value === "yes" })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
            <Field label="Operator">
              <input style={inputStyle} value={vesselForm.operator}
                onChange={(e) => setVesselForm({ ...vesselForm, operator: e.target.value })}
                placeholder="e.g. Company / vessel owner name" />
            </Field>
            <button type="submit" style={btnPrimary}><Plus size={15} /> Add</button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plan.vessels.length === 0 && (
              <div style={{ color: "#5B6470", fontSize: 13, padding: 10 }}>No vessels added yet.</div>
            )}
            {plan.vessels.map((v) => (
              <div key={v.id} style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
                padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1, color: "#EDEFF2", fontSize: 14 }}>{v.vesselType}</div>
                <div style={{ fontSize: 12, width: 140, color: v.nigerianOwned ? "#4FAE7E" : "#D9534F" }}>
                  {v.nigerianOwned ? "Nigerian-owned" : "Foreign-owned"}
                </div>
                <div style={{ fontSize: 12, color: "#8D97A3", flex: 1 }}>{v.operator || "—"}</div>
                <button onClick={() => removeVessel(v.id)} style={{
                  background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === "contracting" && (
        <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
          padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 400 }}>
          <Field label="Award type">
            <select style={inputStyle} value={plan.contractingStrategy.awardType}
              onChange={(e) => saveContracting({ awardType: e.target.value })}>
              <option value="">Select…</option>
              {AWARD_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Bidding platform">
            <select style={inputStyle} value={plan.contractingStrategy.platform}
              onChange={(e) => saveContracting({ platform: e.target.value })}>
              <option value="">Select…</option>
              {BID_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
      )}

      {section === "preview" && (
        <>
          <div className="no-print" style={{ marginBottom: 16 }}>
            <button onClick={() => window.print()} style={btnPrimary}>
              <FileText size={14} /> Print / save as PDF
            </button>
          </div>
          <div id="printable" style={{ background: "#1A2028", border: "1px solid #2E3742",
            borderRadius: 10, padding: 32, maxWidth: 700 }}>
            <div style={{ borderBottom: "1px solid #2E3742", paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, color: "#EDEFF2",
                textTransform: "uppercase", letterSpacing: 1 }}>{data.name}</div>
              <div style={{ fontSize: 12, color: "#8D97A3", marginTop: 4 }}>
                Nigerian Content Plan — generated {today}
              </div>
            </div>

            <PlanSectionTitle>1. Project overview</PlanSectionTitle>
            <PlanRow label="Description" value={plan.projectDescription || "—"} />
            <PlanRow label="Asset location" value={plan.assetLocation || "—"} />
            <PlanRow label="Current Nigerian Content position" value={`${pct.toFixed(1)}% (target ${data.target}%)`} />

            <PlanSectionTitle>2. Personnel plan</PlanSectionTitle>
            {plan.personnel.length === 0 ? <PlanEmpty /> : (
              <PlanTable headers={["Discipline", "Manning level", "Qualification", "Certification"]}
                rows={plan.personnel.map((p) => [p.discipline, p.manningLevel, p.qualification, p.certification])} />
            )}

            <PlanSectionTitle>3. Procurement plan</PlanSectionTitle>
            {plan.procurement.length === 0 ? <PlanEmpty /> : (
              <PlanTable headers={["Item", "Category", "Est. value (USD)", "Sourcing strategy"]}
                rows={plan.procurement.map((p) => [
                  p.itemDescription,
                  PROCUREMENT_CATEGORIES.find((c) => c.id === p.category)?.label,
                  "$" + Number(p.estimatedValueUsd).toLocaleString(),
                  p.sourcingStrategy,
                ])} />
            )}

            <PlanSectionTitle>4. Fabrication plan</PlanSectionTitle>
            {plan.fabrication.length === 0 ? <PlanEmpty /> : (
              <PlanTable headers={["Location", "Tonnage", "Activities"]}
                rows={plan.fabrication.map((f) => [f.location, Number(f.tonnage).toLocaleString() + " t", f.activities])} />
            )}

            <PlanSectionTitle>5. Installation & commissioning plan</PlanSectionTitle>
            <div style={{ fontSize: 13, color: "#EDEFF2", marginBottom: 20, whiteSpace: "pre-wrap" }}>
              {plan.installationCommissioning || "—"}
            </div>

            <PlanSectionTitle>6. Vessel requirements</PlanSectionTitle>
            {plan.vessels.length === 0 ? <PlanEmpty /> : (
              <PlanTable headers={["Vessel type", "Ownership", "Operator"]}
                rows={plan.vessels.map((v) => [v.vesselType, v.nigerianOwned ? "Nigerian-owned" : "Foreign-owned", v.operator])} />
            )}

            <PlanSectionTitle>7. Contracting strategy</PlanSectionTitle>
            <PlanRow label="Award type" value={plan.contractingStrategy.awardType || "—"} />
            <PlanRow label="Bidding platform" value={plan.contractingStrategy.platform || "—"} last />

            <div style={{ fontSize: 11, color: "#5B6470", marginTop: 20 }}>
              This document is generated for internal preparation ahead of NCDMB submission. Verify all
              figures and formatting against the current NCDMB NCP template before formal submission.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PlanSectionTitle({ children }) {
  return (
    <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 14, color: "#EDEFF2",
      textTransform: "uppercase", letterSpacing: 1, marginTop: 24, marginBottom: 10,
      borderTop: "1px solid #2E3742", paddingTop: 16 }}>{children}</div>
  );
}
function PlanRow({ label, value, last }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: last ? 0 : 8 }}>
      <div style={{ color: "#8D97A3", minWidth: 160 }}>{label}</div>
      <div style={{ color: "#EDEFF2" }}>{value}</div>
    </div>
  );
}
function PlanEmpty() {
  return <div style={{ color: "#5B6470", fontSize: 12, marginBottom: 16 }}>Not yet filled in.</div>;
}
function PlanTable({ headers, rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
      <thead>
        <tr style={{ color: "#8D97A3", textAlign: "left" }}>
          {headers.map((h) => <th key={h} style={{ padding: "6px 0", fontWeight: 500 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
            {r.map((cell, j) => <td key={j} style={{ padding: "8px 8px 8px 0" }}>{cell || "—"}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Matches the visual identity used across NCDMB's own reporting templates:
// circular logo slot (left empty per instruction — no third-party logo used),
// bold centered board name, a light-gray title band, and a three-part footer
// strip (board name | version/date | page label). Every generated report
// wraps its content in this so printouts look consistent with NCDMB's own
// paperwork.
function NCDMBDocShell({ title, companyName, meta, docLabel, children }) {
  return (
    <div id="printable" style={{ background: "#fff", color: "#111", padding: "40px 44px",
      maxWidth: 800, fontFamily: "'IBM Plex Sans', sans-serif", border: "1px solid #2E3742", borderRadius: 10 }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px dashed #B8BEC6",
          margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "#B8BEC6", textAlign: "center", lineHeight: 1.2 }}>NCDMB<br />logo</div>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>
          NIGERIAN CONTENT DEVELOPMENT AND MONITORING BOARD
        </div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>(NCDMB)</div>
      </div>
      <div style={{ borderTop: "1px solid #999", marginBottom: 10 }} />
      <div style={{ background: "#F1F1F1", padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, textAlign: "center" }}>{title}</div>
      </div>
      <div style={{ fontSize: 12, marginBottom: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <div><strong>Name of Company:</strong> {companyName}</div>
        {meta}
      </div>

      {children}

      <div style={{ marginTop: 28, display: "flex", fontSize: 9, color: "#444", borderTop: "1px solid #999" }}>
        <div style={{ flex: 1, padding: "4px 8px", borderRight: "1px solid #999" }}>
          Nigerian Content Development and Monitoring Board (NCDMB)
        </div>
        <div style={{ padding: "4px 8px", borderRight: "1px solid #999" }}>Version 1.0</div>
        <div style={{ flex: 1, padding: "4px 8px", textAlign: "right" }}>{docLabel}</div>
      </div>
    </div>
  );
}

function DeadlineBadge({ days }) {
  let color = "#8D97A3", label = `${days} days`;
  if (days < 0) { color = "#D9534F"; label = `${Math.abs(days)} days overdue`; }
  else if (days <= 14) { color = "#D9534F"; label = `${days} days left`; }
  else if (days <= 30) { color = "#E6A23C"; label = `${days} days left`; }
  else { color = "#4FAE7E"; label = `${days} days left`; }
  return (
    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color,
      border: `1px solid ${color}`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

const FREQ_LABELS = {
  "quarterly-30days": "Quarterly", "annual-60days": "Annually",
  "quarterly": "Quarterly", "biannual": "Bi-annually", "annual": "Annually",
  "per-expatriate": "Per expatriate",
};

function ComplianceCalendar() {
  const now = new Date();
  const rows = STATUTORY_REPORTS.map((r) => {
    let deadline = null;
    if (r.freq === "quarterly-30days") deadline = nextQuarterly30DayDeadline(new Date(now));
    if (r.freq === "annual-60days") deadline = nextAnnual60DayDeadline(new Date(now));
    return { ...r, deadline };
  }).sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline - b.deadline;
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });

  return (
    <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
            {["Sec.", "Report", "Frequency", "Next deadline", ""].map((h) => (
              <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
              <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>§{r.section}</td>
              <td style={{ padding: "10px 14px" }}>
                {r.name}
                {r.detail && <div style={{ fontSize: 11, color: "#5B6470", marginTop: 2 }}>{r.detail}</div>}
              </td>
              <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>{FREQ_LABELS[r.freq]}</td>
              <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>
                {r.deadline ? r.deadline.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </td>
              <td style={{ padding: "10px 14px" }}>
                {r.deadline && <DeadlineBadge days={daysUntil(new Date(r.deadline), new Date())} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuarterlyReportsView({ data, setData }) {
  const contracts = data.contracts || [];
  const marineServices = data.marineServices || [];
  const [tab, setTab] = useState("calendar");
  const [regAddress, setRegAddress] = useState(data.registeredAddress || "");
  const [form, setForm] = useState({
    description: "", contractor: "", category: CONTRACT_CATEGORIES[0], nature: CONTRACT_NATURE[0],
    estimatedValueUsd: "", status: CONTRACT_STATUSES[0], quarter: getQuarterOptions()[0].id,
    tenderNumber: "", ittIssuance: "", ittClosure: "", awardDate: "", remarks: "",
  });
  const [marineForm, setMarineForm] = useState({
    contractorName: "", address: "", contactPhone: "", contactEmail: "", nimasaOwnerCert: "", categorizationStatus: "",
    vesselName: "", vesselType: "", imoNo: "", nimasaVesselCert: "", flagging: "",
    projectName: "", typeOfService: "", projectLocation: "", contractStart: "", contractEnd: "",
    spendIncountry: "", spendOutcountry: "", nigerianPob: "", expatriatePob: "",
    quarter: getQuarterOptions()[0].id,
  });
  const [reportQuarter, setReportQuarter] = useState(getQuarterOptions()[0].id);
  const [reportType, setReportType] = useState("forecast");

  const addContract = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    const row = { id: Date.now().toString(36), ...form, estimatedValueUsd: Number(form.estimatedValueUsd || 0) };
    await setData({ ...data, contracts: [row, ...contracts] });
    setForm({ ...form, description: "", contractor: "", estimatedValueUsd: "", tenderNumber: "",
      ittIssuance: "", ittClosure: "", awardDate: "", remarks: "" });
  };
  const removeContract = async (id) => {
    await setData({ ...data, contracts: contracts.filter((c) => c.id !== id) });
  };

  const addMarine = async (e) => {
    e.preventDefault();
    if (!marineForm.vesselName.trim()) return;
    const row = { id: Date.now().toString(36), ...marineForm,
      spendIncountry: Number(marineForm.spendIncountry || 0), spendOutcountry: Number(marineForm.spendOutcountry || 0),
      nigerianPob: Number(marineForm.nigerianPob || 0), expatriatePob: Number(marineForm.expatriatePob || 0) };
    await setData({ ...data, marineServices: [row, ...marineServices] });
    setMarineForm({ ...marineForm, vesselName: "", contractorName: "", projectName: "",
      spendIncountry: "", spendOutcountry: "", nigerianPob: "", expatriatePob: "" });
  };
  const removeMarine = async (id) => {
    await setData({ ...data, marineServices: marineServices.filter((m) => m.id !== id) });
  };

  const quarters = getQuarterOptions();
  const selectedQuarter = quarters.find((q) => q.id === reportQuarter) || quarters[0];
  const inQuarter = contracts.filter((c) => c.quarter === reportQuarter);
  const marineInQuarter = marineServices.filter((m) => m.quarter === reportQuarter);
  const forecastRows = inQuarter.filter((c) => c.estimatedValueUsd >= JOB_FORECAST_THRESHOLD_USD);
  const procurementMaterialsRows = inQuarter.filter((c) => c.estimatedValueUsd < JOB_FORECAST_THRESHOLD_USD && c.nature === "Materials");
  const procurementServicesRows = inQuarter.filter((c) => c.estimatedValueUsd < JOB_FORECAST_THRESHOLD_USD && c.nature === "Services");
  const REPORT_TYPES = {
    forecast: { label: "Job Forecast Report (§18) — ≥ $1,000,000", section: "18", rows: forecastRows,
      title: "JOB FORECAST\n($1 Million and above)",
      headers: ["S/N", "Description of Service/Item", "Tender No.", "Est. Cost/Value", "ITT Issuance", "ITT Closure", "Award Date", "Remarks"],
      rowsFn: (r, i) => [i + 1, r.description, r.tenderNumber || "—", "$" + Number(r.estimatedValueUsd).toLocaleString(),
        r.ittIssuance || "—", r.ittClosure || "—", r.awardDate || "—", r.remarks || "—"] },
    procMaterials: { label: "Procurement Report — Materials (§24) — below $1,000,000", section: "24", rows: procurementMaterialsRows,
      title: "QUARTERLY PROCUREMENT REPORTING TEMPLATE (MATERIALS)",
      headers: ["S/N", "Description", "Contractor", "Category", "Est. value (USD)", "Status"],
      rowsFn: (r, i) => [i + 1, r.description, r.contractor || "—", r.category, "$" + Number(r.estimatedValueUsd).toLocaleString(), r.status] },
    procServices: { label: "Procurement Report — Services (§24) — below $1,000,000", section: "24", rows: procurementServicesRows,
      title: "QUARTERLY PROCUREMENT REPORTING TEMPLATE (SERVICES)",
      headers: ["S/N", "Description", "Contractor", "Category", "Est. value (USD)", "Status"],
      rowsFn: (r, i) => [i + 1, r.description, r.contractor || "—", r.category, "$" + Number(r.estimatedValueUsd).toLocaleString(), r.status] },
    marine: { label: "Marine Services Utilization Report (§24)", section: "24", rows: marineInQuarter,
      title: "QUARTERLY MARINE VESSEL UTILIZATION REPORTING TEMPLATE",
      headers: ["S/N", "Vessel Name", "Vessel Type", "Contractor", "IMO No.", "Flagging", "Project Name", "Spend Incountry", "Spend Outcountry", "NG POB", "Exp. POB"],
      rowsFn: (r, i) => [i + 1, r.vesselName, r.vesselType || "—", r.contractorName || "—", r.imoNo || "—", r.flagging || "—",
        r.projectName || "—", "$" + Number(r.spendIncountry || 0).toLocaleString(), "$" + Number(r.spendOutcountry || 0).toLocaleString(),
        r.nigerianPob || 0, r.expatriatePob || 0] },
  };
  const activeReport = REPORT_TYPES[reportType];
  const today = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

  const tabs = [
    { id: "calendar", label: "Compliance calendar", icon: CalendarClock },
    { id: "register", label: "Contracts register", icon: ClipboardList },
    { id: "marine", label: "Marine services register", icon: Ship },
    { id: "report", label: "Generate report", icon: FileText },
  ];

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Quarterly compliance</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px" }}>
        Every statutory NCDMB deadline in one place, plus the Job Forecast (§18), Procurement (§24 —
        Materials & Services), and Marine Services Utilization (§24) report generators.
      </p>

      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {tabs.map((t) => (
          <NCPlanTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {tab === "calendar" && (
        <>
          <ComplianceCalendar />
          <div style={{ fontSize: 11, color: "#5B6470", marginTop: 14, maxWidth: 640 }}>
            Deadlines shown for §18, §24 (all three reports), and §60 are calculated directly from
            NCDMB's stated rules ("30 days before the first day of each quarter" and "within 60 days
            of the beginning of the year"). Bi-annual, annual, and per-expatriate items are shown by
            frequency only — confirm the exact date for those with NCDMB or your NOGIC JQS account.
          </div>
        </>
      )}

      {tab === "register" && (
        <>
          <form onSubmit={addContract} className="nc-form-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 140px 140px", gap: 10,
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: 16, marginBottom: 22, rowGap: 12,
          }}>
            <Field label="Description of service / item">
              <input style={inputStyle} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Supply of wellhead equipment" />
            </Field>
            <Field label="Contractor / vendor">
              <input style={inputStyle} value={form.contractor}
                onChange={(e) => setForm({ ...form, contractor: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Category">
              <select style={inputStyle} value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CONTRACT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Materials or services">
              <select style={inputStyle} value={form.nature}
                onChange={(e) => setForm({ ...form, nature: e.target.value })}>
                {CONTRACT_NATURE.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Tender number">
              <input style={inputStyle} value={form.tenderNumber}
                onChange={(e) => setForm({ ...form, tenderNumber: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Estimated cost / value (USD)">
              <input type="number" min="0" style={inputStyle} value={form.estimatedValueUsd}
                onChange={(e) => setForm({ ...form, estimatedValueUsd: e.target.value })} placeholder="0" />
            </Field>
            <Field label="ITT issuance date">
              <input type="date" style={inputStyle} value={form.ittIssuance}
                onChange={(e) => setForm({ ...form, ittIssuance: e.target.value })} />
            </Field>
            <Field label="ITT closure date">
              <input type="date" style={inputStyle} value={form.ittClosure}
                onChange={(e) => setForm({ ...form, ittClosure: e.target.value })} />
            </Field>
            <Field label="Award date">
              <input type="date" style={inputStyle} value={form.awardDate}
                onChange={(e) => setForm({ ...form, awardDate: e.target.value })} />
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Expected quarter">
              <select style={inputStyle} value={form.quarter}
                onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
                {quarters.map((q) => <option key={q.id} value={q.id}>{q.quarterLabel} ({q.rangeLabel})</option>)}
              </select>
            </Field>
            <Field label="Remarks">
              <input style={inputStyle} value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional" />
            </Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={btnPrimary}><Plus size={15} /> Add contract</button>
            </div>
          </form>

          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
                  {["Description", "Contractor", "Category", "Nature", "Value (USD)", "Status", "Quarter", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>
                    No contracts logged yet.
                  </td></tr>
                )}
                {contracts.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                    <td style={{ padding: "10px 14px" }}>{c.description}</td>
                    <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{c.contractor || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{c.category}</td>
                    <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{c.nature || "—"}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace" }}>
                      ${Number(c.estimatedValueUsd).toLocaleString()}
                      {c.estimatedValueUsd >= JOB_FORECAST_THRESHOLD_USD
                        ? <span style={{ color: "#E6A23C", fontSize: 11 }}> · Job Forecast</span>
                        : <span style={{ color: "#7FC4D6", fontSize: 11 }}> · Procurement</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>{c.status}</td>
                    <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>
                      {quarters.find((q) => q.id === c.quarter)?.quarterLabel || c.quarter}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => removeContract(c.id)} style={{
                        background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "marine" && (
        <>
          <form onSubmit={addMarine} style={{
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: 16, marginBottom: 22, display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Vessel contractor</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <Field label="Contractor name">
                  <input style={inputStyle} value={marineForm.contractorName}
                    onChange={(e) => setMarineForm({ ...marineForm, contractorName: e.target.value })} />
                </Field>
                <Field label="Address">
                  <input style={inputStyle} value={marineForm.address}
                    onChange={(e) => setMarineForm({ ...marineForm, address: e.target.value })} />
                </Field>
                <Field label="Contact phone no.">
                  <input style={inputStyle} value={marineForm.contactPhone}
                    onChange={(e) => setMarineForm({ ...marineForm, contactPhone: e.target.value })} />
                </Field>
                <Field label="Contact email">
                  <input style={inputStyle} value={marineForm.contactEmail}
                    onChange={(e) => setMarineForm({ ...marineForm, contactEmail: e.target.value })} />
                </Field>
                <Field label="NIMASA owner registration cert. no.">
                  <input style={inputStyle} value={marineForm.nimasaOwnerCert}
                    onChange={(e) => setMarineForm({ ...marineForm, nimasaOwnerCert: e.target.value })} />
                </Field>
                <Field label="Categorization status">
                  <input style={inputStyle} value={marineForm.categorizationStatus}
                    onChange={(e) => setMarineForm({ ...marineForm, categorizationStatus: e.target.value })} placeholder="e.g. Nigerian-owned" />
                </Field>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Vessel details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
                <Field label="Vessel name">
                  <input style={inputStyle} value={marineForm.vesselName}
                    onChange={(e) => setMarineForm({ ...marineForm, vesselName: e.target.value })} placeholder="e.g. MV Bonny Star" />
                </Field>
                <Field label="Vessel type">
                  <input style={inputStyle} value={marineForm.vesselType}
                    onChange={(e) => setMarineForm({ ...marineForm, vesselType: e.target.value })} placeholder="e.g. Supply vessel" />
                </Field>
                <Field label="IMO no.">
                  <input style={inputStyle} value={marineForm.imoNo}
                    onChange={(e) => setMarineForm({ ...marineForm, imoNo: e.target.value })} />
                </Field>
                <Field label="NIMASA vessel registration cert. no.">
                  <input style={inputStyle} value={marineForm.nimasaVesselCert}
                    onChange={(e) => setMarineForm({ ...marineForm, nimasaVesselCert: e.target.value })} />
                </Field>
                <Field label="Flagging">
                  <input style={inputStyle} value={marineForm.flagging}
                    onChange={(e) => setMarineForm({ ...marineForm, flagging: e.target.value })} />
                </Field>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Project details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 130px 130px", gap: 10 }}>
                <Field label="Project name">
                  <input style={inputStyle} value={marineForm.projectName}
                    onChange={(e) => setMarineForm({ ...marineForm, projectName: e.target.value })} />
                </Field>
                <Field label="Type of service">
                  <input style={inputStyle} value={marineForm.typeOfService}
                    onChange={(e) => setMarineForm({ ...marineForm, typeOfService: e.target.value })} />
                </Field>
                <Field label="Project location">
                  <input style={inputStyle} value={marineForm.projectLocation}
                    onChange={(e) => setMarineForm({ ...marineForm, projectLocation: e.target.value })} />
                </Field>
                <Field label="Contract start date">
                  <input type="date" style={inputStyle} value={marineForm.contractStart}
                    onChange={(e) => setMarineForm({ ...marineForm, contractStart: e.target.value })} />
                </Field>
                <Field label="Contract end date">
                  <input type="date" style={inputStyle} value={marineForm.contractEnd}
                    onChange={(e) => setMarineForm({ ...marineForm, contractEnd: e.target.value })} />
                </Field>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Spend & personnel onboard (POB)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 100px 140px", gap: 10 }}>
                <Field label="Spend incountry (USD)">
                  <input type="number" min="0" style={inputStyle} value={marineForm.spendIncountry}
                    onChange={(e) => setMarineForm({ ...marineForm, spendIncountry: e.target.value })} />
                </Field>
                <Field label="Spend outcountry (USD)">
                  <input type="number" min="0" style={inputStyle} value={marineForm.spendOutcountry}
                    onChange={(e) => setMarineForm({ ...marineForm, spendOutcountry: e.target.value })} />
                </Field>
                <Field label="Nigerian POB">
                  <input type="number" min="0" style={inputStyle} value={marineForm.nigerianPob}
                    onChange={(e) => setMarineForm({ ...marineForm, nigerianPob: e.target.value })} />
                </Field>
                <Field label="Expatriate POB">
                  <input type="number" min="0" style={inputStyle} value={marineForm.expatriatePob}
                    onChange={(e) => setMarineForm({ ...marineForm, expatriatePob: e.target.value })} />
                </Field>
                <Field label="Quarter">
                  <select style={inputStyle} value={marineForm.quarter}
                    onChange={(e) => setMarineForm({ ...marineForm, quarter: e.target.value })}>
                    {quarters.map((q) => <option key={q.id} value={q.id}>{q.quarterLabel} ({q.rangeLabel})</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={btnPrimary}><Plus size={15} /> Add vessel record</button>
            </div>
          </form>

          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
                  {["Vessel", "Type", "Contractor", "Total contract value", "POB (NG/Exp)", "Quarter", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marineServices.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>
                    No vessel utilization logged yet.
                  </td></tr>
                )}
                {marineServices.map((m) => (
                  <tr key={m.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                    <td style={{ padding: "10px 14px" }}>{m.vesselName}</td>
                    <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{m.vesselType || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{m.contractorName || "—"}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace" }}>
                      ${(Number(m.spendIncountry || 0) + Number(m.spendOutcountry || 0)).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace", color: "#8D97A3" }}>
                      {m.nigerianPob || 0} / {m.expatriatePob || 0}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>
                      {quarters.find((q) => q.id === m.quarter)?.quarterLabel || m.quarter}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => removeMarine(m.id)} style={{
                        background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "report" && (
        <>
          <div className="no-print" style={{ display: "flex", gap: 12, alignItems: "end",
            marginBottom: 20, flexWrap: "wrap" }}>
            <Field label="Quarter">
              <select style={inputStyle} value={reportQuarter} onChange={(e) => setReportQuarter(e.target.value)}>
                {quarters.map((q) => <option key={q.id} value={q.id}>{q.quarterLabel} ({q.rangeLabel})</option>)}
              </select>
            </Field>
            <Field label="Report type">
              <select style={inputStyle} value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {Object.entries(REPORT_TYPES).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
              </select>
            </Field>
            <button onClick={() => window.print()} style={btnPrimary}>
              <FileText size={14} /> Print / save as PDF
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }} className="no-print">
            <span style={{ fontSize: 12, color: "#8D97A3" }}>Submission deadline for {selectedQuarter.quarterLabel}:</span>
            <DeadlineBadge days={daysUntil(new Date(selectedQuarter.deadline), new Date())} />
            <span style={{ fontSize: 12, color: "#5B6470" }}>({selectedQuarter.deadlineLabel})</span>
          </div>

          <NCDMBDocShell
            title={activeReport.title}
            companyName={data.name}
            meta={<>
              <div><strong>Period of Submission:</strong> {selectedQuarter.quarterLabel} ({selectedQuarter.rangeLabel})</div>
            </>}
            docLabel={`${activeReport.label.split(" — ")[0]} · generated ${today}`}
          >
            {activeReport.rows.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 12, border: "1px dashed #ccc" }}>
                No entries logged for this quarter yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {activeReport.headers.map((h) => (
                      <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1",
                        textAlign: "left", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeReport.rows.map((r, i) => (
                    <tr key={i}>
                      {activeReport.rowsFn(r, i).map((cell, ci) => (
                        <td key={ci} style={{ border: "1px solid #999", padding: "6px 8px" }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </NCDMBDocShell>
        </>
      )}
    </div>
  );
}

// Section 104 of the NOGICD Act: 1% of the value of every upstream contract
// goes to the Nigeria Content Development Fund. A valid NCFCC (NCDF
// Compliance Certificate) is now a precondition for NCDMB approvals,
// certifications, and clearances (including the NCEC).
function NCDFView({ data, setData }) {
  const ncdf = data.ncdf || { remittances: [], certificate: {} };
  const [form, setForm] = useState({
    contractDescription: "", contractValueUsd: "", amountRemitted: "", date: new Date().toISOString().slice(0, 10),
    reference: "",
  });
  const [cert, setCert] = useState({
    certificateNumber: ncdf.certificate?.certificateNumber || "",
    issueDate: ncdf.certificate?.issueDate || "",
    expiryDate: ncdf.certificate?.expiryDate || "",
  });

  const addRemittance = async (e) => {
    e.preventDefault();
    if (!form.contractDescription.trim()) return;
    const row = { id: Date.now().toString(36), ...form,
      contractValueUsd: Number(form.contractValueUsd || 0), amountRemitted: Number(form.amountRemitted || 0) };
    await setData({ ...data, ncdf: { ...ncdf, remittances: [row, ...ncdf.remittances] } });
    setForm({ ...form, contractDescription: "", contractValueUsd: "", amountRemitted: "", reference: "" });
  };
  const removeRemittance = async (id) => {
    await setData({ ...data, ncdf: { ...ncdf, remittances: ncdf.remittances.filter((r) => r.id !== id) } });
  };
  const saveCert = async () => {
    await setData({ ...data, ncdf: { ...ncdf, certificate: cert } });
  };

  const expiry = cert.expiryDate ? new Date(cert.expiryDate + "T00:00:00") : null;
  const expiryDays = expiry ? daysUntil(new Date(expiry), new Date()) : null;

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>NCDF & NCFCC</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px", maxWidth: 640 }}>
        Track the mandatory 1% Nigeria Content Development Fund levy on upstream contracts (§104), and
        your Compliance Certificate — now a precondition for NCDMB approvals, certifications, and clearances.
      </p>

      <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
        padding: 20, marginBottom: 22, maxWidth: 620 }}>
        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, color: "#EDEFF2",
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>NCFCC status</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Certificate number">
            <input style={inputStyle} value={cert.certificateNumber}
              onChange={(e) => setCert({ ...cert, certificateNumber: e.target.value })} onBlur={saveCert} />
          </Field>
          <Field label="Issue date">
            <input type="date" style={inputStyle} value={cert.issueDate}
              onChange={(e) => setCert({ ...cert, issueDate: e.target.value })} onBlur={saveCert} />
          </Field>
          <Field label="Expiry date">
            <input type="date" style={inputStyle} value={cert.expiryDate}
              onChange={(e) => setCert({ ...cert, expiryDate: e.target.value })} onBlur={saveCert} />
          </Field>
        </div>
        {expiryDays !== null && <DeadlineBadge days={expiryDays} />}
        {expiryDays === null && (
          <div style={{ fontSize: 12, color: "#5B6470" }}>Enter your certificate's expiry date to track it here.</div>
        )}
      </div>

      <form onSubmit={addRemittance} className="nc-form-grid" style={{
        display: "grid", gridTemplateColumns: "1fr 150px 150px 1fr 130px", gap: 10,
        background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 22, rowGap: 12,
      }}>
        <Field label="Contract description">
          <input style={inputStyle} value={form.contractDescription}
            onChange={(e) => setForm({ ...form, contractDescription: e.target.value })} />
        </Field>
        <Field label="Contract value (USD)">
          <input type="number" min="0" style={inputStyle} value={form.contractValueUsd}
            onChange={(e) => setForm({ ...form, contractValueUsd: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Amount remitted (USD)">
          <input type="number" min="0" style={inputStyle} value={form.amountRemitted}
            onChange={(e) => setForm({ ...form, amountRemitted: e.target.value })}
            placeholder={form.contractValueUsd ? (Number(form.contractValueUsd) * 0.01).toLocaleString() : "0"} />
        </Field>
        <Field label="Payment reference">
          <input style={inputStyle} value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Date">
          <input type="date" style={inputStyle} value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" style={btnPrimary}><Plus size={15} /> Log remittance</button>
        </div>
      </form>

      <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
              {["Contract", "Contract value", "1% due", "Remitted", "Status", "Reference", "Date", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ncdf.remittances.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>
                No remittances logged yet.
              </td></tr>
            )}
            {ncdf.remittances.map((r) => {
              const due = r.contractValueUsd * 0.01;
              const short = r.amountRemitted < due;
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                  <td style={{ padding: "10px 14px" }}>{r.contractDescription}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace" }}>
                    ${Number(r.contractValueUsd).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace", color: "#8D97A3" }}>
                    ${due.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace" }}>
                    ${Number(r.amountRemitted).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", color: short ? "#D9534F" : "#4FAE7E", whiteSpace: "nowrap" }}>
                    {short ? "Short-paid" : "Fully remitted"}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{r.reference || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>{r.date}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => removeRemittance(r.id)} style={{
                      background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Section 60: Project Progress Performance Report, due within 60 days of
// the start of the year. Pulls together the whole year's tracked figures.
function AnnualReportView({ data }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const inYear = (dateStr) => dateStr && Number(dateStr.slice(0, 4)) === year;

  const yearEntries = (data.entries || []).filter((e) => inYear(e.date));
  const { totals, local, foreign, total, pct } = calcTotals(yearEntries);
  const yearContracts = (data.contracts || []).filter((c) => (c.quarter || "").startsWith(String(year)));
  const forecastTotal = yearContracts.filter((c) => c.estimatedValueUsd >= JOB_FORECAST_THRESHOLD_USD)
    .reduce((s, c) => s + c.estimatedValueUsd, 0);
  const procurementTotal = yearContracts.filter((c) => c.estimatedValueUsd < JOB_FORECAST_THRESHOLD_USD)
    .reduce((s, c) => s + c.estimatedValueUsd, 0);
  const { totalCo2e } = calcCarbon((data.carbonEntries || []).filter((e) => inYear(e.date)));
  const expatPositions = data.expatPositions || [];
  const totalApproved = expatPositions.reduce((s, p) => s + Number(p.approvedSlots || 0), 0);
  const totalLocalised = expatPositions.reduce((s, p) => s + Number(p.nigerianUnderstudies || 0), 0);

  const deadline = nextAnnual60DayDeadline(new Date());
  const today = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Annual performance report</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px", maxWidth: 640 }}>
        Section 60 — Project Progress Performance Report, due within 60 days of the start of the year.
        Auto-compiled from everything tracked in the app for the selected year.
      </p>

      <div className="no-print" style={{ display: "flex", gap: 12, alignItems: "end", marginBottom: 16, flexWrap: "wrap" }}>
        <Field label="Reporting year">
          <select style={inputStyle} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <button onClick={() => window.print()} style={btnPrimary}>
          <FileText size={14} /> Print / save as PDF
        </button>
      </div>

      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: "#8D97A3" }}>Next §60 deadline:</span>
        <DeadlineBadge days={daysUntil(new Date(deadline), new Date())} />
        <span style={{ fontSize: 12, color: "#5B6470" }}>
          ({deadline.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })})
        </span>
      </div>

      <div id="printable" style={{ background: "#1A2028", border: "1px solid #2E3742",
        borderRadius: 10, padding: 32, maxWidth: 760 }}>
        <div style={{ borderBottom: "1px solid #2E3742", paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, color: "#EDEFF2",
            textTransform: "uppercase", letterSpacing: 1 }}>{data.name}</div>
          <div style={{ fontSize: 12, color: "#8D97A3", marginTop: 4 }}>
            Project Progress Performance Report — NOGICD Act §60 · {year} · generated {today}
          </div>
        </div>

        <PlanSectionTitle>1. Nigerian Content position</PlanSectionTitle>
        <PlanRow label="Nigerian Content achieved" value={`${pct.toFixed(1)}% (target ${data.target}%)`} />
        <PlanRow label="Local spend" value={fmtNaira(local)} />
        <PlanRow label="Foreign spend" value={fmtNaira(foreign)} last />

        <PlanSectionTitle>2. Spend by category</PlanSectionTitle>
        <PlanTable headers={["Category", "Amount"]}
          rows={CATS.map((c) => [c.label, fmtNaira(totals[c.id])])} />

        <PlanSectionTitle>3. Contracts, subcontracts & purchase orders</PlanSectionTitle>
        <PlanRow label="Job Forecast value (§18, ≥$1M)" value={"$" + forecastTotal.toLocaleString()} />
        <PlanRow label="Procurement value (§24, <$1M)" value={"$" + procurementTotal.toLocaleString()} />
        <PlanRow label="Total contracts logged for the year" value={String(yearContracts.length)} last />

        <PlanSectionTitle>4. Expatriate quota & localisation</PlanSectionTitle>
        <PlanRow label="Total approved expatriate slots" value={String(totalApproved)} />
        <PlanRow label="Nigerian understudies assigned" value={String(totalLocalised)}
          last />

        <PlanSectionTitle>5. Carbon intensity</PlanSectionTitle>
        <PlanRow label="Estimated total emissions"
          value={`${(totalCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t CO2e`} last />

        <div style={{ fontSize: 11, color: "#5B6470", marginTop: 20 }}>
          Prepared for internal review ahead of NCDMB submission. Cross-check against the current
          official §60 NC Performance Report template before formal submission.
        </div>
      </div>
    </div>
  );
}

// Sections 29, 33, 38/39, and 44/46: the remaining statutory obligations —
// Employment & Training, Research & Development, Technology Transfer,
// Legal/Insurance/Financial Services, and per-expatriate Succession Plans.
function OtherStatutoryView({ data, setData }) {
  const os = data.otherStatutory || {
    employmentTrainingPlan: "", trainingLog: [],
    rndPlan: "", rndLog: [],
    techTransferPlan: "", techTransferLog: [],
    legalServices: {}, insuranceServices: {}, financialServices: {},
    successionPlans: [],
  };
  const [tab, setTab] = useState("training");
  const patch = (p) => setData({ ...data, otherStatutory: { ...os, ...p } });

  const [trainingPlan, setTrainingPlan] = useState(os.employmentTrainingPlan);
  const [trainingForm, setTrainingForm] = useState({ program: "", participants: "", nigerianParticipants: "", date: "" });
  const addTraining = async (e) => {
    e.preventDefault();
    if (!trainingForm.program.trim()) return;
    const row = { id: Date.now().toString(36), ...trainingForm,
      participants: Number(trainingForm.participants || 0), nigerianParticipants: Number(trainingForm.nigerianParticipants || 0) };
    await patch({ trainingLog: [row, ...os.trainingLog] });
    setTrainingForm({ program: "", participants: "", nigerianParticipants: "", date: "" });
  };

  const [rndPlan, setRndPlan] = useState(os.rndPlan);
  const [rndForm, setRndForm] = useState({ initiative: "", budgetUsd: "", status: "Planned" });
  const addRnd = async (e) => {
    e.preventDefault();
    if (!rndForm.initiative.trim()) return;
    const row = { id: Date.now().toString(36), ...rndForm, budgetUsd: Number(rndForm.budgetUsd || 0) };
    await patch({ rndLog: [row, ...os.rndLog] });
    setRndForm({ initiative: "", budgetUsd: "", status: "Planned" });
  };

  const [techPlan, setTechPlan] = useState(os.techTransferPlan);
  const [techForm, setTechForm] = useState({ partner: "", technology: "", status: "In progress" });
  const addTech = async (e) => {
    e.preventDefault();
    if (!techForm.partner.trim()) return;
    const row = { id: Date.now().toString(36), ...techForm };
    await patch({ techTransferLog: [row, ...os.techTransferLog] });
    setTechForm({ partner: "", technology: "", status: "In progress" });
  };

  const [legal, setLegal] = useState(os.legalServices);
  const [insurance, setInsurance] = useState(os.insuranceServices);
  const [financial, setFinancial] = useState(os.financialServices);
  const saveServices = () => patch({ legalServices: legal, insuranceServices: insurance, financialServices: financial });

  const [succForm, setSuccForm] = useState({ expatRole: "", understudyName: "", targetDate: "", progressPct: "" });
  const addSuccession = async (e) => {
    e.preventDefault();
    if (!succForm.expatRole.trim()) return;
    const row = { id: Date.now().toString(36), ...succForm, progressPct: Number(succForm.progressPct || 0) };
    await patch({ successionPlans: [row, ...os.successionPlans] });
    setSuccForm({ expatRole: "", understudyName: "", targetDate: "", progressPct: "" });
  };
  const removeSuccession = async (id) => patch({ successionPlans: os.successionPlans.filter((s) => s.id !== id) });

  const tabs = [
    { id: "training", label: "Employment & training (§29)", icon: Users },
    { id: "rnd", label: "R&D (§38/39)", icon: TrendingUp },
    { id: "tech", label: "Technology transfer (§44/46)", icon: Package },
    { id: "services", label: "Legal / insurance / financial (§49/51/52)", icon: ShieldCheck },
    { id: "succession", label: "Succession plans (§33)", icon: ClipboardList },
  ];

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Other statutory reports</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px", maxWidth: 640 }}>
        The remaining NOGICD Act obligations beyond NC%, spend, and quarterly contracts — tracked here
        so nothing on NCDMB's statutory list is left unaccounted for.
      </p>

      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {tabs.map((t) => (
          <NCPlanTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {tab === "training" && (
        <>
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: 16, marginBottom: 20, maxWidth: 560 }}>
            <Field label="Employment & Training Plan (annual)">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={trainingPlan}
                onChange={(e) => setTrainingPlan(e.target.value)}
                onBlur={() => patch({ employmentTrainingPlan: trainingPlan })}
                placeholder="Summary of planned Nigerian employment and training initiatives for the year." />
            </Field>
          </div>
          <form onSubmit={addTraining} className="nc-form-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 150px 150px 150px", gap: 10,
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 20, rowGap: 12,
          }}>
            <Field label="Training program">
              <input style={inputStyle} value={trainingForm.program}
                onChange={(e) => setTrainingForm({ ...trainingForm, program: e.target.value })} />
            </Field>
            <Field label="Total participants">
              <input type="number" min="0" style={inputStyle} value={trainingForm.participants}
                onChange={(e) => setTrainingForm({ ...trainingForm, participants: e.target.value })} />
            </Field>
            <Field label="Nigerian participants">
              <input type="number" min="0" style={inputStyle} value={trainingForm.nigerianParticipants}
                onChange={(e) => setTrainingForm({ ...trainingForm, nigerianParticipants: e.target.value })} />
            </Field>
            <Field label="Date">
              <input type="date" style={inputStyle} value={trainingForm.date}
                onChange={(e) => setTrainingForm({ ...trainingForm, date: e.target.value })} />
            </Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={btnPrimary}><Plus size={15} /> Log training</button>
            </div>
          </form>
          <SimpleLogTable rows={os.trainingLog} empty="No training programs logged yet."
            headers={["Program", "Participants", "Nigerian", "Date"]}
            cells={(r) => [r.program, r.participants, r.nigerianParticipants, r.date]} />
        </>
      )}

      {tab === "rnd" && (
        <>
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: 16, marginBottom: 20, maxWidth: 560 }}>
            <Field label="R&D Plan">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={rndPlan}
                onChange={(e) => setRndPlan(e.target.value)} onBlur={() => patch({ rndPlan })}
                placeholder="Summary of research and development commitments." />
            </Field>
          </div>
          <form onSubmit={addRnd} className="nc-form-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 10,
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 20, rowGap: 12,
          }}>
            <Field label="Initiative">
              <input style={inputStyle} value={rndForm.initiative}
                onChange={(e) => setRndForm({ ...rndForm, initiative: e.target.value })} />
            </Field>
            <Field label="Budget (USD)">
              <input type="number" min="0" style={inputStyle} value={rndForm.budgetUsd}
                onChange={(e) => setRndForm({ ...rndForm, budgetUsd: e.target.value })} />
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={rndForm.status}
                onChange={(e) => setRndForm({ ...rndForm, status: e.target.value })}>
                {["Planned", "In progress", "Completed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={btnPrimary}><Plus size={15} /> Log initiative</button>
            </div>
          </form>
          <SimpleLogTable rows={os.rndLog} empty="No R&D initiatives logged yet."
            headers={["Initiative", "Budget (USD)", "Status"]}
            cells={(r) => [r.initiative, "$" + Number(r.budgetUsd).toLocaleString(), r.status]} />
        </>
      )}

      {tab === "tech" && (
        <>
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: 16, marginBottom: 20, maxWidth: 560 }}>
            <Field label="Technology Transfer Plan">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={techPlan}
                onChange={(e) => setTechPlan(e.target.value)} onBlur={() => patch({ techTransferPlan: techPlan })}
                placeholder="Summary of technology transfer arrangements." />
            </Field>
          </div>
          <form onSubmit={addTech} className="nc-form-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 150px", gap: 10,
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 20, rowGap: 12,
          }}>
            <Field label="Transfer partner">
              <input style={inputStyle} value={techForm.partner}
                onChange={(e) => setTechForm({ ...techForm, partner: e.target.value })} />
            </Field>
            <Field label="Technology / know-how">
              <input style={inputStyle} value={techForm.technology}
                onChange={(e) => setTechForm({ ...techForm, technology: e.target.value })} />
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={techForm.status}
                onChange={(e) => setTechForm({ ...techForm, status: e.target.value })}>
                {["In progress", "Completed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={btnPrimary}><Plus size={15} /> Log agreement</button>
            </div>
          </form>
          <SimpleLogTable rows={os.techTransferLog} empty="No technology transfer agreements logged yet."
            headers={["Partner", "Technology", "Status"]}
            cells={(r) => [r.partner, r.technology, r.status]} />
        </>
      )}

      {tab === "services" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16 }}>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, color: "#EDEFF2",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Legal services (§51)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nigerian law firm retained">
                <input style={inputStyle} value={legal.firm || ""}
                  onChange={(e) => setLegal({ ...legal, firm: e.target.value })} onBlur={saveServices} />
              </Field>
              <Field label="Notes">
                <input style={inputStyle} value={legal.notes || ""}
                  onChange={(e) => setLegal({ ...legal, notes: e.target.value })} onBlur={saveServices} />
              </Field>
            </div>
          </div>
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16 }}>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, color: "#EDEFF2",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Insurance services (§49)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nigerian insurer / broker used">
                <input style={inputStyle} value={insurance.provider || ""}
                  onChange={(e) => setInsurance({ ...insurance, provider: e.target.value })} onBlur={saveServices} />
              </Field>
              <Field label="Notes">
                <input style={inputStyle} value={insurance.notes || ""}
                  onChange={(e) => setInsurance({ ...insurance, notes: e.target.value })} onBlur={saveServices} />
              </Field>
            </div>
          </div>
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16 }}>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, color: "#EDEFF2",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Financial services (§52)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nigerian financial institution">
                <input style={inputStyle} value={financial.institution || ""}
                  onChange={(e) => setFinancial({ ...financial, institution: e.target.value })} onBlur={saveServices} />
              </Field>
              <Field label="% of Nigerian revenue retained locally">
                <input type="number" min="0" max="100" style={inputStyle} value={financial.revenueRetentionPct || ""}
                  onChange={(e) => setFinancial({ ...financial, revenueRetentionPct: e.target.value })} onBlur={saveServices}
                  placeholder="Minimum 10% required" />
              </Field>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#5B6470" }}>
            These three are submitted bi-annually. NCDMB's page doesn't state the exact within-period
            due date, so confirm the current cut-off with NCDMB or your NOGIC JQS account.
          </div>
        </div>
      )}

      {tab === "succession" && (
        <>
          <form onSubmit={addSuccession} className="nc-form-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 150px 130px", gap: 10,
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 20, rowGap: 12,
          }}>
            <Field label="Expatriate role / position">
              <input style={inputStyle} value={succForm.expatRole}
                onChange={(e) => setSuccForm({ ...succForm, expatRole: e.target.value })}
                placeholder="e.g. Drilling Engineer" />
            </Field>
            <Field label="Nigerian understudy name">
              <input style={inputStyle} value={succForm.understudyName}
                onChange={(e) => setSuccForm({ ...succForm, understudyName: e.target.value })} />
            </Field>
            <Field label="Target handover date">
              <input type="date" style={inputStyle} value={succForm.targetDate}
                onChange={(e) => setSuccForm({ ...succForm, targetDate: e.target.value })} />
            </Field>
            <Field label="Progress %">
              <input type="number" min="0" max="100" style={inputStyle} value={succForm.progressPct}
                onChange={(e) => setSuccForm({ ...succForm, progressPct: e.target.value })} />
            </Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={btnPrimary}><Plus size={15} /> Add succession plan</button>
            </div>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {os.successionPlans.length === 0 && (
              <div style={{ color: "#5B6470", fontSize: 13, padding: 10 }}>No succession plans logged yet.</div>
            )}
            {os.successionPlans.map((s) => (
              <div key={s.id} style={{ background: "#1A2028", border: "1px solid #2E3742",
                borderRadius: 10, padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#EDEFF2", fontSize: 14, marginBottom: 6 }}>
                    {s.expatRole} → {s.understudyName || "understudy not yet named"}
                  </div>
                  <div style={{ height: 6, background: "#0F1216", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, s.progressPct)}%`, height: "100%", background: "#E6A23C" }} />
                  </div>
                </div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: "#8D97A3", whiteSpace: "nowrap" }}>
                  {s.progressPct}% · target {s.targetDate || "—"}
                </div>
                <button onClick={() => removeSuccession(s.id)} style={{
                  background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SimpleLogTable({ rows, headers, cells, empty }) {
  return (
    <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
            {[...headers, ""].map((h) => (
              <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length + 1} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>{empty}</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
              {cells(r).map((c, i) => <td key={i} style={{ padding: "10px 14px" }}>{c || "—"}</td>)}
              <td style={{ padding: "10px 14px" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function calcCarbon(carbonEntries) {
  const totals = {};
  FUEL_TYPES.forEach((f) => (totals[f.id] = { quantity: 0, co2e: 0 }));
  (carbonEntries || []).forEach((e) => {
    const fuel = FUEL_TYPES.find((f) => f.id === e.fuelType);
    if (!fuel) return;
    totals[fuel.id].quantity += Number(e.quantity || 0);
    totals[fuel.id].co2e += Number(e.quantity || 0) * fuel.factor;
  });
  const totalCo2e = Object.values(totals).reduce((s, t) => s + t.co2e, 0);
  return { totals, totalCo2e };
}

function CarbonView({ data, setData }) {
  const carbonEntries = data.carbonEntries || [];
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), fuelType: FUEL_TYPES[0].id,
    project: "", quantity: "", addedBy: "",
  });
  const { totals, totalCo2e } = calcCarbon(carbonEntries);

  const addEntry = async (e) => {
    e.preventDefault();
    if (!form.quantity || Number(form.quantity) <= 0) return;
    const entry = { id: Date.now().toString(36), ...form, quantity: Number(form.quantity) };
    await setData({ ...data, carbonEntries: [entry, ...carbonEntries] });
    setForm({ ...form, quantity: "" });
  };

  const removeEntry = async (id) => {
    await setData({ ...data, carbonEntries: carbonEntries.filter((e) => e.id !== id) });
  };

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Carbon intensity</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px" }}>
        Track fuel, flaring, and electricity consumption by asset, converted to an estimated CO2e footprint.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
          padding: "16px 20px", minWidth: 220 }}>
          <div style={{ fontSize: 11, color: "#8D97A3", marginBottom: 6 }}>ESTIMATED TOTAL EMISSIONS</div>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 22, fontWeight: 700, color: "#4FAE7E" }}>
            {(totalCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t CO2e
          </div>
        </div>
        {FUEL_TYPES.map((f) => (
          <div key={f.id} style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: "16px 20px", minWidth: 170 }}>
            <div style={{ fontSize: 11, color: "#8D97A3", marginBottom: 6 }}>{f.label.toUpperCase()}</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 15, color: "#EDEFF2" }}>
              {totals[f.id].quantity.toLocaleString()} {f.unit}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addEntry} className="nc-form-grid" style={{
        display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 10,
        background: "#1A2028", border: "1px solid #2E3742",
        borderRadius: 10, padding: 16, marginBottom: 22, rowGap: 12,
      }}>
        <Field label="Date">
          <input type="date" style={inputStyle} value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Fuel / energy type">
          <select style={inputStyle} value={form.fuelType}
            onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
            {FUEL_TYPES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="Asset / project">
          <input style={inputStyle} value={form.project}
            onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Bonga North" />
        </Field>
        <Field label={`Quantity (${FUEL_TYPES.find((f) => f.id === form.fuelType)?.unit || ""})`}>
          <input type="number" min="0" style={inputStyle} value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Logged by">
          <input style={inputStyle} value={form.addedBy}
            onChange={(e) => setForm({ ...form, addedBy: e.target.value })} placeholder="Your name" />
        </Field>
        <div style={{ display: "flex", alignItems: "end" }}>
          <button type="submit" style={btnPrimary}><Plus size={15} /> Add entry</button>
        </div>
      </form>

      <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
              {["Date", "Type", "Asset", "Quantity", "Est. CO2e", "Logged by", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carbonEntries.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>
                No entries yet. Log fuel, flaring, or electricity use above.
              </td></tr>
            )}
            {carbonEntries.map((e) => {
              const fuel = FUEL_TYPES.find((f) => f.id === e.fuelType);
              const co2e = Number(e.quantity || 0) * (fuel?.factor || 0);
              return (
                <tr key={e.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                  <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>{e.date}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{fuel?.label}</td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.project || "—"}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace" }}>
                    {Number(e.quantity).toLocaleString()} {fuel?.unit}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace", color: "#4FAE7E" }}>
                    {co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                  </td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.addedBy || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => removeEntry(e.id)} style={{
                      background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "#5B6470", marginTop: 10 }}>
        Emission factors used are indicative industry defaults for internal tracking only. Validate against
        NUPRC/NCDMB-approved methodology before external or regulatory reporting.
      </div>
    </div>
  );
}

function toCsv(entries) {
  const header = ["Date", "Category", "Project", "Vendor", "Amount (NGN)", "Logged by", "Note"];
  const rows = entries.map((e) => {
    const cat = CATS.find((c) => c.id === e.category);
    return [e.date, cat?.label || e.category, e.project || "", e.vendor || "", e.amount, e.addedBy || "", e.note || ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

function downloadCsv(entries, companyName) {
  const csv = toCsv(entries);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(companyName)}-nc-spend-log.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReportView({ data }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = data.entries.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
  const { totals, local, foreign, total, pct } = calcTotals(filtered);
  const today = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
          fontSize: 20, color: "#EDEFF2", margin: 0 }}>Compliance report</h1>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          <button onClick={() => downloadCsv(filtered, data.name)} style={btnGhost}>
            <ClipboardList size={14} /> Export CSV
          </button>
          <button onClick={() => window.print()} style={btnGhost}>
            <FileText size={14} /> Print / save as PDF
          </button>
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", gap: 12, alignItems: "end", marginBottom: 20 }}>
        <Field label="Period from">
          <input type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Period to">
          <input type="date" style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo(""); }} style={btnGhost}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <div id="printable" style={{ background: "#1A2028", border: "1px solid #2E3742",
        borderRadius: 10, padding: 32, maxWidth: 640 }}>
        <div style={{ borderBottom: "1px solid #2E3742", paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, color: "#EDEFF2",
            textTransform: "uppercase", letterSpacing: 1 }}>{data.name}</div>
          <div style={{ fontSize: 12, color: "#8D97A3", marginTop: 4 }}>
            Nigerian Content summary — generated {today}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "#8D97A3" }}>Nigerian Content</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 26, color: "#EDEFF2" }}>
              {pct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8D97A3" }}>Target</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 26, color: "#8D97A3" }}>
              {data.target}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8D97A3" }}>Status</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 26,
              color: pct >= data.target ? "#4FAE7E" : "#D9534F" }}>
              {pct >= data.target ? "On target" : "Below target"}
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
          <thead>
            <tr style={{ color: "#8D97A3", textAlign: "left" }}>
              <th style={{ padding: "6px 0", fontWeight: 500 }}>Category</th>
              <th style={{ padding: "6px 0", fontWeight: 500, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {CATS.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                <td style={{ padding: "8px 0" }}>{c.label}</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                  {fmtNaira(totals[c.id])}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2", fontWeight: 600 }}>
              <td style={{ padding: "8px 0" }}>Total</td>
              <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                {fmtNaira(total)}
              </td>
            </tr>
          </tbody>
        </table>

        {filtered.length > 0 && (
          <>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 14, color: "#EDEFF2",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Entry detail</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 24 }}>
              <thead>
                <tr style={{ color: "#8D97A3", textAlign: "left" }}>
                  <th style={{ padding: "6px 0", fontWeight: 500 }}>Date</th>
                  <th style={{ padding: "6px 0", fontWeight: 500 }}>Category</th>
                  <th style={{ padding: "6px 0", fontWeight: 500 }}>Vendor</th>
                  <th style={{ padding: "6px 0", fontWeight: 500 }}>Note</th>
                  <th style={{ padding: "6px 0", fontWeight: 500, textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const cat = CATS.find((c) => c.id === e.category);
                  return (
                    <tr key={e.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                      <td style={{ padding: "6px 0" }}>{e.date}</td>
                      <td style={{ padding: "6px 0" }}>{cat?.label}</td>
                      <td style={{ padding: "6px 0" }}>{e.vendor || "—"}</td>
                      <td style={{ padding: "6px 0" }}>{e.note || "—"}</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                        {fmtNaira(e.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <div style={{ fontSize: 11, color: "#5B6470", marginBottom: 24 }}>
          Local spend {fmtNaira(local)} · Foreign spend {fmtNaira(foreign)} · {filtered.length} entries
          {(from || to) ? " in selected period" : " logged"}.
          NC percentage is a simplified local-vs-foreign spend ratio for internal tracking purposes and should be
          reconciled against the official NCDMB Nigerian Content formula before formal submission.
        </div>

        {(data.expatPositions || []).length > 0 && (
          <>
            <div style={{ borderTop: "1px solid #2E3742", paddingTop: 16, marginBottom: 12 }}>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 14, color: "#EDEFF2",
                textTransform: "uppercase", letterSpacing: 1 }}>Expatriate quota</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
              <thead>
                <tr style={{ color: "#8D97A3", textAlign: "left" }}>
                  <th style={{ padding: "6px 0", fontWeight: 500 }}>Position</th>
                  <th style={{ padding: "6px 0", fontWeight: 500, textAlign: "right" }}>Approved</th>
                  <th style={{ padding: "6px 0", fontWeight: 500, textAlign: "right" }}>Localised</th>
                </tr>
              </thead>
              <tbody>
                {data.expatPositions.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                    <td style={{ padding: "8px 0" }}>{p.role}</td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                      {p.approvedSlots}
                    </td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                      {p.nigerianUnderstudies} / {p.approvedSlots}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {(data.carbonEntries || []).length > 0 && (() => {
          const { totals: cTotals, totalCo2e } = calcCarbon(data.carbonEntries);
          return (
            <>
              <div style={{ borderTop: "1px solid #2E3742", paddingTop: 16, marginBottom: 12 }}>
                <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 14, color: "#EDEFF2",
                  textTransform: "uppercase", letterSpacing: 1 }}>Carbon intensity</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#8D97A3" }}>Estimated total emissions</div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 20, color: "#4FAE7E" }}>
                  {(totalCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t CO2e
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                <thead>
                  <tr style={{ color: "#8D97A3", textAlign: "left" }}>
                    <th style={{ padding: "6px 0", fontWeight: 500 }}>Type</th>
                    <th style={{ padding: "6px 0", fontWeight: 500, textAlign: "right" }}>Quantity</th>
                    <th style={{ padding: "6px 0", fontWeight: 500, textAlign: "right" }}>Est. CO2e</th>
                  </tr>
                </thead>
                <tbody>
                  {FUEL_TYPES.map((f) => (
                    <tr key={f.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                      <td style={{ padding: "8px 0" }}>{f.label}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                        {cTotals[f.id].quantity.toLocaleString()} {f.unit}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                        {cTotals[f.id].co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: "#5B6470" }}>
                Emission factors are indicative industry defaults for internal tracking, not certified figures.
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

const SESSION_KEY = "nc_session";

export default function App() {
  const [session, setSessionState] = useState(() => {
    // Restore login across page refreshes/reopens, so refreshing the page
    // (or opening the app again later) doesn't force a re-login.
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const setSession = useCallback((next) => {
    setSessionState(next);
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      // ignore storage errors (e.g. private browsing)
    }
  }, []);

  const { data, setData, loading, reload } = useCompanyStorage(session);
  const [view, setView] = useState("dashboard");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useEffect(() => {
    document.title = "NC Compliance Report";
  }, []);

  if (!session) {
    return (
      <>
        <FontLoader />
        <LoginScreen onEnter={setSession} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <FontLoader />
        <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#12161B", color: "#8D97A3", fontFamily: "IBM Plex Sans, sans-serif" }}>
          Loading workspace…
        </div>
      </>
    );
  }

  return (
    <>
      <FontLoader />
      <style>{`
        @keyframes nc-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: #FFFFFF !important; }
          #printable {
            background: #FFFFFF !important;
            border: 1px solid #999999 !important;
            color: #000000 !important;
          }
          #printable * {
            color: #000000 !important;
            border-color: #999999 !important;
          }
        }
        @media (max-width: 720px) {
          .nc-layout { flex-direction: column !important; }
          .nc-sidebar {
            width: 100% !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            padding: 10px 8px !important;
            align-items: center !important;
            gap: 6px !important;
          }
          .nc-sidebar-header { padding: 0 8px 0 0 !important; flex-shrink: 0; }
          .nc-sidebar-nav-item {
            flex-shrink: 0;
            white-space: nowrap;
          }
          .nc-sidebar-spacer { display: none !important; }
          .nc-sidebar-logout { flex-shrink: 0; }
          .nc-main-content { padding: 16px !important; }
          .nc-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ display: "flex", minHeight: 560, background: "#12161B", borderRadius: 10, overflow: "hidden" }} className="nc-layout">
        <div className="no-print">
          <Sidebar view={view} setView={setView} company={data} onLogout={() => setSession(null)}
            onRefresh={handleRefresh} refreshing={refreshing} />
        </div>
        <div style={{ flex: 1, overflow: "auto" }} className="nc-main-content-wrap">
          {view === "dashboard" && <Dashboard data={data} setData={setData} />}
          {view === "ncplan" && <NCPlanView data={data} setData={setData} />}
          {view === "quarterly" && <QuarterlyReportsView data={data} setData={setData} />}
          {view === "ncdf" && <NCDFView data={data} setData={setData} />}
          {view === "annual" && <AnnualReportView data={data} />}
          {view === "other" && <OtherStatutoryView data={data} setData={setData} />}
          {view === "entries" && <EntriesView data={data} setData={setData} />}
          {view === "quota" && <QuotaView data={data} setData={setData} />}
          {view === "carbon" && <CarbonView data={data} setData={setData} />}
          {view === "report" && <ReportView data={data} />}
        </div>
      </div>
    </>
  );
}

function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);
  return null;
}
