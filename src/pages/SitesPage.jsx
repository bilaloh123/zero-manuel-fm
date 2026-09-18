import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SiteFormModal from "../components/sites/SiteFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function SitesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [sites, setSites] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSites = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("sites")
      .select("id, code, name, gps_lat, gps_lng, farm_id, farms:farm_id(name)")
      .order("name", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setSites([]);
      return;
    }
    setSites(data);
  }, [farmId]);

  useEffect(() => {
    setSites(null);
    loadSites();
  }, [loadSites]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("sites").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadSites();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("sites.title")}</h1>
        <Button onClick={() => setFormState({ site: null })}>
          <Plus className="h-4 w-4" />
          {t("sites.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {sites === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : sites.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("sites.columns.code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("sites.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("sites.columns.farm")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("sites.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{site.code || "—"}</td>
                    <td className="px-3 py-3 text-ink">{site.name}</td>
                    <td className="px-3 py-3 text-ink-muted">{site.farms?.name || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ site })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(site)}
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
        <SiteFormModal
          open
          site={formState.site}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadSites}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("sites.deleteConfirmTitle")}
          message={t("sites.deleteConfirmMessage", { name: deleteTarget.name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
