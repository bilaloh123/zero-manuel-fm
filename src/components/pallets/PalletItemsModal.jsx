import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

export default function PalletItemsModal({ open, pallet, onClose }) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState(null);
  const [candidateOutputs, setCandidateOutputs] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const loadItems = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("pallet_items")
      .select("id, quantity_kg, packing_run_outputs:packing_run_output_id(caliber, quality_grade, products:product_id(name_ar, name_fr))")
      .eq("pallet_id", pallet.id)
      .order("created_at", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
      return;
    }
    setItems(data);
  }, [pallet.id]);

  const loadCandidates = useCallback(async () => {
    // outputs matching this pallet's product/caliber/grade, from packing_runs on the same farm
    let query = supabase
      .from("packing_run_outputs")
      .select("id, product_id, caliber, quality_grade, quantity_kg, packing_runs:packing_run_id!inner(farm_id)")
      .eq("product_id", pallet.product_id)
      .eq("packing_runs.farm_id", pallet.farm_id);
    if (pallet.caliber) query = query.eq("caliber", pallet.caliber);
    else query = query.is("caliber", null);
    if (pallet.quality_grade) query = query.eq("quality_grade", pallet.quality_grade);
    else query = query.is("quality_grade", null);

    const { data: outputs } = await query;
    if (!outputs || outputs.length === 0) {
      setCandidateOutputs([]);
      return;
    }
    const { data: allocations } = await supabase
      .from("pallet_items")
      .select("packing_run_output_id, quantity_kg")
      .in("packing_run_output_id", outputs.map((o) => o.id));
    const allocatedByOutput = {};
    (allocations || []).forEach((a) => {
      allocatedByOutput[a.packing_run_output_id] = (allocatedByOutput[a.packing_run_output_id] || 0) + Number(a.quantity_kg);
    });
    const withRemaining = outputs
      .map((o) => ({ ...o, remaining: Number(o.quantity_kg) - (allocatedByOutput[o.id] || 0) }))
      .filter((o) => o.remaining > 0);
    setCandidateOutputs(withRemaining);
  }, [pallet]);

  useEffect(() => {
    loadItems();
    loadCandidates();
  }, [loadItems, loadCandidates]);

  const totalAllocated = useMemo(() => (items || []).reduce((s, i) => s + Number(i.quantity_kg), 0), [items]);

  const startAdd = () => setForm({ packing_run_output_id: "", quantity_kg: "" });

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("pallet_items").insert({
        pallet_id: pallet.id,
        packing_run_output_id: form.packing_run_output_id,
        quantity_kg: Number(form.quantity_kg),
      });
      if (insertError) throw insertError;
      setForm(null);
      await Promise.all([loadItems(), loadCandidates()]);
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
      title={t("pallets.items.title", { code: pallet.pallet_code })}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">
          {t("pallets.items.totalAllocated", { total: totalAllocated.toFixed(2) })}
        </p>

        {!form && candidateOutputs.length > 0 && (
          <Button onClick={startAdd} className="self-start">
            <Plus className="h-4 w-4" />
            {t("pallets.items.addFromOutput")}
          </Button>
        )}
        {!form && candidateOutputs.length === 0 && (
          <p className="text-sm text-ink-muted">{t("pallets.items.noCandidates")}</p>
        )}

        {form && (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <FormField label={t("pallets.items.output")} htmlFor="output_id">
              <select
                id="output_id"
                required
                value={form.packing_run_output_id}
                onChange={(e) => setForm((f) => ({ ...f, packing_run_output_id: e.target.value }))}
                className={inputClass}
              >
                <option value="" disabled>
                  {t("pallets.items.selectOutput")}
                </option>
                {candidateOutputs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {t("pallets.items.remainingHint", { qty: o.remaining.toFixed(2) })}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("pallets.items.quantityKg")} htmlFor="qty">
              <input
                id="qty"
                type="number"
                required
                step="0.01"
                min="0.01"
                value={form.quantity_kg}
                onChange={(e) => setForm((f) => ({ ...f, quantity_kg: e.target.value }))}
                className={inputClass}
              />
            </FormField>
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
          <p className="py-2 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="py-2 text-center text-sm text-ink-muted">{t("pallets.items.noItems")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-control border border-border px-3 py-2 text-sm">
                <span className="text-ink">{productLabel(i.packing_run_outputs?.products)}</span>
                <span className="text-ink-muted">
                  {i.packing_run_outputs?.caliber || "—"} / {i.packing_run_outputs?.quality_grade || "—"}
                </span>
                <span className="font-medium text-ink">{i.quantity_kg} kg</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
