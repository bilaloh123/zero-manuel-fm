import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { LayoutDashboard, ChevronDown, Leaf, Bell, FileBarChart } from "lucide-react";
import { navSections } from "../../routes/navConfig";
import { useAlertsContext } from "../../context/AlertsContext";

function SectionIcon({ name, className }) {
  const Icon = Icons[name] || Icons.Circle;
  return <Icon className={className} />;
}

function NavSection({ section, defaultOpen }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="px-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-medium text-sidebar-text/90 hover:bg-sidebar-hover transition-colors"
        aria-expanded={open}
      >
        <SectionIcon name={section.icon} className="h-4 w-4 shrink-0 text-sidebar-muted" />
        <span className="flex-1 text-start">{t(`nav.sections.${section.key}`)}</span>
        <ChevronDown
          className={`h-4 w-4 text-sidebar-muted transition-transform ${open ? "rotate-180" : "rtl:rotate-90 ltr:rotate-0"}`}
        />
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-0.5 border-s border-sidebar-hover ps-3 ms-4">
          {section.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `rounded-control px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-active text-white font-medium"
                    : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text"
                }`
              }
            >
              {t(`nav.items.${item.key}`)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ className = "" }) {
  const { t, i18n } = useTranslation();
  const isLatinScript = i18n.language !== "ar";
  const { alerts } = useAlertsContext();
  const alertCount = alerts.length;

  return (
    <aside
      className={`flex h-full w-72 shrink-0 flex-col bg-sidebar text-sidebar-text shadow-sidebar ${className}`}
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-sidebar-active">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold tracking-wide">{t("app.name")}</span>
          <span
            className={`text-[11px] text-sidebar-muted ${
              isLatinScript ? "uppercase tracking-[0.12em]" : ""
            }`}
          >
            {t("app.tagline")}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pb-6">
        <div className="px-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `mb-2 flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-sidebar-active text-white" : "text-sidebar-text/90 hover:bg-sidebar-hover"
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>{t("nav.dashboard")}</span>
          </NavLink>

          <NavLink
            to="/alerts"
            className={({ isActive }) =>
              `mb-2 flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-sidebar-active text-white" : "text-sidebar-text/90 hover:bg-sidebar-hover"
              }`
            }
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t("alerts.title")}</span>
            {alertCount > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                {alertCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `mb-2 flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-sidebar-active text-white" : "text-sidebar-text/90 hover:bg-sidebar-hover"
              }`
            }
          >
            <FileBarChart className="h-4 w-4 shrink-0" />
            <span>{t("reports.title")}</span>
          </NavLink>
        </div>

        <div className="flex flex-col gap-1">
          {navSections.map((section, idx) => (
            <NavSection key={section.key} section={section} defaultOpen={idx === 0} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
