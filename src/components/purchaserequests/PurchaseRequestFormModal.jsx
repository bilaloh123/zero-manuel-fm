import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useProductOptions } from "../../hooks/useProductOptions";

const STATUS_OPTIONS = ["open", "fulfilled", "cancelled"];

function emptyForm(defaultFarmId, request) {
  return {
    requesting_farm_id: request?.requesting_farm_id ?? defaultFarmId ?? "",
    product_id: request?.product_id ?? "",
    quantity: request?.quantity ?? "",
    needed_by: request?.needed_by ?? "",
    status: request?.status ?? "open",
  };
}

async function findQualifyingFarms(productId, requestingFarmId, quantity) {
  const { data, error } = await supabase
    .from("stock_balances")
    .select("farm_id, balance")
    .eq("product_id", productId)
    .neq("farm_id", requestingFarmId);
  if (error) throw error;

  const totals = {};
  (data || []).forEach((row) => {
    totals[row.farm_id] = (totals[row.farm_id] || 0) + Number(row.balance);
  });

  return Object.entries(totals)
    .filter(([, total]) => total >= quantity)
    .map(([farm_id, total]) => ({ farm_id, total }));
}

export default function PurchaseRequestFormModal({ open, request, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const { products } = useProductOptions();
  const isEdit = !!request;
  const [form, setForm] = useState(() => emptyForm(defaultFarmId, request));
  const [step, setStep] = useState("form"); // form | suggestion | success
  const [qualifyingFarms, setQualifyingFarms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId, request));
    setStep("form");
    setQualifyingFarms([]);
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const farmName = (id) => farms.find((f) => f.id === id)?.name || "—";
  const selectedProduct = products.find((p) => p.id === form.product_id);

  const insertPurchaseRequest = async () => {
    const payload = {
      requesting_farm_id: form.requesting_farm_id,
      product_id: form.product_id,
      quantity: Number(form.quantity),
      needed_by: form.needed_by || null,
      status: "open",
      created_by: user.id,
    };
    const { error: insertError } = await supabase.from("purchase_requests").insert(payload);
    if (insertError) throw insertError;
    onSaved();
    resetAndClose();
  };

  const updatePurchaseRequest = async () => {
    const payload = {
      quantity: Number(form.quantity),
      needed_by: form.needed_by || null,
      status: form.status,
    };
    const { error: updateError } = await supabase.from("purchase_requests").update(payload).eq("id", request.id);
    if (updateError) throw updateError;
    onSaved();
    resetAndClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit) {
        // Editing never re-runs the smart transfer search — that only
        // applies when a brand-new request is being created.
        await updatePurchaseRequest();
        return;
      }
      const quantity = Number(form.quantity);
      const qualifying = await findQualifyingFarms(form.product_id, form.requesting_farm_id, quantity);
      if (qualifying.length === 0) {
        await insertPurchaseRequest();
      } else {
        setQualifyingFarms(qualifying);
        setStep("suggestion");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTransferFrom = async (sourceFarmId) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        product_id: form.product_id,
        quantity: Number(form.quantity),
        source_farm_id: sourceFarmId,
        destination_farm_id: form.requesting_farm_id,
        requested_by: user.id,
        status: "requested",
      };
      const { error: insertError } = await supabase.from("transfers").insert(payload);
      if (insertError) throw insertError;
      setStep("success");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async () => {
    setSaving(true);
    setError(null);
    try {
      await insertPurchaseRequest();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    onSaved();
    resetAndClose();
  };

  if (step === "success") {
    return (
      <Modal
        open={open}
        onClose={handleFinish}
        title={t("purchaseRequests.suggestion.title")}
        footer={
          <Button onClick={handleFinish}>{t("common.confirm")}</Button>
        }
      >
        <p className="text-sm text-ink">{t("purchaseRequests.suggestion.transferCreated")}</p>
      </Modal>
    );
  }

  if (step === "suggestion") {
    return (
      <Modal
        open={open}
        onClose={resetAndClose}
        title={t("purchaseRequests.suggestion.title")}
        footer={
          <>
            <Button variant="secondary" onClick={handleDecline} disabled={saving}>
              {t("purchaseRequests.suggestion.declineAndRequest")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">
            {t("purchaseRequests.suggestion.message", { quantity: form.quantity, unit: selectedProduct?.unit || "" })}
          </p>
          <ul className="flex flex-col gap-2">
            {qualifyingFarms.map(({ farm_id, total }) => (
              <li
                key={farm_id}
                className="flex items-center justify-between rounded-control border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{farmName(farm_id)}</p>
                  <p className="text-xs text-ink-muted">
                    {t("purchaseRequests.suggestion.availableQty", { quantity: total })}
                  </p>
                </div>
                <Button onClick={() => handleTransferFrom(farm_id)} disabled={saving}>
                  {t("purchaseRequests.suggestion.transferFrom")}
                </Button>
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={isEdit ? t("purchaseRequests.edit") : t("purchaseRequests.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="purchase-request-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="purchase-request-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("purchaseRequests.fields.farm")} htmlFor="requesting_farm_id">
          <select
            id="requesting_farm_id"
            required
            disabled={isEdit}
            value={form.requesting_farm_id}
            onChange={handleChange("requesting_farm_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("purchaseRequests.fields.farm")}
            </option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("purchaseRequests.fields.product")} htmlFor="product_id">
          <select
            id="product_id"
            required
            disabled={isEdit}
            value={form.product_id}
            onChange={handleChange("product_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("purchaseRequests.fields.product")}
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {i18n.language === "ar" ? product.name_ar || product.name_fr : product.name_fr || product.name_ar}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("purchaseRequests.fields.quantity")} htmlFor="quantity">
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
          <FormField label={t("purchaseRequests.fields.neededBy")} htmlFor="needed_by">
            <input
              id="needed_by"
              type="date"
              value={form.needed_by}
              onChange={handleChange("needed_by")}
              className={inputClass}
            />
          </FormField>
        </div>

        {isEdit && (
          <FormField label={t("purchaseRequests.columns.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`purchaseRequests.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
