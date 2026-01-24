// Knitting Machine Interface with Web Communication (Arduino C version)

// Pin definitions (using the same GPIO numbers as the MicroPython version)
// const int ND1 = 3;             // (DIN 1) ND1: Needle 1, sets the position of the pattern
const int CAMS_PIN = 4;        // (DIN 2) KSL: Point Cam. High = in knitting range
const int OUT_PIN = 28;        // (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
const int CLOCK_PIN = 27;      // (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
const int DIRECTION_PIN = 26;  // (DIN 5) HOK: Carriage Direction. Low = to right, high = to left
// (DIN 6) 16v: Power the solenoids
// (DIN 7) 5v: Supplies the logic on the board
// (DIN 8) GND: Ground

// Protocol constants
const byte CMD_SET_ROW = 0x02;      // Command to set row data (host -> device)
const byte MSG_ROW_COMPLETE = 0x03; // Message indicating carriage exited CAMS range (device -> host)

// Pattern storage
const int MAX_PATTERN_LENGTH = 200;
byte pattern[MAX_PATTERN_LENGTH];
int patternLength = 0;
bool patternReady = false;

// State variables
int needleCount = 0;
bool lastClockState = LOW;
bool lastCamsState = LOW;
bool lastND1State = LOW;
bool lastDirectionState = LOW;
bool risingEdgeSeen = false;

// Debouncing: require signal to be stable before detecting edge
unsigned long lastClockChangeTime = 0;  // When the clock last changed state
int stableClockState = LOW;             // The last stable clock state
const unsigned long STABLE_TIME_RIGHT_MS = 1; // Stability time for RIGHT direction (1ms)
const unsigned long STABLE_TIME_LEFT_MS = 3;  // Stability time for LEFT direction (3ms - needs more filtering)

// Safety: track how long OUT has been on
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
  // Check if data is available
  if (Serial.available() < 1) {
    return;
  }

  // Read the command byte
  byte cmd = Serial.read();
  
  if (cmd == CMD_SET_ROW) {
    // Wait for length byte
    while (Serial.available() < 1) {
      delay(1);
    }
    
    byte length = Serial.read();
    
    if (length > MAX_PATTERN_LENGTH) {
      Serial.println("ERROR: Pattern too long");
      // Flush remaining bytes
      while (Serial.available() > 0) {
        Serial.read();
      }
      return;
    }
    
    // Wait for all pattern bytes
    while (Serial.available() < length) {
      delay(1);
    }
    
    // Read pattern data
    for (int i = 0; i < length; i++) {
      pattern[i] = Serial.read();
    }
    
    patternLength = length;
    patternReady = true;
    
    Serial.print("Received pattern, length=");
    Serial.println(length);
    Serial.print("Pattern: ");
    for (int i = 0; i < length; i++) {
      Serial.print(pattern[i]);
    }
    Serial.println();
  } else {
    // Unknown command, ignore
    Serial.print("Unknown command: 0x");
    Serial.println(cmd, HEX);
  }
}

void setup() {
  pinMode(CAMS_PIN, INPUT_PULLUP);
  pinMode(CLOCK_PIN, INPUT_PULLUP);
  // pinMode(ND1, INPUT_PULLUP);
  pinMode(DIRECTION_PIN, INPUT_PULLUP);
  pinMode(OUT_PIN, OUTPUT);

  setOut(LOW);

  // Invert reads because we're using INPUT_PULLUP (active LOW)
  lastClockState = !digitalRead(CLOCK_PIN);
  lastCamsState = !digitalRead(CAMS_PIN);
  lastDirectionState = !digitalRead(DIRECTION_PIN);
  // lastND1State = digitalRead(ND1);

  Serial.begin(115200);
  Serial.println("Starting Arduino interface with web communication...");
  Serial.println("Waiting for pattern data...");
}

