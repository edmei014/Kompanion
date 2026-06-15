# Kemper Live Companion

Tauri-App, die per Web MIDI API SysEx Live-Daten direkt vom Kemper abfragt.

## Start

```powershell
npm install
npm run tauri:dev
```

## Ablauf

1. Kemper per USB/MIDI verbinden.
2. App starten.
3. Die App waehlt automatisch den Profiler MIDI Input/Output und ruft Live-Daten ab.

Die Kemper SysEx-Abfrage fuer den aktuellen Rig-Namen ist:

```text
F0 00 20 33 02 7F 43 00 00 01 F7
```

Die App parst die echte Kemper-Antwortstruktur:

```text
F0 00 20 33 00 00 03 00 00 01 ...
```

Die MIDI-Kommunikation laeuft im Frontend ueber die Web MIDI API mit SysEx-Freigabe.
Abgefragt werden aktuell Rig Name, Amp Name, Amp Model, Cabinet Name, Gain sowie
On/Off und Typnamen der wichtigsten Effekt-Slots.

## Bilder

Lokale Bilderordner fuer Name-Matching:

```text
public/images/effects
```
