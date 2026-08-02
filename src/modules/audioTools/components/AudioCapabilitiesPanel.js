const UNKNOWN = "Unknown";

const METRIC_FIELDS = [
  { key: "rmsDbfs", label: "RMS", format: (value) => `${value.toFixed(1)} dBFS` },
  { key: "peakDbfs", label: "Peak", format: (value) => `${value.toFixed(1)} dBFS` },
  { key: "sampleRate", label: "Sample Rate", format: (value) => `${value} Hz` },
  { key: "channelCount", label: "Channel Count", format: (value) => String(value) },
  { key: "bufferSize", label: "Buffer Size", format: (value) => `${value} samples` },
  {
    key: "baseLatency",
    label: "Base Latency",
    format: (value) => `${(value * 1000).toFixed(2)} ms`
  },
  {
    key: "outputLatency",
    label: "Output Latency",
    format: (value) => `${(value * 1000).toFixed(2)} ms`
  },
  {
    key: "inputLatency",
    label: "Input Latency",
    format: (value) => `${(value * 1000).toFixed(2)} ms`
  }
];

export class AudioCapabilitiesPanel {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.valueElements = new Map();

    if (rootElement) {
      rootElement.querySelectorAll("[data-metric]").forEach((element) => {
        this.valueElements.set(element.dataset.metric, element);
      });
    }
  }

  render(metrics) {
    if (!this.rootElement) return;

    METRIC_FIELDS.forEach(({ key, format }) => {
      const element = this.valueElements.get(key);
      if (!element) return;

      const value = metrics?.[key];
      element.textContent =
        value === null || value === undefined ? UNKNOWN : format(value);
    });
  }
}
