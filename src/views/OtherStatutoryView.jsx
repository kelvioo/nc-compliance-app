import { useState } from "react";
import { Plus, Users, TrendingUp, Trash2, ClipboardList, ShieldCheck, Package } from "lucide-react";
import { Field, inputStyle, btnPrimary, NCDMBDocShell, SimpleLogTable } from "../components/ui";
import { NCPlanTab } from "./NCPlanView";

// Sections 29, 33, 38/39, and 44/46: the remaining statutory obligations —
// Employment & Training, Research & Development, Technology Transfer,
// Legal/Insurance/Financial Services, and per-expatriate Succession Plans.
export function OtherStatutoryView({ data, setData, lockTab }) {
  const os = data.otherStatutory || {
    employmentTrainingPlan: "", trainingLog: [],
    rndPlan: "", rndLog: [],
    techTransferPlan: "", techTransferLog: [],
    legalServices: {}, insuranceServices: {}, financialServices: {},
    successionPlans: [],
  };
  const [tab, setTab] = useState(lockTab || "training");
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
    { id: "insurance", label: "Insurance services (§49)", icon: ShieldCheck },
    { id: "legal", label: "Legal services (§51)", icon: ShieldCheck },
    { id: "financial", label: "Financial services (§52)", icon: ShieldCheck },
    { id: "succession", label: "Succession plans (§33)", icon: ClipboardList },
  ];
  const visibleTabs = lockTab ? tabs.filter((t) => t.id === lockTab) : tabs;

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>
        {lockTab ? tabs.find((t) => t.id === lockTab)?.label : "Other statutory reports"}
      </h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px", maxWidth: 640 }}>
        {lockTab
          ? "Enter your data below, then print or save this report exactly as NCDMB expects it."
          : "The remaining NOGICD Act obligations beyond NC%, spend, and quarterly contracts — tracked here so nothing on NCDMB's statutory list is left unaccounted for."}
      </p>

      {!lockTab && (
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {visibleTabs.map((t) => (
            <NCPlanTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
          ))}
        </div>
      )}

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
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10,
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
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10,
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
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10,
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

      {tab === "legal" && (
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
          <div style={{ fontSize: 11, color: "#5B6470" }}>
            Submitted bi-annually. NCDMB's page doesn't state the exact within-period due date —
            confirm the current cut-off with NCDMB or your NOGIC JQS account.
          </div>
        </div>
      )}

      {tab === "insurance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
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
          <div style={{ fontSize: 11, color: "#5B6470" }}>
            Submitted bi-annually. NCDMB's page doesn't state the exact within-period due date —
            confirm the current cut-off with NCDMB or your NOGIC JQS account.
          </div>
        </div>
      )}

      {tab === "financial" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
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
            Submitted bi-annually. NCDMB's page doesn't state the exact within-period due date —
            confirm the current cut-off with NCDMB or your NOGIC JQS account.
          </div>
        </div>
      )}

      {tab === "succession" && (
        <>
          <form onSubmit={addSuccession} className="nc-form-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10,
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

      {tab === "training" && (
        <NCDMBDocShell title={"EMPLOYMENT & TRAINING PLAN AND REPORT\n(Section 29)"} companyName={data.name}
          meta={<div><strong>Plan summary:</strong> {os.employmentTrainingPlan || "Not yet completed"}</div>}
          docLabel={`Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`}>
          {os.trainingLog.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 12, border: "1px dashed #ccc" }}>No training programs logged yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr>{["S/N", "Training Program", "Total Participants", "Nigerian Participants", "Date"].map((h) => (
                <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left", fontWeight: 700 }}>{h}</th>))}</tr></thead>
              <tbody>{os.trainingLog.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{i + 1}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.program}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.participants}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.nigerianParticipants}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.date}</td>
                </tr>))}</tbody>
            </table>
          )}
        </NCDMBDocShell>
      )}

      {tab === "rnd" && (
        <NCDMBDocShell title={"RESEARCH & DEVELOPMENT PLAN AND REPORT\n(Sections 38 & 39)"} companyName={data.name}
          meta={<div><strong>Plan summary:</strong> {os.rndPlan || "Not yet completed"}</div>}
          docLabel={`Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`}>
          {os.rndLog.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 12, border: "1px dashed #ccc" }}>No R&D initiatives logged yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr>{["S/N", "Initiative", "Budget (USD)", "Status"].map((h) => (
                <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left", fontWeight: 700 }}>{h}</th>))}</tr></thead>
              <tbody>{os.rndLog.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{i + 1}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.initiative}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>${Number(r.budgetUsd).toLocaleString()}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.status}</td>
                </tr>))}</tbody>
            </table>
          )}
        </NCDMBDocShell>
      )}

      {tab === "tech" && (
        <NCDMBDocShell title={"OPERATORS/COMPANY TECHNOLOGY TRANSFER PLAN AND REPORT\n(Sections 44 & 46)"} companyName={data.name}
          meta={<div><strong>Plan summary:</strong> {os.techTransferPlan || "Not yet completed"}</div>}
          docLabel={`Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>1. Description of Technology Transfer Initiative</div>
          <div style={{ fontSize: 11, marginBottom: 14, minHeight: 20 }}>{os.techTransferPlan || "—"}</div>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>2. Milestones to be Achieved / Transfer Status</div>
          {os.techTransferLog.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 12, border: "1px dashed #ccc" }}>No technology transfer agreements logged yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr>{["S/N", "Transfer Partner", "Technology / Know-how", "Status"].map((h) => (
                <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left", fontWeight: 700 }}>{h}</th>))}</tr></thead>
              <tbody>{os.techTransferLog.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{i + 1}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.partner}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.technology}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.status}</td>
                </tr>))}</tbody>
            </table>
          )}
        </NCDMBDocShell>
      )}

      {tab === "legal" && (
        <NCDMBDocShell title={"LEGAL SERVICES REPORT\n(Section 51 — Bi-annual)"} companyName={data.name}
          meta={<div><strong>Nigerian law firm retained:</strong> {legal.firm || "—"}</div>}
          docLabel={`Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr>{["Field", "Details"].map((h) => (
              <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left", fontWeight: 700 }}>{h}</th>))}</tr></thead>
            <tbody>
              <tr><td style={{ border: "1px solid #999", padding: "6px 8px", fontWeight: 700, width: "35%" }}>Nigerian law firm retained</td>
                <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{legal.firm || "—"}</td></tr>
              <tr><td style={{ border: "1px solid #999", padding: "6px 8px", fontWeight: 700 }}>Notes</td>
                <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{legal.notes || "—"}</td></tr>
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: "#666", marginTop: 14 }}>
            Note: this is a summary printout. NCDMB's full official Legal Services template breaks this into
            16 individual service categories across a "past six months / forecast / budget" three-part
            structure — a more detailed version of this printout is planned as a follow-up.
          </div>
        </NCDMBDocShell>
      )}

      {tab === "insurance" && (
        <NCDMBDocShell title={"INSURANCE SERVICES REPORT\n(Section 49 — Bi-annual)"} companyName={data.name}
          meta={<div><strong>Nigerian insurer / broker used:</strong> {insurance.provider || "—"}</div>}
          docLabel={`Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr>{["Field", "Details"].map((h) => (
              <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left", fontWeight: 700 }}>{h}</th>))}</tr></thead>
            <tbody>
              <tr><td style={{ border: "1px solid #999", padding: "6px 8px", fontWeight: 700, width: "35%" }}>Nigerian insurer / broker used</td>
                <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{insurance.provider || "—"}</td></tr>
              <tr><td style={{ border: "1px solid #999", padding: "6px 8px", fontWeight: 700 }}>Notes</td>
                <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{insurance.notes || "—"}</td></tr>
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: "#666", marginTop: 14 }}>
            Note: this is a summary printout. NCDMB's full official Insurance Services template breaks this
            into detailed provider-by-provider tables across a three-part reporting structure — a more
            detailed version of this printout is planned as a follow-up.
          </div>
        </NCDMBDocShell>
      )}

      {tab === "financial" && (
        <NCDMBDocShell title={"FINANCIAL SERVICES REPORT\n(Section 52 — Bi-annual)"} companyName={data.name}
          meta={<div><strong>Nigerian financial institution:</strong> {financial.institution || "—"}</div>}
          docLabel={`Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr>{["Field", "Details"].map((h) => (
              <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left", fontWeight: 700 }}>{h}</th>))}</tr></thead>
            <tbody>
              <tr><td style={{ border: "1px solid #999", padding: "6px 8px", fontWeight: 700, width: "35%" }}>Nigerian financial institution</td>
                <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{financial.institution || "—"}</td></tr>
              <tr><td style={{ border: "1px solid #999", padding: "6px 8px", fontWeight: 700 }}>% Nigerian revenue retained locally</td>
                <td style={{ border: "1px solid #999", padding: "6px 8px" }}>
                  {financial.revenueRetentionPct ? `${financial.revenueRetentionPct}%` : "—"}</td></tr>
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: "#666", marginTop: 14 }}>
            Note: this is a summary printout. NCDMB's full official Financial Services template breaks this
            into detailed provider-by-provider tables across a three-part reporting structure — a more
            detailed version of this printout is planned as a follow-up.
          </div>
        </NCDMBDocShell>
      )}

      {tab === "succession" && (
        <NCDMBDocShell title={"SUCCESSION PLAN TEMPLATE\n(Section 33 — Per Expatriate)"} companyName={data.name}
          meta={<div>Understudy progress for approved expatriate positions.</div>}
          docLabel={`Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`}>
          {os.successionPlans.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 12, border: "1px dashed #ccc" }}>No succession plans logged yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr>{["S/N", "Expatriate Role", "Nigerian Understudy", "Target Handover Date", "Progress %"].map((h) => (
                <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left", fontWeight: 700 }}>{h}</th>))}</tr></thead>
              <tbody>{os.successionPlans.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{i + 1}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.expatRole}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.understudyName || "—"}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.targetDate || "—"}</td>
                  <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.progressPct}%</td>
                </tr>))}</tbody>
            </table>
          )}
        </NCDMBDocShell>
      )}
    </div>
  );
}
