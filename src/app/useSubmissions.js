import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { friendlyError } from "../lib/errors";

// Submission statuses for a company, keyed "<report>:<period>".
export function useSubmissions(orgId, notify) {
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase.from("submissions")
      .select("report_key, period, status, ncdmb_reference, submitted_on, note, history, updated_at")
      .eq("org_id", orgId);
    if (error) { notify?.(friendlyError(error)); setRows([]); return; }
    setRows(data);
  }, [orgId, notify]);

  useEffect(() => { load(); }, [load]);

  const byKey = Object.fromEntries((rows || []).map((r) => [`${r.report_key}:${r.period}`, r]));

  const setStatus = useCallback(async (report, period, status, extra = {}) => {
    const { error } = await supabase.rpc("set_submission_status", {
      p_org: orgId, p_report: report, p_period: period, p_status: status,
      p_reference: extra.reference ?? null, p_submitted_on: extra.submittedOn ?? null, p_note: extra.note ?? null,
    });
    if (error) { notify?.(friendlyError(error)); return false; }
    await load();
    return true;
  }, [orgId, notify, load]);

  return { rows, byKey, loading: rows === null, setStatus, reload: load };
}
