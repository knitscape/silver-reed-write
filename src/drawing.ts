import { Bitmap } from "./bitmap";

export function drawBitmapToCanvas(
  canvasElement: HTMLCanvasElement,
  bitmap: Bitmap
) {
  canvasElement.width = bitmap.width;
  canvasElement.height = bitmap.height;

  const ctx = canvasElement.getContext("2d");
  if (!ctx) {
    console.error("Failed to get canvas context");
    return;
  }

  const imageData = ctx.createImageData(bitmap.width, bitmap.height);
  for (let i = 0; i < bitmap.data.length; i++) {
    const color = bitmap.palette[bitmap.data[i]];
    imageData.data[i * 4] = color[0];
    imageData.data[i * 4 + 1] = color[1];
    imageData.data[i * 4 + 2] = color[2];
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

export function fitCanvasToParent(
  canvas: HTMLCanvasElement,
  aspectRatio: number
) {
  const parent = document.getElementById("artboard-container");
  if (!parent) {
    return;
  }

  const parentWidth = parent.clientWidth;
  const parentHeight = parent.clientHeight;

  if (parentWidth / parentHeight > aspectRatio) {
    // Parent is wider than needed - fit to height
    canvas.style.height = `${parentHeight}px`;
    canvas.style.width = `${parentHeight * aspectRatio}px`;
  } else {
    // Parent is taller than needed - fit to width
    canvas.style.width = `${parentWidth}px`;
    canvas.style.height = `${parentWidth / aspectRatio}px`;
  }
}

export function drawPreviewPattern(bitmap: Bitmap) {
  // Draw the bitmap to the preview canvas
  const previewCanvas = document.getElementById(
    "preview-canvas"
  ) as HTMLCanvasElement;
  const aspectRatio = bitmap.width / bitmap.height;
  fitCanvasToParent(previewCanvas, aspectRatio);
  drawBitmapToCanvas(previewCanvas, bitmap);
}

export function drawComputedPattern(computedPattern: Bitmap) {
  const canvas = document.getElementById("pattern-canvas") as HTMLCanvasElement;
  drawBitmapToCanvas(canvas, computedPattern);
  canvas.style.width = `${computedPattern.width * 20}px`;
  canvas.style.height = `${computedPattern.height * 20}px`;
}
