import { createSelector } from "@reduxjs/toolkit";
import { GlobalState } from "./slice";
import { computePattern } from "./pattern";
import { getRow } from "./bitmap";

// Base selectors
const selectBasePattern = (state: GlobalState) => state.basePattern;
const selectPatternConfig = (state: GlobalState) => state.patternConfig;
const selectMachineState = (state: GlobalState) => state.machineState;
const selectKnittingState = (state: GlobalState) => state.knittingState;

// Derived selector for computed pattern
export const selectComputedPattern = createSelector(
  [selectBasePattern, selectPatternConfig, selectMachineState],
  (basePattern, patternConfig, machineState) => {
    return computePattern(basePattern, patternConfig, machineState);
  }
);

// Derived selector for current row
export const selectCurrentRow = createSelector(
  [selectComputedPattern, selectKnittingState],
  (computedPattern, knittingState) => {
    if (!computedPattern) return [];

    const row = getRow(computedPattern, knittingState.currentRowNumber);
    return knittingState.carriageSide === "right" ? row.reverse() : row;
  }
);
