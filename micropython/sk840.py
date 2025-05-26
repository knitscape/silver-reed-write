from machine import Pin
import time
import sys
import select
import json

POLL_OBJ = select.poll()
POLL_OBJ.register(sys.stdin, select.POLLIN)

#ND1 = Pin(9, Pin.IN)           # (DIN 1) ND1: Needle 1. Sets the position of the pattern. unused for now.
CAMS = Pin(29, Pin.IN)          # (DIN 2) KSL: Point Cam. High = in knitting range
OUT = Pin(28, Pin.OUT)          # (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
CLOCK_PULSE = Pin(27, Pin.IN)   # (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
DIRECTION = Pin(26, Pin.IN)     # (DIN 5) HOK: Carriage Direction. Low = To right, High = To left
# (DIN 6) 16v: Power the solenoids
# (DIN 7) 5v: Supplies the logic on the board
# (DIN 8) GND: Ground

LED = Pin("LED", Pin.OUT)



# Global variables
inside_knitting_range = None
last_clock_pulse = None
direction = None  # Direction that the carriage is currently moving
needle_counter = 0
current_row = []


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


def check_knitting_range(new_in_range):
    global inside_knitting_range
    global needle_counter


    if new_in_range != inside_knitting_range:
        check_direction_change() 

        if not new_in_range: 
            # Exited knitting range
            send_state()
            LED.value(1) # Turn off the LED
            needle_counter = 0
        elif new_in_range:
            LED.value(0) # Turn on the LED
            # print(f"Entered knitting range, direction: {current_direction}")

    inside_knitting_range = new_in_range

def read_current_direction():
    if DIRECTION.value() == 1:
        return "left"
    else:
        return "right"


def check_direction_change():
    global direction
    current_direction = read_current_direction()
    if current_direction != direction:
        direction = current_direction
        # print(f"Direction changed to: {current_direction}")

    return current_direction

def send_state():
    global direction
    global needle_counter
    current_state = { "direction": direction, "cam_width": needle_counter }
    send_message("state", current_state)
        
def send_error(error_msg):
    send_message("error", error_msg)
    
def send_echo(msg):
    send_message("echo", msg)


def send_message(message_type, message_content):
   json_msg = {"msg_type": message_type, "msg": message_content}
   msg = json.dumps(json_msg)
   print(msg)



def process_message(msg):
    global current_row

    msg_type = msg["msg_type"]

    if msg_type == "row":
        current_row = msg["row"]
    else:
        send_error("unsupported message type")
            

def read_until_newline():
    msg = ''
    
    if not POLL_OBJ.poll(0):
        return
    
    while POLL_OBJ.poll(0):
        ch = sys.stdin.read(1)
        if ch=='\n':
            break
        msg += ch
        
    json_msg = json.loads(msg)
    process_message(json_msg)

def main_loop():
    global needle_counter
    global current_row

    in_range = is_in_knitting_range()
    check_knitting_range(in_range)

    if in_range:
        check_direction_change()

        if saw_needle():
            if needle_counter >= len(current_row):
                # Turn off the solenoid if we run out of pattern
                OUT.value(0) 
                # TODO: Report that we ran out of pattern early
            elif current_row[needle_counter] == 1:
                OUT.value(1)
            else:
                OUT.value(0) 
        
            needle_counter += 1

    elif not in_range and saw_needle():
        if OUT.value() == 1:
            OUT.value(0) # ensure that the solenoid is off outside of the knitting range
        
    if not in_range:
        # If we're not in the knitting range, we should listen for messages
        read_until_newline()

def main():
    # Initialize output pin
    OUT.value(0)
    
    while True:
        main_loop()
        # Small delay to prevent CPU hogging
        time.sleep_ms(1)

main()
