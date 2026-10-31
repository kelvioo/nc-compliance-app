import { useState } from "react";
import { Plus, FileText, Trash2, ClipboardList, Ship, CalendarClock } from "lucide-react";
import { Field, inputStyle, btnPrimary, NCDMBDocShell, DeadlineBadge } from "../components/ui";
import { CONTRACT_CATEGORIES, CONTRACT_NATURE, CONTRACT_STATUSES, JOB_FORECAST_THRESHOLD_USD, getQuarterOptions, upcomingQuarter, STATUTORY_REPORTS, nextQuarterly30DayDeadline, nextAnnual60DayDeadline, daysUntil, FREQ_LABELS } from "../lib/compliance";
import { NCPlanTab } from "./NCPlanView";
import { QuarterlyDocTable, quarterlyReportDefs } from "../lib/quarterlyDocs";

export function ComplianceCalendar() {
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

export function QuarterlyReportsView({ data, setData, lockTab }) {
  const contracts = data.contracts || [];
  const marineServices = data.marineServices || [];
  const [tab, setTab] = useState(lockTab === "marine" ? "marine" : (lockTab ? "register" : "calendar"));
  const [regAddress, setRegAddress] = useState(data.registeredAddress || "");
  const [form, setForm] = useState({
    description: "", contractor: "", category: CONTRACT_CATEGORIES[0], nature: CONTRACT_NATURE[0],
    estimatedValueUsd: "", status: CONTRACT_STATUSES[0], quarter: upcomingQuarter().id,
    tenderNumber: "", ittIssuance: "", ittClosure: "", awardDate: "", remarks: "",
    origin: "Nigerian", ncecNumber: "", nogicJqsId: "", serviceType: "", equipmentDeployed: "",
    partneringVendor: "", materialType: "", quantity: "", unitsOfMeasurement: "",
    originOfManufacture: "Nigerian", oemName: "", poDate: "", projectOwner: "", projectTitle: "",
    contractStart: "", contractEnd: "", spendIncountry: "", spendOutcountry: "",
  });
  const [marineForm, setMarineForm] = useState({
    contractorName: "", address: "", contactPhone: "", contactEmail: "", nimasaOwnerCert: "", categorizationStatus: "",
    vesselName: "", vesselType: "", imoNo: "", nimasaVesselCert: "", flagging: "",
    projectName: "", typeOfService: "", projectLocation: "", contractStart: "", contractEnd: "",
    spendIncountry: "", spendOutcountry: "", nigerianPob: "", expatriatePob: "",
    quarter: upcomingQuarter().id,
  });
  const [reportQuarter, setReportQuarter] = useState(upcomingQuarter().id);
  const [reportType, setReportType] = useState(lockTab || "forecast");

  const addContract = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    const spendIn = Number(form.spendIncountry || 0), spendOut = Number(form.spendOutcountry || 0);
    const value = Number(form.estimatedValueUsd || 0) || (spendIn + spendOut);
    const row = { id: Date.now().toString(36), ...form, estimatedValueUsd: value,
      spendIncountry: spendIn, spendOutcountry: spendOut, quantity: Number(form.quantity || 0) };
    await setData({ ...data, contracts: [row, ...contracts] });
    setForm({ ...form, description: "", contractor: "", estimatedValueUsd: "", tenderNumber: "",
      ittIssuance: "", ittClosure: "", awardDate: "", remarks: "", ncecNumber: "", nogicJqsId: "",
      serviceType: "", equipmentDeployed: "", partneringVendor: "", materialType: "", quantity: "",
      unitsOfMeasurement: "", oemName: "", poDate: "", projectOwner: "", projectTitle: "",
      contractStart: "", contractEnd: "", spendIncountry: "", spendOutcountry: "" });
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
  const REPORT_TYPES = quarterlyReportDefs(data, reportQuarter, lockTab);
  const inQuarter = contracts.filter((c) => c.quarter === reportQuarter);
  const forecastRows = REPORT_TYPES.forecast.rows;
  const activeReport = REPORT_TYPES[reportType];
  const today = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

  const tabs = [
    { id: "calendar", label: "Compliance calendar", icon: CalendarClock },
    { id: "register", label: "Contracts register", icon: ClipboardList },
    { id: "marine", label: "Marine services register", icon: Ship },
    { id: "report", label: "Generate report", icon: FileText },
  ];
  const LOCK_TITLES = {
    forecast: "Job Forecast Report (§18)",
    procMaterials: "Procurement Report — Materials (§24)",
    procServices: "Procurement Report — Services (§24)",
    marine: "Marine Services Utilization Report (§24)",
  };
  const calendarVisible = tab === "calendar" && !lockTab;
  const registerVisible = tab === "register" || (lockTab && lockTab !== "marine");
  const marineVisible = tab === "marine" || lockTab === "marine";
  const reportVisible = tab === "report" || !!lockTab;

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>
        {lockTab ? LOCK_TITLES[lockTab] : "Quarterly compliance"}
      </h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px" }}>
        {lockTab
          ? "Enter your data below, then print or save this report exactly as NCDMB expects it."
          : "Every statutory NCDMB deadline in one place, plus the Job Forecast (§18), Procurement (§24 — Materials & Services), and Marine Services Utilization (§24) report generators."}
      </p>

      {!lockTab && (
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {tabs.map((t) => (
            <NCPlanTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
          ))}
        </div>
      )}

      {calendarVisible && (
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

      {registerVisible && (
        <>
          <form onSubmit={addContract} style={{
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: 16, marginBottom: 22, display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Basics</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <Field label="Description">
                  <input style={inputStyle} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. Supply of wellhead equipment" />
                </Field>
                <Field label={form.nature === "Materials" ? "Supplier (vendor)" : "Company (vendor) name"}>
                  <input style={inputStyle} value={form.contractor}
                    onChange={(e) => setForm({ ...form, contractor: e.target.value })} />
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
                <Field label="Origin (Nigerian/Foreign)">
                  <select style={inputStyle} value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}>
                    <option value="Nigerian">Nigerian</option>
                    <option value="Foreign">Foreign</option>
                  </select>
                </Field>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                {form.nature === "Materials" ? "Material information" : "Service information"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <Field label="NCEC number">
                  <input style={inputStyle} value={form.ncecNumber}
                    onChange={(e) => setForm({ ...form, ncecNumber: e.target.value })} placeholder="Optional" />
                </Field>
                <Field label="NOGIC JQS ID">
                  <input style={inputStyle} value={form.nogicJqsId}
                    onChange={(e) => setForm({ ...form, nogicJqsId: e.target.value })} placeholder="Optional" />
                </Field>
                {form.nature === "Materials" ? (
                  <>
                    <Field label="Material type">
                      <input style={inputStyle} value={form.materialType}
                        onChange={(e) => setForm({ ...form, materialType: e.target.value })} />
                    </Field>
                    <Field label="Quantity / units">
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="number" min="0" style={inputStyle} value={form.quantity}
                          onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qty" />
                        <input style={inputStyle} value={form.unitsOfMeasurement}
                          onChange={(e) => setForm({ ...form, unitsOfMeasurement: e.target.value })} placeholder="Units" />
                      </div>
                    </Field>
                    <Field label="Origin of manufacture">
                      <select style={inputStyle} value={form.originOfManufacture}
                        onChange={(e) => setForm({ ...form, originOfManufacture: e.target.value })}>
                        <option value="Nigerian">Nigerian</option>
                        <option value="Foreign">Foreign</option>
                      </select>
                    </Field>
                    <Field label="Name of OEM">
                      <input style={inputStyle} value={form.oemName}
                        onChange={(e) => setForm({ ...form, oemName: e.target.value })} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Service type">
                      <input style={inputStyle} value={form.serviceType}
                        onChange={(e) => setForm({ ...form, serviceType: e.target.value })} />
                    </Field>
                    <Field label="Equipment deployed">
                      <input style={inputStyle} value={form.equipmentDeployed}
                        onChange={(e) => setForm({ ...form, equipmentDeployed: e.target.value })} placeholder="Optional" />
                    </Field>
                    <Field label="Partnering vendor">
                      <input style={inputStyle} value={form.partneringVendor}
                        onChange={(e) => setForm({ ...form, partneringVendor: e.target.value })} placeholder="Optional" />
                    </Field>
                  </>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Contract information</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <Field label="PO date">
                  <input type="date" style={inputStyle} value={form.poDate}
                    onChange={(e) => setForm({ ...form, poDate: e.target.value })} />
                </Field>
                <Field label="Project owner">
                  <input style={inputStyle} value={form.projectOwner}
                    onChange={(e) => setForm({ ...form, projectOwner: e.target.value })} />
                </Field>
                <Field label="Project title">
                  <input style={inputStyle} value={form.projectTitle}
                    onChange={(e) => setForm({ ...form, projectTitle: e.target.value })} />
                </Field>
                <Field label="Contract start">
                  <input type="date" style={inputStyle} value={form.contractStart}
                    onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
                </Field>
                <Field label="Contract end">
                  <input type="date" style={inputStyle} value={form.contractEnd}
                    onChange={(e) => setForm({ ...form, contractEnd: e.target.value })} />
                </Field>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Value & scheduling</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <Field label="Spend incountry (USD)">
                  <input type="number" min="0" style={inputStyle} value={form.spendIncountry}
                    onChange={(e) => setForm({ ...form, spendIncountry: e.target.value })} />
                </Field>
                <Field label="Spend outcountry (USD)">
                  <input type="number" min="0" style={inputStyle} value={form.spendOutcountry}
                    onChange={(e) => setForm({ ...form, spendOutcountry: e.target.value })} />
                </Field>
                <Field label="Total spend value / est. value (USD)">
                  <input type="number" min="0" style={inputStyle} value={form.estimatedValueUsd}
                    onChange={(e) => setForm({ ...form, estimatedValueUsd: e.target.value })}
                    placeholder={(Number(form.spendIncountry || 0) + Number(form.spendOutcountry || 0)) || "0"} />
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
                    {quarters.map((q) => <option key={q.id} value={q.id}>{q.quarterLabel}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Job Forecast fields (only needed if this contract is ≥ $1,000,000)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <Field label="Tender number">
                  <input style={inputStyle} value={form.tenderNumber}
                    onChange={(e) => setForm({ ...form, tenderNumber: e.target.value })} placeholder="Optional" />
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
                <Field label="Remarks">
                  <input style={inputStyle} value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional" />
                </Field>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
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

      {marineVisible && (
        <>
          <form onSubmit={addMarine} style={{
            background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: 16, marginBottom: 22, display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Vessel contractor</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
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

      {reportVisible && (
        <>
          {lockTab && <div style={{ fontSize: 11, color: "#8D97A3", textTransform: "uppercase", letterSpacing: 0.5, margin: "22px 0 8px" }}>Generate & print</div>}
          <div className="no-print" style={{ display: "flex", gap: 12, alignItems: "end",
            marginBottom: 20, flexWrap: "wrap" }}>
            <Field label="Quarter">
              <select style={inputStyle} value={reportQuarter} onChange={(e) => setReportQuarter(e.target.value)}>
                {quarters.map((q) => <option key={q.id} value={q.id}>{q.quarterLabel} ({q.rangeLabel})</option>)}
              </select>
            </Field>
            {!lockTab && (
              <Field label="Report type">
                <select style={inputStyle} value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  {Object.entries(REPORT_TYPES).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
                </select>
              </Field>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }} className="no-print">
            <span style={{ fontSize: 12, color: "#8D97A3" }}>Submission deadline for {selectedQuarter.quarterLabel}:</span>
            <DeadlineBadge days={daysUntil(new Date(selectedQuarter.deadline), new Date())} />
            <span style={{ fontSize: 12, color: "#5B6470" }}>({selectedQuarter.deadlineLabel})</span>
          </div>

          {lockTab === "forecast" && forecastRows.some((r) => r.estimatedValueUsd < JOB_FORECAST_THRESHOLD_USD) && (
            <div className="no-print" style={{ background: "#3A2A12", border: "1px solid #E6A23C", borderRadius: 8,
              padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#E6A23C" }}>
              Note: NCDMB's Job Forecast Report officially only requires contracts, subcontracts, and purchase
              orders valued at $1,000,000 or above. Entries below that are shown here so you can see them
              immediately, but they belong on the Procurement report instead for actual submission.
            </div>
          )}
          {(lockTab === "procMaterials" || lockTab === "procServices") &&
            inQuarter.some((c) => c.nature === (lockTab === "procMaterials" ? "Materials" : "Services") && c.estimatedValueUsd >= JOB_FORECAST_THRESHOLD_USD) && (
            <div className="no-print" style={{ background: "#3A2A12", border: "1px solid #E6A23C", borderRadius: 8,
              padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#E6A23C" }}>
              Note: NCDMB's Procurement Report officially only covers contracts below $1,000,000. Entries at
              or above that are shown here so you can see them immediately, but they belong on the Job
              Forecast report instead for actual submission.
            </div>
          )}

          <NCDMBDocShell
            title={activeReport.title}
            companyName={data.name}
            fileName={`${data.name || "Company"} - ${activeReport.label.split(" — ")[0]} - ${selectedQuarter.quarterLabel}`}
            meta={<>
              <div><strong>Period of Submission:</strong> {selectedQuarter.quarterLabel} ({selectedQuarter.rangeLabel})</div>
            </>}
            docLabel={`${activeReport.label.split(" — ")[0]} · generated ${today}`}
          >
            <QuarterlyDocTable report={activeReport} />
          </NCDMBDocShell>
        </>
      )}
    </div>
  );
}
