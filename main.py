from machine import Pin, UART
import time
import os
import sys
import select



# Initialize LED on GPIO2 (built-in LED on most ESP8266 boards)
led = Pin(2, Pin.OUT)
led_state = False  # Track LED state in a variable
led.value(1)  # Turn LED off initially (ESP8266 built-in LED is active low)

# Initialize UART with minimal buffer
uart = UART(0, 115200)  # UART0, 115200 baud rate
uart.init(115200, bits=8, parity=None, stop=1, rxbuf=64)  # Reduced buffer size
uart.write("ESP8266 initialized\n")

def set_led(state):
    global led_state
    led_state = state
    led.value(0 if state else 1)  # LED is active low
    return "LED ON" if state else "LED OFF"

# Message format: "LED:ON" or "LED:OFF"
def handle_message(message):
    message = message.strip().upper()  # Normalize message
    if message == "LED:ON":
        return set_led(True)
    elif message == "LED:OFF":
        return set_led(False)
    return "Unknown"

# Main loop
last_status_time = 0

while True:
    try:
        # Check for incoming messages from stdin
        if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
            message = sys.stdin.readline().strip()
            if message:
                response = handle_message(message)
                uart.write(response + '\n')
        
        # Send status message every second
        current_time = time.ticks_ms()
        if time.ticks_diff(current_time, last_status_time) >= 1000:
            status = "ON" if led_state else "OFF"
            uart.write(f"Status:{status}\n")
            last_status_time = current_time
        
        time.sleep(0.01)  # Small delay to prevent CPU hogging
    except Exception as e:
        time.sleep(1)  # Wait a bit before retrying