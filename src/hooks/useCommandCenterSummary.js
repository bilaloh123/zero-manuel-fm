import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { computeBudgetComparison } from "../lib/budgetCalculations";

const TRANSFER_CLOSED_STATUSES = "(received,closed,cancelled)";
const PO_PENDING_STATUSES = ["draft", "pending_approval", "approved", "confirmed"];

function dateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function useCommandCenterSummary(farmId, periodRange) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setError(null);
    const isFarmScoped = farmId !== "all";
    const { start: todayStart, end: todayEnd } = todayRange();

    let farmsQuery = supabase.from("farms").select("id, status").eq("status", "active");
    if (isFarmScoped) farmsQuery = farmsQuery.eq("id", farmId);

    let attendanceQuery = supabase
      .from("attendance")
      .select("id, farm_id, check_in, status")
      .neq("status", "absent")
      .gte("check_in", todayStart.toISOString())
      .lte("check_in", todayEnd.toISOString());
    if (isFarmScoped) attendanceQuery = attendanceQuery.eq("farm_id", farmId);

    let harvestInProgressQuery = supabase.from("harvest_sessions").select("id, farm_id").is("end_time", null);
    if (isFarmScoped) harvestInProgressQuery = harvestInProgressQuery.eq("farm_id", farmId);

    let productionTodayQuery = supabase
      .from("harvest_sessions")
      .select("weight_kg, farm_id")
      .gte("start_time", todayStart.toISOString())
      .lte("start_time", todayEnd.toISOString());
    if (isFarmScoped) productionTodayQuery = productionTodayQuery.eq("farm_id", farmId);

    let transfersQuery = supabase
      .from("transfers")
      .select("id, source_farm_id, destination_farm_id, status")
      .not("status", "in", TRANSFER_CLOSED_STATUSES);
    if (isFarmScoped) transfersQuery = transfersQuery.or(`source_farm_id.eq.${farmId},destination_farm_id.eq.${farmId}`);

    let vehiclesMissionQuery = supabase.from("vehicles").select("id, farm_id").eq("status", "on_mission");
    if (isFarmScoped) vehiclesMissionQuery = vehiclesMissionQuery.eq("farm_id", farmId);

    let purchasesPendingQuery = supabase
      .from("purchase_orders")
      .select("id, requesting_farm_id, status")
      .in("status", PO_PENDING_STATUSES);
    if (isFarmScoped) purchasesPendingQuery = purchasesPendingQuery.eq("requesting_farm_id", farmId);

    let budgetsQuery = supabase
      .from("budgets")
      .select("id, farm_id, level, site_id, parcel_id, crop_cycle_id, season_id, category, period_start, period_end, amount")
      .lte("period_start", dateStr(new Date()))
      .gte("period_end", dateStr(new Date()));
    if (isFarmScoped) budgetsQuery = budgetsQuery.eq("farm_id", farmId);

    let qualityQuery = supabase
      .from("quality_checks")
      .select(
        isFarmScoped
          ? "id, result, checked_at, lots:lot_id!inner(parcels!inner(farm_id))"
          : "id, result, checked_at, lots:lot_id(parcels(farm_id))"
      )
      .eq("result", "fail")
      .gte("checked_at", periodRange.start ? periodRange.start.toISOString() : "1970-01-01")
      .lte("checked_at", periodRange.end.toISOString());
    if (isFarmScoped) qualityQuery = qualityQuery.eq("lots.parcels.farm_id", farmId);

    let maintenanceQuery = supabase.from("equipment").select("id, farm_id, status").eq("status", "maintenance");
    if (isFarmScoped) maintenanceQuery = maintenanceQuery.eq("farm_id", farmId);

    let shipmentsQuery = supabase
      .from("deliveries")
      .select("id, farm_id, status, delivered_at")
      .eq("status", "confirmed")
      .gte("delivered_at", periodRange.start ? periodRange.start.toISOString() : "1970-01-01")
      .lte("delivered_at", periodRange.end.toISOString());
    if (isFarmScoped) shipmentsQuery = shipmentsQuery.eq("farm_id", farmId);

    const [
      farmsRes,
      attendanceRes,
      harvestInProgressRes,
      productionTodayRes,
      transfersRes,
      vehiclesMissionRes,
      purchasesPendingRes,
      budgetsRes,
      qualityRes,
      maintenanceRes,
      shipmentsRes,
    ] = await Promise.all([
      farmsQuery,
      attendanceQuery,
      harvestInProgressQuery,
      productionTodayQuery,
      transfersQuery,
      vehiclesMissionQuery,
      purchasesPendingQuery,
      budgetsQuery,
      qualityQuery,
      maintenanceQuery,
      shipmentsQuery,
    ]);

    const firstError = [
      farmsRes,
      attendanceRes,
      harvestInProgressRes,
      productionTodayRes,
      transfersRes,
      vehiclesMissionRes,
      purchasesPendingRes,
      budgetsRes,
      qualityRes,
      maintenanceRes,
      shipmentsRes,
    ].find((r) => r.error)?.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }

    const budgetComparisons = await Promise.all((budgetsRes.data || []).map((b) => computeBudgetComparison(b)));
    const totalBudget = (budgetsRes.data || []).reduce((s, b) => s + Number(b.amount), 0);
    const totalRealise = budgetComparisons.reduce((s, c) => s + c.realise, 0);
    const totalEngage = budgetComparisons.reduce((s, c) => s + c.engage, 0);

    setData({
      activeFarmsCount: (farmsRes.data || []).length,
      employeesPresentCount: (attendanceRes.data || []).length,
      harvestsInProgressCount: (harvestInProgressRes.data || []).length,
      productionTodayKg: (productionTodayRes.data || []).reduce((s, r) => s + Number(r.weight_kg || 0), 0),
      transfersInProgressCount: (transfersRes.data || []).length,
      vehiclesOnMissionCount: (vehiclesMissionRes.data || []).length,
      purchasesPendingCount: (purchasesPendingRes.data || []).length,
      budget: {
        totalBudget,
        totalRealise,
        totalEngage,
        pct: totalBudget > 0 ? ((totalRealise + totalEngage) / totalBudget) * 100 : null,
      },
      qualityIncidentsCount: (qualityRes.data || []).length,
      maintenanceCount: (maintenanceRes.data || []).length,
      shipmentsCount: (shipmentsRes.data || []).length,
    });
  }, [farmId, periodRange]);

  useEffect(() => {
    setData(null);
    loadData();
  }, [loadData]);

  return { data, error };
}
