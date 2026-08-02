import { formatCents, formatFrequency, frequencyToNote } from "../utils/noteMath.js";
import { detectPitchYin } from "../utils/yinPitch.js";

const SIGNAL_GATE_DB = -42;
const IN_TUNE_CENTS = 2;
const SCALE_RANGE_CENTS = 50;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class ChromaticTuner {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.noteElement = rootElement?.querySelector("[data-tuner-note]");
    this.frequencyElement = rootElement?.querySelector("[data-tuner-frequency]");
    this.centsElement = rootElement?.querySelector("[data-tuner-cents]");
    this.targetElement = rootElement?.querySelector("[data-tuner-target]");
    this.markerElement = rootElement?.querySelector("[data-tuner-marker]");
    this.smoothedFrequency = null;
    this.displayCents = 0;
  }

  update({ active, timeDomain, sampleRate, rmsDbfs }) {
    if (!this.rootElement) return;

    if (!active || !timeDomain?.length || !sampleRate || rmsDbfs < SIGNAL_GATE_DB) {
      this.reset();
      return;
    }

    const detectedFrequency = detectPitchYin(timeDomain, sampleRate);
    if (!detectedFrequency) {
      this.reset();
      return;
    }

    this.smoothedFrequency = this.smoothedFrequency
      ? this.smoothedFrequency * 0.82 + detectedFrequency * 0.18
      : detectedFrequency;

    const note = frequencyToNote(this.smoothedFrequency);
    if (!note) {
      this.reset();
      return;
    }

    this.displayCents += (note.cents - this.displayCents) * 0.22;
    const inTune = Math.abs(note.cents) <= IN_TUNE_CENTS;
    const markerPercent = 50 + (clamp(this.displayCents, -SCALE_RANGE_CENTS, SCALE_RANGE_CENTS) / SCALE_RANGE_CENTS) * 50;

    this.rootElement.dataset.active = "true";
    this.rootElement.dataset.inTune = inTune ? "true" : "false";

    if (this.noteElement) {
      this.noteElement.textContent = note.name;
    }

    if (this.frequencyElement) {
      this.frequencyElement.textContent = formatFrequency(note.frequency);
    }

    if (this.centsElement) {
      this.centsElement.textContent = formatCents(note.cents);
    }

    if (this.targetElement) {
      this.targetElement.textContent = formatFrequency(note.targetFrequency);
    }

    if (this.markerElement) {
      this.markerElement.style.left = `${markerPercent}%`;
    }
  }

  reset() {
    this.smoothedFrequency = null;
    this.displayCents = 0;

    if (!this.rootElement) return;

    this.rootElement.dataset.active = "false";
    this.rootElement.dataset.inTune = "false";

    if (this.noteElement) this.noteElement.textContent = "—";
    if (this.frequencyElement) this.frequencyElement.textContent = "— Hz";
    if (this.centsElement) this.centsElement.textContent = "— cent";
    if (this.targetElement) this.targetElement.textContent = "— Hz";

    if (this.markerElement) {
      this.markerElement.style.left = "50%";
    }
  }
}
