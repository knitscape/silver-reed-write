from machine import Pin
import machine
import time

# DO NOT CHANGE THE PIN NUMBERS OR REMOVE ANY OF THESE COMMENTS
CAMS = Pin(4, Pin.IN)  # (DIN 2) KSL: Point Cam. High = in knitting range
OUT = Pin(
    28, Pin.OUT
)  # (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
CLOCK_PULSE = Pin(
    27, Pin.IN
)  # (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge

# Track needle count for alternate needle triggering
needle_count = 0

# Safety: track how long OUT has been on
out_on_since = None  # time.ticks_ms() when OUT was turned on, None if off
OUT_MAX_ON_MS = 3000  # Maximum time OUT can stay on (3 seconds)

# Track last state for edge detection (like Arduino polling approach)
last_clock_pulse = None


def set_out(value):
    """Set the OUT pin and track when it was turned on for safety"""
    global out_on_since

    OUT.value(value)
    # No print here - this is called frequently and must be fast
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
            out_on_since = None
            return True
    return False


def main():
    global needle_count
    global last_clock_pulse

    print("Starting simple interface...")
    print(f"Initial CAMS value: {CAMS.value()}")
    print(f"Initial CLOCK_PULSE value: {CLOCK_PULSE.value()}")
    
    set_out(0)  # Ensure OUT is off initially

    # Use polling approach like Arduino (no interrupts)
    # This may be more reliable for fast signals
    last_clock_pulse = CLOCK_PULSE.value()
    last_cams = CAMS.value()
    print(f"Initial last_cams: {last_cams}, last_clock: {last_clock_pulse}")
    
    last_status_time = time.ticks_ms()
    status_interval_ms = 5000  # Print status every 5 seconds

    while True:
        # Periodic status print to verify main loop is running
        current_time = time.ticks_ms()
        if time.ticks_diff(current_time, last_status_time) >= status_interval_ms:
            print(f"Status: CLOCK_PULSE={CLOCK_PULSE.value()}, CAMS={CAMS.value()}, OUT={OUT.value()}, needle={needle_count}")
            last_status_time = current_time
        
        # Poll CAMS for edge transitions (like Arduino)
        current_cams = CAMS.value()
        
        # Check for CAMS rising edge (entering knitting range)
        if current_cams == 1 and last_cams == 0:
            needle_count = 0
            print(f"CAMS rising edge: Reset needle_count to 0 (entering knitting range)")
        
        # Check for CAMS falling edge (exiting knitting range)
        if current_cams == 0 and last_cams == 1:
            print(f"CAMS falling edge: Exiting knitting range")
            # Immediately turn OUT off when CAMS goes LOW (like Arduino code)
            set_out(0)
        
        last_cams = current_cams
        
        # Poll CLOCK_PULSE for rising edge (like Arduino polling NEEDLE_TICKER)
        current_clock = CLOCK_PULSE.value()
        
        # Detect rising edge: current is HIGH and last was LOW (or None on first run)
        if current_clock != last_clock_pulse:
            if current_clock == 1:  # Rising edge (like Arduino: if (needleRead == HIGH))
                # Only process when in CAMS range (like Arduino: if (camRead == HIGH))
                if current_cams == 1:
                    is_alternate = (needle_count % 2 == 0)
                    
                    # Only trigger on alternate needles (even needle counts: 0, 2, 4, ...)
                    if is_alternate:
                        set_out(1)
                    else:
                        # Turn OUT off for non-alternate needles
                        set_out(0)
                    
                    # Increment needle count (only when in CAMS)
                    needle_count += 1
        
        last_clock_pulse = current_clock

        # Safety check: turn off OUT if it's been on too long
        if check_out_safety():
            print("Safety timeout: OUT was on for >3 seconds, turned off")


main()
