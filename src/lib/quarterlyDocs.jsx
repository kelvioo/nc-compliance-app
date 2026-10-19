import { JOB_FORECAST_THRESHOLD_USD } from "./compliance";

// The four quarterly NCDMB reports (§18 Job Forecast, §24 Procurement
// Materials / Services, §24 Marine) for one quarter, used by the report
// screens and the submission pack. On a single report's own screen
// (`lockTab`) every matching entry is shown so nothing seems to vanish; the
// official split (≥ $1m on the Job Forecast, below $1m on Procurement)
// applies everywhere else, including the pack.
export function quarterlyReportDefs(data, quarterId, lockTab) {
  const contracts = data.contracts || [];
  const marineServices = data.marineServices || [];
  const inQuarter = contracts.filter((c) => c.quarter === quarterId);
  const marineInQuarter = marineServices.filter((m) => m.quarter === quarterId);
  const forecastRows = lockTab === "forecast"
    ? inQuarter
    : inQuarter.filter((c) => c.estimatedValueUsd >= JOB_FORECAST_THRESHOLD_USD);
  const procurementMaterialsRows = lockTab === "procMaterials"
    ? inQuarter.filter((c) => c.nature === "Materials")
    : inQuarter.filter((c) => c.estimatedValueUsd < JOB_FORECAST_THRESHOLD_USD && c.nature === "Materials");
  const procurementServicesRows = lockTab === "procServices"
    ? inQuarter.filter((c) => c.nature === "Services")
    : inQuarter.filter((c) => c.estimatedValueUsd < JOB_FORECAST_THRESHOLD_USD && c.nature === "Services");
  return {
    forecast: { label: "Job Forecast Report (§18) — ≥ $1,000,000", section: "18", rows: forecastRows,
      title: "JOB FORECAST\n($1 Million and above)",
      headers: ["S/N", "Description of Service/Item", "Tender No.", "Est. Cost/Value", "ITT Issuance", "ITT Closure", "Award Date", "Remarks"],
      rowsFn: (r, i) => [i + 1, r.description, r.tenderNumber || "—", "$" + Number(r.estimatedValueUsd).toLocaleString(),
        r.ittIssuance || "—", r.ittClosure || "—", r.awardDate || "—", r.remarks || "—"] },
    procMaterials: { label: "Procurement Report — Materials (§24) — below $1,000,000", section: "24", rows: procurementMaterialsRows,
      title: "QUARTERLY PROCUREMENT REPORTING TEMPLATE (MATERIALS)",
      headers: ["S/N", "Supplier", "Origin", "NCEC No.", "Item Description", "Material Type", "Qty/Units", "Project Owner", "Project Title", "Spend In", "Spend Out", "Total (USD)"],
      rowsFn: (r, i) => [i + 1, r.contractor || "—", r.origin || "—", r.ncecNumber || "—", r.description,
        r.materialType || "—", `${r.quantity || 0} ${r.unitsOfMeasurement || ""}`, r.projectOwner || "—",
        r.projectTitle || "—", "$" + Number(r.spendIncountry || 0).toLocaleString(),
        "$" + Number(r.spendOutcountry || 0).toLocaleString(), "$" + Number(r.estimatedValueUsd).toLocaleString()] },
    procServices: { label: "Procurement Report — Services (§24) — below $1,000,000", section: "24", rows: procurementServicesRows,
      title: "QUARTERLY PROCUREMENT REPORTING TEMPLATE (SERVICES)",
      headers: ["S/N", "Company (Vendor)", "Origin", "NCEC No.", "Service Description", "Service Type", "Project Owner", "Project Title", "Spend In", "Spend Out", "Total (USD)"],
      rowsFn: (r, i) => [i + 1, r.contractor || "—", r.origin || "—", r.ncecNumber || "—", r.description,
        r.serviceType || "—", r.projectOwner || "—", r.projectTitle || "—",
        "$" + Number(r.spendIncountry || 0).toLocaleString(), "$" + Number(r.spendOutcountry || 0).toLocaleString(),
        "$" + Number(r.estimatedValueUsd).toLocaleString()] },
    marine: { label: "Marine Services Utilization Report (§24)", section: "24", rows: marineInQuarter,
      title: "QUARTERLY MARINE VESSEL UTILIZATION REPORTING TEMPLATE",
      headers: ["S/N", "Vessel Name", "Vessel Type", "Contractor", "IMO No.", "Flagging", "Project Name", "Spend Incountry", "Spend Outcountry", "NG POB", "Exp. POB"],
      rowsFn: (r, i) => [i + 1, r.vesselName, r.vesselType || "—", r.contractorName || "—", r.imoNo || "—", r.flagging || "—",
        r.projectName || "—", "$" + Number(r.spendIncountry || 0).toLocaleString(), "$" + Number(r.spendOutcountry || 0).toLocaleString(),
        r.nigerianPob || 0, r.expatriatePob || 0] },
  };
}

export const QUARTERLY_REPORT_IDS = ["forecast", "procMaterials", "procServices", "marine"];

// The table inside a quarterly NCDMB document.
export function QuarterlyDocTable({ report }) {
  if (report.rows.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 12, border: "1px dashed #ccc" }}>
        No entries logged for this quarter yet.
      </div>
    );
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr>
          {report.headers.map((h) => (
            <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1",
              textAlign: "left", fontWeight: 700 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {report.rows.map((r, i) => (
          <tr key={i}>
            {report.rowsFn(r, i).map((cell, ci) => (
              <td key={ci} style={{ border: "1px solid #999", padding: "6px 8px" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
