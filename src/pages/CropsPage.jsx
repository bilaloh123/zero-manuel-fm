import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import CropFormModal from "../components/crops/CropFormModal";
import { supabase } from "../lib/supabaseClient";

export default function CropsPage() {
  const { t, i18n } = useTranslation();
  const [crops, setCrops] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCrops = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("crops")
      .select("id, name_ar, name_fr, category")
      .order("name_fr", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setCrops([]);
      return;
    }
    setCrops(data);
  }, []);

  useEffect(() => {
    loadCrops();
  }, [loadCrops]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("crops").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadCrops();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const displayName = (crop) => (i18n.language === "ar" ? crop.name_ar || crop.name_fr : crop.name_fr || crop.name_ar);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("crops.title")}</h1>
        <Button onClick={() => setFormState({ crop: null })}>
          <Plus className="h-4 w-4" />
          {t("crops.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {crops === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : crops.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("crops.columns.nameAr")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("crops.columns.nameFr")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("crops.columns.category")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("crops.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {crops.map((crop) => (
                  <tr key={crop.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink" dir="rtl">
                      {crop.name_ar || "—"}
                    </td>
                    <td className="px-3 py-3 text-ink">{crop.name_fr || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {crop.category ? t(`crops.categories.${crop.category}`, crop.category) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ crop })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(crop)}
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
        <CropFormModal
          open
          crop={formState.crop}
          onClose={() => setFormState(null)}
          onSaved={loadCrops}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("crops.deleteConfirmTitle")}
          message={t("crops.deleteConfirmMessage", { name: displayName(deleteTarget) })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
