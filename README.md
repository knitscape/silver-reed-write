# silver-reed-write

controller for the silver reed sk840

## Helpful Links

- https://pointinthecloud.com/2024-12-15-000000.html
- Prior projects
  - https://github.com/MathKnitting/silverreed-firmware
  - https://github.com/romkal/silverduino
  - https://github.com/romkal/silverduino-board
- Documentation/manuals
  - EC1 parts catalog:
    https://mkmanuals.com/downloadable/download/sample/sample_id/1483/
  - the last two pages of this service manual for the 500 series are helpful
    (pin numbers are not the same as sk840)
    https://mkmanuals.com/downloadable/download/sample/sample_id/1479/
- micropython
  - https://docs.micropython.org/en/latest/rp2/quickref.html
  - https://github.com/orgs/micropython/discussions/11448

## Implementation Notes

The board Control board should:

- signal when a row has ended, and the measured distance between point cams
- signal when a row has started, and what direction
- set the DOB to be 0 (off) at the end of each pattern row, as leaving the
  solenoid on makes it heat up
- ? Can the pattern row be reversed here, based on whether the direction is left
  or right?

Web UI should:

- enable someone to select which row of a pattern is knit next
- send the next pattern row either on select, or when the controller signals the
  row is done
- automatically advance to the next row when receiving an end row signal
- visualize which side the carriage is on and where the point cams should be
- ? how should we handle mismatch in point cam width?

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
