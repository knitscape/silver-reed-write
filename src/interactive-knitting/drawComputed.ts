import { Bitmap } from "../utils/bitmap";
import {
  createRowMapper,
  drawBitmapWithFairisleColors,
  drawBitmapToCanvas,
} from "../drawing";
import { FairisleRowColors, PatternConfig } from "../types";

export function drawComputedPattern(
  computedPattern: Bitmap,
  fairisleColors?: FairisleRowColors[] | null,
  patternConfig?: PatternConfig | null,
  basePatternHeight?: number,
) {
  const canvas = document.getElementById("pattern-canvas") as HTMLCanvasElement;

  if (
    fairisleColors &&
    fairisleColors.length > 0 &&
    patternConfig &&
    basePatternHeight
  ) {
    const rowMapper = createRowMapper(basePatternHeight, patternConfig);
    drawBitmapWithFairisleColors(
      canvas,
      computedPattern,
      fairisleColors,
      rowMapper,
    );
  } else {
    drawBitmapToCanvas(canvas, computedPattern);
  }

  canvas.style.width = `${computedPattern.width * 20}px`;
  canvas.style.height = `${computedPattern.height * 20}px`;
}
