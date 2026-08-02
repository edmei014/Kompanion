import { dbfsToPercent } from "../utils/audioMeter.js";

export class ChannelAnalysisPanel {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.statusDot = rootElement?.querySelector("[data-channel-status-dot]");
    this.statusText = rootElement?.querySelector("[data-channel-status-text]");
    this.metersElement = rootElement?.querySelector("[data-channel-meters]");
    this.meterElements = rootElement
      ? [...rootElement.querySelectorAll("[data-channel-meter]")]
      : [];
    this.displayLevels = this.meterElements.map(() => -60);
  }

  update({ active, channelAnalysis }) {
    if (!this.rootElement) return;

    this.rootElement.dataset.active = active ? "true" : "false";

    if (!active || !channelAnalysis) {
      this.rootElement.dataset.mode = "none";
      this.setStatus("none", "No Signal");
      this.setMeters([], 1, []);
      this.displayLevels = this.meterElements.map(() => -60);
      return;
    }

    const { mode, label, channels, channelCount, channelLabels } = channelAnalysis;

    this.rootElement.dataset.mode = mode;
    this.setStatus(mode, label);
    this.setMeters(channels, channelCount, channelLabels);
  }

  setStatus(mode, label) {
    if (this.statusDot) {
      this.statusDot.dataset.state = mode;
    }

    if (this.statusText) {
      this.statusText.textContent = label;
    }
  }

  setMeters(channels, channelCount, channelLabels = []) {
    const visibleCount = Math.max(1, Math.min(channelCount || 2, 2));
    const hasChannelData = channels.length > 0;

    if (this.metersElement) {
      this.metersElement.hidden = !hasChannelData;
      this.metersElement.dataset.layout = visibleCount === 1 ? "mono" : "stereo";
    }

    this.meterElements.forEach((meterElement, index) => {
      const channel = channels[index];
      const isVisible = index < visibleCount && hasChannelData;
      meterElement.hidden = !isVisible;

      if (!isVisible || !channel) {
        meterElement.dataset.active = "false";
        meterElement.dataset.highlight = "false";
        this.setMeterFill(meterElement, 0);
        return;
      }

      const labelElement = meterElement.querySelector("[data-channel-label]");
      if (labelElement) {
        labelElement.textContent = channelLabels[index] || `Input ${index + 1}`;
      }

      meterElement.dataset.active = channel.active ? "true" : "false";
      meterElement.dataset.highlight = channel.highlight ? "true" : "false";

      if (Number.isFinite(channel.levelDbfs)) {
        this.displayLevels[index] += (channel.levelDbfs - this.displayLevels[index]) * 0.24;
      } else {
        this.displayLevels[index] += (-60 - this.displayLevels[index]) * 0.18;
      }

      this.setMeterFill(meterElement, dbfsToPercent(this.displayLevels[index]));
    });
  }

  setMeterFill(meterElement, percent) {
    const fillElement = meterElement.querySelector("[data-channel-fill]");
    if (fillElement) {
      fillElement.style.height = `${percent}%`;
    }
  }
}
