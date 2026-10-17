import { useState } from "react";
import { FileDown, FileSpreadsheet, Printer, Loader2 } from "lucide-react";
import { btnPrimary, btnGhost } from "./ui";
import { downloadExcel, downloadPdf, safeFileName } from "../lib/exporters";

// Download PDF / Download Excel / Print for the report rendered in #printable.
export default function ExportBar({ fileName, sheetName, targetId = "printable" }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const name = safeFileName(fileName) || "NC Compliance report";

  const run = async (kind) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setBusy(kind);
    setError("");
    try {
      if (kind === "pdf") await downloadPdf(el, name);
      else await downloadExcel(el, name, sheetName);
    } catch (err) {
      console.error(err);
      setError("The download didn't work. Please try again, or use Print → Save as PDF.");
    } finally {
      setBusy(null);
    }
  };

  const spin = <Loader2 size={14} className="nc-spin" />;
  return (
    <div className="no-print nc-export-bar">
      <button onClick={() => run("pdf")} style={btnPrimary} disabled={Boolean(busy)}>
        {busy === "pdf" ? spin : <FileDown size={14} />} Download PDF
      </button>
      <button onClick={() => run("xlsx")} style={btnGhost} disabled={Boolean(busy)}>
        {busy === "xlsx" ? spin : <FileSpreadsheet size={14} />} Download Excel
      </button>
      <button onClick={() => window.print()} style={btnGhost} disabled={Boolean(busy)}>
        <Printer size={14} /> Print
      </button>
      {error && <span className="nc-export-error">{error}</span>}
    </div>
  );
}
