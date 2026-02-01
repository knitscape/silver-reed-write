import { createSelector } from "@reduxjs/toolkit";
import { GlobalState } from "./slice";
import { computePattern } from "./pattern";
import { getRow } from "./common/bitmap";

// Base selectors (new state shape: state.design, state.knitting, state.app)
const selectBasePattern = (state: GlobalState) => state.design.basePattern;
const selectPatternConfig = (state: GlobalState) =>
  state.knitting.patternConfig;
const selectKnittingState = (state: GlobalState) =>
  state.knitting.knittingState;

// Derived selector for computed pattern
export const selectComputedPattern = createSelector(
  [selectBasePattern, selectPatternConfig, selectKnittingState],
  (basePattern, patternConfig, knittingState) => {
    return computePattern(basePattern, patternConfig, knittingState);
  },
);

// Derived selector for current row
export const selectCurrentRow = createSelector(
  [selectComputedPattern, selectKnittingState],
  (computedPattern, knittingState) => {
    if (!computedPattern) return [];

    const actualRowNumber =
      computedPattern.height - 1 - knittingState.currentRowNumber;
    const row = getRow(computedPattern, actualRowNumber);
    const rowCopy = [...row];

    const willMoveRight = knittingState.carriageSide === "left";

    if (willMoveRight) {
      return [...rowCopy].reverse();
    }
    return rowCopy;
  },
);
