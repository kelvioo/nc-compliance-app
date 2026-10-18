// A realistic, fictional company used by the public demo (/demo). Dates are
// generated relative to today so the demo always shows current quarters,
// upcoming deadlines and recent activity.
import { blankNCPlan, getQuarterOptions } from "./compliance";
import { REPORTS, currentPeriod } from "./reports";

const day = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const ago = (n) => iso(Date.now() - n * day);
const ahead = (n) => iso(Date.now() + n * day);
let seq = 0;
const id = () => `demo${(seq++).toString(36)}`;

export const DEMO_ORG = {
  id: "demo",
  name: "Delta Basin Energy Ltd",
  org_type: "contractor",
  ncdmb_reg_no: "NCEC/2026/04512",
  subscription_status: "trialing",
  trial_ends_at: new Date(Date.now() + 30 * day).toISOString(),
  current_period_end: null,
  plan: "trial",
};

export const DEMO_USER = "ada.okafor@deltabasin.example";

const entry = (daysAgo, category, vendor, amount, project, note = "") => ({
  id: id(), date: ago(daysAgo), category, vendor, amount, originalAmount: amount, fxRate: null,
  currency: "NGN", project, note, addedBy: DEMO_USER,
});

export function sampleData() {
  const [q1, q2] = getQuarterOptions();
  return {
    name: DEMO_ORG.name,
    target: 70,
    exchangeRate: 1600,
    registeredAddress: "14 Trans-Amadi Industrial Layout, Port Harcourt, Rivers State",
    entries: [
      entry(3, "ngLabor", "Payroll — Onne base crew", 48_500_000, "Bonga North tie-back"),
      entry(6, "localServices", "Oando Logistics", 22_750_000, "Bonga North tie-back", "Marine logistics support"),
      entry(9, "localEquip", "Dorman Long Engineering", 61_200_000, "Bonga North tie-back", "Fabricated pipe spools"),
      entry(101, "importEquip", "Schlumberger Oilfield UK", 54_000_000, "Bonga North tie-back", "Subsea control module"),
      entry(66, "expatLabor", "Expatriate payroll", 19_800_000, "Bonga North tie-back"),
      entry(118, "foreignServices", "Wood Group (Aberdeen)", 12_400_000, "Bonga North tie-back", "Design verification"),
      entry(28, "ngLabor", "Payroll — Port Harcourt office", 31_000_000, "General & admin"),
      entry(34, "localServices", "Zenith Insurance", 8_600_000, "General & admin", "Marine & cargo cover"),
      entry(41, "localEquip", "Nigerdock Nigeria", 37_900_000, "Okpokiri well hook-up"),
      entry(47, "localServices", "Bristow Helicopters Nigeria", 26_300_000, "Okpokiri well hook-up"),
      entry(55, "ngLabor", "Payroll — Onne base crew", 46_200_000, "Bonga North tie-back"),
      entry(63, "importEquip", "Cameron (Singapore)", 29_500_000, "Okpokiri well hook-up", "Wellhead valves"),
      entry(72, "localServices", "Aiteo Marine Services", 18_400_000, "Okpokiri well hook-up"),
      entry(84, "ngLabor", "Payroll — Port Harcourt office", 30_400_000, "General & admin"),
      entry(96, "expatLabor", "Expatriate payroll", 18_900_000, "Bonga North tie-back"),
      entry(110, "localEquip", "Nestoil Fabrication Yard", 42_700_000, "Bonga North tie-back"),
    ],
    expatPositions: [
      { id: id(), role: "Subsea Installation Manager", approvedSlots: 2, nigerianUnderstudies: 2 },
      { id: id(), role: "Lead Pipeline Engineer", approvedSlots: 3, nigerianUnderstudies: 2 },
      { id: id(), role: "Offshore Construction Superintendent", approvedSlots: 2, nigerianUnderstudies: 1 },
      { id: id(), role: "Diving Supervisor", approvedSlots: 1, nigerianUnderstudies: 0 },
    ],
    carbonEntries: [
      { id: id(), date: ago(5), fuelType: "diesel", project: "Onne base", quantity: 42_000, addedBy: DEMO_USER },
      { id: id(), date: ago(12), fuelType: "diesel", project: "Support vessels", quantity: 118_000, addedBy: DEMO_USER },
      { id: id(), date: ago(20), fuelType: "electricity", project: "Port Harcourt office", quantity: 38_500, addedBy: DEMO_USER },
      { id: id(), date: ago(35), fuelType: "petrol", project: "Field vehicles", quantity: 9_400, addedBy: DEMO_USER },
      { id: id(), date: ago(48), fuelType: "gasFlared", project: "Okpokiri well test", quantity: 1_200_000, addedBy: DEMO_USER },
    ],
    contracts: [
      contract(q1.id, "Subsea umbilical supply and installation", "TechnipFMC Nigeria", "Contract", "Services", 18_500_000, "Bidding in progress", "Nigerian"),
      contract(q1.id, "Flexible flowlines — 12 km", "Baker Hughes Nigeria", "Contract", "Materials", 7_200_000, "Planned / to be bid", "Foreign"),
      contract(q1.id, "Offshore catering & accommodation", "Integrated Catering Services Ltd", "Subcontract", "Services", 640_000, "Awarded", "Nigerian"),
      contract(q1.id, "Line pipe coating", "Pipecoaters Nigeria Ltd", "Purchase order", "Materials", 820_000, "Awarded", "Nigerian"),
      contract(q1.id, "Crane barge hire (90 days)", "Nigerdock Marine", "Contract", "Services", 2_900_000, "Planned / to be bid", "Nigerian"),
      contract(q2.id, "Pipeline pre-commissioning", "Topline Oilfield Services", "Subcontract", "Services", 1_350_000, "Planned / to be bid", "Nigerian"),
      contract(q2.id, "Valves and actuators", "Emerson (via Nigerian agent)", "Purchase order", "Materials", 460_000, "Planned / to be bid", "Foreign"),
      contract(q2.id, "HSE training — BOSIET / HUET", "Petrolog Training Centre", "Subcontract", "Services", 120_000, "Planned / to be bid", "Nigerian"),
    ],
    marineServices: [
      {
        id: id(), quarter: q1.id, contractorName: "Starz Marine & Engineering", vesselName: "MV Bonny Spirit",
        vesselType: "Anchor handling tug supply", imoNo: "9734561", flagging: "Nigerian", projectName: "Bonga North tie-back",
        typeOfService: "Anchor handling & towing", projectLocation: "OML 118, offshore", contractStart: ago(40), contractEnd: ahead(140),
        spendIncountry: 2_400_000, spendOutcountry: 180_000, nigerianPob: 22, expatriatePob: 3,
        address: "Onne Oil & Gas Free Zone", contactPhone: "+234 803 000 0000", contactEmail: "ops@starzmarine.example",
        nimasaOwnerCert: "NIM/OWN/2291", categorizationStatus: "Category A", nimasaVesselCert: "NIM/VSL/7730",
      },
      {
        id: id(), quarter: q1.id, contractorName: "West African Ventures", vesselName: "MV Ekpe Star",
        vesselType: "Crew boat", imoNo: "9801123", flagging: "Nigerian", projectName: "Okpokiri well hook-up",
        typeOfService: "Crew transfer", projectLocation: "OML 74, shallow water", contractStart: ago(70), contractEnd: ahead(60),
        spendIncountry: 680_000, spendOutcountry: 0, nigerianPob: 9, expatriatePob: 0,
        address: "Port Harcourt", contactPhone: "+234 802 000 0000", contactEmail: "charter@wav.example",
        nimasaOwnerCert: "NIM/OWN/1883", categorizationStatus: "Category B", nimasaVesselCert: "NIM/VSL/6122",
      },
    ],
    ncdf: {
      certificate: { certificateNumber: "NCFCC/2026/1178", issueDate: ago(200), expiryDate: ahead(165) },
      remittances: [
        { id: id(), contractDescription: "Subsea umbilical supply and installation", contractValueUsd: 18_500_000, amountRemitted: 185_000, date: ago(30), reference: "NCDF/REM/88213" },
        { id: id(), contractDescription: "Crane barge hire (90 days)", contractValueUsd: 2_900_000, amountRemitted: 20_000, date: ago(14), reference: "NCDF/REM/88544" },
        { id: id(), contractDescription: "Offshore catering & accommodation", contractValueUsd: 640_000, amountRemitted: 6_400, date: ago(60), reference: "NCDF/REM/87001" },
      ],
    },
    otherStatutory: {
      employmentTrainingPlan: "Train 40 Nigerian technicians in subsea installation and ROV operations over 18 months, with certification through NCDMB-approved centres. Every expatriate role has a named Nigerian understudy.",
      trainingLog: [
        { id: id(), program: "ROV pilot technician course", participants: 12, nigerianParticipants: 12, date: ago(25) },
        { id: id(), program: "Subsea installation supervision", participants: 8, nigerianParticipants: 7, date: ago(60) },
        { id: id(), program: "BOSIET / HUET offshore safety", participants: 46, nigerianParticipants: 44, date: ago(90) },
      ],
      rndPlan: "Local manufacture of subsea clamps with a Port Harcourt fabrication partner.",
      rndLog: [{ id: id(), initiative: "Locally fabricated subsea pipeline clamps", budgetUsd: 250_000, status: "In progress" }],
      techTransferPlan: "Transfer ROV maintenance know-how to a Nigerian partner workshop by end of next year.",
      techTransferLog: [{ id: id(), partner: "Onne Subsea Workshop Ltd", technology: "ROV maintenance & repair", status: "In progress" }],
      legalServices: { firm: "Aluko & Oyebode", notes: "All contract and regulatory legal work handled in Nigeria" },
      insuranceServices: { provider: "Leadway Assurance", notes: "Marine, cargo and liability cover placed with Nigerian insurers" },
      financialServices: { institution: "Zenith Bank Plc", revenueRetentionPct: "100" },
      successionPlans: [
        { id: id(), expatRole: "Subsea Installation Manager", understudyName: "Chinedu Eze", targetDate: ahead(200), progressPct: 70 },
        { id: id(), expatRole: "Lead Pipeline Engineer", understudyName: "Aisha Bello", targetDate: ahead(320), progressPct: 45 },
        { id: id(), expatRole: "Diving Supervisor", understudyName: "Tunde Bakare", targetDate: ahead(420), progressPct: 20 },
      ],
    },
    ncPlan: {
      ...blankNCPlan(),
      projectDescription: "Bonga North subsea tie-back: two production wells tied back to the existing FPSO, including umbilicals, flowlines and topside modifications.",
      assetLocation: "OML 118, deep offshore Niger Delta",
      personnel: [
        { id: id(), discipline: "Subsea engineering", manningLevel: "14", qualification: "B.Eng / M.Eng", certification: "COREN" },
        { id: id(), discipline: "Offshore construction", manningLevel: "62", qualification: "OND / HND", certification: "BOSIET, HUET" },
        { id: id(), discipline: "Project controls", manningLevel: "6", qualification: "B.Sc", certification: "PMP" },
      ],
      procurement: [
        { id: id(), itemDescription: "Subsea trees", category: "longLead", estimatedValueUsd: 24_000_000, sourcingStrategy: "International OEM with in-country assembly" },
        { id: id(), itemDescription: "Pipe spools and structures", category: "exclusive", estimatedValueUsd: 6_500_000, sourcingStrategy: "Nigerian fabrication yards only" },
      ],
      fabrication: [
        { id: id(), location: "Nigerdock, Snake Island", tonnage: 2400, activities: "Manifold and PLET fabrication" },
        { id: id(), location: "Dorman Long, Lagos", tonnage: 900, activities: "Pipe spools and supports" },
      ],
      installationCommissioning: "Installation by Nigerian-flagged vessels where available; pre-commissioning by a Nigerian subcontractor.",
      vessels: [
        { id: id(), vesselType: "Anchor handling tug supply", nigerianOwned: true, operator: "Starz Marine & Engineering" },
        { id: id(), vesselType: "Pipelay / construction vessel", nigerianOwned: false, operator: "International contractor (Nigerian JV)" },
      ],
      contractingStrategy: { awardType: "Open competitive bidding", platform: "NipeX" },
    },
  };
}

