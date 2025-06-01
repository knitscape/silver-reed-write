import { html, render } from "lit-html";
import { serial } from "./serial";
import { initialState, PatternConfig } from "./state";
import {
  Bitmap,
  createBitmapFromImage,
  createEmptyBitmap,
  drawBitmapToCanvas,
  fitCanvasToParent,
  getRow,
} from "./bitmap";

const GLOBAL_STATE = initialState;

function highlightRow(
  row: number,
  highlightColor: string = "rgba(255, 0, 0, 0.3)",
  bottomUp: boolean = true
) {
  const canvas = document.getElementById("pattern-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Could not get context");
    return;
  }
  ctx.fillStyle = highlightColor;
  if (bottomUp) {
    ctx.fillRect(0, canvas.height - row - 1, canvas.width, 1);
  } else {
    ctx.fillRect(0, row, canvas.width, 1);
  }
}

function drawPattern() {
  if (!GLOBAL_STATE.computedPattern) {
    return;
  }
  console.log("drawPattern", GLOBAL_STATE.computedPattern);
  const canvas = document.getElementById("pattern-canvas") as HTMLCanvasElement;
  drawBitmapToCanvas(canvas, GLOBAL_STATE.computedPattern);
  canvas.style.width = `${GLOBAL_STATE.computedPattern.width * 20}px`;
  canvas.style.height = `${GLOBAL_STATE.computedPattern.height * 20}px`;
  if (GLOBAL_STATE.knittingState.patterning) {
    highlightRow(GLOBAL_STATE.knittingState.currentRow);
  }
}

async function processState(jsonData) {
  // console.log("processState", jsonData);
  GLOBAL_STATE.machineState.carriageSide = jsonData.direction;
  // GLOBAL_STATE.pattern_width = jsonData.cam_width;

  if (GLOBAL_STATE.knittingState.patterning) {
    // increment the current row
    GLOBAL_STATE.knittingState.currentRow =
      GLOBAL_STATE.knittingState.currentRow + 1;
    if (
      GLOBAL_STATE.knittingState.currentRow >=
      GLOBAL_STATE.computedPattern!.height
    ) {
      GLOBAL_STATE.knittingState.currentRow = 0; // wrap around to the first row
    }

    await writePatternRow(GLOBAL_STATE.knittingState.currentRow); // write the current row to the machine
  }

  drawPattern();
}

function processJSON(jsonData) {
  const msg_type = jsonData.msg_type;
  if (msg_type === "state") {
    processState(jsonData.msg);
  } else if (msg_type === "echo") {
    console.log("Received echo:", jsonData.msg);
  } else if (msg_type === "error") {
    console.error("Error from device:", jsonData.msg);
  }
}

async function writePatternRow(rowNumber) {
  let row = getRow(GLOBAL_STATE.basePattern, rowNumber);
  if (GLOBAL_STATE.machineState.carriageSide === "right") {
    row.reverse();
  }

  const rowData = {
    msg_type: "row",
    row: row,
  };
  await serial.writeJSON(rowData);
}

function rowNumber(row: number, currentRow: number) {
  const isCurrentRow = row === currentRow;
  return html`<div
    class="flex font-mono items-center justify-center w-[50px] h-[20px] leading-0 hover:cursor-pointer hover:bg-gray-100 ${isCurrentRow
      ? "bg-gray-300 border-t-1 border-b-1 border-black"
      : ""}">
    ${row + 1}
  </div>`;
}

function gutters(height: number, currentRow: number) {
  return new Array(height).fill(0).map((_, i) => rowNumber(i, currentRow));
}

function recomputePattern() {
  const patternWidth =
    GLOBAL_STATE.machineState.pointCams[1] -
    GLOBAL_STATE.machineState.pointCams[0];
  const patternHeight = GLOBAL_STATE.basePattern.height;
  const pattern = createEmptyBitmap(patternWidth, patternHeight);

  GLOBAL_STATE.computedPattern = pattern;

  drawPattern();
}

function patternConfig(patternConfig: PatternConfig) {
  return html`
    <div class="bg-base-200 flex flex-col">
      <div
        class="flex flex-row items-center justify-between bg-secondary text-secondary-content p-1">
        <span class="font-bold">Pattern config</span>
      </div>
      <div class="flex flex-col gap-1 p-1">
        <div class="flex flex-row gap-1">
          <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend">Mirroring</legend>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Horizontally
            </label>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Vertically
            </label>
          </fieldset>
          <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend">Doubling</legend>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Rows
            </label>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Columns
            </label>
          </fieldset>
          <!-- <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend">Repeat</legend>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Horizontally
            </label>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Vertically
            </label>
          </fieldset>
          <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend">Margin</legend>
            <label class="input input-xs">
              <span class="label">Margin left</span>
              <input
                type="number"
                class="validator"
                min="0"
                title="Must be between be 1 to 10" />
            </label>
            <label class="input input-xs">
              <span class="label">Margin right</span>
              <input
                type="number"
                class="validator"
                min="0"
                title="Must be between be 1 to 10" />
            </label>
          </fieldset>
          <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend">Misc</legend>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Center
            </label>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              End needles
            </label>
          </fieldset> -->
        </div>
        <div class="flex flex-row gap-1">
          <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend p-1">Point cams</legend>
            <label class="input input-xs">
              <span class="label">Left</span>
              <input
                value=${GLOBAL_STATE.machineState.pointCams[0]}
                @change=${(e: Event) => {
                  const value = (e.target as HTMLInputElement).value;
                  GLOBAL_STATE.machineState.pointCams[0] = parseInt(value);
                  recomputePattern();
                }}
                type="number"
                class="validator"
                min="-100"
                max="100"
                step="1" />
            </label>
            <label class="input input-xs">
              <span class="label">Right</span>
              <input
                value=${GLOBAL_STATE.machineState.pointCams[1]}
                @change=${(e: Event) => {
                  const value = (e.target as HTMLInputElement).value;
                  GLOBAL_STATE.machineState.pointCams[1] = parseInt(value);
                  recomputePattern();
                }}
                type="number"
                class="validator"
                min="-100"
                max="100"
                step="1" />
            </label>
          </fieldset>
        </div>
      </div>
    </div>
  `;
}

