export type RGBColor = [number, number, number];
export type Palette = RGBColor[];
export type Position = [number, number];

export interface Bitmap {
  width: number;
  height: number;
  data: number[];
  palette: Palette;
}

export function getRow(bitmap: Bitmap, row: number, bottomUp: boolean = true) {
  return bitmap.data.slice(row * bitmap.width, (row + 1) * bitmap.width);
}

export function createEmptyBitmap(
  width: number,
  height: number,
  color: RGBColor = [0, 0, 0]
) {
  return {
    width,
    height,
    data: Array(width * height).fill(0),
    palette: [color],
  };
}

export function paletteIndexAt(bitmap: Bitmap, [x, y]: Position) {
  if (x > bitmap.width - 1 || x < 0 || y > bitmap.height - 1 || y < 0) {
    return -1;
  }
  return bitmap.data.at(x + y * bitmap.width);
}

function brush(bitmap: Bitmap, [x, y]: Position, paletteIndex: number) {
  if (paletteIndex < 0 || paletteIndex >= bitmap.palette.length) {
    console.error("Invalid palette index");
    return [];
  }

  const indexToFill = paletteIndexAt(bitmap, [x, y]);
  if (indexToFill === -1) {
    console.error("Index out of bounds");
    return [];
  }

  if (indexToFill === paletteIndex) return []; // already filled

  let changes = [[x, y, paletteIndex]];

  return changes;
}

function flood(bitmap: Bitmap, [x, y]: Position, paletteIndex: number) {
  if (paletteIndex < 0 || paletteIndex >= bitmap.palette.length) {
    console.error("Invalid palette index");
    return [];
  }

  const indexToFill = paletteIndexAt(bitmap, [x, y]);
  if (indexToFill === -1) {
    console.error("Index out of bounds");
    return [];
  }

  if (indexToFill === paletteIndex) return [];

  const around = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
  ];
  const changes = [[x, y, paletteIndex]];
  for (let done = 0; done < changes.length; done++) {
    for (const { dx, dy } of around) {
      const x = changes[done][0] + dx;
      const y = changes[done][1] + dy;
      if (
        x >= 0 &&
        x < bitmap.width &&
        y >= 0 &&
        y < bitmap.height &&
        paletteIndexAt(bitmap, [x, y]) == indexToFill &&
        !changes.some((p) => p[0] == x && p[1] == y)
      ) {
        changes.push([x, y, paletteIndex]);
      }
    }
  }
  return changes;
}

function rect(
  bitmap: Bitmap,
  [x0, y0]: Position,
  [x1, y1]: Position,
  paletteIndex: number
) {
  let xStart = Math.min(x0, x1);
  let yStart = Math.min(y0, y1);
  let xEnd = Math.max(x0, x1);
  let yEnd = Math.max(y0, y1);
  const changes: [number, number, number][] = [];

  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      changes.push([x, y, paletteIndex]);
    }
  }
  return changes;
}

function line(
  bitmap: Bitmap,
  [x0, y0]: Position,
  [x1, y1]: Position,
  paletteIndex: number
) {
  const changes: [number, number, number][] = [];
  if (Math.abs(x0 - x1) > Math.abs(y0 - y1)) {
    if (x0 > x1)
      [[x0, y0], [x1, y1]] = [
        [x1, y1],
        [x0, y0],
      ];
    const slope = (y1 - y0) / (x1 - x0);
    for (let [x, y] = [x0, y0]; x <= x1; x++) {
      changes.push([x, Math.round(y), paletteIndex]);
      y += slope;
    }
  } else {
    if (y0 > y1)
      [[x0, y0], [x1, y1]] = [
        [x1, y1],
        [x0, y0],
      ];
    const slope = (x1 - x0) / (y1 - y0);
    for (let [x, y] = [x0, y0]; y <= y1; y++) {
      changes.push([Math.round(x), y, paletteIndex]);
      x += slope;
    }
  }
  return changes;
}

function shift(bitmap: Bitmap, dx: number, dy: number) {
  let changes: [number, number, number][] = [];

  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      changes.push([
        (x - (dx % bitmap.width) + bitmap.width) % bitmap.width,
        (y - (dy % bitmap.height) + bitmap.height) % bitmap.height,
        paletteIndexAt(bitmap, [x, y]) ?? 0,
      ]);
    }
  }

  return changes;
}

export const bitmapEditingTools = {
  brush(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos) {
      const changes = line(bitmap, pos, currentPos, paletteIndex);
      pos = currentPos;
      return changes;
    }

    return onMove;
  },
  flood(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos) {
      return flood(bitmap, pos, paletteIndex);
    }

    return onMove;
  },
  rect(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos) {
      return rect(bitmap, pos, currentPos, paletteIndex);
    }
    return onMove;
  },
  line(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos) {
      return line(bitmap, pos, currentPos, paletteIndex);
    }
    return onMove;
  },
  shift(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos) {
      return shift(bitmap, pos[0] - currentPos[0], pos[1] - currentPos[1]);
    }
    return onMove;
  },
};

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
