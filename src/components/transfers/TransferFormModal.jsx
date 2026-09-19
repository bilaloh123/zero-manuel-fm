import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useProductOptions } from "../../hooks/useProductOptions";

function toFormState(transfer) {
  return {
    product_id: transfer?.product_id ?? "",
    quantity: transfer?.quantity ?? "",
    source_farm_id: transfer?.source_farm_id ?? "",
    destination_farm_id: transfer?.destination_farm_id ?? "",
  };
}

export default function TransferFormModal({ open, transfer, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const { products } = useProductOptions();
  const [form, setForm] = useState(() => toFormState(transfer));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!transfer;

  const resetAndClose = () => {
    setForm(toFormState(null));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.source_farm_id === form.destination_farm_id) {
      setError(t("transfers.errors.sameFarm"));
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const { error: updateError } = await supabase
          .from("transfers")
          .update({ quantity: Number(form.quantity) })
          .eq("id", transfer.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("transfers").insert({
          product_id: form.product_id,
          quantity: Number(form.quantity),
          source_farm_id: form.source_farm_id,
          destination_farm_id: form.destination_farm_id,
          requested_by: user.id,
          status: "requested",
        });
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
      title={isEdit ? t("transfers.edit") : t("transfers.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="transfer-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("transfers.fields.product")} htmlFor="product_id">
          <select
            id="product_id"
            required
            disabled={isEdit}
            value={form.product_id}
            onChange={handleChange("product_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("transfers.fields.product")}
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {productLabel(product)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("transfers.fields.quantity")} htmlFor="quantity">
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

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("transfers.fields.sourceFarm")} htmlFor="source_farm_id">
            <select
              id="source_farm_id"
              required
              disabled={isEdit}
              value={form.source_farm_id}
              onChange={handleChange("source_farm_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("transfers.fields.sourceFarm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("transfers.fields.destinationFarm")} htmlFor="destination_farm_id">
            <select
              id="destination_farm_id"
              required
              disabled={isEdit}
              value={form.destination_farm_id}
              onChange={handleChange("destination_farm_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("transfers.fields.destinationFarm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
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
