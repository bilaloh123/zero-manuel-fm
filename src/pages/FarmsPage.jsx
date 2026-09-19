import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import FarmFormModal from "../components/farms/FarmFormModal";
import { supabase } from "../lib/supabaseClient";

const STATUS_BADGE = {
  active: "bg-brand-100 text-brand-700",
  maintenance: "bg-amber-100 text-amber-700",
  alert: "bg-red-100 text-red-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default function FarmsPage() {
  const { t } = useTranslation();
  const [farms, setFarms] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null); // { farm: null | farm }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadFarms = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("farms")
      .select("id, code, name, phone, total_area_ha, cultivated_area_ha, gps_lat, gps_lng, status")
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setFarms([]);
      return;
    }
    setFarms(data);
  }, []);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("farms").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadFarms();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("farms.title")}</h1>
        <Button onClick={() => setFormState({ farm: null })}>
          <Plus className="h-4 w-4" />
          {t("farms.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {farms === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : farms.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("farms.columns.code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("farms.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("farms.columns.area")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("farms.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("farms.columns.phone")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("farms.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr key={farm.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{farm.code}</td>
                    <td className="px-3 py-3 text-ink">{farm.name}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {farm.cultivated_area_ha ?? "—"} / {farm.total_area_ha ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[farm.status] || STATUS_BADGE.inactive}`}
                      >
                        {t(`farms.status.${farm.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{farm.phone || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ farm })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(farm)}
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
        <FarmFormModal
          open
          farm={formState.farm}
          onClose={() => setFormState(null)}
          onSaved={loadFarms}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("farms.deleteConfirmTitle")}
          message={t("farms.deleteConfirmMessage", { name: deleteTarget.name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
