import { createSlice } from "@reduxjs/toolkit";
import { Bitmap } from "./bitmap";
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
    repeat_vertical: true,
    endNeedleSelection: false,
    marginLeft: 0,
    marginRight: 0,
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
      // 8x8 zigzag pattern repeated 3 times vertically
      0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1,
      1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
      1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1,
      // Second repeat
      0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1,
      1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
      1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1,
      // Third repeat
      0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1,
      1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
      1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0,
      1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0,
      0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0,
      1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0,
      0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1,
    ],
    width: 8,
    height: 40,
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
    selectedColor: [0, 0, 0],
    selectedTool: "brush",
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
      console.log("setKnittingState", action.payload);
      state.knittingState = action.payload;
    },
    advanceRow: (state, action) => {
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
      console.log("setTool", action.payload);
      state.designState.selectedTool = action.payload;
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
} = slice.actions;

export default slice.reducer;
