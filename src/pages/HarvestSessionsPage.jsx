import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Package, Paperclip } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DocumentsModal from "../components/ui/DocumentsModal";
import HarvestSessionFormModal from "../components/harvestsessions/HarvestSessionFormModal";
import CreateLotFromSessionModal from "../components/lots/CreateLotFromSessionModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

function LotButton({ session, hasLot, t, onCreateLot }) {
  if (hasLot) {
    return <span className="text-xs font-medium text-ink-muted">{t("lots.alreadyCreated")}</span>;
  }
  return (
    <button
      type="button"
      disabled={!session.end_time}
      onClick={() => onCreateLot(session)}
      className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-2.5 sm:py-1 text-xs font-medium text-ink hover:bg-cream-soft disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Package className="h-3.5 w-3.5" />
      {t("lots.createFromSession")}
    </button>
  );
}

function RowActions({ session, t, onDocuments, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-2 sm:gap-1">
      <button
        type="button"
        onClick={() => onDocuments(session)}
        className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
        title={t("documents.title")}
      >
        <Paperclip className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onEdit(session)}
        className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(session)}
        className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function HarvestSessionsPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [sessions, setSessions] = useState(null);
  const [lotSessionIds, setLotSessionIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [lotSession, setLotSession] = useState(null);
  const [documentsTarget, setDocumentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSessions = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("harvest_sessions")
      .select(
        "id, farm_id, crop_cycle_id, parcel_id, team_id, responsible_id, start_time, end_time, boxes_count, weight_kg, quality_grade, photos, farms:farm_id(code), parcels:parcel_id(name, code), crop_cycles:crop_cycle_id(crop_id, variety_id, season_id, crops:crop_id(name_ar, name_fr)), teams:team_id(name)"
      )
      .order("start_time", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setSessions([]);
      return;
    }
    setSessions(data);

    const sessionIds = (data || []).map((s) => s.id);
    if (sessionIds.length > 0) {
      const { data: lotRows } = await supabase.from("lots").select("harvest_session_id").in("harvest_session_id", sessionIds);
      setLotSessionIds(new Set((lotRows || []).map((r) => r.harvest_session_id)));
    } else {
      setLotSessionIds(new Set());
    }
  }, [farmId]);

  useEffect(() => {
    setSessions(null);
    loadSessions();
  }, [loadSessions]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("harvest_sessions").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const cycleLabel = (s) => {
    const crop = s.crop_cycles?.crops;
    const cropName = crop ? (i18n.language === "ar" ? crop.name_ar || crop.name_fr : crop.name_fr || crop.name_ar) : "";
    const parcelName = s.parcels?.name || s.parcels?.code || "";
    return `${parcelName} — ${cropName}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("harvestSessions.title")}</h1>
        <Button onClick={() => setFormState({ session: null })}>
          <Plus className="h-4 w-4" />
          {t("harvestSessions.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {sessions === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : sessions.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-border text-ink-muted">
                    <th className="px-3 py-2 text-start font-medium">{t("harvestSessions.columns.cropCycle")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("harvestSessions.columns.team")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("harvestSessions.columns.start")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("harvestSessions.columns.end")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("harvestSessions.columns.boxes")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("harvestSessions.columns.weight")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("lots.title")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("harvestSessions.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium text-ink">{cycleLabel(session)}</td>
                      <td className="px-3 py-3 text-ink-muted">{session.teams?.name || "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">
                        {session.start_time ? new Date(session.start_time).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">
                        {session.end_time ? (
                          new Date(session.end_time).toLocaleString()
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            {t("harvestSessions.inProgress")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">{session.boxes_count ?? "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">{session.weight_kg ?? "—"}</td>
                      <td className="px-3 py-3">
                        <LotButton
                          session={session}
                          hasLot={lotSessionIds.has(session.id)}
                          t={t}
                          onCreateLot={setLotSession}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <RowActions
                          session={session}
                          t={t}
                          onDocuments={setDocumentsTarget}
                          onEdit={(s) => setFormState({ session: s })}
                          onDelete={setDeleteTarget}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:hidden">
              {sessions.map((session) => (
                <div key={session.id} className="flex flex-col gap-2 rounded-card border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">{cycleLabel(session)}</p>
                    {!session.end_time && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {t("harvestSessions.inProgress")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-muted">{session.teams?.name || "—"}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{t("harvestSessions.columns.start")}</span>
                    <span className="text-ink">
                      {session.start_time ? new Date(session.start_time).toLocaleString() : "—"}
                    </span>
                  </div>
                  {session.end_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">{t("harvestSessions.columns.end")}</span>
                      <span className="text-ink">{new Date(session.end_time).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{t("harvestSessions.columns.boxes")}</span>
                    <span className="text-ink">{session.boxes_count ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{t("harvestSessions.columns.weight")}</span>
                    <span className="text-ink">{session.weight_kg ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <LotButton
                      session={session}
                      hasLot={lotSessionIds.has(session.id)}
                      t={t}
                      onCreateLot={setLotSession}
                    />
                    <RowActions
                      session={session}
                      t={t}
                      onDocuments={setDocumentsTarget}
                      onEdit={(s) => setFormState({ session: s })}
                      onDelete={setDeleteTarget}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {formState && (
        <HarvestSessionFormModal
          open
          session={formState.session}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadSessions}
        />
      )}

      {lotSession && (
        <CreateLotFromSessionModal
          open
          session={lotSession}
          onClose={() => setLotSession(null)}
          onCreated={loadSessions}
        />
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="harvest_sessions"
          record={documentsTarget}
          column="photos"
          mode="gallery"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadSessions();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("harvestSessions.deleteConfirmTitle")}
          message={t("harvestSessions.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
