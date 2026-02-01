import { createSlice } from "@reduxjs/toolkit";
import { Bitmap, createEmptyBitmap } from "../common/bitmap";
import { FairisleRowColors } from "../common/color";

export type DesignState = {
  selectedPaletteIndex: number;
  selectedTool: "brush" | "flood" | "rect" | "line" | "shift";
  mousePos: [number, number] | null;
  fairisleMode: boolean;
  fairisleColors: FairisleRowColors[]; // One entry per base pattern row
  showFairisleColors: boolean; // Whether to display yarn colors or black/white
};

export const initialDesignState = {
  basePattern: {
    data: [
      0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1,
      1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
      1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1,
    ],
    width: 8,
    height: 8,
    palette: [
      [0, 0, 0],
      [255, 255, 255],
    ],
  } as Bitmap,
  designState: {
    selectedPaletteIndex: 0,
    selectedTool: "brush",
    mousePos: null,
    fairisleMode: false,
    fairisleColors: [],
    showFairisleColors: true,
  } as DesignState,
};

export type DesignSliceState = typeof initialDesignState;

function syncFairisleColorsForHeight(
  state: DesignSliceState,
  newHeight: number,
): FairisleRowColors[] {
  const currentColors = state.designState.fairisleColors;
  const newColors: FairisleRowColors[] = [];
  for (let i = 0; i < newHeight; i++) {
    if (i < currentColors.length) {
      newColors.push(currentColors[i]);
    } else {
      newColors.push({ yarn1: [255, 255, 255], yarn2: [0, 0, 0] });
    }
  }
  return newColors;
}

const designSlice = createSlice({
  name: "design",
  initialState: initialDesignState,
  reducers: {
    setBasePattern: (state, action: { payload: Bitmap }) => {
      state.basePattern = action.payload;
      if (state.designState.fairisleMode) {
        state.designState.fairisleColors = syncFairisleColorsForHeight(
          state,
          action.payload.height,
        );
      }
    },
    setTool: (state, action: { payload: string }) => {
      state.designState.selectedTool =
        action.payload as DesignState["selectedTool"];
    },
    drawChanges: (state, action: { payload: [number, number, number][] }) => {
      for (const [x, y, paletteIndex] of action.payload) {
        if (
          x < 0 ||
          y < 0 ||
          x >= state.basePattern.width ||
          y >= state.basePattern.height
        )
          continue;
        state.basePattern.data[x + y * state.basePattern.width] = paletteIndex;
      }
    },
    setMousePos: (state, action: { payload: [number, number] | null }) => {
      state.designState.mousePos = action.payload;
    },
    resizeBitmap: (
      state,
      action: { payload: { width: number; height: number } },
    ) => {
      const { width, height } = action.payload;
      const newWidth = Math.max(1, width);
      const newHeight = Math.max(1, height);

      const newBitmap = createEmptyBitmap(newWidth, newHeight, [0, 0, 0]);
      newBitmap.palette = state.basePattern.palette;
      const oldBitmap = state.basePattern;

      for (let y = 0; y < Math.min(oldBitmap.height, newHeight); y++) {
        for (let x = 0; x < Math.min(oldBitmap.width, newWidth); x++) {
          const oldIndex = x + y * oldBitmap.width;
          const newIndex = x + y * newWidth;
          newBitmap.data[newIndex] = oldBitmap.data[oldIndex];
        }
      }

      state.basePattern = newBitmap;

      if (state.designState.fairisleMode) {
        state.designState.fairisleColors = syncFairisleColorsForHeight(
          state,
          newHeight,
        );
      }
    },
    setPaletteIndex: (state, action: { payload: number }) => {
      state.designState.selectedPaletteIndex = action.payload;
    },
    setFairisleMode: (state, action: { payload: boolean }) => {
      state.designState.fairisleMode = action.payload;
      if (action.payload) {
        const height = state.basePattern.height;
        const currentColors = state.designState.fairisleColors;
        if (currentColors.length !== height) {
          state.designState.fairisleColors = syncFairisleColorsForHeight(
            state,
            height,
          );
        }
      }
    },
    setFairisleRowColor: (
      state,
      action: {
        payload: {
          row: number;
          yarn: "yarn1" | "yarn2";
          color: [number, number, number];
        };
      },
    ) => {
      const { row, yarn, color } = action.payload;
      if (row >= 0 && row < state.designState.fairisleColors.length) {
        state.designState.fairisleColors[row][yarn] = color;
      }
    },
    syncFairisleColors: (state) => {
      const height = state.basePattern.height;
      const currentColors = state.designState.fairisleColors;
      if (currentColors.length !== height) {
        state.designState.fairisleColors = syncFairisleColorsForHeight(
          state,
          height,
        );
      }
    },
    setShowFairisleColors: (state, action: { payload: boolean }) => {
      state.designState.showFairisleColors = action.payload;
    },
    swapFairisleYarns: (state) => {
      state.designState.fairisleColors = state.designState.fairisleColors.map(
        (row) => ({
          yarn1: row.yarn2,
          yarn2: row.yarn1,
        }),
      );
    },
  },
});

export const {
  setBasePattern,
  setTool,
  drawChanges,
  setMousePos,
  resizeBitmap,
  setPaletteIndex,
  setFairisleMode,
  setFairisleRowColor,
  syncFairisleColors,
  setShowFairisleColors,
  swapFairisleYarns,
} = designSlice.actions;

export default designSlice.reducer;
