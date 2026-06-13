import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { getStoredTheme, setTheme, type Theme } from "../../lib/theme";

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  function selectTheme(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex shrink-0 rounded-md border border-border bg-background/70 p-0.5"
    >
      <button
        type="button"
        aria-pressed={theme === "dark"}
        title={t("theme.dark")}
        onClick={() => selectTheme("dark")}
        className={`inline-flex items-center rounded p-1.5 transition-colors ${
          theme === "dark"
            ? "bg-accent/20 text-accent"
            : "text-muted hover:text-foreground"
        }`}
      >
        <Moon className="size-3.5" aria-hidden />
        <span className="sr-only">{t("theme.dark")}</span>
      </button>
      <button
        type="button"
        aria-pressed={theme === "light"}
        title={t("theme.light")}
        onClick={() => selectTheme("light")}
        className={`inline-flex items-center rounded p-1.5 transition-colors ${
          theme === "light"
            ? "bg-accent/20 text-accent"
            : "text-muted hover:text-foreground"
        }`}
      >
        <Sun className="size-3.5" aria-hidden />
        <span className="sr-only">{t("theme.light")}</span>
      </button>
    </div>
  );
}
