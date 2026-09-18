import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ReceptionFormModal from "../components/receptions/ReceptionFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const QUALITY_BADGE = {
  accepted: "bg-brand-100 text-brand-700",
  rejected: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
};

export default function ReceptionsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [receptions, setReceptions] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadReceptions = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("receptions")
      .select(
        "id, received_quantity, quality_status, received_at, delivery_farm_id, farms:delivery_farm_id(name), purchase_orders:purchase_order_id(suppliers:supplier_id(company_name)), app_users:received_by(full_name)"
      )
      .order("received_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("delivery_farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setReceptions([]);
      return;
    }
    setReceptions(data);
  }, [farmId]);

  useEffect(() => {
    setReceptions(null);
    loadReceptions();
  }, [loadReceptions]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("receptions").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadReceptions();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("receptions.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("receptions.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {receptions === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : receptions.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("receptions.columns.order")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("receptions.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("receptions.columns.quantity")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("receptions.columns.quality")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("receptions.columns.receivedAt")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("receptions.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {receptions.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">
                      {r.purchase_orders?.suppliers?.company_name || "—"}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{r.farms?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{r.received_quantity}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${QUALITY_BADGE[r.quality_status] || QUALITY_BADGE.accepted}`}
                      >
                        {t(`receptions.quality.${r.quality_status}`, r.quality_status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{new Date(r.received_at).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
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
        <ReceptionFormModal open onClose={() => setFormOpen(false)} onSaved={loadReceptions} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("receptions.deleteConfirmTitle")}
          message={t("receptions.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
