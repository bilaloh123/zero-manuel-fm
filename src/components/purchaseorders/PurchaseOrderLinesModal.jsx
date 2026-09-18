import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useProductOptions } from "../../hooks/useProductOptions";

function emptyLineForm() {
  return { product_id: "", quantity: "1", unit_price: "0", tax: "0" };
}

export default function PurchaseOrderLinesModal({ open, order, onClose }) {
  const { t, i18n } = useTranslation();
  const { products } = useProductOptions();
  const [lines, setLines] = useState(null);
  const [error, setError] = useState(null);
  const [editingLine, setEditingLine] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadLines = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("purchase_order_lines")
      .select("id, product_id, quantity, unit_price, tax, products:product_id(name_ar, name_fr)")
      .eq("order_id", order.id)
      .order("id", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setLines([]);
      return;
    }
    setLines(data);
  }, [order.id]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const startAdd = () => {
    setEditingLine(null);
    setForm(emptyLineForm());
  };

  const startEdit = (line) => {
    setEditingLine(line);
    setForm({
      product_id: line.product_id,
      quantity: String(line.quantity),
      unit_price: String(line.unit_price),
      tax: String(line.tax),
    });
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSaveLine = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        order_id: order.id,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        tax: Number(form.tax),
      };
      if (editingLine) {
        const { error: updateError } = await supabase
          .from("purchase_order_lines")
          .update(payload)
          .eq("id", editingLine.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("purchase_order_lines").insert(payload);
        if (insertError) throw insertError;
      }
      setForm(null);
      setEditingLine(null);
      await loadLines();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (lineId) => {
    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("purchase_order_lines").delete().eq("id", lineId);
      if (deleteError) throw deleteError;
      await loadLines();
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
      title={t("purchaseOrders.lines.title")}
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
            {t("purchaseOrders.lines.addLine")}
          </Button>
        )}

        {form && (
          <form onSubmit={handleSaveLine} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <FormField label={t("purchaseOrders.lines.product")} htmlFor="product_id">
              <select
                id="product_id"
                required
                value={form.product_id}
                onChange={handleChange("product_id")}
                className={inputClass}
              >
                <option value="" disabled>
                  {t("purchaseOrders.lines.selectProduct")}
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {productLabel(product)}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label={t("purchaseOrders.lines.quantity")} htmlFor="quantity">
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
              <FormField label={t("purchaseOrders.lines.unitPrice")} htmlFor="unit_price">
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
              <FormField label={t("purchaseOrders.lines.tax")} htmlFor="tax">
                <input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.tax}
                  onChange={handleChange("tax")}
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

        {lines === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : lines.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("purchaseOrders.lines.noLines")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-2 py-1.5 text-start font-medium">{t("purchaseOrders.lines.product")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("purchaseOrders.lines.quantity")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("purchaseOrders.lines.unitPrice")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("purchaseOrders.lines.tax")}</th>
                  <th className="px-2 py-1.5 text-end font-medium" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-2 text-ink">{productLabel(line.products)}</td>
                    <td className="px-2 py-2 text-ink-muted">{line.quantity}</td>
                    <td className="px-2 py-2 text-ink-muted">{line.unit_price}</td>
                    <td className="px-2 py-2 text-ink-muted">{line.tax}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(line)}
                          className="flex h-7 w-7 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(line.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
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
