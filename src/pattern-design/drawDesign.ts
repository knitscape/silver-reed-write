import { Bitmap } from "../utils/bitmap";
import { FairisleRowColors } from "../types";
import { fitCanvasToParent } from "../drawing";
import { drawBitmapWithFairisleColors, drawBitmapToCanvas } from "../drawing";

export function drawDesignPattern(
  bitmap: Bitmap,
  fairisleColors?: FairisleRowColors[] | null,
) {
  // Draw the bitmap to the preview canvas
  const previewCanvas = document.getElementById(
    "preview-canvas",
  ) as HTMLCanvasElement;
  const aspectRatio = bitmap.width / bitmap.height;
  fitCanvasToParent(previewCanvas, aspectRatio);

  if (fairisleColors && fairisleColors.length > 0) {
    // For the base pattern preview, row mapping is just identity
    drawBitmapWithFairisleColors(
      previewCanvas,
      bitmap,
      fairisleColors,
      (row) => row % fairisleColors.length,
    );
  } else {
    drawBitmapToCanvas(previewCanvas, bitmap);
  }
}
