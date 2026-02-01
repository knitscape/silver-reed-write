import { createSlice } from "@reduxjs/toolkit";
import { PatternConfig, KnittingState } from "../types";

export const initialKnittingState = {
  patternConfig: {
    double_cols: false,
    double_rows: false,
    negative: false,
    mirror_vertical: false,
    mirror_horizontal: false,
    alignment: "center",
    repeat_horizontal: true,
    repeat_vertical: true,
    endNeedleSelection: false,
    marginLeft: 0,
    marginRight: 0,
    height: 20,
    heightFromTile: true,
  } as PatternConfig,
  knittingState: {
    pointCams: [-20, 20],
    carriageSide: "left",
    patterning: false,
    currentRowNumber: 0,
    totalRows: 0,
  } as KnittingState,
};

export type KnittingSliceState = typeof initialKnittingState;

const knittingSlice = createSlice({
  name: "knitting",
  initialState: initialKnittingState,
  reducers: {
    setPatternConfig: (state, action: { payload: PatternConfig }) => {
      state.patternConfig = action.payload;
    },
    setKnittingState: (state, action: { payload: KnittingState }) => {
      state.knittingState = action.payload;
    },
    advanceRow: (state, action: { payload: number }) => {
      const computedHeight = action.payload;
      state.knittingState.currentRowNumber += 1;
      if (state.knittingState.currentRowNumber >= computedHeight) {
        state.knittingState.currentRowNumber = 0;
      }
    },
  },
});

export const { setPatternConfig, setKnittingState, advanceRow } =
  knittingSlice.actions;

export default knittingSlice.reducer;
