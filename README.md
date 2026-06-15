# Live Companion

Live Companion is a desktop companion application for the Kemper Profiler.

The application communicates directly with the Kemper Profiler via MIDI SysEx and provides a fast, visually enhanced overview of the currently loaded rig. It displays amplifier, cabinet and effect information in real time and automatically updates whenever a rig or effect state changes.

Live Companion is designed as a visual companion rather than an editor. Its purpose is to make live rigs easier to identify and understand at a glance while playing, recording or browsing profiles.

---

## Features

* Real-time Kemper Profiler monitoring
* Automatic rig change detection
* Live amplifier identification
* Cabinet identification and configuration display
* Gain visualization
* Active effect detection
* Effect on/off monitoring
* Automatic image matching for amps, cabinets and effects
* Fast MIDI SysEx communication
* Desktop application built with Tauri

---

## What Live Companion Does

The application continuously reads information from the Kemper Profiler and presents it in a more visual and informative format.

Examples:

* Displaying the currently loaded amplifier model
* Displaying cabinet manufacturer and configuration
* Showing active effects
* Visualizing gain levels
* Displaying amplifier and cabinet images
* Monitoring rig changes in real time

The goal is to provide additional context and visual feedback that is not available directly on the Kemper display.

---

## What Live Companion Does NOT Do

Live Companion is intentionally read-only.

The application currently does not:

* Edit rigs
* Modify amplifier parameters
* Change effect settings
* Send parameter changes to the Kemper
* Store presets
* Manage performances

All communication is focused on reading and displaying information from the Profiler.

---

## Requirements

* Kemper Profiler
* MIDI connection to the Kemper Profiler (required)
* Windows
* Node.js
* Rust (required for Tauri development)

Without an active MIDI connection, Live Companion cannot retrieve any information from the Profiler.

---

## Development Setup

Install dependencies:

```bash
npm install
```

Start the application in development mode:

```bash
npm run tauri dev
```

Create a production build:

```bash
npm run tauri build
```

This command creates a distributable release version of the application. Tauri compiles the frontend and Rust backend, bundles all required assets and generates an installer (for example an `.msi` installer on Windows) inside the build output directory.

Unlike development mode, the production build runs without the development server and is intended for distribution to other users.

---

## How Communication Works

Live Companion communicates directly with the Kemper Profiler using MIDI SysEx messages.

The application automatically detects the available Kemper MIDI ports and continuously requests information such as:

* Rig Name
* Amplifier Name
* Amplifier Manufacturer
* Amplifier Model
* Cabinet Information
* Gain Value
* Effect Slot Status
* Effect Type Information

The data is parsed directly from Kemper SysEx responses and displayed inside the application.

No cloud services, APIs or external servers are involved.

All communication happens locally between the application and the Kemper Profiler.

---

## Image Matching System

One of the core features of Live Companion is automatic image matching.

When an amplifier, cabinet or effect is detected, the application attempts to match the received Kemper data against known aliases and image mappings.

Relevant files:

```text
src/ampImageMap.js
src/cabinetImageMap.js
src/effectImageMap.js
```

This allows different naming variations to resolve to the same visual asset.

---

## Adding New Amplifier Images

The included image library focuses primarily on the amplifiers used during development.

If a profile references an amplifier that is not currently recognized, additional mappings can easily be added.

### Step 1

Obtain an amplifier image.

### Step 2

Remove the background and crop the image.

Transparent PNG files are recommended.

For quick image preparation, Photopea is an excellent free tool:

https://www.photopea.com

### Step 3

Place the image inside:

```text
images/amps/
```

### Step 4

Add aliases in:

```text
src/ampImageMap.js
```

Example:

```javascript
{
  image: "my_amp.png",
  aliases: [
    "My Amp",
    "MyAmp"
  ]
}
```

Once the aliases are added, Live Companion will automatically display the image whenever a matching amplifier is detected.

---

## Adding New Cabinet Images

Cabinet support can be extended in the same way.

Image folder:

```text
images/cabinets/
```

Mapping file:

```text
src/cabinetImageMap.js
```

---

## Adding New Effect Images

Effect images can be extended through:

```text
images/effects/
```

and

```text
src/effectImageMap.js
```

---

## Known Limitations

* Image matching depends on available aliases.
* Unknown amplifier names require manual mapping.
* Unknown cabinet names require manual mapping.
* Different profile creators may use different naming conventions.
* Live Companion is currently a monitoring and visualization tool only.
* Editing Kemper parameters is not supported.
* Writing data back to the Profiler is not supported.
* The application has been developed and tested with a specific collection of rigs and profiles. Additional image mappings may be required for broader profile libraries.

---

## Project Status

Live Companion is an actively developed personal project focused on creating a fast and visually rich companion experience for the Kemper Profiler.

Contributions, suggestions, bug reports and additional image mappings are welcome.
