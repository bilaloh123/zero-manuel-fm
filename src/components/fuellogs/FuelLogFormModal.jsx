import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useFuelTankOptions } from "../../hooks/useFuelTankOptions";
import { useProductOptions } from "../../hooks/useProductOptions";
import { useVehicleOptions } from "../../hooks/useVehicleOptions";
import { useEquipmentOptions } from "../../hooks/useEquipmentOptions";
import { useEmployeeOptions } from "../../hooks/useEmployeeOptions";

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    tank_warehouse_id: "",
    product_id: "",
    target_type: "vehicle",
    target_id: "",
    operator_id: "",
    quantity_liters: "",
    odometer_or_hours: "",
  };
}

export default function FuelLogFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { tanks } = useFuelTankOptions(form.farm_id);
  const { products } = useProductOptions();
  const { vehicles } = useVehicleOptions(form.farm_id);
  const { equipment } = useEquipmentOptions(form.farm_id);
  const { employees } = useEmployeeOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fuelProducts = products.filter((p) => p.category === "fuel");
  const productList = fuelProducts.length > 0 ? fuelProducts : products;
  const targetOptions = form.target_type === "vehicle" ? vehicles : equipment;
  const targetLabel = (item) => (form.target_type === "vehicle" ? item.plate_no : item.code);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    setForm((f) => ({ ...f, farm_id: e.target.value, tank_warehouse_id: "", target_id: "", operator_id: "" }));
  };

  const handleTargetTypeChange = (e) => {
    setForm((f) => ({ ...f, target_type: e.target.value, target_id: "" }));
  };

  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const quantity = Number(form.quantity_liters);
      const odometer = form.odometer_or_hours === "" ? null : Number(form.odometer_or_hours);

      // Nice-to-have: derive a consumption rate from the previous reading
      // for this same target, when one exists.
      let consumptionRate = null;
      const { data: previousLogs } = await supabase
        .from("fuel_logs")
        .select("odometer_or_hours, occurred_at")
        .eq("target_type", form.target_type)
        .eq("target_id", form.target_id)
        .order("occurred_at", { ascending: false })
        .limit(1);
      const previous = previousLogs?.[0];
      if (previous?.odometer_or_hours != null && odometer != null) {
        const delta = odometer - Number(previous.odometer_or_hours);
        if (delta > 0) consumptionRate = quantity / delta;
      }

      const { error: insertError } = await supabase.from("fuel_logs").insert({
        farm_id: form.farm_id,
        tank_warehouse_id: form.tank_warehouse_id,
        target_type: form.target_type,
        target_id: form.target_id,
        operator_id: form.operator_id || null,
        quantity_liters: quantity,
        odometer_or_hours: odometer,
        consumption_rate: consumptionRate,
      });
      if (insertError) throw insertError;

      const { error: movementError } = await supabase.from("stock_movements").insert({
        farm_id: form.farm_id,
        movement_type: "CONSUMPTION",
        product_id: form.product_id,
        quantity,
        source_warehouse_id: form.tank_warehouse_id,
        reason: "Plein carburant",
        user_id: user.id,
      });
      if (movementError) throw movementError;

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
      title={t("fuelLogs.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="fuel-log-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <p className="mb-3 rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">
        {t("fuelLogs.autoStockNotice")}
      </p>

      <form id="fuel-log-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("fuelLogs.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("fuelLogs.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("fuelLogs.fields.tankWarehouse")} htmlFor="tank_warehouse_id">
            <select
              id="tank_warehouse_id"
              required
              disabled={!form.farm_id}
              value={form.tank_warehouse_id}
              onChange={handleChange("tank_warehouse_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("fuelLogs.fields.tankWarehouse")}
              </option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label={t("fuelLogs.fields.fuelProduct")} htmlFor="product_id">
          <select
            id="product_id"
            required
            value={form.product_id}
            onChange={handleChange("product_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("fuelLogs.fields.fuelProduct")}
            </option>
            {productList.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("fuelLogs.targetType")} htmlFor="target_type">
            <select
              id="target_type"
              value={form.target_type}
              onChange={handleTargetTypeChange}
              className={inputClass}
            >
              <option value="vehicle">{t("fuelLogs.targetTypes.vehicle")}</option>
              <option value="equipment">{t("fuelLogs.targetTypes.equipment")}</option>
            </select>
          </FormField>

          <FormField label={t("fuelLogs.fields.target")} htmlFor="target_id">
            <select
              id="target_id"
              required
              disabled={!form.farm_id}
              value={form.target_id}
              onChange={handleChange("target_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("fuelLogs.fields.target")}
              </option>
              {targetOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {targetLabel(item)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label={t("fuelLogs.fields.operator")} htmlFor="operator_id">
          <select
            id="operator_id"
            disabled={!form.farm_id}
            value={form.operator_id}
            onChange={handleChange("operator_id")}
            className={inputClass}
          >
            <option value="">{t("common.optional")}</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("fuelLogs.fields.quantityLiters")} htmlFor="quantity_liters">
            <input
              id="quantity_liters"
              type="number"
              required
              step="0.01"
              min="0.01"
              value={form.quantity_liters}
              onChange={handleChange("quantity_liters")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("fuelLogs.fields.odometerOrHours")} htmlFor="odometer_or_hours">
            <input
              id="odometer_or_hours"
              type="number"
              step="0.01"
              min="0"
              value={form.odometer_or_hours}
              onChange={handleChange("odometer_or_hours")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
