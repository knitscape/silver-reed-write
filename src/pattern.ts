import { createEmptyBitmap, paletteIndexAt } from "./bitmap";

import { Bitmap } from "./bitmap";
import { MachineState } from "./types";
import { PatternConfig } from "./types";

export function computePattern(
  basePattern: Bitmap,
  patternConfig: PatternConfig,
  machineState: MachineState
) {
  const patternWidth = machineState.pointCams[1] - machineState.pointCams[0];
  const patternHeight = patternConfig.height;
  const pattern = createEmptyBitmap(patternWidth, patternHeight);

  tileBitmap(
    pattern,
    basePattern,
    patternConfig.repeat_horizontal,
    patternConfig.repeat_vertical,
    patternConfig.centerX
  );

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

function tileBitmap(
  bitmap: Bitmap,
  baseBitmap: Bitmap,
  repeatHorizontal: boolean = true,
  repeatVertical: boolean = true,
  center: boolean = false
) {
  // First update the palette by copying colors from base bitmap
  bitmap.palette = [...baseBitmap.palette];

  // Calculate offset for centering
  const xOffset = center
    ? Math.floor((bitmap.width - baseBitmap.width) / 2)
    : 0;

  for (let y = bitmap.height - 1; y >= 0; y--) {
    for (let x = 0; x < bitmap.width; x++) {
      // Get corresponding position in base bitmap
      let baseX = x - xOffset;

      // Invert Y coordinate since row 0 should be at the bottom
      let baseY = bitmap.height - 1 - y;

      // Apply horizontal wrapping if enabled
      if (repeatHorizontal) {
        baseX =
          ((baseX % baseBitmap.width) + baseBitmap.width) % baseBitmap.width;
      } else if (baseX < 0 || baseX >= baseBitmap.width) {
        continue; // Skip if outside base bitmap bounds when not repeating
      }

      // Apply vertical wrapping if enabled, starting from the bottom
      if (repeatVertical) {
        baseY =
          ((baseY % baseBitmap.height) + baseBitmap.height) % baseBitmap.height;
      } else if (baseY >= baseBitmap.height) {
        continue; // Skip if outside base bitmap bounds when not repeating
      }

      // Get color index from base bitmap
      const baseIndex = paletteIndexAt(baseBitmap, [
        baseX,
        baseBitmap.height - 1 - baseY,
      ]);
      if (baseIndex === -1) continue;

      // Modify bitmap directly
      bitmap.data[x + y * bitmap.width] = baseIndex;
    }
  }
}
