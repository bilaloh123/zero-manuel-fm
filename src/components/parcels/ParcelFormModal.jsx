import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useSiteOptions } from "../../hooks/useSiteOptions";

function toFormState(parcel, defaultFarmId) {
  return {
    code: parcel?.code ?? "",
    name: parcel?.name ?? "",
    farm_id: parcel?.farm_id ?? defaultFarmId ?? "",
    site_id: parcel?.site_id ?? "",
    total_area_ha: parcel?.total_area_ha ?? "",
    usable_area_ha: parcel?.usable_area_ha ?? "",
    gps_lat: parcel?.gps_lat ?? "",
    gps_lng: parcel?.gps_lng ?? "",
  };
}

function toPayload(form) {
  const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  return {
    code: form.code.trim(),
    name: form.name.trim() || null,
    farm_id: form.farm_id,
    site_id: form.site_id || null,
    total_area_ha: numOrNull(form.total_area_ha),
    usable_area_ha: numOrNull(form.usable_area_ha),
    gps_lat: numOrNull(form.gps_lat),
    gps_lng: numOrNull(form.gps_lng),
  };
}

export default function ParcelFormModal({ open, parcel, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(parcel, defaultFarmId));
  const { sites } = useSiteOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!parcel;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    const farm_id = e.target.value;
    setForm((f) => ({ ...f, farm_id, site_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (isEdit) {
        const { error: updateError } = await supabase.from("parcels").update(payload).eq("id", parcel.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("parcels").insert(payload);
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
      title={isEdit ? t("parcels.edit") : t("parcels.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="parcel-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="parcel-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("parcels.fields.farm")} htmlFor="farm_id">
            <select
              id="farm_id"
              required
              value={form.farm_id}
              onChange={handleFarmChange}
              className={inputClass}
            >
              <option value="" disabled>
                {t("parcels.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("parcels.fields.site")} htmlFor="site_id">
            <select
              id="site_id"
              required
              disabled={!form.farm_id}
              value={form.site_id}
              onChange={handleChange("site_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {form.farm_id ? t("parcels.fields.site") : t("parcels.selectFarmFirst")}
              </option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("parcels.fields.code")} htmlFor="code">
            <input
              id="code"
              required
              value={form.code}
              onChange={handleChange("code")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("parcels.fields.name")} htmlFor="name">
            <input id="name" value={form.name} onChange={handleChange("name")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("parcels.fields.totalArea")} htmlFor="total_area_ha">
            <input
              id="total_area_ha"
              type="number"
              step="0.01"
              min="0"
              value={form.total_area_ha}
              onChange={handleChange("total_area_ha")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("parcels.fields.usableArea")} htmlFor="usable_area_ha">
            <input
              id="usable_area_ha"
              type="number"
              step="0.01"
              min="0"
              value={form.usable_area_ha}
              onChange={handleChange("usable_area_ha")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={`${t("parcels.fields.gpsLat")} (${t("common.optional")})`} htmlFor="gps_lat">
            <input
              id="gps_lat"
              type="number"
              step="0.000001"
              value={form.gps_lat}
              onChange={handleChange("gps_lat")}
              className={inputClass}
            />
          </FormField>
          <FormField label={`${t("parcels.fields.gpsLng")} (${t("common.optional")})`} htmlFor="gps_lng">
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
