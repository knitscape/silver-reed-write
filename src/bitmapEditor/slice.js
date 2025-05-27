import { createSlice } from "@reduxjs/toolkit";
import { createEmptyBitmap } from "./tools";
import { getRandomColor, shuffle } from "./utils";

const initialState = {
  tool: "brush",
  palette: [
    [211, 27, 27],
    [51, 116, 169],
    [214, 157, 33],
    [86, 194, 70],
  ],
  paletteIndex: 0,
  scale: 40,
  pan: { x: 0, y: 0 },
  bitmap: createEmptyBitmap(10, 10, 1),
  mousePos: null, // the cell the mouse is over
  settingsModalOpen: false, // New state to track modal visibility
};

const slice = createSlice({
  name: "bitmap",
  initialState: initialState,
  reducers: {
    setTool(state, action) {
      state.tool = action.payload;
    },
    setPalette(state, action) {
      state.palette = action.payload;
    },
    setPaletteIndex(state, action) {
      state.paletteIndex = action.payload;
    },
    drawChanges(state, action) {
      for (const [x, y, paletteIndex] of action.payload) {
        if (
          x < 0 ||
          y < 0 ||
          x >= state.bitmap.width ||
          y >= state.bitmap.height
        )
          continue;
        state.bitmap.data[x + y * state.bitmap.width] = paletteIndex;
      }
    },
    addRandomColor(state) {
      state.palette.push(getRandomColor());
    },
    shufflePalette(state) {
      state.palette = [...shuffle(state.palette)];
    },
    randomizePalette(state) {
      state.palette = Array.from(Array(state.palette.length), getRandomColor);
    },
    deleteColor(state, action) {
      state.palette = state.palette.filter(
        (color, index) => index !== action.payload
      );
    },
    editColor(state, action) {
      state.palette[action.payload.index] = action.payload.color;
    },
    setMousePos(state, action) {
      state.mousePos = action.payload;
    },
    resizeBitmap(state, action) {
      const { width, height } = action.payload;
      const newWidth = Math.max(1, width);
      const newHeight = Math.max(1, height);

      // Create a new bitmap with the requested dimensions
      const newBitmap = createEmptyBitmap(newWidth, newHeight, 0);

      // Copy existing data, preserving as much as possible
      for (let y = 0; y < Math.min(state.bitmap.height, newHeight); y++) {
        for (let x = 0; x < Math.min(state.bitmap.width, newWidth); x++) {
          const oldIndex = x + y * state.bitmap.width;
          const newIndex = x + y * newWidth;
          newBitmap.data[newIndex] = state.bitmap.data[oldIndex];
        }
      }

      state.bitmap = newBitmap;
    },
    toggleSettingsModal(state) {
      state.settingsModalOpen = !state.settingsModalOpen;
    },
    setPan(state, action) {
      state.pan = action.payload;
    },
  },
});

export const {
  setTool,
  setPalette,
  setPaletteIndex,
  drawChanges,
  addRandomColor,
  shufflePalette,
  randomizePalette,
  deleteColor,
  editColor,
  setMousePos,
  resizeBitmap,
  toggleSettingsModal,
  setPan,
} = slice.actions;

export default slice.reducer;
