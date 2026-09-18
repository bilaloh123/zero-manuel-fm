import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";

export default function PlaceholderPage({ titleKey }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t(titleKey)}</h1>
      <Card>
        <EmptyState message={t("common.noData")} />
      </Card>
    </div>
  );
}
