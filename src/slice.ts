import { combineReducers } from "@reduxjs/toolkit";
import appReducer, { initialAppState } from "./appSlice";
import designReducer, {
  initialDesignState,
} from "./pattern-design/designSlice";
import knittingReducer, {
  initialKnittingState,
} from "./interactive-knitting/knittingSlice";

export const rootReducer = combineReducers({
  app: appReducer,
  design: designReducer,
  knitting: knittingReducer,
});

export type GlobalState = ReturnType<typeof rootReducer>;

export const initialState: GlobalState = {
  app: initialAppState,
  design: initialDesignState,
  knitting: initialKnittingState,
};

export default rootReducer;
