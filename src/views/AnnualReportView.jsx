import { useState } from "react";
import { Field, inputStyle, NCDMBDocShell, DeadlineBadge } from "../components/ui";
import { CATS, JOB_FORECAST_THRESHOLD_USD, nextAnnual60DayDeadline, daysUntil, fmtNaira, calcTotals, calcCarbon } from "../lib/compliance";

// Section 60: Project Progress Performance Report, due within 60 days of
// the start of the year. Pulls together the whole year's tracked figures.
export function AnnualReportView({ data }) {
  // The §60 report filed early in a year covers the year before, so default
  // to last year until the filing window (first 60 days) has passed.
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(nextAnnual60DayDeadline(new Date()).getFullYear() - 1);
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
            {[thisYear - 2, thisYear - 1, thisYear].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
      </div>

      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: "#8D97A3" }}>Next §60 deadline:</span>
        <DeadlineBadge days={daysUntil(new Date(deadline), new Date())} />
        <span style={{ fontSize: 12, color: "#5B6470" }}>
          ({deadline.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })})
        </span>
      </div>

      <NCDMBDocShell title={`NC PERFORMANCE REPORT (${year})\nProject Progress Performance Report — Section 60`}
        companyName={data.name}
        meta={<div><strong>Reporting Year:</strong> {year}</div>}
        docLabel={`Generated ${today}`}
      >
        <div style={{ fontSize: 12, fontWeight: 700, background: "#F1F1F1", padding: "6px 10px", marginTop: 4, marginBottom: 8 }}>
          1. Nigerian Content Position
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
          <tbody>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px", width: "60%" }}>Nigerian Content achieved</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{pct.toFixed(1)}% (target {data.target}%)</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px" }}>Local spend</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{fmtNaira(local)}</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px" }}>Foreign spend</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{fmtNaira(foreign)}</td></tr>
          </tbody>
        </table>

        <div style={{ fontSize: 12, fontWeight: 700, background: "#F1F1F1", padding: "6px 10px", marginBottom: 8 }}>
          2. Spend by Category
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
          <thead><tr>
            <th style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left" }}>Category</th>
            <th style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left" }}>Amount</th>
          </tr></thead>
          <tbody>
            {CATS.map((c) => (
              <tr key={c.id}>
                <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{c.label}</td>
                <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{fmtNaira(totals[c.id])}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 12, fontWeight: 700, background: "#F1F1F1", padding: "6px 10px", marginBottom: 8 }}>
          3. Contracts, Subcontracts & Purchase Orders
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
          <tbody>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px", width: "60%" }}>Job Forecast value (§18, ≥$1M)</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>${forecastTotal.toLocaleString()}</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px" }}>Procurement value (§24, &lt;$1M)</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>${procurementTotal.toLocaleString()}</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px" }}>Total contracts logged for the year</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{yearContracts.length}</td></tr>
          </tbody>
        </table>

        <div style={{ fontSize: 12, fontWeight: 700, background: "#F1F1F1", padding: "6px 10px", marginBottom: 8 }}>
          4. Expatriate Quota & Localisation
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
          <tbody>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px", width: "60%" }}>Total approved expatriate slots</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{totalApproved}</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px" }}>Nigerian understudies assigned</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{totalLocalised}</td></tr>
          </tbody>
        </table>

        <div style={{ fontSize: 12, fontWeight: 700, background: "#F1F1F1", padding: "6px 10px", marginBottom: 8 }}>
          5. Carbon Intensity
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <tbody>
            <tr><td style={{ border: "1px solid #999", padding: "6px 8px", width: "60%" }}>Estimated total emissions</td>
              <td style={{ border: "1px solid #999", padding: "6px 8px" }}>
                {(totalCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t CO2e</td></tr>
          </tbody>
        </table>

        <div style={{ fontSize: 10, color: "#666", marginTop: 14 }}>
          Note: this is a compiled summary. NCDMB's full NC Performance workbook includes 18+ additional
          detail sheets (NC Schedule, Plan-NCCC, per-category breakdowns) beyond this summary view — a
          fuller sheet-by-sheet version is planned as a follow-up.
        </div>
      </NCDMBDocShell>
    </div>
  );
}
