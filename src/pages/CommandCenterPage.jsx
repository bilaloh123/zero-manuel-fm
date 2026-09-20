import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import StatTile from "../components/ui/StatTile";
import { useFilters } from "../context/FiltersContext";
import { useFarmSummary } from "../hooks/useFarmSummary";
import { useCommandCenterSummary } from "../hooks/useCommandCenterSummary";
import { useAlertsContext } from "../context/AlertsContext";

function Section({ title, children }) {
  return (
    <Card title={title}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </Card>
  );
}

export default function CommandCenterPage() {
  const { t } = useTranslation();
  const { farmId, periodRange } = useFilters();
  const { data: summary, error: summaryError } = useFarmSummary(farmId, periodRange);
  const { data: cc, error: ccError } = useCommandCenterSummary(farmId, periodRange);
  const { alerts: allAlerts } = useAlertsContext();

  const scopedAlerts = useMemo(
    () => (farmId === "all" ? allAlerts : allAlerts.filter((a) => a.farm_id === farmId)),
    [allAlerts, farmId]
  );
  const criticalAlertsCount = useMemo(() => scopedAlerts.filter((a) => a.severity === "critical").length, [scopedAlerts]);
  const stockAlertsCount = useMemo(
    () => scopedAlerts.filter((a) => a.type === "stock_out" || a.type === "stock_low").length,
    [scopedAlerts]
  );

  const loading = !summary || !cc;
  const error = summaryError || ccError;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{t("commandCenter.title")}</h1>
        <p className="text-sm text-ink-muted">{t("commandCenter.subtitle")}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
      ) : (
        <>
          <Section title={t("commandCenter.sections.terrainHr")}>
            <StatTile label={t("commandCenter.tiles.activeFarms")} value={cc.activeFarmsCount} />
            <StatTile label={t("commandCenter.tiles.employeesPresent")} value={cc.employeesPresentCount} />
          </Section>

          <Section title={t("commandCenter.sections.production")}>
            <StatTile label={t("commandCenter.tiles.harvestsInProgress")} value={cc.harvestsInProgressCount} />
            <StatTile label={t("commandCenter.tiles.productionToday")} value={`${cc.productionTodayKg.toFixed(1)} kg`} />
          </Section>

          <Section title={t("commandCenter.sections.logistics")}>
            <StatTile label={t("commandCenter.tiles.transfersInProgress")} value={cc.transfersInProgressCount} />
            <StatTile label={t("commandCenter.tiles.vehiclesOnMission")} value={cc.vehiclesOnMissionCount} />
            <StatTile label={t("commandCenter.tiles.shipments")} value={cc.shipmentsCount} />
          </Section>

          <Section title={t("commandCenter.sections.stockProcurement")}>
            <StatTile label={t("commandCenter.tiles.criticalStock")} value={stockAlertsCount} accent={stockAlertsCount > 0} />
            <StatTile label={t("commandCenter.tiles.purchasesPending")} value={cc.purchasesPendingCount} />
          </Section>

          <Section title={t("commandCenter.sections.finance")}>
            <StatTile label={t("commandCenter.tiles.costs")} value={summary.totalExpenses.toFixed(2)} />
            <StatTile
              label={t("commandCenter.tiles.budget")}
              value={
                cc.budget.pct == null
                  ? t("commandCenter.noBudget")
                  : `${(cc.budget.totalRealise + cc.budget.totalEngage).toFixed(2)} / ${cc.budget.totalBudget.toFixed(2)} (${cc.budget.pct.toFixed(0)}%)`
              }
              accent={cc.budget.pct != null && cc.budget.pct > 100}
            />
          </Section>

          <Section title={t("commandCenter.sections.qualityMaintenance")}>
            <StatTile label={t("commandCenter.tiles.qualityIncidents")} value={cc.qualityIncidentsCount} accent={cc.qualityIncidentsCount > 0} />
            <StatTile label={t("commandCenter.tiles.maintenance")} value={cc.maintenanceCount} />
            <StatTile label={t("commandCenter.tiles.criticalAlerts")} value={criticalAlertsCount} accent={criticalAlertsCount > 0} />
          </Section>
        </>
      )}
    </div>
  );
}
