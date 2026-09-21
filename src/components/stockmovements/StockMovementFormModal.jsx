import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useWarehouseOptions } from "../../hooks/useWarehouseOptions";
import { useProductOptions } from "../../hooks/useProductOptions";

const MOVEMENT_TYPES = [
  "PURCHASE_RECEIPT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "CONSUMPTION",
  "HARVEST_ENTRY",
  "RETURN",
  "LOSS",
  "DAMAGE",
  "SALE",
  "SHIPMENT",
  "ADJUSTMENT",
];

const NEEDS_DESTINATION = new Set(["PURCHASE_RECEIPT", "TRANSFER_IN", "HARVEST_ENTRY", "RETURN"]);
const NEEDS_SOURCE = new Set(["TRANSFER_OUT", "CONSUMPTION", "LOSS", "DAMAGE", "SALE", "SHIPMENT"]);

function fieldRequirements(movementType) {
  if (NEEDS_DESTINATION.has(movementType)) {
    return { showSource: false, showDestination: true, requireDestination: true, requireSource: false };
  }
  if (NEEDS_SOURCE.has(movementType)) {
    return { showSource: true, showDestination: false, requireDestination: false, requireSource: true };
  }
  // ADJUSTMENT: either side, at least one required
  return { showSource: true, showDestination: true, requireDestination: false, requireSource: false };
}

function nowLocalInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    movement_type: MOVEMENT_TYPES[0],
    product_id: "",
    quantity: "",
    source_warehouse_id: "",
    destination_warehouse_id: "",
    occurred_at: nowLocalInput(),
    reason: "",
  };
}

export default function StockMovementFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const { products } = useProductOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { warehouses } = useWarehouseOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const req = fieldRequirements(form.movement_type);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    const farm_id = e.target.value;
    setForm((f) => ({ ...f, farm_id, source_warehouse_id: "", destination_warehouse_id: "" }));
  };

  const handleTypeChange = (e) => {
    const movement_type = e.target.value;
    setForm((f) => ({ ...f, movement_type, source_warehouse_id: "", destination_warehouse_id: "" }));
  };

  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (req.showSource && req.showDestination && !form.source_warehouse_id && !form.destination_warehouse_id) {
      setError(t("stockMovements.fields.sourceWarehouse") + " / " + t("stockMovements.fields.destinationWarehouse"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        farm_id: form.farm_id,
        movement_type: form.movement_type,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        source_warehouse_id: req.showSource ? form.source_warehouse_id || null : null,
        destination_warehouse_id: req.showDestination ? form.destination_warehouse_id || null : null,
        occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : null,
        reason: form.reason.trim() || null,
        user_id: user.id,
      };
      const { error: insertError } = await supabase.from("stock_movements").insert(payload);
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
      title={t("stockMovements.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="stock-movement-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <p className="mb-3 rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">
        {t("stockMovements.appendOnlyNotice")}
      </p>

      <form id="stock-movement-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("stockMovements.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("stockMovements.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("stockMovements.fields.movementType")} htmlFor="movement_type">
            <select
              id="movement_type"
              required
              value={form.movement_type}
              onChange={handleTypeChange}
              className={inputClass}
            >
              {MOVEMENT_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`stockMovements.types.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("stockMovements.fields.product")} htmlFor="product_id">
            <select
              id="product_id"
              required
              value={form.product_id}
              onChange={handleChange("product_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("stockMovements.fields.product")}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {productLabel(product)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("stockMovements.fields.quantity")} htmlFor="quantity">
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
        </div>

        {(req.showSource || req.showDestination) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {req.showSource && (
              <FormField label={t("stockMovements.fields.sourceWarehouse")} htmlFor="source_warehouse_id">
                <select
                  id="source_warehouse_id"
                  required={req.requireSource}
                  disabled={!form.farm_id}
                  value={form.source_warehouse_id}
                  onChange={handleChange("source_warehouse_id")}
                  className={inputClass}
                >
                  <option value="">{t("stockMovements.fields.sourceWarehouse")}</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            {req.showDestination && (
              <FormField label={t("stockMovements.fields.destinationWarehouse")} htmlFor="destination_warehouse_id">
                <select
                  id="destination_warehouse_id"
                  required={req.requireDestination}
                  disabled={!form.farm_id}
                  value={form.destination_warehouse_id}
                  onChange={handleChange("destination_warehouse_id")}
                  className={inputClass}
                >
                  <option value="">{t("stockMovements.fields.destinationWarehouse")}</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("stockMovements.fields.occurredAt")} htmlFor="occurred_at">
            <input
              id="occurred_at"
              type="datetime-local"
              value={form.occurred_at}
              onChange={handleChange("occurred_at")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("stockMovements.fields.reason")} htmlFor="reason">
            <input id="reason" value={form.reason} onChange={handleChange("reason")} className={inputClass} />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
