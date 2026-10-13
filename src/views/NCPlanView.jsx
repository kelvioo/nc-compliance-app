import { useState } from "react";
import { Plus, FileText, Users, Building2, Trash2, Layers, Ship, HardHat, Package } from "lucide-react";
import { Field, inputStyle, btnPrimary, PlanSectionTitle, PlanRow, PlanEmpty, PlanTable } from "../components/ui";
import { PROCUREMENT_CATEGORIES, AWARD_TYPES, BID_PLATFORMS, blankNCPlan, calcTotals } from "../lib/compliance";

export function NCPlanTab({ active, onClick, icon: Icon, label }) {
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

export function NCPlanView({ data, setData }) {
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
