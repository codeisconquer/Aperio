import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./locales/de.json";
import en from "./locales/en.json";

const STORAGE_KEY = "aperio.language";

function getInitialLanguage(): string {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  }
  if (typeof navigator !== "undefined" && navigator.language.startsWith("de")) {
    return "de";
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

function syncDocumentTitle() {
  if (typeof document !== "undefined") {
    document.title = i18n.t("app.title");
  }
}

syncDocumentTitle();
i18n.on("languageChanged", syncDocumentTitle);

export function setLanguage(lang: "de" | "en") {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang);
  }
  void i18n.changeLanguage(lang);
}

export default i18n;
