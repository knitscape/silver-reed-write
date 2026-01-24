// Simple Knitting Machine Interface (Arduino C version)

// Pin definitions (using the same GPIO numbers as the MicroPython version)
// const int ND1 = 3;             // (DIN 1) ND1: Needle 1, sets the position of the pattern
const int CAMS_PIN = 4;        // (DIN 2) KSL: Point Cam. High = in knitting range
const int OUT_PIN = 28;        // (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
const int CLOCK_PIN = 27;      // (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
const int DIRECTION_PIN = 26;  // (DIN 5) HOK: Carriage Direction. Low = to right, high = to left
// (DIN 6) 16v: Power the solenoids
// (DIN 7) 5v: Supplies the logic on the board
// (DIN 8) GND: Ground

// State variables
int needleCount = 0;
bool lastClockState = LOW;
bool lastCamsState = LOW;
bool lastND1State = LOW;
bool lastDirectionState = LOW;
bool risingEdgeSeen = false;

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

void setup() {
  pinMode(CAMS_PIN, INPUT);
  pinMode(CLOCK_PIN, INPUT);
  // pinMode(ND1, INPUT_PULLUP);
  pinMode(DIRECTION_PIN, INPUT);
  pinMode(OUT_PIN, OUTPUT);

  setOut(LOW);

  lastClockState = digitalRead(CLOCK_PIN);
  lastCamsState = digitalRead(CAMS_PIN);
  lastDirectionState = digitalRead(DIRECTION_PIN);
  // lastND1State = digitalRead(ND1);


  Serial.begin(115200);
  Serial.println("Starting simple Arduino interface...");
}

void loop() {
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
  }

  // Check for CAMS falling edge (exiting knitting range)
  if (currentCams == LOW && lastCamsState == HIGH) {
    Serial.println("\nFinished row, saw " + String(needleCount) + " needles");
    setOut(LOW);
  }

  if (currentCams == HIGH) {                              // Only process when in CAMS range
    if (currentClock == HIGH && lastClockState == LOW) {  // Rising edge
      risingEdgeSeen = true;
      // Serial.println("SAW RISING EDGE" + String(risingEdgeSeen));

      bool isAlternate = (needleCount % 2 == 0);

      if (isAlternate) {
        setOut(HIGH);
        Serial.print(1);
      } else {
        setOut(LOW);
        Serial.print(0);
      }


    } else if (currentClock == LOW && lastClockState == HIGH) {  // Falling edge
      // Serial.println("Saw FALLING edge" + String(risingEdgeSeen));
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
