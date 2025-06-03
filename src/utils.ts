import { Bitmap } from "./bitmap";

export function isLeftClick(e: PointerEvent) {
  if ("buttons" in e) {
    return e.buttons == 1;
  }
  const button = e.which || e.button;
  return button == 1;
}

export function getPointerPositionInElement(
  e: PointerEvent,
  element: HTMLElement
) {
  const rect = element.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

export function getCurrentCellSize(rect: DOMRect, bitmap: Bitmap) {
  return rect.width / bitmap.width;
}

export function getCellFromEvent(
  e: PointerEvent,
  bitmap: Bitmap
): [number, number] {
  const canvas = document.getElementById("preview-canvas") as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const cellWidth = rect.width / bitmap.width;
  const cellHeight = rect.height / bitmap.height;

  const point = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };

  let x = Math.floor(point.x / cellWidth);
  let y = Math.floor(point.y / cellHeight);

  if (x < 0) {
    x = 0;
  }
  if (y < 0) {
    y = 0;
  }

  if (x >= bitmap.width) {
    x = bitmap.width - 1;
  }

  if (y >= bitmap.height) {
    y = bitmap.height - 1;
  }
  return [x, y];
}
