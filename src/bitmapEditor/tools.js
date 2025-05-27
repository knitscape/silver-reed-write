export function createEmptyBitmap(width, height, color = 0) {
  return {
    width,
    height,
    data: Array(width * height).fill(color),
  };
}

export function paletteIndexAt(bitmap, [x, y]) {
  if (x > bitmap.width - 1 || x < 0 || y > bitmap.height - 1 || y < 0) {
    return -1;
  }
  return bitmap.data.at(x + y * bitmap.width);
}

function brush(bitmap, [x, y], paletteIndex) {
  const indexToFill = paletteIndexAt(bitmap, [x, y]);
  if (indexToFill === paletteIndex) return [];

  let changes = [[x, y, paletteIndex]];
  return changes;
}

function flood(bitmap, [x, y], paletteIndex) {
  const indexToFill = paletteIndexAt(bitmap, [x, y]);
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

function rect(bitmap, [x0, y0], [x1, y1], paletteIndex) {
  let xStart = Math.min(x0, x1);
  let yStart = Math.min(y0, y1);
  let xEnd = Math.max(x0, x1);
  let yEnd = Math.max(y0, y1);
  let changes = [];

  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      changes.push([x, y, paletteIndex]);
    }
  }
  return changes;
}

function line(bitmap, [x0, y0], [x1, y1], paletteIndex) {
  const changes = [];
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

function shift(bitmap, dx, dy) {
  let changes = [];

  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      changes.push([
        (x - (dx % bitmap.width) + bitmap.width) % bitmap.width,
        (y - (dy % bitmap.height) + bitmap.height) % bitmap.height,
        paletteIndexAt(bitmap, [x, y]),
      ]);
    }
  }

  return changes;
}

export const editingTools = {
  brush(bitmap, pos, paletteIndex) {
    function onMove(currentPos) {
      const changes = line(bitmap, pos, currentPos, paletteIndex);
      pos = currentPos;
      return changes;
    }

    return onMove;
  },
  flood(bitmap, pos, paletteIndex) {
    function onMove(currentPos) {
      return flood(bitmap, pos, paletteIndex);
    }

    return onMove;
  },
  rect(bitmap, pos, paletteIndex) {
    function onMove(currentPos) {
      return rect(bitmap, pos, currentPos, paletteIndex);
    }
    return onMove;
  },
  line(bitmap, pos, paletteIndex) {
    function onMove(currentPos) {
      return line(bitmap, pos, currentPos, paletteIndex);
    }
    return onMove;
  },
  shift(bitmap, pos, paletteIndex) {
    function onMove(currentPos) {
      return shift(bitmap, pos[0] - currentPos[0], pos[1] - currentPos[1]);
    }
    return onMove;
  },
  pan(bitmap, pos, paletteIndex) {
    let startX = pos[0];
    let startY = pos[1];

    function onMove(currentPos) {
      return [];
    }

    return onMove;
  },
};
