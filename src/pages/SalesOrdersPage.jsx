import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, ShoppingCart, CheckCircle2, XCircle } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Modal from "../components/ui/Modal";
import SalesOrderFormModal from "../components/salesorders/SalesOrderFormModal";
import SalesOrderItemsModal from "../components/salesorders/SalesOrderItemsModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-brand-100 text-brand-700",
  in_preparation: "bg-amber-100 text-amber-700",
  partially_delivered: "bg-amber-100 text-amber-700",
  delivered: "bg-brand-100 text-brand-700",
  invoiced: "bg-brand-100 text-brand-700",
  paid: "bg-brand-100 text-brand-700",
  closed: "bg-cream-soft text-ink-muted",
  cancelled: "bg-red-100 text-red-700",
};

export default function SalesOrdersPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [itemsTarget, setItemsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadOrders = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("sales_orders")
      .select("id, order_no, status, discount_pct, allow_backorder, customers:customer_id(name)")
      .order("created_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
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
      const { error: deleteError } = await supabase.from("sales_orders").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadOrders();
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
      const { error: rpcError } = await supabase.rpc("confirm_sales_order", { p_order_id: confirmTarget.id });
      if (rpcError) throw rpcError;
      setConfirmTarget(null);
      await loadOrders();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setActionError(null);
    try {
      const { error: rpcError } = await supabase.rpc("cancel_sales_order", { p_order_id: cancelTarget.id });
      if (rpcError) throw rpcError;
      setCancelTarget(null);
      await loadOrders();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("salesOrders.title")}</h1>
        <Button onClick={() => setFormState({ order: null })}>
          <Plus className="h-4 w-4" />
          {t("salesOrders.add")}
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
                  <th className="px-3 py-2 text-start font-medium">{t("salesOrders.columns.orderNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("salesOrders.columns.customer")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("salesOrders.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("salesOrders.columns.backorder")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("salesOrders.manageItems")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("salesOrders.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{order.order_no}</td>
                    <td className="px-3 py-3 text-ink-muted">{order.customers?.name || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status] || STATUS_BADGE.draft}`}
                      >
                        {t(`salesOrders.status.${order.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">
                      {order.allow_backorder ? t("common.yes") : t("common.no")}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setItemsTarget(order)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {t("salesOrders.manageItems")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {order.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => setConfirmTarget(order)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-brand-700 hover:bg-brand-100"
                            title={t("salesOrders.confirmAction")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {(order.status === "draft" || order.status === "confirmed") && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(order)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-amber-700 hover:bg-amber-100"
                            title={t("salesOrders.cancelAction")}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {order.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => setFormState({ order })}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {order.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(order)}
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

      {formState && (
        <SalesOrderFormModal
          open
          order={formState.order}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadOrders}
        />
      )}

      {itemsTarget && (
        <SalesOrderItemsModal
          open
          order={itemsTarget}
          onClose={() => {
            setItemsTarget(null);
            loadOrders();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("salesOrders.deleteConfirmTitle")}
          message={t("salesOrders.deleteConfirmMessage")}
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
          title={t("salesOrders.confirmDialogTitle")}
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
                {t("salesOrders.confirmAction")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">{t("salesOrders.confirmDialogMessage", { no: confirmTarget.order_no })}</p>
          {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
        </Modal>
      )}

      {cancelTarget && (
        <Modal
          open
          onClose={() => {
            setCancelTarget(null);
            setActionError(null);
          }}
          title={t("salesOrders.cancelDialogTitle")}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setCancelTarget(null);
                  setActionError(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
                {t("salesOrders.cancelAction")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">{t("salesOrders.cancelDialogMessage", { no: cancelTarget.order_no })}</p>
          {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
        </Modal>
      )}
    </div>
  );
}
