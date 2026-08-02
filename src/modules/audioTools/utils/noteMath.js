const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_FREQUENCY = 440;

export function frequencyToNote(frequency) {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;

  const midi = 69 + 12 * Math.log2(frequency / A4_FREQUENCY);
  const nearestMidi = Math.round(midi);
  const noteIndex = ((nearestMidi % 12) + 12) % 12;
  const octave = Math.floor(nearestMidi / 12) - 1;
  const targetFrequency = A4_FREQUENCY * 2 ** ((nearestMidi - 69) / 12);
  const cents = 1200 * Math.log2(frequency / targetFrequency);

  return {
    name: `${NOTE_NAMES[noteIndex]}${octave}`,
    note: NOTE_NAMES[noteIndex],
    octave,
    midi: nearestMidi,
    frequency,
    targetFrequency,
    cents
  };
}

export function formatFrequency(frequency) {
  return Number.isFinite(frequency) ? `${frequency.toFixed(1)} Hz` : "— Hz";
}

export function formatCents(cents) {
  if (!Number.isFinite(cents)) return "— cent";
  const rounded = Math.round(cents);
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded} cent`;
}
