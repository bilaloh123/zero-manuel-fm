import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Globe, Search, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFilters, PERIOD_OPTIONS } from "../../context/FiltersContext";

export default function Topbar() {
  const { t, i18n } = useTranslation();
  const { appUser, signOut } = useAuth();
  const { farms, farmId, setFarmId, period, setPeriod } = useFilters();
  const [search, setSearch] = useState("");

  const toggleLanguage = () => {
    const next = i18n.language === "ar" ? "fr" : "ar";
    i18n.changeLanguage(next);
  };

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-cream/80 px-6 backdrop-blur">
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint start-3" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.searchPlaceholder")}
          className="w-full rounded-control border border-border bg-white py-2 text-sm text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ps-9 pe-3"
        />
      </div>

      <div className="flex items-center gap-3">
        <select
          value={farmId}
          onChange={(e) => setFarmId(e.target.value)}
          className="rounded-control border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="all">{t("filters.allFarms")}</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </select>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-control border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`filters.periods.${opt}`)}
            </option>
          ))}
        </select>

        <button
          type="button"
          title={t("common.notifications")}
          className="relative flex h-9 w-9 items-center justify-center rounded-control border border-border bg-white text-ink shadow-sm hover:bg-cream-soft"
        >
          <Bell className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleLanguage}
          title={t("common.language")}
          className="flex items-center gap-1.5 rounded-control border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm hover:bg-cream-soft"
        >
          <Globe className="h-4 w-4" />
          <span className="uppercase">{i18n.language}</span>
        </button>

        <div className="flex items-center gap-3 ps-2">
          <span className="hidden text-sm font-medium text-ink sm:inline">{appUser?.full_name || ""}</span>
          <button
            type="button"
            onClick={signOut}
            title={t("common.logout")}
            className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-white text-ink shadow-sm hover:bg-cream-soft"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
