import { useTranslation } from "react-i18next";

export type VariableTooltipState = {
  kind: "env" | "path";
  name: string;
  value: string | null;
  x: number;
};

interface VariableTooltipProps {
  tooltip: VariableTooltipState;
}

export function VariableTooltip({ tooltip }: VariableTooltipProps) {
  const { t } = useTranslation();

  const label =
    tooltip.kind === "env"
      ? `{{${tooltip.name}}}`
      : `{${tooltip.name}}`;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-30 max-w-[min(18rem,calc(100%-0.5rem))] -translate-y-full rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-sm"
      style={{
        left: tooltip.x,
        top: -4,
      }}
    >
      <div className="font-mono font-medium text-accent">{label}</div>
      <div
        className={
          tooltip.value
            ? "mt-0.5 break-all text-foreground"
            : "mt-0.5 text-subtle"
        }
      >
        {tooltip.value ??
          (tooltip.kind === "env"
            ? t("variables.notConfigured")
            : t("variables.pathNotSet"))}
      </div>
      {tooltip.kind === "env" && !tooltip.value && (
        <div className="mt-1 text-[10px] leading-snug text-subtle">
          {t("variables.configureInEnvironments")}
        </div>
      )}
    </div>
  );
}
