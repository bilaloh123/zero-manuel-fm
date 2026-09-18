import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useSupplierOptions } from "../../hooks/useSupplierOptions";

const STATUS_OPTIONS = ["draft", "approved", "confirmed", "delivered", "invoiced", "paid", "cancelled"];

function toFormState(order, defaultFarmId) {
  return {
    purchase_request_id: order?.purchase_request_id ?? "",
    supplier_id: order?.supplier_id ?? "",
    requesting_farm_id: order?.requesting_farm_id ?? defaultFarmId ?? "",
    delivery_farm_id: order?.delivery_farm_id ?? defaultFarmId ?? "",
    paying_farm_id: order?.paying_farm_id ?? defaultFarmId ?? "",
    status: order?.status ?? "draft",
    expected_delivery_date: order?.expected_delivery_date ?? "",
  };
}

export default function PurchaseOrderFormModal({ open, order, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { farms } = useFarmOptions();
  const { suppliers } = useSupplierOptions();
  const [form, setForm] = useState(() => toFormState(order, defaultFarmId));
  const [openRequests, setOpenRequests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!order;

  useEffect(() => {
    supabase
      .from("purchase_requests")
      .select("id, quantity, requesting_farm_id, farms:requesting_farm_id(name), products:product_id(name_ar, name_fr, unit)")
      .eq("status", "open")
      .then(({ data }) => setOpenRequests(data || []));
  }, []);

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleRequestChange = (e) => {
    const purchase_request_id = e.target.value;
    const linked = openRequests.find((r) => r.id === purchase_request_id);
    setForm((f) => ({
      ...f,
      purchase_request_id,
      requesting_farm_id: linked ? linked.requesting_farm_id : f.requesting_farm_id,
    }));
  };

  const requestLabel = (r) => {
    const p = r.products;
    const name = p ? (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar) : "";
    return `${r.farms?.name || ""} — ${name} (${r.quantity})`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        purchase_request_id: form.purchase_request_id || null,
        supplier_id: form.supplier_id,
        requesting_farm_id: form.requesting_farm_id,
        delivery_farm_id: form.delivery_farm_id,
        paying_farm_id: form.paying_farm_id,
        status: form.status,
        expected_delivery_date: form.expected_delivery_date || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("purchase_orders").update(payload).eq("id", order.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("purchase_orders").insert(payload);
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
      title={isEdit ? t("purchaseOrders.edit") : t("purchaseOrders.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="purchase-order-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="purchase-order-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("purchaseOrders.fields.linkedRequest")} htmlFor="purchase_request_id">
          <select
            id="purchase_request_id"
            value={form.purchase_request_id}
            onChange={handleRequestChange}
            className={inputClass}
          >
            <option value="">{t("purchaseOrders.noLinkedRequest")}</option>
            {openRequests.map((r) => (
              <option key={r.id} value={r.id}>
                {requestLabel(r)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("purchaseOrders.fields.supplier")} htmlFor="supplier_id">
          <select
            id="supplier_id"
            required
            value={form.supplier_id}
            onChange={handleChange("supplier_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("purchaseOrders.fields.supplier")}
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.company_name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("purchaseOrders.fields.requestingFarm")} htmlFor="requesting_farm_id">
            <select
              id="requesting_farm_id"
              required
              value={form.requesting_farm_id}
              onChange={handleChange("requesting_farm_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("purchaseOrders.fields.requestingFarm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("purchaseOrders.fields.deliveryFarm")} htmlFor="delivery_farm_id">
            <select
              id="delivery_farm_id"
              required
              value={form.delivery_farm_id}
              onChange={handleChange("delivery_farm_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("purchaseOrders.fields.deliveryFarm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("purchaseOrders.fields.payingFarm")} htmlFor="paying_farm_id">
            <select
              id="paying_farm_id"
              required
              value={form.paying_farm_id}
              onChange={handleChange("paying_farm_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("purchaseOrders.fields.payingFarm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("purchaseOrders.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`purchaseOrders.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("purchaseOrders.fields.expectedDeliveryDate")} htmlFor="expected_delivery_date">
            <input
              id="expected_delivery_date"
              type="date"
              value={form.expected_delivery_date}
              onChange={handleChange("expected_delivery_date")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
