import { html } from "lit-html";
import { store } from "../store";
import { setPatternConfig, setKnittingState } from "./knittingSlice";

export function patternConfigView() {
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
