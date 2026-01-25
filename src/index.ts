import { html, render } from "lit-html";
import { serial } from "./serial";
import {
  drawChanges,
  resizeBitmap,
  setBasePattern,
  setKnittingState,
  setMachineState,
  setMode,
  setMousePos,
  setPaletteIndex,
  setPatternConfig,
  setTool,
} from "./slice";
import {
  createBitmapFromImage,
  createEmptyBitmap,
  bitmapEditingTools,
  bitmapToPNGDataURL,
} from "./bitmap";
import { isLeftClick, getCellFromEvent, getCurrentCellSize } from "./utils";
import { store } from "./store";
import { drawComputedPattern, drawPreviewPattern } from "./drawing";
import { selectComputedPattern } from "./selectors";
import Split from "split.js";

let row = 0;
let onToolMove: null | Function = null;

// Add a pointer up handler to reset the onToolMove
function onPointerUp() {
  onToolMove = null;
}

// Register the pointer up event globally
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointerup", onPointerUp);

function patternConfig() {
  const state = store.getState();
  const patternConfig = state.patternConfig;
  const machineState = state.machineState;

  return html`
    <div class="bg-base-200 flex flex-col border-l-1 border-gray-500">
      <div
        class="flex flex-row items-center bg-neutral text-neutral-content p-1">
        <span class="font-bold">Pattern config</span>
      </div>
      <div class="flex flex-col gap-1 p-1 overflow-y-auto">
        <fieldset class="fieldset border-base-300 border-1 p-1">
          <legend class="fieldset-legend">Mirroring</legend>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.mirror_horizontal}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    mirror_horizontal: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            Horizontally
          </label>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.mirror_vertical}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    mirror_vertical: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            Vertically
          </label>
        </fieldset>
        <fieldset class="fieldset border-base-300 border-1 p-1">
          <legend class="fieldset-legend">Doubling</legend>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.double_rows}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    double_rows: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            Rows
          </label>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.double_cols}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    double_cols: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            Columns
          </label>
        </fieldset>
        <fieldset class="fieldset border-base-300 border-1 p-1">
          <legend class="fieldset-legend">Repeat</legend>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.repeat_horizontal}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    repeat_horizontal: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            Horizontally
          </label>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.repeat_vertical}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    repeat_vertical: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            Vertically
          </label>
        </fieldset>
        <fieldset class="fieldset border-base-300 border-1 p-1">
          <legend class="fieldset-legend">Margin</legend>
          <label class="input input-xs">
            <span class="label">Margin left</span>
            <input
              type="number"
              min="0"
              value=${patternConfig.marginLeft}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    marginLeft: parseInt((e.target as HTMLInputElement).value),
                  }),
                );
              }} />
          </label>
          <label class="input input-xs">
            <span class="label">Margin right</span>
            <input
              type="number"
              min="0"
              value=${patternConfig.marginRight}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    marginRight: parseInt((e.target as HTMLInputElement).value),
                  }),
                );
              }} />
          </label>
        </fieldset>
        <fieldset class="fieldset border-base-300 border-1 p-1">
          <legend class="fieldset-legend">Misc</legend>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.centerX}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    centerX: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            Center X
          </label>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.endNeedleSelection}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    endNeedleSelection: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            End needle selection
          </label>
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.negative}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    negative: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            Negative
          </label>
        </fieldset>
        <fieldset class="fieldset border-base-300 border-1 p-1">
          <legend class="fieldset-legend p-1">Extents</legend>
          <label class="input input-xs">
            <span class="label">Left</span>
            <input
              value=${machineState.pointCams[0]}
              @change=${(e: Event) => {
                const value = (e.target as HTMLInputElement).value;
                store.dispatch(
                  setMachineState({
                    ...machineState,
                    pointCams: [parseInt(value), machineState.pointCams[1]],
                  }),
                );
              }}
              type="number"
              min="-100"
              max="100"
              step="1" />
          </label>
          <label class="input input-xs">
            <span class="label">Right</span>
            <input
              value=${machineState.pointCams[1]}
              @change=${(e: Event) => {
                const value = (e.target as HTMLInputElement).value;
                store.dispatch(
                  setMachineState({
                    ...machineState,
                    pointCams: [machineState.pointCams[0], parseInt(value)],
                  }),
                );
              }}
              type="number"
              min="-100"
              max="100"
              step="1" />
          </label>
          <label class="input input-xs">
            <span class="label">Height</span>
            <input
              value=${patternConfig.height}
              @change=${(e: Event) => {
                const value = (e.target as HTMLInputElement).value;
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    height: parseInt(value),
                  }),
                );
              }}
              type="number"
              min="0"
              max="1000" />
          </label>
        </fieldset>
      </div>
    </div>
  `;
}

