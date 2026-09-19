import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import StatTile from "../components/ui/StatTile";
import EmployeeFormModal from "../components/employees/EmployeeFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  active: "bg-brand-100 text-brand-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [employees, setEmployees] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadEmployees = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("employees")
      .select(
        "id, farm_id, employee_no, cin, full_name, phone, address, job_title, hire_date, cnss_no, employment_type, status"
      )
      .order("full_name", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setEmployees([]);
      return;
    }
    setEmployees(data);
  }, [farmId]);

  useEffect(() => {
    setEmployees(null);
    loadEmployees();
  }, [loadEmployees]);

  const kpi = useMemo(() => {
    const list = employees || [];
    return {
      total: list.length,
      permanent: list.filter((e) => e.employment_type === "permanent").length,
      seasonal: list.filter((e) => e.employment_type === "seasonal").length,
      daily: list.filter((e) => e.employment_type === "daily").length,
    };
  }, [employees]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("employees").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("employees.title")}</h1>
        <Button onClick={() => setFormState({ employee: null })}>
          <Plus className="h-4 w-4" />
          {t("employees.add")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label={t("employees.kpi.total")} value={kpi.total} accent />
        <StatTile label={t("employees.kpi.permanent")} value={kpi.permanent} />
        <StatTile label={t("employees.kpi.seasonal")} value={kpi.seasonal} />
        <StatTile label={t("employees.kpi.daily")} value={kpi.daily} />
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {employees === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : employees.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("employees.columns.employeeNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("employees.columns.fullName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("employees.columns.jobTitle")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("employees.columns.employmentType")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("employees.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("employees.columns.phone")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("employees.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink-muted">{employee.employee_no || "—"}</td>
                    <td className="px-3 py-3 font-medium text-ink">{employee.full_name}</td>
                    <td className="px-3 py-3 text-ink-muted">{employee.job_title || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {t(`employees.employmentType.${employee.employment_type}`)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[employee.status] || STATUS_BADGE.inactive}`}
                      >
                        {t(`employees.status.${employee.status}`, employee.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{employee.phone || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ employee })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(employee)}
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
        <EmployeeFormModal
          open
          employee={formState.employee}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadEmployees}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("employees.deleteConfirmTitle")}
          message={t("employees.deleteConfirmMessage", { name: deleteTarget.full_name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
