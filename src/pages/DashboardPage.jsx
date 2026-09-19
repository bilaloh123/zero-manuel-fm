import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import StatTile from "../components/ui/StatTile";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import { useFilters } from "../context/FiltersContext";
import { useFarmSummary } from "../hooks/useFarmSummary";
import { useAlertsContext } from "../context/AlertsContext";
import { SEVERITY_STYLE, alertMessage } from "../lib/alertDisplay";

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { farmId, periodRange } = useFilters();
  const { data, error } = useFarmSummary(farmId, periodRange);
  const { alerts: allAlerts, loading: alertsLoading } = useAlertsContext();

  const recentAlerts = useMemo(() => {
    const scoped = farmId === "all" ? allAlerts : allAlerts.filter((a) => a.farm_id === farmId);
    return scoped.slice(0, 5);
  }, [allAlerts, farmId]);

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner />

      <Card title={t("dashboard.title")}>
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

      <Card title={t("dashboard.recentAlerts")}>
        {alertsLoading ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : recentAlerts.length === 0 ? (
          <EmptyState message={t("alerts.noAlerts")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {recentAlerts.map((alert) => {
              const style = SEVERITY_STYLE[alert.severity];
              const Icon = style.icon;
              return (
                <li
                  key={alert.id}
                  className="flex items-start gap-3 rounded-control border border-border px-3 py-3"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.badge}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{t(`alerts.types.${alert.type}`)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                        {t(`alerts.severity.${alert.severity}`)}
                      </span>
                    </div>
                    <p className="text-sm text-ink-muted">{alertMessage(alert, t, i18n.language)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
