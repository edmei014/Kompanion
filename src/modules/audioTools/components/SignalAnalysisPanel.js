import { SignalAnalyzer } from "../utils/signalAnalysis.js";

export class SignalAnalysisPanel {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.analyzer = new SignalAnalyzer();
    this.badgeElements = {
      signalState: rootElement?.querySelector("[data-badge='signalState']"),
      signalType: rootElement?.querySelector("[data-badge='signalType']"),
      channelMode: rootElement?.querySelector("[data-badge='channelMode']")
    };
    this.metricElements = {
      noiseFloor: rootElement?.querySelector("[data-metric='noiseFloor']"),
      dynamicRange: rootElement?.querySelector("[data-metric='dynamicRange']"),
      crestFactor: rootElement?.querySelector("[data-metric='crestFactor']"),
      dominantFrequency: rootElement?.querySelector("[data-metric='dominantFrequency']"),
      pitchStability: rootElement?.querySelector("[data-metric='pitchStability']")
    };
  }

  update(analysis) {
    if (!this.rootElement) return;

    const result = this.analyzer.analyze(analysis);
    const isActive = Boolean(analysis?.active) && result.signalState !== "none";

    this.rootElement.dataset.active = isActive ? "true" : "false";
    this.rootElement.dataset.signalState = result.signalState;
    this.rootElement.dataset.signalType = result.signalType;

    this.setBadge(this.badgeElements.signalState, {
      label: "Signal State",
      value: result.signalStateLabel,
      tone: result.tones.signalState,
      icon: "state"
    });

    this.setBadge(this.badgeElements.signalType, {
      label: "Signal Type",
      value: result.signalTypeLabel,
      tone: result.tones.signalType,
      icon: "type"
    });

    this.setBadge(this.badgeElements.channelMode, {
      label: "Channel Mode",
      value: result.channelMode,
      tone: result.tones.channelMode,
      icon: "channel"
    });

    this.setMetric(this.metricElements.noiseFloor, {
      label: "Noise Floor",
      value: result.noiseFloorLabel,
      tone: "neutral"
    });

    this.setMetric(this.metricElements.dynamicRange, {
      label: "Dynamic Range",
      value: result.dynamicRangeLabel,
      tone: result.tones.dynamicRange
    });

    this.setMetric(this.metricElements.crestFactor, {
      label: "Crest Factor",
      value: result.crestFactorLabel,
      tone: result.tones.crestFactor
    });

    this.setMetric(this.metricElements.dominantFrequency, {
      label: "Dominant Frequency",
      value: result.dominantFrequencyLabel,
      tone: Number.isFinite(result.dominantFrequencyHz) ? "stable" : "neutral"
    });

    this.setMetric(this.metricElements.pitchStability, {
      label: "Pitch Stability",
      value: result.pitchStability.label,
      tone: result.pitchStability.tone
    });
  }

  setBadge(element, { label, value, tone, icon }) {
    if (!element) return;

    element.dataset.tone = tone;
    element.dataset.icon = icon;

    const labelElement = element.querySelector("[data-badge-label]");
    const valueElement = element.querySelector("[data-badge-value]");

    if (labelElement) labelElement.textContent = label;
    if (valueElement) valueElement.textContent = value;
  }

  setMetric(element, { label, value, tone }) {
    if (!element) return;

    element.dataset.tone = tone;

    const labelElement = element.querySelector("[data-metric-label]");
    const valueElement = element.querySelector("[data-metric-value]");

    if (labelElement) labelElement.textContent = label;
    if (valueElement) valueElement.textContent = value;
  }
}
