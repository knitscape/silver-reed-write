import select
import sys
import time
import machine

poll_obj = select.poll()
poll_obj.register(sys.stdin,1)
led=machine.Pin("LED",machine.Pin.OUT)

def check_for_messages(t):
    if poll_obj.poll(0):
        # Read one character from sys.stdin
        ch = sys.stdin.read(1)
        # Check if the character read is 't'
        if ch=='t':
            # Toggle the state of the LED
            led.value(not led.value())
            # Print a message indicating that the LED has been toggled
            print ("LED toggled" )

# Set up a timer to call check_for_messages every 100 ms
timer = Timer()
timer.init(freq=10, mode=Timer.PERIODIC, callback=check_for_messages)
