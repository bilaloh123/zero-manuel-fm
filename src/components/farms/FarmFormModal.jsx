import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const STATUS_OPTIONS = ["active", "maintenance", "alert", "inactive"];

function toFormState(farm) {
  return {
    code: farm?.code ?? "",
    name: farm?.name ?? "",
    phone: farm?.phone ?? "",
    total_area_ha: farm?.total_area_ha ?? "",
    cultivated_area_ha: farm?.cultivated_area_ha ?? "",
    gps_lat: farm?.gps_lat ?? "",
    gps_lng: farm?.gps_lng ?? "",
    status: farm?.status ?? "active",
  };
}

function toPayload(form) {
  const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    phone: form.phone.trim() || null,
    total_area_ha: numOrNull(form.total_area_ha),
    cultivated_area_ha: numOrNull(form.cultivated_area_ha),
    gps_lat: numOrNull(form.gps_lat),
    gps_lng: numOrNull(form.gps_lng),
    status: form.status,
  };
}

export default function FarmFormModal({ open, farm, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState(() => toFormState(farm));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!farm;

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
      const payload = toPayload(form);

      if (isEdit) {
        const { error: updateError } = await supabase.from("farms").update(payload).eq("id", farm.id);
        if (updateError) throw updateError;
      } else {
        const { data: created, error: insertError } = await supabase
          .from("farms")
          .insert(payload)
          .select()
          .single();
        if (insertError) throw insertError;

        const { error: accessError } = await supabase
          .from("user_farm_access")
          .insert({ user_id: user.id, farm_id: created.id });
        if (accessError) throw accessError;

        await refreshProfile();
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
      title={isEdit ? t("farms.edit") : t("farms.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="farm-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="farm-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("farms.fields.code")} htmlFor="code">
            <input
              id="code"
              required
              value={form.code}
              onChange={handleChange("code")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("farms.fields.name")} htmlFor="name">
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
          <FormField label={t("farms.fields.phone")} htmlFor="phone">
            <input id="phone" value={form.phone} onChange={handleChange("phone")} className={inputClass} />
          </FormField>
          <FormField label={t("farms.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`farms.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("farms.fields.totalArea")} htmlFor="total_area_ha">
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
          <FormField label={t("farms.fields.cultivatedArea")} htmlFor="cultivated_area_ha">
            <input
              id="cultivated_area_ha"
              type="number"
              step="0.01"
              min="0"
              value={form.cultivated_area_ha}
              onChange={handleChange("cultivated_area_ha")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={`${t("farms.fields.gpsLat")} (${t("common.optional")})`} htmlFor="gps_lat">
            <input
              id="gps_lat"
              type="number"
              step="0.000001"
              value={form.gps_lat}
              onChange={handleChange("gps_lat")}
              className={inputClass}
            />
          </FormField>
          <FormField label={`${t("farms.fields.gpsLng")} (${t("common.optional")})`} htmlFor="gps_lng">
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
