import { useRef, type ReactNode, type TextareaHTMLAttributes } from "react";

const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

export function renderVariableHighlightedText(text: string): ReactNode[] {
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

type VariableInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "className"
> & {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
};

export function VariableInput({
  value,
  onChange,
  className = "",
  inputClassName = "text-xs",
  ...props
}: VariableInputProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);

  function syncScroll(element: HTMLInputElement) {
    if (mirrorRef.current) {
      mirrorRef.current.scrollLeft = element.scrollLeft;
    }
  }

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={mirrorRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-2 py-1 font-mono ${inputClassName}`}
      >
        {renderVariableHighlightedText(value)}
        {!value && <span className="text-transparent">.</span>}
      </div>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => syncScroll(e.currentTarget)}
        className={`relative w-full rounded border border-transparent bg-transparent px-2 py-1 font-mono text-transparent caret-foreground outline-none selection:bg-accent/30 focus:border-accent/50 focus:bg-background/60 ${inputClassName}`}
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
};

export function VariableTextarea({
  value,
  onChange,
  className = "",
  ...props
}: VariableTextareaProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);

  function syncScroll(element: HTMLTextAreaElement) {
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = element.scrollTop;
      mirrorRef.current.scrollLeft = element.scrollLeft;
    }
  }

  return (
    <div className={`relative min-h-0 flex-1 ${className}`}>
      <div
        ref={mirrorRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-relaxed"
      >
        {renderVariableHighlightedText(value)}
        {!value && <span className="text-transparent">.</span>}
      </div>
      <textarea
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => syncScroll(e.currentTarget)}
        className="relative min-h-32 w-full resize-none rounded-md border border-white/10 bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-transparent caret-foreground outline-none selection:bg-accent/30 focus:border-accent"
      />
    </div>
  );
}
