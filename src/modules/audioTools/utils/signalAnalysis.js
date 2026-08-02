import { SIGNAL_GATE_DB } from "./channelAnalysis.js";
import { isClipped } from "./audioMeter.js";
import { detectPitchYin } from "./yinPitch.js";

export const SIGNAL_STATES = {
  NONE: "none",
  ACTIVE: "active",
  CLIPPING: "clipping"
};

export const SIGNAL_STATE_LABELS = {
  [SIGNAL_STATES.NONE]: "No Signal",
  [SIGNAL_STATES.ACTIVE]: "Active",
  [SIGNAL_STATES.CLIPPING]: "Clipping"
};

export const SIGNAL_TYPES = {
  SUSTAINED_TONE: "sustained_tone",
  HARMONIC: "harmonic",
  PERCUSSIVE: "percussive",
  NOISE: "broadband_noise",
  UNKNOWN: "unknown"
};

export const SIGNAL_TYPE_LABELS = {
  [SIGNAL_TYPES.SUSTAINED_TONE]: "Sustained Tone",
  [SIGNAL_TYPES.HARMONIC]: "Harmonic Signal",
  [SIGNAL_TYPES.PERCUSSIVE]: "Percussive Signal",
  [SIGNAL_TYPES.NOISE]: "Broadband Noise",
  [SIGNAL_TYPES.UNKNOWN]: "Unknown"
};

const PITCH_HISTORY_SIZE = 24;
const TYPE_HOLD_FRAMES = 10;
const MIN_FREQ = 40;
const MAX_FREQ = 16000;

const CHANNEL_MODE_LABELS = {
  none: "—",
  input1: "Input 1",
  input2: "Input 2",
  stereo: "Stereo"
};

export class SignalAnalyzer {
  constructor() {
    this.reset();
  }

  reset() {
    this.noiseFloorDb = -72;
    this.smoothedRmsDb = Number.NEGATIVE_INFINITY;
    this.envelopePeakDb = Number.NEGATIVE_INFINITY;
    this.smoothedDominantFreq = null;
    this.pitchHistory = [];
    this.signalType = SIGNAL_TYPES.UNKNOWN;
    this.pendingSignalType = SIGNAL_TYPES.UNKNOWN;
    this.typeHoldFrames = 0;
  }

  analyze(frame) {
    if (!frame?.active) {
      this.reset();
      return this.buildResult(null);
    }

    const {
      timeDomain,
      frequency,
      sampleRate,
      rmsDbfs,
      peakDbfs,
      peakHoldDbfs,
      clipped,
      channelAnalysis
    } = frame;

    const hasSignal = Number.isFinite(rmsDbfs) && rmsDbfs > SIGNAL_GATE_DB;
    const signalState = this.detectSignalState(hasSignal, clipped, peakDbfs);
    const channelMode = this.mapChannelMode(channelAnalysis?.mode);

    if (!hasSignal || signalState === SIGNAL_STATES.NONE) {
      this.updateNoiseFloor(rmsDbfs, false);
      return this.buildResult({
        signalState: SIGNAL_STATES.NONE,
        signalType: SIGNAL_TYPES.UNKNOWN,
        channelMode,
        noiseFloorDb: this.noiseFloorDb,
        dynamicRangeDb: null,
        crestFactorDb: null,
        dominantFrequencyHz: null,
        pitchStability: null
      });
    }

    this.updateNoiseFloor(rmsDbfs, true);
    this.updateEnvelope(rmsDbfs, peakDbfs);

    const crestFactorDb = this.computeCrestFactor(peakDbfs, rmsDbfs);
    const dominantFrequencyHz = this.detectDominantFrequency(frequency, sampleRate);
    const pitchHz = this.detectPitch(timeDomain, sampleRate, rmsDbfs);
    const pitchStability = this.evaluatePitchStability(pitchHz);
    const flatness = this.computeSpectralFlatness(frequency, sampleRate);
    const harmonic = pitchHz ? this.hasHarmonicContent(frequency, sampleRate, pitchHz) : false;
    const zeroCrossingRate = this.computeZeroCrossingRate(timeDomain);

    const detectedType = this.detectSignalType({
      crestFactorDb,
      flatness,
      pitchHz,
      pitchStability,
      harmonic,
      zeroCrossingRate,
      rmsDbfs,
      peakDbfs
    });

    this.commitSignalType(detectedType);

    const dynamicRangeDb = this.computeDynamicRange(peakHoldDbfs ?? peakDbfs);

    return this.buildResult({
      signalState,
      signalType: this.signalType,
      channelMode,
      noiseFloorDb: this.noiseFloorDb,
      dynamicRangeDb,
      crestFactorDb,
      dominantFrequencyHz: pitchHz ?? dominantFrequencyHz,
      pitchStability
    });
  }

