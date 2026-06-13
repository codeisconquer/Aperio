import { PATH_PARAM_NAME_PATTERN } from "./pathParamPattern";

const PLACEHOLDER_RE = new RegExp(
  `\\{\\{([^}]+)\\}\\}|(?<!\\{)\\{(${PATH_PARAM_NAME_PATTERN})\\}(?!\\})`,
  "g",
);

export type VariablePlaceholder = {
  kind: "env" | "path";
  name: string;
  start: number;
  end: number;
};

export function findVariablePlaceholders(text: string): VariablePlaceholder[] {
  const placeholders: VariablePlaceholder[] = [];
  let match: RegExpExecArray | null;

  PLACEHOLDER_RE.lastIndex = 0;
  while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
    const envName = match[1];
    const pathName = match[2];
    if (envName !== undefined) {
      placeholders.push({
        kind: "env",
        name: envName.trim(),
        start: match.index,
        end: match.index + match[0].length,
      });
    } else if (pathName !== undefined) {
      placeholders.push({
        kind: "path",
        name: pathName.trim(),
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return placeholders;
}

export function findPlaceholderAtOffset(
  text: string,
  offset: number,
): VariablePlaceholder | null {
  for (const placeholder of findVariablePlaceholders(text)) {
    if (offset >= placeholder.start && offset <= placeholder.end) {
      return placeholder;
    }
  }
  return null;
}
