import ExportBar from "./ExportBar";

export function Gauge_({ pct, target }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const angle = (clamped / 100) * 180;
  const targetAngle = (Math.max(0, Math.min(100, target)) / 100) * 180;
  const r = 90;
  const cx = 130, cy = 120;
  // 0% sits at the left end of the arc, 100% at the right, via the top.
  const toXY = (deg) => {
    const rad = (Math.PI / 180) * deg;
    return [cx - r * Math.cos(rad), cy - r * Math.sin(rad)];
  };
  const [nx, ny] = toXY(angle);
  const [tx, ty] = toXY(targetAngle);
  const status = clamped >= target ? "#4FAE7E" : clamped >= target - 10 ? "#E6A23C" : "#D9534F";

  const arcPath = (from, to, radius) => {
    const [x1, y1] = toXY(from);
    const [x2, y2] = toXY(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg viewBox="0 0 260 170" width="260" height="170" style={{ display: "block", margin: "0 auto" }}>
      <path d={arcPath(0, 180, r)} fill="none" stroke="#3A4552" strokeWidth="16" strokeLinecap="round" />
      {clamped > 0 && (
        <path d={arcPath(0, angle, r)} fill="none" stroke={status} strokeWidth="16" strokeLinecap="round" />
      )}
      <line x1={tx} y1={ty} x2={cx + (tx - cx) * 0.72} y2={cy + (ty - cy) * 0.72}
        stroke="#EDEFF2" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#EDEFF2" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#EDEFF2" strokeWidth="3" strokeLinecap="round" />
      <text x={cx} y={cy + 38} textAnchor="middle" fontFamily="IBM Plex Mono, monospace"
        fontSize="28" fontWeight="700" fill="#FFFFFF">{clamped.toFixed(1)}%</text>
      <text x={cx} y={cy + 58} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif"
        fontSize="11" letterSpacing="1.5" fill="#A6AFB9">NIGERIAN CONTENT</text>
    </svg>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#8D97A3" }}>
      {label}
      {children}
    </label>
  );
}

export const inputStyle = {
  background: "#1A2028", border: "1px solid #2E3742", borderRadius: 6,
  color: "#EDEFF2", padding: "9px 11px", fontSize: 14, fontFamily: "IBM Plex Sans, sans-serif",
  outline: "none",
};

export const btnPrimary = {
  background: "#E6A23C", color: "#1A1103", border: "none", borderRadius: 6,
  padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "IBM Plex Sans, sans-serif",
};

export const btnGhost = {
  background: "transparent", color: "#8D97A3", border: "1px solid #2E3742", borderRadius: 6,
  padding: "9px 16px", fontSize: 13, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "IBM Plex Sans, sans-serif",
};

export function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
      padding: "14px 16px", flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: "#8D97A3", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 18, fontWeight: 600, color: accent }}>
        {value}
      </div>
    </div>
  );
}

// Shared letterhead used across every one of the 15 printable NCDMB reports,
// matching the real templates' layout: centered logo placeholder (left empty
// per instruction — no official NCDMB mark used), board name, rule, gray
// title band, and a form-field block. #printable already flips to white
// background / black text / gray borders at print time (see @media print).
export function NCDMBLetterhead({ reportTitle, sectionRef, fields }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 10 }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", border: "1.5px dashed #5B6470",
          display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
          fontSize: 8, color: "#5B6470", marginBottom: 10, lineHeight: 1.2 }}>
          Company<br />logo
        </div>
        <div style={{ fontFamily: "IBM Plex Sans, sans-serif", fontWeight: 700, fontSize: 14,
          textAlign: "center", letterSpacing: 0.2 }}>
          NIGERIAN CONTENT DEVELOPMENT AND MONITORING BOARD<br />(NCDMB)
        </div>
      </div>
      <div style={{ borderBottom: "1px solid #999", marginBottom: 14 }} />
      <div style={{ background: "#EFEFEF", padding: "14px 16px", textAlign: "center", fontWeight: 700,
        fontSize: 13, marginBottom: 14 }}>
        {reportTitle}
      </div>
      {fields && fields.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {fields.map(([label, value], i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0",
              borderBottom: "1px solid #CCC", fontSize: 12 }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{label}:</div>
              <div>{value || "—"}</div>
            </div>
          ))}
        </div>
      )}
      {sectionRef && (
        <div style={{ fontSize: 10, color: "#5B6470", marginTop: 6 }}>NOGICD Act, 2010 — {sectionRef}</div>
      )}
    </div>
  );
}