function updateBasePattern(bitmap: Bitmap) {
  GLOBAL_STATE.basePattern = bitmap;

  // Draw the bitmap to the upload canvas
  const uploadCanvas = document.getElementById(
    "upload-result"
  ) as HTMLCanvasElement;
  const aspectRatio = bitmap.width / bitmap.height;
  fitCanvasToParent(uploadCanvas, aspectRatio);
  drawBitmapToCanvas(uploadCanvas, bitmap);

  // Draw the final pattern to the pattern canvas
  recomputePattern;
}

function patternUpload() {
  return html`<div class="flex-1 flex flex-col p-1 gap-1 bg-base-200">
    <input
      type="file"
      class="file-input file-input-xs"
      @change=${async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const bitmap = await createBitmapFromImage(file);
            updateBasePattern(bitmap);
          } catch (error) {
            console.error("Failed to load PNG:", error);
          }
        }
      }} />
    <div class="h-[300px] flex items-center justify-center">
      <canvas id="upload-result" class="outline-1 outline-black"></canvas>
    </div>
    <div class="flex flex-row gap-1">
      <span class="text-sm">Width: ${GLOBAL_STATE.basePattern.width}</span>
      <span class="text-sm">Height: ${GLOBAL_STATE.basePattern.height}</span>
    </div>
  </div>`;
}

function interactiveKnitting() {
  const height = GLOBAL_STATE.basePattern.height;

  const currentRow = 0;

  return html`<div
      class="flex items-center bg-secondary text-secondary-content p-1 shadow-sm">
      <span class="font-bold">Interactive Knitting</span>
      <div class="flex-1"></div>
      ${serial.connected() ? connectedBtns : disconnectedBtns}
    </div>
    <button
      @click=${() => writePatternRow(GLOBAL_STATE.knittingState.currentRow)}
      ?disabled=${!serial.connected()}
      class="btn btn-xs btn-info">
      Knit!
    </button>
    <span
      >Side: ${GLOBAL_STATE.knittingState.carriageSide} Row:
      ${GLOBAL_STATE.knittingState.currentRow}</span
    >
    <div class="flex flex-row overflow-y-auto border-t-1 border-black">
      <div
        class="flex flex-col-reverse sticky left-0 bg-base-200 border-black border-r-1">
        ${gutters(height, currentRow)}
      </div>

      <canvas id="pattern-canvas" class="outline-1 outline-black"></canvas>
      <div
        class="flex flex-col-reverse sticky right-0 bg-base-200 border-black border-l-1">
        ${gutters(height, currentRow)}
      </div>
    </div>`;
}

function knittingUI() {
  return html` <div class="flex flex-col h-full gap-2 bg-base-300">
    <div class="flex flex-row gap-1">
      ${patternUpload()} ${patternConfig(GLOBAL_STATE.patternConfig)}
    </div>

    <div class="bg-base-200 outline-1 outline-black">
      ${interactiveKnitting()}
    </div>
  </div>`;
}

// function designUI(designModeState: DesignMode) {
//   return html`
//     <div class="pattern-controls">
//       <span>Color: ${designModeState.selectedColor}</span>
//       <span>Tool: ${designModeState.selectedTool}</span>
//     </div>
//   `;
// }

const connectedBtns = html`
  <span id="status" class="text-sm">Connected!</span>
  <button @click=${serial.disconnect} class="btn btn-xs btn-neutral">
    Disconnect
  </button>
`;

const disconnectedBtns = html`
  <button
    @click=${() => serial.connect(processJSON)}
    class="btn btn-xs btn-accent">
    Connect to Machine
  </button>
`;

function toolbar() {
  return html` <div
    class="bg-primary text-primary-content flex items-center shadow-sm gap-1 p-1 sticky top-0">
    <span class="font-bold">Silver Reed/Write Controller</span>
    <div class="flex-1"></div>
  </div>`;
}

function view() {
  return html`
    <div class="flex flex-col h-screen">${toolbar()} ${knittingUI()}</div>
  `;
}

function r() {
  render(view(), document.body);
  window.requestAnimationFrame(r);
}

document.addEventListener("DOMContentLoaded", () => {
  r();
  drawPattern();
  // drawBitmapToCanvas(
  //   document.getElementById("upload-result") as HTMLCanvasElement,
  //   GLOBAL_STATE.basePattern
  // );
});
