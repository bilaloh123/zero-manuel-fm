import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import { FileDown } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import { useFilters } from "../context/FiltersContext";
import { useFarmSummary } from "../hooks/useFarmSummary";

function dateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const { farmId, farms, period, periodRange } = useFilters();
  const { data, error } = useFarmSummary(farmId, periodRange);

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
