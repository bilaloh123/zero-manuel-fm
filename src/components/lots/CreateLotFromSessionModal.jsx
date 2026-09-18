import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useProductOptions } from "../../hooks/useProductOptions";
import { useWarehouseOptions } from "../../hooks/useWarehouseOptions";
import { generateLotCode } from "../../lib/codeGenerators";

export default function CreateLotFromSessionModal({ open, session, onClose, onCreated }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { products } = useProductOptions();
  const { warehouses } = useWarehouseOptions(session.farm_id);
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cropName = session.crop_cycles?.crops
    ? i18n.language === "ar"
      ? session.crop_cycles.crops.name_ar || session.crop_cycles.crops.name_fr
      : session.crop_cycles.crops.name_fr || session.crop_cycles.crops.name_ar
    : "";

  const suggestedProducts = products.filter((p) => p.category === "harvested_product");
  const productList = suggestedProducts.length > 0 ? suggestedProducts : products;

  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cc = session.crop_cycles;
      const harvestedAt = session.end_time;
      const year = new Date(harvestedAt).getFullYear();

      const lotCode = await generateLotCode({
        year,
        farmCode: session.farms?.code || "NA",
        parcelCode: session.parcels?.code || "NA",
        cropNameFr: session.crop_cycles?.crops?.name_fr,
      });

      const { data: lot, error: lotError } = await supabase
        .from("lots")
        .insert({
          lot_code: lotCode,
          harvest_session_id: session.id,
          parcel_id: session.parcel_id,
          crop_id: cc?.crop_id,
          variety_id: cc?.variety_id,
          season_id: cc?.season_id,
          harvested_at: harvestedAt,
          team_id: session.team_id,
          responsible_id: session.responsible_id,
          quantity_kg: session.weight_kg,
          boxes_count: session.boxes_count,
          quality_grade: session.quality_grade,
          current_status: "harvested",
          current_location_warehouse_id: warehouseId,
        })
        .select()
        .single();
      if (lotError) throw lotError;

      const { error: movementError } = await supabase.from("stock_movements").insert({
        farm_id: session.farm_id,
        movement_type: "HARVEST_ENTRY",
        product_id: productId,
        quantity: session.weight_kg,
        destination_warehouse_id: warehouseId,
        reason: `Lot ${lotCode}`,
        user_id: user.id,
      });
      if (movementError) throw movementError;

      const { error: eventError } = await supabase.from("traceability_events").insert({
        lot_id: lot.id,
        event_type: "harvest",
        occurred_at: harvestedAt,
        actor_id: user.id,
        farm_id: session.farm_id,
        location: session.parcels?.name || session.parcels?.code || null,
      });
      if (eventError) throw eventError;

      onCreated();
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
      title={t("lots.createModalTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="create-lot-form" disabled={saving || !productId || !warehouseId}>
            {t("lots.createFromSession")}
          </Button>
        </>
      }
    >
      <p className="mb-3 rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">{t("lots.createNotice")}</p>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-control border border-border p-3 text-sm">
        <div>
          <span className="text-ink-muted">{t("lots.fields.parcel")}: </span>
          <span className="font-medium text-ink">{session.parcels?.name || session.parcels?.code}</span>
        </div>
        <div>
          <span className="text-ink-muted">{t("lots.fields.crop")}: </span>
          <span className="font-medium text-ink">{cropName}</span>
        </div>
        <div>
          <span className="text-ink-muted">{t("lots.fields.harvestedAt")}: </span>
          <span className="font-medium text-ink">{new Date(session.end_time).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-ink-muted">{t("lots.fields.quantity")}: </span>
          <span className="font-medium text-ink">{session.weight_kg}</span>
        </div>
        <div>
          <span className="text-ink-muted">{t("lots.fields.boxes")}: </span>
          <span className="font-medium text-ink">{session.boxes_count ?? "—"}</span>
        </div>
        <div>
          <span className="text-ink-muted">{t("lots.fields.qualityGrade")}: </span>
          <span className="font-medium text-ink">{session.quality_grade || "—"}</span>
        </div>
      </div>

      <form id="create-lot-form" onSubmit={handleCreate} className="flex flex-col gap-4">
        <FormField label={t("lots.fields.product")} htmlFor="product_id">
          <select
            id="product_id"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              {t("lots.fields.product")}
            </option>
            {productList.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("lots.fields.warehouse")} htmlFor="warehouse_id">
          <select
            id="warehouse_id"
            required
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              {t("lots.fields.warehouse")}
            </option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
