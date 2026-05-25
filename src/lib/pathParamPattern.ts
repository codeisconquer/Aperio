/** OpenAPI-style path segment placeholder, e.g. `{username}`. Not JSON `{`. */
export const PATH_PARAM_NAME_PATTERN = "[a-zA-Z_][a-zA-Z0-9_]*";

export const PATH_PARAM_RE = new RegExp(
  `(?<!\\{)\\{(${PATH_PARAM_NAME_PATTERN})\\}(?!\\})`,
  "g",
);

export function extractPathParamNames(text: string): string[] {
  const params: string[] = [];
  let match: RegExpExecArray | null;
  PATH_PARAM_RE.lastIndex = 0;
  while ((match = PATH_PARAM_RE.exec(text)) !== null) {
    const name = match[1];
    if (!params.includes(name)) {
      params.push(name);
    }
  }
  return params;
}
