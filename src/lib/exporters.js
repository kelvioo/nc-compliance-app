// One-click PDF and Excel downloads of a rendered report (the #printable
// element). The libraries are loaded only when someone downloads, so they
// don't slow down the app.

const NUMERIC = /^\(?[-–]?\s*[₦$€£]?\s*[\d,]+(\.\d+)?\s*%?\)?$/;

export function safeFileName(...parts) {
  return parts.filter(Boolean).join(" - ")
    .replace(/§\s*/g, "Section ")
    .replace(/[^\p{L}\p{N} ()&,.'_-]+/gu, " ")
    .replace(/\s+/g, " ").trim().slice(0, 150);
}

// Copies the report into an off-screen white page, the same look as the
// printed version, so dark on-screen panels still export as a clean document.
function whiteCopy(el) {
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;background:#fff;";
  const copy = el.cloneNode(true);
  copy.removeAttribute("id");
  copy.classList.add("nc-export-page");
  copy.querySelectorAll(".no-print").forEach((n) => n.remove());
  holder.appendChild(copy);
  document.body.appendChild(holder);
  // Wide tables (the 12-column procurement templates) don't fit 800px; widen
  // the page to fit them so no column is cut off. The PDF scales it to A4.
  [copy, ...copy.querySelectorAll("[style*='max-width']")].forEach((n) => { n.style.maxWidth = "none"; });
  for (let i = 0; i < 6; i++) {
    const overflow = Math.max(0, ...[copy, ...copy.querySelectorAll("div")].map((n) => n.scrollWidth - n.clientWidth));
    if (overflow <= 1) break;
    holder.style.width = `${holder.offsetWidth + overflow}px`;
  }
  // Dark on-screen panels become white; light fills (table headers) stay.
  [copy, ...copy.querySelectorAll("*")].forEach((n) => {
    const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
    if (m && (m[3] === undefined || Number(m[3]) > 0) && (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3 < 140) {
      n.style.backgroundColor = "#ffffff";
    }
  });
  return { node: copy, done: () => holder.remove() };
}

// Renders one or more report elements into an A4 PDF; each element starts
// on a new page.
export async function buildPdf(elements) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  await document.fonts?.ready;
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const margin = 28;
  const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
  let first = true;
  for (const el of elements) {
    const { node, done } = whiteCopy(el);
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const pxPerPt = canvas.width / pageW;
      const sliceH = Math.floor(pageH * pxPerPt);

      // Cut the tall image into A4 pages, preferring to break on a white row
      // so text lines aren't split across pages.
      const ctx = canvas.getContext("2d");
      let y = 0;
      while (y < canvas.height) {
        let h = Math.min(sliceH, canvas.height - y);
        if (y + h < canvas.height) h = findWhiteRow(ctx, canvas.width, y + h, Math.floor(h * 0.2)) - y;
        const page = document.createElement("canvas");
        page.width = canvas.width;
        page.height = h;
        page.getContext("2d").drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!first) pdf.addPage();
        first = false;
        pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, pageW, h / pxPerPt);
        y += h;
      }
    } finally {
      done();
    }
  }
  return pdf;
}

export async function downloadPdf(el, fileName) {
  (await buildPdf([el])).save(`${fileName}.pdf`);
}

function findWhiteRow(ctx, width, fromY, maxBack) {
  for (let y = fromY; y > fromY - maxBack; y--) {
    const row = ctx.getImageData(0, y, width, 1).data;
    let white = true;
    for (let i = 0; i < row.length; i += 16) {
      if (row[i] < 245 || row[i + 1] < 245 || row[i + 2] < 245) { white = false; break; }
    }
    if (white) return y;
  }
  return fromY;
}

function cell(text, bold) {
  const value = text.replace(/\s+/g, " ").trim();
  if (value && NUMERIC.test(value)) {
    const negative = /^\(|[-–]/.test(value);
    const n = Number(value.replace(/[^\d.]/g, ""));
    if (!Number.isNaN(n)) {
      const isPercent = value.includes("%");
      return { value: (negative ? -n : n) / (isPercent ? 100 : 1), type: Number, format: isPercent ? "0.0%" : "#,##0.##", fontWeight: bold ? "bold" : undefined };
    }
  }
  return { value, type: String, fontWeight: bold ? "bold" : undefined, wrap: true };
}

// Turns a report into spreadsheet rows: the title and details at the top,
// then every table in the report (with its heading), numbers kept as numbers.
function sheetFor(el, sheetName) {
  const rows = [];
  const blank = () => rows.push([null]);
  let widest = 1;

  const walk = (node) => {
    if (node.nodeType !== 1 || node.classList.contains("no-print")) return;
    if (node.tagName === "TABLE") {
      if (rows.length) blank();
      node.querySelectorAll("tr").forEach((tr) => {
        const header = tr.parentElement.tagName === "THEAD" || [...tr.children].every((c) => c.tagName === "TH");
        const out = [];
        [...tr.children].forEach((td) => {
          out.push(cell(td.innerText, header));
          for (let i = 1; i < (td.colSpan || 1); i++) out.push(null);
        });
        widest = Math.max(widest, out.length);
        rows.push(out);
      });
      blank();
      return;
    }
    const isBlock = /^(DIV|P|H[1-6]|LI|SECTION)$/.test(node.tagName);
    const hasBlockChildren = [...node.children].some((c) => /^(DIV|P|H[1-6]|TABLE|UL|OL|SECTION)$/.test(c.tagName));
    if (isBlock && !hasBlockChildren) {
      const text = node.innerText.replace(/\s+\n/g, "\n").trim();
      const bold = /^H[1-6]$/.test(node.tagName) || Boolean(node.querySelector("strong, b"));
      text.split("\n").forEach((line, i) => line.trim() && rows.push([cell(line, bold && i === 0)]));
      return;
    }
    [...node.children].forEach(walk);
  };
  walk(el);
  while (rows.length && rows[rows.length - 1][0] === null && rows[rows.length - 1].length === 1) rows.pop();

  const columns = Array.from({ length: widest }, (_, i) => ({ width: i === 0 ? 34 : 20 }));
  return { data: rows, sheet: sheetName.slice(0, 31).replace(/[\\/?*[\]:]/g, " "), columns };
}

export async function downloadExcel(el, fileName, sheetName = "Report") {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const { data, ...options } = sheetFor(el, sheetName);
  await writeXlsxFile(data, options).toFile(`${fileName}.xlsx`);
}

// One workbook with a sheet per report, for the submission pack.
export async function downloadExcelWorkbook(sheets, fileName) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const used = new Set();
  const all = sheets.map(({ el, name }) => {
    const sheet = sheetFor(el, name);
    let unique = sheet.sheet;
    for (let n = 2; used.has(unique.toLowerCase()); n++) unique = `${sheet.sheet.slice(0, 27)} (${n})`;
    used.add(unique.toLowerCase());
    return { ...sheet, sheet: unique };
  });
  await writeXlsxFile(all).toFile(`${fileName}.xlsx`);
}
