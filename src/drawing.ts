import { Bitmap, drawBitmapToCanvas, fitCanvasToParent } from "./bitmap";

export function drawUploadedPattern(bitmap: Bitmap) {
  // Draw the bitmap to the upload canvas
  const uploadCanvas = document.getElementById(
    "upload-result"
  ) as HTMLCanvasElement;
  const aspectRatio = bitmap.width / bitmap.height;
  fitCanvasToParent(uploadCanvas, aspectRatio);
  drawBitmapToCanvas(uploadCanvas, bitmap);
}

export function drawComputedPattern(computedPattern: Bitmap) {
  const canvas = document.getElementById("pattern-canvas") as HTMLCanvasElement;
  drawBitmapToCanvas(canvas, computedPattern);
  canvas.style.width = `${computedPattern.width * 20}px`;
  canvas.style.height = `${computedPattern.height * 20}px`;
}
