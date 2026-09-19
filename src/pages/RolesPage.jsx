import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import FormField, { inputClass } from "../components/ui/FormField";
import RoleFormModal from "../components/roles/RoleFormModal";
import RolePermissionsModal from "../components/roles/RolePermissionsModal";
import { supabase } from "../lib/supabaseClient";

function PermissionsPanel({ t }) {
  const [permissions, setPermissions] = useState(null);
  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from("permissions").select("id, code").order("code");
    if (fetchError) {
      setError(fetchError.message);
      setPermissions([]);
      return;
    }
    setPermissions(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("permissions").insert({ code: newCode.trim() });
      if (insertError) throw insertError;
      setNewCode("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("permissions").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={t("roles.permissionsPanel.title")}>
      <form onSubmit={handleAdd} className="mb-3 flex items-end gap-2">
        <div className="flex-1">
          <FormField label={t("roles.permissionsPanel.newCode")} htmlFor="new-permission-code">
            <input
              id="new-permission-code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="module.action"
              className={inputClass}
            />
          </FormField>
        </div>
        <Button type="submit" disabled={saving || !newCode.trim()}>
          <Plus className="h-4 w-4" />
          {t("common.save")}
        </Button>
      </form>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {permissions === null ? (
        <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {permissions.map((perm) => (
            <span
              key={perm.id}
              className="flex items-center gap-1.5 rounded-full bg-cream-soft px-2.5 py-1 text-xs font-mono text-ink"
            >
              {perm.code}
              <button
                type="button"
                onClick={() => handleDelete(perm.id)}
                disabled={saving}
                className="text-ink-muted hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function RolesPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRoles = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("roles")
      .select("id, code, label_ar, label_fr")
      .order("code", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setRoles([]);
      return;
    }
    setRoles(data);
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("roles").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadRoles();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("roles.title")}</h1>
        <Button onClick={() => setFormState({ role: null })}>
          <Plus className="h-4 w-4" />
          {t("roles.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {roles === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : roles.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("roles.columns.code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("roles.columns.labelAr")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("roles.columns.labelFr")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("roles.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs text-ink">{role.code}</td>
                    <td className="px-3 py-3 text-ink-muted">{role.label_ar}</td>
                    <td className="px-3 py-3 text-ink-muted">{role.label_fr}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPermissionsTarget(role)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-brand-600 hover:bg-brand-50"
                          title={t("roles.permissionsModal.title", { role: role.label_ar })}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState({ role })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(role)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PermissionsPanel t={t} />

      {formState && (
        <RoleFormModal open role={formState.role} onClose={() => setFormState(null)} onSaved={loadRoles} />
      )}

      {permissionsTarget && (
        <RolePermissionsModal open role={permissionsTarget} onClose={() => setPermissionsTarget(null)} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("roles.deleteConfirmTitle")}
          message={t("roles.deleteConfirmMessage", { name: deleteTarget.label_ar })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
