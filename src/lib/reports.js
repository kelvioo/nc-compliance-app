import { getQuarterOptions, nextAnnual60DayDeadline } from "./compliance";

// One entry per report screen: plain-language guidance shown at the top of
// the screen, and how its filing period works. Deadlines are only given
// where NCDMB states a rule we can calculate (§18/§24 quarterly, §60
// annual); for the rest we show the period and ask teams to confirm dates.
export const REPORTS = [
  {
    id: "forecast", section: "18", name: "Job Forecast Report", freq: "quarterly-30days",
    what: "Tells NCDMB about contracts, subcontracts and purchase orders worth US$1 million or more that you expect to bid or award next quarter.",
    when: "Quarterly, 30 days before the quarter starts.",
    needs: ["Contract description and scope", "Estimated value (USD)", "Planned bid / award dates", "Contractor, if known"],
    track: "Add contracts in the register below; anything ≥ $1m appears on this report automatically.",
  },
  {
    id: "procServices", section: "24", name: "Procurement Report — Services", freq: "quarterly-30days",
    what: "Lists service contracts and purchase orders below US$1 million planned for next quarter.",
    when: "Quarterly, 30 days before the quarter starts.",
    needs: ["Service contracts under $1m", "Contractor and status", "Estimated value"],
    track: "Add contracts in the register below and mark their nature as Services.",
  },
  {
    id: "procMaterials", section: "24", name: "Procurement Report — Materials", freq: "quarterly-30days",
    what: "Lists materials and equipment purchases below US$1 million planned for next quarter.",
    when: "Quarterly, 30 days before the quarter starts.",
    needs: ["Material / equipment purchases under $1m", "Supplier and status", "Estimated value"],
    track: "Add contracts in the register below and mark their nature as Materials.",
  },
  {
    id: "marine", section: "24", name: "Marine Services Utilization Report", freq: "quarterly-30days",
    what: "Shows the vessels and marine services you use and how much of that capacity is Nigerian-owned.",
    when: "Quarterly, 30 days before the quarter starts.",
    needs: ["Vessel name and type", "Owner / operator and flag", "Days on hire"],
    track: "Log each vessel below as it comes on hire.",
  },
  {
    id: "annual", section: "60", name: "NC Performance Report", freq: "annual-60days",
    what: "Your yearly summary of Nigerian Content performance: spend split, contracts, people and localisation.",
    when: "Within 60 days of the start of each year, covering the year before.",
    needs: ["A full year of spend entries", "Contracts register", "Expatriate positions and understudies"],
    track: "Built automatically from your spend log, contracts and expat quota.",
  },
  {
    id: "training", section: "29", name: "Employment & Training Report", freq: "quarterly",
    what: "Shows how you are employing and training Nigerians, including training programmes and hours.",
    when: "Quarterly. Confirm the exact date with NCDMB.",
    needs: ["Training programmes run", "Number of Nigerians trained", "Hours / cost"],
    track: "Log each programme as it completes.",
  },
  {
    id: "rnd", section: "38/39", name: "Research & Development Report", freq: "quarterly",
    what: "Reports your R&D initiatives in Nigeria and spend on them.",
    when: "Quarterly report; the R&D plan is bi-annual. Confirm dates with NCDMB.",
    needs: ["R&D initiatives", "Partner institutions", "Budget and spend"],
    track: "Log each initiative below.",
  },
  {
    id: "insurance", section: "49", name: "Insurance Services Report", freq: "biannual",
    what: "Shows that insurable risks are placed through Nigerian insurance companies or brokers.",
    when: "Twice a year. Confirm dates with NCDMB.",
    needs: ["Policies and insurers", "Premiums", "Any risks placed offshore, with approval"],
    track: "Record policies below.",
  },
  {
    id: "legal", section: "51", name: "Legal Services Report", freq: "biannual",
    what: "Shows that legal services are retained from Nigerian law firms.",
    when: "Twice a year. Confirm dates with NCDMB.",
    needs: ["Law firms engaged", "Matters and fees"],
    track: "Record engagements below.",
  },
  {
    id: "financial", section: "52", name: "Financial Services Report", freq: "biannual",
    what: "Shows that financial services (banking, etc.) are retained from Nigerian institutions.",
    when: "Twice a year. Confirm dates with NCDMB.",
    needs: ["Banks and financial institutions used", "Services and value"],
    track: "Record institutions below.",
  },
  {
    id: "tech", section: "44/46", name: "Technology Transfer Plan & Report", freq: "annual",
    what: "Describes how you transfer technology and know-how to Nigerian companies and staff.",
    when: "Yearly. Confirm dates with NCDMB.",
    needs: ["Transfer agreements", "Nigerian partners", "Milestones"],
    track: "Log agreements below.",
  },
  {
    id: "succession", section: "33", name: "Succession Plan", freq: "per-expatriate",
    what: "For each approved expatriate position, the plan for a Nigerian understudy to take it over.",
    when: "Per expatriate position, with your quota application or renewal.",
    needs: ["Expatriate position", "Nigerian understudy", "Training and handover timeline"],
    track: "Complete one plan per expatriate position below.",
  },
  {
    id: "ncplan", section: "7", name: "Nigerian Content Plan", freq: "per-project",
    what: "The plan you submit for each project showing how you will give first consideration to Nigerian goods, services and people.",
    when: "Before bidding or starting a project.",
    needs: ["Project description and location", "Personnel plan", "Procurement and fabrication plan", "Vessels and contracting strategy"],
    track: "Fill in each section below; the plan prints in NCDMB's layout.",
  },
  {
    id: "ncdf", section: "104", name: "NCDF & NCFCC", freq: "per-contract",
    what: "Tracks the 1% Nigerian Content Development Fund deduction on contracts and your compliance certificate.",
    when: "On every qualifying contract payment.",
    needs: ["Contracts and values", "1% deductions remitted", "Remittance receipts"],
    track: "Record each remittance below and upload receipts under Documents.",
  },
];

