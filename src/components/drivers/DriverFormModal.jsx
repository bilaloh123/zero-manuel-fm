import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

function toFormState(driver, defaultFarmId) {
  return {
    farm_id: driver?.farm_id ?? defaultFarmId ?? "",
    full_name: driver?.full_name ?? "",
    cin: driver?.cin ?? "",
    phone: driver?.phone ?? "",
    license_no: driver?.license_no ?? "",
    license_categories: (driver?.license_categories || []).join(", "),
    license_expiry: driver?.license_expiry ?? "",
    current_vehicle_id: driver?.current_vehicle_id ?? "",
  };
}

export default function DriverFormModal({ open, driver, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(driver, defaultFarmId));
  const [vehicles, setVehicles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!driver;

  useEffect(() => {
    if (!form.farm_id) {
      setVehicles([]);
      return;
    }
    supabase
      .from("vehicles")
      .select("id, plate_no, status")
      .eq("farm_id", form.farm_id)
      .or(`status.eq.available${form.current_vehicle_id ? `,id.eq.${form.current_vehicle_id}` : ""}`)
      .then(({ data }) => setVehicles(data || []));
  }, [form.farm_id, form.current_vehicle_id]);

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    setForm((f) => ({ ...f, farm_id: e.target.value, current_vehicle_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const strOrNull = (v) => v.trim() || null;
      const payload = {
        farm_id: form.farm_id,
        full_name: form.full_name.trim(),
        cin: strOrNull(form.cin),
        phone: strOrNull(form.phone),
        license_no: strOrNull(form.license_no),
        license_categories: form.license_categories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        license_expiry: form.license_expiry || null,
        current_vehicle_id: form.current_vehicle_id || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("drivers").update(payload).eq("id", driver.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("drivers").insert(payload);
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
      title={isEdit ? t("drivers.edit") : t("drivers.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="driver-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="driver-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("drivers.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("drivers.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("drivers.fields.fullName")} htmlFor="full_name">
            <input
              id="full_name"
              required
              value={form.full_name}
              onChange={handleChange("full_name")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("drivers.fields.cin")} htmlFor="cin">
            <input id="cin" value={form.cin} onChange={handleChange("cin")} className={inputClass} />
          </FormField>
          <FormField label={t("drivers.fields.phone")} htmlFor="phone">
            <input id="phone" value={form.phone} onChange={handleChange("phone")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("drivers.fields.licenseNo")} htmlFor="license_no">
            <input
              id="license_no"
              value={form.license_no}
              onChange={handleChange("license_no")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("drivers.fields.licenseExpiry")} htmlFor="license_expiry">
            <input
              id="license_expiry"
              type="date"
              value={form.license_expiry}
              onChange={handleChange("license_expiry")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("drivers.fields.licenseCategories")} htmlFor="license_categories">
          <input
            id="license_categories"
            placeholder="B, C, EC"
            value={form.license_categories}
            onChange={handleChange("license_categories")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("drivers.fields.currentVehicle")} htmlFor="current_vehicle_id">
          <select
            id="current_vehicle_id"
            disabled={!form.farm_id}
            value={form.current_vehicle_id}
            onChange={handleChange("current_vehicle_id")}
            className={inputClass}
          >
            <option value="">{t("drivers.noVehicle")}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate_no}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
