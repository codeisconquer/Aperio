import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Loader2 } from "lucide-react";
import {
  deleteSecureToken,
  hasSecureToken,
  saveSecureToken,
} from "../../lib/vault";

interface TokenVaultSectionProps {
  environmentId: string | null;
  environmentName?: string | null;
  onChanged?: () => void;
}

export function TokenVaultSection({
  environmentId,
  environmentName,
  onChanged,
}: TokenVaultSectionProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [stored, setStored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!environmentId) {
      setLoading(false);
      setStored(false);
      setToken("");
      setError(null);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const exists = await hasSecureToken(environmentId);
        if (!cancelled) {
          setStored(exists);
          setToken("");
        }
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
  }, [environmentId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!environmentId) return;

    setSaving(true);
    setError(null);
    try {
      await saveSecureToken(environmentId, token);
      setStored(true);
      setToken("");
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!environmentId) return;

    setSaving(true);
    setError(null);
    try {
      await deleteSecureToken(environmentId);
      setStored(false);
      setToken("");
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <KeyRound className="size-3.5 text-warning" aria-hidden />
        {t("projectSettings.authHeading")}
      </div>

      {!environmentId ? (
        <p className="text-xs leading-relaxed text-muted">
          {t("vault.selectEnvironmentFirst")}
        </p>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <p className="text-xs leading-relaxed text-muted">
            {environmentName
              ? t("vault.hintForEnvironment", { name: environmentName })
              : t("vault.hint")}
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              {t("vault.tokenLabel")}
            </span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("vault.tokenPlaceholder")}
              autoComplete="off"
              disabled={loading || saving}
              className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent disabled:opacity-50"
            />
          </label>

          {loading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
            </div>
          ) : (
            <>
              {stored && (
                <p className="text-xs text-success">
                  {environmentName
                    ? t("vault.storedForEnvironment", { name: environmentName })
                    : t("vault.stored")}
                </p>
              )}

              {error && (
                <p className="text-xs text-red-300" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !token.trim()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  )}
                  {t("vault.save")}
                </button>
                {stored && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={saving}
                    className="rounded-md border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {t("vault.remove")}
                  </button>
                )}
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}
