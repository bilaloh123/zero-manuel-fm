import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function toFormState(company) {
  return {
    group_id: company?.group_id ?? "",
    raison_sociale: company?.raison_sociale ?? "",
    ice: company?.ice ?? "",
    if_no: company?.if_no ?? "",
    rc: company?.rc ?? "",
    patente_no: company?.patente_no ?? "",
    address: company?.address ?? "",
    bank_name: company?.bank_name ?? "",
    bank_rib: company?.bank_rib ?? "",
    default_currency: company?.default_currency ?? "MAD",
    default_payment_terms: company?.default_payment_terms ?? "",
  };
}

export default function LegalCompanyFormModal({ open, company, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(() => toFormState(company));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!company;

  useEffect(() => {
    supabase
      .from("groups")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => setGroups(data || []));
  }, []);

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
      const strOrNull = (v) => v.trim() || null;
      const payload = {
        group_id: form.group_id,
        raison_sociale: form.raison_sociale.trim(),
        ice: strOrNull(form.ice),
        if_no: strOrNull(form.if_no),
        rc: strOrNull(form.rc),
        patente_no: strOrNull(form.patente_no),
        address: strOrNull(form.address),
        bank_name: strOrNull(form.bank_name),
        bank_rib: strOrNull(form.bank_rib),
        default_currency: form.default_currency.trim() || "MAD",
        default_payment_terms: strOrNull(form.default_payment_terms),
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("legal_companies").update(payload).eq("id", company.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("legal_companies").insert({ ...payload, created_by: user.id });
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
      title={isEdit ? t("legalCompanies.edit") : t("legalCompanies.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="legal-company-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="legal-company-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("legalCompanies.fields.group")} htmlFor="group_id">
            <select id="group_id" required value={form.group_id} onChange={handleChange("group_id")} className={inputClass}>
              <option value="" disabled>
                {t("legalCompanies.fields.group")}
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("legalCompanies.fields.raisonSociale")} htmlFor="raison_sociale">
            <input
              id="raison_sociale"
              required
              value={form.raison_sociale}
              onChange={handleChange("raison_sociale")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <FormField label={t("legalCompanies.fields.ice")} htmlFor="ice">
            <input id="ice" value={form.ice} onChange={handleChange("ice")} className={inputClass} />
          </FormField>
          <FormField label={t("legalCompanies.fields.ifNo")} htmlFor="if_no">
            <input id="if_no" value={form.if_no} onChange={handleChange("if_no")} className={inputClass} />
          </FormField>
          <FormField label={t("legalCompanies.fields.rc")} htmlFor="rc">
            <input id="rc" value={form.rc} onChange={handleChange("rc")} className={inputClass} />
          </FormField>
          <FormField label={t("legalCompanies.fields.patenteNo")} htmlFor="patente_no">
            <input id="patente_no" value={form.patente_no} onChange={handleChange("patente_no")} className={inputClass} />
          </FormField>
        </div>

        <FormField label={t("legalCompanies.fields.address")} htmlFor="address">
          <input id="address" value={form.address} onChange={handleChange("address")} className={inputClass} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("legalCompanies.fields.bankName")} htmlFor="bank_name">
            <input id="bank_name" value={form.bank_name} onChange={handleChange("bank_name")} className={inputClass} />
          </FormField>
          <FormField label={t("legalCompanies.fields.bankRib")} htmlFor="bank_rib">
            <input id="bank_rib" value={form.bank_rib} onChange={handleChange("bank_rib")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("legalCompanies.fields.defaultCurrency")} htmlFor="default_currency">
            <input
              id="default_currency"
              value={form.default_currency}
              onChange={handleChange("default_currency")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("legalCompanies.fields.defaultPaymentTerms")} htmlFor="default_payment_terms">
            <input
              id="default_payment_terms"
              value={form.default_payment_terms}
              onChange={handleChange("default_payment_terms")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
