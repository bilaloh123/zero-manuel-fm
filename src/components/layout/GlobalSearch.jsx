import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { Search } from "lucide-react";
import { runGlobalSearch } from "../../lib/globalSearch";

export default function GlobalSearch() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [term, setTerm] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const results = await runGlobalSearch(i18n, trimmed);
      setGroups(results);
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [term, i18n]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSelect = (url) => {
    setOpen(false);
    setTerm("");
    setGroups([]);
    navigate(url);
  };

  const trimmed = term.trim();
  const showPanel = open && trimmed.length >= 2;

  return (
    <div ref={containerRef} className="relative max-w-sm flex-1">
      <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint start-3" />
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={t("common.searchPlaceholder")}
        className="w-full rounded-control border border-border bg-white py-2 text-sm text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ps-9 pe-3"
      />

      {showPanel && (
        <div className="absolute top-full z-50 mt-1 w-full max-h-96 overflow-y-auto rounded-card border border-border bg-white shadow-card">
          {loading ? (
            <p className="px-4 py-3 text-sm text-ink-muted">{t("common.loading")}</p>
          ) : groups.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-muted">{t("search.noResults")}</p>
          ) : (
            groups.map((group) => {
              const IconComp = Icons[group.icon] || Search;
              return (
                <div key={group.key} className="border-b border-border py-1.5 last:border-0">
                  <p className="flex items-center gap-1.5 px-4 py-1 text-xs font-semibold uppercase text-ink-muted">
                    <IconComp className="h-3.5 w-3.5" />
                    {t(`search.categories.${group.key}`)} ({group.items.length})
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(group.url)}
                      className="flex w-full flex-col items-start px-4 py-2 text-start text-sm hover:bg-cream-soft"
                    >
                      <span className="font-medium text-ink">{item.title || "—"}</span>
                      {item.subtitle && <span className="text-xs text-ink-muted">{item.subtitle}</span>}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
