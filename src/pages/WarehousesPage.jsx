import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import WarehouseFormModal from "../components/warehouses/WarehouseFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function WarehousesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [warehouses, setWarehouses] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadWarehouses = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("warehouses")
      .select("id, farm_id, name, type, farms:farm_id(name)")
      .order("name", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setWarehouses([]);
      return;
    }
    setWarehouses(data);
  }, [farmId]);

  useEffect(() => {
    setWarehouses(null);
    loadWarehouses();
  }, [loadWarehouses]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("warehouses").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadWarehouses();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("warehouses.title")}</h1>
        <Button onClick={() => setFormState({ warehouse: null })}>
          <Plus className="h-4 w-4" />
          {t("warehouses.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {warehouses === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : warehouses.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("warehouses.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("warehouses.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("warehouses.columns.type")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("warehouses.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{warehouse.name}</td>
                    <td className="px-3 py-3 text-ink-muted">{warehouse.farms?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {t(`warehouses.types.${warehouse.type}`, warehouse.type)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ warehouse })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(warehouse)}
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
        <WarehouseFormModal
          open
          warehouse={formState.warehouse}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadWarehouses}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("warehouses.deleteConfirmTitle")}
          message={t("warehouses.deleteConfirmMessage", { name: deleteTarget.name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
