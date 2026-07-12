import React, { useState, useEffect, useCallback } from "react";
import {
  Gauge, Plus, FileText, Users, LogOut, Building2, TrendingUp,
  Trash2, ChevronRight, ClipboardList, ShieldCheck, X, Loader2, Leaf
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

const fmtNaira = (n) =>
  "\u20A6" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// window.storage only exists inside Claude's artifact viewer. When this file
// runs anywhere else (VS Code / a local dev server / a deployed site), this
// fills in the same API using the browser's localStorage instead, so the
// app keeps working without any code changes.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(key);
      if (v === null) throw new Error(`key not found: ${key}`);
      return { key, value: v, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const keys = Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
}

function useCompanyStorage(companyId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await window.storage.get(`company:${companyId}`);
      setData(res ? JSON.parse(res.value) : null);
    } catch (e) {
      setData(null);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next) => {
    setData(next);
    try {
      await window.storage.set(`company:${companyId}`, JSON.stringify(next));
    } catch (e) {
      console.error("save failed", e);
    }
  }, [companyId]);

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
      let existing = null;
      try {
        const res = await window.storage.get(`company:${id}`);
        existing = res ? JSON.parse(res.value) : null;
      } catch (readErr) {
        existing = null;
      }

      if (existing) {
        if (existing.pin !== pin) {
          setError("That PIN doesn't match this company's records.");
          setBusy(false);
          return;
        }
        onEnter(id);
      } else {
        const fresh = {
          name: name.trim(), pin, target: 70, entries: [], expatPositions: [], carbonEntries: [],
          exchangeRate: 1600,
          createdAt: new Date().toISOString(),
        };
        await window.storage.set(`company:${id}`, JSON.stringify(fresh));
        onEnter(id);
      }
    } catch (e2) {
      setError("Couldn't reach storage: " + (e2 && e2.message ? e2.message : "unknown error") + ". Try again.");
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

function Sidebar({ view, setView, company, onLogout }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Gauge },
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
      <button onClick={onLogout} className="nc-sidebar-logout" style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        borderRadius: 6, border: "none", background: "transparent", color: "#5B6470",
        cursor: "pointer", fontSize: 13, fontFamily: "IBM Plex Sans, sans-serif",
      }}>
        <LogOut size={15} /> Switch company
      </button>
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

export default function App() {
  const [companyId, setCompanyId] = useState(null);
  const { data, setData, loading } = useCompanyStorage(companyId);
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    document.title = "NC Compliance Report";
  }, []);

  if (!companyId) {
    return (
      <>
        <FontLoader />
        <LoginScreen onEnter={setCompanyId} />
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
        @media print { .no-print { display: none !important; } }
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
          <Sidebar view={view} setView={setView} company={data} onLogout={() => setCompanyId(null)} />
        </div>
        <div style={{ flex: 1, overflow: "auto" }} className="nc-main-content-wrap">
          {view === "dashboard" && <Dashboard data={data} setData={setData} />}
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
