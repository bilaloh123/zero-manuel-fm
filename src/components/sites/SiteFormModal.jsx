import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

function toFormState(site, defaultFarmId) {
  return {
    code: site?.code ?? "",
    name: site?.name ?? "",
    farm_id: site?.farm_id ?? defaultFarmId ?? "",
    gps_lat: site?.gps_lat ?? "",
    gps_lng: site?.gps_lng ?? "",
  };
}

function toPayload(form) {
  const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    farm_id: form.farm_id,
    gps_lat: numOrNull(form.gps_lat),
    gps_lng: numOrNull(form.gps_lng),
  };
}

export default function SiteFormModal({ open, site, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(site, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!site;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (isEdit) {
        const { error: updateError } = await supabase.from("sites").update(payload).eq("id", site.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("sites").insert(payload);
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
      title={isEdit ? t("sites.edit") : t("sites.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="site-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="site-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("sites.fields.farm")} htmlFor="farm_id">
          <select
            id="farm_id"
            required
            value={form.farm_id}
            onChange={handleChange("farm_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("sites.fields.farm")}
            </option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("sites.fields.code")} htmlFor="code">
            <input
              id="code"
              required
              value={form.code}
              onChange={handleChange("code")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("sites.fields.name")} htmlFor="name">
            <input
              id="name"
              required
              value={form.name}
              onChange={handleChange("name")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={`${t("sites.fields.gpsLat")} (${t("common.optional")})`} htmlFor="gps_lat">
            <input
              id="gps_lat"
              type="number"
              step="0.000001"
              value={form.gps_lat}
              onChange={handleChange("gps_lat")}
              className={inputClass}
            />
          </FormField>
          <FormField label={`${t("sites.fields.gpsLng")} (${t("common.optional")})`} htmlFor="gps_lng">
            <input
              id="gps_lng"
              type="number"
              step="0.000001"
              value={form.gps_lng}
              onChange={handleChange("gps_lng")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
