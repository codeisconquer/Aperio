import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { setLanguage } from "../../i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith("de") ? "de" : "en";

  return (
    <div className="flex items-center gap-2">
      <Languages className="size-4 text-muted" aria-hidden />
      <label htmlFor="language-select" className="sr-only">
        {t("language.label")}
      </label>
      <select
        id="language-select"
        value={current}
        onChange={(e) => setLanguage(e.target.value as "de" | "en")}
        className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
      >
        <option value="de">{t("language.de")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
    </div>
  );
}
