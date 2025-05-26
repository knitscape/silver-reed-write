from machine import Pin
import time

#ND1 = Pin(9, Pin.IN)           # (DIN 1) ND1: Needle 1. Sets the position of the pattern. unused for now.
CAMS = Pin(29, Pin.IN)          # (DIN 2) KSL: Point Cam. High = in knitting range
OUT = Pin(28, Pin.OUT)          # (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
CLOCK_PULSE = Pin(27, Pin.IN)   # (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
DIRECTION = Pin(26, Pin.IN)     # (DIN 5) HOK: Carriage Direction. Low = To right, High = To left
# (DIN 6) 16v: Power the solenoids
# (DIN 7) 5v: Supplies the logic on the board
# (DIN 8) GND: Ground

# Global variables
was_in_knitting_range = None
counter = 0
last_clock_pulse = None


current_direction = "UNKNOWN"  # Direction that the carriage is currently moving
pattern_needle = 0        # Which needle inside the cams we're currently on
last_dir = None


def is_in_knitting_range():
    return CAMS.value() == 1

def saw_needle():
    global last_clock_pulse
    current_clock_pulse = CLOCK_PULSE.value()
    
    if current_clock_pulse != last_clock_pulse:
        # If there is a change, we update the last_clock_pulse
        last_clock_pulse = current_clock_pulse
        # If it's a rising edge, we just saw a needle and return true
        if current_clock_pulse == 1:
            return True
        
    return False

def print_state():
    print(f"Inside cams: {is_in_knitting_range()}, Needle: {counter}")

 
def check_if_exited_knitting_range(current_in_range):
    global was_in_knitting_range
    global counter

    if current_in_range != was_in_knitting_range:
        if not current_in_range: 
            # we exited the knitting range
            OUT.value(0) # ensure that the solenoid is off
            # Here is where we should report that we exited the knitting range
            print("Exited knitting range")
            counter = 0

    was_in_knitting_range = current_in_range

def main_loop():
    global counter
    in_range = is_in_knitting_range()

    check_if_exited_knitting_range(in_range)

    if in_range and saw_needle():
        counter += 1
        if (counter % 3) == 0:  # for testing just slip every third needle
            OUT.value(1)
        else:
            OUT.value(0)

        print_state()

        # dir_val = DIRECTION.value()
        # # Check for direction change
        # if dir_val != last_dir:
        #     print("\n")
        #     if dir_val == 1:
        #         current_direction = "LEFT"
        #         inside_cams = False
        #     elif dir_val == 0:
        #         current_direction = "RIGHT"
        #         inside_cams = False
        #     pattern_needle = 0
        # last_dir = dir_val
        


def main():
    # Initialize output pin
    OUT.value(0)
    
    while True:
        main_loop()
        # Small delay to prevent CPU hogging
        time.sleep_ms(1)

main()