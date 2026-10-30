import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { Field, inputStyle, btnPrimary, btnGhost } from "../components/ui";
import { CATS, fmtNaira } from "../lib/compliance";
import { ImportEntries } from "./ImportEntries";

export function EntriesView({ data, setData, editable = true }) {
  const { user } = useAuth();
  const rate = data.exchangeRate || 1600;
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), category: CATS[0].id,
    vendor: "", amount: "", note: "", project: "", addedBy: user?.email || "", currency: "NGN",
  });

  const addEntry = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    const enteredAmount = Number(form.amount);
    const ngnAmount = form.currency === "USD" ? enteredAmount * rate : enteredAmount;
    const entry = {
      id: Date.now().toString(36), ...form,
      amount: ngnAmount, originalAmount: enteredAmount, fxRate: form.currency === "USD" ? rate : null,
    };
    await setData({ ...data, entries: [entry, ...data.entries] });
    setForm({ ...form, vendor: "", amount: "", note: "" });
  };

  const removeEntry = async (id) => {
    await setData({ ...data, entries: data.entries.filter((e) => e.id !== id) });
  };

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 20px" }}>
        <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
          fontSize: 20, color: "#EDEFF2", margin: 0, flex: 1 }}>Spend log</h1>
        {editable && !importing && (
          <button type="button" style={btnGhost} onClick={() => setImporting(true)}>
            <FileSpreadsheet size={15} /> Import from Excel
          </button>
        )}
      </div>

      {importing && (
        <ImportEntries data={data} setData={setData} addedBy={user?.email || ""} onClose={() => setImporting(false)} />
      )}

      <form onSubmit={addEntry} className="nc-form-grid" style={{
        display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 10,
        background: "#1A2028", border: "1px solid #2E3742",
        borderRadius: 10, padding: 16, marginBottom: 22, rowGap: 12,
      }}>
        <Field label="Date">
          <input type="date" style={inputStyle} value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Category">
          <select style={inputStyle} value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Contract / project reference">
          <input style={inputStyle} value={form.project}
            onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Bonga North" />
        </Field>
        <Field label="Vendor / contractor">
          <input style={inputStyle} value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Amount">
          <div style={{ display: "flex", gap: 6 }}>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
              style={{ ...inputStyle, width: 74, flexShrink: 0 }}>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
            <input type="number" min="0" style={inputStyle} value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </div>
          {form.currency === "USD" && form.amount > 0 && (
            <div style={{ fontSize: 11, color: "#8D97A3", marginTop: 4 }}>
              ≈ {fmtNaira(Number(form.amount) * rate)} at ₦{rate.toLocaleString()}/$1
            </div>
          )}
        </Field>
        <Field label="Logged by">
          <input style={inputStyle} value={form.addedBy}
            onChange={(e) => setForm({ ...form, addedBy: e.target.value })} placeholder="Your name" />
        </Field>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <Field label="Note">
              <input style={inputStyle} value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" />
            </Field>
          </div>
          <button type="submit" style={btnPrimary}><Plus size={15} /> Add entry</button>
        </div>
      </form>

      <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
              {["Date", "Category", "Project", "Vendor", "Amount", "Note", "Logged by", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.entries.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>
                No entries yet. Log your first spend item above, or import your spreadsheet with “Import from Excel”.
              </td></tr>
            )}
            {data.entries.map((e) => {
              const cat = CATS.find((c) => c.id === e.category);
              return (
                <tr key={e.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                  <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>{e.date}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ color: cat?.group === "local" ? "#4FAE7E" : "#D9534F" }}>●</span>{" "}
                    {cat?.label}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.project || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{e.vendor || "—"}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace", whiteSpace: "nowrap" }}>
                    {fmtNaira(e.amount)}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3", maxWidth: 160 }}>{e.note || "—"}</td>
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
    </div>
  );
}
