import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, AlertOctagon } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { useAlertsContext } from "../context/AlertsContext";
import { useFilters } from "../context/FiltersContext";
import { inputClass } from "../components/ui/FormField";

const SEVERITY_STYLE = {
  critical: { badge: "bg-red-100 text-red-700", icon: AlertOctagon },
  warning: { badge: "bg-amber-100 text-amber-700", icon: AlertTriangle },
};

export default function AlertsPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const { alerts: allAlerts, loading } = useAlertsContext();
  const [severityFilter, setSeverityFilter] = useState("all");

  const alerts = useMemo(
    () => (farmId === "all" ? allAlerts : allAlerts.filter((a) => a.farm_id === farmId)),
    [allAlerts, farmId]
  );

  const productLabel = (p) => (!p ? "" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const messageFor = (alert) => {
    const p = alert.params;
    switch (alert.type) {
      case "stock_out":
        return t("alerts.messages.stock_out", { product: productLabel(p.product), warehouse: p.warehouseName });
      case "stock_low":
        return t("alerts.messages.stock_low", {
          product: productLabel(p.product),
          warehouse: p.warehouseName,
          balance: p.balance,
          threshold: p.threshold,
        });
      case "vehicle_insurance":
      case "vehicle_inspection":
        return t(`alerts.messages.${alert.type}`, { plateNo: p.plateNo, date: p.date, days: p.days });
      case "equipment_maintenance":
        return t("alerts.messages.equipment_maintenance", { code: p.code, date: p.date, days: p.days });
      default:
        return "";
    }
  };

  const filtered = severityFilter === "all" ? alerts : alerts.filter((a) => a.severity === severityFilter);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t("alerts.title")}</h1>

      <div className="flex items-center gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className={`${inputClass} max-w-xs`}
        >
          <option value="all">{t("alerts.allSeverities")}</option>
          <option value="critical">{t("alerts.severity.critical")}</option>
          <option value="warning">{t("alerts.severity.warning")}</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <EmptyState message={t("alerts.noAlerts")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((alert) => {
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
                    <p className="text-sm text-ink-muted">{messageFor(alert)}</p>
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
