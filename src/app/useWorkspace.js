import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { friendlyError } from "../lib/errors";

// Loads a company's workspace document and saves it back through the
// save_workspace() database function. Every save names the version it was
// based on; if a teammate saved in between, the server rejects it and we
// reload their version instead of silently overwriting it. Saves are queued
// so rapid successive edits apply in order against the latest version.
export function useWorkspace(orgId, { onError } = {}) {
  const [data, setDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const versionRef = useRef(null);
  const queueRef = useRef(Promise.resolve());
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const load = useCallback(async () => {
    if (!orgId) return;
    const { data: row, error } = await supabase
      .from("workspaces").select("data, version").eq("org_id", orgId).single();
    if (error) {
      setLoadError(friendlyError(error));
    } else {
      versionRef.current = row.version;
      setDataState(row.data || {});
      setLoadError(null);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    setLoading(true);
    setDataState(null);
    load();
  }, [load]);

  const save = useCallback((next) => {
    setDataState(next);
    const run = queueRef.current.then(async () => {
      const { data: version, error } = await supabase.rpc("save_workspace", {
        p_org: orgId, p_data: next, p_expected_version: versionRef.current,
      });
      if (error) {
        onErrorRef.current?.(friendlyError(error));
        await load();
        return;
      }
      versionRef.current = version;
    });
    queueRef.current = run.catch(() => {});
    return run;
  }, [orgId, load]);

  return { data, setData: save, loading, loadError, reload: load };
}
