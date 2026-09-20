import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, CheckCircle2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useLotOptions } from "../../hooks/useLotOptions";
import { useProductOptions } from "../../hooks/useProductOptions";

export default function PackingRunItemsModal({ open, run, onClose }) {
  const { t, i18n } = useTranslation();
  const { lots } = useLotOptions(run.farm_id);
  const { products } = useProductOptions();
  const [inputs, setInputs] = useState(null);
  const [outputs, setOutputs] = useState(null);
  const [status, setStatus] = useState(run.status);
  const [inputForm, setInputForm] = useState(null);
  const [outputForm, setOutputForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isInProgress = status === "in_progress";

  const load = useCallback(async () => {
    const [{ data: inputData, error: inputErr }, { data: outputData, error: outputErr }, { data: runData }] = await Promise.all([
      supabase
        .from("packing_run_inputs")
        .select("id, lot_id, product_id, quantity_kg, lots:lot_id(lot_code), products:product_id(name_ar, name_fr)")
        .eq("packing_run_id", run.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("packing_run_outputs")
        .select("id, product_id, caliber, quality_grade, quantity_kg, boxes_count, products:product_id(name_ar, name_fr)")
        .eq("packing_run_id", run.id)
        .order("created_at", { ascending: true }),
      supabase.from("packing_runs").select("status").eq("id", run.id).single(),
    ]);
    if (inputErr || outputErr) {
      setError(inputErr?.message || outputErr?.message);
    }
    setInputs(inputData || []);
    setOutputs(outputData || []);
    if (runData) setStatus(runData.status);
  }, [run.id]);

  useEffect(() => {
    load();
  }, [load]);

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const totals = useMemo(() => {
    if (!inputs || !outputs) return null;
    const totalIn = inputs.reduce((s, i) => s + Number(i.quantity_kg), 0);
    const totalOut = outputs.reduce((s, o) => s + Number(o.quantity_kg), 0);
    const rendement = totalIn > 0 ? (totalOut / totalIn) * 100 : null;
    return { totalIn, totalOut, rendement, waste: totalIn - totalOut };
  }, [inputs, outputs]);

  const handleAddInput = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("packing_run_inputs").insert({
        packing_run_id: run.id,
        lot_id: inputForm.lot_id,
        product_id: inputForm.product_id,
        quantity_kg: Number(inputForm.quantity_kg),
      });
      if (insertError) throw insertError;
      setInputForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddOutput = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("packing_run_outputs").insert({
        packing_run_id: run.id,
        product_id: outputForm.product_id,
        caliber: outputForm.caliber.trim() || null,
        quality_grade: outputForm.quality_grade.trim() || null,
        quantity_kg: Number(outputForm.quantity_kg),
        boxes_count: outputForm.boxes_count === "" ? null : Number(outputForm.boxes_count),
      });
      if (insertError) throw insertError;
      setOutputForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("complete_packing_run", { p_packing_run_id: run.id });
      if (rpcError) throw rpcError;
      await load();
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
      title={t("packingRuns.items.title")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          {isInProgress && (
            <Button onClick={handleComplete} disabled={saving || !inputs?.length || !outputs?.length}>
              <CheckCircle2 className="h-4 w-4" />
              {t("packingRuns.completeAction")}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isInProgress && (
          <p className="rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">{t("packingRuns.items.completedNotice")}</p>
        )}

        {totals && (
          <div className="grid grid-cols-2 gap-3 rounded-control border border-border p-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-ink-muted">{t("packingRuns.items.totalIn")}</p>
              <p className="text-lg font-semibold text-ink">{totals.totalIn.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">{t("packingRuns.items.totalOut")}</p>
              <p className="text-lg font-semibold text-ink">{totals.totalOut.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">{t("packingRuns.items.waste")}</p>
              <p className="text-lg font-semibold text-amber-700">{totals.waste.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">{t("packingRuns.items.rendement")}</p>
              <p className={`text-lg font-semibold ${totals.rendement != null && totals.rendement < 70 ? "text-red-600" : "text-brand-700"}`}>
                {totals.rendement != null ? `${totals.rendement.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">{t("packingRuns.items.inputs")}</h3>
            {isInProgress && !inputForm && (
              <Button variant="secondary" onClick={() => setInputForm({ lot_id: "", product_id: "", quantity_kg: "" })}>
                <Plus className="h-4 w-4" />
                {t("packingRuns.items.addInput")}
              </Button>
            )}
          </div>

          {inputForm && (
            <form onSubmit={handleAddInput} className="mb-3 flex flex-col gap-3 rounded-control border border-border p-3">
              <div className="grid grid-cols-3 gap-3">
                <FormField label={t("packingRuns.items.lot")} htmlFor="input_lot">
                  <select
                    id="input_lot"
                    required
                    value={inputForm.lot_id}
                    onChange={(e) => setInputForm((f) => ({ ...f, lot_id: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t("packingRuns.items.selectLot")}
                    </option>
                    {lots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.lot_code}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("packingRuns.items.product")} htmlFor="input_product">
                  <select
                    id="input_product"
                    required
                    value={inputForm.product_id}
                    onChange={(e) => setInputForm((f) => ({ ...f, product_id: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t("packingRuns.items.selectProduct")}
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {productLabel(p)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("packingRuns.items.quantityKg")} htmlFor="input_qty">
                  <input
                    id="input_qty"
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={inputForm.quantity_kg}
                    onChange={(e) => setInputForm((f) => ({ ...f, quantity_kg: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setInputForm(null)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          )}

          {inputs === null ? (
            <p className="py-2 text-center text-sm text-ink-muted">{t("common.loading")}</p>
          ) : inputs.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-muted">{t("packingRuns.items.noInputs")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {inputs.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-control border border-border px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-ink-muted">{i.lots?.lot_code}</span>
                  <span className="text-ink">{productLabel(i.products)}</span>
                  <span className="font-medium text-ink">{i.quantity_kg} kg</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">{t("packingRuns.items.outputs")}</h3>
            {isInProgress && !outputForm && (
              <Button
                variant="secondary"
                onClick={() => setOutputForm({ product_id: "", caliber: "", quality_grade: "", quantity_kg: "", boxes_count: "" })}
              >
                <Plus className="h-4 w-4" />
                {t("packingRuns.items.addOutput")}
              </Button>
            )}
          </div>

          {outputForm && (
            <form onSubmit={handleAddOutput} className="mb-3 flex flex-col gap-3 rounded-control border border-border p-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t("packingRuns.items.product")} htmlFor="output_product">
                  <select
                    id="output_product"
                    required
                    value={outputForm.product_id}
                    onChange={(e) => setOutputForm((f) => ({ ...f, product_id: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t("packingRuns.items.selectProduct")}
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {productLabel(p)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("packingRuns.items.caliber")} htmlFor="output_caliber">
                  <input
                    id="output_caliber"
                    value={outputForm.caliber}
                    onChange={(e) => setOutputForm((f) => ({ ...f, caliber: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField label={t("packingRuns.items.qualityGrade")} htmlFor="output_grade">
                  <input
                    id="output_grade"
                    value={outputForm.quality_grade}
                    onChange={(e) => setOutputForm((f) => ({ ...f, quality_grade: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
                <FormField label={t("packingRuns.items.quantityKg")} htmlFor="output_qty">
                  <input
                    id="output_qty"
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={outputForm.quantity_kg}
                    onChange={(e) => setOutputForm((f) => ({ ...f, quantity_kg: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
                <FormField label={t("packingRuns.items.boxesCount")} htmlFor="output_boxes">
                  <input
                    id="output_boxes"
                    type="number"
                    min="1"
                    value={outputForm.boxes_count}
                    onChange={(e) => setOutputForm((f) => ({ ...f, boxes_count: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOutputForm(null)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          )}

          {outputs === null ? (
            <p className="py-2 text-center text-sm text-ink-muted">{t("common.loading")}</p>
          ) : outputs.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-muted">{t("packingRuns.items.noOutputs")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {outputs.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-control border border-border px-3 py-2 text-sm">
                  <span className="text-ink">{productLabel(o.products)}</span>
                  <span className="text-ink-muted">{o.caliber || "—"} / {o.quality_grade || "—"}</span>
                  <span className="font-medium text-ink">{o.quantity_kg} kg{o.boxes_count ? ` (${o.boxes_count})` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
