// Turns a spreadsheet (Excel or CSV) into spend log entries: reads the rows,
// guesses which column is which, and cleans up amounts, dates and categories.
import { CATS } from "./compliance";

export const MAX_IMPORT_ROWS = 2000;

// The spend log fields a column can be matched to, with the header words
// people commonly use for each.
export const IMPORT_FIELDS = [
  { id: "date", label: "Date", words: ["date", "invoice date", "transaction date", "period"] },
  { id: "category", label: "Category", words: ["category", "type", "spend type", "class", "classification"] },
  { id: "project", label: "Contract / project", words: ["project", "contract", "contract ref", "po", "purchase order", "reference", "ref"] },
  { id: "vendor", label: "Vendor / contractor", words: ["vendor", "contractor", "supplier", "company", "payee"] },
  { id: "amount", label: "Amount", words: ["amount", "value", "cost", "total", "spend", "naira", "ngn", "usd"], required: true },
  { id: "currency", label: "Currency (NGN or USD)", words: ["currency", "ccy"] },
  { id: "note", label: "Note", words: ["note", "notes", "description", "details", "remark", "remarks", "comment"] },
  { id: "addedBy", label: "Logged by", words: ["logged by", "added by", "entered by", "prepared by", "by"] },
];

// Template columns, in the order the downloadable template uses.
export const TEMPLATE_HEADERS = ["Date", "Category", "Contract / project", "Vendor / contractor", "Amount", "Currency", "Note", "Logged by"];

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Minimal CSV reader: commas or semicolons, quoted fields, "" escapes.
export function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] || "";
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const isBlank = (row) => row.every((c) => c === null || c === undefined || String(c).trim() === "");

// Splits raw rows into a header row and data rows. The header is the first
// non-empty row; columns with no header get a "Column N" name.
export function splitHeader(rawRows) {
  const rows = rawRows.filter((r) => Array.isArray(r) && !isBlank(r));
  if (!rows.length) return { headers: [], rows: [] };
  const width = Math.max(...rows.map((r) => r.length));
  const headers = Array.from({ length: width }, (_, i) => {
    const h = rows[0][i];
    return h === null || h === undefined || String(h).trim() === "" ? `Column ${i + 1}` : String(h).trim();
  });
  return { headers, rows: rows.slice(1) };
}

// Best guess at which column feeds each field (column index, or -1).
export function guessMapping(headers) {
  const used = new Set();
  const map = {};
  // Exact matches first, then "header contains the word", so "Amount" beats "Amount note".
  for (const pass of ["exact", "contains"]) {
    for (const f of IMPORT_FIELDS) {
      if (map[f.id] !== undefined) continue;
      const idx = headers.findIndex((h, i) => {
        if (used.has(i)) return false;
        const n = norm(h);
        return f.words.some((w) => (pass === "exact" ? n === w : (` ${n} `).includes(` ${w} `)));
      });
      if (idx !== -1) { map[f.id] = idx; used.add(idx); }
    }
  }
  for (const f of IMPORT_FIELDS) if (map[f.id] === undefined) map[f.id] = -1;
  return map;
}

// "₦4,800,000", "4.8m", "(1,200)" → number, or null if it isn't one.
export function parseAmount(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/ngn|usd|naira|₦|\$|n(?=\d)|[\s,()]/g, "").replace(/^-/, "");
  const mult = s.endsWith("bn") ? 1e9 : s.endsWith("b") ? 1e9 : s.endsWith("m") ? 1e6 : s.endsWith("k") ? 1e3 : 1;
  s = s.replace(/(bn|b|m|k)$/, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s) * mult;
  return negative ? -n : n;
}

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Date cell → "YYYY-MM-DD". Accepts Date objects, Excel serial numbers,
// ISO dates and day-first dates (Nigerian style: 31/10/2026).
export function parseDate(v) {
  if (v instanceof Date && !isNaN(v)) return iso(v);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    if (Number(m[2]) <= 12 && Number(m[1]) <= 31) return `${y}-${pad(m[2])}-${pad(m[1])}`;
  }
  const t = Date.parse(s);
  return s && !isNaN(t) ? iso(new Date(t)) : null;
}

