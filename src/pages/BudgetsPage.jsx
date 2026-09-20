import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import BudgetFormModal from "../components/budgets/BudgetFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";
import { useAuth } from "../context/AuthContext";
import { computeBudgetComparison } from "../lib/budgetCalculations";

function scopeLabel(budget) {
  switch (budget.level) {
    case "farm":
      return budget.farms?.name || "—";
    case "site":
      return budget.sites?.name || "—";
    case "parcel":
      return budget.parcels?.name || "—";
    case "crop_cycle":
      return budget.crop_cycles?.parcels?.name || "—";
    case "season":
      return budget.seasons?.label || "—";
    default:
      return "—";
  }
}

export default function BudgetsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const { isSuperAdmin } = useAuth();
  const [budgets, setBudgets] = useState(null);
  const [comparisons, setComparisons] = useState({});
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadBudgets = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("budgets")
      .select(
        "id, farm_id, level, category, period_start, period_end, amount, farms:farm_id(name), sites:site_id(name), parcels:parcel_id(name), crop_cycles:crop_cycle_id(parcels:parcel_id(name)), seasons:season_id(label)"
      )
      .order("period_start", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setBudgets([]);
      return;
    }
    setBudgets(data);

    const results = await Promise.all(
      (data || []).map(async (budget) => {
        try {
          const comparison = await computeBudgetComparison(budget);
          return [budget.id, comparison];
        } catch (err) {
          return [budget.id, { error: err.message }];
        }
      })
    );
    setComparisons(Object.fromEntries(results));
  }, [farmId]);

  useEffect(() => {
    setBudgets(null);
    loadBudgets();
  }, [loadBudgets]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("budgets").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadBudgets();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const rowTone = (comparison) => {
    if (!comparison || comparison.error) return "";
    if (comparison.ecartPct != null && comparison.ecartPct > 0) return "text-red-600";
    if (comparison.ecartPct != null && comparison.ecartPct > -20) return "text-amber-700";
    return "text-brand-700";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("budgets.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("budgets.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {budgets === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : budgets.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.level")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.scope")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.category")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.period")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.budget")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.realise")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.engage")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.disponible")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.ecart")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("budgets.columns.ecartPct")}</th>
                  {isSuperAdmin && <th className="px-3 py-2 text-end font-medium">{t("budgets.columns.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => {
                  const comparison = comparisons[budget.id];
                  return (
                    <tr key={budget.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 text-ink-muted">{t(`budgets.levels.${budget.level}`)}</td>
                      <td className="px-3 py-3 font-medium text-ink">{scopeLabel(budget)}</td>
                      <td className="px-3 py-3 text-ink-muted">{t(`expenses.categories.${budget.category}`)}</td>
                      <td className="px-3 py-3 text-ink-muted">
                        {budget.period_start} → {budget.period_end}
                      </td>
                      <td className="px-3 py-3 font-medium text-ink">{Number(budget.amount).toFixed(2)}</td>
                      {!comparison ? (
                        <td colSpan={5} className="px-3 py-3 text-ink-muted">
                          {t("common.loading")}
                        </td>
                      ) : comparison.error ? (
                        <td colSpan={5} className="px-3 py-3 text-red-600">
                          {comparison.error}
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-ink-muted">{comparison.realise.toFixed(2)}</td>
                          <td className="px-3 py-3 text-ink-muted">
                            {budget.level === "farm" ? comparison.engage.toFixed(2) : t("budgets.engageNA")}
                          </td>
                          <td className={`px-3 py-3 font-medium ${rowTone(comparison)}`}>
                            {comparison.disponible.toFixed(2)}
                          </td>
                          <td className={`px-3 py-3 font-medium ${rowTone(comparison)}`}>{comparison.ecart.toFixed(2)}</td>
                          <td className={`px-3 py-3 font-medium ${rowTone(comparison)}`}>
                            {comparison.ecartPct != null ? `${comparison.ecartPct.toFixed(1)}%` : "—"}
                          </td>
                        </>
                      )}
                      {isSuperAdmin && (
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(budget)}
                              className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formOpen && (
        <BudgetFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadBudgets}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("budgets.deleteConfirmTitle")}
          message={t("budgets.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
