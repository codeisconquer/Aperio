function measureContext(
  element: HTMLInputElement | HTMLTextAreaElement,
): CanvasRenderingContext2D | null {
  const style = window.getComputedStyle(element);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx;
}

function offsetInLine(
  line: string,
  x: number,
  ctx: CanvasRenderingContext2D,
): number {
  if (x <= 0 || !line) return 0;

  let low = 0;
  let high = line.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(line.slice(0, mid)).width > x) {
      high = mid - 1;
    } else {
      low = mid;
    }
  }
  return low;
}

export function caretOffsetFromMouseX(
  element: HTMLInputElement,
  clientX: number,
): number {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const padLeft = parseFloat(style.paddingLeft);
  const x = clientX - rect.left - padLeft + element.scrollLeft;
  const ctx = measureContext(element);
  if (!ctx) return element.value.length;
  return offsetInLine(element.value, x, ctx);
}

export function caretOffsetFromMouse(
  element: HTMLTextAreaElement,
  clientX: number,
  clientY: number,
): number {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const padTop = parseFloat(style.paddingTop);
  const padLeft = parseFloat(style.paddingLeft);
  const lineHeight =
    parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.625;
  const x = clientX - rect.left - padLeft + element.scrollLeft;
  const row = Math.max(
    0,
    Math.floor((clientY - rect.top - padTop + element.scrollTop) / lineHeight),
  );

  const lines = element.value.split("\n");
  let offset = 0;
  for (let i = 0; i < row && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }

  const lineText = lines[Math.min(row, lines.length - 1)] ?? "";
  const ctx = measureContext(element);
  if (!ctx) return element.value.length;

  return Math.min(offset + offsetInLine(lineText, x, ctx), element.value.length);
}