function patternUpload() {
  const state = store.getState();

  return html`
    <div class="flex flex-row gap-1 items-center justify-center p-1">
      <input
        type="file"
        class="file-input file-input-xs"
        @change=${async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              const bitmap = await createBitmapFromImage(file);
              store.dispatch(setBasePattern(bitmap));
            } catch (error) {
              console.error("Failed to load PNG:", error);
            }
          }
        }} />
      <span class="text-sm">Width: ${state.basePattern.width}</span>
      <span class="text-sm">Height: ${state.basePattern.height}</span>
    </div>
    <div
      id="artboard-container"
      class="flex flex-1 items-center justify-center overflow-hidden">
      <canvas id="preview-canvas" class="border-1 border-black"></canvas>
    </div>
  `;
}

function getRow(e: PointerEvent, height: number) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  let y = e.clientY - rect.top;
  if (y < 0) {
    y = 0;
  }
  row = Math.floor(y / 20);
  row = Math.min(row, height - 1);
  return row;
}

function gutters(height: number) {
  return new Array(height).fill(0).map(
    (_, row) =>
      html`<div class="flex items-center justify-center  h-[20px] leading-0">
        <span class="text-xs font-mono self-end">${row + 1}</span>
      </div>`,
  );
}

function needles(pointCams: [number, number]) {
  const width = pointCams[1] - pointCams[0];
  return new Array(width)
    .fill(0)
    .map(
      (_, col) =>
        html` <span class="w-[20px]" style="font-size: 9px;"
          >${col + pointCams[0] >= 0
            ? col + pointCams[0] + 1
            : col + pointCams[0]}</span
        >`,
    );
}

function connectedBtns() {
  const state = store.getState();
  const active = state.knittingState.patterning;
  return html`
    <button @click=${serial.disconnect} class="btn btn-xs btn-neutral">
      Disconnect
    </button>
    <div class="flex-1"></div>
    <span id="status" class="text-sm"
      >${active ? "Knitting!" : "Not knitting"}</span
    >
    ${active
      ? html`<button
          @click=${() =>
            store.dispatch(
              setKnittingState({
                ...state.knittingState,
                patterning: false,
              }),
            )}
          class="btn btn-xs btn-info">
          Stop Knitting!
        </button>`
      : html`<button
          @click=${() =>
            store.dispatch(
              setKnittingState({
                ...state.knittingState,
                patterning: true,
              }),
            )}
          class="btn btn-xs btn-info">
          Begin Interactive Knitting!
        </button>`}
  `;
}

function disconnectedBtns() {
  return html`
    <button @click=${() => serial.connect()} class="btn btn-xs btn-accent">
      Connect!
    </button>
  `;
}

function interactiveKnitting() {
  const state = store.getState();
  const height = state.patternConfig.height;
  const width = selectComputedPattern(state).width;

  const currentRow = state.knittingState.currentRowNumber;
  const connected = serial.connected();

  return html` <div
      class="flex gap-2 items-center p-1 shadow-sm ${connected
        ? "bg-primary text-primary-content"
        : "bg-neutral text-neutral-content"}">
      <span class="font-bold">
        ${connected ? "Connected to machine" : "Not connected to machine"}
      </span>
      ${connected ? connectedBtns() : disconnectedBtns()}
    </div>

    <div class="flex flex-row gap-2 items-center p-1">
      <span class="text-sm">Carriage:</span>
      <div class="join">
        <input
          type="radio"
          name="carriage-side"
          class="join-item btn btn-xs"
          aria-label="Left"
          .checked=${state.knittingState.carriageSide === "left"}
          @click=${() =>
            store.dispatch(
              setKnittingState({
                ...state.knittingState,
                carriageSide: "left",
              }),
            )} />
        <input
          type="radio"
          name="carriage-side"
          class="join-item btn btn-xs"
          aria-label="Right"
          .checked=${state.knittingState.carriageSide === "right"}
          @click=${() =>
            store.dispatch(
              setKnittingState({
                ...state.knittingState,
                carriageSide: "right",
              }),
            )} />
      </div>
      <span class="text-sm"
        >Row: ${state.knittingState.currentRowNumber + 1}</span
      >
    </div>
    <div class="flex flex-row justify-center m-5 overflow-hidden">
      <div
        class="border-1 border-black overflow-y-auto bg-base-200 shadow-[0_0_10px_0_rgba(0,0,0,0.5)]">
        <div
          class="group grid grid-cols-[50px_auto_50px] flex-row relative box-content cursor-pointer"
          @pointermove=${(e: PointerEvent) => getRow(e, height)}
          @pointerdown=${(e: PointerEvent) => {
            const row = height - getRow(e, height) - 1;
            store.dispatch(
              setKnittingState({
                ...state.knittingState,
                currentRowNumber: row,
              }),
            );
          }}>
          <div
            id="left-gutter"
            class="flex flex-col-reverse sticky left-0 border-black border-r-1 bg-base-200"
            style="height: ${height * 20}px">
            ${gutters(height)}
          </div>
          <canvas id="pattern-canvas"></canvas>
          <div
            id="right-gutter"
            class="flex flex-col-reverse sticky right-0 border-black border-l-1 bg-base-200"
            style="height: ${height * 20}px">
            ${gutters(height)}
          </div>
          <div
            id="current-row"
            class="absolute w-full h-[20px] bg-[#ff000050] pointer-events-none shadow-[0_0_5px_0_rgba(0,0,0,0.5)] ${connected
              ? "visible"
              : "invisible"}"
            style="top: ${(height - currentRow - 1) * 20}px; width: ${width *
              20 +
            100}px"></div>
          <div
            id="hover-row"
            class="absolute w-full h-[20px] bg-[#ffff0050] pointer-events-none ${connected
              ? "group-hover:visible"
              : ""} invisible shadow-[0_0_5px_0_rgba(0,0,0,0.5)]"
            style="top: ${row * 20}px; width: ${width * 20 + 100}px"></div>
          <div
            class="bg-base-200 sticky bottom-0 border-t-1 border-black"></div>
          <div
            id="bottom-gutter"
            class="flex sticky bottom-0 h-[20px] text-center items-center font-mono border-t-1 border-black bg-base-200">
            ${needles(state.machineState.pointCams)}
          </div>
          <div
            class="bg-base-200 sticky bottom-0 border-t-1 border-black"></div>
        </div>
      </div>
    </div>`;
}

