import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { generateTicketNo } from "../../lib/codeGenerators";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useVehicleOptions } from "../../hooks/useVehicleOptions";
import { useDriverOptions } from "../../hooks/useDriverOptions";
import { useProductOptions } from "../../hooks/useProductOptions";
import { useLotOptions } from "../../hooks/useLotOptions";

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    lot_id: "",
    vehicle_id: "",
    driver_id: "",
    product_id: "",
    gross_weight: "",
    tare_weight: "",
    source: "",
    destination: "",
  };
}

export default function WeighingTicketFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { vehicles } = useVehicleOptions(form.farm_id);
  const { drivers } = useDriverOptions(form.farm_id);
  const { products } = useProductOptions();
  const { lots } = useLotOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const netWeight = useMemo(() => {
    const gross = Number(form.gross_weight);
    const tare = Number(form.tare_weight);
    if (Number.isNaN(gross) || Number.isNaN(tare)) return "";
    const net = gross - tare;
    return net >= 0 ? net.toFixed(2) : "";
  }, [form.gross_weight, form.tare_weight]);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    setForm((f) => ({ ...f, farm_id: e.target.value, vehicle_id: "", driver_id: "", lot_id: "" }));
  };

  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const ticketNo = await generateTicketNo(new Date().getFullYear());
      const payload = {
        ticket_no: ticketNo,
        lot_id: form.lot_id || null,
        farm_id: form.farm_id,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        product_id: form.product_id,
        gross_weight: Number(form.gross_weight),
        tare_weight: Number(form.tare_weight),
        net_weight: Number(netWeight),
        source: form.source.trim() || null,
        destination: form.destination.trim() || null,
      };
      const { error: insertError } = await supabase.from("weighing_tickets").insert(payload);
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
      title={t("weighingTickets.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="weighing-ticket-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="weighing-ticket-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("weighingTickets.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("weighingTickets.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("weighingTickets.fields.lot")} htmlFor="lot_id">
            <select
              id="lot_id"
              disabled={!form.farm_id}
              value={form.lot_id}
              onChange={handleChange("lot_id")}
              className={inputClass}
            >
              <option value="">{t("weighingTickets.noLot")}</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_code}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("weighingTickets.fields.vehicle")} htmlFor="vehicle_id">
            <select
              id="vehicle_id"
              disabled={!form.farm_id}
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

          <FormField label={t("weighingTickets.fields.driver")} htmlFor="driver_id">
            <select
              id="driver_id"
              disabled={!form.farm_id}
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

        <FormField label={t("weighingTickets.fields.product")} htmlFor="product_id">
          <select
            id="product_id"
            required
            value={form.product_id}
            onChange={handleChange("product_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("weighingTickets.fields.product")}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("weighingTickets.fields.grossWeight")} htmlFor="gross_weight">
            <input
              id="gross_weight"
              type="number"
              required
              step="0.01"
              min="0"
              value={form.gross_weight}
              onChange={handleChange("gross_weight")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("weighingTickets.fields.tareWeight")} htmlFor="tare_weight">
            <input
              id="tare_weight"
              type="number"
              required
              step="0.01"
              min="0"
              value={form.tare_weight}
              onChange={handleChange("tare_weight")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("weighingTickets.fields.netWeight")} htmlFor="net_weight">
            <input id="net_weight" readOnly value={netWeight} className={`${inputClass} bg-cream-soft`} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("weighingTickets.fields.source")} htmlFor="source">
            <input id="source" value={form.source} onChange={handleChange("source")} className={inputClass} />
          </FormField>
          <FormField label={t("weighingTickets.fields.destination")} htmlFor="destination">
            <input
              id="destination"
              value={form.destination}
              onChange={handleChange("destination")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
