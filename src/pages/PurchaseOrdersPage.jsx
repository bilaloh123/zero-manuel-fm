import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, ShoppingCart, Paperclip, Send } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Modal from "../components/ui/Modal";
import DocumentsModal from "../components/ui/DocumentsModal";
import PurchaseOrderFormModal from "../components/purchaseorders/PurchaseOrderFormModal";
import PurchaseOrderLinesModal from "../components/purchaseorders/PurchaseOrderLinesModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-amber-100 text-amber-700",
  confirmed: "bg-amber-100 text-amber-700",
  delivered: "bg-brand-100 text-brand-700",
  invoiced: "bg-brand-100 text-brand-700",
  paid: "bg-brand-100 text-brand-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [linesTarget, setLinesTarget] = useState(null);
  const [documentsTarget, setDocumentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const loadOrders = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("purchase_orders")
      .select(
        "id, purchase_request_id, supplier_id, status, expected_delivery_date, requesting_farm_id, delivery_farm_id, paying_farm_id, pdf_url, suppliers:supplier_id(company_name), requesting_farm:requesting_farm_id(name), delivery_farm:delivery_farm_id(name), paying_farm:paying_farm_id(name)"
      )
      .order("created_at", { ascending: false });
    if (farmId !== "all") {
      query = query.or(
        `requesting_farm_id.eq.${farmId},delivery_farm_id.eq.${farmId},paying_farm_id.eq.${farmId}`
      );
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setOrders([]);
      return;
    }
    setOrders(data);
  }, [farmId]);

  useEffect(() => {
    setOrders(null);
    loadOrders();
  }, [loadOrders]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("purchase_orders").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error: rpcError } = await supabase.rpc("submit_purchase_order_for_approval", {
        p_order_id: submitTarget.id,
      });
      if (rpcError) throw rpcError;
      setSubmitTarget(null);
      await loadOrders();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("purchaseOrders.title")}</h1>
        <Button onClick={() => setFormState({ order: null })}>
          <Plus className="h-4 w-4" />
          {t("purchaseOrders.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {orders === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : orders.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseOrders.columns.supplier")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseOrders.columns.requestingFarm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseOrders.columns.deliveryFarm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseOrders.columns.payingFarm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseOrders.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseOrders.manageLines")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("purchaseOrders.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{order.suppliers?.company_name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{order.requesting_farm?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{order.delivery_farm?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{order.paying_farm?.name || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status] || STATUS_BADGE.draft}`}
                      >
                        {t(`purchaseOrders.status.${order.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setLinesTarget(order)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {t("purchaseOrders.manageLines")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {order.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => setSubmitTarget(order)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-brand-700 hover:bg-brand-100"
                            title={t("purchaseOrders.submitForApproval")}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDocumentsTarget(order)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("documents.title")}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState({ order })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(order)}
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
        <PurchaseOrderFormModal
          open
          order={formState.order}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadOrders}
        />
      )}

      {linesTarget && (
        <PurchaseOrderLinesModal open order={linesTarget} onClose={() => setLinesTarget(null)} />
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="purchase_orders"
          record={documentsTarget}
          column="pdf_url"
          mode="single"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadOrders();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("purchaseOrders.deleteConfirmTitle")}
          message={t("purchaseOrders.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {submitTarget && (
        <Modal
          open
          onClose={() => {
            setSubmitTarget(null);
            setSubmitError(null);
          }}
          title={t("purchaseOrders.submitDialogTitle")}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setSubmitTarget(null);
                  setSubmitError(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubmitForApproval} disabled={submitting}>
                {t("purchaseOrders.submitForApproval")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">{t("purchaseOrders.submitDialogMessage")}</p>
          {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
        </Modal>
      )}
    </div>
  );
}
