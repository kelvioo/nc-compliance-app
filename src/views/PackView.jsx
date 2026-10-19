import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileDown, FileSpreadsheet, Mail, Loader2, CheckCircle2, CircleDashed, PackageCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { friendlyError } from "../lib/errors";
import { getQuarterOptions, nextAnnual60DayDeadline } from "../lib/compliance";
import { currentPeriod, reportById, statusLabel } from "../lib/reports";
import { QUARTERLY_REPORT_IDS, QuarterlyDocTable, quarterlyReportDefs } from "../lib/quarterlyDocs";
import { buildPdf, downloadExcelWorkbook, safeFileName } from "../lib/exporters";
import { Field, inputStyle, btnPrimary, btnGhost, NCDMBDoc } from "../components/ui";
import { AnnualReportDoc } from "./AnnualReportView";
import { useWorkspaceBase } from "../app/base";

const READY = ["approved", "submitted"];
const MAX_UPLOAD = 20 * 1024 * 1024;
const longDate = (d) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
const reportTitle = (id) => { const r = reportById(id); return `${r.name} (Section ${r.section})`; };

// Everything a company files with NCDMB for one period, in one place: which
// reports are approved, a cover letter, and the whole set as a single PDF
// (and Excel workbook) ready to submit. Once every report is approved the
// pack can be saved to Documents and emailed to the company's approvers.
export function PackView({ data, setData, org, submissions, editable, notify, demo = false }) {
  const base = useWorkspaceBase();
  const quarters = getQuarterOptions();
  const annualYear = nextAnnual60DayDeadline(new Date()).getFullYear() - 1;
  const [kind, setKind] = useState("quarterly");
  const [quarterId, setQuarterId] = useState(() => currentPeriod(reportById("forecast")).period);
  const [signatory, setSignatory] = useState(() => ({ name: "", designation: "", address: data.registeredAddress || "", ...(data.packSignatory || {}) }));
  const [busy, setBusy] = useState("");
  const [sentTo, setSentTo] = useState(null);
  const docRefs = useRef({});
  const docsBox = useRef(null);

  const quarter = quarters.find((q) => q.id === quarterId) || quarters[0];
  const period = kind === "quarterly" ? quarter.id : String(annualYear);
  const periodLabel = kind === "quarterly" ? `${quarter.quarterLabel} (${quarter.rangeLabel})` : String(annualYear);
  const due = kind === "quarterly" ? quarter.deadline : nextAnnual60DayDeadline(new Date());
  const defs = useMemo(() => quarterlyReportDefs(data, quarterId), [data, quarterId]);
  const reportIds = kind === "quarterly" ? QUARTERLY_REPORT_IDS : ["annual"];

  const items = reportIds.map((id) => {
    const status = submissions.byKey[`${id}:${period}`]?.status || "draft";
    const entries = kind === "quarterly" ? defs[id].rows.length : null;
    return { id, status, ready: READY.includes(status), entries };
  });
  const readyCount = items.filter((i) => i.ready).length;
  const allReady = readyCount === items.length;
  const ref = `NC/${kind === "quarterly" ? quarter.quarterLabel.replace(" ", "-") : `S60-${annualYear}`}/${(org.ncdmb_reg_no || "").replace(/[^\w-]/g, "") || "001"}`;
  const fileBase = safeFileName(org.name, "NCDMB submission pack", kind === "quarterly" ? quarter.quarterLabel : `NC Performance ${annualYear}`, allReady ? "" : "DRAFT");

  const saveSignatory = async () => {
    if (!editable || demo) return;
    const prev = data.packSignatory || {};
    if (["name", "designation", "address"].some((k) => (prev[k] || "") !== (signatory[k] || ""))) {
      await setData({ ...data, packSignatory: signatory });
    }
  };

  const elements = () => ["cover", ...reportIds].map((id) => docRefs.current[id]).filter(Boolean);

  const run = async (what) => {
    setBusy(what);
    // The reports sit in a collapsible box; open it while exporting so the
    // browser lays them out.
    const wasOpen = docsBox.current?.open;
    if (docsBox.current) docsBox.current.open = true;
    try {
      await saveSignatory();
      if (what === "xlsx") {
        await downloadExcelWorkbook(reportIds.map((id) => ({ el: docRefs.current[id], name: reportById(id).name.replace(" — ", " ") })), fileBase);
      } else {
        const pdf = await buildPdf(elements());
        if (what === "pdf") pdf.save(`${fileBase}.pdf`);
        else await emailPack(pdf);
      }
    } catch (err) {
      console.error(err);
      notify("The pack couldn't be created. Please try again.");
    } finally {
      if (docsBox.current) docsBox.current.open = wasOpen;
      setBusy("");
    }
  };

  const emailPack = async (pdf) => {
    if (demo) {
      notify("In your own workspace the approved pack is saved to Documents and emailed to your approvers.", "success");
      return;
    }
    const blob = pdf.output("blob");
    if (blob.size > MAX_UPLOAD) { notify("The pack is larger than 20 MB, so it can't be emailed. Download it instead."); return; }
    const filePath = `${org.id}/${crypto.randomUUID()}-${fileBase.replace(/[^\w.-]+/g, "_").slice(-80)}.pdf`;
    const { error: upErr } = await supabase.storage.from("documents").upload(filePath, blob, { contentType: "application/pdf" });
    if (upErr) { notify(friendlyError(upErr)); return; }
    const { data: doc, error } = await supabase.from("documents").insert({
      org_id: org.id,
      title: `NCDMB submission pack — ${kind === "quarterly" ? quarter.quarterLabel : `NC Performance Report ${annualYear}`}`,
      category: "submission_pack",
      reference: ref,
      issued_on: new Date().toISOString().slice(0, 10),
      notes: `${items.length} report(s): ${reportIds.map(reportTitle).join("; ")}`,
      file_path: filePath, file_name: `${fileBase}.pdf`, file_size: blob.size,
    }).select("id").single();
    if (error) { notify(friendlyError(error)); return; }
    const { data: res, error: sendErr } = await supabase.functions.invoke("send-email", { body: { type: "pack", documentId: doc.id } });
    if (sendErr || !res?.sent) {
      notify("The pack is saved in Documents, but the email couldn't be sent. You can download it from Documents.");
      return;
    }
    setSentTo(res.recipients);
    notify(`Pack saved to Documents and emailed to ${res.recipients} ${res.recipients === 1 ? "person" : "people"}.`, "success");
  };

  const spin = <Loader2 size={14} className="nc-spin" />;
  const today = longDate(new Date());

  return (
    <div className="nc-main-content nc-premium-page nc-pack">
      <div className="nc-premium-heading">
        <div>
          <span>WORKFLOW</span>
          <h1>Submission pack</h1>
          <p>Everything you file with NCDMB for a period, in one document: a cover letter and every report, ready to sign and submit through NCDMB's portal or official email.</p>
        </div>
        <PackageCheck color="#E6A23C" size={28} />
      </div>

      <div className="nc-pack-controls no-print">
        <Field label="Pack">
          <select style={inputStyle} value={kind} onChange={(e) => { setKind(e.target.value); setSentTo(null); }}>
            <option value="quarterly">Quarterly reports (§18, §24)</option>
            <option value="annual">NC Performance Report (§60)</option>
          </select>
        </Field>
        {kind === "quarterly" && (
          <Field label="Quarter">
            <select style={inputStyle} value={quarterId} onChange={(e) => { setQuarterId(e.target.value); setSentTo(null); }}>
              {quarters.map((q) => <option key={q.id} value={q.id}>{q.quarterLabel} ({q.rangeLabel}) · due {q.deadlineLabel}</option>)}
            </select>
          </Field>
        )}
      </div>

      <h2 className="nc-section-title">1. Reports in this pack</h2>
      <p className="nc-form-help">Due to NCDMB on <strong>{longDate(due)}</strong>. {allReady
        ? "Every report is approved. The pack is ready."
        : `${readyCount} of ${items.length} approved. Send the rest for review and approval before you submit.`}</p>
      <div className="nc-table-card">
        <table className="nc-table">
          <thead><tr><th>Report</th><th>Entries</th><th>Status</th><th /></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.ready ? <CheckCircle2 size={14} color="#4FAE7E" /> : <CircleDashed size={14} color="#8D97A3" />} §{reportById(i.id).section} {reportById(i.id).name}</td>
                <td>{i.entries === null ? "Year summary" : i.entries === 0 ? <span className="nc-muted-sm">None (nil return)</span> : i.entries}</td>
                <td><span className={`nc-status nc-status-${i.status}`}>{statusLabel(i.status)}</span></td>
                <td className="nc-table-actions"><Link className="nc-btn-sm is-ghost" to={`${base}/${i.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="nc-section-title">2. Who signs the cover letter</h2>
      <div className="nc-pack-signatory no-print">
        <Field label="Signatory name">
          <input style={inputStyle} value={signatory.name} placeholder="e.g. Adewale Abubakar" disabled={!editable}
            onChange={(e) => setSignatory({ ...signatory, name: e.target.value })} onBlur={saveSignatory} />
        </Field>
        <Field label="Designation">
          <input style={inputStyle} value={signatory.designation} placeholder="e.g. Nigerian Content Manager" disabled={!editable}
            onChange={(e) => setSignatory({ ...signatory, designation: e.target.value })} onBlur={saveSignatory} />
        </Field>
        <Field label="Company address">
          <input style={inputStyle} value={signatory.address} placeholder="Registered office address" disabled={!editable}
            onChange={(e) => setSignatory({ ...signatory, address: e.target.value })} onBlur={saveSignatory} />
        </Field>
      </div>

      <h2 className="nc-section-title">3. Download or send</h2>
      <div className="nc-export-bar no-print">
        <button style={btnPrimary} disabled={Boolean(busy)} onClick={() => run("pdf")}>
          {busy === "pdf" ? spin : <FileDown size={14} />} {allReady ? "Download pack (PDF)" : "Download draft pack (PDF)"}
        </button>
        <button style={btnGhost} disabled={Boolean(busy)} onClick={() => run("xlsx")}>
          {busy === "xlsx" ? spin : <FileSpreadsheet size={14} />} Download all reports (Excel)
        </button>
        <button style={btnGhost} disabled={Boolean(busy) || !allReady || !editable} onClick={() => run("email")}
          title={allReady ? "" : "Available once every report in the pack is approved"}>
          {busy === "email" ? spin : <Mail size={14} />} Save to Documents & email approvers
        </button>
      </div>
      {!allReady && <p className="nc-form-help">The draft pack is marked <strong>DRAFT</strong>. Emailing the pack unlocks once every report is approved.</p>}
      {sentTo !== null && (
        <p className="nc-pack-next">Sent to {sentTo} {sentTo === 1 ? "person" : "people"} and saved in <Link to={`${base}/documents`}>Documents</Link>. Next: submit it to NCDMB, then open each report and click <strong>Record NCDMB submission</strong> with NCDMB's reference.</p>
      )}

      <h2 className="nc-section-title">4. Preview</h2>
      <div className="nc-pack-preview">
        <div ref={(el) => { docRefs.current.cover = el; }} className="nc-cover-letter">
          {!allReady && <div className="nc-draft-banner">DRAFT: not yet approved for submission</div>}
          <div className="nc-cover-head">
            <strong>{org.name}</strong>
            {signatory.address && <div>{signatory.address}</div>}
            {org.ncdmb_reg_no && <div>NCEC No.: {org.ncdmb_reg_no}</div>}
          </div>
          <div className="nc-cover-meta"><div>Our ref: {ref}</div><div>{today}</div></div>
          <div className="nc-cover-to">
            The Executive Secretary,<br />
            Nigerian Content Development and Monitoring Board (NCDMB),<br />
            Nigerian Content Tower,<br />
            Yenagoa, Bayelsa State.
          </div>
          <p>Dear Sir/Madam,</p>
          <p className="nc-cover-subject">
            {kind === "quarterly"
              ? `SUBMISSION OF QUARTERLY NIGERIAN CONTENT REPORTS: ${quarter.quarterLabel.toUpperCase()}`
              : `SUBMISSION OF NIGERIAN CONTENT PERFORMANCE REPORT (SECTION 60): ${annualYear}`}
          </p>
          <p>
            In compliance with the Nigerian Oil and Gas Industry Content Development Act, 2010, {org.name}
            {org.ncdmb_reg_no ? ` (NCEC No. ${org.ncdmb_reg_no})` : ""} hereby submits the following
            {items.length === 1 ? " report" : " reports"} for {periodLabel}:
          </p>
          <ol>{reportIds.map((id) => <li key={id}>{reportTitle(id)}</li>)}</ol>
          <p>{allReady
            ? "The enclosed reports have been reviewed and approved internally. We trust they meet the Board's requirements and remain available to provide any further information required."
            : "These reports are in preparation and have not yet been approved for submission."}</p>
          <p>Yours faithfully,</p>
          <div className="nc-cover-sign">
            <div className="nc-cover-line" />
            <strong>{signatory.name || "Name of signatory"}</strong>
            <div>{signatory.designation || "Designation"}</div>
            <div>For: {org.name}</div>
          </div>
        </div>

        <details className="nc-pack-docs" ref={docsBox}>
          <summary>Show the {items.length === 1 ? "report" : `${items.length} reports`} in this pack</summary>
          {kind === "quarterly" ? QUARTERLY_REPORT_IDS.map((id) => (
            <div key={id} ref={(el) => { docRefs.current[id] = el; }}>
              <NCDMBDoc title={defs[id].title} companyName={data.name}
                meta={<div><strong>Period of Submission:</strong> {periodLabel}</div>}
                docLabel={`${defs[id].label.split(" — ")[0]} · generated ${today}`}>
                <QuarterlyDocTable report={defs[id]} />
              </NCDMBDoc>
            </div>
          )) : (
            <div ref={(el) => { docRefs.current.annual = el; }}>
              <AnnualReportDoc data={data} year={annualYear} />
            </div>
          )}
        </details>
      </div>
    </div>
  );
}
