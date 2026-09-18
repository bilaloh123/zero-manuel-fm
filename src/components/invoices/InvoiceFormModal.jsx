import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

const STATUS_OPTIONS = ["unpaid", "partial", "paid"];

function toFormState(invoice, defaultFarmId) {
  return {
    purchase_order_id: invoice?.purchase_order_id ?? "",
    paying_farm_id: invoice?.paying_farm_id ?? defaultFarmId ?? "",
    amount: invoice?.amount ?? "",
    due_date: invoice?.due_date ?? "",
    status: invoice?.status ?? "unpaid",
  };
}

export default function InvoiceFormModal({ open, invoice, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(() => toFormState(invoice, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!invoice;

  useEffect(() => {
    supabase
      .from("purchase_orders")
      .select("id, paying_farm_id, suppliers:supplier_id(company_name), paying_farm:paying_farm_id(name)")
      .then(({ data }) => setOrders(data || []));
  }, []);

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleOrderChange = (e) => {
    const purchase_order_id = e.target.value;
    const order = orders.find((o) => o.id === purchase_order_id);
    setForm((f) => ({
      ...f,
      purchase_order_id,
      paying_farm_id: order ? order.paying_farm_id : f.paying_farm_id,
    }));
  };

  const orderLabel = (order) => `${order.suppliers?.company_name || ""} → ${order.paying_farm?.name || ""}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        purchase_order_id: form.purchase_order_id,
        paying_farm_id: form.paying_farm_id,
        amount: Number(form.amount),
        due_date: form.due_date || null,
        status: form.status,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("invoices").update(payload).eq("id", invoice.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("invoices").insert(payload);
        if (insertError) throw insertError;
      }
      onSaved();
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
      title={isEdit ? t("invoices.edit") : t("invoices.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="invoice-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("invoices.fields.purchaseOrder")} htmlFor="purchase_order_id">
          <select
            id="purchase_order_id"
            required
            value={form.purchase_order_id}
            onChange={handleOrderChange}
            className={inputClass}
          >
            <option value="" disabled>
              {t("invoices.fields.purchaseOrder")}
            </option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {orderLabel(order)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("invoices.fields.payingFarm")} htmlFor="paying_farm_id">
          <select
            id="paying_farm_id"
            required
            value={form.paying_farm_id}
            onChange={handleChange("paying_farm_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("invoices.fields.payingFarm")}
            </option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("invoices.fields.amount")} htmlFor="amount">
            <input
              id="amount"
              type="number"
              required
              step="0.01"
              min="0"
              value={form.amount}
              onChange={handleChange("amount")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("invoices.fields.dueDate")} htmlFor="due_date">
            <input
              id="due_date"
              type="date"
              value={form.due_date}
              onChange={handleChange("due_date")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("invoices.fields.status")} htmlFor="status">
          <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`invoices.status.${opt}`)}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
