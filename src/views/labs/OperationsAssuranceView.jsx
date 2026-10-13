import { useState } from "react";
import { AlertTriangle, RadioTower, CheckCircle2 } from "lucide-react";

export function OperationsAssuranceView({ data, setData }) {
  const [actions, setActions] = useState(data.assuranceActions || [
    { id: "ptw", title: "Permit-to-work register review", owner: "HSE", due: "", priority: "Critical", complete: false },
    { id: "flare", title: "Gas-flaring variance and evidence review", owner: "Operations", due: "", priority: "High", complete: false },
    { id: "vendor", title: "Vendor Nigerian Content evidence check", owner: "Supply chain", due: "", priority: "High", complete: false },
  ]);
  const save = (next) => { setActions(next); setData({ ...data, assuranceActions: next }); };
  const open = actions.filter((action) => !action.complete);

  return <div className="nc-main-content nc-premium-page">
    <div className="nc-premium-heading"><div><span>OPERATIONS CONTROL ROOM</span><h1>Operations assurance</h1><p>Bring permit, flare, contractor and reporting risks into one accountable field-action register.</p></div><div className="nc-risk-chip"><AlertTriangle size={17} /> {open.length} open actions</div></div>
    <div className="nc-assurance-grid">
      {actions.map((action) => <article className={`nc-assurance-card ${action.complete ? "is-complete" : ""}`} key={action.id}>
        <div className="nc-card-line"><b className={`nc-priority ${action.priority.toLowerCase()}`}>{action.priority} priority</b>
          <button className="nc-complete-button" onClick={() => save(actions.map((item) => item.id === action.id ? { ...item, complete: !item.complete } : item))}>{action.complete ? <CheckCircle2 size={16} /> : "Mark complete"}</button></div>
        <h2>{action.title}</h2><p>Action owner: <strong>{action.owner}</strong></p>
        <label>Due date<input type="date" value={action.due} onChange={(e) => save(actions.map((item) => item.id === action.id ? { ...item, due: e.target.value } : item))} /></label>
      </article>)}
    </div>
    <div className="nc-safe-note"><RadioTower size={17} /> Use this register for internal control. Formal regulatory figures still require your approved NUPRC/NCDMB methodology and evidence.</div>
  </div>;
}
