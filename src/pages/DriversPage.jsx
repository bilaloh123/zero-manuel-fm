import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DriverFormModal from "../components/drivers/DriverFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function DriversPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [drivers, setDrivers] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDrivers = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("drivers")
      .select(
        "id, full_name, farm_id, phone, license_no, license_categories, current_vehicle_id, vehicles:current_vehicle_id(plate_no)"
      )
      .order("full_name", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setDrivers([]);
      return;
    }
    setDrivers(data);
  }, [farmId]);

  useEffect(() => {
    setDrivers(null);
    loadDrivers();
  }, [loadDrivers]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("drivers").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadDrivers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("drivers.title")}</h1>
        <Button onClick={() => setFormState({ driver: null })}>
          <Plus className="h-4 w-4" />
          {t("drivers.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {drivers === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : drivers.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("drivers.columns.fullName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("drivers.columns.phone")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("drivers.columns.licenseNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("drivers.columns.vehicle")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("drivers.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{driver.full_name}</td>
                    <td className="px-3 py-3 text-ink-muted">{driver.phone || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {driver.license_no || "—"}
                      {driver.license_categories?.length > 0 && (
                        <span className="ms-1 text-xs text-ink-faint">({driver.license_categories.join(", ")})</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{driver.vehicles?.plate_no || t("drivers.noVehicle")}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ driver })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(driver)}
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
        <DriverFormModal
          open
          driver={formState.driver}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadDrivers}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("drivers.deleteConfirmTitle")}
          message={t("drivers.deleteConfirmMessage", { name: deleteTarget.full_name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
