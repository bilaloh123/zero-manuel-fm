import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";

export const RTL_LANGUAGES = ["ar"];
export const SUPPORTED_LANGUAGES = ["ar", "fr"];

export function applyDirection(lang) {
  const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
  return dir;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      fr: { translation: fr },
    },
    fallbackLng: "ar",
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "agrimax_lang",
    },
    interpolation: { escapeValue: false },
  });

applyDirection(i18n.resolvedLanguage || i18n.language || "ar");

i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
});

export default i18n;
