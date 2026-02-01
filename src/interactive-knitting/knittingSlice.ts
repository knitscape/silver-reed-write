import { createSlice } from "@reduxjs/toolkit";

export type PatternConfig = {
  double_cols: boolean;
  double_rows: boolean;
  negative: boolean;
  mirror_vertical: boolean;
  mirror_horizontal: boolean;
  repeat_horizontal: boolean;
  repeat_vertical: boolean;
  alignment: "left" | "center" | "right";
  endNeedleSelection: boolean; // knit contrast yarn on the end needles
  marginLeft: number;
  marginRight: number;
  height: number;
  heightFromTile: boolean; // If true, use the base tile height (after doubling/mirroring)
};

export type KnittingState = {
  pointCams: [number, number];
  carriageSide: "left" | "right";
  patterning: boolean; // If interactive patterning is active
  currentRowNumber: number; // Current row number in the pattern
  totalRows: number; // Total row counter
};

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
