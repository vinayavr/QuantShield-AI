"use client";

import { useEffect, useState } from "react";
import type { RecommendResponse } from "../types/types";
import { getStoredInvestmentData } from "../utils/utils";

export function useStoredRecommendation() {
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(getStoredInvestmentData());
    setHydrated(true);
  }, []);

  return { data, hydrated };
}
