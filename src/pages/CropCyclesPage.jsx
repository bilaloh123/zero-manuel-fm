import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import CropCycleFormModal from "../components/cropcycles/CropCycleFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  planned: "bg-gray-100 text-gray-600",
  growing: "bg-brand-100 text-brand-700",
  harvesting: "bg-amber-100 text-amber-700",
  closed: "bg-gray-200 text-gray-700",
};

export default function CropCyclesPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [cycles, setCycles] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCycles = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("crop_cycles")
      .select(
        "id, planting_date, expected_harvest_date, actual_harvest_date, expected_yield_kg, actual_yield_kg, status, parcel_id, crop_id, variety_id, season_id, parcels!inner(id, name, code, farm_id), crops:crop_id(name_ar, name_fr), varieties:variety_id(name), seasons:season_id(label)"
      )
      .order("planting_date", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("parcels.farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setCycles([]);
      return;
    }
    setCycles(data);
  }, [farmId]);

  useEffect(() => {
    setCycles(null);
    loadCycles();
  }, [loadCycles]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("crop_cycles").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadCycles();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const cropLabel = (crops) =>
    !crops ? "—" : i18n.language === "ar" ? crops.name_ar || crops.name_fr : crops.name_fr || crops.name_ar;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("cropCycles.title")}</h1>
        <Button onClick={() => setFormState({ cycle: null })}>
          <Plus className="h-4 w-4" />
          {t("cropCycles.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {cycles === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : cycles.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("cropCycles.columns.parcel")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("cropCycles.columns.crop")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("cropCycles.columns.variety")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("cropCycles.columns.season")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("cropCycles.columns.planting")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("cropCycles.columns.harvest")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("cropCycles.columns.status")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("cropCycles.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">
                      {cycle.parcels?.name || cycle.parcels?.code || "—"}
                    </td>
                    <td className="px-3 py-3 text-ink">{cropLabel(cycle.crops)}</td>
                    <td className="px-3 py-3 text-ink-muted">{cycle.varieties?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{cycle.seasons?.label || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{cycle.planting_date || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{cycle.expected_harvest_date || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[cycle.status] || STATUS_BADGE.planned}`}
                      >
                        {t(`cropCycles.status.${cycle.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ cycle })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cycle)}
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
        <CropCycleFormModal
          open
          cycle={formState.cycle}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadCycles}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("cropCycles.deleteConfirmTitle")}
          message={t("cropCycles.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
