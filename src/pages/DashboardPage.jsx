import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner />

      <Card title={t("dashboard.title")}>
        <EmptyState message={t("dashboard.emptyState")} />
      </Card>
    </div>
  );
}
