const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const BAR_COUNT = 48;

export class SpectrumAnalyzer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas?.getContext("2d") ?? null;
    this.barHeights = new Array(BAR_COUNT).fill(0);
    this.barMap = [];
    this.resizeObserver = null;

    if (this.canvas) {
      this.resize();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
    }
  }

  resize() {
    if (!this.canvas || !this.context) return;

    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = width;
    this.height = height;
  }

  rebuildBarMap(sampleRate, binCount) {
    if (!sampleRate || !binCount) {
      this.barMap = [];
      return;
    }

    const nyquist = sampleRate / 2;
    const maxFreq = Math.min(MAX_FREQ, nyquist);
    this.barMap = [];

    for (let index = 0; index < BAR_COUNT; index += 1) {
      const startFreq = MIN_FREQ * (maxFreq / MIN_FREQ) ** (index / BAR_COUNT);
      const endFreq = MIN_FREQ * (maxFreq / MIN_FREQ) ** ((index + 1) / BAR_COUNT);
      const binStart = Math.max(0, Math.floor((startFreq * binCount * 2) / sampleRate));
      const binEnd = Math.min(binCount - 1, Math.ceil((endFreq * binCount * 2) / sampleRate));

      this.barMap.push({ binStart, binEnd });
    }
  }

  update({ active, frequency, sampleRate }) {
    if (!this.context || !this.canvas) return;

    if (!active || !frequency?.length || !sampleRate) {
      this.clear();
      return;
    }

    if (this.barMap.length !== BAR_COUNT) {
      this.rebuildBarMap(sampleRate, frequency.length);
    }

    for (let barIndex = 0; barIndex < BAR_COUNT; barIndex += 1) {
      const { binStart, binEnd } = this.barMap[barIndex];
      let peak = 0;

      for (let bin = binStart; bin <= binEnd; bin += 1) {
        if (frequency[bin] > peak) peak = frequency[bin];
      }

      const normalized = peak / 255;
      this.barHeights[barIndex] += (normalized - this.barHeights[barIndex]) * 0.34;
    }

    this.draw();
  }

  draw() {
    const { context, width, height, barHeights } = this;
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(8, 9, 9, 0.92)";
    context.fillRect(0, 0, width, height);

    const gap = 3;
    const barWidth = (width - gap * (BAR_COUNT - 1)) / BAR_COUNT;

    barHeights.forEach((value, index) => {
      const barHeight = Math.max(2, value * (height - 12));
      const x = index * (barWidth + gap);
      const y = height - barHeight - 4;

      const gradient = context.createLinearGradient(0, y + barHeight, 0, y);
      gradient.addColorStop(0, "rgba(143, 168, 122, 0.92)");
      gradient.addColorStop(0.55, "rgba(181, 154, 77, 0.88)");
      gradient.addColorStop(1, "rgba(168, 97, 79, 0.92)");

      context.fillStyle = gradient;
      context.fillRect(x, y, barWidth, barHeight);
    });
  }

  clear() {
    if (!this.context || !this.canvas) return;
    this.barHeights.fill(0);
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.fillStyle = "rgba(8, 9, 9, 0.92)";
    this.context.fillRect(0, 0, this.width, this.height);
  }

  dispose() {
    this.resizeObserver?.disconnect();
  }
}
