import { useRef, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import {
  caretOffsetFromMouse,
  caretOffsetFromMouseX,
} from "../../lib/inputCaretOffset";
import { PATH_PARAM_NAME_PATTERN } from "../../lib/pathParamPattern";
import { findPlaceholderAtOffset } from "../../lib/variablePlaceholders";
import {
  VariableTooltip,
  type VariableTooltipState,
} from "./VariableTooltip";

const PLACEHOLDER_RE = new RegExp(
  `\\{\\{([^}]+)\\}\\}|(?<!\\{)\\{(${PATH_PARAM_NAME_PATTERN})\\}(?!\\})`,
  "g",
);

export function renderVariableHighlightedText(
  text: string,
  pathParamValues?: Record<string, string>,
): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  PLACEHOLDER_RE.lastIndex = 0;
  while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t-${key++}`} className="text-foreground">
          {text.slice(lastIndex, match.index)}
        </span>,
      );
    }

    const envName = match[1];
    const pathName = match[2];
    if (envName !== undefined) {
      parts.push(
        <span key={`v-${key++}`} className="font-medium text-accent">
          {match[0]}
        </span>,
      );
    } else if (pathName !== undefined) {
      const name = pathName.trim();
      const resolved =
        pathParamValues !== undefined &&
        Boolean(pathParamValues[name]?.trim());
      parts.push(
        <span
          key={`p-${key++}`}
          className={
            resolved
              ? "font-medium text-emerald-400/90"
              : "font-medium text-amber-400"
          }
        >
          {match[0]}
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`t-${key++}`} className="text-foreground">
        {text.slice(lastIndex)}
      </span>,
    );
  }

  if (parts.length === 0) {
    return [<span key="empty" className="text-foreground">{text}</span>];
  }

  return parts;
}

const ENV_PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

function renderEnvHighlightedText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  ENV_PLACEHOLDER_RE.lastIndex = 0;
  while ((match = ENV_PLACEHOLDER_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t-${key++}`} className="text-foreground">
          {text.slice(lastIndex, match.index)}
        </span>,
      );
    }
    parts.push(
      <span key={`v-${key++}`} className="font-medium text-accent">
        {match[0]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`t-${key++}`} className="text-foreground">
        {text.slice(lastIndex)}
      </span>,
    );
  }

  if (parts.length === 0) {
    return [<span key="empty" className="text-foreground">{text}</span>];
  }

  return parts;
}

function buildTooltipState(
  text: string,
  offset: number,
  clientX: number,
  wrapperLeft: number,
  environmentVariables?: Record<string, string>,
  pathParamValues?: Record<string, string>,
): VariableTooltipState | null {
  const placeholder = findPlaceholderAtOffset(text, offset);
  if (!placeholder) return null;

  const value =
    placeholder.kind === "env"
      ? environmentVariables?.[placeholder.name]?.trim() || null
      : pathParamValues?.[placeholder.name]?.trim() || null;

  return {
    kind: placeholder.kind,
    name: placeholder.name,
    value,
    x: Math.max(0, clientX - wrapperLeft - 8),
  };
}

type VariableInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "className"
> & {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  pathParamValues?: Record<string, string>;
  environmentVariables?: Record<string, string>;
  className?: string;
  inputClassName?: string;
};

export function VariableInput({
  value,
  onChange,
  invalid = false,
  pathParamValues,
  environmentVariables,
  className = "",
  inputClassName = "text-xs",
  ...props
}: VariableInputProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<VariableTooltipState | null>(null);

  function syncScroll(element: HTMLInputElement) {
    if (mirrorRef.current) {
      mirrorRef.current.scrollLeft = element.scrollLeft;
    }
  }

  function updateTooltipFromMouse(
    element: HTMLInputElement,
    clientX: number,
  ) {
    const wrapperLeft = wrapperRef.current?.getBoundingClientRect().left ?? 0;
    const offset = caretOffsetFromMouseX(element, clientX);
    setTooltip(
      buildTooltipState(
        value,
        offset,
        clientX,
        wrapperLeft,
        environmentVariables,
        pathParamValues,
      ),
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative block w-full min-w-0 ${className}`}
    >
      {tooltip && <VariableTooltip tooltip={tooltip} />}
      <div
        ref={mirrorRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-2 py-1 font-mono ${inputClassName}`}
      >
        {renderVariableHighlightedText(value, pathParamValues)}
        {!value && <span className="text-transparent">.</span>}
      </div>
      <input
        {...props}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => syncScroll(e.currentTarget)}
        onMouseMove={(e) => updateTooltipFromMouse(e.currentTarget, e.clientX)}
        onMouseLeave={() => setTooltip(null)}
        className={`relative block w-full min-w-0 rounded border border-transparent bg-transparent px-2 py-1 font-mono text-transparent caret-foreground outline-none selection:bg-accent/30 ${
          invalid
            ? "focus:border-red-400/70 focus:bg-red-500/5"
            : "focus:border-accent/50 focus:bg-background/60"
        } ${inputClassName}`}
      />
    </div>
  );
}

type VariableTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
  environmentVariables?: Record<string, string>;
};

export function VariableTextarea({
  value,
  onChange,
  environmentVariables,
  className = "",
  ...props
}: VariableTextareaProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<VariableTooltipState | null>(null);

  function syncScroll(element: HTMLTextAreaElement) {
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = element.scrollTop;
      mirrorRef.current.scrollLeft = element.scrollLeft;
    }
  }

  function updateTooltipFromMouse(
    element: HTMLTextAreaElement,
    clientX: number,
    clientY: number,
  ) {
    const wrapperLeft = wrapperRef.current?.getBoundingClientRect().left ?? 0;
    const offset = caretOffsetFromMouse(element, clientX, clientY);
    setTooltip(
      buildTooltipState(
        value,
        offset,
        clientX,
        wrapperLeft,
        environmentVariables,
      ),
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative min-h-32 flex-1 overflow-hidden rounded-md border border-border bg-surface focus-within:border-accent ${className}`}
    >
      {tooltip && <VariableTooltip tooltip={tooltip} />}
      <div
        ref={mirrorRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-relaxed"
      >
        {renderEnvHighlightedText(value)}
        {!value && <span className="text-transparent">.</span>}
      </div>
      <textarea
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => syncScroll(e.currentTarget)}
        onMouseMove={(e) =>
          updateTooltipFromMouse(e.currentTarget, e.clientX, e.clientY)
        }
        onMouseLeave={() => setTooltip(null)}
        className="absolute inset-0 h-full w-full resize-none bg-transparent px-3 py-2 font-mono text-xs leading-relaxed text-transparent caret-foreground outline-none selection:bg-accent/30"
      />
    </div>
  );
}