// Free text → one of the CATS ids, or null when it can't tell.
export function parseCategory(v) {
  const n = norm(v);
  if (!n) return null;
  const exact = CATS.find((c) => norm(c.id) === n.replace(/ /g, "") || norm(c.label) === n);
  if (exact) return exact.id;
  const foreign = /\b(foreign|expat|expatriate|imported|import|overseas|international)\b/.test(n);
  if (/\b(labou?r|staff|manpower|personnel|salar(y|ies)|wages?|payroll)\b/.test(n)) return foreign ? "expatLabor" : "ngLabor";
  if (/\b(equipment|materials?|goods|machinery|parts|supplies|plant)\b/.test(n)) return foreign ? "importEquip" : "localEquip";
  if (/\b(services?|contract(ing)?|consult(ing|ancy)?|logistics|marine|vessel|engineering)\b/.test(n)) return foreign ? "foreignServices" : "localServices";
  return null;
}

// Builds entries from the mapped rows. Rows without a usable amount are
// skipped and listed in `skipped` with a reason (row numbers match the sheet).
export function buildEntries(rows, map, { defaultCategory, defaultCurrency = "NGN", rate = 1600, addedBy = "" }) {
  const entries = [];
  const skipped = [];
  const get = (row, field) => (map[field] >= 0 ? row[map[field]] : undefined);
  const today = iso(new Date());
  const stamp = Date.now().toString(36);
  rows.slice(0, MAX_IMPORT_ROWS).forEach((row, i) => {
    const sheetRow = i + 2;
    const raw = parseAmount(get(row, "amount"));
    if (raw === null || raw <= 0) {
      skipped.push({ row: sheetRow, reason: raw === null ? "no amount" : "amount is zero or negative" });
      return;
    }
    const category = parseCategory(get(row, "category")) || defaultCategory;
    if (!category) { skipped.push({ row: sheetRow, reason: "category not recognised" }); return; }
    const ccyText = norm(get(row, "currency"));
    const amountText = norm(get(row, "amount"));
    const currency = /usd|dollar|\$/.test(ccyText) || /usd/.test(amountText) || String(get(row, "amount") ?? "").includes("$")
      ? "USD" : ccyText ? "NGN" : defaultCurrency;
    const text = (field) => String(get(row, field) ?? "").trim();
    entries.push({
      id: `${stamp}-${i}`,
      date: parseDate(get(row, "date")) || today,
      category,
      project: text("project"),
      vendor: text("vendor"),
      note: text("note"),
      addedBy: text("addedBy") || addedBy,
      currency,
      amount: currency === "USD" ? raw * rate : raw,
      originalAmount: raw,
      fxRate: currency === "USD" ? rate : null,
      imported: true,
    });
  });
  const truncated = Math.max(0, rows.length - MAX_IMPORT_ROWS);
  return { entries, skipped, truncated };
}

// Reads an uploaded File into raw rows. The Excel reader is loaded only
// when someone imports, so it doesn't slow down the app.
export async function readSpreadsheet(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") return parseCsv(await file.text());
  if (name.endsWith(".xls")) throw new Error("This is an old .xls file. In Excel, use File → Save As → Excel Workbook (.xlsx) or CSV, then import that.");
  const { readSheet } = await import("read-excel-file/universal");
  return readSheet(file);
}

// The downloadable template: headers plus two example rows.
export async function downloadTemplate() {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const head = TEMPLATE_HEADERS.map((value) => ({ value, fontWeight: "bold" }));
  const example = (cells) => cells.map((value) => ({ value, ...(value instanceof Date ? { format: "dd/mm/yyyy" } : {}) }));
  const data = [
    head,
    example([new Date(2026, 9, 6), "Local services", "Bonga North tie-back", "Onne Pipe Fabrication Ltd", 4800000, "NGN", "Pipe spool fabrication", "Chidi Eze"]),
    example([new Date(2026, 9, 14), "Imported equipment", "Bonga North tie-back", "Subsea Valves GmbH", 120000, "USD", "Subsea valves", "Chidi Eze"]),
  ];
  const columns = [14, 20, 26, 28, 14, 10, 30, 16].map((width) => ({ width }));
  await writeXlsxFile(data, { columns, sheet: "Spend log" }).toFile("NC Compliance spend log template.xlsx");
}

export const CATEGORY_HINT = CATS.map((c) => c.label).join(", ");
