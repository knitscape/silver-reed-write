import { store } from "../store";
import { setKnittingState } from "./knittingSlice";
import { selectCurrentRow, selectComputedPattern } from "../selectors";

// Communication protocol constants
// Commands (host -> device)
const CMD_SET_ROW = 0x02; // Set row data: [CMD, length, packed_data...]
const CMD_CLEAR_ROW = 0x03; // Clear current row pattern

// Messages (device -> host)
const MSG_ACK_ROW = 0x04; // Acknowledge row data received: [MSG, length]
const MSG_ENTER_CAMS = 0x05; // Carriage entered CAMS range
const MSG_EXIT_CAMS = 0x06; // Carriage exited CAMS range, row complete
const MSG_CHANGE_DIRECTION = 0x07; // Direction changed: [MSG, direction]
const MSG_STRING = 0x08; // String message: [MSG, type, length, message...]
const MSG_NEEDLE = 0x09; // Needle detected: [MSG, needle_index]

// Direction values
const DIR_RIGHT = 0x00;
const DIR_LEFT = 0x01;

// String message types
const STRING_INFO = 0x00;
const STRING_ERROR = 0x01;

// Receive state machine
enum ReceiveState {
  IDLE,
  WAITING_ACK_LENGTH,
  WAITING_DIRECTION,
  WAITING_STRING_TYPE,
  WAITING_STRING_LENGTH,
  WAITING_STRING_DATA,
  WAITING_NEEDLE_INDEX,
  WAITING_EXIT_CAMS_COUNT,
}

let port: any = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let reading = false;
let readBuffer = new Uint8Array(0);
let writeInProgress = false;
let processingRowComplete = false;

// State machine variables
let receiveState = ReceiveState.IDLE;
let stringType = 0; // For MSG_STRING type byte
let expectedLength = 0; // For variable-length messages
let messageBuffer = ""; // For accumulating message bytes

// Track previous state for detecting changes
let prevPatterning = false;
let prevCurrentRowNumber = 0;
let prevCarriageSide = "left";

// Subscribe to store changes to send rows when needed
store.subscribe(() => {
  const state = store.getState();
  const { patterning, currentRowNumber, carriageSide } =
    state.knitting.knittingState;

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
      console.debug(
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

          switch (receiveState) {
            case ReceiveState.WAITING_ACK_LENGTH:
              console.log(
                `[CONTROLLER] Row acknowledged by device, length=${byte}`,
              );
              receiveState = ReceiveState.IDLE;
              continue;

            case ReceiveState.WAITING_DIRECTION:
              console.log(
                `[CONTROLLER] Direction changed: ${
                  byte === DIR_LEFT ? "LEFT" : "RIGHT"
                }`,
              );
              receiveState = ReceiveState.IDLE;
              continue;

            case ReceiveState.WAITING_STRING_TYPE:
              stringType = byte;
              receiveState = ReceiveState.WAITING_STRING_LENGTH;
              continue;

            case ReceiveState.WAITING_STRING_LENGTH:
              expectedLength = byte;
              messageBuffer = "";
              receiveState = ReceiveState.WAITING_STRING_DATA;
              continue;

            case ReceiveState.WAITING_STRING_DATA:
              messageBuffer += String.fromCharCode(byte);
              if (messageBuffer.length >= expectedLength) {
                if (stringType === STRING_ERROR) {
                  console.error(`[DEVICE ERROR] ${messageBuffer}`);
                  alert(`Device Error: ${messageBuffer}`);
                } else {
                  console.log(`[DEVICE] ${messageBuffer}`);
                }
                receiveState = ReceiveState.IDLE;
              }
              continue;

            case ReceiveState.WAITING_NEEDLE_INDEX:
              console.log(`[CONTROLLER] Needle: ${byte}`);
              receiveState = ReceiveState.IDLE;
              continue;

            case ReceiveState.WAITING_EXIT_CAMS_COUNT:
              const lastNeedleCount = byte;
              console.log(
                `[CONTROLLER] Exited CAMS range, needle count: ${lastNeedleCount}`,
              );

              if (!processingRowComplete) {
                handleRowComplete();
              }
              receiveState = ReceiveState.IDLE;
              continue;

            case ReceiveState.IDLE:
              // Handle message type detection
              switch (byte) {
                case MSG_EXIT_CAMS:
                  receiveState = ReceiveState.WAITING_EXIT_CAMS_COUNT;
                  break;
                case MSG_ACK_ROW:
                  receiveState = ReceiveState.WAITING_ACK_LENGTH;
                  break;
                case MSG_CHANGE_DIRECTION:
                  receiveState = ReceiveState.WAITING_DIRECTION;
                  break;
                case MSG_ENTER_CAMS:
                  console.log("[CONTROLLER] Entered CAMS range");
                  break;
                case MSG_STRING:
                  receiveState = ReceiveState.WAITING_STRING_TYPE;
                  break;
                case MSG_NEEDLE:
                  receiveState = ReceiveState.WAITING_NEEDLE_INDEX;
                  break;
                case CMD_SET_ROW:
                case CMD_CLEAR_ROW:
                  console.warn(
                    `Received command 0x${byte.toString(
                      16,
                    )} from device (unexpected)`,
                  );
                  break;
                default:
                  // Unexpected byte - protocol error
                  console.warn(`Unexpected byte: 0x${byte.toString(16)}`);
                  break;
              }
              break;
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
    if (appState.knitting.knittingState.patterning) {
      const currentSide = appState.knitting.knittingState.carriageSide;
      // Toggle carriage side: left -> right, right -> left
      const newSide = currentSide === "left" ? "right" : "left";

      // Calculate next row number
      let nextRowNumber = appState.knitting.knittingState.currentRowNumber + 1;
      const patternHeight = selectComputedPattern(appState).height;
      if (nextRowNumber >= patternHeight) {
        nextRowNumber = 0;
      }

      // Update carriage side, row number, and increment total rows
      store.dispatch(
        setKnittingState({
          ...appState.knitting.knittingState,
          carriageSide: newSide,
          currentRowNumber: nextRowNumber,
          totalRows: appState.knitting.knittingState.totalRows + 1,
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

  const needleCount = pattern.length;
  if (needleCount > 200) {
    console.error("Row too long, max 200");
    return;
  }

  // Pack 8 needles per byte (LSB first: needle 0 = bit 0)
  const packedLength = Math.ceil(needleCount / 8);
  const msg = new Uint8Array(2 + packedLength);
  msg[0] = CMD_SET_ROW;
  msg[1] = needleCount; // Send actual needle count for unpacking

  for (let i = 0; i < needleCount; i++) {
    if (pattern[i] === 1) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      msg[2 + byteIndex] |= 1 << bitIndex;
    }
  }

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
  receiveState = ReceiveState.IDLE;
  stringType = 0;
  expectedLength = 0;
  messageBuffer = "";
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
  await sendRow([...row]);
}

export const serial = {
  connect,
  disconnect,
  connected: () => (port ? true : false),
};
