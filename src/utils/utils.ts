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
  element: HTMLElement,
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
  bitmap: Bitmap,
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

export function shuffle(arr: any[]) {
  return arr.sort(() => (Math.random() > 0.5 ? 1 : -1));
}

export function getRandomColor() {
  return [
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
  ];
}

export function rgbToHex(rgb: [number, number, number]) {
  return rgb.map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex) {
  hex = hex.length > 7 ? hex.slice(0, 7) : hex;
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}
