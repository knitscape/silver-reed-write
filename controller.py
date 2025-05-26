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
last_clock_pulse = None
last_direction = None  # Direction that the carriage is currently moving
needle_counter = 0




# Pattern data for testing- 20 needles wide, repeating pattern
pattern = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # Row 1
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # Row 2
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # Row 3
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # Row 4
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # Row 5
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # Row 6
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # Row 7
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]   # Row 8
]
current_row = 0



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
    print(f"Inside cams: {is_in_knitting_range()}, Needle: {needle_counter}")

 
def check_knitting_range(current_in_range):
    global was_in_knitting_range
    global needle_counter
    global current_row


    if current_in_range != was_in_knitting_range:
        current_direction = check_direction_change()

        if not current_in_range: 
            # Here is where we should report that we exited the knitting range
            print(f"Exited knitting range, carriage is on the {current_direction}.")

            # Increment the row
            current_row += 1
            if current_row >= len(pattern):
                current_row = 0
            print(f"Current row: {current_row}")
            needle_counter = 0
        elif current_in_range:
            print(f"Entered knitting range, direction: {current_direction}")

    was_in_knitting_range = current_in_range

def read_current_direction():
    if DIRECTION.value() == 1:
        return "left"
    else:
        return "right"


def check_direction_change():
    global last_direction
    current_direction = read_current_direction()
    if current_direction != last_direction:
        last_direction = current_direction
        print(f"Direction changed to: {current_direction}")

    return current_direction


def main_loop():
    global needle_counter
    global current_row

    in_range = is_in_knitting_range()
    check_knitting_range(in_range)

    if in_range:
        check_direction_change()

        if saw_needle():
            pattern_index = needle_counter % len(pattern[current_row])

            if pattern[current_row][pattern_index] == 1:
                OUT.value(1)
            else:
                OUT.value(0) 
        
            needle_counter += 1

    elif not in_range and saw_needle():
        if OUT.value() == 1:
            OUT.value(0) # ensure that the solenoid is off outside of the knitting range
        


def main():
    # Initialize output pin
    OUT.value(0)
    
    while True:
        main_loop()
        # Small delay to prevent CPU hogging
        time.sleep_ms(1)

main()
