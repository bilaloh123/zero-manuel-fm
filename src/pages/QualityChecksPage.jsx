import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Paperclip } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DocumentsModal from "../components/ui/DocumentsModal";
import QualityCheckFormModal from "../components/qualitychecks/QualityCheckFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const RESULT_BADGE = {
  pass: "bg-brand-100 text-brand-700",
  fail: "bg-red-100 text-red-700",
};

export default function QualityChecksPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [checks, setChecks] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [documentsTarget, setDocumentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadChecks = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("quality_checks")
      .select(
        "id, stage, result, reject_reason, checked_at, photos, lots:lot_id(lot_code, parcels:parcel_id(farm_id)), app_users:inspector_id(full_name)"
      )
      .order("checked_at", { ascending: false });
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setChecks([]);
      return;
    }
    const filtered =
      farmId === "all" ? data : (data || []).filter((c) => c.lots?.parcels?.farm_id === farmId);
    setChecks(filtered);
  }, [farmId]);

  useEffect(() => {
    setChecks(null);
    loadChecks();
  }, [loadChecks]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("quality_checks").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadChecks();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("qualityChecks.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("qualityChecks.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {checks === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : checks.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("qualityChecks.columns.lot")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("qualityChecks.columns.stage")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("qualityChecks.columns.inspector")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("qualityChecks.columns.result")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("qualityChecks.columns.checkedAt")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("qualityChecks.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={check.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{check.lots?.lot_code || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{check.stage || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{check.app_users?.full_name || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RESULT_BADGE[check.result] || RESULT_BADGE.pass}`}
                      >
                        {t(`qualityChecks.result.${check.result}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{new Date(check.checked_at).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDocumentsTarget(check)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("documents.title")}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(check)}
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
        <QualityCheckFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadChecks}
        />
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="quality_checks"
          record={documentsTarget}
          column="photos"
          mode="gallery"
          accept="image/jpeg,image/png,image/webp"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadChecks();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("qualityChecks.deleteConfirmTitle")}
          message={t("qualityChecks.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
