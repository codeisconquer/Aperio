import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Lock, X } from "lucide-react";
import {
  deleteSecureToken,
  hasSecureToken,
  saveSecureToken,
} from "../../lib/vault";
import type { SwaggerProject } from "../../types/swagger";

interface TokenVaultModalProps {
  project: SwaggerProject;
  onClose: () => void;
  onChanged: () => void;
}

export function TokenVaultModal({
  project,
  onClose,
  onChanged,
}: TokenVaultModalProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [stored, setStored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const exists = await hasSecureToken(project.id);
        if (!cancelled) setStored(exists);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveSecureToken(project.id, token);
      setStored(true);
      setToken("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await deleteSecureToken(project.id);
      setStored(false);
      setToken("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-white/10 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-warning" aria-hidden />
            <h2 id="vault-title" className="text-sm font-semibold text-foreground">
              {t("vault.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground/50 hover:bg-background/60 hover:text-foreground"
            aria-label={t("vault.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="px-4 py-3">
          <p className="text-xs text-foreground/50">{t("vault.project")}</p>
          <p className="truncate text-sm font-medium text-foreground">
            {project.title}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-accent" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-3 px-4 pb-4">
            <p className="text-xs text-foreground/50">{t("vault.hint")}</p>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground/70">
                {t("vault.tokenLabel")}
              </span>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("vault.tokenPlaceholder")}
                autoComplete="off"
                className="rounded-md border border-white/10 bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent"
              />
            </label>

            {stored && (
              <p className="text-xs text-success">{t("vault.stored")}</p>
            )}

            {error && (
              <p className="text-xs text-red-300" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !token.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {t("vault.save")}
              </button>
              {stored && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={saving}
                  className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {t("vault.remove")}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
