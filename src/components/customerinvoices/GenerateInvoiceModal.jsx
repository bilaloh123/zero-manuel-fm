import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

export default function GenerateInvoiceModal({ open, onClose, onGenerated }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [salesOrderId, setSalesOrderId] = useState("");
  const [deliveries, setDeliveries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("sales_orders")
      .select("id, order_no, status")
      .in("status", ["confirmed", "partially_delivered", "delivered"])
      .then(({ data }) => setOrders(data || []));
  }, []);

  useEffect(() => {
    if (!salesOrderId) {
      setDeliveries([]);
      setSelectedIds([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("deliveries")
      .select("id, delivery_no, delivered_at, delivery_items(id, customer_invoice_id)")
      .eq("sales_order_id", salesOrderId)
      .eq("status", "confirmed")
      .then(({ data }) => {
        if (cancelled) return;
        const invoiceable = (data || []).filter((d) => d.delivery_items.some((i) => i.customer_invoice_id === null));
        setDeliveries(invoiceable);
        setSelectedIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [salesOrderId]);

  const toggleSelected = (id) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const resetAndClose = () => {
    setSalesOrderId("");
    setDeliveries([]);
    setSelectedIds([]);
    setDueDate("");
    setError(null);
    onClose();
  };

  const handleGenerate = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("generate_customer_invoice", {
        p_delivery_ids: selectedIds,
        p_due_date: dueDate || null,
      });
      if (rpcError) throw rpcError;
      onGenerated(data);
      resetAndClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={t("customerInvoices.generate.title")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleGenerate} disabled={saving || selectedIds.length === 0}>
            {t("customerInvoices.generate.confirm")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label={t("customerInvoices.generate.salesOrder")} htmlFor="sales_order_id">
          <select
            id="sales_order_id"
            value={salesOrderId}
            onChange={(e) => setSalesOrderId(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("customerInvoices.generate.selectOrder")}</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_no}
              </option>
            ))}
          </select>
        </FormField>

        {salesOrderId && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">{t("customerInvoices.generate.pickDeliveries")}</p>
            {deliveries.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("customerInvoices.generate.noInvoiceableDeliveries")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {deliveries.map((d) => (
                  <li key={d.id}>
                    <label className="flex items-center gap-2 rounded-control border border-border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(d.id)}
                        onChange={() => toggleSelected(d.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span className="font-mono text-xs">{d.delivery_no}</span>
                      <span className="text-ink-muted">{new Date(d.delivered_at).toLocaleDateString()}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <FormField label={t("customerInvoices.generate.dueDate")} htmlFor="due_date">
          <input
            id="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
