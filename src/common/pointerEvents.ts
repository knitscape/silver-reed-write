export function isLeftClick(e: PointerEvent) {
  if ("buttons" in e) {
    return e.buttons == 1;
  }
  const button = (e as any).which || (e as any).button;
  return button == 1;
}

export function getPointerPositionInElement(
  e: PointerEvent,
  element: HTMLElement,
) {
  const rect = element.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}
