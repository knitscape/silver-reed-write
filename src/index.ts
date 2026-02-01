import { html, render } from "lit-html";
import { store } from "./store";

import { setMode } from "./appSlice";
import { patternConfigView } from "./interactive-knitting/patternConfigView";
import { interactiveKnittingView } from "./interactive-knitting/interactiveKnittingView";
import { patternDesignView } from "./pattern-design/designView";
import { ColorRGB, hexToRgb, rgbToHex } from "./common/color";
import { drawDesignPattern } from "./pattern-design/drawDesign";
import { drawComputedPattern } from "./interactive-knitting/drawComputed";
import { selectComputedPattern } from "./selectors";
import { addYarn, updateYarn, removeYarn } from "./yarnLibrary";

// Add Yarn Modal state
let addYarnModalOpen = false;
let addYarnModalCallback: ((color: ColorRGB) => void) | null = null;
let addYarnModalName = "";
let addYarnModalColor = "#ffffff";

function openAddYarnModal(callback: (color: ColorRGB) => void) {
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

function openEditYarnModal(id: string, name: string, color: ColorRGB) {
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

function mainContent() {
  const mode = store.getState().app.mode;
  if (mode === "design") {
    return patternDesignView(openEditYarnModal, openAddYarnModal);
  }
  return html`
    <div class="flex flex-1 flex-row overflow-hidden min-h-0">
      ${patternConfigView()}
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">
        ${interactiveKnittingView()}
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
