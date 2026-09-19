import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useProductOptions } from "../../hooks/useProductOptions";
import { useWarehouseOptions } from "../../hooks/useWarehouseOptions";

function emptyItemForm() {
  return { product_id: "", warehouse_id: "", quantity_ordered: "1", unit_price: "0", discount_pct: "0", tax_rate: "0" };
}

function lineTotal(item) {
  const gross = Number(item.quantity_ordered) * Number(item.unit_price);
  const afterDiscount = gross * (1 - Number(item.discount_pct) / 100);
  return afterDiscount * (1 + Number(item.tax_rate) / 100);
}

export default function SalesOrderItemsModal({ open, order, onClose }) {
  const { t, i18n } = useTranslation();
  const { products } = useProductOptions();
  const { warehouses } = useWarehouseOptions(order.farm_id);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(null);
  const [atp, setAtp] = useState(null);
  const [saving, setSaving] = useState(false);

  const isDraft = order.status === "draft";

  const loadItems = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("sales_order_items")
      .select(
        "id, product_id, warehouse_id, quantity_ordered, quantity_reserved, quantity_delivered, unit_price, discount_pct, tax_rate, products:product_id(name_ar, name_fr), warehouses:warehouse_id(name)"
      )
      .eq("sales_order_id", order.id)
      .order("id", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
      return;
    }
    setItems(data);
  }, [order.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!form?.product_id || !form?.warehouse_id) {
      setAtp(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("stock_available_to_promise")
      .select("atp")
      .eq("product_id", form.product_id)
      .eq("warehouse_id", form.warehouse_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAtp(data?.atp ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [form?.product_id, form?.warehouse_id]);

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const totals = useMemo(() => {
    if (!items) return null;
    const subtotal = items.reduce((s, i) => s + Number(i.quantity_ordered) * Number(i.unit_price), 0);
    const afterLineDiscounts = items.reduce(
      (s, i) => s + Number(i.quantity_ordered) * Number(i.unit_price) * (1 - Number(i.discount_pct) / 100),
      0
    );
    const orderDiscountAmount = afterLineDiscounts * (Number(order.discount_pct) / 100);
    const afterOrderDiscount = afterLineDiscounts - orderDiscountAmount;
    const taxTotal = items.reduce((s, i) => {
      const net = Number(i.quantity_ordered) * Number(i.unit_price) * (1 - Number(i.discount_pct) / 100);
      return s + net * (Number(i.tax_rate) / 100);
    }, 0);
    const discountTotal = subtotal - afterLineDiscounts + orderDiscountAmount;
    return { subtotal, discountTotal, taxTotal, total: afterOrderDiscount + taxTotal };
  }, [items, order.discount_pct]);

  const startAdd = () => {
    setEditingItem(null);
    setForm(emptyItemForm());
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setForm({
      product_id: item.product_id,
      warehouse_id: item.warehouse_id,
      quantity_ordered: String(item.quantity_ordered),
      unit_price: String(item.unit_price),
      discount_pct: String(item.discount_pct),
      tax_rate: String(item.tax_rate),
    });
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sales_order_id: order.id,
        product_id: form.product_id,
        warehouse_id: form.warehouse_id,
        quantity_ordered: Number(form.quantity_ordered),
        unit_price: Number(form.unit_price),
        discount_pct: Number(form.discount_pct) || 0,
        tax_rate: Number(form.tax_rate) || 0,
      };
      if (editingItem) {
        const { error: updateError } = await supabase
          .from("sales_order_items")
          .update(payload)
          .eq("id", editingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("sales_order_items").insert(payload);
        if (insertError) throw insertError;
      }
      setForm(null);
      setEditingItem(null);
      await loadItems();
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
      const { error: deleteError } = await supabase.from("sales_order_items").delete().eq("id", itemId);
      if (deleteError) throw deleteError;
      await loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const requestedExceedsAtp = form && atp != null && Number(form.quantity_ordered) > atp;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("salesOrders.items.title", { no: order.order_no })}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isDraft && <p className="rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">{t("salesOrders.items.lockedNotice")}</p>}

        {isDraft && !form && (
          <Button onClick={startAdd} className="self-start">
            <Plus className="h-4 w-4" />
            {t("salesOrders.items.addItem")}
          </Button>
        )}

        {isDraft && form && (
          <form onSubmit={handleSaveItem} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("salesOrders.items.product")} htmlFor="product_id">
                <select
                  id="product_id"
                  required
                  value={form.product_id}
                  onChange={handleChange("product_id")}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {t("salesOrders.items.selectProduct")}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {productLabel(product)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("salesOrders.items.warehouse")} htmlFor="warehouse_id">
                <select
                  id="warehouse_id"
                  required
                  value={form.warehouse_id}
                  onChange={handleChange("warehouse_id")}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {t("salesOrders.items.selectWarehouse")}
                  </option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {atp != null && (
              <p className={`text-xs ${requestedExceedsAtp ? "text-red-600" : "text-ink-muted"}`}>
                {requestedExceedsAtp && <AlertTriangle className="me-1 inline h-3.5 w-3.5" />}
                {t("salesOrders.items.atpHint", { atp })}
                {requestedExceedsAtp && !order.allow_backorder && ` — ${t("salesOrders.items.atpBlockedHint")}`}
                {requestedExceedsAtp && order.allow_backorder && ` — ${t("salesOrders.items.atpBackorderHint")}`}
              </p>
            )}

            <div className="grid grid-cols-4 gap-3">
              <FormField label={t("salesOrders.items.quantity")} htmlFor="quantity_ordered">
                <input
                  id="quantity_ordered"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.quantity_ordered}
                  onChange={handleChange("quantity_ordered")}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t("salesOrders.items.unitPrice")} htmlFor="unit_price">
                <input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unit_price}
                  onChange={handleChange("unit_price")}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t("salesOrders.items.discountPct")} htmlFor="discount_pct">
                <input
                  id="discount_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.discount_pct}
                  onChange={handleChange("discount_pct")}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t("salesOrders.items.taxRate")} htmlFor="tax_rate">
                <input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.tax_rate}
                  onChange={handleChange("tax_rate")}
                  className={inputClass}
                />
              </FormField>
            </div>

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
          <p className="py-4 text-center text-sm text-ink-muted">{t("salesOrders.items.noItems")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-2 py-1.5 text-start font-medium">{t("salesOrders.items.product")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("salesOrders.items.warehouse")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("salesOrders.items.quantity")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("salesOrders.items.reserved")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("salesOrders.items.delivered")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("salesOrders.items.lineTotal")}</th>
                  {isDraft && <th className="px-2 py-1.5 text-end font-medium" />}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-2 text-ink">{productLabel(item.products)}</td>
                    <td className="px-2 py-2 text-ink-muted">{item.warehouses?.name || "—"}</td>
                    <td className="px-2 py-2 text-ink-muted">{item.quantity_ordered}</td>
                    <td className="px-2 py-2 text-ink-muted">{item.quantity_reserved}</td>
                    <td className="px-2 py-2 text-ink-muted">{item.quantity_delivered}</td>
                    <td className="px-2 py-2 font-medium text-ink">{lineTotal(item).toFixed(2)}</td>
                    {isDraft && (
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
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
              {totals && (
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={5} className="px-2 py-2 text-end text-ink-muted">
                      {t("salesOrders.items.subtotal")}
                    </td>
                    <td className="px-2 py-2 font-medium text-ink">{totals.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-end text-ink-muted">
                      {t("salesOrders.items.discountTotal")}
                    </td>
                    <td className="px-2 py-2 font-medium text-ink">-{totals.discountTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-end text-ink-muted">
                      {t("salesOrders.items.taxTotal")}
                    </td>
                    <td className="px-2 py-2 font-medium text-ink">{totals.taxTotal.toFixed(2)}</td>
                  </tr>
                  <tr className="font-semibold text-ink">
                    <td colSpan={5} className="px-2 py-2 text-end">
                      {t("salesOrders.items.grandTotal")}
                    </td>
                    <td className="px-2 py-2">{totals.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