export function NCDMBFooter({ docName }) {
  return (
    <div style={{ display: "flex", fontSize: 9, borderTop: "1px solid #999", marginTop: 22, paddingTop: 6 }}>
      <div style={{ flex: 2 }}>Nigerian Content Development and Monitoring Board (NCDMB)</div>
      <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid #999", borderRight: "1px solid #999" }}>
        Prepared via NC Compliance Report
      </div>
      <div style={{ flex: 2, textAlign: "right" }}>{docName}</div>
    </div>
  );
}

export function PlanSectionTitle({ children }) {
  return (
    <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 14, color: "#EDEFF2",
      textTransform: "uppercase", letterSpacing: 1, marginTop: 24, marginBottom: 10,
      borderTop: "1px solid #2E3742", paddingTop: 16 }}>{children}</div>
  );
}

export function PlanRow({ label, value, last }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: last ? 0 : 8 }}>
      <div style={{ color: "#8D97A3", minWidth: 160 }}>{label}</div>
      <div style={{ color: "#EDEFF2" }}>{value}</div>
    </div>
  );
}

export function PlanEmpty() {
  return <div style={{ color: "#5B6470", fontSize: 12, marginBottom: 16 }}>Not yet filled in.</div>;
}

export function PlanTable({ headers, rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
      <thead>
        <tr style={{ color: "#8D97A3", textAlign: "left" }}>
          {headers.map((h) => <th key={h} style={{ padding: "6px 0", fontWeight: 500 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
            {r.map((cell, j) => <td key={j} style={{ padding: "8px 8px 8px 0" }}>{cell || "—"}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function NCDMBDocShell({ title, companyName, meta, docLabel, children, fileName }) {
  const firstLine = String(title).split("\n")[0];
  return (
    <div>
      <ExportBar fileName={fileName || `${companyName || "Company"} - ${firstLine}`} sheetName={firstLine} />
      <div id="printable" style={{ background: "#fff", color: "#111", padding: "40px 44px",
        maxWidth: 800, fontFamily: "'IBM Plex Sans', sans-serif", border: "1px solid #2E3742", borderRadius: 10 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ height: 64, marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>
            NIGERIAN CONTENT DEVELOPMENT AND MONITORING BOARD
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>(NCDMB)</div>
        </div>
        <div style={{ borderTop: "1px solid #999", marginBottom: 10 }} />
        <div style={{ background: "#F1F1F1", padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, textAlign: "center" }}>{title}</div>
        </div>
        <div style={{ fontSize: 12, marginBottom: 16, display: "flex", flexDirection: "column", gap: 4 }}>
          <div><strong>Name of Company:</strong> {companyName}</div>
          {meta}
        </div>

        {children}

        <div style={{ marginTop: 28, display: "flex", fontSize: 9, color: "#444", borderTop: "1px solid #999" }}>
          <div style={{ flex: 1, padding: "4px 8px", borderRight: "1px solid #999" }}>
            Nigerian Content Development and Monitoring Board (NCDMB)
          </div>
          <div style={{ padding: "4px 8px", borderRight: "1px solid #999" }}>Version 1.0</div>
          <div style={{ flex: 1, padding: "4px 8px", textAlign: "right" }}>{docLabel}</div>
        </div>
      </div>
    </div>
  );
}

export function DeadlineBadge({ days }) {
  let color = "#8D97A3", label = `${days} days`;
  if (days < 0) { color = "#D9534F"; label = `${Math.abs(days)} days overdue`; }
  else if (days <= 14) { color = "#D9534F"; label = `${days} days left`; }
  else if (days <= 30) { color = "#E6A23C"; label = `${days} days left`; }
  else { color = "#4FAE7E"; label = `${days} days left`; }
  return (
    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color,
      border: `1px solid ${color}`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

export function SimpleLogTable({ rows, headers, cells, empty }) {
  return (
    <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#0F1216", color: "#8D97A3", textAlign: "left" }}>
            {[...headers, ""].map((h) => (
              <th key={h} style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length + 1} style={{ padding: 20, color: "#5B6470", textAlign: "center" }}>{empty}</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #2E3742", color: "#EDEFF2" }}>
              {cells(r).map((c, i) => <td key={i} style={{ padding: "10px 14px" }}>{c || "—"}</td>)}
              <td style={{ padding: "10px 14px" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FullPageLoader({ label = "Loading…" }) {
  return <div className="nc-fullpage-loader">{label}</div>;
}

export function Brand({ size = 18 }) {
  return (
    <span className="nc-brand">
      <span className="nc-brand-mark" style={{ width: size + 8, height: size + 8 }}>NC</span>
      <span className="nc-brand-name">NC Compliance</span>
    </span>
  );
}
