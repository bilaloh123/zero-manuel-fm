import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

const CATEGORY_OPTIONS = [
  "fertilizer",
  "pesticide",
  "seed",
  "fuel",
  "packaging",
  "harvested_product",
  "spare_part",
];

const UNIT_OPTIONS = ["kg", "g", "L", "piece", "sac_25kg", "sac_50kg", "tonne", "carton"];

function toFormState(product) {
  return {
    sku: product?.sku ?? "",
    name_ar: product?.name_ar ?? "",
    name_fr: product?.name_fr ?? "",
    category: product?.category ?? CATEGORY_OPTIONS[0],
    unit: product?.unit ?? UNIT_OPTIONS[0],
  };
}

export default function ProductFormModal({ open, product, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormState(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!product;

  const resetAndClose = () => {
    setForm(toFormState(null));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sku: form.sku.trim() || null,
        name_ar: form.name_ar.trim() || null,
        name_fr: form.name_fr.trim() || null,
        category: form.category,
        unit: form.unit,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("products").update(payload).eq("id", product.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("products").insert(payload);
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
      title={isEdit ? t("products.edit") : t("products.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="product-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("products.fields.nameAr")} htmlFor="name_ar">
            <input
              id="name_ar"
              required
              dir="rtl"
              value={form.name_ar}
              onChange={handleChange("name_ar")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("products.fields.nameFr")} htmlFor="name_fr">
            <input
              id="name_fr"
              required
              value={form.name_fr}
              onChange={handleChange("name_fr")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("products.fields.sku")} htmlFor="sku">
            <input id="sku" value={form.sku} onChange={handleChange("sku")} className={inputClass} />
          </FormField>
          <FormField label={t("products.fields.unit")} htmlFor="unit">
            <select id="unit" required value={form.unit} onChange={handleChange("unit")} className={inputClass}>
              {UNIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`products.units.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label={t("products.fields.category")} htmlFor="category">
          <select
            id="category"
            value={form.category}
            onChange={handleChange("category")}
            className={inputClass}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`products.categories.${opt}`)}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
