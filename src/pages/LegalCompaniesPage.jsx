import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LegalCompanyFormModal from "../components/legalcompanies/LegalCompanyFormModal";
import { supabase } from "../lib/supabaseClient";

export default function LegalCompaniesPage() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCompanies = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("legal_companies")
      .select("id, raison_sociale, ice, rc, default_currency, groups:group_id(name)")
      .order("raison_sociale", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setCompanies([]);
      return;
    }
    setCompanies(data);
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("legal_companies").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("legalCompanies.title")}</h1>
        <Button onClick={() => setFormState({ company: null })}>
          <Plus className="h-4 w-4" />
          {t("legalCompanies.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {companies === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : companies.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("legalCompanies.columns.raisonSociale")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("legalCompanies.columns.group")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("legalCompanies.columns.ice")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("legalCompanies.columns.rc")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("legalCompanies.columns.currency")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("legalCompanies.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{company.raison_sociale}</td>
                    <td className="px-3 py-3 text-ink-muted">{company.groups?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{company.ice || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{company.rc || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{company.default_currency}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ company })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(company)}
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
        <LegalCompanyFormModal
          open
          company={formState.company}
          onClose={() => setFormState(null)}
          onSaved={loadCompanies}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("legalCompanies.deleteConfirmTitle")}
          message={t("legalCompanies.deleteConfirmMessage", { name: deleteTarget.raison_sociale })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
