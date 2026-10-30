import { useRef, useState } from "react";
import { FileSpreadsheet, Download, Upload, X } from "lucide-react";
import { Field, inputStyle, btnPrimary, btnGhost } from "../components/ui";
import { CATS, fmtNaira } from "../lib/compliance";
import {
  IMPORT_FIELDS, MAX_IMPORT_ROWS, CATEGORY_HINT,
  buildEntries, downloadTemplate, guessMapping, readSpreadsheet, splitHeader,
} from "../lib/importEntries";

const panel = { background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 22 };
const muted = { color: "#8D97A3", fontSize: 12.5, lineHeight: 1.5 };
const cell = { padding: "8px 12px", borderTop: "1px solid #2E3742", whiteSpace: "nowrap" };

// "Import from Excel/CSV" for the spend log: pick a file, check which column
// is which, preview, then add every row in one go.
export function ImportEntries({ data, setData, addedBy, onClose }) {
  const fileInput = useRef(null);
  const [sheet, setSheet] = useState(null); // { name, headers, rows }
  const [map, setMap] = useState({});
  const [defaultCategory, setDefaultCategory] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("NGN");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const rate = data.exchangeRate || 1600;

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(""); setDone(null); setBusy(true);
    try {
      const { headers, rows } = splitHeader(await readSpreadsheet(file));
      if (!rows.length) throw new Error("That file has no rows under the header row.");
      setSheet({ name: file.name, headers, rows });
      setMap(guessMapping(headers));
    } catch (err) {
      setSheet(null);
      setError(err?.message?.startsWith("This is an old") || err?.message?.startsWith("That file")
        ? err.message : "We couldn't read that file. Save it as .xlsx or .csv and try again.");
    } finally {
      setBusy(false);
    }
  };

  const result = sheet && map.amount >= 0
    ? buildEntries(sheet.rows, map, { defaultCategory: defaultCategory || null, defaultCurrency, rate, addedBy })
    : null;

  const doImport = async () => {
    if (!result?.entries.length) return;
    setBusy(true);
    try {
      await setData({ ...data, entries: [...result.entries, ...data.entries] });
      setDone({ count: result.entries.length, total: result.entries.reduce((s, x) => s + x.amount, 0) });
      setSheet(null);
    } catch {
      setError("The import didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={panel} aria-label="Import spend from Excel or CSV">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <FileSpreadsheet size={18} color="#E6A23C" />
        <strong style={{ color: "#EDEFF2", flex: 1 }}>Import from Excel or CSV</strong>
        <button type="button" onClick={onClose} aria-label="Close import" style={{ background: "none", border: "none", color: "#8D97A3", cursor: "pointer" }}>
          <X size={16} />
        </button>
      </div>

      {done && (
        <p role="status" style={{ ...muted, color: "#4FAE7E", margin: "0 0 12px" }}>
          Imported {done.count} {done.count === 1 ? "entry" : "entries"} ({fmtNaira(done.total)}). They're in the spend log below and every report now includes them.
        </p>
      )}

      {!sheet && (
        <>
          <p style={{ ...muted, margin: "0 0 12px" }}>
            Upload the spreadsheet your team already keeps. The first row should be the column headings; we'll match them to the spend log.
            Need a starting point? Download the template, fill it in and upload it.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" style={btnPrimary} disabled={busy} onClick={() => fileInput.current?.click()}>
              <Upload size={15} /> {busy ? "Reading…" : "Choose file (.xlsx or .csv)"}
            </button>
            <button type="button" style={btnGhost} onClick={() => downloadTemplate().catch(() => setError("The template didn't download. Try again."))}>
              <Download size={15} /> Download template
            </button>
          </div>
          <input ref={fileInput} type="file" hidden onChange={pickFile}
            accept=".xlsx,.csv,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
        </>
      )}

      {error && <p role="alert" style={{ ...muted, color: "#D9534F", margin: "12px 0 0" }}>{error}</p>}

      {sheet && (
        <>
          <p style={{ ...muted, margin: "0 0 12px" }}>
            <strong style={{ color: "#EDEFF2" }}>{sheet.name}</strong>: {sheet.rows.length} {sheet.rows.length === 1 ? "row" : "rows"}.
            Check which column holds each item, then import.
          </p>
          <div className="nc-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {IMPORT_FIELDS.map((f) => (
              <Field key={f.id} label={f.required ? `${f.label} *` : f.label}>
                <select style={inputStyle} value={map[f.id] ?? -1}
                  onChange={(e) => setMap({ ...map, [f.id]: Number(e.target.value) })}>
                  <option value={-1}>{f.required ? "Choose a column" : "Not in my sheet"}</option>
                  {sheet.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </Field>
            ))}
            <Field label="If the category is missing or unclear">
              <select style={inputStyle} value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)}>
                <option value="">Skip that row</option>
                {CATS.map((c) => <option key={c.id} value={c.id}>Use “{c.label}”</option>)}
              </select>
            </Field>
            <Field label="If the currency is missing">
              <select style={inputStyle} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
                <option value="NGN">Naira (NGN)</option>
                <option value="USD">US dollars (USD) at ₦{rate.toLocaleString()}/$1</option>
              </select>
            </Field>
          </div>
          <p style={{ ...muted, margin: "10px 0 0" }}>Categories we recognise: {CATEGORY_HINT}. Words like “expatriate staff” or “imported materials” are matched too.</p>

          {map.amount < 0 && <p role="alert" style={{ ...muted, color: "#E6A23C", margin: "12px 0 0" }}>Choose the column that holds the amount.</p>}

          {result && (
            <>
              <div style={{ overflow: "auto", marginTop: 14, border: "1px solid #2E3742", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: "#EDEFF2" }}>
                  <thead>
                    <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
                      {["Date", "Category", "Project", "Vendor", "Amount (₦)"].map((h) => <th key={h} style={{ padding: "8px 12px", fontWeight: 500 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.entries.slice(0, 8).map((e) => (
                      <tr key={e.id}>
                        <td style={{ ...cell, color: "#8D97A3" }}>{e.date}</td>
                        <td style={cell}>{CATS.find((c) => c.id === e.category)?.label}</td>
                        <td style={{ ...cell, color: "#8D97A3" }}>{e.project || "—"}</td>
                        <td style={{ ...cell, color: "#8D97A3" }}>{e.vendor || "—"}</td>
                        <td style={{ ...cell, fontFamily: "IBM Plex Mono, monospace" }}>
                          {fmtNaira(e.amount)}{e.currency === "USD" && <span style={{ color: "#8D97A3" }}> (${e.originalAmount.toLocaleString()})</span>}
                        </td>
                      </tr>
                    ))}
                    {result.entries.length === 0 && (
                      <tr><td colSpan={5} style={{ ...cell, color: "#5B6470", textAlign: "center" }}>No rows can be imported with these settings yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p style={{ ...muted, margin: "10px 0 0" }}>
                {result.entries.length > 8 && <>Showing 8 of {result.entries.length} rows. </>}
                {result.skipped.length > 0 && (
                  <span style={{ color: "#E6A23C" }}>
                    {result.skipped.length} {result.skipped.length === 1 ? "row" : "rows"} will be skipped
                    ({result.skipped.slice(0, 5).map((s) => `row ${s.row}: ${s.reason}`).join("; ")}{result.skipped.length > 5 ? "; …" : ""}).
                  </span>
                )}
                {result.truncated > 0 && <> Only the first {MAX_IMPORT_ROWS.toLocaleString()} rows are imported at a time; import the rest in a second file.</>}
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button type="button" style={btnPrimary} disabled={busy || !result.entries.length} onClick={doImport}>
                  <Upload size={15} /> {busy ? "Importing…" : `Import ${result.entries.length} ${result.entries.length === 1 ? "entry" : "entries"}`}
                </button>
                <button type="button" style={btnGhost} onClick={() => { setSheet(null); setError(""); }}>Choose a different file</button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
