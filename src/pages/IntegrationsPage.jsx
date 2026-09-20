import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, History } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import IntegrationFormModal from "../components/integrations/IntegrationFormModal";
import IntegrationEventsModal from "../components/integrations/IntegrationEventsModal";
import { supabase } from "../lib/supabaseClient";

const STATUS_BADGE = {
  planned: "bg-gray-100 text-gray-600",
  configured: "bg-amber-100 text-amber-700",
  active: "bg-brand-100 text-brand-700",
  disabled: "bg-red-100 text-red-700",
};

export default function IntegrationsPage() {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [eventsTarget, setEventsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadIntegrations = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("integrations")
      .select("id, farm_id, category, provider_name, status, webhook_url, config, notes, farms:farm_id(name)")
      .order("category", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setIntegrations([]);
      return;
    }
    setIntegrations(data);
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("integrations").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadIntegrations();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("integrations.title")}</h1>
        <Button onClick={() => setFormState({ integration: null })}>
          <Plus className="h-4 w-4" />
          {t("integrations.add")}
        </Button>
      </div>

      <p className="rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">{t("integrations.pageHint")}</p>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {integrations === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : integrations.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("integrations.columns.category")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("integrations.columns.providerName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("integrations.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("integrations.columns.status")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("integrations.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((integration) => (
                  <tr key={integration.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink-muted">{t(`integrations.categories.${integration.category}`)}</td>
                    <td className="px-3 py-3 font-medium text-ink">{integration.provider_name}</td>
                    <td className="px-3 py-3 text-ink-muted">{integration.farms?.name || t("integrations.allFarms")}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[integration.status]}`}>
                        {t(`integrations.status.${integration.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEventsTarget(integration)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("integrations.events.title", { name: integration.provider_name })}
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState({ integration })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(integration)}
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
        <IntegrationFormModal
          open
          integration={formState.integration}
          onClose={() => setFormState(null)}
          onSaved={loadIntegrations}
        />
      )}

      {eventsTarget && <IntegrationEventsModal open integration={eventsTarget} onClose={() => setEventsTarget(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("integrations.deleteConfirmTitle")}
          message={t("integrations.deleteConfirmMessage", { name: deleteTarget.provider_name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
