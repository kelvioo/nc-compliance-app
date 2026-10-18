import { Dashboard } from "../views/Dashboard";
import { EntriesView } from "../views/EntriesView";
import { QuotaView } from "../views/QuotaView";
import { NCPlanView } from "../views/NCPlanView";
import { QuarterlyReportsView } from "../views/QuarterlyReportsView";
import { NCDFView } from "../views/NCDFView";
import { AnnualReportView } from "../views/AnnualReportView";
import { OtherStatutoryView } from "../views/OtherStatutoryView";
import { CarbonView } from "../views/CarbonView";
import { ReportView } from "../views/ReportView";
import { OperationsAssuranceView } from "../views/labs/OperationsAssuranceView";
import { MarketplaceView } from "../views/labs/MarketplaceView";

// Experimental modules stay out of the product until they are finished.
export const LABS_ENABLED = import.meta.env.VITE_ENABLE_LABS === "true";

// The data-tracking and report screens, shared by the workspace and the demo.
export const REPORT_VIEWS = {
  dashboard: (p) => <Dashboard {...p} />,
  entries: (p) => <EntriesView {...p} />,
  quota: (p) => <QuotaView {...p} />,
  carbon: (p) => <CarbonView {...p} />,
  report: (p) => <ReportView {...p} />,
  ncplan: (p) => <NCPlanView {...p} />,
  calendar: (p) => <QuarterlyReportsView {...p} />,
  forecast: (p) => <QuarterlyReportsView {...p} lockTab="forecast" />,
  procServices: (p) => <QuarterlyReportsView {...p} lockTab="procServices" />,
  procMaterials: (p) => <QuarterlyReportsView {...p} lockTab="procMaterials" />,
  marine: (p) => <QuarterlyReportsView {...p} lockTab="marine" />,
  ncdf: (p) => <NCDFView {...p} />,
  annual: (p) => <AnnualReportView {...p} />,
  training: (p) => <OtherStatutoryView {...p} lockTab="training" />,
  rnd: (p) => <OtherStatutoryView {...p} lockTab="rnd" />,
  tech: (p) => <OtherStatutoryView {...p} lockTab="tech" />,
  insurance: (p) => <OtherStatutoryView {...p} lockTab="insurance" />,
  legal: (p) => <OtherStatutoryView {...p} lockTab="legal" />,
  financial: (p) => <OtherStatutoryView {...p} lockTab="financial" />,
  succession: (p) => <OtherStatutoryView {...p} lockTab="succession" />,
  ...(LABS_ENABLED ? {
    assurance: (p) => <OperationsAssuranceView {...p} />,
    marketplace: (p) => <MarketplaceView {...p} />,
  } : {}),
};
