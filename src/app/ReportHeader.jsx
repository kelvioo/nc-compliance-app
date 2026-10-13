import { useState } from "react";
import { ChevronDown, ChevronUp, Info, Send, CheckCircle2, History } from "lucide-react";
import { reportById, currentPeriod, statusLabel, nextActions } from "../lib/reports";
import { daysUntil } from "../lib/compliance";
import { DeadlineBadge } from "../components/ui";

const GUIDE_KEY = "nc_guides_hidden";
const readHidden = () => { try { return JSON.parse(localStorage.getItem(GUIDE_KEY) || "[]"); } catch { return []; } };

const fmt = (d) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

// Shown above every report screen: what the report is in plain language,
// and where this period's submission stands in the review workflow.
export function ReportHeader({ reportId, role, submissions, editable, notify }) {
  const report = reportById(reportId);
  const [hidden, setHidden] = useState(readHidden);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ reference: "", submittedOn: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  if (!report) return null;

  const { period, label, due } = currentPeriod(report);
  const row = submissions.byKey[`${report.id}:${period}`];
  const status = row?.status || "draft";
  const collapsed = hidden.includes(report.id);
  const tracksSubmission = !["ncdf"].includes(report.id);

  const toggleGuide = () => {
    const next = collapsed ? hidden.filter((h) => h !== report.id) : [...hidden, report.id];
    setHidden(next);
    try { localStorage.setItem(GUIDE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };

  const act = async (to) => {
    if (!editable) { notify("Your role or plan doesn't allow changes right now."); return; }
    if (to === "submitted") { setSubmitting(true); return; }
    setBusy(true);
    const ok = await submissions.setStatus(report.id, period, to);
    setBusy(false);
    if (ok) notify(`${report.name} for ${label}: ${statusLabel(to)}.`, "success");
  };

  const recordSubmission = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await submissions.setStatus(report.id, period, "submitted", form);
    setBusy(false);
    if (ok) { setSubmitting(false); notify(`Recorded as submitted to NCDMB.`, "success"); }
  };

  const actions = editable ? nextActions(status, role) : [];

  return (
    <div className="nc-report-header no-print">
      <div className="nc-guide">
        <button className="nc-guide-toggle" onClick={toggleGuide} aria-expanded={!collapsed}>
          <Info size={15} />
          <span><strong>§{report.section} {report.name}</strong> — {collapsed ? "show guide" : "what this is and what you need"}</span>
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
        {!collapsed && (
          <div className="nc-guide-body">
            <div><h4>What it is</h4><p>{report.what}</p></div>
            <div><h4>When it's due</h4><p>{report.when}</p></div>
            <div><h4>What you'll need</h4><ul>{report.needs.map((n) => <li key={n}>{n}</li>)}</ul></div>
            <div><h4>How to do it here</h4><p>{report.track} When it's ready, send it for review using the bar below.</p></div>
          </div>
        )}
      </div>

      {tracksSubmission && (
        <div className="nc-submission-bar">
          <div className="nc-submission-meta">
            <span className="nc-eyebrow-sm">Submission for {label}</span>
            <span className={`nc-status nc-status-${status}`}>{statusLabel(status)}</span>
            {due && status !== "submitted" && <DeadlineBadge days={daysUntil(new Date(due), new Date())} />}
            {due && <span className="nc-muted-sm">Due {fmt(due)}</span>}
            {row?.ncdmb_reference && <span className="nc-muted-sm">NCDMB ref: <strong>{row.ncdmb_reference}</strong></span>}
          </div>
          <div className="nc-submission-actions">
            {actions.map((a) => (
              <button key={a.to} className={a.secondary ? "nc-btn-sm is-ghost" : "nc-btn-sm"} disabled={busy} onClick={() => act(a.to)}>
                {a.to === "submitted" ? <Send size={13} /> : a.to === "approved" ? <CheckCircle2 size={13} /> : null}
                {a.label}
              </button>
            ))}
            {row?.history?.length > 0 && (
              <button className="nc-btn-sm is-ghost" onClick={() => setShowHistory((s) => !s)}><History size={13} /> History</button>
            )}
          </div>
          {submitting && (
            <form className="nc-submit-form" onSubmit={recordSubmission}>
              <label>NCDMB reference / acknowledgement no.
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
              </label>
              <label>Date submitted
                <input type="date" required value={form.submittedOn} onChange={(e) => setForm({ ...form, submittedOn: e.target.value })} />
              </label>
              <button className="nc-btn-sm" type="submit" disabled={busy}>Save</button>
              <button className="nc-btn-sm is-ghost" type="button" onClick={() => setSubmitting(false)}>Cancel</button>
            </form>
          )}
          {showHistory && row?.history?.length > 0 && (
            <ol className="nc-history">
              {[...row.history].reverse().map((h, i) => (
                <li key={i}><strong>{statusLabel(h.status)}</strong> by {h.by || "someone"} · {new Date(h.at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}{h.note ? ` — ${h.note}` : ""}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
