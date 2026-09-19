import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, MapPin, ShieldCheck } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import UserFormModal from "../components/users/UserFormModal";
import UserFarmAccessModal from "../components/users/UserFarmAccessModal";
import { supabase } from "../lib/supabaseClient";

const STATUS_BADGE = {
  active: "bg-brand-100 text-brand-700",
  inactive: "bg-gray-200 text-gray-700",
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [accessTarget, setAccessTarget] = useState(null);

  const loadUsers = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("app_users")
      .select("id, full_name, phone, status, is_super_admin")
      .order("full_name", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setUsers([]);
      return;
    }
    setUsers(data);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("users.title")}</h1>
      </div>

      <p className="rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">{t("users.creationNotice")}</p>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {users === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : users.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("users.columns.fullName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("users.columns.phone")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("users.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("users.columns.superAdmin")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("users.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{user.full_name}</td>
                    <td className="px-3 py-3 text-ink-muted">{user.phone || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[user.status] || STATUS_BADGE.inactive}`}
                      >
                        {t(`users.status.${user.status}`, user.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {user.is_super_admin ? (
                        <ShieldCheck className="h-4 w-4 text-brand-600" />
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setAccessTarget(user)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-brand-600 hover:bg-brand-50"
                          title={t("users.farmAccessModal.title", { name: user.full_name })}
                        >
                          <MapPin className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState({ user })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
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
        <UserFormModal open user={formState.user} onClose={() => setFormState(null)} onSaved={loadUsers} />
      )}

      {accessTarget && (
        <UserFarmAccessModal open user={accessTarget} onClose={() => setAccessTarget(null)} />
      )}
    </div>
  );
}
