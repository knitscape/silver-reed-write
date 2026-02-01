import { Bitmap } from "./common/bitmap";
import { PatternConfig } from "./interactive-knitting/knittingSlice";
import { FairisleRowColors } from "./common/color";

export function drawBitmapToCanvas(
  canvasElement: HTMLCanvasElement,
  bitmap: Bitmap,
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

// Draw bitmap with fairisle colors - each row uses its own yarn colors
export function drawBitmapWithFairisleColors(
  canvasElement: HTMLCanvasElement,
  bitmap: Bitmap,
  fairisleColors: FairisleRowColors[],
  getBaseRow: (bitmapRow: number) => number, // Function to map bitmap row to base pattern row
) {
  canvasElement.width = bitmap.width;
  canvasElement.height = bitmap.height;

  const ctx = canvasElement.getContext("2d");
  if (!ctx) {
    console.error("Failed to get canvas context");
    return;
  }

  const imageData = ctx.createImageData(bitmap.width, bitmap.height);
  for (let y = 0; y < bitmap.height; y++) {
    const baseRow = getBaseRow(y);
    const rowColors = fairisleColors[baseRow] || {
      yarn1: [255, 255, 255],
      yarn2: [0, 0, 0],
    };

    for (let x = 0; x < bitmap.width; x++) {
      const i = y * bitmap.width + x;
      const paletteIndex = bitmap.data[i];
      // palette index 0 = black = yarn2, palette index 1 = white = yarn1
      const color = paletteIndex === 1 ? rowColors.yarn1 : rowColors.yarn2;
      imageData.data[i * 4] = color[0];
      imageData.data[i * 4 + 1] = color[1];
      imageData.data[i * 4 + 2] = color[2];
      imageData.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// Create a function to map computed pattern rows back to base pattern rows
export function createRowMapper(
  basePatternHeight: number,
  patternConfig: PatternConfig,
): (computedRow: number) => number {
  // Calculate the tile height after transformations
  let tileHeight = basePatternHeight;
  if (patternConfig.double_rows) {
    tileHeight *= 2;
  }
  if (patternConfig.mirror_vertical) {
    tileHeight *= 2;
  }

  return (computedRow: number): number => {
    // First, handle vertical repeat - get the row within a single tile
    let rowInTile = computedRow % tileHeight;

    // Then reverse the transformations to get back to base row
    // Handle mirroring (if mirrored, second half maps back)
    if (patternConfig.mirror_vertical) {
      const halfTile = tileHeight / 2;
      if (rowInTile >= halfTile) {
        rowInTile = tileHeight - 1 - rowInTile;
      }
    }

    // Handle doubling (if doubled, divide by 2)
    if (patternConfig.double_rows) {
      rowInTile = Math.floor(rowInTile / 2);
    }

    // Ensure we're within bounds
    return rowInTile % basePatternHeight;
  };
}

export function fitCanvasToParent(
  canvas: HTMLCanvasElement,
  aspectRatio: number,
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
