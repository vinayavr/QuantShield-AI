"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithTimeout, getApiBaseUrl, safeJsonParse } from "../utils/utils";

export type BackendHealthState = "checking" | "online" | "offline";

export function useBackendHealth() {
  const [state, setState] = useState<BackendHealthState>("checking");
  const [version, setVersion] = useState("");
  const failCountRef = useRef(0);
  const apiBaseUrl = getApiBaseUrl();

  const check = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(
        `${apiBaseUrl}/health`,
        { cache: "no-store" },
        4000
      );

      if (!res.ok) throw new Error();

      const data = (await safeJsonParse(res)) as
        | { status?: string; version?: string }
        | null;

      if (data?.status === "ok") {
        failCountRef.current = 0;
        setState("online");
        setVersion(data?.version || "");
      } else {
        throw new Error();
      }
    } catch {
      failCountRef.current += 1;

      if (failCountRef.current >= 3) {
        setState("offline");
      }
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    check();
    const interval = setInterval(check, 4000);
    return () => clearInterval(interval);
  }, [check]);

  return {
    state,
    version,
    isOnline: state === "online",
    isOffline: state === "offline",
    isChecking: state === "checking",
    refresh: check,
  };
}
