// NCDMB statutory deadlines for the public deadlines page and the calendar
// file. The same rules the app and reminder emails use: quarterly reports are
// due 30 days before the quarter starts; the §60 report 60 days into the year.

export const QUARTERLY_REPORTS = ["Job Forecast Report (§18)", "Procurement Report — Materials (§24)", "Procurement Report — Services (§24)", "Marine Services Utilization Report (§24)"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function deadlinesFor(year) {
  const rows = [];
  for (let q = 0; q < 4; q++) {
    const start = new Date(year, q * 3, 1);
    const due = new Date(start); due.setDate(due.getDate() - 30);
    rows.push({ key: `${year}-Q${q + 1}`, due, period: `Q${q + 1} ${year} (${MONTH[q * 3]}–${MONTH[q * 3 + 2]} ${year})`, reports: QUARTERLY_REPORTS });
  }
  const annual = new Date(year, 0, 1); annual.setDate(annual.getDate() + 60);
  rows.push({ key: `${year}-S60`, due: annual, period: `Year ${year - 1}`, reports: ["NC Performance Report (§60)"] });
  return rows.sort((a, b) => a.due - b.due);
}

// Deadlines from today through the end of next year.
export function upcomingDeadlines(now = new Date()) {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const y = today.getFullYear();
  return [...deadlinesFor(y), ...deadlinesFor(y + 1), ...deadlinesFor(y + 2)]
    .filter((r) => r.due >= today)
    .slice(0, 10);
}

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// iCalendar lines may be at most 75 bytes; longer ones continue on the next
// line after a space.
function fold(line) {
  const out = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = " " + ch; }
    else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}

// An .ics file with each upcoming deadline as an all-day event and reminders
// 14 and 3 days before. Works with Google Calendar, Outlook and Apple Calendar.
export function deadlinesIcs(now = new Date()) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const events = upcomingDeadlines(now).map((d) => {
    const end = new Date(d.due); end.setDate(end.getDate() + 1);
    const quarterly = d.reports.length > 1;
    const summary = quarterly ? `NCDMB quarterly reports due (${d.period.split(" (")[0]})` : "NCDMB NC Performance Report (§60) due";
    const description = `${d.reports.join("\n")}\nCovers: ${d.period}\n\nAll deadlines: https://nccompliance.com.ng/ncdmb-deadlines\nPrepare the reports with NC Compliance: https://nccompliance.com.ng\n\nAlways confirm dates against current NCDMB guidance. NC Compliance is independent software, not affiliated with NCDMB.`;
    const alarm = (days) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(summary)} in ${days} days`, `TRIGGER:-P${days}D`, "END:VALARM"];
    return [
      "BEGIN:VEVENT",
      `UID:ncdmb-${d.key}@nccompliance.com.ng`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(d.due)}`,
      `DTEND;VALUE=DATE:${ymd(end)}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(description)}`,
      "URL:https://nccompliance.com.ng/ncdmb-deadlines",
      "TRANSP:TRANSPARENT",
      ...alarm(14), ...alarm(3),
      "END:VEVENT",
    ];
  });
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NC Compliance//NCDMB deadlines//EN", "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", "X-WR-CALNAME:NCDMB deadlines (NC Compliance)",
    ...events.flat(), "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}

export function downloadDeadlinesIcs() {
  const blob = new Blob([deadlinesIcs()], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "NCDMB-deadlines.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
