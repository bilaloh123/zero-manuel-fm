import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Paperclip } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DocumentsModal from "../components/ui/DocumentsModal";
import TransportMissionFormModal from "../components/transportmissions/TransportMissionFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  planned: "bg-gray-100 text-gray-600",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-brand-100 text-brand-700",
};

export default function TransportMissionsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [missions, setMissions] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [documentsTarget, setDocumentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadMissions = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("transport_missions")
      .select(
        "id, status, vehicle_id, driver_id, product_id, lot_id, quantity, departure_time, expected_arrival, actual_arrival, distance_km, fuel_used, photos, source_farm_id, destination_farm_id, vehicles:vehicle_id(plate_no), drivers:driver_id(full_name), source_farm:source_farm_id(name), destination_farm:destination_farm_id(name)"
      )
      .order("departure_time", { ascending: false });
    if (farmId !== "all") {
      query = query.or(`source_farm_id.eq.${farmId},destination_farm_id.eq.${farmId}`);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setMissions([]);
      return;
    }
    setMissions(data);
  }, [farmId]);

  useEffect(() => {
    setMissions(null);
    loadMissions();
  }, [loadMissions]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("transport_missions").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadMissions();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("transportMissions.title")}</h1>
        <Button onClick={() => setFormState({ mission: null })}>
          <Plus className="h-4 w-4" />
          {t("transportMissions.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {missions === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : missions.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("transportMissions.columns.vehicle")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("transportMissions.columns.driver")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("transportMissions.columns.sourceFarm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("transportMissions.columns.destinationFarm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("transportMissions.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("transportMissions.columns.departure")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("transportMissions.columns.arrival")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("transportMissions.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((mission) => (
                  <tr key={mission.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{mission.vehicles?.plate_no || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{mission.drivers?.full_name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{mission.source_farm?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{mission.destination_farm?.name || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[mission.status] || STATUS_BADGE.planned}`}
                      >
                        {t(`transportMissions.status.${mission.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">
                      {mission.departure_time ? new Date(mission.departure_time).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">
                      {mission.actual_arrival ? new Date(mission.actual_arrival).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDocumentsTarget(mission)}
                          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("documents.title")}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState({ mission })}
                          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(mission)}
                          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
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
        <TransportMissionFormModal
          open
          mission={formState.mission}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadMissions}
        />
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="transport_missions"
          record={documentsTarget}
          column="photos"
          mode="gallery"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadMissions();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("transportMissions.deleteConfirmTitle")}
          message={t("transportMissions.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
