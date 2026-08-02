export const SIGNAL_GATE_DB = -42;
export const SIGNAL_RELEASE_DB = -48;

const CHANNEL_MODE = {
  NONE: "none",
  INPUT1: "input1",
  INPUT2: "input2",
  STEREO: "stereo"
};

const CHANNEL_MODE_LABELS = {
  [CHANNEL_MODE.NONE]: "No Signal",
  [CHANNEL_MODE.INPUT1]: "Input 1 Active",
  [CHANNEL_MODE.INPUT2]: "Input 2 Active",
  [CHANNEL_MODE.STEREO]: "Stereo Input"
};

export function analyzeSampleBuffer(buffer) {
  if (!buffer?.length) {
    return {
      rmsLinear: 0,
      peakLinear: 0,
      rmsDbfs: Number.NEGATIVE_INFINITY,
      peakDbfs: Number.NEGATIVE_INFINITY,
      levelDbfs: Number.NEGATIVE_INFINITY
    };
  }

  let sum = 0;
  let peak = 0;

  for (const sample of buffer) {
    const abs = Math.abs(sample);
    sum += sample * sample;
    if (abs > peak) peak = abs;
  }

  const rmsLinear = Math.sqrt(sum / buffer.length);
  const rmsDbfs = rmsLinear > 0 ? 20 * Math.log10(rmsLinear) : Number.NEGATIVE_INFINITY;
  const peakDbfs = peak > 0 ? 20 * Math.log10(peak) : Number.NEGATIVE_INFINITY;

  return {
    rmsLinear,
    peakLinear: peak,
    rmsDbfs,
    peakDbfs,
    levelDbfs: rmsDbfs
  };
}

export function updateChannelActivity(rmsDbfs, wasActive) {
  if (wasActive) {
    return Number.isFinite(rmsDbfs) && rmsDbfs > SIGNAL_RELEASE_DB;
  }

  return Number.isFinite(rmsDbfs) && rmsDbfs > SIGNAL_GATE_DB;
}

export function detectChannelMode(activeChannels, channelCount = 2) {
  const ch0 = Boolean(activeChannels[0]);
  const ch1 = channelCount > 1 ? Boolean(activeChannels[1]) : false;

  if (!ch0 && !ch1) {
    return { mode: CHANNEL_MODE.NONE, label: CHANNEL_MODE_LABELS[CHANNEL_MODE.NONE] };
  }

  if (channelCount <= 1) {
    return { mode: CHANNEL_MODE.INPUT1, label: CHANNEL_MODE_LABELS[CHANNEL_MODE.INPUT1] };
  }

  if (ch0 && ch1) {
    return { mode: CHANNEL_MODE.STEREO, label: CHANNEL_MODE_LABELS[CHANNEL_MODE.STEREO] };
  }

  if (ch0) {
    return { mode: CHANNEL_MODE.INPUT1, label: CHANNEL_MODE_LABELS[CHANNEL_MODE.INPUT1] };
  }

  return { mode: CHANNEL_MODE.INPUT2, label: CHANNEL_MODE_LABELS[CHANNEL_MODE.INPUT2] };
}

export function parseChannelDisplayLabels(deviceLabel, channelCount = 2) {
  const count = Math.max(1, channelCount || 2);
  const fallback = (index) => `Input ${index + 1}`;

  if (!deviceLabel || typeof deviceLabel !== "string") {
    return Array.from({ length: count }, (_, index) => fallback(index));
  }

  const analogPair = deviceLabel.match(/analog\s*(\d+)\s*(?:[+&/]|and)\s*(\d+)/i);
  if (analogPair) {
    return [`Analog ${analogPair[1]}`, `Analog ${analogPair[2]}`];
  }

  const usbMatch = deviceLabel.match(/usb\s*(\d+)\s*(?:[+&/]|and)\s*(\d+)/i);
  if (usbMatch) {
    return [`USB ${usbMatch[1]}`, `USB ${usbMatch[2]}`];
  }

  const micLine = deviceLabel.match(/\b(mic|line|input)\b/i);
  if (micLine && count === 1) {
    const label = micLine[1];
    return [`${label.charAt(0).toUpperCase()}${label.slice(1).toLowerCase()}`];
  }

  const numbered = [...deviceLabel.matchAll(/(?:mic|line|input|ch(?:annel)?|analog)\s*(\d+)/gi)];
  if (numbered.length >= 2) {
    return numbered.slice(0, count).map((match) => {
      const prefix = match[0].replace(/\s*\d+$/, "").trim();
      const normalized =
        prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase().replace(/\s+/g, " ");
      return `${normalized} ${match[1]}`;
    });
  }

  return Array.from({ length: count }, (_, index) => fallback(index));
}
