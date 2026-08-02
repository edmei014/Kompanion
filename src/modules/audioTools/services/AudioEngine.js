import { isClipped, PEAK_HOLD_MS } from "../utils/audioMeter.js";
import {
  analyzeSampleBuffer,
  detectChannelMode,
  parseChannelDisplayLabels,
  updateChannelActivity
} from "../utils/channelAnalysis.js";

const AUDIO_STATUS = {
  IDLE: "idle",
  UNSUPPORTED: "unsupported",
  NO_DEVICE: "no_device",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  FAILED: "failed"
};

export class AudioEngine extends EventTarget {
  constructor() {
    super();
    this.devices = [];
    this.selectedDeviceId = "";
    this.status = AUDIO_STATUS.IDLE;
    this.errorMessage = "";
    this.levelDbfs = Number.NEGATIVE_INFINITY;
    this.peakDbfs = Number.NEGATIVE_INFINITY;
    this.peakHoldDbfs = Number.NEGATIVE_INFINITY;
    this.peakHoldUntil = 0;
    this.rmsLinear = 0;
    this.peakLinear = 0;
    this.clipped = false;
    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.channelSplitter = null;
    this.channelAnalysers = [];
    this.channelBuffers = [];
    this.channelActivity = [false, false];
    this.channelCount = 1;
    this.channelLabels = ["Input 1", "Input 2"];
    this.channelMode = "none";
    this.channelModeLabel = "No Signal";
    this.channelMetrics = [];
    this.levelBuffer = null;
    this.frequencyBuffer = null;
    this.analysisFrame = 0;
  }

  isSupported() {
    return Boolean(navigator.mediaDevices?.enumerateDevices && navigator.mediaDevices?.getUserMedia);
  }

  mapDevices(rawDevices, kind, fallbackLabel) {
    return rawDevices
      .filter((device) => device.kind === kind)
      .map((device, index) => ({
        id: device.deviceId || `${kind}-${index + 1}`,
        deviceId: device.deviceId,
        label: device.label || `${fallbackLabel} ${index + 1}`,
        isDefault: device.deviceId === "default"
      }));
  }

  async refreshDevices() {
    if (!this.isSupported()) {
      this.devices = [];
      this.setStatus(AUDIO_STATUS.UNSUPPORTED, "Audio input is not supported in this environment.");
      return this.devices;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = this.mapDevices(devices, "audioinput", "Audio Input");

      if (!this.devices.length) {
        this.selectedDeviceId = "";
        this.setStatus(AUDIO_STATUS.NO_DEVICE, "");
      } else if (!this.devices.some((device) => device.id === this.selectedDeviceId)) {
        this.selectedDeviceId = this.devices[0].id;
      }

      if (this.status !== AUDIO_STATUS.CONNECTED && this.status !== AUDIO_STATUS.CONNECTING) {
        this.setStatus(AUDIO_STATUS.IDLE, "");
      } else {
        this.emitState();
      }

      return this.devices;
    } catch (error) {
      this.devices = [];
      this.selectedDeviceId = "";
      this.setStatus(AUDIO_STATUS.FAILED, getErrorMessage(error));
      return this.devices;
    }
  }

  selectDevice(deviceId) {
    this.selectedDeviceId = deviceId || "";

    if (!this.selectedDeviceId) {
      this.disconnect();
      this.setStatus(AUDIO_STATUS.NO_DEVICE, "");
      return;
    }

    if (this.status === AUDIO_STATUS.CONNECTED || this.status === AUDIO_STATUS.CONNECTING) {
      this.disconnect();
    }

    this.setStatus(AUDIO_STATUS.IDLE, "");
  }

  async connect() {
    await this.openSelectedDevice();
  }

  disconnect() {
    this.closeStream();

    if (this.devices.length) {
      this.setStatus(AUDIO_STATUS.IDLE, "");
    } else {
      this.setStatus(AUDIO_STATUS.NO_DEVICE, "");
    }

    this.emitAnalysisFrame(false);
  }

  async openSelectedDevice() {
    if (!this.isSupported()) {
      this.setStatus(AUDIO_STATUS.UNSUPPORTED, "Audio input is not supported in this environment.");
      return;
    }

    if (!this.selectedDeviceId) {
      this.setStatus(AUDIO_STATUS.NO_DEVICE, "");
      return;
    }

    this.closeStream();
    this.setStatus(AUDIO_STATUS.CONNECTING, "");

    try {
      const selectedDevice = this.devices.find((device) => device.id === this.selectedDeviceId);
      const deviceConstraint = selectedDevice?.deviceId
        ? { deviceId: { exact: selectedDevice.deviceId } }
        : {};

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...deviceConstraint,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.72;
      this.levelBuffer = new Float32Array(this.analyserNode.fftSize);
      this.frequencyBuffer = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.sourceNode.connect(this.analyserNode);
      this.setupChannelAnalysis(selectedDevice?.label);

      this.setStatus(AUDIO_STATUS.CONNECTED, "");
      this.startAnalysisLoop();
      await this.refreshDevices();
    } catch (error) {
      this.closeStream();
      this.setStatus(AUDIO_STATUS.FAILED, getErrorMessage(error));
    }
  }

