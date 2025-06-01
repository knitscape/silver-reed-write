import { createEmptyBitmap } from "./bitmap";

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

  return pattern;
}
