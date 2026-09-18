import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import TeamFormModal from "../components/teams/TeamFormModal";
import TeamMembersModal from "../components/teams/TeamMembersModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function TeamsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [membersTarget, setMembersTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTeams = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("teams")
      .select("id, farm_id, name, leader_id, farms:farm_id(name), employees:leader_id(full_name)")
      .order("name", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setTeams([]);
      return;
    }

    const teamIds = (data || []).map((tm) => tm.id);
    let counts = {};
    if (teamIds.length > 0) {
      const { data: memberRows } = await supabase.from("team_members").select("team_id").in("team_id", teamIds);
      counts = (memberRows || []).reduce((acc, row) => {
        acc[row.team_id] = (acc[row.team_id] || 0) + 1;
        return acc;
      }, {});
    }

    setTeams((data || []).map((tm) => ({ ...tm, memberCount: counts[tm.id] || 0 })));
  }, [farmId]);

  useEffect(() => {
    setTeams(null);
    loadTeams();
  }, [loadTeams]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("teams").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadTeams();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("teams.title")}</h1>
        <Button onClick={() => setFormState({ team: null })}>
          <Plus className="h-4 w-4" />
          {t("teams.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {teams === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : teams.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("teams.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("teams.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("teams.columns.leader")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("teams.columns.members")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("teams.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{team.name}</td>
                    <td className="px-3 py-3 text-ink-muted">{team.farms?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{team.employees?.full_name || t("teams.noLeader")}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setMembersTarget(team)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {t("teams.membersCount", { count: team.memberCount })}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ team })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(team)}
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
        <TeamFormModal
          open
          team={formState.team}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadTeams}
        />
      )}

      {membersTarget && (
        <TeamMembersModal
          open
          team={membersTarget}
          onClose={() => {
            setMembersTarget(null);
            loadTeams();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("teams.deleteConfirmTitle")}
          message={t("teams.deleteConfirmMessage", { name: deleteTarget.name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
