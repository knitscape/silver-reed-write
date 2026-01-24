// DIN CONNECTIONS
// - Pin 1: Needle 1 (ND1)
// - Pin 2: output (DOB)
// - Pin 3: direction (HOK) - FOR ME IT IS PIN 5
// - Pin 4: cams (KSL) - FOR ME IT IS PIN 2
// - Pin 5: clock (CCP) - UNSURE - MAYBE THE NEEDLE TICKER?
// - Pin 6: +16V
// - Pin 7: +5V
// - Shell: ground

// Confident
const int DIRECTION = 6;      // DIN pin 5: changes when the direction changes.
const int NEEDLE_TICKER = 8;  // DIN pin 4: low whenever a needle is passed
const int CAMS = 7;           // DIN pin 2: high whenever one of the cam sensors is read (actually i think this is the left cam?)
const int OUT = 5;     // DIN pin 3: OUTPUT


// Not confident
const int CLOCK = 9;  // DIN pin 1: needle

// const int QQQ = 4;  // DIN PIN 6: IDK?

void update () {
  Serial.println("test");
}

void setup() {
  pinMode(DIRECTION, INPUT);
  pinMode(NEEDLE_TICKER, INPUT);
  pinMode(CAMS, INPUT);
  pinMode(OUT, OUTPUT);

  // ???
  // pinMode(CLOCK, INPUT);

  digitalWrite(OUT, LOW);
  // attachInterrupt(digitalPinToInterrupt(CLOCK), update, FALLING);
  Serial.begin(9600);
}

String currentDirection = "LEFT";  // Direction that the carriage is currently moving

volatile bool insideCams = false;  // Whether we're currently inside the cams
volatile int patternNeedle = 0;    // Which needle inside the cams we're currently on

volatile int lastDir;
volatile int lastNdl;
volatile int lastCams;

int counter = 0;

void loop() {
  int dir = digitalRead(DIRECTION);
  int camRead = digitalRead(CAMS);

  if (dir != lastDir) {
    Serial.print("\n");
    if (dir == HIGH) {
      // Serial.print("\nMoving left");
      currentDirection = "LEFT";
      insideCams = false;
    } else if (dir == LOW) {
      // Serial.print("\nMoving right");
      currentDirection = "RIGHT";
      insideCams = false;
    }
    patternNeedle = 0;
  }
  lastDir = dir;

  int needleRead = digitalRead(NEEDLE_TICKER);

  if (needleRead != lastNdl) {
    if (needleRead == HIGH) {
      if (camRead == HIGH) {
        patternNeedle++;
        counter++;

        if ((counter % 3) == 0) {
          Serial.print(1);
          digitalWrite(OUT, HIGH);
        } else {
          Serial.print(0);
          digitalWrite(OUT, LOW);
        }
      }
    }
  }
  lastNdl = needleRead;


  if (camRead != lastCams) {
    if (camRead == LOW) {
      digitalWrite(OUT, LOW);
    }
  }
  lastCams = camRead;
}