  detectSignalState(hasSignal, clipped, peakDbfs) {
    if (!hasSignal) return SIGNAL_STATES.NONE;
    if (clipped || isClipped(peakDbfs)) return SIGNAL_STATES.CLIPPING;
    return SIGNAL_STATES.ACTIVE;
  }

  mapChannelMode(mode) {
    return CHANNEL_MODE_LABELS[mode] ?? "—";
  }

  updateNoiseFloor(rmsDbfs, hasSignal) {
    if (!Number.isFinite(rmsDbfs)) return;

    if (!hasSignal || rmsDbfs <= SIGNAL_GATE_DB) {
      this.noiseFloorDb += (rmsDbfs - this.noiseFloorDb) * 0.06;
    } else if (rmsDbfs < this.noiseFloorDb + 8) {
      this.noiseFloorDb += (rmsDbfs - this.noiseFloorDb) * 0.03;
    }

    this.noiseFloorDb = Math.max(-90, Math.min(-24, this.noiseFloorDb));
  }

  updateEnvelope(rmsDbfs, peakDbfs) {
    if (Number.isFinite(rmsDbfs)) {
      this.smoothedRmsDb = Number.isFinite(this.smoothedRmsDb)
        ? this.smoothedRmsDb * 0.88 + rmsDbfs * 0.12
        : rmsDbfs;
    }

    if (Number.isFinite(peakDbfs)) {
      this.envelopePeakDb = Number.isFinite(this.envelopePeakDb)
        ? Math.max(peakDbfs, this.envelopePeakDb * 0.96)
        : peakDbfs;
    }
  }

  computeCrestFactor(peakDbfs, rmsDbfs) {
    if (!Number.isFinite(peakDbfs) || !Number.isFinite(rmsDbfs)) return null;
    return peakDbfs - rmsDbfs;
  }

  computeDynamicRange(peakDbfs) {
    if (!Number.isFinite(peakDbfs) || !Number.isFinite(this.noiseFloorDb)) return null;
    return Math.max(0, peakDbfs - this.noiseFloorDb);
  }

  detectDominantFrequency(frequency, sampleRate) {
    if (!frequency?.length || !sampleRate) return null;

    const binCount = frequency.length;
    const nyquist = sampleRate / 2;
    const minBin = Math.max(1, Math.floor((MIN_FREQ * binCount) / nyquist));
    const maxBin = Math.min(binCount - 1, Math.ceil((MAX_FREQ * binCount) / nyquist));

    let peakValue = 0;
    let peakBin = 0;

    for (let bin = minBin; bin <= maxBin; bin += 1) {
      if (frequency[bin] > peakValue) {
        peakValue = frequency[bin];
        peakBin = bin;
      }
    }

    if (peakValue < 12) return null;

    const frequencyHz = (peakBin * nyquist) / binCount;

    this.smoothedDominantFreq = this.smoothedDominantFreq
      ? this.smoothedDominantFreq * 0.82 + frequencyHz * 0.18
      : frequencyHz;

    return this.smoothedDominantFreq;
  }

  detectPitch(timeDomain, sampleRate, rmsDbfs) {
    if (!timeDomain?.length || !sampleRate || rmsDbfs < SIGNAL_GATE_DB) return null;
    return detectPitchYin(timeDomain, sampleRate);
  }

