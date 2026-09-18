import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

const CATEGORY_OPTIONS = ["avocat", "fraise", "agrumes", "autres"];

function toFormState(crop) {
  return {
    name_ar: crop?.name_ar ?? "",
    name_fr: crop?.name_fr ?? "",
    category: crop?.category ?? CATEGORY_OPTIONS[0],
  };
}

export default function CropFormModal({ open, crop, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormState(crop));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!crop;

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
        name_ar: form.name_ar.trim() || null,
        name_fr: form.name_fr.trim() || null,
        category: form.category,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("crops").update(payload).eq("id", crop.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("crops").insert(payload);
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
      title={isEdit ? t("crops.edit") : t("crops.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="crop-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="crop-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("crops.fields.nameAr")} htmlFor="name_ar">
            <input
              id="name_ar"
              required
              dir="rtl"
              value={form.name_ar}
              onChange={handleChange("name_ar")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("crops.fields.nameFr")} htmlFor="name_fr">
            <input
              id="name_fr"
              required
              value={form.name_fr}
              onChange={handleChange("name_fr")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("crops.fields.category")} htmlFor="category">
          <select
            id="category"
            value={form.category}
            onChange={handleChange("category")}
            className={inputClass}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`crops.categories.${opt}`)}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
