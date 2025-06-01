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

export function tileBitmap(
  bitmap: Bitmap,
  baseBitmap: Bitmap,
  center: boolean = false
) {
  // First update the palette by copying colors from base bitmap
  bitmap.palette = [...baseBitmap.palette];

  // Calculate offset for centering
  const xOffset = center
    ? Math.floor((bitmap.width - baseBitmap.width) / 2)
    : 0;

  console.log(xOffset);

  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      // Get corresponding position in base bitmap by wrapping coordinates
      // Add offset before modulo to shift the pattern
      const baseX =
        (((x - xOffset) % baseBitmap.width) + baseBitmap.width) %
        baseBitmap.width;
      const baseY = y % baseBitmap.height;

      // Get color index from base bitmap
      const baseIndex = paletteIndexAt(baseBitmap, [baseX, baseY]);
      if (baseIndex === -1) continue;

      // Modify bitmap directly
      bitmap.data[x + y * bitmap.width] = baseIndex;
    }
  }
}

export function stampBitmap(
  targetBitmap: Bitmap,
  stampBitmap: Bitmap,
  [x, y]: Position
) {
  // First update the palette by copying any new colors from stamp bitmap
  const paletteMap = new Map<number, number>();
  for (let i = 0; i < stampBitmap.palette.length; i++) {
    const color = stampBitmap.palette[i];
    const existingIndex = targetBitmap.palette.findIndex(
      (c) => c[0] === color[0] && c[1] === color[1] && c[2] === color[2]
    );
    if (existingIndex === -1) {
      paletteMap.set(i, targetBitmap.palette.length);
      targetBitmap.palette.push(color);
    } else {
      paletteMap.set(i, existingIndex);
    }
  }

  // Copy pixels from stamp to target bitmap
  for (let sy = 0; sy < stampBitmap.height; sy++) {
    for (let sx = 0; sx < stampBitmap.width; sx++) {
      const targetX = x + sx;
      const targetY = y + sy;

      // Skip if outside target bounds
      if (
        targetX < 0 ||
        targetX >= targetBitmap.width ||
        targetY < 0 ||
        targetY >= targetBitmap.height
      ) {
        continue;
      }

      const stampIndex = paletteIndexAt(stampBitmap, [sx, sy]);
      if (stampIndex === -1) continue;

      const targetIndex = paletteMap.get(stampIndex);
      if (targetIndex === undefined) continue;

      // Modify bitmap directly
      targetBitmap.data[targetX + targetY * targetBitmap.width] = targetIndex;
    }
  }
}

export function paletteIndexAt(bitmap: Bitmap, [x, y]: Position) {
  if (x > bitmap.width - 1 || x < 0 || y > bitmap.height - 1 || y < 0) {
    return -1;
  }
  const index = bitmap.data.at(x + y * bitmap.width);
  if (index === undefined) {
    return -1;
  }
  return index;
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

export function fitCanvasToParent(
  canvas: HTMLCanvasElement,
  aspectRatio: number
) {
  const parent = canvas.parentElement;
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

const SUPPORTED_FORMATS = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export async function createBitmapFromImage(file: File): Promise<Bitmap> {
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    throw new Error(
      `Unsupported image format: ${
        file.type
      }. Supported formats are: ${SUPPORTED_FORMATS.join(", ")}`
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = new Uint8Array(img.width * img.height);
      const palette: Palette = [];
      const colorMap = new Map<string, number>();

      // Process each pixel and build the palette
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];

        // Skip fully transparent pixels
        if (a === 0) {
          data[i / 4] = 0;
          continue;
        }

        const colorKey = `${r},${g},${b}`;

        if (!colorMap.has(colorKey)) {
          colorMap.set(colorKey, palette.length);
          palette.push([r, g, b]);
        }

        data[i / 4] = colorMap.get(colorKey)!;
      }

      // Ensure we have at least one color in the palette
      if (palette.length === 0) {
        palette.push([0, 0, 0]);
      }

      resolve({
        width: img.width,
        height: img.height,
        data: Array.from(data),
        palette,
      });
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}