  evaluatePitchStability(pitchHz) {
    if (!pitchHz) {
      return { label: "—", tone: "neutral", score: null };
    }

    this.pitchHistory.push(pitchHz);
    if (this.pitchHistory.length > PITCH_HISTORY_SIZE) {
      this.pitchHistory.shift();
    }

    if (this.pitchHistory.length < 6) {
      return { label: "Moderate", tone: "warning", score: null };
    }

    const mean =
      this.pitchHistory.reduce((total, value) => total + value, 0) / this.pitchHistory.length;
    const variance =
      this.pitchHistory.reduce((total, value) => total + (value - mean) ** 2, 0) /
      this.pitchHistory.length;
    const stdDev = Math.sqrt(variance);
    const centsSpread = 1200 * Math.log2(1 + stdDev / mean);

    if (centsSpread <= 12) {
      return { label: "Stable", tone: "stable", score: centsSpread };
    }

    if (centsSpread <= 35) {
      return { label: "Moderate", tone: "warning", score: centsSpread };
    }

    return { label: "Unstable", tone: "warning", score: centsSpread };
  }

  computeSpectralFlatness(frequency, sampleRate) {
    if (!frequency?.length || !sampleRate) return 0;

    const binCount = frequency.length;
    const nyquist = sampleRate / 2;
    let sumLog = 0;
    let sum = 0;
    let count = 0;

    for (let bin = 0; bin < binCount; bin += 1) {
      const freq = (bin * nyquist) / binCount;
      if (freq < 120 || freq > 10000) continue;

      const magnitude = Math.max(1, frequency[bin]);
      sumLog += Math.log(magnitude);
      sum += magnitude;
      count += 1;
    }

    if (!count || !sum) return 0;

    const geoMean = Math.exp(sumLog / count);
    const arithMean = sum / count;
    return geoMean / arithMean;
  }

  hasHarmonicContent(frequency, sampleRate, fundamentalHz) {
    if (!frequency?.length || !sampleRate || !fundamentalHz) return false;

    const nyquist = sampleRate / 2;
    const binCount = frequency.length;

    const readEnergy = (targetHz) => {
      const bin = Math.round((targetHz * binCount) / nyquist);
      let peak = 0;

      for (let offset = -1; offset <= 1; offset += 1) {
        const index = bin + offset;
        if (index >= 0 && index < binCount) {
          peak = Math.max(peak, frequency[index]);
        }
      }

      return peak;
    };

    const fundamental = readEnergy(fundamentalHz);
    if (fundamental < 18) return false;

    const second = readEnergy(fundamentalHz * 2);
    const third = readEnergy(fundamentalHz * 3);

    return second > fundamental * 0.14 && third > fundamental * 0.07;
  }

  computeZeroCrossingRate(timeDomain) {
    if (!timeDomain?.length) return 0;

    let crossings = 0;

    for (let index = 1; index < timeDomain.length; index += 1) {
      if ((timeDomain[index - 1] >= 0) !== (timeDomain[index] >= 0)) {
        crossings += 1;
      }
    }

    return crossings / timeDomain.length;
  }

  detectSignalType({
    crestFactorDb,
    flatness,
    pitchHz,
    pitchStability,
    harmonic,
    zeroCrossingRate,
    rmsDbfs,
    peakDbfs
  }) {
    const envelopeGap =
      Number.isFinite(this.envelopePeakDb) && Number.isFinite(this.smoothedRmsDb)
        ? this.envelopePeakDb - this.smoothedRmsDb
        : 0;

    if (Number.isFinite(crestFactorDb) && crestFactorDb >= 14 && envelopeGap >= 10) {
      return SIGNAL_TYPES.PERCUSSIVE;
    }

    if (Number.isFinite(crestFactorDb) && crestFactorDb >= 12 && flatness >= 0.18) {
      return SIGNAL_TYPES.PERCUSSIVE;
    }

    if (pitchHz) {
      if (harmonic) return SIGNAL_TYPES.HARMONIC;
      if (pitchStability?.label === "Stable") return SIGNAL_TYPES.SUSTAINED_TONE;
      if (harmonic || flatness < 0.12) return SIGNAL_TYPES.HARMONIC;
      return SIGNAL_TYPES.SUSTAINED_TONE;
    }

    if (flatness >= 0.22 || zeroCrossingRate >= 0.14) {
      return SIGNAL_TYPES.NOISE;
    }

    if (
      Number.isFinite(crestFactorDb) &&
      crestFactorDb >= 10 &&
      Number.isFinite(peakDbfs) &&
      Number.isFinite(rmsDbfs) &&
      peakDbfs - rmsDbfs >= 8
    ) {
      return SIGNAL_TYPES.PERCUSSIVE;
    }

    if (Number.isFinite(rmsDbfs) && rmsDbfs > SIGNAL_GATE_DB) {
      return SIGNAL_TYPES.UNKNOWN;
    }

    return SIGNAL_TYPES.UNKNOWN;
  }

