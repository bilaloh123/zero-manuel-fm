import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useEmployeeOptions } from "../../hooks/useEmployeeOptions";

function toFormState(team, defaultFarmId) {
  return {
    farm_id: team?.farm_id ?? defaultFarmId ?? "",
    name: team?.name ?? "",
    leader_id: team?.leader_id ?? "",
  };
}

export default function TeamFormModal({ open, team, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(team, defaultFarmId));
  const { employees } = useEmployeeOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!team;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    const farm_id = e.target.value;
    setForm((f) => ({ ...f, farm_id, leader_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        farm_id: form.farm_id,
        name: form.name.trim(),
        leader_id: form.leader_id || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("teams").update(payload).eq("id", team.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("teams").insert(payload);
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
      title={isEdit ? t("teams.edit") : t("teams.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="team-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="team-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("teams.fields.farm")} htmlFor="farm_id">
          <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
            <option value="" disabled>
              {t("teams.fields.farm")}
            </option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("teams.fields.name")} htmlFor="name">
          <input id="name" required value={form.name} onChange={handleChange("name")} className={inputClass} />
        </FormField>

        <FormField label={t("teams.fields.leader")} htmlFor="leader_id">
          <select
            id="leader_id"
            disabled={!form.farm_id}
            value={form.leader_id}
            onChange={handleChange("leader_id")}
            className={inputClass}
          >
            <option value="">{t("teams.noLeader")}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
