export class AudioDeviceSelector {
  constructor({ selectElement, emptyElement, onDeviceChange }) {
    this.selectElement = selectElement;
    this.emptyElement = emptyElement;
    this.onDeviceChange = onDeviceChange;
    this.renderKey = "";

    this.selectElement?.addEventListener("change", () => {
      this.onDeviceChange?.(this.selectElement.value);
    });
  }

  render(devices, selectedDeviceId) {
    if (!this.selectElement || !this.emptyElement) return;

    const nextRenderKey = `${selectedDeviceId}|${devices
      .map((device) => `${device.id}:${device.label}:${device.isDefault ? "1" : "0"}`)
      .join("|")}`;
    if (nextRenderKey === this.renderKey) return;

    this.renderKey = nextRenderKey;
    this.selectElement.innerHTML = "";
    this.selectElement.disabled = devices.length === 0;
    this.emptyElement.hidden = devices.length > 0;

    devices.forEach((device) => {
      const option = document.createElement("option");
      option.value = device.id;
      option.textContent = device.isDefault ? `${device.label} (Default)` : device.label;
      option.selected = device.id === selectedDeviceId;
      this.selectElement.append(option);
    });
  }

  setBusy(isBusy) {
    if (!this.selectElement) return;
    this.selectElement.disabled = isBusy || this.selectElement.options.length === 0;
  }
}
