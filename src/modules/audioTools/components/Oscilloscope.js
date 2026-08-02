export class Oscilloscope {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas?.getContext("2d") ?? null;
    this.displaySamples = [];
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

  update({ active, timeDomain }) {
    if (!this.context || !this.canvas) return;

    if (!active || !timeDomain?.length) {
      this.clear();
      return;
    }

    const targetCount = Math.min(512, timeDomain.length);
    const step = Math.max(1, Math.floor(timeDomain.length / targetCount));
    this.displaySamples = [];

    for (let index = 0; index < timeDomain.length; index += step) {
      this.displaySamples.push(timeDomain[index]);
    }

    this.draw();
  }

  draw() {
    const { context, width, height, displaySamples } = this;
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(8, 9, 9, 0.92)";
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(255, 255, 255, 0.05)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();

    if (displaySamples.length < 2) return;

    context.strokeStyle = "rgba(232, 239, 216, 0.88)";
    context.lineWidth = 1.5;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();

    displaySamples.forEach((sample, index) => {
      const x = (index / (displaySamples.length - 1)) * width;
      const y = height / 2 - sample * (height * 0.42);

      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });

    context.stroke();
  }

  clear() {
    if (!this.context || !this.canvas) return;
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.fillStyle = "rgba(8, 9, 9, 0.92)";
    this.context.fillRect(0, 0, this.width, this.height);
  }

  dispose() {
    this.resizeObserver?.disconnect();
  }
}