  closeStream() {
    if (this.analysisFrame) {
      cancelAnimationFrame(this.analysisFrame);
      this.analysisFrame = 0;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.channelSplitter) {
      this.channelSplitter.disconnect();
      this.channelSplitter = null;
    }

    this.channelAnalysers.forEach((analyser) => analyser.disconnect());
    this.channelAnalysers = [];
    this.channelBuffers = [];

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.levelBuffer = null;
    this.frequencyBuffer = null;
    this.resetLevels();
    this.resetChannelAnalysis();
    this.emitState();
  }

  setupChannelAnalysis(deviceLabel) {
    const track = this.stream?.getAudioTracks()[0];
    const settings = track?.getSettings?.() ?? {};
    const reportedCount = Number.isFinite(settings.channelCount) ? settings.channelCount : null;

    this.channelCount = reportedCount && reportedCount > 0 ? reportedCount : 2;
    this.channelLabels = parseChannelDisplayLabels(deviceLabel, this.channelCount);
    this.resetChannelAnalysis();

    if (!this.sourceNode || !this.audioContext) return;

    const splitterOutputs = Math.max(2, this.channelCount);
    this.channelSplitter = this.audioContext.createChannelSplitter(splitterOutputs);
    this.channelAnalysers = [];
    this.channelBuffers = [];

    for (let index = 0; index < 2; index += 1) {
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.72;
      this.channelAnalysers.push(analyser);
      this.channelBuffers.push(new Float32Array(analyser.fftSize));
      this.channelSplitter.connect(analyser, index);
    }

    this.sourceNode.connect(this.channelSplitter);
  }

  resetChannelAnalysis() {
    this.channelActivity = [false, false];
    this.channelMode = "none";
    this.channelModeLabel = "No Signal";
    this.channelMetrics = [];
  }

  resetLevels() {
    this.levelDbfs = Number.NEGATIVE_INFINITY;
    this.peakDbfs = Number.NEGATIVE_INFINITY;
    this.peakHoldDbfs = Number.NEGATIVE_INFINITY;
    this.peakHoldUntil = 0;
    this.rmsLinear = 0;
    this.peakLinear = 0;
    this.clipped = false;
  }

  startAnalysisLoop() {
    const update = (now) => {
      if (!this.analyserNode || !this.levelBuffer || !this.frequencyBuffer) return;

      this.analyserNode.getFloatTimeDomainData(this.levelBuffer);
      this.analyserNode.getByteFrequencyData(this.frequencyBuffer);

      let sum = 0;
      let peak = 0;

      for (const sample of this.levelBuffer) {
        const abs = Math.abs(sample);
        sum += sample * sample;
        if (abs > peak) peak = abs;
      }

      this.rmsLinear = Math.sqrt(sum / this.levelBuffer.length);
      this.peakLinear = peak;
      this.levelDbfs = this.rmsLinear > 0 ? 20 * Math.log10(this.rmsLinear) : Number.NEGATIVE_INFINITY;
      this.peakDbfs = this.peakLinear > 0 ? 20 * Math.log10(this.peakLinear) : Number.NEGATIVE_INFINITY;
      this.clipped = isClipped(this.peakDbfs);

      if (Number.isFinite(this.peakDbfs) && this.peakDbfs >= this.peakHoldDbfs) {
        this.peakHoldDbfs = this.peakDbfs;
        this.peakHoldUntil = now + PEAK_HOLD_MS;
      } else if (now > this.peakHoldUntil) {
        this.peakHoldDbfs = Number.isFinite(this.peakDbfs) ? this.peakDbfs : Number.NEGATIVE_INFINITY;
      }

      this.updateChannelAnalysis();
      this.emitAnalysisFrame(true);
      this.analysisFrame = requestAnimationFrame(update);
    };

    this.analysisFrame = requestAnimationFrame(update);
  }

