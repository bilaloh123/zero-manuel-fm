import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useCropCycleOptions } from "../../hooks/useCropCycleOptions";
import { useTeamOptions } from "../../hooks/useTeamOptions";
import { useAppUserOptions } from "../../hooks/useAppUserOptions";

function toLocalInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(localString) {
  if (!localString) return null;
  return new Date(localString).toISOString();
}

function toFormState(session, defaultFarmId) {
  return {
    farm_id: session?.farm_id ?? defaultFarmId ?? "",
    crop_cycle_id: session?.crop_cycle_id ?? "",
    team_id: session?.team_id ?? "",
    responsible_id: session?.responsible_id ?? "",
    start_time: toLocalInput(session?.start_time),
    end_time: toLocalInput(session?.end_time),
    boxes_count: session?.boxes_count ?? "",
    weight_kg: session?.weight_kg ?? "",
    quality_grade: session?.quality_grade ?? "",
  };
}

export default function HarvestSessionFormModal({ open, session, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(session, defaultFarmId));
  const { cropCycles } = useCropCycleOptions(form.farm_id);
  const { teams } = useTeamOptions(form.farm_id);
  const { users } = useAppUserOptions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!session;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    const farm_id = e.target.value;
    setForm((f) => ({ ...f, farm_id, crop_cycle_id: "", team_id: "" }));
  };

  const cropCycleLabel = (cc) => {
    const crop = cc.crops;
    const cropName = crop ? (i18n.language === "ar" ? crop.name_ar || crop.name_fr : crop.name_fr || crop.name_ar) : "";
    const parcelName = cc.parcels?.name || cc.parcels?.code || "";
    return `${parcelName} — ${cropName}${cc.seasons ? ` (${cc.seasons.label})` : ""}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const selectedCycle = cropCycles.find((c) => c.id === form.crop_cycle_id);
      const payload = {
        crop_cycle_id: form.crop_cycle_id,
        parcel_id: selectedCycle ? selectedCycle.parcel_id : session?.parcel_id,
        farm_id: form.farm_id,
        team_id: form.team_id || null,
        responsible_id: form.responsible_id || null,
        start_time: fromLocalInput(form.start_time),
        end_time: fromLocalInput(form.end_time),
        boxes_count: form.boxes_count === "" ? null : Number(form.boxes_count),
        weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
        quality_grade: form.quality_grade.trim() || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("harvest_sessions").update(payload).eq("id", session.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("harvest_sessions").insert(payload);
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
      title={isEdit ? t("harvestSessions.edit") : t("harvestSessions.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="harvest-session-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="harvest-session-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("harvestSessions.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("harvestSessions.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("harvestSessions.fields.cropCycle")} htmlFor="crop_cycle_id">
            <select
              id="crop_cycle_id"
              required
              disabled={!form.farm_id}
              value={form.crop_cycle_id}
              onChange={handleChange("crop_cycle_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("harvestSessions.fields.cropCycle")}
              </option>
              {cropCycles.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cropCycleLabel(cc)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("harvestSessions.fields.team")} htmlFor="team_id">
            <select
              id="team_id"
              disabled={!form.farm_id}
              value={form.team_id}
              onChange={handleChange("team_id")}
              className={inputClass}
            >
              <option value="">{t("common.optional")}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("harvestSessions.fields.responsible")} htmlFor="responsible_id">
            <select
              id="responsible_id"
              value={form.responsible_id}
              onChange={handleChange("responsible_id")}
              className={inputClass}
            >
              <option value="">{t("common.optional")}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("harvestSessions.fields.startTime")} htmlFor="start_time">
            <input
              id="start_time"
              type="datetime-local"
              value={form.start_time}
              onChange={handleChange("start_time")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("harvestSessions.fields.endTime")} htmlFor="end_time">
            <input
              id="end_time"
              type="datetime-local"
              value={form.end_time}
              onChange={handleChange("end_time")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label={t("harvestSessions.fields.boxesCount")} htmlFor="boxes_count">
            <input
              id="boxes_count"
              type="number"
              min="0"
              value={form.boxes_count}
              onChange={handleChange("boxes_count")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("harvestSessions.fields.weightKg")} htmlFor="weight_kg">
            <input
              id="weight_kg"
              type="number"
              step="0.01"
              min="0"
              value={form.weight_kg}
              onChange={handleChange("weight_kg")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("harvestSessions.fields.qualityGrade")} htmlFor="quality_grade">
            <input
              id="quality_grade"
              value={form.quality_grade}
              onChange={handleChange("quality_grade")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
