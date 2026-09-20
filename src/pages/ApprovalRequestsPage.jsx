import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, RotateCcw, History } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import DecisionModal from "../components/approvalrequests/DecisionModal";
import DecisionHistoryModal from "../components/approvalrequests/DecisionHistoryModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-brand-100 text-brand-700",
  rejected: "bg-red-100 text-red-700",
  returned_for_correction: "bg-amber-100 text-amber-700",
  cancelled: "bg-cream-soft text-ink-muted",
};

export default function ApprovalRequestsPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [requests, setRequests] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState({});
  const [pendingSteps, setPendingSteps] = useState({});
  const [error, setError] = useState(null);
  const [decisionState, setDecisionState] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  const loadRequests = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("approval_requests")
      .select("id, operation_type, operation_id, approval_rule_id, farm_id, amount, status, current_step, requested_at, decided_at, farms:farm_id(name)")
      .order("requested_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setRequests([]);
      return;
    }
    setRequests(data);

    const poIds = (data || []).filter((r) => r.operation_type === "purchase_order").map((r) => r.operation_id);
    if (poIds.length > 0) {
      const { data: pos } = await supabase
        .from("purchase_orders")
        .select("id, suppliers:supplier_id(company_name)")
        .in("id", poIds);
      setPurchaseOrders(Object.fromEntries((pos || []).map((p) => [p.id, p])));
    }

    const pendingWithStep = (data || []).filter((r) => r.status === "pending" && r.approval_rule_id && r.current_step);
    if (pendingWithStep.length > 0) {
      const ruleIds = [...new Set(pendingWithStep.map((r) => r.approval_rule_id))];
      const { data: steps } = await supabase
        .from("approval_steps")
        .select("approval_rule_id, step_order, label, roles:approver_role_id(label_ar, label_fr)")
        .in("approval_rule_id", ruleIds);
      const map = {};
      (steps || []).forEach((s) => {
        map[`${s.approval_rule_id}_${s.step_order}`] = s;
      });
      setPendingSteps(map);
    }
  }, [farmId]);

  useEffect(() => {
    setRequests(null);
    loadRequests();
  }, [loadRequests]);

  const roleLabel = (r) => (i18n.language === "ar" ? r?.label_ar || r?.label_fr : r?.label_fr || r?.label_ar);

  const waitingOnLabel = (request) => {
    if (!request.approval_rule_id) return t("approvalRequests.noMatchingRule");
    const step = pendingSteps[`${request.approval_rule_id}_${request.current_step}`];
    if (!step) return "—";
    return step.label || roleLabel(step.roles);
  };

  const operationLabel = (request) => {
    if (request.operation_type === "purchase_order") {
      const po = purchaseOrders[request.operation_id];
      return po?.suppliers?.company_name || t("approvalRequests.operationTypes.purchase_order");
    }
    return request.operation_type;
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t("approvalRequests.title")}</h1>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {requests === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : requests.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRequests.columns.operation")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRequests.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRequests.columns.amount")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRequests.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRequests.columns.waitingOn")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRequests.columns.requestedAt")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("approvalRequests.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{operationLabel(request)}</td>
                    <td className="px-3 py-3 text-ink-muted">{request.farms?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{Number(request.amount).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[request.status] || STATUS_BADGE.pending}`}
                      >
                        {t(`approvalRequests.status.${request.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{request.status === "pending" ? waitingOnLabel(request) : "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{new Date(request.requested_at).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {request.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setDecisionState({ request, decision: "approved" })}
                              className="flex h-8 w-8 items-center justify-center rounded-control text-brand-700 hover:bg-brand-100"
                              title={t("approvalRequests.approveAction")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDecisionState({ request, decision: "returned_for_correction" })}
                              className="flex h-8 w-8 items-center justify-center rounded-control text-amber-700 hover:bg-amber-100"
                              title={t("approvalRequests.returnAction")}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDecisionState({ request, decision: "rejected" })}
                              className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                              title={t("approvalRequests.rejectAction")}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setHistoryTarget(request)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("approvalRequests.history.title")}
                        >
                          <History className="h-4 w-4" />
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

      {decisionState && (
        <DecisionModal
          open
          request={decisionState.request}
          decision={decisionState.decision}
          onClose={() => setDecisionState(null)}
          onDecided={loadRequests}
        />
      )}

      {historyTarget && (
        <DecisionHistoryModal open request={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
    </div>
  );
}
