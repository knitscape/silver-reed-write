import { html, render } from "lit-html";
import { serial } from "./interactive-knitting/serial";
import { setMode } from "./appSlice";
import {
  setPatternConfig,
  setKnittingState,
} from "./interactive-knitting/knittingSlice";
import {
  drawChanges,
  resizeBitmap,
  setBasePattern,
  setMousePos,
  setPaletteIndex,
  setTool,
  setFairisleMode,
  setFairisleRowColor,
  setShowFairisleColors,
  swapFairisleYarns,
} from "./pattern-design/designSlice";
import {
  createBitmapFromImage,
  createEmptyBitmap,
  bitmapEditingTools,
  bitmapToPNGDataURL,
  RGBColor,
} from "./utils/bitmap";
import {
  isLeftClick,
  getCellFromEvent,
  getCurrentCellSize,
} from "./utils/utils";
import { store } from "./store";
import { drawDesignPattern } from "./pattern-design/drawDesign";
import { drawComputedPattern } from "./interactive-knitting/drawComputed";
import { selectComputedPattern } from "./selectors";
import { getYarnLibrary, addYarn, updateYarn, removeYarn } from "./yarnLibrary";

// Helper functions for color conversion
function rgbToHex(rgb: [number, number, number]): string {
  return (
    "#" +
    rgb
      .map((c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

// Add Yarn Modal state
let addYarnModalOpen = false;
let addYarnModalCallback: ((color: RGBColor) => void) | null = null;
let addYarnModalName = "";
let addYarnModalColor = "#ffffff";

function openAddYarnModal(callback: (color: RGBColor) => void) {
  addYarnModalOpen = true;
  addYarnModalCallback = callback;
  addYarnModalName = "";
  addYarnModalColor = "#ffffff";
}

function closeAddYarnModal() {
  addYarnModalOpen = false;
  addYarnModalCallback = null;
}

function submitAddYarnModal() {
  if (addYarnModalName.trim() && addYarnModalCallback) {
    const color = hexToRgb(addYarnModalColor);
    const newYarn = addYarn(addYarnModalName.trim(), color);
    addYarnModalCallback(newYarn.color);
    closeAddYarnModal();
  }
}

function addYarnModal() {
  if (!addYarnModalOpen) return null;

  return html`
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click=${(e: Event) => {
        if (e.target === e.currentTarget) closeAddYarnModal();
      }}>
      <div class="bg-base-100 rounded-lg shadow-xl p-4 w-80">
        <h3 class="font-bold text-lg mb-4">Add New Yarn</h3>
        <div class="flex flex-col gap-3">
          <label class="form-control">
            <span class="label-text mb-1">Yarn Name</span>
            <input
              type="text"
              class="input input-bordered input-sm"
              placeholder="e.g. Ocean Blue"
              .value=${addYarnModalName}
              @input=${(e: Event) => {
                addYarnModalName = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") submitAddYarnModal();
                if (e.key === "Escape") closeAddYarnModal();
              }} />
          </label>
          <label class="form-control">
            <span class="label-text mb-1">Color</span>
            <div class="flex gap-2 items-center">
              <input
                type="color"
                class="w-12 h-10 cursor-pointer border-0 p-0 rounded"
                .value=${addYarnModalColor}
                @input=${(e: Event) => {
                  addYarnModalColor = (e.target as HTMLInputElement).value;
                }} />
              <input
                type="text"
                class="input input-bordered input-sm flex-1"
                placeholder="#ffffff"
                .value=${addYarnModalColor}
                @input=${(e: Event) => {
                  addYarnModalColor = (e.target as HTMLInputElement).value;
                }} />
            </div>
          </label>
          <div
            class="w-full h-8 rounded border"
            style="background-color: ${addYarnModalColor}"></div>
        </div>
        <div class="flex gap-2 mt-4 justify-end">
          <button class="btn btn-sm btn-ghost" @click=${closeAddYarnModal}>
            Cancel
          </button>
          <button
            class="btn btn-sm btn-primary"
            ?disabled=${!addYarnModalName.trim()}
            @click=${submitAddYarnModal}>
            Add Yarn
          </button>
        </div>
      </div>
    </div>
  `;
}

// Edit Yarn Modal state
let editYarnModalOpen = false;
let editYarnModalId = "";
let editYarnModalName = "";
let editYarnModalColor = "#ffffff";

function openEditYarnModal(id: string, name: string, color: RGBColor) {
  editYarnModalOpen = true;
  editYarnModalId = id;
  editYarnModalName = name;
  editYarnModalColor = rgbToHex(color);
}

function closeEditYarnModal() {
  editYarnModalOpen = false;
  editYarnModalId = "";
}

function submitEditYarnModal() {
  if (editYarnModalName.trim() && editYarnModalId) {
    const color = hexToRgb(editYarnModalColor);
    updateYarn(editYarnModalId, editYarnModalName.trim(), color);
    closeEditYarnModal();
  }
}

function deleteYarnFromModal() {
  if (editYarnModalId && confirm("Delete this yarn?")) {
    removeYarn(editYarnModalId);
    closeEditYarnModal();
  }
}

function editYarnModal() {
  if (!editYarnModalOpen) return null;

  return html`
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click=${(e: Event) => {
        if (e.target === e.currentTarget) closeEditYarnModal();
      }}>
      <div class="bg-base-100 rounded-lg shadow-xl p-4 w-80">
        <h3 class="font-bold text-lg mb-4">Edit Yarn</h3>
        <div class="flex flex-col gap-3">
          <label class="form-control">
            <span class="label-text mb-1">Yarn Name</span>
            <input
              type="text"
              class="input input-bordered input-sm"
              placeholder="e.g. Ocean Blue"
              .value=${editYarnModalName}
              @input=${(e: Event) => {
                editYarnModalName = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") submitEditYarnModal();
                if (e.key === "Escape") closeEditYarnModal();
              }} />
          </label>
          <label class="form-control">
            <span class="label-text mb-1">Color</span>
            <div class="flex gap-2 items-center">
              <input
                type="color"
                class="w-12 h-10 cursor-pointer border-0 p-0 rounded"
                .value=${editYarnModalColor}
                @input=${(e: Event) => {
                  editYarnModalColor = (e.target as HTMLInputElement).value;
                }} />
              <input
                type="text"
                class="input input-bordered input-sm flex-1"
                placeholder="#ffffff"
                .value=${editYarnModalColor}
                @input=${(e: Event) => {
                  editYarnModalColor = (e.target as HTMLInputElement).value;
                }} />
            </div>
          </label>
          <div
            class="w-full h-8 rounded border"
            style="background-color: ${editYarnModalColor}"></div>
        </div>
        <div class="flex gap-2 mt-4 justify-between">
          <button
            class="btn btn-sm btn-error btn-outline"
            @click=${deleteYarnFromModal}>
            Delete
          </button>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-ghost" @click=${closeEditYarnModal}>
              Cancel
            </button>
            <button
              class="btn btn-sm btn-primary"
              ?disabled=${!editYarnModalName.trim()}
              @click=${submitEditYarnModal}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Fairisle yarn painting state
let selectedFairisleYarnIndex: number | null = null;
let fairislePainting = false;

function getFairisleYarnPalette() {
  const yarns = getYarnLibrary();

  return html`
    <div
      class="flex flex-col gap-1 bg-base-100 shadow-sm self-center p-1 rounded-md">
      ${yarns.map(
        (yarn, index) => html`
          <div
            class="group relative w-[30px] h-[30px] rounded-sm shadow-sm cursor-pointer ${index ===
            selectedFairisleYarnIndex
              ? "border-2 border-white outline-2 outline-black"
              : ""}"
            style="background-color: rgb(${yarn.color[0]}, ${yarn
              .color[1]}, ${yarn.color[2]})"
            @click=${() => {
              selectedFairisleYarnIndex = index;
            }}
            title=${yarn.name}>
            <button
              class="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-base-100 text-base-content text-[10px] rounded-full shadow opacity-0 group-hover:opacity-100"
              @click=${(e: Event) => {
                e.stopPropagation();
                openEditYarnModal(yarn.id, yarn.name, yarn.color);
              }}
              title="Edit ${yarn.name}">
              ✎
            </button>
          </div>
        `,
      )}
      <button
        class="btn btn-xs btn-ghost w-[30px] h-[30px] p-0"
        @click=${() => openAddYarnModal(() => {})}
        title="Add new yarn">
        +
      </button>
    </div>
  `;
}

function paintFairisleCell(rowIndex: number, yarn: "yarn1" | "yarn2") {
  if (selectedFairisleYarnIndex === null) return;
  const yarns = getYarnLibrary();
  if (selectedFairisleYarnIndex >= yarns.length) return;
  const selectedYarn = yarns[selectedFairisleYarnIndex];
  store.dispatch(
    setFairisleRowColor({
      row: rowIndex,
      yarn,
      color: selectedYarn.color,
    }),
  );
}

function getFairisleColorGrid(
  fairisleColors: { yarn1: RGBColor; yarn2: RGBColor }[],
  cellSize: number,
) {
  return html`
    <div
      class="flex flex-col gap-0 self-center overflow-y-auto border border-black"
      @pointerleave=${() => {
        fairislePainting = false;
      }}>
      ${fairisleColors.map(
        (colors, rowIndex) => html`
          <div class="flex flex-row gap-0">
            <div
              class="cursor-pointer hover:opacity-80"
              style="width: ${cellSize}px; height: ${cellSize}px; background-color: rgb(${colors
                .yarn1[0]}, ${colors.yarn1[1]}, ${colors.yarn1[2]})"
              @pointerdown=${(e: PointerEvent) => {
                e.preventDefault();
                fairislePainting = true;
                paintFairisleCell(rowIndex, "yarn1");
              }}
              @pointerenter=${() => {
                if (fairislePainting) paintFairisleCell(rowIndex, "yarn1");
              }}
              title="Row ${rowIndex + 1} - Yarn 1"></div>
            <div
              class="cursor-pointer hover:opacity-80"
              style="width: ${cellSize}px; height: ${cellSize}px; background-color: rgb(${colors
                .yarn2[0]}, ${colors.yarn2[1]}, ${colors.yarn2[2]})"
              @pointerdown=${(e: PointerEvent) => {
                e.preventDefault();
                fairislePainting = true;
                paintFairisleCell(rowIndex, "yarn2");
              }}
              @pointerenter=${() => {
                if (fairislePainting) paintFairisleCell(rowIndex, "yarn2");
              }}
              title="Row ${rowIndex + 1} - Yarn 2"></div>
          </div>
        `,
      )}
    </div>
  `;
}

let row = 0;
let onToolMove: null | Function = null;

// Add a pointer up handler to reset the onToolMove and fairisle painting
function onPointerUp() {
  onToolMove = null;
  fairislePainting = false;
}

// Register the pointer up event globally
window.addEventListener("pointerup", onPointerUp);

function patternConfig() {
  const state = store.getState();
  const patternConfig = state.knitting.patternConfig;
  const knittingState = state.knitting.knittingState;

  return html`
    <div class="bg-base-200 flex flex-col border-l-1 border-gray-500">
      <div
        class="flex flex-row items-center bg-neutral text-neutral-content p-1">
        <span class="font-bold">Pattern config</span>
      </div>
      <div class="flex flex-col gap-1 p-1 overflow-y-auto">
        <fieldset class="fieldset border-base-300 border-1 p-1">
          <legend class="fieldset-legend">Extents</legend>
          <label class="input input-xs">
            <span class="label">Left</span>
            <input
              value=${knittingState.pointCams[0]}
              @change=${(e: Event) => {
                const value = (e.target as HTMLInputElement).value;
                store.dispatch(
                  setKnittingState({
                    ...knittingState,
                    pointCams: [parseInt(value), knittingState.pointCams[1]],
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
              value=${knittingState.pointCams[1]}
              @change=${(e: Event) => {
                const value = (e.target as HTMLInputElement).value;
                store.dispatch(
                  setKnittingState({
                    ...knittingState,
                    pointCams: [knittingState.pointCams[0], parseInt(value)],
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
              ?disabled=${patternConfig.heightFromTile}
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
          <label class="label">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              ?checked=${patternConfig.heightFromTile}
              @change=${(e: Event) => {
                store.dispatch(
                  setPatternConfig({
                    ...patternConfig,
                    heightFromTile: (e.target as HTMLInputElement).checked,
                  }),
                );
              }} />
            From base tile
          </label>
        </fieldset>
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
          <div class="flex flex-row gap-1 items-center">
            <span class="text-xs">Alignment</span>
            <div class="join">
              <input
                type="radio"
                name="alignment"
                class="join-item btn btn-xs"
                aria-label="Left"
                .checked=${patternConfig.alignment === "left"}
                @click=${() =>
                  store.dispatch(
                    setPatternConfig({
                      ...patternConfig,
                      alignment: "left",
                    }),
                  )} />
              <input
                type="radio"
                name="alignment"
                class="join-item btn btn-xs"
                aria-label="Center"
                .checked=${patternConfig.alignment === "center"}
                @click=${() =>
                  store.dispatch(
                    setPatternConfig({
                      ...patternConfig,
                      alignment: "center",
                    }),
                  )} />
              <input
                type="radio"
                name="alignment"
                class="join-item btn btn-xs"
                aria-label="Right"
                .checked=${patternConfig.alignment === "right"}
                @click=${() =>
                  store.dispatch(
                    setPatternConfig({
                      ...patternConfig,
                      alignment: "right",
                    }),
                  )} />
            </div>
          </div>
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
      </div>
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
  const active = state.knitting.knittingState.patterning;
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
                ...state.knitting.knittingState,
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
                ...state.knitting.knittingState,
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
  const computedPattern = selectComputedPattern(state);
  const height = computedPattern.height;
  const width = computedPattern.width;

  const currentRow = state.knitting.knittingState.currentRowNumber;
  const connected = serial.connected();

  return html` <div
    class="flex flex-1 flex-col overflow-hidden min-h-0 min-w-0">
    <div
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
          .checked=${state.knitting.knittingState.carriageSide === "left"}
          @click=${() =>
            store.dispatch(
              setKnittingState({
                ...state.knitting.knittingState,
                carriageSide: "left",
              }),
            )} />
        <input
          type="radio"
          name="carriage-side"
          class="join-item btn btn-xs"
          aria-label="Right"
          .checked=${state.knitting.knittingState.carriageSide === "right"}
          @click=${() =>
            store.dispatch(
              setKnittingState({
                ...state.knitting.knittingState,
                carriageSide: "right",
              }),
            )} />
      </div>
      <span class="text-sm"
        >Row: ${state.knitting.knittingState.currentRowNumber + 1}</span
      >
      <label class="input input-xs w-[140px]">
        <span class="label">Total rows</span>
        <input
          type="number"
          min="0"
          .value=${String(state.knitting.knittingState.totalRows)}
          @change=${(e: Event) => {
            const value = parseInt((e.target as HTMLInputElement).value) || 0;
            store.dispatch(
              setKnittingState({
                ...state.knitting.knittingState,
                totalRows: Math.max(0, value),
              }),
            );
          }} />
      </label>
      <button
        class="btn btn-xs btn-ghost"
        @click=${() => {
          if (confirm("Reset total row count to zero?")) {
            store.dispatch(
              setKnittingState({
                ...state.knitting.knittingState,
                totalRows: 0,
              }),
            );
          }
        }}>
        Reset
      </button>
    </div>
    <div
      class="flex flex-1 flex-row justify-center m-5 overflow-hidden min-h-0">
      <div
        class="border-1 border-black overflow-y-auto bg-base-200 shadow-[0_0_10px_0_rgba(0,0,0,0.5)]">
        <div
          class="group grid grid-cols-[50px_auto_50px] flex-row relative box-content cursor-pointer"
          @pointermove=${(e: PointerEvent) => getRow(e, height)}
          @pointerdown=${(e: PointerEvent) => {
            const row = height - getRow(e, height) - 1;
            store.dispatch(
              setKnittingState({
                ...state.knitting.knittingState,
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
            ${needles(state.knitting.knittingState.pointCams)}
          </div>
          <div
            class="bg-base-200 sticky bottom-0 border-t-1 border-black"></div>
        </div>
      </div>
    </div>
  </div>`;
}

function dragTool(startCell: [number, number]) {
  const state = store.getState();
  let lastCell = startCell;

  let tool = bitmapEditingTools[state.design.designState.selectedTool];
  let onEnterCell = tool(
    state.design.basePattern,
    lastCell,
    state.design.designState.selectedPaletteIndex,
  );

  const changes = onEnterCell(lastCell);
  store.dispatch(drawChanges(changes as [number, number, number][]));

  function pointerMove(currentCell: [number, number]) {
    if (currentCell[0] === lastCell[0] && currentCell[1] === lastCell[1])
      return;
    const changes = onEnterCell(currentCell);
    store.dispatch(drawChanges(changes as [number, number, number][]));

    lastCell = currentCell;
  }

  return pointerMove;
}

function onArtboardDown(e: PointerEvent) {
  if (!isLeftClick(e)) return;
  const cell = getCellFromEvent(e, store.getState().design.basePattern);

  onToolMove = dragTool(cell);
}

function artboardPointerMove(e: PointerEvent) {
  const cell = getCellFromEvent(e, store.getState().design.basePattern);
  store.dispatch(setMousePos(cell));

  if (onToolMove) {
    onToolMove(cell);
  }
}

function patternDesign() {
  const state = store.getState();
  const tool = state.design.designState.selectedTool;
  const canvas = document.getElementById("preview-canvas") as HTMLCanvasElement;
  const cellSize = canvas
    ? getCurrentCellSize(
        canvas.getBoundingClientRect(),
        state.design.basePattern,
      )
    : null;

  const mousePos = state.design.designState.mousePos;
  const paletteIndex = state.design.designState.selectedPaletteIndex;

  return html`
    <div class="flex flex-row items-center bg-base-200 gap-1 shadow-sm p-1">
      <input
        type="file"
        accept="image/png"
        class="hidden"
        id="load-image-input"
        @change=${async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              const bitmap = await createBitmapFromImage(file);
              store.dispatch(setBasePattern(bitmap));
            } catch (error) {
              console.error("Failed to load PNG:", error);
            }
            (e.target as HTMLInputElement).value = "";
          }
        }} />
      <button
        class="btn btn-xs btn-neutral"
        @click=${() => document.getElementById("load-image-input")?.click()}>
        Load image
      </button>
      <label class="input input-xs w-[130px]">
        <span class="label">Width</span>
        <input
          value=${state.design.basePattern.width}
          @change=${(e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            store.dispatch(
              resizeBitmap({
                width: parseInt(value),
                height: state.design.basePattern.height,
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
          value=${state.design.basePattern.height}
          @change=${(e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            store.dispatch(
              resizeBitmap({
                width: state.design.basePattern.width,
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
                state.design.basePattern.width,
                state.design.basePattern.height,
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
          link.href = bitmapToPNGDataURL(state.design.basePattern);
          link.download = "pattern.png";
          link.click();
        }}>
        Download
      </button>
      <label class="label text-xs gap-1">
        <input
          type="checkbox"
          class="checkbox checkbox-xs"
          .checked=${state.design.designState.fairisleMode}
          @change=${(e: Event) => {
            store.dispatch(
              setFairisleMode((e.target as HTMLInputElement).checked),
            );
          }} />
        Fairisle?
      </label>
      ${state.design.designState.fairisleMode
        ? html`<label class="label text-xs gap-1">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                .checked=${state.design.designState.showFairisleColors}
                @change=${(e: Event) => {
                  store.dispatch(
                    setShowFairisleColors(
                      (e.target as HTMLInputElement).checked,
                    ),
                  );
                }} />
              Show colors
            </label>
            <button
              class="btn btn-xs btn-ghost"
              @click=${() => store.dispatch(swapFairisleYarns())}
              title="Swap yarn 1 and yarn 2 for all rows">
              Swap yarns
            </button>`
        : null}
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
        ${state.design.basePattern.palette.map(
          (color, index) =>
            html`<div
              class="w-[30px] h-[30px] rounded-sm shadow-sm cursor-pointer ${index ===
              paletteIndex
                ? "border-2 border-white outline-2 outline-black"
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
      ${state.design.designState.fairisleMode && cellSize
        ? html`${getFairisleColorGrid(
            state.design.designState.fairisleColors,
            cellSize,
          )}
          ${getFairisleYarnPalette()}`
        : null}
    </div>
  `;
}

function mainContent() {
  const mode = store.getState().app.mode;
  if (mode === "design") {
    return patternDesign();
  }
  // knit: pattern config + interactive knitting
  return html`
    <div class="flex flex-1 flex-row overflow-hidden min-h-0">
      ${patternConfig()}
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">
        ${interactiveKnitting()}
      </div>
    </div>
  `;
}

function tabBar() {
  const mode = store.getState().app.mode;

  return html`
    <div
      class="flex flex-row gap-1 items-center bg-neutral text-neutral-content p-1">
      <span class="font-bold">Silver Reed/Write Controller</span>
      <div role="tablist" class="tabs tabs-border tabs-xs flex-1">
        <button
          role="tab"
          class="tab ${mode === "design" ? "tab-active" : ""}"
          @click=${() => store.dispatch(setMode("design"))}>
          Design
        </button>
        <button
          role="tab"
          class="tab ${mode === "knit" ? "tab-active" : ""}"
          @click=${() => store.dispatch(setMode("knit"))}>
          Knit
        </button>
      </div>
    </div>
  `;
}

function view() {
  return html`
    <div class="flex flex-col h-screen overflow-hidden">
      ${tabBar()}
      <div
        id="main-content"
        class="flex-1 flex flex-col overflow-hidden min-h-0 bg-base-300">
        ${mainContent()}
      </div>
    </div>
    ${addYarnModal()} ${editYarnModal()}
  `;
}

function r() {
  render(view(), document.body);
  window.requestAnimationFrame(r);
}

// Helper to get fairisle colors if fairisle mode is enabled and colors should be shown
function getFairisleColorsForDrawing(state: ReturnType<typeof store.getState>) {
  if (
    state.design.designState.fairisleMode &&
    state.design.designState.showFairisleColors &&
    state.design.designState.fairisleColors.length > 0
  ) {
    return state.design.designState.fairisleColors;
  }
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  r();

  const initialState = store.getState();
  const fairisleColors = getFairisleColorsForDrawing(initialState);

  if (initialState.app.mode === "design") {
    drawDesignPattern(initialState.design.basePattern, fairisleColors);
  } else {
    drawComputedPattern(
      selectComputedPattern(initialState),
      fairisleColors,
      initialState.knitting.patternConfig,
      initialState.design.basePattern.height,
    );
  }
});
