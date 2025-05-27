import { html, svg, render } from "lit-html";
import { store } from "./store";
import {
  drawChanges,
  setPaletteIndex,
  addRandomColor,
  shufflePalette,
  randomizePalette,
  deleteColor,
  editColor,
  setMousePos,
  setTool,
  resizeBitmap,
  toggleSettingsModal,
  setPan,
} from "./slice";
import {
  rgbToHex,
  hexToRgb,
  isLeftClick,
  getPointerPositionInElement,
} from "./utils";
import { editingTools } from "./tools";

let onToolMove = null;

function dragTool(startCell, startEvent) {
  const state = store.getState();
  let lastCell = startCell;

  // Special handling for the pan tool
  if (state.tool === "pan") {
    // Starting position for the pan tool
    const startPanX = state.pan.x;
    const startPanY = state.pan.y;
    const startClientX = startEvent.clientX;
    const startClientY = startEvent.clientY;

    function handlePan(e) {
      // Calculate how far the mouse has moved since starting the drag
      const deltaX = e.clientX - startClientX;
      const deltaY = e.clientY - startClientY;

      // Update the pan (moving opposite to the drag direction for intuitive feel)
      store.dispatch(
        setPan({
          x: startPanX + deltaX,
          y: startPanY + deltaY,
        })
      );
    }

    return handlePan;
  }

  // Regular tools handling (brush, etc.)
  let tool = editingTools[state.tool];
  let onEnterCell = tool(state.bitmap, lastCell, state.paletteIndex);

  const changes = onEnterCell(lastCell);
  store.dispatch(drawChanges(changes));

  function pointerMove(currentCell) {
    if (currentCell[0] === lastCell[0] && currentCell[1] === lastCell[1])
      return;
    const changes = onEnterCell(currentCell);
    store.dispatch(drawChanges(changes));

    lastCell = currentCell;
  }

  return pointerMove;
}

function artboardPositionToCell(point) {
  const state = store.getState();
  return [Math.floor(point.x / state.scale), Math.floor(point.y / state.scale)];
}

function onArtboardDown(e) {
  if (!isLeftClick(e)) return;
  const canvas = document.getElementById("canvas");
  const point = getPointerPositionInElement(e, canvas);
  const cell = artboardPositionToCell(point);
  onToolMove = dragTool(cell, e);
}

function artboardPointerMove(e) {
  const canvas = document.getElementById("canvas");
  const point = getPointerPositionInElement(e, canvas);
  const cell = artboardPositionToCell(point);
  store.dispatch(setMousePos(cell));

  if (onToolMove) {
    // For pan tool, pass the entire event
    if (store.getState().tool === "pan") {
      onToolMove(e);
    } else {
      // For regular tools, just pass the cell
      onToolMove(cell);
    }
  }
}

function paletteEntry(index) {
  const state = store.getState();
  const isSelected = index == state.paletteIndex;

  return html`<div
    class="palette-entry ${isSelected ? "selected" : ""}"
    @click=${() => store.dispatch(setPaletteIndex(index))}>
    <div
      class="color-swatch"
      style="background-color: rgb(${state.palette[index][0]}, ${state.palette[
        index
      ][1]}, ${state.palette[index][2]})"></div>
    <input
      class="color-input"
      id="palette-entry-${index}"
      type="color"
      value="#${rgbToHex(state.palette[index])}"
      @input=${(e) =>
        store.dispatch(
          editColor({ index, color: hexToRgb(e.target.value) })
        )} />
    ${isSelected
      ? html`
          <div class="palette-actions">
            <label for="palette-entry-${index}" title="Edit Color">
              <i class="fa-solid fa-pen"></i>
            </label>
            <i
              @click=${(e) => {
                e.stopPropagation();
                store.dispatch(deleteColor(index));
              }}
              class="fa-solid fa-circle-xmark"
              title="Delete Color"></i>
          </div>
        `
      : ""}
  </div>`;
}

