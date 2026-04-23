"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithTimeout, getApiBaseUrl } from "../utils/utils";

type HealthResponse = {
  status?: string;
  version?: string;
};

export type BackendHealthState = "checking" | "online" | "offline";

export function useBackendHealth() {
  const [state, setState] = useState<BackendHealthState>("checking");
  const [version, setVersion] = useState("");

  // ✅ FIX: use browser-safe type
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetchWithTimeout(
        `${getApiBaseUrl()}/health`,
        {
          method: "GET",
          cache: "no-store",
        },
        5000 // ⏱️ timeout
      );

      if (!response.ok) throw new Error("Health check failed");

      const payload = (await response.json()) as HealthResponse;

      if (payload.status === "healthy") {
        setState("online");
        setVersion(payload.version ?? "");
      } else {
        setState("offline");
        setVersion("");
      }
    } catch {
      setState("offline");
      setVersion("");
    }
  }, []);

  useEffect(() => {
    // 🔥 initial check
    checkHealth();

    // 🔁 polling every 10 seconds
    intervalRef.current = setInterval(checkHealth, 10000);

    // 🧹 cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkHealth]);

  return {
    state,
    version,
    refresh: checkHealth,
    isOnline: state === "online",
    isChecking: state === "checking",
    isOffline: state === "offline",
  };
}