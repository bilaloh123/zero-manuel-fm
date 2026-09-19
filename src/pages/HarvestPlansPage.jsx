import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import HarvestPlanFormModal from "../components/harvestplans/HarvestPlanFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";
import { inputClass } from "../components/ui/FormField";

const DATE_FILTERS = ["today", "tomorrow", "week", "month"];

function dateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getDateRange(filter) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const end = new Date(today);
  if (filter === "tomorrow") {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  } else if (filter === "week") {
    end.setDate(end.getDate() + 6);
  } else if (filter === "month") {
    end.setDate(end.getDate() + 29);
  }
  return { start: dateStr(start), end: dateStr(end) };
}

export default function HarvestPlansPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [dateFilter, setDateFilter] = useState("week");
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadPlans = useCallback(async () => {
    setError(null);
    const { start, end } = getDateRange(dateFilter);

    let query = supabase
      .from("harvest_plans")
      .select(
        "id, crop_cycle_id, planned_date, expected_quantity, team_id, crop_cycles:crop_cycle_id!inner(parcels:parcel_id!inner(name, code, farm_id), crops:crop_id(name_ar, name_fr)), teams:team_id(name)"
      )
      .gte("planned_date", start)
      .lte("planned_date", end)
      .order("planned_date", { ascending: true });

    if (farmId !== "all") {
      query = query.eq("crop_cycles.parcels.farm_id", farmId);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setPlans([]);
      return;
    }
    setPlans(data);
  }, [farmId, dateFilter]);

  useEffect(() => {
    setPlans(null);
    loadPlans();
  }, [loadPlans]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("harvest_plans").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadPlans();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const cropCycleLabel = (cc) => {
    const crop = cc?.crops;
    const cropName = crop ? (i18n.language === "ar" ? crop.name_ar || crop.name_fr : crop.name_fr || crop.name_ar) : "";
    const parcelName = cc?.parcels?.name || cc?.parcels?.code || "";
    return `${parcelName} — ${cropName}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("harvestPlans.title")}</h1>
        <Button onClick={() => setFormState({ plan: null })}>
          <Plus className="h-4 w-4" />
          {t("harvestPlans.add")}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={`${inputClass} max-w-xs`}>
          {DATE_FILTERS.map((f) => (
            <option key={f} value={f}>
              {t(`harvestPlans.filters.${f}`)}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {plans === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : plans.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("harvestPlans.columns.cropCycle")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("harvestPlans.columns.plannedDate")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("harvestPlans.columns.expectedQuantity")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("harvestPlans.columns.team")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("harvestPlans.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{cropCycleLabel(plan.crop_cycles)}</td>
                    <td className="px-3 py-3 text-ink-muted">{plan.planned_date}</td>
                    <td className="px-3 py-3 text-ink-muted">{plan.expected_quantity ?? "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{plan.teams?.name || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setFormState({
                              plan: { ...plan, parcels: plan.crop_cycles?.parcels },
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(plan)}
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
        <HarvestPlanFormModal
          open
          plan={formState.plan}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadPlans}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("harvestPlans.deleteConfirmTitle")}
          message={t("harvestPlans.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