  updateChannelAnalysis() {
    const analysedChannels = this.channelAnalysers.map((analyser, index) => {
      const buffer = this.channelBuffers[index];
      if (!analyser || !buffer) {
        return {
          index,
          rmsDbfs: Number.NEGATIVE_INFINITY,
          peakDbfs: Number.NEGATIVE_INFINITY,
          levelDbfs: Number.NEGATIVE_INFINITY,
          active: false,
          highlight: false
        };
      }

      analyser.getFloatTimeDomainData(buffer);
      const metrics = analyzeSampleBuffer(buffer);
      const active = updateChannelActivity(metrics.rmsDbfs, this.channelActivity[index]);
      this.channelActivity[index] = active;

      return {
        index,
        ...metrics,
        active
      };
    });

    const visibleCount = Math.max(1, Math.min(this.channelCount || 2, 2));
    const modeResult = detectChannelMode(this.channelActivity, visibleCount);
    this.channelMode = modeResult.mode;
    this.channelModeLabel = modeResult.label;

    this.channelMetrics = analysedChannels.slice(0, visibleCount).map((channel) => ({
      ...channel,
      highlight: this.getChannelHighlight(channel.index, modeResult.mode, visibleCount)
    }));
  }

  getChannelHighlight(channelIndex, mode, channelCount) {
    if (mode === "none") return false;
    if (channelCount <= 1) return channelIndex === 0;
    if (mode === "stereo") return true;
    if (mode === "input1") return channelIndex === 0;
    if (mode === "input2") return channelIndex === 1;
    return false;
  }

  buildChannelAnalysis() {
    return {
      mode: this.channelMode,
      label: this.channelModeLabel,
      channelCount: this.channelCount,
      channelLabels: this.channelLabels.slice(0, Math.max(1, Math.min(this.channelCount || 2, 2))),
      channels: this.channelMetrics.map((channel) => ({ ...channel }))
    };
  }

  emitAnalysisFrame(active) {
    this.dispatchEvent(
      new CustomEvent("analysisframe", {
        detail: {
          active,
          timeDomain: this.levelBuffer,
          frequency: this.frequencyBuffer,
          sampleRate: this.audioContext?.sampleRate ?? null,
          levelDbfs: this.levelDbfs,
          rmsDbfs: this.levelDbfs,
          peakDbfs: this.peakDbfs,
          peakHoldDbfs: this.peakHoldDbfs,
          clipped: this.clipped,
          channelAnalysis: active ? this.buildChannelAnalysis() : null
        }
      })
    );
  }

  buildDeviceInfo() {
    if (this.status !== AUDIO_STATUS.CONNECTED || !this.stream) {
      return null;
    }

    const track = this.stream.getAudioTracks()[0];
    const settings = track?.getSettings?.() ?? {};
    const selectedDevice = this.devices.find((device) => device.id === this.selectedDeviceId);
    const channelCount = Number.isFinite(settings.channelCount) ? settings.channelCount : null;

    return {
      name: selectedDevice?.label || track?.label || null,
      sampleRate:
        Number.isFinite(this.audioContext?.sampleRate)
          ? this.audioContext.sampleRate
          : Number.isFinite(settings.sampleRate)
            ? settings.sampleRate
            : null,
      channelCount,
      channelLayout: getChannelLayout(channelCount),
      connectionActive: track?.readyState === "live"
    };
  }

  buildMetrics() {
    if (this.status !== AUDIO_STATUS.CONNECTED) {
      return {
        rmsDbfs: null,
        peakDbfs: null,
        sampleRate: null,
        channelCount: null,
        bufferSize: null,
        baseLatency: null,
        outputLatency: null,
        inputLatency: null
      };
    }

    const track = this.stream?.getAudioTracks()[0];
    const settings = track?.getSettings?.() ?? {};
    const channelCount = Number.isFinite(settings.channelCount) ? settings.channelCount : null;

    return {
      rmsDbfs: Number.isFinite(this.levelDbfs) ? this.levelDbfs : null,
      peakDbfs: Number.isFinite(this.peakDbfs) ? this.peakDbfs : null,
      sampleRate: Number.isFinite(this.audioContext?.sampleRate) ? this.audioContext.sampleRate : null,
      channelCount,
      bufferSize: this.analyserNode?.fftSize ?? null,
      baseLatency: Number.isFinite(this.audioContext?.baseLatency) ? this.audioContext.baseLatency : null,
      outputLatency: Number.isFinite(this.audioContext?.outputLatency)
        ? this.audioContext.outputLatency
        : null,
      inputLatency: null
    };
  }

  setStatus(status, errorMessage) {
    this.status = status;
    this.errorMessage = errorMessage;
    this.emitState();
  }

  getState() {
    return {
      devices: [...this.devices],
      selectedDeviceId: this.selectedDeviceId,
      status: this.status,
      errorMessage: this.errorMessage,
      deviceInfo: this.buildDeviceInfo(),
      metrics: this.buildMetrics()
    };
  }

  emitState() {
    this.dispatchEvent(new CustomEvent("statechange", { detail: this.getState() }));
  }
}

function getChannelLayout(channelCount) {
  if (channelCount === 1) return "Mono";
  if (channelCount === 2) return "Stereo";
  if (channelCount > 2) return `${channelCount} Channels`;
  return null;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown audio error";
}
