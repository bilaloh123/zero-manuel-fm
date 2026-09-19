import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, ShoppingCart, CheckCircle2, Paperclip } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Modal from "../components/ui/Modal";
import DocumentsModal from "../components/ui/DocumentsModal";
import DeliveryFormModal from "../components/deliveries/DeliveryFormModal";
import DeliveryItemsModal from "../components/deliveries/DeliveryItemsModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-brand-100 text-brand-700",
};

export default function DeliveriesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [deliveries, setDeliveries] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [itemsTarget, setItemsTarget] = useState(null);
  const [documentsTarget, setDocumentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadDeliveries = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("deliveries")
      .select("id, delivery_no, status, delivered_at, photos, sales_orders:sales_order_id(order_no), customers:customer_id(name)")
      .order("delivered_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setDeliveries([]);
      return;
    }
    setDeliveries(data);
  }, [farmId]);

  useEffect(() => {
    setDeliveries(null);
    loadDeliveries();
  }, [loadDeliveries]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("deliveries").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadDeliveries();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setActionError(null);
    try {
      const { error: rpcError } = await supabase.rpc("confirm_delivery", { p_delivery_id: confirmTarget.id });
      if (rpcError) throw rpcError;
      setConfirmTarget(null);
      await loadDeliveries();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("deliveries.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("deliveries.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {deliveries === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : deliveries.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("deliveries.columns.deliveryNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("deliveries.columns.order")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("deliveries.columns.customer")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("deliveries.columns.deliveredAt")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("deliveries.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("deliveries.manageItems")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("deliveries.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{delivery.delivery_no}</td>
                    <td className="px-3 py-3 text-ink-muted">{delivery.sales_orders?.order_no || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{delivery.customers?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{new Date(delivery.delivered_at).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[delivery.status] || STATUS_BADGE.draft}`}
                      >
                        {t(`deliveries.status.${delivery.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setItemsTarget(delivery)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {t("deliveries.manageItems")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {delivery.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => setConfirmTarget(delivery)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-brand-700 hover:bg-brand-100"
                            title={t("deliveries.confirmAction")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDocumentsTarget(delivery)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("documents.title")}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        {delivery.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(delivery)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formOpen && <DeliveryFormModal open onClose={() => setFormOpen(false)} onSaved={loadDeliveries} />}

      {itemsTarget && (
        <DeliveryItemsModal
          open
          delivery={itemsTarget}
          onClose={() => {
            setItemsTarget(null);
            loadDeliveries();
          }}
        />
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="deliveries"
          record={documentsTarget}
          column="photos"
          mode="gallery"
          accept="image/jpeg,image/png,image/webp"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadDeliveries();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("deliveries.deleteConfirmTitle")}
          message={t("deliveries.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {confirmTarget && (
        <Modal
          open
          onClose={() => {
            setConfirmTarget(null);
            setActionError(null);
          }}
          title={t("deliveries.confirmDialogTitle")}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirmTarget(null);
                  setActionError(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                {t("deliveries.confirmAction")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">
            {t("deliveries.confirmDialogMessage", { no: confirmTarget.delivery_no })}
          </p>
          {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
        </Modal>
      )}
    </div>
  );
}
