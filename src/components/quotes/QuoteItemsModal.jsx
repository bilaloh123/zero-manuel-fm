import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useProductOptions } from "../../hooks/useProductOptions";

function emptyItemForm() {
  return { product_id: "", quantity: "1", unit_price: "0", discount_pct: "0", tax_rate: "0" };
}

function lineTotal(item) {
  const gross = Number(item.quantity) * Number(item.unit_price);
  const afterDiscount = gross * (1 - Number(item.discount_pct) / 100);
  return afterDiscount * (1 + Number(item.tax_rate) / 100);
}

export default function QuoteItemsModal({ open, quote, onClose }) {
  const { t, i18n } = useTranslation();
  const { products } = useProductOptions();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("quote_items")
      .select("id, product_id, quantity, unit_price, discount_pct, tax_rate, products:product_id(name_ar, name_fr)")
      .eq("quote_id", quote.id)
      .order("id", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
      return;
    }
    setItems(data);
  }, [quote.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const totals = useMemo(() => {
    if (!items) return null;
    const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
    const afterLineDiscounts = items.reduce(
      (s, i) => s + Number(i.quantity) * Number(i.unit_price) * (1 - Number(i.discount_pct) / 100),
      0
    );
    const orderDiscountAmount = afterLineDiscounts * (Number(quote.discount_pct) / 100);
    const afterOrderDiscount = afterLineDiscounts - orderDiscountAmount;
    const taxTotal = items.reduce((s, i) => {
      const net = Number(i.quantity) * Number(i.unit_price) * (1 - Number(i.discount_pct) / 100);
      return s + net * (Number(i.tax_rate) / 100);
    }, 0);
    const discountTotal = subtotal - afterLineDiscounts + orderDiscountAmount;
    const total = afterOrderDiscount + taxTotal;
    return { subtotal, discountTotal, taxTotal, total };
  }, [items, quote.discount_pct]);

  const startAdd = () => {
    setEditingItem(null);
    setForm(emptyItemForm());
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setForm({
      product_id: item.product_id,
      quantity: String(item.quantity),
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
        quote_id: quote.id,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        discount_pct: Number(form.discount_pct) || 0,
        tax_rate: Number(form.tax_rate) || 0,
      };
      if (editingItem) {
        const { error: updateError } = await supabase.from("quote_items").update(payload).eq("id", editingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("quote_items").insert(payload);
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
      const { error: deleteError } = await supabase.from("quote_items").delete().eq("id", itemId);
      if (deleteError) throw deleteError;
      await loadItems();
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
      title={t("quotes.items.title", { no: quote.quote_no })}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!form && (
          <Button onClick={startAdd} className="self-start">
            <Plus className="h-4 w-4" />
            {t("quotes.items.addItem")}
          </Button>
        )}

        {form && (
          <form onSubmit={handleSaveItem} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <FormField label={t("quotes.items.product")} htmlFor="product_id">
              <select
                id="product_id"
                required
                value={form.product_id}
                onChange={handleChange("product_id")}
                className={inputClass}
              >
                <option value="" disabled>
                  {t("quotes.items.selectProduct")}
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {productLabel(product)}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-4 gap-3">
              <FormField label={t("quotes.items.quantity")} htmlFor="quantity">
                <input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.quantity}
                  onChange={handleChange("quantity")}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t("quotes.items.unitPrice")} htmlFor="unit_price">
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
              <FormField label={t("quotes.items.discountPct")} htmlFor="discount_pct">
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
              <FormField label={t("quotes.items.taxRate")} htmlFor="tax_rate">
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
          <p className="py-4 text-center text-sm text-ink-muted">{t("quotes.items.noItems")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-2 py-1.5 text-start font-medium">{t("quotes.items.product")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("quotes.items.quantity")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("quotes.items.unitPrice")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("quotes.items.discountPct")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("quotes.items.taxRate")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("quotes.items.lineTotal")}</th>
                  <th className="px-2 py-1.5 text-end font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-2 text-ink">{productLabel(item.products)}</td>
                    <td className="px-2 py-2 text-ink-muted">{item.quantity}</td>
                    <td className="px-2 py-2 text-ink-muted">{item.unit_price}</td>
                    <td className="px-2 py-2 text-ink-muted">{item.discount_pct}%</td>
                    <td className="px-2 py-2 text-ink-muted">{item.tax_rate}%</td>
                    <td className="px-2 py-2 font-medium text-ink">{lineTotal(item).toFixed(2)}</td>
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
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={5} className="px-2 py-2 text-end text-ink-muted">
                      {t("quotes.items.subtotal")}
                    </td>
                    <td colSpan={2} className="px-2 py-2 font-medium text-ink">
                      {totals.subtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-end text-ink-muted">
                      {t("quotes.items.discountTotal")}
                    </td>
                    <td colSpan={2} className="px-2 py-2 font-medium text-ink">
                      -{totals.discountTotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-end text-ink-muted">
                      {t("quotes.items.taxTotal")}
                    </td>
                    <td colSpan={2} className="px-2 py-2 font-medium text-ink">
                      {totals.taxTotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="font-semibold text-ink">
                    <td colSpan={5} className="px-2 py-2 text-end">
                      {t("quotes.items.grandTotal")}
                    </td>
                    <td colSpan={2} className="px-2 py-2">
                      {totals.total.toFixed(2)}
                    </td>
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
