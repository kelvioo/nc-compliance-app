import { createContext, useContext } from "react";

// Where workspace links point: "/app" for real companies, "/demo" for the
// public demo. Shared components build their links from this.
export const WorkspaceBase = createContext("/app");
export const useWorkspaceBase = () => useContext(WorkspaceBase);