  commitSignalType(detectedType) {
    if (detectedType === this.pendingSignalType) {
      this.typeHoldFrames += 1;
    } else {
      this.pendingSignalType = detectedType;
      this.typeHoldFrames = 0;
    }

    if (this.typeHoldFrames >= TYPE_HOLD_FRAMES || this.signalType === SIGNAL_TYPES.UNKNOWN) {
      this.signalType = detectedType;
    }
  }

  buildResult(values) {
    if (!values) {
      return {
        signalState: SIGNAL_STATES.NONE,
        signalStateLabel: SIGNAL_STATE_LABELS[SIGNAL_STATES.NONE],
        signalType: SIGNAL_TYPES.UNKNOWN,
        signalTypeLabel: SIGNAL_TYPE_LABELS[SIGNAL_TYPES.UNKNOWN],
        channelMode: "—",
        noiseFloorDb: null,
        noiseFloorLabel: "—",
        dynamicRangeDb: null,
        dynamicRangeLabel: "—",
        crestFactorDb: null,
        crestFactorLabel: "—",
        dominantFrequencyHz: null,
        dominantFrequencyLabel: "—",
        pitchStability: { label: "—", tone: "neutral" },
        tones: {
          signalState: "neutral",
          signalType: "neutral",
          channelMode: "neutral",
          pitchStability: "neutral"
        }
      };
    }

    const pitchStability = values.pitchStability ?? { label: "—", tone: "neutral" };

    return {
      signalState: values.signalState,
      signalStateLabel: SIGNAL_STATE_LABELS[values.signalState],
      signalType: values.signalType,
      signalTypeLabel: SIGNAL_TYPE_LABELS[values.signalType],
      channelMode: values.channelMode,
      noiseFloorDb: values.noiseFloorDb,
      noiseFloorLabel: formatDbfs(values.noiseFloorDb),
      dynamicRangeDb: values.dynamicRangeDb,
      dynamicRangeLabel: formatDb(values.dynamicRangeDb),
      crestFactorDb: values.crestFactorDb,
      crestFactorLabel: formatDb(values.crestFactorDb),
      dominantFrequencyHz: values.dominantFrequencyHz,
      dominantFrequencyLabel: formatHz(values.dominantFrequencyHz),
      pitchStability,
      tones: {
        signalState: toneForSignalState(values.signalState),
        signalType: toneForSignalType(values.signalType),
        channelMode: toneForChannelMode(values.channelMode),
        pitchStability: pitchStability.tone,
        dynamicRange: toneForDynamicRange(values.dynamicRangeDb),
        crestFactor: toneForCrestFactor(values.crestFactorDb)
      }
    };
  }
}

function toneForSignalState(state) {
  if (state === SIGNAL_STATES.CLIPPING) return "danger";
  if (state === SIGNAL_STATES.ACTIVE) return "stable";
  return "neutral";
}

function toneForSignalType(type) {
  if (type === SIGNAL_TYPES.UNKNOWN) return "warning";
  if (type === SIGNAL_TYPES.NOISE) return "warning";
  return "stable";
}

function toneForChannelMode(mode) {
  if (mode === "Stereo") return "stable";
  if (mode === "—") return "neutral";
  return "stable";
}

function toneForDynamicRange(value) {
  if (!Number.isFinite(value)) return "neutral";
  if (value >= 36) return "stable";
  if (value >= 18) return "warning";
  return "warning";
}

function toneForCrestFactor(value) {
  if (!Number.isFinite(value)) return "neutral";
  if (value >= 18) return "warning";
  if (value >= 8) return "stable";
  return "stable";
}

function formatDbfs(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} dBFS` : "—";
}

function formatDb(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} dB` : "—";
}

function formatHz(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} Hz` : "—";
}