function dragTool(startCell: [number, number]) {
  const state = store.getState();
  let lastCell = startCell;

  let tool = bitmapEditingTools[state.designState.selectedTool];
  let onEnterCell = tool(
    state.basePattern,
    lastCell,
    state.designState.selectedPaletteIndex,
  );

  const changes = onEnterCell(lastCell);
  store.dispatch(drawChanges(changes));

  function pointerMove(currentCell: [number, number]) {
    if (currentCell[0] === lastCell[0] && currentCell[1] === lastCell[1])
      return;
    const changes = onEnterCell(currentCell);
    store.dispatch(drawChanges(changes));

    lastCell = currentCell;
  }

  return pointerMove;
}

function onArtboardDown(e: PointerEvent) {
  if (!isLeftClick(e)) return;
  const cell = getCellFromEvent(e, store.getState().basePattern);

  onToolMove = dragTool(cell);
}

function artboardPointerMove(e: PointerEvent) {
  const cell = getCellFromEvent(e, store.getState().basePattern);
  store.dispatch(setMousePos(cell));

  if (onToolMove) {
    onToolMove(cell);
  }
}

function patternDesign() {
  const state = store.getState();
  const tool = state.designState.selectedTool;
  const canvas = document.getElementById("preview-canvas") as HTMLCanvasElement;
  const cellSize = canvas
    ? getCurrentCellSize(canvas.getBoundingClientRect(), state.basePattern)
    : null;

  const mousePos = state.designState.mousePos;
  const paletteIndex = state.designState.selectedPaletteIndex;

  return html`
    <div class="flex flex-row items-center bg-base-200 gap-1 shadow-sm p-1">
      <label class="input input-xs w-[130px]">
        <span class="label">Width</span>
        <input
          value=${state.basePattern.width}
          @change=${(e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            store.dispatch(
              resizeBitmap({
                width: parseInt(value),
                height: state.basePattern.height,
              }),
            );
          }}
          type="number"
          min="1"
          max="200"
          step="1" />
      </label>
      <label class="input input-xs w-[130px]">
        <span class="label">Height</span>
        <input
          value=${state.basePattern.height}
          @change=${(e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            store.dispatch(
              resizeBitmap({
                width: state.basePattern.width,
                height: parseInt(value),
              }),
            );
          }}
          type="number"
          min="1"
          max="1000"
          step="1" />
      </label>
      <button
        class="btn btn-xs btn-neutral"
        @click=${() => {
          store.dispatch(
            setBasePattern(
              createEmptyBitmap(
                state.basePattern.width,
                state.basePattern.height,
                [0, 0, 0],
                [
                  [0, 0, 0],
                  [255, 255, 255],
                ],
              ),
            ),
          );
        }}>
        Clear
      </button>
      <button
        class="btn btn-xs btn-accent"
        @click=${() => {
          const link = document.createElement("a");
          link.href = bitmapToPNGDataURL(state.basePattern);
          link.download = "pattern.png";
          link.click();
        }}>
        Download
      </button>
      <div class="flex flex-1"></div>
      <div class="tabs tabs-xs tabs-box">
        ${Object.keys(bitmapEditingTools).map(
          (toolName) =>
            html`<input
              type="radio"
              aria-label=${toolName}
              ?checked=${tool === toolName}
              class="tab"
              @change=${() => {
                store.dispatch(setTool(toolName));
              }}
              name="tool"
              value=${toolName} />`,
        )}
      </div>
    </div>
    <div class="flex flex-1 flex-row gap-1 overflow-hidden p-2">
      <div
        class="flex flex-col gap-1 bg-base-100 shadow-sm self-center p-1 rounded-md">
        ${state.basePattern.palette.map(
          (color, index) =>
            html`<div
              class="w-[30px] h-[30px] rounded-sm shadow-sm cursor-pointer ${index ===
              paletteIndex
                ? "border-2 border-white outline outline-2 outline-black"
                : ""}"
              style="background-color: rgb(${color[0]}, ${color[1]}, ${color[2]})"
              @click=${() => store.dispatch(setPaletteIndex(index))}></div>`,
        )}
      </div>
      <div
        id="artboard-container"
        class="flex flex-1 justify-center overflow-hidden ">
        <div class="flex relative self-center">
          <canvas
            id="preview-canvas"
            class="outline-1 outline-black"
            style="outline-offset: -1px;"
            @pointerdown=${onArtboardDown}
            @pointermove=${artboardPointerMove}
            @pointerleave=${() => store.dispatch(setMousePos(null))}></canvas>
          ${mousePos &&
          cellSize &&
          html`<div
              class="bg-[#ffffff30] pointer-events-none z-10 absolute w-full left-0 shadow-[0_0_3px_0_rgba(0,0,0,0.5)]"
              style="top: ${mousePos[1] *
              cellSize}px; height: ${cellSize}px"></div>
            <div
              class="bg-[#ffffff30] pointer-events-none z-10 absolute h-full top-0 shadow-[0_0_3px_0_rgba(0,0,0,0.5)]"
              style="left: ${mousePos[0] *
              cellSize}px; width: ${cellSize}px"></div>`}
        </div>
      </div>
    </div>
  `;
}

function patternLibrary() {
  return html`library`;
}

function basePatternMode() {
  const mode = store.getState().mode;
  switch (mode) {
    case "upload":
      return patternUpload();
    case "design":
      return patternDesign();
    case "library":
      return patternLibrary();
  }
}

function patternSetup() {
  const mode = store.getState().mode;

  return html`<div class="flex flex-1 flex-col">
    <div
      class="flex flex-row gap-1 items-center bg-neutral text-neutral-content p-1">
      <span class="font-bold">Silver Reed/Write Controller</span>
      <div role="tablist" class="tabs tabs-border tabs-xs flex-1">
        <button
          role="tab"
          class="tab ${mode === "upload" ? "tab-active" : ""}"
          @click=${() => store.dispatch(setMode("upload"))}>
          Upload
        </button>
        <button
          role="tab"
          class="tab ${mode === "design" ? "tab-active" : ""}"
          @click=${() => store.dispatch(setMode("design"))}>
          Design
        </button>
        <button
          role="tab"
          class="tab ${mode === "library" ? "tab-active" : ""}"
          @click=${() => store.dispatch(setMode("library"))}>
          Library
        </button>
      </div>
    </div>
    <div
      id="base-pattern-content-container"
      class="flex-1 flex flex-col overflow-hidden">
      ${basePatternMode()}
    </div>
  </div>`;
}

function view() {
  return html`
    <div class="flex flex-col h-screen overflow-hidden">
      <div id="pattern-setup-container" class="flex flex-row bg-base-300">
        ${patternSetup()} ${patternConfig()}
      </div>
      <div
        id="interactive-knitting-container"
        class="flex flex-col overflow-hidden bg-base-300">
        ${interactiveKnitting()}
      </div>
    </div>
  `;
}

function r() {
  render(view(), document.body);
  window.requestAnimationFrame(r);
}

document.addEventListener("DOMContentLoaded", () => {
  r();

  Split(["#pattern-setup-container", "#interactive-knitting-container"], {
    sizes: [50, 50],
    direction: "vertical",
    onDrag: () => {
      const state = store.getState();
      drawPreviewPattern(state.basePattern);
    },
  });
  const initialState = store.getState();
  drawPreviewPattern(initialState.basePattern);
  drawComputedPattern(selectComputedPattern(initialState));
});
