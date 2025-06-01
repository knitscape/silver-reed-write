import { Bitmap, drawBitmapToCanvas, fitCanvasToParent } from "./bitmap";
import { KnittingState } from "./types";

export function drawUploadedPattern(bitmap: Bitmap) {
  // Draw the bitmap to the upload canvas
  const uploadCanvas = document.getElementById(
    "upload-result"
  ) as HTMLCanvasElement;
  const aspectRatio = bitmap.width / bitmap.height;
  fitCanvasToParent(uploadCanvas, aspectRatio);
  drawBitmapToCanvas(uploadCanvas, bitmap);
}

export function drawComputedPattern(
  computedPattern: Bitmap,
  knittingState: KnittingState
) {
  const canvas = document.getElementById("pattern-canvas") as HTMLCanvasElement;
  drawBitmapToCanvas(canvas, computedPattern);
  canvas.style.width = `${computedPattern.width * 20}px`;
  canvas.style.height = `${computedPattern.height * 20}px`;

  if (knittingState.patterning) {
    highlightRow(knittingState.currentRowNumber);
  }
}

function highlightRow(
  row: number,
  highlightColor: string = "rgba(255, 0, 0, 0.3)",
  bottomUp: boolean = true
) {
  const canvas = document.getElementById("pattern-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Could not get context");
    return;
  }
  ctx.fillStyle = highlightColor;
  if (bottomUp) {
    ctx.fillRect(0, canvas.height - row - 1, canvas.width, 1);
  } else {
    ctx.fillRect(0, row, canvas.width, 1);
  }
}
