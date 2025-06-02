let port;
let reader;
let writer;
let reading = false;
import { store } from "./store";
import { setMachineState, advanceRow } from "./slice";

async function connect() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    reader = port.readable.getReader();
    writer = port.writable.getWriter();
    startReading();
  } catch (error) {
    console.error("Error connecting to device:", error);
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
        for (let i = 0; i < value.length; i++) {
          const byte = value[i];
          const log = String.fromCharCode(byte);
          currentString += log;
          if (log === "\n") {
            try {
              const jsonData = JSON.parse(currentString);
              processJSON(jsonData);
            } catch (error) {
              console.error("Error parsing JSON string:", currentString);
            }
            currentString = "";
          }
        }
      }
    } catch (error) {
      console.error("Error reading from device:", error);
      break;
    }
  }
}

async function writeJSON(jsonData) {
  if (!writer) {
    console.error("Not connected to device");
    return;
  }
  try {
    console.debug("Sending message:", jsonData);
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(JSON.stringify(jsonData));
    await writer.write(encodedMessage);
  } catch (error) {
    console.error("Error writing to device:", error);
  }
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

export async function writePatternRow(row) {
  const rowData = {
    msg_type: "row",
    row: row,
  };
  console.log("Writing row:", rowData);
  await serial.writeJSON(rowData);
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

async function processState(jsonData) {
  const state = store.getState();

  store.dispatch(
    setMachineState({
      ...state.machineState,
      carriageSide: jsonData.direction,
    })
  );

  if (state.knittingState.patterning) {
    store.dispatch(advanceRow());
  }
}

export const serial = {
  connect,
  disconnect,
  connected: () => (port ? true : false),
  writeJSON,
};
