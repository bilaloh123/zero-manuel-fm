import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

const STATUS_OPTIONS = ["active", "inactive"];

function toFormState(user) {
  return {
    full_name: user?.full_name ?? "",
    phone: user?.phone ?? "",
    status: user?.status ?? "active",
    is_super_admin: user?.is_super_admin ?? false,
  };
}

export default function UserFormModal({ open, user, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormState(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        status: form.status,
        is_super_admin: form.is_super_admin,
      };
      const { error: updateError } = await supabase.from("app_users").update(payload).eq("id", user.id);
      if (updateError) throw updateError;
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
      title={t("users.edit")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="user-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("users.fields.fullName")} htmlFor="full_name">
          <input
            id="full_name"
            required
            value={form.full_name}
            onChange={handleChange("full_name")}
            className={inputClass}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("users.fields.phone")} htmlFor="phone">
            <input id="phone" value={form.phone} onChange={handleChange("phone")} className={inputClass} />
          </FormField>
          <FormField label={t("users.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`users.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.is_super_admin}
            onChange={(e) => setForm((f) => ({ ...f, is_super_admin: e.target.checked }))}
          />
          {t("users.fields.isSuperAdmin")}
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
