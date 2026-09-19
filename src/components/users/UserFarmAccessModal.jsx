import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

export default function UserFarmAccessModal({ open, user, onClose }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [roles, setRoles] = useState([]);
  const [access, setAccess] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadAccess = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("user_farm_access")
      .select("farm_id, role_id, farms:farm_id(name), roles:role_id(label_ar, label_fr)")
      .eq("user_id", user.id);
    if (fetchError) {
      setError(fetchError.message);
      setAccess([]);
      return;
    }
    setAccess(data);
  }, [user.id]);

  useEffect(() => {
    loadAccess();
    supabase
      .from("roles")
      .select("id, label_ar, label_fr")
      .order("label_ar", { ascending: true })
      .then(({ data }) => setRoles(data || []));
  }, [loadAccess]);

  const accessFarmIds = new Set((access || []).map((a) => a.farm_id));
  const availableFarms = farms.filter((f) => !accessFarmIds.has(f.id));

  const handleAdd = async () => {
    if (!selectedFarm) return;
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("user_farm_access").insert({
        user_id: user.id,
        farm_id: selectedFarm,
        role_id: selectedRole || null,
      });
      if (insertError) throw insertError;
      setSelectedFarm("");
      setSelectedRole("");
      await loadAccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (farmId) => {
    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("user_farm_access")
        .delete()
        .eq("user_id", user.id)
        .eq("farm_id", farmId);
      if (deleteError) throw deleteError;
      await loadAccess();
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
      title={t("users.farmAccessModal.title", { name: user.full_name })}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className={`${inputClass} flex-1`}
          >
            <option value="">{t("users.farmAccessModal.selectFarm")}</option>
            {availableFarms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className={`${inputClass} flex-1`}
          >
            <option value="">{t("users.farmAccessModal.selectRole")}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label_ar || role.label_fr}
              </option>
            ))}
          </select>
          <Button onClick={handleAdd} disabled={!selectedFarm || saving}>
            {t("users.farmAccessModal.addAccess")}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {access === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : access.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("users.farmAccessModal.noAccess")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {access.map((a) => (
              <li
                key={a.farm_id}
                className="flex items-center justify-between rounded-control border border-border px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-ink">{a.farms?.name}</span>
                  <span className="ms-2 text-xs text-ink-muted">{a.roles?.label_ar || a.roles?.label_fr || "—"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(a.farm_id)}
                  disabled={saving}
                  className="flex h-7 w-7 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
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
