import { dbfsToPercent, formatDbfs } from "../utils/audioMeter.js";

export class InputMeterPanel {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.fillElement = rootElement?.querySelector("[data-panel-fill]");
    this.peakElement = rootElement?.querySelector("[data-panel-peak]");
    this.rmsElement = rootElement?.querySelector("[data-panel-rms]");
    this.peakElementValue = rootElement?.querySelector("[data-panel-peak-value]");
    this.peakHoldElement = rootElement?.querySelector("[data-panel-peak-hold]");
    this.clipElement = rootElement?.querySelector("[data-panel-clip]");
    this.displayDbfs = -60;
  }

  update({ active, rmsDbfs, peakDbfs, peakHoldDbfs, clipped }) {
    if (!this.rootElement) return;

    this.rootElement.dataset.active = active ? "true" : "false";
    this.rootElement.dataset.clipped = clipped ? "true" : "false";

    if (!active) {
      this.displayDbfs = -60;
      if (this.fillElement) this.fillElement.style.width = "0%";
      if (this.peakElement) this.peakElement.hidden = true;
      if (this.rmsElement) this.rmsElement.textContent = "-∞ dBFS";
      if (this.peakElementValue) this.peakElementValue.textContent = "-∞ dBFS";
      if (this.peakHoldElement) this.peakHoldElement.textContent = "-∞ dBFS";
      if (this.clipElement) this.clipElement.hidden = true;
      return;
    }

    if (Number.isFinite(rmsDbfs)) {
      this.displayDbfs += (rmsDbfs - this.displayDbfs) * 0.28;
    }

    if (this.fillElement) {
      this.fillElement.style.width = `${dbfsToPercent(this.displayDbfs)}%`;
    }

    if (this.peakElement) {
      this.peakElement.style.left = `${dbfsToPercent(peakHoldDbfs)}%`;
      this.peakElement.hidden = !Number.isFinite(peakHoldDbfs);
    }

    if (this.rmsElement) this.rmsElement.textContent = formatDbfs(rmsDbfs);
    if (this.peakElementValue) this.peakElementValue.textContent = formatDbfs(peakDbfs);
    if (this.peakHoldElement) this.peakHoldElement.textContent = formatDbfs(peakHoldDbfs);
    if (this.clipElement) this.clipElement.hidden = !clipped;
  }
}
