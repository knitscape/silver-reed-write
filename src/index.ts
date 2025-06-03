import { html, render } from "lit-html";
import { serial } from "./serial";
import {
  setBasePattern,
  setKnittingState,
  setMachineState,
  setPatternConfig,
} from "./slice";
import { createBitmapFromImage } from "./bitmap";

import { store } from "./store";
import { drawComputedPattern } from "./drawing";
import { drawUploadedPattern } from "./drawing";
import { selectComputedPattern } from "./selectors";

function patternConfig() {
  const state = store.getState();
  const patternConfig = state.patternConfig;
  const machineState = state.machineState;

  return html`
    <div class="bg-base-200 flex flex-col">
      <div
        class="flex flex-row items-center justify-between bg-secondary text-secondary-content p-1">
        <span class="font-bold">Pattern config</span>
      </div>
      <div class="flex flex-col gap-1 p-1">
        <div class="flex flex-row gap-1">
          <!-- <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend">Mirroring</legend>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Horizontally
            </label>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Vertically
            </label>
          </fieldset> -->
          <!-- <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend">Doubling</legend>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Rows
            </label>
            <label class="label">
              <input type="checkbox" class="toggle toggle-xs" />
              Columns
            </label>
          </fieldset> -->
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
                    })
                  );
                }} />
              Horizontally
            </label>
          </fieldset>
          <!-- <fieldset class="fieldset border-base-300 border-1 p-1">
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
          </fieldset> -->
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
                    })
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
                      endNeedleSelection: (e.target as HTMLInputElement)
                        .checked,
                    })
                  );
                }} />
              End needle selection
            </label>
          </fieldset>
        </div>
        <div class="flex flex-row gap-1">
          <fieldset class="fieldset border-base-300 border-1 p-1">
            <legend class="fieldset-legend p-1">Point cams</legend>
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
                    })
                  );
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
                value=${machineState.pointCams[1]}
                @change=${(e: Event) => {
                  const value = (e.target as HTMLInputElement).value;
                  store.dispatch(
                    setMachineState({
                      ...machineState,
                      pointCams: [machineState.pointCams[0], parseInt(value)],
                    })
                  );
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

function patternUpload() {
  const state = store.getState();

  return html`<div class="flex-1 flex flex-col p-1 gap-1 bg-base-200">
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
    <div class="h-[300px] flex items-center justify-center">
      <canvas id="upload-result" class="outline-1 outline-black"></canvas>
    </div>
    <div class="flex flex-row gap-1">
      <span class="text-sm">Width: ${state.basePattern.width}</span>
      <span class="text-sm">Height: ${state.basePattern.height}</span>
    </div>
  </div>`;
}

let row = 0;

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
    (_, row) => html`<div
      class="flex items-center justify-center  h-[20px] leading-0">
      <span class="text-xs font-mono self-end">${row + 1}</span>
    </div>`
  );
}

function needles(pointCams: [number, number]) {
  const width = pointCams[1] - pointCams[0];
  return new Array(width)
    .fill(0)
    .map(
      (_, col) => html` <span class="w-[20px]" style="font-size: 9px;"
        >${col + pointCams[0] >= 0
          ? col + pointCams[0] + 1
          : col + pointCams[0]}</span
      >`
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
              })
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
              })
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
  const basePattern = state.basePattern;
  const height = basePattern.height;
  const width = selectComputedPattern(state).width;

  const currentRow = state.knittingState.currentRowNumber;
  const connected = serial.connected();

  return html` <div
      class="flex gap-2 items-center bg-neutral text-neutral-content p-1 shadow-sm">
      <span class="font-bold">
        ${connected ? "Connected to machine" : "Not connected to machine"}
      </span>
      ${connected ? connectedBtns() : disconnectedBtns()}
    </div>

    <div class="flex flex-row gap-1">
      <span>Side: ${state.knittingState.carriageSide}</span>
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
              })
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
            class="absolute w-full h-[20px] bg-[#ff000050] pointer-events-none shadow-[0_0_5px_0_rgba(0,0,0,0.5)]"
            style="top: ${(height - currentRow - 1) * 20}px; width: ${width *
              20 +
            100}px"></div>
          <div
            id="hover-row"
            class="absolute w-full h-[20px] bg-[#ffff0050] pointer-events-none group-hover:visible invisible shadow-[0_0_5px_0_rgba(0,0,0,0.5)]"
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

function knittingUI() {
  return html` <div
    class="flex flex-col flex-1 gap-2 bg-base-300 overflow-hidden">
    <div class="flex flex-row gap-1">${patternUpload()} ${patternConfig()}</div>
    <div class="flex flex-col overflow-hidden">${interactiveKnitting()}</div>
  </div>`;
}

function toolbar() {
  return html`<div
    class="bg-primary text-primary-content flex items-center shadow-sm gap-1 p-1">
    <span class="font-bold">Silver Reed/Write Controller</span>
    <div class="flex-1"></div>
  </div>`;
}

function view() {
  return html`
    <div class="flex flex-col h-screen overflow-hidden">
      ${toolbar()} ${knittingUI()}
    </div>
  `;
}

function r() {
  render(view(), document.body);
  window.requestAnimationFrame(r);
}

document.addEventListener("DOMContentLoaded", () => {
  r();

  const initialState = store.getState();
  drawUploadedPattern(initialState.basePattern);
  drawComputedPattern(selectComputedPattern(initialState));
});
