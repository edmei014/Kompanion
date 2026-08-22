import { AudioCapabilitiesPanel } from "./components/AudioCapabilitiesPanel.js";
import { AudioDeviceInfo } from "./components/AudioDeviceInfo.js";
import { AudioDeviceSelector } from "./components/AudioDeviceSelector.js";
import { ChannelAnalysisPanel } from "./components/ChannelAnalysisPanel.js";
import { ChromaticTuner } from "./components/ChromaticTuner.js";
import { InputMeterPanel } from "./components/InputMeterPanel.js";
import { Oscilloscope } from "./components/Oscilloscope.js";
import { SpectrumAnalyzer } from "./components/SpectrumAnalyzer.js";
import { SignalAnalysisPanel } from "./components/SignalAnalysisPanel.js";
import { StudioHeroMeter } from "./components/StudioHeroMeter.js";
import { AudioEngine } from "./services/AudioEngine.js";

const STATUS_LABELS = {
  idle: "Ready — select input and connect.",
  unsupported: "Audio input is not supported.",
  no_device: "No audio device detected.",
  connecting: "Opening audio input...",
  connected: "Audio Connected",
  failed: "Audio Connection Failed"
};

export class AudioToolsView {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.engine = new AudioEngine();
    /** When true, analysis frames are ignored (module hidden; engine may stay live). */
    this.visualsPaused = true;
    this.statusElement = rootElement?.querySelector("#audioToolsStatus");
    this.statusDot = rootElement?.querySelector("#audioToolsStatusDot");
    this.errorElement = rootElement?.querySelector("#audioToolsError");
    this.connectButton = rootElement?.querySelector("#audioToolsConnectButton");
    this.deviceSelector = new AudioDeviceSelector({
      selectElement: rootElement?.querySelector("#audioToolsDeviceSelect"),
      emptyElement: rootElement?.querySelector("#audioToolsEmptyState"),
      onDeviceChange: (deviceId) => {
        this.engine.selectDevice(deviceId);
      }
    });
    this.heroMeter = new StudioHeroMeter(rootElement?.querySelector("#audioToolsHeroMeter"));
    this.channelAnalysis = new ChannelAnalysisPanel(
      rootElement?.querySelector("#audioToolsChannelAnalysis")
    );
    this.inputMeterPanel = new InputMeterPanel(rootElement?.querySelector("#audioToolsInputMeterPanel"));
    this.oscilloscope = new Oscilloscope(rootElement?.querySelector("#audioToolsOscilloscope"));
    this.spectrumAnalyzer = new SpectrumAnalyzer(rootElement?.querySelector("#audioToolsSpectrum"));
    this.chromaticTuner = new ChromaticTuner(rootElement?.querySelector("#audioToolsTuner"));
    this.signalAnalysis = new SignalAnalysisPanel(
      rootElement?.querySelector("#audioToolsSignalAnalysis")
    );
    this.deviceInfo = new AudioDeviceInfo(rootElement?.querySelector("#audioToolsDeviceInfo"));
    this.capabilitiesPanel = new AudioCapabilitiesPanel(
      rootElement?.querySelector("#audioToolsCapabilities")
    );

    this.engine.addEventListener("statechange", (event) => {
      this.render(event.detail);
    });

    this.engine.addEventListener("analysisframe", (event) => {
      this.updateVisuals(event.detail);
    });

    this.connectButton?.addEventListener("click", () => {
      this.handleConnectToggle();
    });
  }

  async handleConnectToggle() {
    if (this.engine.status === "connected" || this.engine.status === "connecting") {
      this.engine.disconnect();
      return;
    }

    await this.engine.connect();
  }

  async show() {
    this.visualsPaused = false;
    await this.engine.refreshDevices();
  }

  hide() {
    // Keep connection/state; only stop painting while another module is active.
    this.visualsPaused = true;
  }

  updateVisuals(analysis) {
    if (this.visualsPaused) return;
    this.heroMeter.update(analysis);
    this.channelAnalysis.update(analysis);
    this.inputMeterPanel.update(analysis);
    this.oscilloscope.update(analysis);
    this.spectrumAnalyzer.update(analysis);
    this.chromaticTuner.update(analysis);
    this.signalAnalysis.update(analysis);
  }

  render(state) {
    if (!this.rootElement) return;

    const isConnected = state.status === "connected";
    const isBusy = state.status === "connecting";
    const canConnect = Boolean(state.selectedDeviceId) && state.status !== "unsupported";

    this.rootElement.dataset.audioStatus = state.status;
    this.deviceSelector.render(state.devices, state.selectedDeviceId);
    this.deviceSelector.setBusy(isBusy || isConnected);
    this.deviceInfo.render(state.deviceInfo, isConnected);
    this.capabilitiesPanel.render(state.metrics);

    if (!isConnected) {
      this.updateVisuals({ active: false });
    }

    if (this.connectButton) {
      this.connectButton.textContent = isConnected ? "Disconnect" : "Connect";
      this.connectButton.disabled = !canConnect || isBusy;
      this.connectButton.dataset.state = isConnected ? "connected" : "idle";
    }

    if (this.statusElement) {
      this.statusElement.textContent = STATUS_LABELS[state.status] || STATUS_LABELS.idle;
    }

    if (this.statusDot) {
      this.statusDot.dataset.state = state.status;
    }

    if (this.errorElement) {
      this.errorElement.textContent = state.errorMessage || "";
      this.errorElement.hidden = !state.errorMessage;
    }
  }
}

export function initializeAudioTools() {
  return new AudioToolsView(document.querySelector("#audioToolsView"));
}
