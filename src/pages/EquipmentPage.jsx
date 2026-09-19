import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ExpiryCell from "../components/ui/ExpiryCell";
import EquipmentFormModal from "../components/equipment/EquipmentFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  available: "bg-brand-100 text-brand-700",
  in_use: "bg-amber-100 text-amber-700",
  maintenance: "bg-amber-100 text-amber-700",
  out_of_service: "bg-red-100 text-red-700",
};

export default function EquipmentPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("equipment")
      .select(
        "id, code, type, farm_id, status, operator_id, working_hours, odometer_km, next_maintenance_date, farms:farm_id(name), employees:operator_id(full_name)"
      )
      .order("code", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
      return;
    }
    setItems(data);
  }, [farmId]);

  useEffect(() => {
    setItems(null);
    loadItems();
  }, [loadItems]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("equipment").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("equipment.title")}</h1>
        <Button onClick={() => setFormState({ item: null })}>
          <Plus className="h-4 w-4" />
          {t("equipment.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {items === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("equipment.columns.code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("equipment.columns.type")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("equipment.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("equipment.columns.operator")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("equipment.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("equipment.columns.nextMaintenance")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("equipment.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{item.code}</td>
                    <td className="px-3 py-3 text-ink-muted">{t(`equipment.types.${item.type}`, item.type)}</td>
                    <td className="px-3 py-3 text-ink-muted">{item.farms?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{item.employees?.full_name || t("equipment.noOperator")}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.available}`}
                      >
                        {t(`equipment.status.${item.status}`, item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <ExpiryCell date={item.next_maintenance_date} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ item })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
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
        <EquipmentFormModal
          open
          item={formState.item}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadItems}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("equipment.deleteConfirmTitle")}
          message={t("equipment.deleteConfirmMessage", { name: deleteTarget.code })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
