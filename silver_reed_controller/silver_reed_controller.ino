// Pin definitions for the Seeed XIAO RP2040 board
// const int ND1 = 3;          // (DIN 1) ND1: Needle 1, sets the position of the pattern
const int CAMS_PIN = 4;        // (DIN 2) KSL: Point Cam. High = in knitting range
const int OUT_PIN = 28;        // (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
const int CLOCK_PIN = 27;      // (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
const int DIRECTION_PIN = 26;  // (DIN 5) HOK: Carriage Direction. Low = to right, high = to left
// (DIN 6) 16v: Power the solenoids
// (DIN 7) 5v: Supplies the logic in the carriage
// (DIN 8) GND: Ground

// Protocol constants
// Commands (host -> device)
const byte CMD_SET_ROW = 0x02;        // Set row data: [CMD, length, packed_data...]
const byte CMD_CLEAR_ROW = 0x03;      // Clear current row pattern

// Messages (device -> host)
const byte MSG_ACK_ROW = 0x04;        // Acknowledge row data received: [MSG, length]
const byte MSG_ENTER_CAMS = 0x05;     // Carriage entered CAMS range
const byte MSG_EXIT_CAMS = 0x06;      // Carriage exited CAMS range, row complete
const byte MSG_CHANGE_DIRECTION = 0x07; // Direction changed: [MSG, direction]
const byte MSG_STRING = 0x08;         // String message: [MSG, type, length, message...]
const byte MSG_NEEDLE = 0x09;         // Needle detected: [MSG, needle_index]

// Direction values
const byte DIR_RIGHT = 0x00;
const byte DIR_LEFT = 0x01;

// String message types
const byte STRING_INFO = 0x00;
const byte STRING_ERROR = 0x01;


// Pattern storage (packed: 8 needles per byte)
const int MAX_NEEDLE_COUNT = 200;
const int MAX_PACKED_BYTES = 25;  // ceil(200/8)
byte pattern[MAX_PACKED_BYTES];
int patternLength = 0;  // Actual needle count
bool patternReady = false;

// Extract a single needle state from packed pattern (LSB first)
inline bool getNeedle(int index) {
  return (pattern[index / 8] >> (index % 8)) & 1;
}

// State variables
int needleCount = 0;
bool lastClockState = LOW;
bool lastCamsState = LOW;
bool lastDirectionState = LOW;

// Serial state machine
enum SerialState { SERIAL_IDLE, SERIAL_WAITING_LENGTH, SERIAL_WAITING_DATA };
SerialState serialState = SERIAL_IDLE;
byte expectedLength = 0;
unsigned long serialTimeout = 0;
const unsigned long SERIAL_TIMEOUT_MS = 1000;  // 1 second timeout

// Safety: track how long OUT solenoid has been on
unsigned long outOnSince = 0;              // millis() when OUT was turned on, 0 if off
const unsigned long OUT_MAX_ON_MS = 3000;  // Maximum time OUT can stay on (3 seconds)

void setOut(int value) {
  digitalWrite(OUT_PIN, value);
  if (value == HIGH) {
    if (outOnSince == 0) {
      outOnSince = millis();
    }
  } else {
    outOnSince = 0;
  }
}

void checkOutSafety() {
  if (outOnSince > 0) {
    if (millis() - outOnSince >= OUT_MAX_ON_MS) {
      digitalWrite(OUT_PIN, LOW);
      sendInfo("SAFETY: Turned OUT off.");
      outOnSince = 0;
    }
  }
}

void sendString(byte type, const char* message) {
  byte len = strlen(message);
  Serial.write(MSG_STRING);
  Serial.write(type);
  Serial.write(len);
  Serial.write((const uint8_t*)message, len);
}

void sendError(const char* message) {
  sendString(STRING_ERROR, message);
}

void sendInfo(const char* message) {
  sendString(STRING_INFO, message);
}


void sendDirection(byte direction) {
  Serial.write(MSG_CHANGE_DIRECTION);
  Serial.write(direction);
}


void sendNeedle(byte needleIndex) {
  Serial.write(MSG_NEEDLE);
  Serial.write(needleIndex);
}

void sendAckRow(byte length) {
  Serial.write(MSG_ACK_ROW);
  Serial.write(length);
}

void sendEnterCams() {
  Serial.write(MSG_ENTER_CAMS);
}

void sendExitCams() {
  Serial.write(MSG_EXIT_CAMS);
}