function view() {
  const state = store.getState();
  const mousePos = state.mousePos;
  const scale = state.scale;
  const pan = state.pan;

  const width = state.bitmap.width * scale;
  const height = state.bitmap.height * scale;

  return html` <div class="app">
    <div class="tool-button-container">
      ${Object.keys(editingTools).map(
        (toolName) =>
          html`<button
            class="tool-button ${state.tool === toolName ? "selected" : ""}"
            @click=${() => store.dispatch(setTool(toolName))}>
            ${toolName}
          </button>`
      )}

      <button
        class="tool-button settings-button"
        @click=${() => store.dispatch(toggleSettingsModal())}
        title="Settings">
        <i class="fa-solid fa-gear"></i>
      </button>
    </div>

    <div class="artboard-container">
      <div
        class="artboard ${state.tool === "pan" ? "pan-tool" : ""}"
        style="transform: translate(${pan.x}px, ${pan.y}px);">
        <canvas
          style="width: ${width}px; height: ${height}px;"
          id="canvas"
          @pointerdown=${onArtboardDown}
          @pointermove=${artboardPointerMove}
          @pointerleave=${() => store.dispatch(setMousePos(null))}></canvas>
        ${mousePos &&
        state.tool !== "pan" &&
        svg`<svg
          style="width: ${width}px; height: ${height}px;"
          xmlns="http://www.w3.org/2000/svg">
          <rect
            x="${mousePos[0] * scale}"
            y="0"
            width="${scale}"
            height="${height}"
            fill="rgba(255,255,255,0.1)" />
          <rect
            x="0"
            y="${mousePos[1] * scale}"
            width="${width}"
            height="${scale}"
            fill="rgba(255,255,255,0.1)" />
        </svg>`}
      </div>
    </div>

    <div class="palette-container">
      <div>
        <i
          @click=${() => store.dispatch(addRandomColor())}
          class="fa-solid fa-plus"
          title="Add Color"></i>
        <i
          @click=${() => store.dispatch(shufflePalette())}
          class="fa-solid fa-arrows-rotate"
          title="Shuffle Palette"></i>
        <i
          @click=${() => store.dispatch(randomizePalette())}
          class="fa-solid fa-dice"
          title="Randomize Palette"></i>
      </div>
      ${state.palette.map((_, index) => paletteEntry(index))}
    </div>

    ${state.settingsModalOpen
      ? html`<div
          class="modal-overlay"
          @click=${() => store.dispatch(toggleSettingsModal())}>
          <div class="settings-modal" @click=${(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h3>Settings</h3>
              <button
                class="close-button"
                @click=${() => store.dispatch(toggleSettingsModal())}>
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div class="modal-section">
              <h4>Canvas Size</h4>
              <div class="dimension-input">
                <label for="width-input">Width:</label>
                <input
                  id="width-input"
                  type="number"
                  min="1"
                  max="100"
                  value="${state.bitmap.width}" />
              </div>
              <div class="dimension-input">
                <label for="height-input">Height:</label>
                <input
                  id="height-input"
                  type="number"
                  min="1"
                  max="100"
                  value="${state.bitmap.height}" />
              </div>
              <button
                class="resize-button"
                @click=${() => {
                  const width = parseInt(
                    document.getElementById("width-input").value
                  );
                  const height = parseInt(
                    document.getElementById("height-input").value
                  );
                  store.dispatch(resizeBitmap({ width, height }));
                  store.dispatch(toggleSettingsModal());
                }}>
                Resize Canvas
              </button>
            </div>
          </div>
        </div>`
      : ""}
  </div>`;
}

function drawBitmap(bitmap, palette) {
  const canvas = document.getElementById("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(bitmap.width, bitmap.height);
  for (let i = 0; i < bitmap.data.length; i++) {
    const color = palette[bitmap.data[i]];
    imageData.data[i * 4] = color[0];
    imageData.data[i * 4 + 1] = color[1];
    imageData.data[i * 4 + 2] = color[2];
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

function r() {
  render(view(), document.body);
  const state = store.getState();
  drawBitmap(state.bitmap, state.palette);
}

window.onload = () => {
  r();

  store.subscribe(r);
};

// Add a pointer up handler to reset the onToolMove
function onPointerUp() {
  onToolMove = null;
}

// Register the pointer up event globally
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointerup", onPointerUp);
