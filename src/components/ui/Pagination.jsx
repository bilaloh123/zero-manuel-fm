import { useTranslation } from "react-i18next";
import Button from "./Button";

export default function Pagination({ page, pageSize, total, onPageChange }) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (total <= pageSize) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 text-sm text-ink-muted">
      <span>{t("common.pagination.showing", { from, to, total })}</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {t("common.pagination.previous")}
        </Button>
        <span className="text-xs">{t("common.pagination.pageOf", { page, totalPages })}</span>
        <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          {t("common.pagination.next")}
        </Button>
      </div>
    </div>
  );
}
