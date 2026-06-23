# MIDI Feedback Diagnostics

Purpose: determine whether the Kemper sends current Performance and Slot feedback over MIDI.

## What The Monitor Logs

Enable `MIDI Monitor` in the Live Companion title bar.

The browser console logs every incoming MIDI message from the selected input. These Control Changes are highlighted as `POSITION FEEDBACK`:

- CC47: Performance index/value. Value 0 maps to Performance 1.
- CC48: Performance Up / Rig Next.
- CC49: Performance Down / Rig Previous.
- CC50: Slot 1.
- CC51: Slot 2.
- CC52: Slot 3.
- CC53: Slot 4.
- CC54: Slot 5.

Each highlighted entry includes timestamp, controller, value, MIDI channel, hex data, source port, and a human-readable meaning.

## Hardware Test Steps

With the monitor active, perform these actions on the real Kemper:

1. Enter Performance Mode.
2. Leave Browser Mode.
3. Change Performance from the Kemper hardware.
4. Select Slot 1.
5. Select Slot 2.
6. Select Slot 3.
7. Select Slot 4.
8. Select Slot 5.
9. Change Performance again.

## Result Template

Record the observed console output here after testing:

- Performance Mode entered:
- Browser Mode left:
- Performance changed:
- Slot 1 selected:
- Slot 2 selected:
- Slot 3 selected:
- Slot 4 selected:
- Slot 5 selected:

## Interpretation

If CC47 is received reliably when the current Performance changes, the Performance number can be inferred from `value + 1`.

If CC50-54 are received reliably when slots change, the current Slot can be inferred from the controller number.

If either CC47 or CC50-54 are missing, inconsistent, or only emitted after app-originated CC commands, Live Companion should not use this as the sole source of truth for automatic position detection.
