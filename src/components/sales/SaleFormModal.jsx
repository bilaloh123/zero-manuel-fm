import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useLotOptions } from "../../hooks/useLotOptions";

const STATUS_OPTIONS = ["confirmed", "cancelled"];

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    lot_id: "",
    customer_id: "",
    quantity: "",
    unit_price: "",
    destination: "",
    status: "confirmed",
  };
}

export default function SaleFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { lots } = useLotOptions(form.farm_id);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("customers")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => setCustomers(data || []));
  }, []);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    setForm((f) => ({ ...f, farm_id: e.target.value, lot_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        lot_id: form.lot_id,
        customer_id: form.customer_id,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        destination: form.destination.trim() || null,
        status: form.status,
      };
      const { error: insertError } = await supabase.from("sales").insert(payload);
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
      title={t("sales.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="sale-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="sale-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("sales.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("sales.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("sales.fields.lot")} htmlFor="lot_id">
            <select
              id="lot_id"
              required
              disabled={!form.farm_id}
              value={form.lot_id}
              onChange={handleChange("lot_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("sales.fields.lot")}
              </option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_code}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label={t("sales.fields.customer")} htmlFor="customer_id">
          <select
            id="customer_id"
            required
            value={form.customer_id}
            onChange={handleChange("customer_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("sales.fields.customer")}
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("sales.fields.quantity")} htmlFor="quantity">
            <input
              id="quantity"
              type="number"
              required
              step="0.01"
              min="0.01"
              value={form.quantity}
              onChange={handleChange("quantity")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("sales.fields.unitPrice")} htmlFor="unit_price">
            <input
              id="unit_price"
              type="number"
              required
              step="0.01"
              min="0"
              value={form.unit_price}
              onChange={handleChange("unit_price")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("sales.fields.destination")} htmlFor="destination">
            <input
              id="destination"
              value={form.destination}
              onChange={handleChange("destination")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("sales.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`sales.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
