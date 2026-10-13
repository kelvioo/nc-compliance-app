export const ROLES = [
  { id: "owner", label: "Owner", description: "Full control, including billing. One per company." },
  { id: "admin", label: "Admin", description: "Manages the team, billing and company settings." },
  { id: "approver", label: "Approver", description: "Signs off reports before submission. Can edit data." },
  { id: "reviewer", label: "Reviewer", description: "Checks figures prepared by the team. Can edit data." },
  { id: "preparer", label: "Preparer", description: "Enters spend, contracts and report data." },
  { id: "viewer", label: "Viewer", description: "Read-only access to dashboards and reports." },
];

export const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;
export const canEdit = (role) => role && role !== "viewer";
export const canManage = (role) => role === "owner" || role === "admin";

export const ORG_TYPES = [
  { id: "operator", label: "Operator / asset owner", description: "IOC, indigenous operator or marginal field owner reporting to NCDMB." },
  { id: "contractor", label: "Contractor / service company", description: "EPC, fabrication, marine, drilling or other oil & gas services." },
  { id: "consultant", label: "Compliance consultant", description: "You prepare NCDMB submissions on behalf of client companies." },
];
