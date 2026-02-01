import { createEmptyBitmap, paletteIndexAt } from "./utils/bitmap";

import { Bitmap } from "./utils/bitmap";
import { KnittingState, PatternConfig } from "./types";

export function computePattern(
  basePattern: Bitmap,
  patternConfig: PatternConfig,
  knittingState: KnittingState,
) {
  const patternWidth =
    knittingState.pointCams[1] -
    knittingState.pointCams[0] -
    patternConfig.marginLeft -
    patternConfig.marginRight;

  // Compute the base tile (after doubling and mirroring)
  let base = basePattern;

  if (patternConfig.double_rows || patternConfig.double_cols) {
    base = doubleBitmap(
      basePattern,
      patternConfig.double_cols,
      patternConfig.double_rows,
    );
  }

  if (patternConfig.mirror_horizontal) {
    base = mirrorHorizontal(base);
  }
  if (patternConfig.mirror_vertical) {
    base = mirrorVertical(base);
  }

  // Use tile height if heightFromTile is enabled, otherwise use manual height
  const patternHeight = patternConfig.heightFromTile
    ? base.height
    : patternConfig.height;
  let pattern = createEmptyBitmap(patternWidth, patternHeight);

  tileBitmap(
    pattern,
    base,
    patternConfig.repeat_horizontal,
    patternConfig.repeat_vertical,
    patternConfig.alignment,
  );

  if (patternConfig.endNeedleSelection) {
    // makes the end needles always be selected
    for (let row = 0; row < pattern.height; row++) {
      pattern.data[row * pattern.width] = 1;
      pattern.data[row * pattern.width + pattern.width - 1] = 1;
    }
  }

  if (patternConfig.negative) {
    pattern = invertBitmap(pattern);
  }

  pattern = addPadding(
    pattern,
    patternConfig.marginLeft,
    patternConfig.marginRight,
  );

  return pattern;
}

function tileBitmap(
  bitmap: Bitmap,
  baseBitmap: Bitmap,
  repeatHorizontal: boolean = true,
  repeatVertical: boolean = true,
  alignment: "left" | "center" | "right" = "left",
) {
  // First update the palette by copying colors from base bitmap
  bitmap.palette = [...baseBitmap.palette];

  // Calculate offset based on alignment
  let xOffset = 0;
  if (alignment === "center") {
    xOffset = Math.floor((bitmap.width - baseBitmap.width) / 2);
  } else if (alignment === "right") {
    xOffset = bitmap.width - baseBitmap.width;
  }

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

function doubleBitmap(
  bitmap: Bitmap,
  doubleCols: boolean = false,
  doubleRows: boolean = false,
): Bitmap {
  // Calculate new dimensions
  const newWidth = doubleCols ? bitmap.width : bitmap.width * 2;
  const newHeight = doubleRows ? bitmap.height : bitmap.height * 2;

  // Create new bitmap with doubled dimensions
  const doubledBitmap: Bitmap = {
    width: doubleCols ? bitmap.width * 2 : bitmap.width,
    height: doubleRows ? bitmap.height * 2 : bitmap.height,
    data: new Array(newWidth * newHeight),
    palette: [...bitmap.palette],
  };

  // Copy and double the pixels
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const sourceIndex = x + y * bitmap.width;
      const value = bitmap.data[sourceIndex];

      if (doubleCols && doubleRows) {
        // Double both rows and columns
        const targetX = x * 2;
        const targetY = y * 2;
        doubledBitmap.data[targetX + targetY * doubledBitmap.width] = value;
        doubledBitmap.data[targetX + 1 + targetY * doubledBitmap.width] = value;
        doubledBitmap.data[targetX + (targetY + 1) * doubledBitmap.width] =
          value;
        doubledBitmap.data[targetX + 1 + (targetY + 1) * doubledBitmap.width] =
          value;
      } else if (doubleCols) {
        // Double only rows
        const targetX = x * 2;
        doubledBitmap.data[targetX + y * doubledBitmap.width] = value;
        doubledBitmap.data[targetX + 1 + y * doubledBitmap.width] = value;
      } else if (doubleRows) {
        // Double only columns
        const targetY = y * 2;
        doubledBitmap.data[x + targetY * doubledBitmap.width] = value;
        doubledBitmap.data[x + (targetY + 1) * doubledBitmap.width] = value;
      }
    }
  }

  return doubledBitmap;
}

function mirrorHorizontal(bitmap: Bitmap): Bitmap {
  // Create new bitmap with double width
  const mirroredBitmap: Bitmap = {
    width: bitmap.width * 2,
    height: bitmap.height,
    data: new Array(bitmap.width * 2 * bitmap.height),
    palette: [...bitmap.palette],
  };

  // Copy original pattern to left side and mirrored to right side
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const sourceIndex = x + y * bitmap.width;
      const value = bitmap.data[sourceIndex];

      // Copy to left side
      mirroredBitmap.data[x + y * mirroredBitmap.width] = value;

      // Mirror to right side
      const mirrorX = mirroredBitmap.width - 1 - x;
      mirroredBitmap.data[mirrorX + y * mirroredBitmap.width] = value;
    }
  }

  return mirroredBitmap;
}

function mirrorVertical(bitmap: Bitmap): Bitmap {
  // Create new bitmap with double height
  const mirroredBitmap: Bitmap = {
    width: bitmap.width,
    height: bitmap.height * 2,
    data: new Array(bitmap.width * bitmap.height * 2),
    palette: [...bitmap.palette],
  };

  // Copy original pattern to top side and mirrored to bottom side
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const sourceIndex = x + y * bitmap.width;
      const value = bitmap.data[sourceIndex];

      // Copy to top side
      mirroredBitmap.data[x + y * mirroredBitmap.width] = value;

      // Mirror to bottom side
      const mirrorY = mirroredBitmap.height - 1 - y;
      mirroredBitmap.data[x + mirrorY * mirroredBitmap.width] = value;
    }
  }

  return mirroredBitmap;
}

function addPadding(bitmap: Bitmap, left: number, right: number): Bitmap {
  const newWidth = bitmap.width + left + right;

  const paddedBitmap: Bitmap = {
    width: newWidth,
    height: bitmap.height,
    data: new Array(newWidth * bitmap.height).fill(0), // Initialize with 0s
    palette: [...bitmap.palette],
  };

  // Copy original pattern to new bitmap with padding
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const sourceIndex = x + y * bitmap.width;
      const value = bitmap.data[sourceIndex];

      // Copy to new position with padding
      const targetX = x + left;
      const targetY = y;
      paddedBitmap.data[targetX + targetY * paddedBitmap.width] = value;
    }
  }

  return paddedBitmap;
}

function invertBitmap(bitmap: Bitmap): Bitmap {
  const invertedBitmap: Bitmap = {
    width: bitmap.width,
    height: bitmap.height,
    data: new Array(bitmap.width * bitmap.height),
    palette: [...bitmap.palette],
  };

  // Invert each pixel value (0 becomes 1, 1 becomes 0)
  for (let i = 0; i < bitmap.data.length; i++) {
    invertedBitmap.data[i] = bitmap.data[i] === 0 ? 1 : 0;
  }

  return invertedBitmap;
}
