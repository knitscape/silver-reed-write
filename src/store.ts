import { configureStore } from "@reduxjs/toolkit";
import rootReducer, { GlobalState } from "./slice";
import { writePatternRow } from "./interactive-knitting/serial";
import { drawDesignPattern } from "./pattern-design/drawDesign";
import { drawComputedPattern } from "./interactive-knitting/drawComputed";
import { selectComputedPattern, selectCurrentRow } from "./selectors";

// localStorage persistence
const STORAGE_KEY = "silver-reed-write-state";

function loadState(): GlobalState | undefined {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return undefined;
    return JSON.parse(serialized) as GlobalState;
  } catch (e) {
    console.error("Failed to load state from localStorage:", e);
    return undefined;
  }
}

function saveState(state: GlobalState) {
  try {
    const stateToPersist = {
      ...state,
      knitting: {
        ...state.knitting,
        knittingState: {
          ...state.knitting.knittingState,
          patterning: false,
        },
      },
      design: {
        ...state.design,
        designState: {
          ...state.design.designState,
          mousePos: null,
        },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
  } catch (e) {
    console.error("Failed to save state to localStorage:", e);
  }
}

const preloadedState = loadState();

function getFairisleColors(state: GlobalState) {
  const d = state.design.designState;
  if (d.fairisleMode && d.showFairisleColors && d.fairisleColors.length > 0) {
    return d.fairisleColors;
  }
  return null;
}

function drawDesign(state: GlobalState) {
  const fairisleColors = getFairisleColors(state);
  drawDesignPattern(state.design.basePattern, fairisleColors);
}

function drawInteractivePattern(state: GlobalState) {
  const fairisleColors = getFairisleColors(state);
  drawComputedPattern(
    selectComputedPattern(state),
    fairisleColors,
    state.knitting.patternConfig,
    state.design.basePattern.height,
  );
}

const afterReducerMiddleware = (store) => (next) => async (action) => {
  const result = next(action);
  const newState = store.getState();

  switch (action.type) {
    case "app/setMode":
      if (newState.app.mode === "design") {
        setTimeout(() => drawDesign(newState), 0);
      } else {
        setTimeout(() => drawInteractivePattern(newState), 0);
      }
      break;
    case "knitting/setPatternConfig":
    case "knitting/setKnittingState":
      drawInteractivePattern(newState);
      break;
    case "knitting/advanceRow":
      if (newState.knitting.knittingState.patterning) {
        const rowData = selectCurrentRow(newState);
        await writePatternRow(rowData);
      }
      break;
    case "design/setBasePattern":
    case "design/drawChanges":
    case "design/resizeBitmap":
    case "design/setFairisleMode":
    case "design/setFairisleRowColor":
    case "design/syncFairisleColors":
    case "design/setShowFairisleColors":
    case "design/swapFairisleYarns":
      drawDesign(newState);
      break;
  }

  return result;
};

export const store = configureStore({
  reducer: rootReducer,
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(afterReducerMiddleware),
});

store.subscribe(() => {
  saveState(store.getState());
});
