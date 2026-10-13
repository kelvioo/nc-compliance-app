import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, inputStyle, btnPrimary, NCDMBDocShell, DeadlineBadge } from "../components/ui";
import { daysUntil } from "../lib/compliance";

// Section 104 of the NOGICD Act: 1% of the value of every upstream contract
// goes to the Nigeria Content Development Fund. A valid NCFCC (NCDF
// Compliance Certificate) is now a precondition for NCDMB approvals,
// certifications, and clearances (including the NCEC).
export function NCDFView({ data, setData }) {
  const ncdf = data.ncdf || { remittances: [], certificate: {} };
  const [form, setForm] = useState({
    contractDescription: "", contractValueUsd: "", amountRemitted: "", date: new Date().toISOString().slice(0, 10),
    reference: "",
  });
  const [cert, setCert] = useState({
    certificateNumber: ncdf.certificate?.certificateNumber || "",
    issueDate: ncdf.certificate?.issueDate || "",
    expiryDate: ncdf.certificate?.expiryDate || "",
  });

  const addRemittance = async (e) => {
    e.preventDefault();
    if (!form.contractDescription.trim()) return;
    const row = { id: Date.now().toString(36), ...form,
      contractValueUsd: Number(form.contractValueUsd || 0), amountRemitted: Number(form.amountRemitted || 0) };
    await setData({ ...data, ncdf: { ...ncdf, remittances: [row, ...ncdf.remittances] } });
    setForm({ ...form, contractDescription: "", contractValueUsd: "", amountRemitted: "", reference: "" });
  };
  const removeRemittance = async (id) => {
    await setData({ ...data, ncdf: { ...ncdf, remittances: ncdf.remittances.filter((r) => r.id !== id) } });
  };
  const saveCert = async () => {
    await setData({ ...data, ncdf: { ...ncdf, certificate: cert } });
  };

  const expiry = cert.expiryDate ? new Date(cert.expiryDate + "T00:00:00") : null;
  const expiryDays = expiry ? daysUntil(new Date(expiry), new Date()) : null;

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>NCDF & NCFCC</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 20px", maxWidth: 640 }}>
        Track the mandatory 1% Nigeria Content Development Fund levy on upstream contracts (§104), and
        your Compliance Certificate — now a precondition for NCDMB approvals, certifications, and clearances.
      </p>

      <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
        padding: 20, marginBottom: 22, maxWidth: 620 }}>
        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, color: "#EDEFF2",
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>NCFCC status</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Certificate number">
            <input style={inputStyle} value={cert.certificateNumber}
              onChange={(e) => setCert({ ...cert, certificateNumber: e.target.value })} onBlur={saveCert} />
          </Field>
          <Field label="Issue date">
            <input type="date" style={inputStyle} value={cert.issueDate}
              onChange={(e) => setCert({ ...cert, issueDate: e.target.value })} onBlur={saveCert} />
          </Field>
          <Field label="Expiry date">
            <input type="date" style={inputStyle} value={cert.expiryDate}
              onChange={(e) => setCert({ ...cert, expiryDate: e.target.value })} onBlur={saveCert} />
          </Field>
        </div>
        {expiryDays !== null && <DeadlineBadge days={expiryDays} />}
        {expiryDays === null && (
          <div style={{ fontSize: 12, color: "#5B6470" }}>Enter your certificate's expiry date to track it here.</div>
        )}
      </div>

      <form onSubmit={addRemittance} className="nc-form-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10,
        background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16, marginBottom: 22, rowGap: 12,
      }}>
        <Field label="Contract description">
          <input style={inputStyle} value={form.contractDescription}
            onChange={(e) => setForm({ ...form, contractDescription: e.target.value })} />
        </Field>
        <Field label="Contract value (USD)">
          <input type="number" min="0" style={inputStyle} value={form.contractValueUsd}
            onChange={(e) => setForm({ ...form, contractValueUsd: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Amount remitted (USD)">
          <input type="number" min="0" style={inputStyle} value={form.amountRemitted}
            onChange={(e) => setForm({ ...form, amountRemitted: e.target.value })}
            placeholder={form.contractValueUsd ? (Number(form.contractValueUsd) * 0.01).toLocaleString() : "0"} />
        </Field>
        <Field label="Payment reference">
          <input style={inputStyle} value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Date">
          <input type="date" style={inputStyle} value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" style={btnPrimary}><Plus size={15} /> Log remittance</button>
        </div>
      </form>

      <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
              {["Contract", "Contract value", "1% due", "Remitted", "Status", "Reference", "Date", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ncdf.remittances.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>
                No remittances logged yet.
              </td></tr>
            )}
            {ncdf.remittances.map((r) => {
              const due = r.contractValueUsd * 0.01;
              const short = r.amountRemitted < due;
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
                  <td style={{ padding: "10px 14px" }}>{r.contractDescription}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace" }}>
                    ${Number(r.contractValueUsd).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace", color: "#8D97A3" }}>
                    ${due.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono, monospace" }}>
                    ${Number(r.amountRemitted).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", color: short ? "#D9534F" : "#4FAE7E", whiteSpace: "nowrap" }}>
                    {short ? "Short-paid" : "Fully remitted"}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3" }}>{r.reference || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#8D97A3", whiteSpace: "nowrap" }}>{r.date}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => removeRemittance(r.id)} style={{
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

      <NCDMBDocShell title={"NCDF COMPLIANCE STATUS\n(Section 104 — 1% Nigeria Content Development Fund)"}
        companyName={data.name}
        csv={{ filename: "ncdf-remittances.csv", headers: ["Contract", "Contract Value (USD)", "1% Due", "Remitted", "Status", "Reference", "Date"],
          rows: ncdf.remittances.map((r) => [r.contractDescription, r.contractValueUsd, r.contractValueUsd * 0.01, r.amountRemitted,
            r.amountRemitted < r.contractValueUsd * 0.01 ? "Short-paid" : "Fully remitted", r.reference, r.date]) }}
        meta={<>
          <div><strong>NCFCC Certificate No.:</strong> {cert.certificateNumber || "—"}</div>
          <div><strong>Issue Date:</strong> {cert.issueDate || "—"} &nbsp; <strong>Expiry Date:</strong> {cert.expiryDate || "—"}</div>
        </>}
        docLabel={`Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}`}
      >
        {ncdf.remittances.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 12, border: "1px dashed #ccc" }}>
            No remittances logged yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["S/N", "Contract", "Contract Value (USD)", "1% Due (USD)", "Remitted (USD)", "Status", "Reference", "Date"].map((h) => (
                  <th key={h} style={{ border: "1px solid #999", padding: "6px 8px", background: "#F1F1F1", textAlign: "left", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ncdf.remittances.map((r, i) => {
                const due = r.contractValueUsd * 0.01;
                const short = r.amountRemitted < due;
                return (
                  <tr key={r.id}>
                    <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{i + 1}</td>
                    <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.contractDescription}</td>
                    <td style={{ border: "1px solid #999", padding: "6px 8px" }}>${Number(r.contractValueUsd).toLocaleString()}</td>
                    <td style={{ border: "1px solid #999", padding: "6px 8px" }}>${due.toLocaleString()}</td>
                    <td style={{ border: "1px solid #999", padding: "6px 8px" }}>${Number(r.amountRemitted).toLocaleString()}</td>
                    <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{short ? "Short-paid" : "Fully remitted"}</td>
                    <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.reference || "—"}</td>
                    <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{r.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </NCDMBDocShell>
    </div>
  );
}
