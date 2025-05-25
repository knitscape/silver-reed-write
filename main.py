import sys
import select
import time
import json

led = machine.Pin("LED", machine.Pin.OUT)
last_row = []

pollObj = select.poll()
pollObj.register(sys.stdin, select.POLLIN)

def set_led(msg):
    state = msg["state"]
    if state == "ON":
        led.value(0)
    elif state == "OFF":
        led.value(1)
    else:
        send_error("LED state not supported")
    send_state()
      
def set_next_row(msg):
    global last_row
    last_row = msg["row"]
    send_echo(last_row)
    send_state()
      
def send_state():
    current_state = {"led": led.value(), "last_row": last_row }
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
    msg_type = msg["msg_type"]
    if msg_type == "led":
        set_led(msg)
    elif msg_type == "row":
        set_next_row(msg)
    else:
        send_error("unsupported message type")
            

def read_until_newline():
    msg = ''
    
    if not pollObj.poll(0):
        return
    
    while pollObj.poll(0):
        ch = sys.stdin.read(1)
        if ch=='\n':
            break
        msg += ch
        
    json_msg = json.loads(msg)
    process_message(json_msg)
    

while True:
    read_until_newline()
    time.sleep_ms(10)
