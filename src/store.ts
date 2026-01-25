import { configureStore } from "@reduxjs/toolkit";
import reducer, { initialState, GlobalState } from "./slice";
import { writePatternRow, serial } from "./serial";
import { drawPreviewPattern, drawComputedPattern } from "./drawing";
import { selectComputedPattern, selectCurrentRow } from "./selectors";

// localStorage persistence
const STORAGE_KEY = "silver-reed-write-state";

function loadState(): Partial<GlobalState> | undefined {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return undefined;
    return JSON.parse(serialized);
  } catch (e) {
    console.error("Failed to load state from localStorage:", e);
    return undefined;
  }
}

function saveState(state: GlobalState) {
  try {
    // Exclude transient state that shouldn't persist
    const stateToPersist = {
      ...state,
      knittingState: {
        ...state.knittingState,
        patterning: false, // Always start disconnected
      },
      designState: {
        ...state.designState,
        mousePos: null, // Transient UI state
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
  } catch (e) {
    console.error("Failed to save state to localStorage:", e);
  }
}

// Load cached state and merge with initialState
const cachedState = loadState();
const preloadedState = cachedState
  ? { ...initialState, ...cachedState }
  : undefined;

// Helper to get fairisle colors if fairisle mode is enabled and colors should be shown
function getFairisleColors(state: GlobalState) {
  if (
    state.designState.fairisleMode &&
    state.designState.showFairisleColors &&
    state.designState.fairisleColors.length > 0
  ) {
    return state.designState.fairisleColors;
  }
  return null;
}

// Helper to redraw both canvases with current state
function redrawPatterns(state: GlobalState) {
  const fairisleColors = getFairisleColors(state);
  drawPreviewPattern(state.basePattern, fairisleColors);
  drawComputedPattern(
    selectComputedPattern(state),
    fairisleColors,
    state.patternConfig,
    state.basePattern.height
  );
}

const afterReducerMiddleware = (store) => (next) => async (action) => {
  // Run the reducer
  const result = next(action);

  // Get the new state
  const newState = store.getState();

  // After the reducer runs, do things based on the action type
  switch (action.type) {
    case "controller/setBasePattern":
      redrawPatterns(newState);
      break;
    case "controller/setPatternConfig":
      redrawPatterns(newState);
      break;
    case "controller/setMachineState":
      redrawPatterns(newState);
      break;
    case "controller/setKnittingState":
      redrawPatterns(newState);
      break;
    case "controller/advanceRow":
      if (newState.knittingState.patterning) {
        const rowData = selectCurrentRow(newState);
        await writePatternRow(rowData);
      }
      break;
    case "controller/setMode":
      setTimeout(() => {
        redrawPatterns(newState);
      }, 0);
      break;
    case "controller/drawChanges":
      redrawPatterns(newState);
      break;
    case "controller/resizeBitmap":
      redrawPatterns(newState);
      break;
    case "controller/setFairisleMode":
      redrawPatterns(newState);
      break;
    case "controller/setFairisleRowColor":
      redrawPatterns(newState);
      break;
    case "controller/syncFairisleColors":
      redrawPatterns(newState);
      break;
    case "controller/setShowFairisleColors":
      redrawPatterns(newState);
      break;
    case "controller/swapFairisleYarns":
      redrawPatterns(newState);
      break;
  }

  return result;
};

export const store = configureStore({
  reducer: reducer,
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(afterReducerMiddleware),
});

// Save state to localStorage on every change
store.subscribe(() => {
  saveState(store.getState());
});
