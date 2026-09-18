import { useTranslation } from "react-i18next";
import { CloudSun } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function useGreetingKey() {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 18 ? "dashboard.greetingMorning" : "dashboard.greetingEvening";
}

function WeatherWidget() {
  const { t } = useTranslation();

  return (
    <div className="flex w-full shrink-0 items-center gap-4 rounded-card bg-white/15 px-5 py-4 backdrop-blur-sm sm:w-auto">
      <CloudSun className="h-9 w-9 text-white/90" />
      <div className="flex flex-col leading-tight text-white">
        <span className="text-2xl font-semibold">—°</span>
        <span className="text-xs text-white/80">{t("dashboard.weather.notConnected")}</span>
      </div>
    </div>
  );
}

export default function WelcomeBanner() {
  const { t } = useTranslation();
  const { appUser } = useAuth();
  const greetingKey = useGreetingKey();
  const firstName = appUser?.full_name?.split(" ")[0] || "";

  return (
    <div
      className="relative overflow-hidden rounded-card p-6 sm:p-8"
      style={{
        background: "linear-gradient(135deg, #1F4D3A 0%, #2E7D58 55%, #4FA377 100%)",
      }}
    >
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            {t(greetingKey)}
            {firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="mt-1 text-sm text-white/85">{t("dashboard.subtitle")}</p>
        </div>
        <WeatherWidget />
      </div>
    </div>
  );
}
