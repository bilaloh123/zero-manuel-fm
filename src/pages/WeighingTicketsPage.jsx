import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Paperclip } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DocumentsModal from "../components/ui/DocumentsModal";
import WeighingTicketFormModal from "../components/weighingtickets/WeighingTicketFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function WeighingTicketsPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [documentsTarget, setDocumentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTickets = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("weighing_tickets")
      .select(
        "id, ticket_no, net_weight, occurred_at, farm_id, pdf_url, vehicles:vehicle_id(plate_no), drivers:driver_id(full_name), products:product_id(name_ar, name_fr)"
      )
      .order("occurred_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setTickets([]);
      return;
    }
    setTickets(data);
  }, [farmId]);

  useEffect(() => {
    setTickets(null);
    loadTickets();
  }, [loadTickets]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("weighing_tickets").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("weighingTickets.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("weighingTickets.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {tickets === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : tickets.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("weighingTickets.columns.ticketNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("weighingTickets.columns.vehicle")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("weighingTickets.columns.driver")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("weighingTickets.columns.product")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("weighingTickets.columns.netWeight")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("weighingTickets.columns.occurredAt")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("weighingTickets.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{ticket.ticket_no}</td>
                    <td className="px-3 py-3 text-ink-muted">{ticket.vehicles?.plate_no || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{ticket.drivers?.full_name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{productLabel(ticket.products)}</td>
                    <td className="px-3 py-3 font-medium text-ink">{ticket.net_weight}</td>
                    <td className="px-3 py-3 text-ink-muted">{new Date(ticket.occurred_at).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDocumentsTarget(ticket)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("documents.title")}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ticket)}
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

      {formOpen && (
        <WeighingTicketFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadTickets}
        />
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="weighing_tickets"
          record={documentsTarget}
          column="pdf_url"
          mode="single"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadTickets();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("weighingTickets.deleteConfirmTitle")}
          message={t("weighingTickets.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
