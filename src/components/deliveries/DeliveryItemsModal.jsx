import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useLotOptions } from "../../hooks/useLotOptions";

export default function DeliveryItemsModal({ open, delivery, onClose }) {
  const { t, i18n } = useTranslation();
  const [orderItems, setOrderItems] = useState([]);
  const { lots } = useLotOptions(delivery.farm_id);
  const [items, setItems] = useState(null);
  const [reservedPallets, setReservedPallets] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const isDraft = delivery.status === "draft";

  const loadOrderItems = useCallback(async () => {
    const { data } = await supabase
      .from("sales_order_items")
      .select("id, product_id, warehouse_id, quantity_ordered, quantity_delivered, unit_price, products:product_id(name_ar, name_fr)")
      .eq("sales_order_id", delivery.sales_order_id);
    setOrderItems(data || []);
  }, [delivery.sales_order_id]);

  const loadItems = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("delivery_items")
      .select(
        "id, sales_order_item_id, product_id, warehouse_id, lot_id, pallet_id, quantity_delivered, unit_price, products:product_id(name_ar, name_fr), lots:lot_id(lot_code), pallets:pallet_id(pallet_code)"
      )
      .eq("delivery_id", delivery.id)
      .order("id", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
      return;
    }
    setItems(data);
  }, [delivery.id]);

  const loadReservedPallets = useCallback(async () => {
    const { data } = await supabase
      .from("pallets")
      .select("id, pallet_code, product_id, net_weight_kg")
      .eq("farm_id", delivery.farm_id)
      .eq("status", "reserved");
    setReservedPallets(data || []);
  }, [delivery.farm_id]);

  useEffect(() => {
    loadOrderItems();
    loadItems();
    loadReservedPallets();
  }, [loadOrderItems, loadItems, loadReservedPallets]);

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const remainingFor = (orderItemId) => {
    const oi = orderItems.find((o) => o.id === orderItemId);
    if (!oi) return 0;
    return Number(oi.quantity_ordered) - Number(oi.quantity_delivered);
  };

  const deliverableOrderItems = useMemo(
    () => orderItems.filter((oi) => remainingFor(oi.id) > 0),
    [orderItems]
  );

  const startAdd = () => setForm({ sales_order_item_id: "", lot_id: "", pallet_id: "", quantity_delivered: "" });

  const handleOrderItemChange = (e) => {
    const sales_order_item_id = e.target.value;
    const oi = orderItems.find((o) => o.id === sales_order_item_id);
    setForm((f) => ({
      ...f,
      sales_order_item_id,
      pallet_id: "",
      quantity_delivered: oi ? String(remainingFor(oi.id)) : "",
    }));
  };

  const handlePalletChange = (e) => {
    const pallet_id = e.target.value;
    const pallet = reservedPallets.find((p) => p.id === pallet_id);
    setForm((f) => ({
      ...f,
      pallet_id,
      quantity_delivered: pallet?.net_weight_kg != null ? String(pallet.net_weight_kg) : f.quantity_delivered,
    }));
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const oi = orderItems.find((o) => o.id === form.sales_order_item_id);
      if (!oi) throw new Error(t("deliveries.items.selectOrderItem"));
      const payload = {
        delivery_id: delivery.id,
        sales_order_item_id: oi.id,
        product_id: oi.product_id,
        warehouse_id: oi.warehouse_id,
        lot_id: form.lot_id || null,
        pallet_id: form.pallet_id || null,
        quantity_delivered: Number(form.quantity_delivered),
        unit_price: oi.unit_price,
      };
      const { error: insertError } = await supabase.from("delivery_items").insert(payload);
      if (insertError) throw insertError;
      setForm(null);
      await Promise.all([loadOrderItems(), loadItems(), loadReservedPallets()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("delivery_items").delete().eq("id", itemId);
      if (deleteError) throw deleteError;
      await Promise.all([loadOrderItems(), loadItems(), loadReservedPallets()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedRemaining = form?.sales_order_item_id ? remainingFor(form.sales_order_item_id) : null;
  const selectedOrderItem = form?.sales_order_item_id ? orderItems.find((o) => o.id === form.sales_order_item_id) : null;
  const usedPalletIds = new Set((items || []).map((i) => i.pallet_id).filter(Boolean));
  const candidatePallets = selectedOrderItem
    ? reservedPallets.filter((p) => p.product_id === selectedOrderItem.product_id && !usedPalletIds.has(p.id))
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("deliveries.items.title", { no: delivery.delivery_no })}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isDraft && <p className="rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">{t("deliveries.items.lockedNotice")}</p>}

        {isDraft && !form && deliverableOrderItems.length > 0 && (
          <Button onClick={startAdd} className="self-start">
            <Plus className="h-4 w-4" />
            {t("deliveries.items.addItem")}
          </Button>
        )}

        {isDraft && form && (
          <form onSubmit={handleSaveItem} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <FormField label={t("deliveries.items.orderItem")} htmlFor="sales_order_item_id">
              <select
                id="sales_order_item_id"
                required
                value={form.sales_order_item_id}
                onChange={handleOrderItemChange}
                className={inputClass}
              >
                <option value="" disabled>
                  {t("deliveries.items.selectOrderItem")}
                </option>
                {deliverableOrderItems.map((oi) => (
                  <option key={oi.id} value={oi.id}>
                    {productLabel(oi.products)} — {t("deliveries.items.remaining", { qty: remainingFor(oi.id) })}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("deliveries.items.lot")} htmlFor="lot_id">
                <select
                  id="lot_id"
                  value={form.lot_id}
                  onChange={(e) => setForm((f) => ({ ...f, lot_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">{t("deliveries.items.noLot")}</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lot_code}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("deliveries.items.pallet")} htmlFor="pallet_id">
                <select
                  id="pallet_id"
                  value={form.pallet_id}
                  onChange={handlePalletChange}
                  disabled={!selectedOrderItem}
                  className={inputClass}
                >
                  <option value="">{t("deliveries.items.noPallet")}</option>
                  {candidatePallets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.pallet_code}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label={t("deliveries.items.quantity")} htmlFor="quantity_delivered">
              <input
                id="quantity_delivered"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedRemaining ?? undefined}
                required
                value={form.quantity_delivered}
                onChange={(e) => setForm((f) => ({ ...f, quantity_delivered: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            {selectedRemaining != null && (
              <p className="text-xs text-ink-muted">{t("deliveries.items.remainingHint", { qty: selectedRemaining })}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setForm(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        )}

        {items === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("deliveries.items.noItems")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-2 py-1.5 text-start font-medium">{t("deliveries.items.product")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("deliveries.items.lot")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("deliveries.items.pallet")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("deliveries.items.quantity")}</th>
                  {isDraft && <th className="px-2 py-1.5 text-end font-medium" />}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-2 text-ink">{productLabel(item.products)}</td>
                    <td className="px-2 py-2 font-mono text-xs text-ink-muted">{item.lots?.lot_code || "—"}</td>
                    <td className="px-2 py-2 font-mono text-xs text-ink-muted">{item.pallets?.pallet_code || "—"}</td>
                    <td className="px-2 py-2 text-ink-muted">{item.quantity_delivered}</td>
                    {isDraft && (
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
