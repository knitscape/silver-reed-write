let port;
let reader;
let writer;
let reading = false;

async function connect(msgCb) {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    reader = port.readable.getReader();
    writer = port.writable.getWriter();
    startReading(msgCb);
  } catch (error) {
    console.error("Error connecting to device:", error);
  }
}

async function startReading(msgCb) {
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
              msgCb(jsonData);
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

export const serial = {
  connect,
  disconnect,
  connected: () => (port ? true : false),
  writeJSON,
};

export async function writePatternRow(row) {
  const rowData = {
    msg_type: "row",
    row: row,
  };
  await serial.writeJSON(rowData);
}
