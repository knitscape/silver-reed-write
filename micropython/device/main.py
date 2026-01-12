from machine import Pin
import machine
import select
import time
import sys
from libs.ws2812 import WS2812

MSG_PINS = 0x01  # Message containing pin states (device -> host)
CMD_SET_ROW = 0x02  # Command to set row data (host -> device)
MSG_ROW_COMPLETE = (
    0x03  # Message indicating carriage exited CAMS range (device -> host)
)


# DO NOT CHANGE THE PIN NUMBERS OR REMOVE ANY OF THESE COMMENTS
ND1 = Pin(
    3, Pin.IN
)  # (DIN 1) ND1: Needle 1. Sets the position of the pattern. unused for now.
CAMS = Pin(4, Pin.IN)  # (DIN 2) KSL: Point Cam. High = in knitting range
OUT = Pin(
    28, Pin.OUT
)  # (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
CLOCK_PULSE = Pin(
    27, Pin.IN
)  # (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
DIRECTION = Pin(
    26, Pin.IN
)  # (DIN 5) HOK: Carriage Direction. Low = To right, High = To left
# (DIN 6) 16v: Power the solenoids
# (DIN 7) 5v: Supplies the logic on the board
# (DIN 8) GND: Ground


POWER_LED = Pin(11, Pin.OUT)
USER_LED_R = Pin(16, Pin.OUT)
USER_LED_G = Pin(17, Pin.OUT)
USER_LED_B = Pin(25, Pin.OUT)

POWER_LED.value(1)
USER_LED_R.value(1)
USER_LED_G.value(1)
USER_LED_B.value(1)

neopixel = WS2812(12, 1)

# Setup select poll for non-blocking stdin reads
POLL_OBJ = select.poll()
POLL_OBJ.register(sys.stdin, select.POLLIN)

# Buffer for accumulating bytes
message_buffer = bytearray()

# Row data state
current_row = []  # The row pattern to output
needle_index = 0  # Current position in the row
row_active = False  # Whether we're currently outputting a row

# Safety: track how long OUT has been on
out_on_since = None  # time.ticks_ms() when OUT was turned on, None if off
OUT_MAX_ON_MS = 3000  # Maximum time OUT can stay on (3 seconds)

# Interrupt flag for clock pulse detection
clock_pulse_detected = False  # Set by ISR, cleared by main loop


def set_color(r, g, b):
    neopixel.pixels_fill((r, g, b))
    neopixel.pixels_show()


def set_out(value):
    """Set the OUT pin and update the neopixel LED to match"""
    global out_on_since

    OUT.value(value)
    if value:
        if out_on_since is None:
            out_on_since = time.ticks_ms()
    else:
        out_on_since = None


def check_out_safety():
    """Turn off OUT if it has been on too long (solenoid protection)"""
    global out_on_since

    if out_on_since is not None:
        elapsed = time.ticks_diff(time.ticks_ms(), out_on_since)
        if elapsed >= OUT_MAX_ON_MS:
            OUT.value(0)
            set_color(255, 0, 0)  # Red to indicate safety shutoff
            out_on_since = None


def clock_pulse_isr(pin):
    """Interrupt Service Routine for clock pulse rising edge.
    This must be minimal - just set a flag for the main loop to process.
    """
    global clock_pulse_detected
    clock_pulse_detected = True


def process_messages():
    """Read and process incoming messages from the host"""
    global message_buffer
    global current_row

    try:
        # Read available bytes
        while POLL_OBJ.poll(0):
            chunk = sys.stdin.buffer.read(1)
            if len(chunk) == 1:
                message_buffer.extend(chunk)
            else:
                break

        # Process complete messages
        while len(message_buffer) >= 2:
            cmd = message_buffer[0]

            if cmd == CMD_SET_ROW:
                # Need at least: cmd (1) + length (1) + data (length)
                if len(message_buffer) < 2:
                    break

                row_length = message_buffer[1]

                # Check if we have the full message
                total_size = 2 + row_length
                if len(message_buffer) < total_size:
                    break

                # Extract row data
                current_row = list(message_buffer[2 : 2 + row_length])

                # Remove processed message from buffer
                message_buffer = message_buffer[total_size:]
            else:
                # Unknown command, skip one byte
                message_buffer = message_buffer[1:]

    except Exception:
        message_buffer = bytearray()


def main():
    global needle_index
    global row_active
    global clock_pulse_detected

    set_out(0)  # Ensure OUT is off initially

    # Setup hardware interrupt for clock pulse on rising edge
    CLOCK_PULSE.irq(trigger=Pin.IRQ_RISING, handler=clock_pulse_isr)

    last_cams = CAMS.value()

    while True:
        current_cams = CAMS.value()

        # Check for CAMS rising edge (entering knitting range)
        if current_cams == 1 and last_cams == 0:
            # Start outputting the row
            # Disable interrupts while modifying shared state
            irq_state = machine.disable_irq()
            needle_index = 0
            row_active = True
            machine.enable_irq(irq_state)

        # Check for CAMS falling edge (exiting knitting range)
        if current_cams == 0 and last_cams == 1:
            # Disable interrupts while modifying shared state
            irq_state = machine.disable_irq()
            row_active = False
            machine.enable_irq(irq_state)
            # Send a specific message that row is complete
            msg = bytearray([MSG_ROW_COMPLETE])
            sys.stdout.buffer.write(msg)
            # Don't set OUT to 0 here - let the last needle value persist

        # Process clock pulse detected by interrupt
        if clock_pulse_detected:
            # Disable interrupts while accessing shared state
            irq_state = machine.disable_irq()
            clock_pulse_detected = False
            local_row_active = row_active
            local_needle_index = needle_index
            local_current_row = current_row
            machine.enable_irq(irq_state)

            # Process clock pulse (outside of critical section)
            if local_row_active:
                if local_needle_index < len(local_current_row):
                    set_out(local_current_row[local_needle_index])
                    # Update needle_index with interrupts disabled
                    irq_state = machine.disable_irq()
                    needle_index = local_needle_index + 1
                    machine.enable_irq(irq_state)
                else:
                    set_out(0)  # Default to off if we run out of data

        # Only process messages when outside of cams (not time-critical)
        if current_cams == 0:
            process_messages()

        # Safety check: turn off OUT if it's been on too long
        check_out_safety()

        last_cams = current_cams


main()
