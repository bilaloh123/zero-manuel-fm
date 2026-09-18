import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import VarietyFormModal from "../components/varieties/VarietyFormModal";
import { supabase } from "../lib/supabaseClient";

export default function VarietiesPage() {
  const { t, i18n } = useTranslation();
  const [varieties, setVarieties] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadVarieties = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("varieties")
      .select("id, name, crop_id, crops:crop_id(name_ar, name_fr)")
      .order("name", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setVarieties([]);
      return;
    }
    setVarieties(data);
  }, []);

  useEffect(() => {
    loadVarieties();
  }, [loadVarieties]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("varieties").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadVarieties();
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
        <h1 className="text-2xl font-semibold text-ink">{t("varieties.title")}</h1>
        <Button onClick={() => setFormState({ variety: null })}>
          <Plus className="h-4 w-4" />
          {t("varieties.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {varieties === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : varieties.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("varieties.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("varieties.columns.crop")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("varieties.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {varieties.map((variety) => (
                  <tr key={variety.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{variety.name}</td>
                    <td className="px-3 py-3 text-ink-muted">{cropLabel(variety.crops)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ variety })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(variety)}
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
        <VarietyFormModal
          open
          variety={formState.variety}
          onClose={() => setFormState(null)}
          onSaved={loadVarieties}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("varieties.deleteConfirmTitle")}
          message={t("varieties.deleteConfirmMessage", { name: deleteTarget.name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
