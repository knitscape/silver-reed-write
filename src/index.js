import { html, render } from "lit-html";
import { serial } from "./serial.js";

let ledStatus = "Unknown";
let lastRow = [];

function generateRandomPattern() {
  const pattern = [];
  for (let i = 0; i < 200; i++) {
    pattern.push(Math.round(Math.random()));
  }
  return pattern;
}

function displayPattern(pattern) {
  // Create a canvas element to display the pattern
  const canvas = document.createElement("canvas");
  console.log("pattern", pattern);
  canvas.width = pattern.length;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");

  // Draw the pattern - black for 0, white for 1
  for (let i = 0; i < pattern.length; i++) {
    ctx.fillStyle = pattern[i] === 0 ? "black" : "white";
    ctx.fillRect(i, 0, 1, 1);
  }

  // Update or create the image display
  const patternDisplay = document.getElementById("pattern-display");
  patternDisplay.appendChild(canvas);
}

function processState(jsonData) {
  console.log("processState", jsonData);
  ledStatus = jsonData.led === 0 ? "ON" : "OFF";
  lastRow = jsonData.last_row;
  displayPattern(lastRow);
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
  const rowData = { msg_type: "row", row: generateRandomPattern() };
  await serial.writeJSON(rowData);
}

async function toggleLED(state) {
  const ledData = { msg_type: "led", state: state };
  await serial.writeJSON(ledData);
}

function miscUI() {
  return html`<div id="led-status">${ledStatus}</div>
    <div class="led-controls">
      <button
        @click=${() => toggleLED("ON")}
        ?disabled=${!serial.connected()}
        class="btn btn-xs btn-accent">
        Turn LED ON
      </button>
      <button
        @click=${() => toggleLED("OFF")}
        ?disabled=${!serial.connected()}
        class="btn btn-xs btn-accent">
        Turn LED OFF
      </button>
    </div>
    <div class="pattern-controls">
      <button
        @click=${() => writePatternRow()}
        ?disabled=${!serial.connected()}
        class="btn btn-xs btn-primary">
        Write Pattern Row
      </button>
    </div>
    <div id="pattern-display"></div>`;
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
});
