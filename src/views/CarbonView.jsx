import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Plus, Trash2 } from "lucide-react";
import { Field, inputStyle, btnPrimary } from "../components/ui";
import { FUEL_TYPES, calcCarbon } from "../lib/compliance";

export function CarbonView({ data, setData }) {
  const { user } = useAuth();
  const carbonEntries = data.carbonEntries || [];
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), fuelType: FUEL_TYPES[0].id,
    project: "", quantity: "", addedBy: user?.email || "",
  });
  const { totals, totalCo2e } = calcCarbon(carbonEntries);

  const addEntry = async (e) => {
    e.preventDefault();
    if (!form.quantity || Number(form.quantity) <= 0) return;
    const entry = { id: Date.now().toString(36), ...form, quantity: Number(form.quantity) };
    await setData({ ...data, carbonEntries: [entry, ...carbonEntries] });
    setForm({ ...form, quantity: "" });
  };

  const removeEntry = async (id) => {
    await setData({ ...data, carbonEntries: carbonEntries.filter((e) => e.id !== id) });
  };

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Carbon intensity</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px" }}>
        Track fuel, flaring, and electricity consumption by asset, converted to an estimated CO2e footprint.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
          padding: "16px 20px", minWidth: 220 }}>
          <div style={{ fontSize: 11, color: "#8D97A3", marginBottom: 6 }}>ESTIMATED TOTAL EMISSIONS</div>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 22, fontWeight: 700, color: "#4FAE7E" }}>
            {(totalCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t CO2e
          </div>
        </div>
        {FUEL_TYPES.map((f) => (
          <div key={f.id} style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
            padding: "16px 20px", minWidth: 170 }}>
            <div style={{ fontSize: 11, color: "#8D97A3", marginBottom: 6 }}>{f.label.toUpperCase()}</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 15, color: "#EDEFF2" }}>
              {totals[f.id].quantity.toLocaleString()} {f.unit}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addEntry} className="nc-form-grid" style={{
        display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 10,
        background: "#1A2028", border: "1px solid #2E3742",
        borderRadius: 10, padding: 16, marginBottom: 22, rowGap: 12,
      }}>
        <Field label="Date">
          <input type="date" style={inputStyle} value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Fuel / energy type">
          <select style={inputStyle} value={form.fuelType}
            onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
            {FUEL_TYPES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="Asset / project">
          <input style={inputStyle} value={form.project}
            onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Bonga North" />
        </Field>
        <Field label={`Quantity (${FUEL_TYPES.find((f) => f.id === form.fuelType)?.unit || ""})`}>
          <input type="number" min="0" style={inputStyle} value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Logged by">
          <input style={inputStyle} value={form.addedBy}
            onChange={(e) => setForm({ ...form, addedBy: e.target.value })} placeholder="Your name" />
        </Field>
        <div style={{ display: "flex", alignItems: "end" }}>
          <button type="submit" style={btnPrimary}><Plus size={15} /> Add entry</button>
        </div>
      </form>

      <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
              {["Date", "Type", "Asset", "Quantity", "Est. CO2e", "Logged by", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carbonEntries.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>
                No entries yet. Log fuel, flaring, or electricity use above.
              </td></tr>
            )}
            {carbonEntries.map((e) => {
              const fuel = FUEL_TYPES.find((f) => f.id === e.fuelType);
              const co2e = Number(e.quantity || 0) * (fuel?.factor || 0);
              return (
                <tr key={e.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                  <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>{e.date}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{fuel?.label}</td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.project || "—"}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace" }}>
                    {Number(e.quantity).toLocaleString()} {fuel?.unit}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace", color: "#4FAE7E" }}>
                    {co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                  </td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.addedBy || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => removeEntry(e.id)} style={{
                      background: "none", border: "none", color: "#5B6470", cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "#5B6470", marginTop: 10 }}>
        Emission factors used are indicative industry defaults for internal tracking only. Validate against
        NUPRC/NCDMB-approved methodology before external or regulatory reporting.
      </div>
    </div>
  );
}
