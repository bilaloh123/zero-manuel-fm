import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const FiltersContext = createContext(null);

export const PERIOD_OPTIONS = ["today", "week", "month", "season", "year"];

function getPeriodRange(period) {
  const now = new Date();
  const start = new Date(now);
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case "week": {
      const day = (start.getDay() + 6) % 7; // Monday-based
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case "season":
    default:
      return { start: null, end: now };
  }
}

export function FiltersProvider({ children }) {
  const { farmAccess } = useAuth();
  const [farmId, setFarmId] = useState(() => localStorage.getItem("agrimax_farm_id") || "all");
  const [period, setPeriod] = useState(() => localStorage.getItem("agrimax_period") || "month");

  useEffect(() => {
    localStorage.setItem("agrimax_farm_id", farmId);
  }, [farmId]);

  useEffect(() => {
    localStorage.setItem("agrimax_period", period);
  }, [period]);

  useEffect(() => {
    if (farmId === "all") return;
    const stillAllowed = farmAccess.some((row) => row.farm.id === farmId);
    if (!stillAllowed) setFarmId("all");
  }, [farmAccess, farmId]);

  const value = useMemo(
    () => ({
      farms: farmAccess.map((row) => row.farm),
      farmId,
      setFarmId,
      period,
      setPeriod,
      periodRange: getPeriodRange(period),
    }),
    [farmAccess, farmId, period]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within a FiltersProvider");
  return ctx;
}