export const reportById = (id) => REPORTS.find((r) => r.id === id);

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The period a report is being prepared for right now, and its due date
// when NCDMB's rule lets us calculate one.
export function currentPeriod(report, now = new Date()) {
  const y = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3) + 1;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  switch (report.freq) {
    case "quarterly-30days": {
      const next = getQuarterOptions().find((o) => o.deadline >= today);
      return { period: next.id, label: next.quarterLabel, due: iso(next.deadline) };
    }
    case "annual-60days": {
      const deadline = nextAnnual60DayDeadline(new Date(now));
      const covers = deadline.getFullYear() - 1;
      return { period: String(covers), label: `${covers}`, due: iso(deadline) };
    }
    case "quarterly":
      return { period: `${y}-Q${q}`, label: `Q${q} ${y}`, due: null };
    case "biannual": {
      const h = now.getMonth() < 6 ? 1 : 2;
      return { period: `${y}-H${h}`, label: `${h === 1 ? "Jan–Jun" : "Jul–Dec"} ${y}`, due: null };
    }
    case "annual":
      return { period: String(y), label: String(y), due: null };
    default:
      return { period: "current", label: "Current", due: null };
  }
}

export const SUBMISSION_STATUSES = [
  { id: "draft", label: "Not started", tone: "muted" },
  { id: "in_review", label: "In review", tone: "amber" },
  { id: "reviewed", label: "Reviewed", tone: "blue" },
  { id: "approved", label: "Approved", tone: "green" },
  { id: "submitted", label: "Submitted to NCDMB", tone: "green" },
];
export const statusLabel = (s) => SUBMISSION_STATUSES.find((x) => x.id === s)?.label || "Not started";

// Which next step each role may take from a given status (mirrors the
// checks in set_submission_status()).
export function nextActions(status, role) {
  const can = (roles) => roles.includes(role);
  const editors = ["owner", "admin", "approver", "reviewer", "preparer"];
  const reviewers = ["owner", "admin", "approver", "reviewer"];
  const approvers = ["owner", "admin", "approver"];
  const s = status || "draft";
  const out = [];
  if (s === "draft" && can(editors)) out.push({ to: "in_review", label: "Send for review" });
  if (s === "in_review" && can(reviewers)) out.push({ to: "reviewed", label: "Mark reviewed" });
  if ((s === "in_review" || s === "reviewed") && can(approvers)) out.push({ to: "approved", label: "Approve" });
  if (s === "approved" && can(approvers)) out.push({ to: "submitted", label: "Record NCDMB submission" });
  if (s !== "draft" && s !== "submitted" && can(editors)) out.push({ to: "draft", label: "Send back", secondary: true });
  return out;
}

export const DOCUMENT_CATEGORIES = [
  { id: "ncec", label: "NCEC / NOGIC JQS certificate" },
  { id: "expat_quota", label: "Expatriate quota approval" },
  { id: "ncdf_receipt", label: "NCDF remittance receipt" },
  { id: "ncplan_approval", label: "NC Plan approval" },
  { id: "submission_ack", label: "NCDMB submission acknowledgement" },
  { id: "contractor_cert", label: "Contractor's NCEC certificate" },
  { id: "insurance", label: "Insurance certificate" },
  { id: "other", label: "Other" },
];
export const categoryLabel = (id) => DOCUMENT_CATEGORIES.find((c) => c.id === id)?.label || "Other";
