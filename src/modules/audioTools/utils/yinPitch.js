const DEFAULT_THRESHOLD = 0.12;
const DEFAULT_MIN_FREQ = 50;
const DEFAULT_MAX_FREQ = 1400;

export function detectPitchYin(buffer, sampleRate, options = {}) {
  if (!buffer?.length || !sampleRate) return null;

  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const minFreq = options.minFreq ?? DEFAULT_MIN_FREQ;
  const maxFreq = options.maxFreq ?? DEFAULT_MAX_FREQ;
  const halfSize = Math.floor(buffer.length / 2);
  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
  const maxTau = Math.min(halfSize - 1, Math.floor(sampleRate / minFreq));

  if (maxTau <= minTau) return null;

  const yinBuffer = new Float32Array(maxTau + 1);

  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let index = 0; index < halfSize; index += 1) {
      const delta = buffer[index] - buffer[index + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  let runningSum = 0;
  yinBuffer[0] = 1;

  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum > 0 ? (yinBuffer[tau] * tau) / runningSum : 1;
  }

  let tauEstimate = -1;

  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 <= maxTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau += 1;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return null;

  const x0 = Math.max(minTau, tauEstimate - 1);
  const x2 = Math.min(maxTau, tauEstimate + 1);
  const s0 = yinBuffer[x0];
  const s1 = yinBuffer[tauEstimate];
  const s2 = yinBuffer[x2];
  const denominator = 2 * s1 - s2 - s0;

  const refinedTau =
    Math.abs(denominator) > 1e-6 ? tauEstimate + (s2 - s0) / (2 * denominator) : tauEstimate;

  if (!Number.isFinite(refinedTau) || refinedTau <= 0) return null;

  return sampleRate / refinedTau;
}
