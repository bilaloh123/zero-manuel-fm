import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useVehicleOptions } from "../../hooks/useVehicleOptions";
import { useDriverOptions } from "../../hooks/useDriverOptions";
import { useProductOptions } from "../../hooks/useProductOptions";
import { useLotOptions } from "../../hooks/useLotOptions";

const STATUS_OPTIONS = ["planned", "in_progress", "completed"];

function toLocalInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(localString) {
  if (!localString) return null;
  return new Date(localString).toISOString();
}

function toFormState(mission, defaultFarmId) {
  return {
    source_farm_id: mission?.source_farm_id ?? defaultFarmId ?? "",
    destination_farm_id: mission?.destination_farm_id ?? "",
    vehicle_id: mission?.vehicle_id ?? "",
    driver_id: mission?.driver_id ?? "",
    product_id: mission?.product_id ?? "",
    lot_id: mission?.lot_id ?? "",
    quantity: mission?.quantity ?? "",
    departure_time: toLocalInput(mission?.departure_time),
    expected_arrival: toLocalInput(mission?.expected_arrival),
    actual_arrival: toLocalInput(mission?.actual_arrival),
    distance_km: mission?.distance_km ?? "",
    fuel_used: mission?.fuel_used ?? "",
    status: mission?.status ?? "planned",
  };
}

export default function TransportMissionFormModal({ open, mission, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(mission, defaultFarmId));
  const { vehicles } = useVehicleOptions(form.source_farm_id);
  const { drivers } = useDriverOptions(form.source_farm_id);
  const { products } = useProductOptions();
  const { lots } = useLotOptions(form.source_farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!mission;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSourceFarmChange = (e) => {
    const source_farm_id = e.target.value;
    setForm((f) => ({ ...f, source_farm_id, vehicle_id: "", driver_id: "", lot_id: "" }));
  };

  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        source_farm_id: form.source_farm_id,
        destination_farm_id: form.destination_farm_id,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        product_id: form.product_id,
        lot_id: form.lot_id || null,
        quantity: form.quantity === "" ? null : Number(form.quantity),
        departure_time: fromLocalInput(form.departure_time),
        expected_arrival: fromLocalInput(form.expected_arrival),
        actual_arrival: fromLocalInput(form.actual_arrival),
        distance_km: form.distance_km === "" ? null : Number(form.distance_km),
        fuel_used: form.fuel_used === "" ? null : Number(form.fuel_used),
        status: form.status,
      };

      let missionId = mission?.id;
      if (isEdit) {
        const { error: updateError } = await supabase.from("transport_missions").update(payload).eq("id", mission.id);
        if (updateError) throw updateError;
      } else {
        const { data: created, error: insertError } = await supabase
          .from("transport_missions")
          .insert(payload)
          .select()
          .single();
        if (insertError) throw insertError;
        missionId = created.id;
      }

      // Traceability: only fire on the null -> set transition, and only when a lot is linked.
      if (payload.lot_id) {
        const wasDepartureSet = !!mission?.departure_time;
        const isDepartureSetNow = !!payload.departure_time;
        if (!wasDepartureSet && isDepartureSetNow) {
          await supabase.from("traceability_events").insert({
            lot_id: payload.lot_id,
            event_type: "transport_departure",
            occurred_at: payload.departure_time,
            actor_id: user.id,
            farm_id: form.source_farm_id,
            related_id: missionId,
          });
        }

        const wasArrivalSet = !!mission?.actual_arrival;
        const isArrivalSetNow = !!payload.actual_arrival;
        if (!wasArrivalSet && isArrivalSetNow) {
          await supabase.from("traceability_events").insert({
            lot_id: payload.lot_id,
            event_type: "transport_arrival",
            occurred_at: payload.actual_arrival,
            actor_id: user.id,
            farm_id: form.destination_farm_id,
            related_id: missionId,
          });
        }
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
      title={isEdit ? t("transportMissions.edit") : t("transportMissions.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="transport-mission-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="transport-mission-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("transportMissions.fields.sourceFarm")} htmlFor="source_farm_id">
            <select
              id="source_farm_id"
              required
              value={form.source_farm_id}
              onChange={handleSourceFarmChange}
              className={inputClass}
            >
              <option value="" disabled>
                {t("transportMissions.fields.sourceFarm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("transportMissions.fields.destinationFarm")} htmlFor="destination_farm_id">
            <select
              id="destination_farm_id"
              required
              value={form.destination_farm_id}
              onChange={handleChange("destination_farm_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("transportMissions.fields.destinationFarm")}
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
          <FormField label={t("transportMissions.fields.vehicle")} htmlFor="vehicle_id">
            <select
              id="vehicle_id"
              disabled={!form.source_farm_id}
              value={form.vehicle_id}
              onChange={handleChange("vehicle_id")}
              className={inputClass}
            >
              <option value="">{t("common.optional")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_no}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("transportMissions.fields.driver")} htmlFor="driver_id">
            <select
              id="driver_id"
              disabled={!form.source_farm_id}
              value={form.driver_id}
              onChange={handleChange("driver_id")}
              className={inputClass}
            >
              <option value="">{t("common.optional")}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("transportMissions.fields.product")} htmlFor="product_id">
            <select
              id="product_id"
              required
              value={form.product_id}
              onChange={handleChange("product_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("transportMissions.fields.product")}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {productLabel(p)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("transportMissions.fields.lot")} htmlFor="lot_id">
            <select
              id="lot_id"
              disabled={!form.source_farm_id}
              value={form.lot_id}
              onChange={handleChange("lot_id")}
              className={inputClass}
            >
              <option value="">{t("transportMissions.noLot")}</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_code}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("transportMissions.fields.quantity")} htmlFor="quantity">
            <input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              value={form.quantity}
              onChange={handleChange("quantity")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("transportMissions.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`transportMissions.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("transportMissions.fields.departureTime")} htmlFor="departure_time">
            <input
              id="departure_time"
              type="datetime-local"
              value={form.departure_time}
              onChange={handleChange("departure_time")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("transportMissions.fields.expectedArrival")} htmlFor="expected_arrival">
            <input
              id="expected_arrival"
              type="datetime-local"
              value={form.expected_arrival}
              onChange={handleChange("expected_arrival")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("transportMissions.fields.actualArrival")} htmlFor="actual_arrival">
            <input
              id="actual_arrival"
              type="datetime-local"
              value={form.actual_arrival}
              onChange={handleChange("actual_arrival")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("transportMissions.fields.distanceKm")} htmlFor="distance_km">
            <input
              id="distance_km"
              type="number"
              step="0.01"
              min="0"
              value={form.distance_km}
              onChange={handleChange("distance_km")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("transportMissions.fields.fuelUsed")} htmlFor="fuel_used">
            <input
              id="fuel_used"
              type="number"
              step="0.01"
              min="0"
              value={form.fuel_used}
              onChange={handleChange("fuel_used")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
