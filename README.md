# silver-reed-write

A controller and interface for the Silver Reed sk840

## Installation

### Web interface

1. `npm install`
2. `npm run dev`
3. The web interface will be running at http://localhost:5173/silver-reed-write/

### Microcontroller

I'm using a Xiao RP2040 with Arduino C.

To compile and upload the sketch with the
[Arduino CLI](https://docs.arduino.cc/arduino-cli/installation/):

```sh
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2040 silver_reed_controller/silver_reed_controller.ino && \
arduino-cli upload -p /dev/ttyACM0 --fqbn rp2040:rp2040:seeed_xiao_rp2040 silver_reed_controller/silver_reed_controller.ino
```

### Pins

- (DIN 1) ND1: Needle 1. Sets the position of the pattern. (I do not use this -
  that's what the service manual says.)
- (DIN 2) KSL: Point Cam. In range: High = in knitting range
- (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
- (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
- (DIN 5) HOK: Carriage Direction. Low = To right, High = To left
- (DIN 6) 16v: Power the solenoids which select the needles
- (DIN 7) 5v: Supplies the logic on the board
- (DIN 8) GND: Ground

## Dev notes

- If you're using VSCode/Cursor, you need to set the language mode to
  `tailwindcss` for the `css` file or else it will complain about the at rules.

## Helpful Links

Some people have done similar projects which work with AYAB:

- https://pointinthecloud.com/2024-12-15-000000.html
- https://github.com/MathKnitting/silverreed-firmware
- https://github.com/romkal/silverduino

I found these manuals/docs helpful:

- Service manual:
  https://mkmanuals.com/downloadable/download/sample/sample_id/307/
- EC1 parts catalog:
  https://mkmanuals.com/downloadable/download/sample/sample_id/1483/
- the last two pages of this service manual for the 500 series are helpful (pin
  numbers are not the same as sk840)
  https://mkmanuals.com/downloadable/download/sample/sample_id/1479/
