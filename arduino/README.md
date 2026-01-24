# Arduino interface

Upload with arduino CLI:

```sh
arduino-cli upload -p /dev/ttyACM0 --fqbn rp2040:rp2040:seeed_xiao_rp2040 arduino/siverreed_web/siverreed_web.ino`
```

Compile and then upload:

```sh
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2040 arduino/silverreed_debug/silverreed_debug.ino && \
arduino-cli upload -p /dev/ttyACM0 --fqbn rp2040:rp2040:seeed_xiao_rp2040 arduino/silverreed_debug/silverreed_debug.ino
```
