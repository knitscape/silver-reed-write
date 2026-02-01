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
const byte CMD_SET_ROW = 0x02;        // Command to set row data (host -> device)
const byte MSG_ROW_COMPLETE = 0x03;   // Message indicating carriage exited CAMS range (device -> host)
const byte MSG_ENTER_CAMS = 0x04;
const byte MSG_CHANGE_DIRECTION = 0x05;
const byte MSG_ERROR = 0x06;


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
bool risingEdgeSeen = false;

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
      Serial.println("SAFETY: Turned OUT off.");
      outOnSince = 0;
    }
  }
}

void processSerial() {
  // Check for timeout in any waiting state
  if (serialState != SERIAL_IDLE) {
    if (millis() - serialTimeout >= SERIAL_TIMEOUT_MS) {
      Serial.println("ERROR: Serial timeout, resetting state");
      // Flush stale bytes to prevent desync
      int flushed = 0;
      while (Serial.available() > 0) {
        Serial.read();
        flushed++;
      }
      if (flushed > 0) {
        Serial.print("Flushed ");
        Serial.print(flushed);
        Serial.println(" stale bytes");
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
        } else {
          // Unknown command, ignore
          Serial.print("Unknown command: 0x");
          Serial.println(cmd, HEX);
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
        Serial.println("ERROR: Pattern too long");
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
        
        // Read packed bytes directly into pattern array
        for (int i = 0; i < packedLength; i++) {
          pattern[i] = Serial.read();
        }
        
        patternLength = expectedLength;
        patternReady = true;
        
        Serial.print("Received pattern, length=");
        Serial.print(expectedLength);
        Serial.print(" (");
        Serial.print(packedLength);
        Serial.print(" bytes): ");
        for (int i = 0; i < expectedLength; i++) {
          Serial.print(getNeedle(i));
        }
        Serial.println();
        
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
  Serial.println("Starting Arduino interface with web communication...");
  Serial.println("Waiting for pattern data...");
}

void loop() {
  // Process incoming serial data
  processSerial();
  
  int currentCams = digitalRead(CAMS_PIN);
  int currentDirection = digitalRead(DIRECTION_PIN);
  int currentClock = digitalRead(CLOCK_PIN);

  if (currentDirection == HIGH && lastDirectionState == LOW) {
    Serial.println("Moving LEFT");
  }

  if (currentDirection == LOW && lastDirectionState == HIGH) {
    Serial.println("Moving RIGHT");
  }

  // Check for CAMS rising edge (entering knitting range)
  if (currentCams == HIGH && lastCamsState == LOW) {
    needleCount = 0;
    risingEdgeSeen = false;
    
    if (!patternReady) {
      Serial.println("WARNING: No pattern ready, skipping row");
    }
  }

  // Check for CAMS falling edge (exiting knitting range)
  if (currentCams == LOW && lastCamsState == HIGH) {
    Serial.print("Finished row, saw ");
    Serial.print(needleCount);
    Serial.println(" needles");
    setOut(LOW);
    
    // Send row complete message to frontend
    Serial.write(MSG_ROW_COMPLETE);
    
    // Reset pattern ready flag to wait for next row
    patternReady = false;
  }

  if (currentCams == HIGH && patternReady) {  // Only process when in CAMS range and pattern is ready
    if (currentClock == HIGH && lastClockState == LOW) {  // Rising edge
      risingEdgeSeen = true;

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

    } else if (currentClock == LOW && lastClockState == HIGH) {  // Falling edge
      // Increment needle count if we've already seen the rising edge
      if (risingEdgeSeen) {
        needleCount++;
      }
    }
  }

  lastCamsState = currentCams;
  lastDirectionState = currentDirection;
  lastClockState = currentClock;

  // Safety check: turn off OUT if it's been on too long
  checkOutSafety();
}
