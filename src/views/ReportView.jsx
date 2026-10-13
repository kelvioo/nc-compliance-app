import { useState } from "react";
import { FileText, ClipboardList, X } from "lucide-react";
import { Field, inputStyle, btnGhost } from "../components/ui";
import { CATS, FUEL_TYPES, fmtNaira, calcTotals, calcCarbon, downloadCsv } from "../lib/compliance";

export function ReportView({ data }) {
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
