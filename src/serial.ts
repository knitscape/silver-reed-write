import { store } from "./store";
import { advanceRow, setKnittingState } from "./slice";
import { selectCurrentRow } from "./selectors";

// Binary protocol constants
const CMD_SET_ROW = 0x02; // Command to set row data (host -> device)
const MSG_ROW_COMPLETE = 0x03; // Message indicating carriage exited CAMS range (device -> host)

let port: any = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let reading = false;
let readBuffer = new Uint8Array(0);
let writeInProgress = false;
let processingRowComplete = false;

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
        // Append to buffer
        const newBuffer = new Uint8Array(readBuffer.length + value.length);
        newBuffer.set(readBuffer);
        newBuffer.set(value, readBuffer.length);
        readBuffer = newBuffer;

        // Process complete messages
        while (readBuffer.length >= 1) {
          const msgType = readBuffer[0];

          if (msgType === MSG_ROW_COMPLETE) {
            // Row complete message (1 byte)
            if (!processingRowComplete) {
              handleRowComplete();
            }
            // Silently skip duplicate row complete messages (they can happen due to timing)
            readBuffer = readBuffer.slice(1);
          } else {
            // Unknown message type or incomplete message, skip one byte
            readBuffer = readBuffer.slice(1);
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
      const currentRowNum = appState.knittingState.currentRowNumber;
      const currentSide = appState.knittingState.carriageSide;
      // Toggle carriage side: left -> right, right -> left
      const newSide = currentSide === "left" ? "right" : "left";
      console.log(
        `[ROW_COMPLETE] Row ${currentRowNum} complete, toggling carriage side from ${currentSide} to ${newSide}`
      );
      // Update carriage side first, then advance row
      store.dispatch(
        setKnittingState({
          ...appState.knittingState,
          carriageSide: newSide,
        })
      );
      store.dispatch(advanceRow());
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
