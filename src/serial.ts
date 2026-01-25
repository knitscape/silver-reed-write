import { store } from "./store";
import { setKnittingState } from "./slice";
import { selectCurrentRow } from "./selectors";

// Binary protocol constants
const CMD_SET_ROW = 0x02; // Command to set row data (host -> device)
const MSG_ROW_COMPLETE = 0x03; // Message indicating carriage exited CAMS range (device -> host)

let port: any = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let reading = false;
let readBuffer = new Uint8Array(0);
let textBuffer = ""; // Buffer for accumulating text from Serial.println()
let writeInProgress = false;
let processingRowComplete = false;

// Track previous state for detecting changes
let prevPatterning = false;
let prevCurrentRowNumber = 0;
let prevCarriageSide = "left";

// Subscribe to store changes to send rows when needed
store.subscribe(() => {
  const state = store.getState();
  const { patterning, currentRowNumber, carriageSide } = state.knittingState;

  // Check if we need to send a row
  const patterningJustStarted = patterning && !prevPatterning;
  const rowOrSideChanged =
    patterning &&
    (currentRowNumber !== prevCurrentRowNumber ||
      carriageSide !== prevCarriageSide);

  if (patterningJustStarted || rowOrSideChanged) {
    // Send the current row to the device
    const row = selectCurrentRow(state);
    if (row.length > 0 && port) {
      console.log(
        `Sending row ${currentRowNumber} (side: ${carriageSide}):`,
        row,
      );
      writePatternRow(row);
    }
  }

  // Update previous state
  prevPatterning = patterning;
  prevCurrentRowNumber = currentRowNumber;
  prevCarriageSide = carriageSide;
});

async function connect() {
  try {
    // @ts-ignore
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    reader = port.readable!.getReader();
    writer = port.writable!.getWriter();
    readBuffer = new Uint8Array(0);
    writeInProgress = false;
    startReading();
  } catch (error) {
    console.error("Error connecting to device:", error);
  }
}

async function startReading() {
  if (!reader) return;
  reading = true;

  while (reading) {
    try {
      const { value, done } = await reader.read();
      if (done) {
        console.log("Reader stream closed");
        reader.releaseLock();
        break;
      }

      if (value) {
        // Process each byte
        for (let i = 0; i < value.length; i++) {
          const byte = value[i];

          // Check if it's a protocol message
          if (byte === MSG_ROW_COMPLETE) {
            // Row complete message (1 byte)
            if (!processingRowComplete) {
              handleRowComplete();
            }
          } else if (byte === CMD_SET_ROW) {
            // Shouldn't receive this from device, but handle gracefully
            console.warn("Received CMD_SET_ROW from device (unexpected)");
          } else {
            // Treat as text character
            if (byte === 0x0a || byte === 0x0d) {
              // Newline or carriage return - log accumulated text
              if (textBuffer.length > 0) {
                console.log(`[ARDUINO] ${textBuffer}`);
                textBuffer = "";
              }
            } else if (byte >= 0x20 && byte <= 0x7e) {
              // Printable ASCII character
              textBuffer += String.fromCharCode(byte);
            }
            // Ignore other control characters
          }
        }
      }
    } catch (error) {
      console.error("Error reading from device:", error);
      break;
    }
  }

  handleDisconnect();
}

async function handleRowComplete() {
  if (processingRowComplete) {
    // Already processing a row complete, ignore duplicate
    return;
  }

  processingRowComplete = true;
  try {
    const appState = store.getState();
    if (appState.knittingState.patterning) {
      const currentSide = appState.knittingState.carriageSide;
      // Toggle carriage side: left -> right, right -> left
      const newSide = currentSide === "left" ? "right" : "left";

      // Calculate next row number
      let nextRowNumber = appState.knittingState.currentRowNumber + 1;
      const patternHeight = appState.patternConfig.height;
      if (nextRowNumber >= patternHeight) {
        nextRowNumber = 0;
      }

      // Update both carriage side and row number in a single dispatch
      // This ensures the store subscription only fires once with the correct state
      store.dispatch(
        setKnittingState({
          ...appState.knittingState,
          carriageSide: newSide,
          currentRowNumber: nextRowNumber,
        }),
      );

      // Wait a bit to ensure the row send completes before processing next message
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } finally {
    processingRowComplete = false;
  }
}

async function sendRow(pattern: number[]) {
  if (!port || !port.writable || !writer) {
    console.error("Not connected to device");
    return;
  }

  const length = pattern.length;
  if (length > 200) {
    console.error("Row too long, max 200");
    return;
  }

  // Build binary message: [CMD_SET_ROW, length, ...pattern]
  const msg = new Uint8Array(2 + length);
  msg[0] = CMD_SET_ROW;
  msg[1] = length;
  msg.set(pattern, 2);

  // Wait for any in-progress write to complete
  while (writeInProgress) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  try {
    writeInProgress = true;
    await writer.write(msg);
  } catch (error) {
    console.error("Error writing to device:", error);
  } finally {
    writeInProgress = false;
  }
}

function handleDisconnect() {
  reading = false;
  reader = null;
  writer = null;
  port = null;
  readBuffer = new Uint8Array(0);
  textBuffer = "";
  writeInProgress = false;
  processingRowComplete = false;
}

async function disconnect() {
  reading = false;
  try {
    if (reader) {
      await reader.cancel();
      reader.releaseLock();
      reader = null;
    }
    if (writer) {
      // Wait for any pending write to complete
      while (writeInProgress) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      writer.releaseLock();
      writer = null;
    }
    if (port) {
      await port.close();
      port = null;
    }
  } catch (error) {
    console.error("Error during disconnect:", error);
  }
  handleDisconnect();
}

export async function writePatternRow(row: number[]) {
  if (row.length === 0) {
    console.error("ERROR: Attempting to send empty row!");
    return;
  }
  // Make sure we send a copy, not a reference
  await sendRow([...row]);
}

export const serial = {
  connect,
  disconnect,
  connected: () => (port ? true : false),
};
