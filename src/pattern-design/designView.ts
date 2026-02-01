import { html } from "lit-html";
import { store } from "../store";
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
} from "./designSlice";
import {
  createBitmapFromImage,
  createEmptyBitmap,
  bitmapEditingTools,
  bitmapToPNGDataURL,
  getCellFromEvent,
  getCurrentCellSize,
} from "../common/bitmap";
import { isLeftClick } from "../common/pointerEvents";
import { getYarnLibrary } from "../yarnLibrary";
import { ColorRGB } from "../common/color";

// Fairisle yarn painting state
let selectedFairisleYarnIndex: number | null = null;
let fairislePainting = false;
let onToolMove: null | ((cell: [number, number]) => void) = null;

function onPointerUp() {
  onToolMove = null;
  fairislePainting = false;
}

window.addEventListener("pointerup", onPointerUp);

function getFairisleYarnPalette(
  openEditYarnModal: (id: string, name: string, color: ColorRGB) => void,
  openAddYarnModal: (callback: (color: ColorRGB) => void) => void,
) {
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
  fairisleColors: { yarn1: ColorRGB; yarn2: ColorRGB }[],
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

function dragTool(startCell: [number, number]) {
  const state = store.getState();
  let lastCell = startCell;

  const tool = bitmapEditingTools[state.design.designState.selectedTool];
  const onEnterCell = tool(
    state.design.basePattern,
    lastCell,
    state.design.designState.selectedPaletteIndex,
  );

  const changes = onEnterCell(lastCell);
  store.dispatch(drawChanges(changes as [number, number, number][]));

  function pointerMove(currentCell: [number, number]) {
    if (currentCell[0] === lastCell[0] && currentCell[1] === lastCell[1])
      return;
    const nextChanges = onEnterCell(currentCell);
    store.dispatch(drawChanges(nextChanges as [number, number, number][]));
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

export function patternDesignView(
  openEditYarnModal: (id: string, name: string, color: ColorRGB) => void,
  openAddYarnModal: (callback: (color: ColorRGB) => void) => void,
) {
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
          ${getFairisleYarnPalette(openEditYarnModal, openAddYarnModal)}`
        : null}
    </div>
  `;
}
