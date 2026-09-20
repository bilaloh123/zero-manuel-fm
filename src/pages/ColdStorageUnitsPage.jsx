import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ColdStorageUnitFormModal from "../components/coldstorage/ColdStorageUnitFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function ColdStorageUnitsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [units, setUnits] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadUnits = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("cold_storage_units")
      .select("id, code, name, capacity_pallets, target_temperature_c, target_humidity_pct, active, warehouses:warehouse_id(name)")
      .order("name", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setUnits([]);
      return;
    }
    setUnits(data);
  }, [farmId]);

  useEffect(() => {
    setUnits(null);
    loadUnits();
  }, [loadUnits]);

  const toggleActive = async (unit) => {
    await supabase.from("cold_storage_units").update({ active: !unit.active }).eq("id", unit.id);
    await loadUnits();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("cold_storage_units").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadUnits();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("coldStorageUnits.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("coldStorageUnits.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {units === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : units.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("coldStorageUnits.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("coldStorageUnits.columns.warehouse")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("coldStorageUnits.columns.capacity")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("coldStorageUnits.columns.temperature")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("coldStorageUnits.columns.active")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("coldStorageUnits.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{unit.name}</td>
                    <td className="px-3 py-3 text-ink-muted">{unit.warehouses?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{unit.capacity_pallets ?? "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {unit.target_temperature_c != null ? `${unit.target_temperature_c}°C` : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(unit)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          unit.active ? "bg-brand-100 text-brand-700" : "bg-cream-soft text-ink-muted"
                        }`}
                      >
                        {unit.active ? t("common.yes") : t("common.no")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(unit)}
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

      {formOpen && (
        <ColdStorageUnitFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadUnits}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("coldStorageUnits.deleteConfirmTitle")}
          message={t("coldStorageUnits.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