void loop() {
  // Process incoming serial data
  processSerial();
  
  // Invert reads because we're using INPUT_PULLUP (active LOW)
  int currentCams = !digitalRead(CAMS_PIN);
  int currentDirection = !digitalRead(DIRECTION_PIN);
  int currentClock = !digitalRead(CLOCK_PIN);

  if (currentDirection == HIGH && lastDirectionState == LOW) {
    Serial.println("Carriage started moving LEFT");
  }

  if (currentDirection == LOW && lastDirectionState == HIGH) {
    Serial.println("Carriage started moving RIGHT");
  }

  // Check for CAMS rising edge (entering knitting range)
  if (currentCams == HIGH && lastCamsState == LOW) {
    needleCount = 0;
    risingEdgeSeen = false;
    // Re-initialize clock state to prevent false edge detection
    lastClockState = !digitalRead(CLOCK_PIN);
    stableClockState = lastClockState;
    lastClockChangeTime = millis();
    
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
    unsigned long currentTime = millis();
    
    // Use direction-specific stability time
    // LEFT direction needs more filtering to avoid extra pulses
    unsigned long requiredStableTime = (currentDirection == LOW) ? STABLE_TIME_RIGHT_MS : STABLE_TIME_LEFT_MS;
    
    // Stability-based debouncing: signal must be stable for required time before we consider it changed
    // This filters out bouncing during slow transitions without blocking fast legitimate edges
    
    if (currentClock != stableClockState) {
      // Signal differs from stable state - check if it's been stable long enough
      unsigned long timeSinceChange = currentTime - lastClockChangeTime;
      
      if (timeSinceChange >= requiredStableTime) {
        // Signal has been stable in new state for long enough - this is a real transition
        int oldStableState = stableClockState;
        stableClockState = currentClock;
        lastClockChangeTime = currentTime;
        
        // Determine which edge is "active" based on direction
        // Moving RIGHT (direction LOW): rising edge = output, falling edge = increment
        // Moving LEFT (direction HIGH): falling edge = output, rising edge = increment
        bool isRisingEdge = (oldStableState == LOW && stableClockState == HIGH);
        bool isFallingEdge = (oldStableState == HIGH && stableClockState == LOW);
        
        bool isActiveEdge;
        if (currentDirection == LOW) {  // Moving RIGHT
          isActiveEdge = isRisingEdge;
        } else {  // Moving LEFT
          isActiveEdge = isFallingEdge;
        }
        
        if (isActiveEdge) {
          // Active edge: output pattern and mark that we've seen it
          risingEdgeSeen = true;
          Serial.print("DEBUG: Active edge (");
          Serial.print(currentDirection == LOW ? "RIGHT/rising" : "LEFT/falling");
          Serial.print("), needleCount=");
          Serial.print(needleCount);
          Serial.print(", stableFor=");
          Serial.println(timeSinceChange);

          // Use pattern data instead of alternating pattern
          if (needleCount < patternLength) {
            if (pattern[needleCount] == 1) {
              setOut(HIGH);
            } else {
              setOut(LOW);
            }
          } else {
            // Pattern exhausted, turn off
            setOut(LOW);
          }
          
        } else if (isRisingEdge || isFallingEdge) {
          // Inactive edge: increment needle count if we've seen the active edge
          if (risingEdgeSeen) {
            needleCount++;
            Serial.print("DEBUG: Incremented to ");
            Serial.print(needleCount);
            Serial.print(" (stableFor=");
            Serial.print(timeSinceChange);
            Serial.println(")");
            risingEdgeSeen = false;
          } else {
            Serial.print("WARNING: Inactive edge without active edge, count=");
            Serial.println(needleCount);
          }
        }
        
        lastClockState = currentClock;
      }
      // If not stable long enough yet, keep waiting - don't update anything
      
    } else {
      // Signal matches stable state - reset the change timer
      lastClockChangeTime = currentTime;
      lastClockState = currentClock;
    }
    // Don't update in this case - let the edge detection handle it
  }

  lastCamsState = currentCams;
  lastDirectionState = currentDirection;

  // Safety check: turn off OUT if it's been on too long
  checkOutSafety();
}
