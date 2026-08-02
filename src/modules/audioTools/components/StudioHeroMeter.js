import { dbfsToPercent, formatDbfs } from "../utils/audioMeter.js";

export class StudioHeroMeter {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.fillElement = rootElement?.querySelector("[data-meter-fill]");
    this.peakElement = rootElement?.querySelector("[data-meter-peak]");
    this.levelElement = rootElement?.querySelector("[data-value='level']");
    this.rmsElement = rootElement?.querySelector("[data-value='rms']");
    this.peakValueElement = rootElement?.querySelector("[data-value='peak']");
    this.peakHoldElement = rootElement?.querySelector("[data-value='peakHold']");
    this.clipElement = rootElement?.querySelector("[data-value='clip']");
    this.displayDbfs = -60;
  }

  update({ active, levelDbfs, rmsDbfs, peakDbfs, peakHoldDbfs, clipped }) {
    if (!this.rootElement) return;

    this.rootElement.dataset.active = active ? "true" : "false";
    this.rootElement.dataset.clipped = clipped ? "true" : "false";

    if (!active) {
      this.displayDbfs = -60;
      this.setBar(0, 0);
      this.setValues({
        levelDbfs: Number.NEGATIVE_INFINITY,
        rmsDbfs: Number.NEGATIVE_INFINITY,
        peakDbfs: Number.NEGATIVE_INFINITY,
        peakHoldDbfs: Number.NEGATIVE_INFINITY,
        clipped: false
      });
      return;
    }

    if (Number.isFinite(levelDbfs)) {
      this.displayDbfs += (levelDbfs - this.displayDbfs) * 0.24;
    }

    this.setBar(dbfsToPercent(this.displayDbfs), dbfsToPercent(peakHoldDbfs));
    this.setValues({ levelDbfs, rmsDbfs, peakDbfs, peakHoldDbfs, clipped });
  }

  setBar(levelPercent, peakHoldPercent) {
    if (this.fillElement) {
      this.fillElement.style.width = `${levelPercent}%`;
    }

    if (this.peakElement) {
      this.peakElement.style.left = `${peakHoldPercent}%`;
      this.peakElement.hidden = !Number.isFinite(peakHoldPercent) || peakHoldPercent <= 0;
    }
  }

  setValues({ levelDbfs, rmsDbfs, peakDbfs, peakHoldDbfs, clipped }) {
    if (this.levelElement) this.levelElement.textContent = formatDbfs(levelDbfs);
    if (this.rmsElement) this.rmsElement.textContent = formatDbfs(rmsDbfs);
    if (this.peakValueElement) this.peakValueElement.textContent = formatDbfs(peakDbfs);
    if (this.peakHoldElement) this.peakHoldElement.textContent = formatDbfs(peakHoldDbfs);

    if (this.clipElement) {
      this.clipElement.textContent = clipped ? "CLIP" : "—";
      this.clipElement.dataset.active = clipped ? "true" : "false";
    }
  }
}
