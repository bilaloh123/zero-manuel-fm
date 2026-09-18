import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useWarehouseOptions } from "../../hooks/useWarehouseOptions";

const QUALITY_OPTIONS = ["accepted", "rejected", "partial"];

function emptyForm() {
  return {
    purchase_order_id: "",
    line_id: "",
    warehouse_id: "",
    received_quantity: "",
    quality_status: "accepted",
  };
}

export default function ReceptionFormModal({ open, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedOrder = orders.find((o) => o.id === form.purchase_order_id);
  const { warehouses } = useWarehouseOptions(selectedOrder?.delivery_farm_id);

  useEffect(() => {
    supabase
      .from("purchase_orders")
      .select("id, status, delivery_farm_id, suppliers:supplier_id(company_name), delivery_farm:delivery_farm_id(name)")
      .neq("status", "cancelled")
      .then(({ data }) => setOrders(data || []));
  }, []);

  useEffect(() => {
    if (!form.purchase_order_id) {
      setLines([]);
      return;
    }
    supabase
      .from("purchase_order_lines")
      .select("id, product_id, quantity, products:product_id(name_ar, name_fr, unit)")
      .eq("order_id", form.purchase_order_id)
      .then(({ data }) => setLines(data || []));
  }, [form.purchase_order_id]);

  const resetAndClose = () => {
    setForm(emptyForm());
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleOrderChange = (e) => {
    setForm((f) => ({ ...f, purchase_order_id: e.target.value, line_id: "", warehouse_id: "", received_quantity: "" }));
  };

  const handleLineChange = (e) => {
    const line_id = e.target.value;
    const line = lines.find((l) => l.id === line_id);
    setForm((f) => ({ ...f, line_id, received_quantity: line ? String(line.quantity) : f.received_quantity }));
  };

  const orderLabel = (order) => `${order.suppliers?.company_name || ""} → ${order.delivery_farm?.name || ""}`;
  const lineLabel = (line) => {
    const p = line.products;
    const name = p ? (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar) : "";
    return `${name} (${line.quantity})`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const selectedLine = lines.find((l) => l.id === form.line_id);
      const quantity = Number(form.received_quantity);

      const { error: receptionError } = await supabase.from("receptions").insert({
        purchase_order_id: form.purchase_order_id,
        delivery_farm_id: selectedOrder.delivery_farm_id,
        received_quantity: quantity,
        quality_status: form.quality_status,
        received_by: user.id,
      });
      if (receptionError) throw receptionError;

      if (form.quality_status !== "rejected" && quantity > 0) {
        const { error: movementError } = await supabase.from("stock_movements").insert({
          farm_id: selectedOrder.delivery_farm_id,
          movement_type: "PURCHASE_RECEIPT",
          product_id: selectedLine.product_id,
          quantity,
          destination_warehouse_id: form.warehouse_id,
          reason: `Réception BC`,
          user_id: user.id,
        });
        if (movementError) throw movementError;
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
      title={t("receptions.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="reception-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <p className="mb-3 rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">
        {t("receptions.autoStockNotice")}
      </p>

      <form id="reception-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("receptions.fields.purchaseOrder")} htmlFor="purchase_order_id">
          <select
            id="purchase_order_id"
            required
            value={form.purchase_order_id}
            onChange={handleOrderChange}
            className={inputClass}
          >
            <option value="" disabled>
              {t("receptions.fields.purchaseOrder")}
            </option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {orderLabel(order)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("receptions.fields.line")} htmlFor="line_id">
          <select
            id="line_id"
            required
            disabled={!form.purchase_order_id}
            value={form.line_id}
            onChange={handleLineChange}
            className={inputClass}
          >
            <option value="" disabled>
              {form.purchase_order_id ? t("receptions.fields.line") : t("receptions.selectOrderFirst")}
            </option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {lineLabel(line)}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("receptions.fields.warehouse")} htmlFor="warehouse_id">
            <select
              id="warehouse_id"
              required
              disabled={!form.purchase_order_id}
              value={form.warehouse_id}
              onChange={handleChange("warehouse_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("receptions.fields.warehouse")}
              </option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("receptions.fields.receivedQuantity")} htmlFor="received_quantity">
            <input
              id="received_quantity"
              type="number"
              required
              step="0.01"
              min="0"
              value={form.received_quantity}
              onChange={handleChange("received_quantity")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("receptions.fields.qualityStatus")} htmlFor="quality_status">
          <select
            id="quality_status"
            value={form.quality_status}
            onChange={handleChange("quality_status")}
            className={inputClass}
          >
            {QUALITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`receptions.quality.${opt}`)}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
