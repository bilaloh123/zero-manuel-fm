import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import { FileDown } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

function dateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { farmId, farms, period, periodRange } = useFilters();
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

    let salesQuery = supabase
      .from("sales")
      .select("quantity, unit_price, status, sold_at, lots:lot_id(parcels!inner(farm_id))")
      .eq("status", "confirmed");
    if (farmId !== "all") salesQuery = salesQuery.eq("lots.parcels.farm_id", farmId);
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

  const farmLabel = useMemo(() => {
    if (farmId === "all") return t("filters.allFarms");
    return farms.find((f) => f.id === farmId)?.name || farmId;
  }, [farmId, farms, t]);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      { [t("reports.columns.metric")]: t("reports.metrics.totalProduction"), [t("reports.columns.value")]: data.totalProductionKg },
      { [t("reports.columns.metric")]: t("reports.metrics.totalRevenue"), [t("reports.columns.value")]: data.totalRevenue },
      { [t("reports.columns.metric")]: t("reports.metrics.totalExpenses"), [t("reports.columns.value")]: data.totalExpenses },
      { [t("reports.columns.metric")]: t("reports.metrics.netMargin"), [t("reports.columns.value")]: data.netMargin },
      { [t("reports.columns.metric")]: t("reports.metrics.employeeCount"), [t("reports.columns.value")]: data.employeeCount },
      { [t("reports.columns.metric")]: t("reports.metrics.activeVehicleCount"), [t("reports.columns.value")]: data.activeVehicleCount },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("reports.title").slice(0, 31));
    const safeFarm = farmLabel.replace(/[^\p{L}\p{N}]+/gu, "-");
    XLSX.writeFile(wb, `agrimax-report-${safeFarm}-${period}-${dateStr(new Date())}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("reports.title")}</h1>
        <Button onClick={handleExport} disabled={!data}>
          <FileDown className="h-4 w-4" />
          {t("reports.export")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {!data ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile label={t("reports.metrics.totalProduction")} value={`${data.totalProductionKg.toFixed(1)} kg`} />
            <StatTile label={t("reports.metrics.totalRevenue")} value={data.totalRevenue.toFixed(2)} accent />
            <StatTile label={t("reports.metrics.totalExpenses")} value={data.totalExpenses.toFixed(2)} />
            <StatTile
              label={t("reports.metrics.netMargin")}
              value={data.netMargin.toFixed(2)}
              accent={data.netMargin >= 0}
            />
            <StatTile label={t("reports.metrics.employeeCount")} value={data.employeeCount} />
            <StatTile label={t("reports.metrics.activeVehicleCount")} value={data.activeVehicleCount} />
          </div>
        )}
      </Card>
    </div>
  );
}
