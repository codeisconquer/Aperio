import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface JsonTreeViewProps {
  data: JsonValue;
}

function valuePreview(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) return `Array(${value.length})`;
  return `Object(${Object.keys(value).length})`;
}

function JsonNode({
  name,
  value,
  depth,
  isLast,
}: {
  name?: string;
  value: JsonValue;
  depth: number;
  isLast?: boolean;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);
  const entries = isObject
    ? isArray
      ? value.map((item, index) => [String(index), item] as const)
      : Object.entries(value)
    : [];

  const comma = isLast ? "" : ",";

  if (!isObject) {
    return (
      <div
        className="font-mono text-xs leading-relaxed"
        style={{ paddingLeft: depth * 14 }}
      >
        {name !== undefined && (
          <span className="text-accent">"{name}"</span>
        )}
        {name !== undefined && <span className="text-foreground/50">: </span>}
        <span className="text-warning">{valuePreview(value)}</span>
        <span className="text-foreground/40">{comma}</span>
      </div>
    );
  }

  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex max-w-full items-start gap-1 text-left font-mono text-xs leading-relaxed text-foreground/80 hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="mt-0.5 size-3 shrink-0 text-foreground/40" />
        ) : (
          <ChevronRight className="mt-0.5 size-3 shrink-0 text-foreground/40" />
        )}
        <span>
          {name !== undefined && (
            <>
              <span className="text-accent">"{name}"</span>
              <span className="text-foreground/50">: </span>
            </>
          )}
          <span className="text-foreground/50">{openBracket}</span>
          {!open && (
            <span className="text-foreground/40">
              {" "}
              {isArray ? `${value.length} items` : "…"}
              {" "}
            </span>
          )}
          {!open && (
            <span className="text-foreground/50">{closeBracket}</span>
          )}
          {!open && (
            <span className="text-foreground/40">{comma}</span>
          )}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {open &&
            entries.map(([childName, childValue], index) => (
              <JsonNode
                key={`${childName}-${index}`}
                name={isArray ? undefined : childName}
                value={childValue}
                depth={depth + 1}
                isLast={index === entries.length - 1}
              />
            ))}
        </div>
      </div>

      {open && (
        <div
          className="font-mono text-xs text-foreground/50"
          style={{ paddingLeft: depth * 14 }}
        >
          {closeBracket}
          <span className="text-foreground/40">{comma}</span>
        </div>
      )}
    </div>
  );
}

export function JsonTreeView({ data }: JsonTreeViewProps) {
  const isArray = Array.isArray(data);
  const isObject = data !== null && typeof data === "object";
  const entries = isObject
    ? isArray
      ? data.map((item, index) => [String(index), item] as const)
      : Object.entries(data)
    : [];

  if (!isObject) {
    return (
      <div className="rounded-md border border-white/10 bg-background p-3 font-mono text-xs text-warning">
        {valuePreview(data)}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-background p-2">
      <div className="font-mono text-xs text-foreground/50">{isArray ? "[" : "{"}</div>
      {entries.map(([name, value], index) => (
        <JsonNode
          key={`${name}-${index}`}
          name={isArray ? undefined : name}
          value={value}
          depth={1}
          isLast={index === entries.length - 1}
        />
      ))}
      <div className="font-mono text-xs text-foreground/50">{isArray ? "]" : "}"}</div>
    </div>
  );
}

export function tryParseJson(body: string): JsonValue | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as JsonValue;
  } catch {
    return null;
  }
}

export function JsonTreeViewFromText({ body }: { body: string }) {
  const parsed = useMemo(() => tryParseJson(body), [body]);

  if (parsed !== null) {
    return <JsonTreeView data={parsed} />;
  }

  return (
    <pre className="rounded-md border border-white/10 bg-background p-3 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
      {body}
    </pre>
  );
}
