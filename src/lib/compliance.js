export const CATS = [
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
export const FUEL_TYPES = [
  { id: "diesel", label: "Diesel (generators, vehicles)", unit: "litres", factor: 2.68 },
  { id: "petrol", label: "Petrol / PMS", unit: "litres", factor: 2.31 },
  { id: "gasFlared", label: "Gas flared", unit: "scf", factor: 0.0549 },
  { id: "electricity", label: "Grid electricity", unit: "kWh", factor: 0.40 },
];

// Section 7 of the NOGICD Act / NCDMB's Nigerian Content Plan (NCP) template.
export const PROCUREMENT_CATEGORIES = [
  { id: "longLead", label: "Long-lead item" },
  { id: "bulk", label: "Bulk material" },
  { id: "exclusive", label: "Exclusive category (NCDMB-reserved for Nigerian companies)" },
];

export const AWARD_TYPES = [
  "Open competitive bidding", "Restricted / selective bidding", "Direct negotiation",
];

export const BID_PLATFORMS = ["NipeX", "Paper-based"];

export function blankNCPlan() {
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
export const CONTRACT_CATEGORIES = ["Contract", "Subcontract", "Purchase order"];

export const CONTRACT_NATURE = ["Materials", "Services"]; // splits §24 Procurement Report into its two official templates

export const CONTRACT_STATUSES = ["Planned / to be bid", "Bidding in progress", "Awarded", "Executed"];

export const JOB_FORECAST_THRESHOLD_USD = 1000000;

export function getQuarterOptions() {
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
export const STATUTORY_REPORTS = [
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
export function nextQuarterly30DayDeadline(from) {
  const quarters = getQuarterOptions();
  const upcoming = quarters.find((q) => q.deadline >= from) || quarters[0];
  return upcoming.deadline;
}

// Next occurrence of "within 60 days of the beginning of the year."
export function nextAnnual60DayDeadline(from) {
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

export function daysUntil(date, from) {
  return Math.ceil((date.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0)) / 86400000);
}

export const fmtNaira = (n) =>
  "\u20A6" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function calcTotals(entries) {
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
export function calcForecast(entries) {
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

// Matches the visual identity used across NCDMB's own reporting templates:
// circular logo slot (left empty per instruction — no third-party logo used),
// bold centered board name, a light-gray title band, and a three-part footer
// strip (board name | version/date | page label). Every generated report
// wraps its content in this so printouts look consistent with NCDMB's own
// paperwork.
export function calcCarbon(carbonEntries) {
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

export function toCsv(entries) {
  const header = ["Date", "Category", "Project", "Vendor", "Amount (NGN)", "Logged by", "Note"];
  const rows = entries.map((e) => {
    const cat = CATS.find((c) => c.id === e.category);
    return [e.date, cat?.label || e.category, e.project || "", e.vendor || "", e.amount, e.addedBy || "", e.note || ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(entries, companyName) {
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

export const FREQ_LABELS = {
  "quarterly-30days": "Quarterly", "annual-60days": "Annually",
  "quarterly": "Quarterly", "biannual": "Bi-annually", "annual": "Annually",
  "per-expatriate": "Per expatriate",
};
