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
  color: RGBColor = [0, 0, 0],
  palette: Palette = [color]
) {
  return {
    width,
    height,
    data: Array(width * height).fill(0),
    palette: palette,
  };
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
    function onMove(currentPos: Position) {
      const changes = line(bitmap, pos, currentPos, paletteIndex);
      pos = currentPos;
      return changes;
    }

    return onMove;
  },
  flood(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos: Position) {
      return flood(bitmap, pos, paletteIndex);
    }

    return onMove;
  },
  rect(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos: Position) {
      return rect(bitmap, pos, currentPos, paletteIndex);
    }
    return onMove;
  },
  line(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos: Position) {
      return line(bitmap, pos, currentPos, paletteIndex);
    }
    return onMove;
  },
  shift(bitmap: Bitmap, pos: Position, paletteIndex: number) {
    function onMove(currentPos: Position) {
      return shift(bitmap, pos[0] - currentPos[0], pos[1] - currentPos[1]);
    }
    return onMove;
  },
};

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

      // Fixed black and white palette
      const palette: Palette = [
        [0, 0, 0], // Black
        [255, 255, 255], // White
      ];

      // Process each pixel and convert to black or white
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];

        // Skip fully transparent pixels
        if (a === 0) {
          data[i / 4] = 0; // Black for transparent pixels
          continue;
        }

        // Calculate grayscale value using luminance formula
        const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;

        // Threshold at 128 (halfway between 0 and 255)
        // 0 = black, 1 = white in our palette
        data[i / 4] = grayscale >= 128 ? 1 : 0;
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

export function bitmapToPNGDataURL(bitmap: Bitmap): string {
  // Create a canvas element
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Create ImageData from bitmap
  const imageData = ctx.createImageData(bitmap.width, bitmap.height);

  // Fill imageData with bitmap data
  for (let i = 0; i < bitmap.data.length; i++) {
    const paletteIndex = bitmap.data[i];
    const color = bitmap.palette[paletteIndex];
    const offset = i * 4;

    imageData.data[offset] = color[0]; // R
    imageData.data[offset + 1] = color[1]; // G
    imageData.data[offset + 2] = color[2]; // B
    imageData.data[offset + 3] = 255; // A
  }

  // Put the image data on the canvas
  ctx.putImageData(imageData, 0, 0);

  // Convert to data URL
  return canvas.toDataURL("image/png");
}
