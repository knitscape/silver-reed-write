import { createSlice } from "@reduxjs/toolkit";
import { Bitmap } from "./bitmap";
import {
  PatternConfig,
  MachineState,
  KnittingState,
  DesignState,
  FairisleConfig,
} from "./types";

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
    pointCams: [-10, 10],
    carriageSide: "left",
    yarnConfig: {
      feeder_1: { color: [255, 0, 0] },
      feeder_2: { color: [0, 255, 0] },
    } as FairisleConfig,
  } as MachineState,
  basePattern: {
    data: [0,1,1,0],
    width: 2,
    height: 2,
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
      state.knittingState.currentRowNumber = state.knittingState.currentRowNumber + 1;
      if (state.knittingState.currentRowNumber >= state.basePattern.height) {
        state.knittingState.currentRowNumber = 0;
      }
    }
  },
});

export const {
  setBasePattern,
  setPatternConfig,
  setMachineState,
  setKnittingState,
  advanceRow,
} = slice.actions;

export default slice.reducer;
