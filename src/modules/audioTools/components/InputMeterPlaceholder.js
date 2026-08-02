const METER_MIN_DB = -60;
const METER_MAX_DB = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dbfsToPercent(dbfs) {
  if (!Number.isFinite(dbfs)) return 0;
  return clamp(((dbfs - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)) * 100, 0, 100);
}

function formatDbfs(dbfs) {
  return Number.isFinite(dbfs) ? `${dbfs.toFixed(1)} dBFS` : "-∞ dBFS";
}

export class InputMeterPlaceholder {
  constructor({ rootElement, dbfsElement, fillElement, peakElement, clipElement }) {
    this.rootElement = rootElement;
    this.dbfsElement = dbfsElement;
    this.fillElement = fillElement;
    this.peakElement = peakElement;
    this.clipElement = clipElement;
    this.displayDbfs = METER_MIN_DB;
  }

  render({ levelDbfs, peakDbfs, peakHoldDbfs, clipped, status }) {
    const isActive = status === "connected";

    if (this.rootElement) {
      this.rootElement.dataset.active = isActive ? "true" : "false";
      this.rootElement.dataset.clipped = clipped ? "true" : "false";
    }

    if (Number.isFinite(levelDbfs)) {
      this.displayDbfs += (levelDbfs - this.displayDbfs) * 0.28;
    } else {
      this.displayDbfs = METER_MIN_DB;
    }

    const levelPercent = dbfsToPercent(this.displayDbfs);
    const peakHoldPercent = dbfsToPercent(peakHoldDbfs);

    if (this.fillElement) {
      this.fillElement.style.width = `${levelPercent}%`;
    }

    if (this.peakElement) {
      this.peakElement.style.left = `${peakHoldPercent}%`;
      this.peakElement.hidden = !isActive || !Number.isFinite(peakHoldDbfs);
    }

    if (this.dbfsElement) {
      this.dbfsElement.textContent = formatDbfs(levelDbfs);
    }

    if (this.clipElement) {
      this.clipElement.hidden = !clipped;
    }
  }
}
