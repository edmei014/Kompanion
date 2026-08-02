const UNKNOWN = "Unknown";

function formatValue(value) {
  if (value === null || value === undefined || value === "") return UNKNOWN;
  return String(value);
}

export class AudioDeviceInfo {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.nameElement = rootElement?.querySelector("[data-field='name']");
    this.sampleRateElement = rootElement?.querySelector("[data-field='sampleRate']");
    this.channelCountElement = rootElement?.querySelector("[data-field='channelCount']");
    this.channelLayoutElement = rootElement?.querySelector("[data-field='channelLayout']");
    this.connectionElement = rootElement?.querySelector("[data-field='connectionActive']");
  }

  render(deviceInfo, isConnected) {
    if (!this.rootElement) return;

    const info = isConnected && deviceInfo ? deviceInfo : null;

    if (this.nameElement) {
      this.nameElement.textContent = formatValue(info?.name);
    }

    if (this.sampleRateElement) {
      this.sampleRateElement.textContent =
        info?.sampleRate !== null && info?.sampleRate !== undefined
          ? `${info.sampleRate} Hz`
          : UNKNOWN;
    }

    if (this.channelCountElement) {
      this.channelCountElement.textContent =
        info?.channelCount !== null && info?.channelCount !== undefined
          ? String(info.channelCount)
          : UNKNOWN;
    }

    if (this.channelLayoutElement) {
      this.channelLayoutElement.textContent = formatValue(info?.channelLayout);
    }

    if (this.connectionElement) {
      this.connectionElement.textContent = info?.connectionActive ? "Yes" : isConnected ? "No" : UNKNOWN;
    }
  }
}
