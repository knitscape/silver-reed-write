import { html, render } from "lit-html";
import { serial } from "./serial.js";

const GLOBAL_STATE = {
  pattern: generateDiagonalPattern(),
  carriage_side: "left",
  current_row: 0,
  pattern_width: 0,
};

function generateDiagonalPattern() {
  const pattern = [];
  const width = 20;
  const height = 20;

  for (let row = 0; row < height; row++) {
    const rowPattern = [];
    for (let col = 0; col < width; col++) {
      // Creates diagonal stripes by checking if the sum of row and col
      // divided by a stripe width (3) is even or odd
      rowPattern.push((row + col) % 3 === 0 ? 1 : 0);
    }
    pattern.push(rowPattern);
  }
  return pattern;
}

function drawPattern() {
  const pattern = GLOBAL_STATE.pattern;

  // Create a canvas element to display the pattern
  const canvas = document.getElementById("pattern-canvas");
  canvas.width = pattern[0].length;
  canvas.height = pattern.length;
  const ctx = canvas.getContext("2d");

  // Clear the canvas before drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the pattern - black for 0, white for 1
  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      ctx.fillStyle = pattern[row][col] === 0 ? "black" : "white";
      ctx.fillRect(col, row, 1, 1);
    }
  }

  // Highlight the current row
  if (
    GLOBAL_STATE.current_row >= 0 &&
    GLOBAL_STATE.current_row < pattern.length
  ) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)"; // Semi-transparent red
    ctx.fillRect(0, GLOBAL_STATE.current_row, pattern[0].length, 1);
  }
}

async function processState(jsonData) {
  console.log("processState", jsonData);
  GLOBAL_STATE.carriage_side = jsonData.direction;
  GLOBAL_STATE.pattern_width = jsonData.cam_width;

  // increment the current row
  GLOBAL_STATE.current_row = GLOBAL_STATE.current_row + 1;
  if (GLOBAL_STATE.current_row >= GLOBAL_STATE.pattern.length) {
    GLOBAL_STATE.current_row = 0; // wrap around to the first row
  }

  await writePatternRow(); // write the current row to the machine
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

async function writePatternRow() {
  let row = GLOBAL_STATE.pattern[GLOBAL_STATE.current_row];
  if (GLOBAL_STATE.carriage_side === "right") {
    row = row.toReversed();
  }

  const rowData = {
    msg_type: "row",
    row: row,
  };
  await serial.writeJSON(rowData);
}

function miscUI() {
  return html` <div class="pattern-controls">
      <span>Row: ${GLOBAL_STATE.current_row}</span>
      <span>Side: ${GLOBAL_STATE.carriage_side}</span>
      <button
        @click=${() => writePatternRow()}
        ?disabled=${!serial.connected()}
        class="btn btn-xs btn-primary">
        Knit!
      </button>
    </div>
    <div id="pattern-display" class="p-4">
      <canvas id="pattern-canvas" class="w-full h-full"></canvas>
    </div>`;
}

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

function mainUI() {
  return html`
    <div>
      <div
        class="bg-primary text-primary-content flex items-center shadow-sm gap-1 p-1">
        <span class="font-bold">Silver Reed/Write Controller</span>
        <div class="flex-1"></div>
        ${serial.connected() ? connectedBtns : disconnectedBtns}
      </div>
      ${miscUI()}
    </div>
  `;
}

function r() {
  render(mainUI(), document.body);
  window.requestAnimationFrame(r);
}

document.addEventListener("DOMContentLoaded", () => {
  r();
  console.log(GLOBAL_STATE.pattern);
  drawPattern();
});
