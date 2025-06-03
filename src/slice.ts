import { createSlice } from "@reduxjs/toolkit";
import { Bitmap, createEmptyBitmap } from "./bitmap";
import {
  PatternConfig,
  MachineState,
  KnittingState,
  DesignState,
  FairisleConfig,
} from "./types";
import { selectComputedPattern } from "./selectors";

export const initialState = {
  patternConfig: {
    double_cols: false,
    double_rows: false,
    negative: false,
    mirror_vertical: false,
    mirror_horizontal: false,
    centerX: true,
    repeat_horizontal: true,
    repeat_vertical: false,
    endNeedleSelection: false,
    marginLeft: 0,
    marginRight: 0,
    height: 20,
    wrap: true,
  } as PatternConfig,
  machineState: {
    pointCams: [-20, 20],
    carriageSide: "left",
    yarnConfig: {
      feeder_1: { color: [255, 0, 0] },
      feeder_2: { color: [0, 255, 0] },
    } as FairisleConfig,
  } as MachineState,
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
  knittingState: {
    patterning: false,
    currentRowNumber: 0,
    carriageSide: "left",
  } as KnittingState,
  designState: {
    selectedPaletteIndex: 0,
    selectedTool: "brush",
    mousePos: null,
  } as DesignState,
  mode: "design" as "upload" | "design" | "library",
};

export type GlobalState = typeof initialState;

const slice = createSlice({
  name: "controller",
  initialState: initialState,
  reducers: {
    setBasePattern: (state, action) => {
      state.basePattern = action.payload;
    },
    setPatternConfig: (state, action) => {
      state.patternConfig = action.payload;
    },
    setMachineState: (state, action) => {
      state.machineState = action.payload;
    },
    setKnittingState: (state, action) => {
      state.knittingState = action.payload;
    },
    advanceRow: (state) => {
      state.knittingState.currentRowNumber =
        state.knittingState.currentRowNumber + 1;
      if (
        state.knittingState.currentRowNumber >=
        selectComputedPattern(state).height
      ) {
        state.knittingState.currentRowNumber = 0;
      }
    },
    setMode: (state, action) => {
      state.mode = action.payload;
    },
    setTool: (state, action) => {
      state.designState.selectedTool = action.payload;
    },
    drawChanges(state, action) {
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
    setMousePos(state, action) {
      state.designState.mousePos = action.payload;
    },
    resizeBitmap(state, action) {
      const { width, height } = action.payload;

      const newWidth = Math.max(1, width);
      const newHeight = Math.max(1, height);

      // Create a new bitmap with the requested dimensions
      const newBitmap = createEmptyBitmap(newWidth, newHeight, [0, 0, 0]);
      newBitmap.palette = state.basePattern.palette;
      const oldBitmap = state.basePattern;

      // Copy existing data, preserving as much as possible
      for (let y = 0; y < Math.min(oldBitmap.height, newHeight); y++) {
        for (let x = 0; x < Math.min(oldBitmap.width, newWidth); x++) {
          const oldIndex = x + y * oldBitmap.width;
          const newIndex = x + y * newWidth;
          newBitmap.data[newIndex] = oldBitmap.data[oldIndex];
        }
      }

      state.basePattern = newBitmap;
    },
    setPaletteIndex(state, action) {
      state.designState.selectedPaletteIndex = action.payload;
    },
  },
});

export const {
  setBasePattern,
  setPatternConfig,
  setMachineState,
  setKnittingState,
  advanceRow,
  setMode,
  setTool,
  drawChanges,
  setMousePos,
  resizeBitmap,
  setPaletteIndex,
} = slice.actions;

export default slice.reducer;
