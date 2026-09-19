import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { supabase } from "../../lib/supabaseClient";

export default function RolePermissionsModal({ open, role, onClose }) {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState(null);
  const [grantedIds, setGrantedIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const [{ data: allPermissions, error: permError }, { data: rolePerms, error: rpError }] = await Promise.all([
      supabase.from("permissions").select("id, code").order("code", { ascending: true }),
      supabase.from("role_permissions").select("permission_id").eq("role_id", role.id),
    ]);
    if (permError || rpError) {
      setError((permError || rpError).message);
      return;
    }
    setPermissions(allPermissions || []);
    setGrantedIds(new Set((rolePerms || []).map((r) => r.permission_id)));
  }, [role.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (permissionId, currentlyGranted) => {
    setPending(permissionId);
    setError(null);
    try {
      if (currentlyGranted) {
        const { error: delError } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", role.id)
          .eq("permission_id", permissionId);
        if (delError) throw delError;
        setGrantedIds((prev) => {
          const next = new Set(prev);
          next.delete(permissionId);
          return next;
        });
      } else {
        const { error: insError } = await supabase
          .from("role_permissions")
          .insert({ role_id: role.id, permission_id: permissionId });
        if (insError) throw insError;
        setGrantedIds((prev) => new Set(prev).add(permissionId));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("roles.permissionsModal.title", { role: role.label_ar || role.code })}
      footer={
        <Button onClick={onClose}>{t("common.confirm")}</Button>
      }
    >
      <div className="flex flex-col gap-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {permissions === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : permissions.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("roles.permissionsModal.noPermissions")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {permissions.map((perm) => {
              const granted = grantedIds.has(perm.id);
              return (
                <li key={perm.id}>
                  <label className="flex items-center gap-2 rounded-control border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={granted}
                      disabled={pending === perm.id}
                      onChange={() => toggle(perm.id, granted)}
                    />
                    <span className="font-mono text-xs text-ink">{perm.code}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
