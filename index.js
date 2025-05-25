import { html, render } from "lit-html";

let port;
let reader;
let writer;
let reading = false;
let ledStatus = "Unknown";

async function connectToDevice() {
  try {
    // Request port with specific filters if needed
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 }); // Match ESP8266 baud rate

    // const textDecoder = new TextDecoderStream();
    // port.readable.pipeTo(textDecoder.writable);
    reader = port.readable.getReader();

    //const textEncoder = new TextEncoderStream();
    // textEncoder.readable.pipeTo(port.writable);
    writer = port.writable.getWriter();

    startReading();
    return true;
  } catch (error) {
    console.error("Error connecting to device:", error);
    return false;
  }
}

async function startReading() {
  reading = true;
  let currentString = "";
  while (reading) {
    try {
      const { value, done } = await reader.read();
      if (done) {
        console.log("Reader stream closed");
        reader.releaseLock();
        break;
      }

      if (value) {
        console.log("received value:", value);
        for (let i = 0; i < value.length; i++) {
          const byte = value[i];
          console.log("byte:", byte, typeof byte);
          const log = String.fromCharCode(byte);
          currentString += log;
          if (log === "\n") {
            console.log("received:", currentString);
            currentString = "";
          }
        }
      }

      // Handle received data
      // const message = value.trim();
      // console.log("received:", value);
      // if (message.startsWith("Status:")) {
      // ledStatus = message;
      // }
    } catch (error) {
      console.error("Error reading from device:", error);
      break;
    }
  }
}

async function writeToDevice() {
  if (!writer) {
    console.error("Not connected to device");
    return;
  }
  try {
    const message = "t\r\n";
    console.log("Sending message:", message);
    // Convert string to Uint8Array for proper serial transmission
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(message);
    console.log("encodedMessage:", encodedMessage);
    await writer.write(encodedMessage);
    console.log("Message sent successfully");
  } catch (error) {
    console.error("Error writing to device:", error);
  }
}

async function toggleLED(state) {
  await writeToDevice();
  // Add a small delay to ensure message is processed
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function disconnect() {
  reading = false;
  try {
    if (reader) {
      await reader.cancel();
      await reader.releaseLock();
      reader = null;
    }
    if (writer) {
      await writer.close();
      writer = null;
    }
    if (port) {
      await port.close();
      port = null;
    }
  } catch (error) {
    console.error("Error during disconnect:", error);
  }
}

function r() {
  render(
    html`
      <div>
        <h1>Silver Reed/Write Controller</h1>
        <button @click=${connectToDevice}>Connect to Device</button>
        <button @click=${disconnect}>Disconnect</button>
        <div id="status">Status: ${port ? "Connected" : "Disconnected"}</div>
        <div id="led-status">${ledStatus}</div>
        <div class="led-controls">
          <button @click=${() => toggleLED("ON")} ?disabled=${!port}>
            Turn LED ON
          </button>
          <button @click=${() => toggleLED("OFF")} ?disabled=${!port}>
            Turn LED OFF
          </button>
        </div>
      </div>
    `,
    document.body
  );
  window.requestAnimationFrame(r);
}

function init() {
  r();
}

document.addEventListener("DOMContentLoaded", init);
