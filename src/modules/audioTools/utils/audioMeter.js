export const METER_MIN_DB = -60;
export const METER_MAX_DB = 0;
export const CLIP_THRESHOLD_DB = -0.5;
export const PEAK_HOLD_MS = 2000;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function dbfsToPercent(dbfs) {
  if (!Number.isFinite(dbfs)) return 0;
  return clamp(((dbfs - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)) * 100, 0, 100);
}

export function formatDbfs(dbfs) {
  return Number.isFinite(dbfs) ? `${dbfs.toFixed(1)} dBFS` : "-∞ dBFS";
}

export function isClipped(peakDbfs) {
  return Number.isFinite(peakDbfs) && peakDbfs > CLIP_THRESHOLD_DB;
}
