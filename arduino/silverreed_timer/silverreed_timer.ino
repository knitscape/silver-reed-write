// Knitting Machine Interface - Matching siverreed_web approach
// Uses two-edge detection: rising edge = output, falling edge = increment

#include <Arduino.h>

// Knitting machine pins
#define CAMS_PIN 4    // KSL: Point Cam. High = in knitting range
#define OUT_PIN 28    // DOB: Data Out Buffer
#define CLOCK_PIN 27  // CCP: Carriage Clock Pulse
#define DIRECTION_PIN 26  // HOK: Carriage Direction (Low = right, High = left)
#define ND1_PIN 3     // (DIN 1) ND1: Needle 1, sets the position of the pattern

// Pattern storage
const int MAX_PATTERN_LENGTH = 200;
byte pattern[MAX_PATTERN_LENGTH];
int patternLength = 0;
bool patternReady = false;

// Protocol constants
const byte CMD_SET_ROW = 0x02;
const byte MSG_ROW_COMPLETE = 0x03;

// State variables
int needleCount = 0;
bool lastClockState = LOW;
bool lastCamsState = LOW;
bool lastDirectionState = LOW;
bool lastND1State = LOW;
bool risingEdgeSeen = false;

// Safety: track how long OUT has been on
unsigned long outOnSince = 0;
const unsigned long OUT_MAX_ON_MS = 3000;

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
  if (Serial.available() < 1) {
    return;
  }

  byte cmd = Serial.read();
  
  if (cmd == CMD_SET_ROW) {
    while (Serial.available() < 1) {
      delay(1);
    }
    
    byte length = Serial.read();
    
    if (length > MAX_PATTERN_LENGTH) {
      Serial.println("ERROR: Pattern too long");
      while (Serial.available() > 0) {
        Serial.read();
      }
      return;
    }
    
    while (Serial.available() < length) {
      delay(1);
    }
    
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
    Serial.print("Unknown command: 0x");
    Serial.println(cmd, HEX);
  }
}

void setup() {
  // Use INPUT (no pull-up) like siverreed_web
  pinMode(CAMS_PIN, INPUT_PULLUP);
  pinMode(CLOCK_PIN, INPUT_PULLUP);
  pinMode(DIRECTION_PIN, INPUT_PULLUP);
  pinMode(ND1_PIN, INPUT_PULLUP);  // Pull-up to prevent floating
  pinMode(OUT_PIN, OUTPUT);

  setOut(LOW);

  // Invert readings because INPUT_PULLUP means active LOW
  lastClockState = !digitalRead(CLOCK_PIN);
  lastCamsState = !digitalRead(CAMS_PIN);
  lastDirectionState = !digitalRead(DIRECTION_PIN);
  lastND1State = !digitalRead(ND1_PIN);

  Serial.begin(115200);
  Serial.println("Starting Arduino interface (matching siverreed_web)...");
  Serial.println("Waiting for pattern data...");
}

void loop() {
  // Process incoming serial data
  processSerial();
  
  // Invert readings because INPUT_PULLUP means active LOW
  int currentCams = !digitalRead(CAMS_PIN);
  int currentDirection = !digitalRead(DIRECTION_PIN);
  int currentClock = !digitalRead(CLOCK_PIN);
  int currentND1 = !digitalRead(ND1_PIN);

  if (currentDirection == HIGH && lastDirectionState == LOW) {
    Serial.println("Moving LEFT");
  }

  if (currentDirection == LOW && lastDirectionState == HIGH) {
    Serial.println("Moving RIGHT");
  }

  // Log ND1 changes
  if (currentND1 != lastND1State) {
    Serial.print("ND1 changed to ");
    Serial.print(currentND1 ? "HIGH" : "LOW");
    Serial.print(" (needleCount=");
    Serial.print(needleCount);
    Serial.print(", inCAMS=");
    Serial.print(currentCams ? "yes" : "no");
    Serial.println(")");
    lastND1State = currentND1;
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
    bool isRisingEdge = (currentClock == HIGH && lastClockState == LOW);
    bool isFallingEdge = (currentClock == LOW && lastClockState == HIGH);
    
    // Direction-based edge detection:
    // RIGHT (currentDirection == LOW): rising edge = output, falling edge = increment
    // LEFT (currentDirection == HIGH): falling edge = output, rising edge = increment
    bool isOutputEdge = (currentDirection == LOW) ? isRisingEdge : isFallingEdge;
    bool isIncrementEdge = (currentDirection == LOW) ? isFallingEdge : isRisingEdge;
    
    if (isOutputEdge) {
      risingEdgeSeen = true;

      // Output pattern
      if (needleCount < patternLength) {
        if (pattern[needleCount] == 1) {
          setOut(HIGH);
        } else {
          setOut(LOW);
        }
      } else {
        setOut(LOW);
      }

    } else if (isIncrementEdge) {
      // Increment needle count (if we saw output edge)
      if (risingEdgeSeen) {
        needleCount++;
      }
    }
  }

  // Update state at end of loop (unconditionally)
  lastCamsState = currentCams;
  lastDirectionState = currentDirection;
  lastClockState = currentClock;

  // Safety check
  checkOutSafety();
}
