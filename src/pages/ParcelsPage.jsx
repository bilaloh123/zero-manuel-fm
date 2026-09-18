import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ParcelFormModal from "../components/parcels/ParcelFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";
import { useSiteOptions } from "../hooks/useSiteOptions";
import { inputClass } from "../components/ui/FormField";

export default function ParcelsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const { sites } = useSiteOptions(farmId);
  const [siteFilter, setSiteFilter] = useState("all");
  const [parcels, setParcels] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setSiteFilter("all");
  }, [farmId]);

  const loadParcels = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("parcels")
      .select(
        "id, code, name, total_area_ha, usable_area_ha, farm_id, site_id, sites:site_id(name)"
      )
      .order("name", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    if (siteFilter !== "all") {
      query = query.eq("site_id", siteFilter);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setParcels([]);
      return;
    }
    setParcels(data);
  }, [farmId, siteFilter]);

  useEffect(() => {
    setParcels(null);
    loadParcels();
  }, [loadParcels]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("parcels").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadParcels();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("parcels.title")}</h1>
        <Button onClick={() => setFormState({ parcel: null })}>
          <Plus className="h-4 w-4" />
          {t("parcels.add")}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className={`${inputClass} max-w-xs`}
        >
          <option value="all">{t("parcels.filterBySite")}</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {parcels === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : parcels.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("parcels.columns.code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("parcels.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("parcels.columns.site")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("parcels.columns.area")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("parcels.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {parcels.map((parcel) => (
                  <tr key={parcel.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{parcel.code}</td>
                    <td className="px-3 py-3 text-ink">{parcel.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{parcel.sites?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {parcel.usable_area_ha ?? "—"} / {parcel.total_area_ha ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ parcel })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(parcel)}
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
        <ParcelFormModal
          open
          parcel={formState.parcel}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadParcels}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("parcels.deleteConfirmTitle")}
          message={t("parcels.deleteConfirmMessage", { name: deleteTarget.name || deleteTarget.code })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
