import array
from machine import Pin
import rp2


# Configure the number of WS2812 LEDs.
# brightness = 0.2
@rp2.asm_pio(
    sideset_init=rp2.PIO.OUT_LOW,
    out_shiftdir=rp2.PIO.SHIFT_LEFT,
    autopull=True,
    pull_thresh=24,
)
def ws2812():
    T1 = 2
    T2 = 5
    T3 = 3
    wrap_target()
    label("bitloop")
    out(x, 1).side(0)[T3 - 1]
    jmp(not_x, "do_zero").side(1)[T1 - 1]
    jmp("bitloop").side(1)[T2 - 1]
    label("do_zero")
    nop().side(0)[T2 - 1]
    wrap()


class WS2812:
    def __init__(self, pin_num, led_count, brightness=0.5):
        self.Pin = Pin
        self.led_count = led_count
        self.brightness = brightness
        self.sm = rp2.StateMachine(0, ws2812, freq=8_000_000, sideset_base=Pin(pin_num))
        self.sm.active(1)
        self.ar = array.array("I", [0 for _ in range(led_count)])

    def pixels_show(self):
        dimmer_ar = array.array("I", [0 for _ in range(self.led_count)])
        for i, c in enumerate(self.ar):
            r = int(((c >> 8) & 0xFF) * self.brightness)
            g = int(((c >> 16) & 0xFF) * self.brightness)
            b = int((c & 0xFF) * self.brightness)
            dimmer_ar[i] = (g << 16) + (r << 8) + b
        self.sm.put(dimmer_ar, 8)

    def pixels_set(self, i, color):
        self.ar[i] = (color[1] << 16) + (color[0] << 8) + color[2]

    def pixels_fill(self, color):
        for i in range(len(self.ar)):
            self.pixels_set(i, color)

