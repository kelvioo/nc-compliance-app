import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { supabase } from "../lib/supabase";
import { friendlyError } from "../lib/errors";
import { DOCUMENT_CATEGORIES, categoryLabel } from "../lib/reports";
import { daysUntil } from "../lib/compliance";
import { Field, inputStyle, btnPrimary, btnGhost } from "../components/ui";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const MAX_BYTES = 20 * 1024 * 1024;
const blank = { title: "", category: "ncec", reference: "", issued_on: "", expires_on: "", notes: "" };

function ExpiryChip({ date }) {
  if (!date) return <span className="nc-chip">No expiry</span>;
  const days = daysUntil(new Date(date), new Date());
  if (days < 0) return <span className="nc-chip is-danger">Expired</span>;
  if (days <= 30) return <span className="nc-chip is-warn">{days} days left</span>;
  return <span className="nc-chip is-ok">Valid</span>;
}

// Certificates, approvals and receipts in one place, with expiry warnings.
export function DocumentsView({ org, editable, notify }) {
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("documents").select("*").eq("org_id", org.id)
      .order("expires_on", { ascending: true, nullsFirst: false });
    if (error) notify(friendlyError(error)); else setDocs(data);
  }, [org.id, notify]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    if (file && file.size > MAX_BYTES) { notify("Files must be 20 MB or smaller."); return; }
    setBusy(true);
    let file_path = null;
    if (file) {
      const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
      file_path = `${org.id}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(file_path, file, { contentType: file.type });
      if (upErr) { notify(friendlyError(upErr)); setBusy(false); return; }
    }
    const { error } = await supabase.from("documents").insert({
      org_id: org.id,
      title: form.title.trim(),
      category: form.category,
      reference: form.reference || null,
      issued_on: form.issued_on || null,
      expires_on: form.expires_on || null,
      notes: form.notes || null,
      file_path, file_name: file?.name ?? null, file_size: file?.size ?? null,
    });
    setBusy(false);
    if (error) { notify(friendlyError(error)); return; }
    setForm(blank); setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    notify("Document saved.", "success");
    load();
  };

  const download = async (doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 120);
    if (error) { notify(friendlyError(error)); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    if (doc.file_path) await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) notify(friendlyError(error)); else load();
  };

  const shown = filter === "all" ? docs : filter === "expiring"
    ? docs.filter((d) => d.expires_on && daysUntil(new Date(d.expires_on), new Date()) <= 30)
    : docs.filter((d) => d.category === filter);

  return (
    <div className="nc-main-content nc-premium-page">
      <div className="nc-premium-heading">
        <div>
          <span>COMPLIANCE RECORDS</span>
          <h1>Documents</h1>
          <p>Keep NCEC certificates, expatriate quota approvals, NCDF receipts and NCDMB acknowledgements in one secure place. We'll email your admins 30 days, 7 days and 1 day before anything expires.</p>
        </div>
      </div>

      {editable && (
        <form onSubmit={save} className="nc-card nc-doc-form">
          <Field label="Title">
            <input style={inputStyle} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. NCEC certificate — Category 2" />
          </Field>
          <Field label="Type">
            <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {DOCUMENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Reference / certificate no.">
            <input style={inputStyle} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
          </Field>
          <Field label="Issued">
            <input style={inputStyle} type="date" value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} />
          </Field>
          <Field label="Expires">
            <input style={inputStyle} type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} />
          </Field>
          <Field label="File (PDF, image, Word or Excel, up to 20 MB)">
            <input ref={fileInput} style={inputStyle} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
          <button style={btnPrimary} type="submit" disabled={busy}><Upload size={16} /> {busy ? "Saving…" : "Save document"}</button>
        </form>
      )}

      <div className="nc-filter-row">
        {[["all", "All"], ["expiring", "Expiring soon"], ...DOCUMENT_CATEGORIES.map((c) => [c.id, c.label])].map(([id, label]) => (
          <button key={id} className={`nc-filter ${filter === id ? "is-active" : ""}`} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      <div className="nc-table-card">
        <table className="nc-table">
          <thead><tr><th>Document</th><th>Type</th><th>Reference</th><th>Expires</th><th>Status</th><th /></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={6} className="nc-muted-sm">No documents here yet.</td></tr>}
            {shown.map((d) => (
              <tr key={d.id}>
                <td><FileText size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />{d.title}</td>
                <td>{categoryLabel(d.category)}</td>
                <td>{d.reference || "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{fmt(d.expires_on)}</td>
                <td><ExpiryChip date={d.expires_on} /></td>
                <td className="nc-table-actions">
                  {d.file_path && <button style={btnGhost} onClick={() => download(d)}><Download size={14} /> Open</button>}
                  {editable && <button style={btnGhost} onClick={() => remove(d)}><Trash2 size={14} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
