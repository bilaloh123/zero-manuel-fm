import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ExpiryCell from "../components/ui/ExpiryCell";
import VehicleFormModal from "../components/vehicles/VehicleFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  available: "bg-brand-100 text-brand-700",
  on_mission: "bg-amber-100 text-amber-700",
  maintenance: "bg-amber-100 text-amber-700",
  out_of_service: "bg-red-100 text-red-700",
};

export default function VehiclesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [vehicles, setVehicles] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadVehicles = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("vehicles")
      .select(
        "id, plate_no, brand, model, type, capacity, odometer_km, farm_id, status, insurance_expiry, inspection_expiry, farms:farm_id(name)"
      )
      .order("plate_no", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setVehicles([]);
      return;
    }
    setVehicles(data);
  }, [farmId]);

  useEffect(() => {
    setVehicles(null);
    loadVehicles();
  }, [loadVehicles]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("vehicles").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("vehicles.title")}</h1>
        <Button onClick={() => setFormState({ vehicle: null })}>
          <Plus className="h-4 w-4" />
          {t("vehicles.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {vehicles === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : vehicles.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("vehicles.columns.plateNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("vehicles.columns.brandModel")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("vehicles.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("vehicles.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("vehicles.columns.insurance")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("vehicles.columns.inspection")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("vehicles.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{vehicle.plate_no}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{vehicle.farms?.name || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[vehicle.status] || STATUS_BADGE.available}`}
                      >
                        {t(`vehicles.status.${vehicle.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <ExpiryCell date={vehicle.insurance_expiry} />
                    </td>
                    <td className="px-3 py-3">
                      <ExpiryCell date={vehicle.inspection_expiry} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ vehicle })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(vehicle)}
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
        <VehicleFormModal
          open
          vehicle={formState.vehicle}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadVehicles}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("vehicles.deleteConfirmTitle")}
          message={t("vehicles.deleteConfirmMessage", { name: deleteTarget.plate_no })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
