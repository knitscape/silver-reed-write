import { configureStore } from "@reduxjs/toolkit";
import reducer from "./slice";
import { writePatternRow } from "./serial";
import { drawPreviewPattern, drawComputedPattern } from "./drawing";
import { selectComputedPattern, selectCurrentRow } from "./selectors";

const afterReducerMiddleware = (store) => (next) => async (action) => {
  // Run the reducer
  const result = next(action);

  // Get the new state
  const newState = store.getState();

  // After the reducer runs, do things based on the action type
  switch (action.type) {
    case "controller/setBasePattern":
      drawPreviewPattern(newState.basePattern);
      drawComputedPattern(selectComputedPattern(newState));
      break;
    case "controller/setPatternConfig":
      drawComputedPattern(selectComputedPattern(newState));
      break;
    case "controller/setMachineState":
      drawComputedPattern(selectComputedPattern(newState));
      break;
    case "controller/setKnittingState":
      drawComputedPattern(selectComputedPattern(newState));
      break;
    case "controller/advanceRow":
      if (newState.knittingState.patterning) {
        await writePatternRow(selectCurrentRow(newState));
      }
      break;
    case "controller/setMode":
      setTimeout(() => {
        drawPreviewPattern(newState.basePattern);
      }, 0);
      drawComputedPattern(selectComputedPattern(newState));
      break;

    case "controller/drawChanges":
      drawPreviewPattern(newState.basePattern);
      drawComputedPattern(selectComputedPattern(newState));

      break;
    case "controller/resizeBitmap":
      drawPreviewPattern(newState.basePattern);
      drawComputedPattern(selectComputedPattern(newState));
      break;
  }

  return result;
};

export const store = configureStore({
  reducer: reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(afterReducerMiddleware),
});
