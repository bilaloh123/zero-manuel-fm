import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";

const CATEGORY_OPTIONS = ["sms", "whatsapp", "email", "accounting", "banking", "gps", "weather", "iot", "other"];
const STATUS_OPTIONS = ["planned", "configured", "active", "disabled"];

function toFormState(integration) {
  return {
    farm_id: integration?.farm_id ?? "",
    category: integration?.category ?? CATEGORY_OPTIONS[0],
    provider_name: integration?.provider_name ?? "",
    status: integration?.status ?? "planned",
    webhook_url: integration?.webhook_url ?? "",
    config: integration ? JSON.stringify(integration.config ?? {}, null, 2) : "{}",
    notes: integration?.notes ?? "",
  };
}

export default function IntegrationFormModal({ open, integration, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(integration));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!integration;

  const resetAndClose = () => {
    setForm(toFormState(null));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let config;
      try {
        config = form.config.trim() ? JSON.parse(form.config) : {};
      } catch {
        throw new Error(t("integrations.invalidJson"));
      }
      const payload = {
        farm_id: form.farm_id || null,
        category: form.category,
        provider_name: form.provider_name.trim(),
        status: form.status,
        webhook_url: form.webhook_url.trim() || null,
        config,
        notes: form.notes.trim() || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("integrations").update(payload).eq("id", integration.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("integrations").insert({ ...payload, created_by: user.id });
        if (insertError) throw insertError;
      }
      onSaved();
      resetAndClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={isEdit ? t("integrations.edit") : t("integrations.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="integration-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="integration-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("integrations.fields.category")} htmlFor="category">
            <select id="category" value={form.category} onChange={handleChange("category")} className={inputClass}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`integrations.categories.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("integrations.fields.providerName")} htmlFor="provider_name">
            <input
              id="provider_name"
              required
              value={form.provider_name}
              onChange={handleChange("provider_name")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("integrations.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
              <option value="">{t("integrations.allFarms")}</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("integrations.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`integrations.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label={t("integrations.fields.webhookUrl")} htmlFor="webhook_url">
          <input id="webhook_url" value={form.webhook_url} onChange={handleChange("webhook_url")} className={inputClass} />
        </FormField>

        <FormField label={t("integrations.fields.config")} htmlFor="config">
          <textarea
            id="config"
            rows={4}
            value={form.config}
            onChange={handleChange("config")}
            className={`${inputClass} font-mono text-xs`}
          />
        </FormField>
        <p className="-mt-2 text-xs text-ink-muted">{t("integrations.configHint")}</p>

        <FormField label={t("integrations.fields.notes")} htmlFor="notes">
          <textarea id="notes" rows={2} value={form.notes} onChange={handleChange("notes")} className={inputClass} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
