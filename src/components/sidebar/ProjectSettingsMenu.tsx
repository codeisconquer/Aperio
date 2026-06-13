import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Globe, Settings, Trash2 } from "lucide-react";
import type { SwaggerProject } from "../../types/swagger";

interface ProjectSettingsMenuProps {
  project: SwaggerProject;
  onManageEnvironments: (project: SwaggerProject) => void;
  onCopyProject: (project: SwaggerProject) => void;
  onRemoveProject: (project: SwaggerProject) => void;
}

export function ProjectSettingsMenu({
  project,
  onManageEnvironments,
  onCopyProject,
  onRemoveProject,
}: ProjectSettingsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function run(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={t("projectSettings.openMenu")}
        aria-label={t("projectSettings.openMenu")}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`rounded p-1.5 transition-colors hover:bg-background/60 ${
          open ? "text-accent" : "text-subtle hover:text-muted"
        }`}
      >
        <Settings className="size-3.5" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-52 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run(() => onManageEnvironments(project))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-background/60"
          >
            <Globe className="size-3.5 text-accent" aria-hidden />
            {t("projectSettings.manageEnvironments")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(() => onCopyProject(project))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-background/60"
          >
            <Copy className="size-3.5 text-muted" aria-hidden />
            {t("projectSettings.copyProject")}
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => run(() => onRemoveProject(project))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="size-3.5" aria-hidden />
            {t("sidebar.removeProject")}
          </button>
        </div>
      )}
    </div>
  );
}
