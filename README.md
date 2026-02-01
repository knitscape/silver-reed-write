# silver-reed-write

A controller and interface for the Silver Reed sk840

# Aruino workflow

Install the [Arduino CLI](https://docs.arduino.cc/arduino-cli/installation/)

Compile and then upload with the Arduino CLI:

```sh
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2040 silver_reed_controller/silver_reed_controller.ino && \
arduino-cli upload -p /dev/ttyACM0 --fqbn rp2040:rp2040:seeed_xiao_rp2040 silver_reed_controller/silver_reed_controller.ino
```

## Helpful Links

- https://pointinthecloud.com/2024-12-15-000000.html
- Prior projects
  - https://github.com/MathKnitting/silverreed-firmware
  - https://github.com/romkal/silverduino
  - https://github.com/romkal/silverduino-board
- Documentation/manuals
  - Service manual:
    https://mkmanuals.com/downloadable/download/sample/sample_id/307/
  - EC1 parts catalog:
    https://mkmanuals.com/downloadable/download/sample/sample_id/1483/
  - the last two pages of this service manual for the 500 series are helpful
    (pin numbers are not the same as sk840)
    https://mkmanuals.com/downloadable/download/sample/sample_id/1479/
- micropython
  - https://docs.micropython.org/en/latest/rp2/quickref.html
  - https://github.com/orgs/micropython/discussions/11448

## Pins

- (DIN 1) ND1: Needle 1. Sets the position of the pattern. _unsure what this
  does; is it an offset?_
- (DIN 2) KSL: Point Cam. In range: High = in knitting range
- (DIN 3) DOB: Data Out Buffer. Black pixel is off, White pixel is on
- (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
- (DIN 5) HOK: Carriage Direction. Low = To right, High = To left
- (DIN 6) 16v: Power the solenoids which select the needles
- (DIN 7) 5v: Supplies the logic on the board
- (DIN 8) GND: Ground

```py
GPIO_IN_ND1 = 1          # (DIN 1) ND1: Needle 1. Sets the position of the pattern
GPIO_IN_RANGE = 2        # (DIN 2) KSL: Point Cam. In range: High = in knitting range
GPIO_OUT_SOLENOID = 0    # (DIN 3) DOB: Data Out Buffer Black pixel is off, White pixel is o
GPIO_IN_CLOCK = 3        # (DIN 4) CCP: Carriage Clock Pulse. Output solenoid on rising edge
GPIO_IN_DIRECTION = 4    # (DIN 5) HOK: Carriage Direction. Low = To right, High = To left
# (DIN 6) 16v: Power the solenoids
# (DIN 7) 5v: Supplies the logic on the board
# (DIN 8) GND: Ground
```

## Todo

- Core features
  - [ ] notify on disconnect
  - [ ] set which side the carriage is on
  - [ ] investigate why first row is not selecting
  - [ ] take extents from uploaded pattern
  - [ ] autoscroll with pattern progression
  - [ ] mirror each row as it is being sent
- Workspace
  - [ ] save state to browser storage
  - [ ] Make a pattern library
- Micropython/webserial
  - [x] Connect and disconnect to microcontroller via webserial
  - [x] Can send/receive messages to/from microcontroller over webserial
  - [x] Microcontroller can control machine patterning from a pattern row
  - [x] Microcontroller reports that it has finished a row (and what side it is
        on)
- Interactive Knitting
  - [x] Visualize pattern being sent to microcontroller and highlight next row
  - [x] Send next row on connect and on finishing a row
  - [x] reverse pattern row depending on carriage side
  - [x] Select which row to send next in web interface
  - [ ] Notify if point cams are not in the right place
- Pattern config
  - [x] upload patterns (BMP, PNG, JPG)
  - [x] mirroring
  - [x] doubling rows/cols
  - [x] horizontal/vertical repeat
  - [x] end needle selection
  - [x] center repeat
  - [x] margin
  - [ ] small preview
  - [ ] save preview image
- Pattern design (black and white)
  - [x] pixel art editor
  - [x] resize pattern extents
  - [x] save pattern

## Dev notes

- If you're using VSCode/Cursor, you need to set the language mode to
  `tailwindcss` for the `css` file or else it will complain about the at rules.

<!--
## micropython workflow


- Flash micropython to xiao:
  https://wiki.seeedstudio.com/XIAO-RP2040-with-MicroPython/

Interact with micropython devices using `mpremote`:
https://docs.micropython.org/en/latest/reference/mpremote.html

List devices: `mpremote connect list` or shorthand `mpremote devs`

Connect to `ttyACM` port: `mpremote connect /dev/ttyACMn` or `mpremote a0`
(`a1`, `a2`, `a3`, etc). This implicitly runs the `repl` command.

List files: `mpremote a0 ls`

Edit a file with your `$EDITOR`: `mpremote edit file.py`

Run a local file on the device: `mpremote a0 run blink.py`

Copy `main.py` from the local directory to the device: `mpremote cp main.py :`

Update the contents of a file and restart your program with a soft reset, and
monitor the output via the repl: `mpremote cp main.py : + soft-reset repl`

Recursively copy the local directory dir to the remote device.
`mpremote cp -r dir/ :`

#### Workflow

1. Make a directory that has the file structure layout you want on your board.
2. Switch to it `cd directoryName`
3. Make some changes
4. run `mpremote cp -r . :` to copy your entire current working directory onto
   the device
5. Press reboot (R button) -->
