import { configureStore } from "@reduxjs/toolkit";
import reducer from "./slice";
import { writePatternRow } from "./serial";
import { drawUploadedPattern, drawComputedPattern } from "./drawing";
import { selectComputedPattern, selectCurrentRow } from "./selectors";

const afterReducerMiddleware = (store) => (next) => async (action) => {
  // Run the reducer
  const result = next(action);

  // Get the new state
  const newState = store.getState();

  // After the reducer runs, do things based on the action type
  switch (action.type) {
    case "controller/setBasePattern":
      drawUploadedPattern(newState.basePattern);
      drawComputedPattern(
        selectComputedPattern(newState),
        newState.knittingState
      );
      break;
    case "controller/setPatternConfig":
      drawComputedPattern(
        selectComputedPattern(newState),
        newState.knittingState
      );
      break;
    case "controller/setMachineState":
      drawComputedPattern(
        selectComputedPattern(newState),
        newState.knittingState
      );
      break;
    case "controller/setKnittingState":
      if (newState.knittingState.patterning) {
        await writePatternRow(selectCurrentRow(newState));
      }
      drawComputedPattern(
        selectComputedPattern(newState),
        newState.knittingState
      );
      break;
  }

  return result;
};

export const store = configureStore({
  reducer: reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(afterReducerMiddleware),
});