void processSerial() {
  // Check for timeout in any waiting state
  if (serialState != SERIAL_IDLE) {
    if (millis() - serialTimeout >= SERIAL_TIMEOUT_MS) {
      sendError("Serial timeout");
      // Flush stale bytes to prevent desync
      int flushed = 0;
      while (Serial.available() > 0) {
        Serial.read();
        flushed++;
      }
      if (flushed > 0) {
        sendInfo("Flushed stale bytes");
      }
      serialState = SERIAL_IDLE;
      return;
    }
  }

  switch (serialState) {
    case SERIAL_IDLE:
      // Check if command byte is available
      if (Serial.available() < 1) {
        return;
      }
      
      {
        byte cmd = Serial.read();
        
        if (cmd == CMD_SET_ROW) {
          serialState = SERIAL_WAITING_LENGTH;
          serialTimeout = millis();
        } else if (cmd == CMD_CLEAR_ROW) {
          patternReady = false;
          patternLength = 0;
          sendInfo("Pattern cleared");
        } else {
          // Unknown command, ignore
          sendError("Unknown command");
        }
      }
      break;

    case SERIAL_WAITING_LENGTH:
      // Check if length byte is available
      if (Serial.available() < 1) {
        return;
      }
      
      expectedLength = Serial.read();
      
      if (expectedLength > MAX_NEEDLE_COUNT) {
        sendError("Pattern too long");
        // Flush any available bytes
        while (Serial.available() > 0) {
          Serial.read();
        }
        serialState = SERIAL_IDLE;
        return;
      }
      
      serialState = SERIAL_WAITING_DATA;
      serialTimeout = millis();
      break;

    case SERIAL_WAITING_DATA:
      {
        // Calculate packed byte count (8 needles per byte)
        int packedLength = (expectedLength + 7) / 8;
        
        // Check if all packed bytes are available
        if (Serial.available() < packedLength) {
          return;
        }
        
        // Read packed bytes into pattern array
        for (int i = 0; i < packedLength; i++) {
          pattern[i] = Serial.read();
        }
        
        patternLength = expectedLength;
        patternReady = true;
        
        sendAckRow(expectedLength);
        
        serialState = SERIAL_IDLE;
      }
      break;
  }
}

void setup() {
  pinMode(CAMS_PIN, INPUT);
  pinMode(CLOCK_PIN, INPUT);
  pinMode(DIRECTION_PIN, INPUT);
  pinMode(OUT_PIN, OUTPUT);

  setOut(LOW);

  lastClockState = digitalRead(CLOCK_PIN);
  lastCamsState = digitalRead(CAMS_PIN);
  lastDirectionState = digitalRead(DIRECTION_PIN);

  Serial.begin(115200);
  sendInfo("Starting Arduino interface with web communication...");
  sendInfo("Waiting for pattern data...");
}

void loop() {
  processSerial();
  
  int currentCams = digitalRead(CAMS_PIN);
  int currentDirection = digitalRead(DIRECTION_PIN);
  int currentClock = digitalRead(CLOCK_PIN);

  if (currentDirection != lastDirectionState) {
    sendDirection(currentDirection == HIGH ? DIR_LEFT : DIR_RIGHT);
  }

  // Check for CAMS rising edge (entering knitting range)
  if (currentCams == HIGH && lastCamsState == LOW) {
    sendEnterCams();
    needleCount = 0;
    
    if (!patternReady) {
      sendError("No pattern ready");
    }
  }

  // Check for CAMS falling edge (exiting knitting range)
  if (currentCams == LOW && lastCamsState == HIGH) {
    char buf[40];
    snprintf(buf, sizeof(buf), "Finished row, saw %d needles", needleCount);
    sendInfo(buf);
    setOut(LOW);
    
    sendExitCams();
    patternReady = false;
  }

  if (currentCams == HIGH && patternReady) {  // Only process when in CAMS range and pattern is ready
    if (currentClock == HIGH && lastClockState == LOW) {  // Rising edge
      needleCount++;

      sendNeedle(needleCount);

      if (needleCount < patternLength) {
        if (getNeedle(needleCount)) {
          setOut(HIGH);
        } else {
          setOut(LOW);
        }
      } else {
        // Done with row, turn off solenoid
        setOut(LOW);
      }

    }
  }

  lastCamsState = currentCams;
  lastDirectionState = currentDirection;
  lastClockState = currentClock;

  // Safety check: turn off OUT if it's been on too long
  checkOutSafety();
}
