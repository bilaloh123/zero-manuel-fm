import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useProductOptions } from "../../hooks/useProductOptions";

export default function ShipmentModal({ open, lot, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const farmId = lot.parcels?.farm_id;
  const { products } = useProductOptions();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(lot.quantity_kg ?? "");
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const harvestedProducts = products.filter((p) => p.category === "harvested_product");
  const productList = harvestedProducts.length > 0 ? harvestedProducts : products;
  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: movementError } = await supabase.from("stock_movements").insert({
        farm_id: farmId,
        movement_type: "SHIPMENT",
        product_id: productId,
        quantity: Number(quantity),
        source_warehouse_id: lot.current_location_warehouse_id,
        reason: `Expedition lot ${lot.lot_code}${destination ? ` vers ${destination}` : ""}`,
        user_id: user.id,
      });
      if (movementError) throw movementError;

      const { error: lotError } = await supabase
        .from("lots")
        .update({ current_status: "shipped" })
        .eq("id", lot.id);
      if (lotError) throw lotError;

      const { error: eventError } = await supabase.from("traceability_events").insert({
        lot_id: lot.id,
        event_type: "shipment",
        occurred_at: new Date().toISOString(),
        actor_id: user.id,
        farm_id: farmId,
        location: destination.trim() || null,
      });
      if (eventError) throw eventError;

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("lots.shipment.title")} — ${lot.lot_code}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="shipment-form" disabled={saving || !productId || !quantity}>
            {t("lots.shipment.confirm")}
          </Button>
        </>
      }
    >
      <p className="mb-3 rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">
        {t("lots.shipment.notice")}
      </p>

      <form id="shipment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("stockMovements.fields.product")} htmlFor="product_id">
          <select
            id="product_id"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              {t("stockMovements.fields.product")}
            </option>
            {productList.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("lots.shipment.quantity")} htmlFor="quantity">
            <input
              id="quantity"
              type="number"
              required
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("lots.shipment.destinationWarehouse")} htmlFor="destination">
            <input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
