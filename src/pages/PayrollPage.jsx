import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PayrollPeriodFormModal from "../components/payroll/PayrollPeriodFormModal";
import PayrollLinesModal from "../components/payroll/PayrollLinesModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  open: "bg-brand-100 text-brand-700",
  closed: "bg-gray-200 text-gray-700",
};

export default function PayrollPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [periods, setPeriods] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [linesTarget, setLinesTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadPeriods = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("payroll_periods")
      .select("id, farm_id, period_start, period_end, status, farms:farm_id(name)")
      .order("period_start", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setPeriods([]);
      return;
    }
    setPeriods(data);
  }, [farmId]);

  useEffect(() => {
    setPeriods(null);
    loadPeriods();
  }, [loadPeriods]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("payroll_periods").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadPeriods();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("payroll.title")}</h1>
        <Button onClick={() => setFormState({ period: null })}>
          <Plus className="h-4 w-4" />
          {t("payroll.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {periods === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : periods.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("payroll.columns.period")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("payroll.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("payroll.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("payroll.manageLines")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("payroll.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">
                      {period.period_start} → {period.period_end}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{period.farms?.name || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[period.status] || STATUS_BADGE.open}`}
                      >
                        {t(`payroll.status.${period.status}`, period.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setLinesTarget(period)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        {t("payroll.manageLines")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ period })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(period)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formState && (
        <PayrollPeriodFormModal
          open
          period={formState.period}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadPeriods}
        />
      )}

      {linesTarget && (
        <PayrollLinesModal open period={linesTarget} onClose={() => setLinesTarget(null)} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("payroll.deleteConfirmTitle")}
          message={t("payroll.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
