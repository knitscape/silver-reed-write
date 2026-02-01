import { createSlice } from "@reduxjs/toolkit";

export const initialAppState = {
  mode: "design" as "design" | "knit",
};

export type AppState = typeof initialAppState;

const appSlice = createSlice({
  name: "app",
  initialState: initialAppState,
  reducers: {
    setMode: (state, action: { payload: "design" | "knit" }) => {
      state.mode = action.payload;
    },
  },
});

export const { setMode } = appSlice.actions;
export default appSlice.reducer;
