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
  },
);

// Derived selector for current row
export const selectCurrentRow = createSelector(
  [selectComputedPattern, selectKnittingState],
  (computedPattern, knittingState) => {
    if (!computedPattern) return [];

    // Invert row number: currentRowNumber goes 0->1->2... but we need to send rows in opposite order
    // Convert: actualRow = height - 1 - currentRowNumber
    // This makes: currentRowNumber=0 -> actualRow=height-1 (sends last row first)
    //             currentRowNumber=height-1 -> actualRow=0 (sends first row last)
    const actualRowNumber =
      computedPattern.height - 1 - knittingState.currentRowNumber;
    const row = getRow(computedPattern, actualRowNumber);

    // Always return a new array copy to avoid mutation issues
    const rowCopy = [...row];

    // Reverse the row if the carriage will be moving to the right on the next pass
    // DIRECTION pin: Low = To right, High = To left
    // When carriage is on the left, it will move right next, so reverse the data
    // When carriage is on the right, it will move left next, so don't reverse
    const willMoveRight = knittingState.carriageSide === "left";

    let result: number[];
    if (willMoveRight) {
      // Create a reversed copy
      result = [...rowCopy].reverse();
    } else {
      result = rowCopy;
    }

    return result;
  },
);
