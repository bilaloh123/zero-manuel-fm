import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useVehicleOptions } from "../../hooks/useVehicleOptions";
import { useDriverOptions } from "../../hooks/useDriverOptions";

function nowLocalInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(defaultSalesOrderId) {
  return {
    sales_order_id: defaultSalesOrderId ?? "",
    vehicle_id: "",
    driver_id: "",
    delivered_at: nowLocalInput(),
    notes: "",
  };
}

export default function DeliveryFormModal({ open, defaultSalesOrderId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(() => emptyForm(defaultSalesOrderId));
  const selectedOrder = orders.find((o) => o.id === form.sales_order_id);
  const { vehicles } = useVehicleOptions(selectedOrder?.farm_id);
  const { drivers } = useDriverOptions(selectedOrder?.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("sales_orders")
      .select("id, order_no, farm_id, customer_id, status")
      .in("status", ["confirmed", "partially_delivered"])
      .then(({ data }) => setOrders(data || []));
  }, []);

  const resetAndClose = () => {
    setForm(emptyForm(defaultSalesOrderId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sales_order_id: form.sales_order_id,
        farm_id: selectedOrder.farm_id,
        customer_id: selectedOrder.customer_id,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        delivered_at: form.delivered_at ? new Date(form.delivered_at).toISOString() : new Date().toISOString(),
        notes: form.notes.trim() || null,
        created_by: user.id,
      };
      const { error: insertError } = await supabase.from("deliveries").insert(payload);
      if (insertError) throw insertError;
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
      title={t("deliveries.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="delivery-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="delivery-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("deliveries.fields.salesOrder")} htmlFor="sales_order_id">
          <select
            id="sales_order_id"
            required
            value={form.sales_order_id}
            onChange={handleChange("sales_order_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("deliveries.fields.salesOrder")}
            </option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_no}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("deliveries.fields.vehicle")} htmlFor="vehicle_id">
            <select
              id="vehicle_id"
              value={form.vehicle_id}
              onChange={handleChange("vehicle_id")}
              disabled={!selectedOrder}
              className={inputClass}
            >
              <option value="">{t("deliveries.noVehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_no}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("deliveries.fields.driver")} htmlFor="driver_id">
            <select
              id="driver_id"
              value={form.driver_id}
              onChange={handleChange("driver_id")}
              disabled={!selectedOrder}
              className={inputClass}
            >
              <option value="">{t("deliveries.noDriver")}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label={t("deliveries.fields.deliveredAt")} htmlFor="delivered_at">
          <input
            id="delivered_at"
            type="datetime-local"
            value={form.delivered_at}
            onChange={handleChange("delivered_at")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("deliveries.fields.notes")} htmlFor="notes">
          <textarea id="notes" rows={2} value={form.notes} onChange={handleChange("notes")} className={inputClass} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
