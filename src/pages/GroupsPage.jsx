import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import GroupFormModal from "../components/groups/GroupFormModal";
import { supabase } from "../lib/supabaseClient";

export default function GroupsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadGroups = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("groups")
      .select("id, name, created_at")
      .order("name", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setGroups([]);
      return;
    }
    setGroups(data);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("groups").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadGroups();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("groups.title")}</h1>
        <Button onClick={() => setFormState({ group: null })}>
          <Plus className="h-4 w-4" />
          {t("groups.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {groups === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : groups.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("groups.columns.name")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("groups.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{group.name}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ group })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(group)}
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

      {formState && (
        <GroupFormModal open group={formState.group} onClose={() => setFormState(null)} onSaved={loadGroups} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("groups.deleteConfirmTitle")}
          message={t("groups.deleteConfirmMessage", { name: deleteTarget.name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
