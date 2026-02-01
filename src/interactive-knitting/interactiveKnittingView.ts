import { html } from "lit-html";
import { store } from "../store";
import { serial } from "./serial";
import { setKnittingState } from "./knittingSlice";
import { selectComputedPattern } from "../selectors";

let row = 0;

function getRowFromEvent(e: PointerEvent, height: number) {
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
    (_, rowIndex) =>
      html`<div class="flex items-center justify-center  h-[20px] leading-0">
        <span class="text-xs font-mono self-end">${rowIndex + 1}</span>
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

export function interactiveKnittingView() {
  const state = store.getState();
  const computedPattern = selectComputedPattern(state);
  const height = computedPattern.height;
  const width = computedPattern.width;

  const currentRow = state.knitting.knittingState.currentRowNumber;
  const connected = serial.connected();

  return html`
    <div class="flex flex-1 flex-col overflow-hidden min-h-0 min-w-0">
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
            @pointermove=${(e: PointerEvent) => getRowFromEvent(e, height)}
            @pointerdown=${(e: PointerEvent) => {
              const rowIndex = height - getRowFromEvent(e, height) - 1;
              store.dispatch(
                setKnittingState({
                  ...state.knitting.knittingState,
                  currentRowNumber: rowIndex,
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
    </div>
  `;
}
