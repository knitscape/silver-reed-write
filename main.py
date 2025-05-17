import time
from machine import Pin


GPIO_IN_ND1 = 1          # (DIN 1) ND1: Needle 1. Sets the position of the pattern
GPIO_IN_RANGE = 2        # (DIN 2) KSL: Point Cam. In range: High = in knitting range
GPIO_OUT_SOLENOID = 0    # (DIN 3) DOB: Data Out Buffer Black pixel is off, White pixel is o
GPIO_IN_CLOCK = 3        # (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
GPIO_IN_DIRECTION = 4    # (DIN 5) HOK: Carriage Direction. Low = To right, High = To left
# (DIN 6) 16v: Power the solenoids
# (DIN 7) 5v: Supplies the logic on the board
# (DIN 8) GND: Ground

pin = Pin(0)

while True:
    led.value(1)  # Turn on the LED
    time.sleep(0.5)  # Wait for 0.5 seconds
    led.value(0)  # Turn off the LED
    time.sleep(0.5)  # Wait for 0.5 seconds