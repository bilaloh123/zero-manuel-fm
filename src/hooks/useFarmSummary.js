import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function dateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function useFarmSummary(farmId, periodRange) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setError(null);

    let harvestQuery = supabase.from("harvest_sessions").select("weight_kg, start_time, farm_id");
    if (farmId !== "all") harvestQuery = harvestQuery.eq("farm_id", farmId);
    if (periodRange.start) harvestQuery = harvestQuery.gte("start_time", periodRange.start.toISOString());
    harvestQuery = harvestQuery.lte("start_time", periodRange.end.toISOString());

    let expenseQuery = supabase.from("expenses").select("amount, expense_date, farm_id");
    if (farmId !== "all") expenseQuery = expenseQuery.eq("farm_id", farmId);
    if (periodRange.start) expenseQuery = expenseQuery.gte("expense_date", dateStr(periodRange.start));
    expenseQuery = expenseQuery.lte("expense_date", dateStr(periodRange.end));

    const isFarmScoped = farmId !== "all";
    let salesQuery = supabase
      .from("sales")
      .select(
        isFarmScoped
          ? "quantity, unit_price, status, sold_at, lots:lot_id!inner(parcels!inner(farm_id))"
          : "quantity, unit_price, status, sold_at, lots:lot_id(parcels(farm_id))"
      )
      .eq("status", "confirmed");
    if (isFarmScoped) salesQuery = salesQuery.eq("lots.parcels.farm_id", farmId);
    salesQuery = salesQuery.gte("sold_at", periodRange.start ? periodRange.start.toISOString() : "1970-01-01");
    salesQuery = salesQuery.lte("sold_at", periodRange.end.toISOString());

    let employeeQuery = supabase.from("employees").select("id, status, farm_id").eq("status", "active");
    if (farmId !== "all") employeeQuery = employeeQuery.eq("farm_id", farmId);

    let vehicleQuery = supabase.from("vehicles").select("id, status, farm_id").neq("status", "out_of_service");
    if (farmId !== "all") vehicleQuery = vehicleQuery.eq("farm_id", farmId);

    const [harvestRes, expenseRes, salesRes, employeeRes, vehicleRes] = await Promise.all([
      harvestQuery,
      expenseQuery,
      salesQuery,
      employeeQuery,
      vehicleQuery,
    ]);

    const firstError =
      harvestRes.error || expenseRes.error || salesRes.error || employeeRes.error || vehicleRes.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }

    const totalProductionKg = (harvestRes.data || []).reduce((s, r) => s + Number(r.weight_kg || 0), 0);
    const totalExpenses = (expenseRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalRevenue = (salesRes.data || []).reduce((s, r) => s + Number(r.quantity) * Number(r.unit_price), 0);

    setData({
      totalProductionKg,
      totalExpenses,
      totalRevenue,
      netMargin: totalRevenue - totalExpenses,
      employeeCount: (employeeRes.data || []).length,
      activeVehicleCount: (vehicleRes.data || []).length,
    });
  }, [farmId, periodRange]);

  useEffect(() => {
    setData(null);
    loadData();
  }, [loadData]);

  return { data, error };
}
