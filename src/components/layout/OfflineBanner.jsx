import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-white">
      <WifiOff className="h-3.5 w-3.5" />
      {t("common.offlineBanner")}
    </div>
  );
}
