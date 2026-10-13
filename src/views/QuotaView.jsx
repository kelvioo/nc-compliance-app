import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, inputStyle, btnPrimary } from "../components/ui";

export function QuotaView({ data, setData }) {
  const [form, setForm] = useState({ role: "", approvedSlots: "", nigerianUnderstudies: "" });

  const addPosition = async (e) => {
    e.preventDefault();
    if (!form.role.trim()) return;
    const pos = {
      id: Date.now().toString(36), role: form.role,
      approvedSlots: Number(form.approvedSlots || 0),
      nigerianUnderstudies: Number(form.nigerianUnderstudies || 0),
    };
    await setData({ ...data, expatPositions: [...(data.expatPositions || []), pos] });
    setForm({ role: "", approvedSlots: "", nigerianUnderstudies: "" });
  };

  const removePos = async (id) => {
    await setData({ ...data, expatPositions: data.expatPositions.filter((p) => p.id !== id) });
  };

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Expatriate quota report</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px" }}>
        Track approved expatriate positions against Nigerian understudy progress.
      </p>

      <form onSubmit={addPosition} style={{
        display: "grid", gridTemplateColumns: "1fr 160px 200px auto", gap: 10, alignItems: "end",
        background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 22,
      }}>
        <Field label="Position / role">
          <input style={inputStyle} value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Drilling Engineer" />
        </Field>
        <Field label="Approved slots">
          <input type="number" min="0" style={inputStyle} value={form.approvedSlots}
            onChange={(e) => setForm({ ...form, approvedSlots: e.target.value })} />
        </Field>
        <Field label="Nigerian understudies assigned">
          <input type="number" min="0" style={inputStyle} value={form.nigerianUnderstudies}
            onChange={(e) => setForm({ ...form, nigerianUnderstudies: e.target.value })} />
        </Field>
        <button type="submit" style={btnPrimary}><Plus size={15} /> Add</button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(data.expatPositions || []).length === 0 && (
          <div style={{ color: "#5B6470", fontSize: 13, padding: 10 }}>No positions logged yet.</div>
        )}
        {(data.expatPositions || []).map((p) => {
          const progress = p.approvedSlots > 0 ? (p.nigerianUnderstudies / p.approvedSlots) * 100 : 0;
          return (
            <div key={p.id} style={{ background: "#1A2028", border: "1px solid #2E3742",
              borderRadius: 10, padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#EDEFF2", fontSize: 14, marginBottom: 6 }}>{p.role}</div>
                <div style={{ height: 6, background: "#0F1216", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, progress)}%`, height: "100%", background: "#E6A23C" }} />
                </div>
              </div>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: "#8D97A3",
                whiteSpace: "nowrap" }}>
                {p.nigerianUnderstudies} / {p.approvedSlots} localised
              </div>
              <button onClick={() => removePos(p.id)} style={{
                background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
