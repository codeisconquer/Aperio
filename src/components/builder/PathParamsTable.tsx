import { useTranslation } from "react-i18next";
import { VariableInput } from "../common/VariableHighlight";

interface PathParamsTableProps {
  paramNames: string[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function PathParamsTable({
  paramNames,
  values,
  onChange,
}: PathParamsTableProps) {
  const { t } = useTranslation();

  function updateValue(name: string, value: string) {
    onChange({ ...values, [name]: value });
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-panel text-left text-muted">
            <th className="px-2 py-1.5 font-medium">{t("builder.table.key")}</th>
            <th className="px-2 py-1.5 font-medium">
              {t("builder.table.value")}
            </th>
          </tr>
        </thead>
        <tbody>
          {paramNames.map((name) => (
            <tr
              key={name}
              className="border-b border-border/60 last:border-b-0 hover:bg-background/30"
            >
              <td className="px-3 py-1.5 font-mono text-foreground">{name}</td>
              <td className="px-1 py-1">
                <VariableInput
                  value={values[name] ?? ""}
                  onChange={(value) => updateValue(name, value)}
                  placeholder={t("builder.pathParamValuePlaceholder")}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