function contract(quarter, description, contractor, category, nature, valueUsd, status, origin) {
  return {
    id: id(), quarter, description, contractor, category, nature, estimatedValueUsd: valueUsd, status, origin,
    tenderNumber: `DBE/TND/${Math.floor(1000 + Math.random() * 8999)}`, ittIssuance: ago(30), ittClosure: ahead(15),
    awardDate: status === "Awarded" ? ago(10) : "", remarks: "", ncecNumber: origin === "Nigerian" ? "NCEC/2025/3381" : "",
    nogicJqsId: origin === "Nigerian" ? "JQS-118420" : "", spendIncountry: Math.round(valueUsd * (origin === "Nigerian" ? 0.82 : 0.35)),
    spendOutcountry: Math.round(valueUsd * (origin === "Nigerian" ? 0.18 : 0.65)), quantity: 0, unitsOfMeasurement: "",
    originOfManufacture: origin, serviceType: nature === "Services" ? description : "", materialType: nature === "Materials" ? description : "",
    equipmentDeployed: "", partneringVendor: "", oemName: "", poDate: "", projectOwner: "Delta Basin Energy Ltd", projectTitle: "Bonga North tie-back",
  };
}

// Submission statuses that show the approval workflow at different stages.
export function sampleSubmissions() {
  const at = (n) => new Date(Date.now() - n * 3600000).toISOString();
  const make = (reportId, status, steps) => {
    const r = REPORTS.find((x) => x.id === reportId);
    const { period } = currentPeriod(r);
    return {
      report_key: reportId, period, status, ncdmb_reference: status === "submitted" ? "NCDMB/SUB/2026/04417" : null,
      submitted_on: status === "submitted" ? ago(2) : null, note: null, updated_at: at(steps[steps.length - 1][2]),
      history: steps.map(([s, by, h]) => ({ status: s, by, at: at(h), note: null })),
    };
  };
  return [
    make("forecast", "approved", [["in_review", DEMO_USER, 70], ["reviewed", "emeka.nwosu@deltabasin.example", 40], ["approved", "f.adeyemi@deltabasin.example", 6]]),
    make("procServices", "in_review", [["in_review", DEMO_USER, 20]]),
    make("marine", "submitted", [["in_review", DEMO_USER, 140], ["reviewed", "emeka.nwosu@deltabasin.example", 110], ["approved", "f.adeyemi@deltabasin.example", 90], ["submitted", "f.adeyemi@deltabasin.example", 48]]),
    make("training", "reviewed", [["in_review", DEMO_USER, 50], ["reviewed", "emeka.nwosu@deltabasin.example", 26]]),
  ];
}

export const DEMO_DOCS = [
  { id: "d1", title: "NCEC certificate", category: "ncec", expires_on: ahead(24) },
  { id: "d2", title: "Expatriate quota approval — 2026", category: "expat_quota", expires_on: ahead(52) },
  { id: "d3", title: "NCFCC certificate", category: "ncdf_receipt", expires_on: ahead(165) },
];
