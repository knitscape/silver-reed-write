import { createEmptyBitmap, stampBitmap, tileBitmap } from "./bitmap";

import { Bitmap } from "./bitmap";
import { MachineState } from "./types";
import { PatternConfig } from "./types";

export function computePattern(
  basePattern: Bitmap,
  patternConfig: PatternConfig,
  machineState: MachineState
) {
  const patternWidth = machineState.pointCams[1] - machineState.pointCams[0];
  const patternHeight = basePattern.height;
  const pattern = createEmptyBitmap(patternWidth, patternHeight);

  if (patternConfig.repeat_horizontal) {
    tileBitmap(pattern, basePattern, patternConfig.centerX);
  } else {
    stampBitmap(pattern, basePattern, [0, 0]);
  }

  if (patternConfig.endNeedleSelection) {
    // makes the end needles always be selected
    for (let row = 0; row < pattern.height; row++) {
      pattern.data[row * pattern.width] = 1;
      pattern.data[row * pattern.width + pattern.width - 1] = 1;
    }
  }

  // if (patternConfig.marginLeft > 0) {
  //   // shift the pattern to the right
  //   for (let row = 0; row < pattern.height; row++) {
  //     pattern.data[row * pattern.width + patternConfig.marginLeft] = 1;
  //   }
  // }

  return pattern;
}
