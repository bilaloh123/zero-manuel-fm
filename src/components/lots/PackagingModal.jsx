import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useProductOptions } from "../../hooks/useProductOptions";
import { useWarehouseOptions } from "../../hooks/useWarehouseOptions";

export default function PackagingModal({ open, lot, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const farmId = lot.parcels?.farm_id;
  const { products } = useProductOptions();
  const { warehouses } = useWarehouseOptions(farmId);
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const packagingProducts = products.filter((p) => p.category === "packaging");
  const productList = packagingProducts.length > 0 ? packagingProducts : products;
  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: movementError } = await supabase.from("stock_movements").insert({
        farm_id: farmId,
        movement_type: "CONSUMPTION",
        product_id: productId,
        quantity: Number(quantity),
        source_warehouse_id: warehouseId,
        reason: `Emballage lot ${lot.lot_code}`,
        user_id: user.id,
      });
      if (movementError) throw movementError;

      const { error: eventError } = await supabase.from("traceability_events").insert({
        lot_id: lot.id,
        event_type: "packaging",
        occurred_at: new Date().toISOString(),
        actor_id: user.id,
        farm_id: farmId,
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
      title={`${t("lots.packaging.title")} — ${lot.lot_code}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="packaging-form" disabled={saving || !productId || !warehouseId || !quantity}>
            {t("lots.packaging.confirm")}
          </Button>
        </>
      }
    >
      <p className="mb-3 rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">
        {t("lots.packaging.notice")}
      </p>

      <form id="packaging-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("lots.packaging.product")} htmlFor="product_id">
          <select
            id="product_id"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              {t("lots.packaging.product")}
            </option>
            {productList.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("lots.packaging.warehouse")} htmlFor="warehouse_id">
          <select
            id="warehouse_id"
            required
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              {t("lots.packaging.warehouse")}
            </option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("lots.packaging.quantity")} htmlFor="quantity">
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

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
