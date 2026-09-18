import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useEmployeeOptions } from "../../hooks/useEmployeeOptions";

export default function TeamMembersModal({ open, team, onClose }) {
  const { t } = useTranslation();
  const { employees } = useEmployeeOptions(team.farm_id);
  const [members, setMembers] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadMembers = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("team_members")
      .select("team_id, employee_id, start_date, employees:employee_id(full_name)")
      .eq("team_id", team.id)
      .order("start_date", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setMembers([]);
      return;
    }
    setMembers(data);
  }, [team.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const memberIds = new Set((members || []).map((m) => m.employee_id));
  const availableEmployees = employees.filter((e) => !memberIds.has(e.id));

  const handleAdd = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("team_members").insert({
        team_id: team.id,
        employee_id: selectedEmployee,
        start_date: new Date().toISOString().slice(0, 10),
      });
      if (insertError) throw insertError;
      setSelectedEmployee("");
      await loadMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (employeeId, startDate) => {
    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", team.id)
        .eq("employee_id", employeeId)
        .eq("start_date", startDate);
      if (deleteError) throw deleteError;
      await loadMembers();
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
      title={t("teams.membersModal.title", { name: team.name })}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className={`${inputClass} flex-1`}
          >
            <option value="">{t("teams.membersModal.selectEmployee")}</option>
            {availableEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
          <Button onClick={handleAdd} disabled={!selectedEmployee || saving}>
            {t("teams.membersModal.addMember")}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {members === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : members.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("teams.membersModal.noMembers")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {members.map((member) => (
              <li
                key={`${member.employee_id}-${member.start_date}`}
                className="flex items-center justify-between rounded-control border border-border px-3 py-2"
              >
                <span className="text-sm text-ink">{member.employees?.full_name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(member.employee_id, member.start_date)}
                  disabled={saving}
                  className="flex h-7 w-7 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                  title={t("teams.membersModal.remove")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
