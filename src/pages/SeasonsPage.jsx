import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SeasonFormModal from "../components/seasons/SeasonFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function SeasonsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [seasons, setSeasons] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSeasons = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("seasons")
      .select("id, label, farm_id, start_date, end_date, farms:farm_id(name)")
      .order("start_date", { ascending: false });
    if (farmId !== "all") {
      query = query.or(`farm_id.is.null,farm_id.eq.${farmId}`);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setSeasons([]);
      return;
    }
    setSeasons(data);
  }, [farmId]);

  useEffect(() => {
    setSeasons(null);
    loadSeasons();
  }, [loadSeasons]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("seasons").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadSeasons();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("seasons.title")}</h1>
        <Button onClick={() => setFormState({ season: null })}>
          <Plus className="h-4 w-4" />
          {t("seasons.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {seasons === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : seasons.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("seasons.columns.label")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("seasons.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("seasons.columns.startDate")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("seasons.columns.endDate")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("seasons.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => (
                  <tr key={season.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{season.label}</td>
                    <td className="px-3 py-3 text-ink-muted">{season.farms?.name || t("seasons.generalFarm")}</td>
                    <td className="px-3 py-3 text-ink-muted">{season.start_date || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{season.end_date || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ season })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(season)}
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
        <SeasonFormModal
          open
          season={formState.season}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadSeasons}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("seasons.deleteConfirmTitle")}
          message={t("seasons.deleteConfirmMessage", { name: deleteTarget.label })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
