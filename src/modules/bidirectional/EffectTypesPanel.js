/**
 * MIDI Analyzer panel: Known Effect Types + active discovery.
 */

import { EffectTypeDiscovery } from "./EffectTypeDiscovery.js";
import { EFFECT_TYPE_PARAMETERS } from "./controlBindings.js";
import { parameterService } from "./ParameterService.js";
import {
  downloadEffectTypeRegistryJson,
  exportEffectTypeRegistryJson,
  listEffectTypes,
  subscribeEffectTypeRegistry
} from "./effectTypeRegistry.js";

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export class EffectTypesPanel {
  /**
   * @param {{
   *   rootElement?: HTMLElement | null,
   *   ensureMidi?: () => Promise<unknown>,
   *   subscribeParameters?: ConstructorParameters<typeof EffectTypeDiscovery>[0]["subscribeParameters"],
   *   setParameterEchoEnabled?: (enabled: boolean) => void,
   *   readEffectTypeName?: (
   *     slotKey: string,
   *     typeId: number,
   *     timeoutMs: number
   *   ) => Promise<string | null>,
   *   readCurrentEffectType?: (slotKey: string) => Promise<number | null>,
   *   onDiscoveryRunningChange?: (running: boolean) => void
   * }} [options]
   */
  constructor(options = {}) {
    this.rootElement =
      options.rootElement ?? document.querySelector("#bidirectionalMonitor");
    this.sortMode = "id";
    this.unsubscribe = null;
    this.onDiscoveryRunningChange = options.onDiscoveryRunningChange ?? null;

    this.discovery = new EffectTypeDiscovery({
      ensureMidi: options.ensureMidi ?? (async () => {}),
      subscribeParameters:
        options.subscribeParameters ??
        (() => {
          throw new Error("subscribeParameters is required for discovery");
        }),
      setParameterEchoEnabled: options.setParameterEchoEnabled,
      readEffectTypeName:
        options.readEffectTypeName ?? (async () => null),
      onProgress: (progress) => this.onDiscoveryProgress(progress),
      onComplete: (summary) => this.onDiscoveryComplete(summary)
    });

    this.readCurrentEffectType = options.readCurrentEffectType ?? null;

    this.bindDom();
    this.bindControls();
    this.unsubscribe = subscribeEffectTypeRegistry(() => this.render());
    this.render();
    this.renderDiscoveryChrome();
  }

  bindDom() {
    const root = this.rootElement;
    if (!root) return;
    this.countEl = root.querySelector("[data-effect-types-count]");
    this.bodyEl = root.querySelector("[data-effect-types-body]");
    this.sortSelect = root.querySelector("[data-effect-types-sort]");
    this.exportButton = root.querySelector("[data-effect-types-export]");
    this.discoverButton = root.querySelector("[data-effect-types-discover]");
    this.stopButton = root.querySelector("[data-effect-types-stop]");
    this.slotSelect = root.querySelector("[data-effect-types-slot]");
    this.delayInput = root.querySelector("[data-effect-types-delay]");
    this.progressEl = root.querySelector("[data-effect-types-progress]");
  }

  bindControls() {
    this.sortSelect?.addEventListener("change", () => {
      this.sortMode = this.sortSelect.value === "name" ? "name" : "id";
      this.render();
    });

    this.exportButton?.addEventListener("click", () => {
      this.exportJson();
    });

    this.slotSelect?.addEventListener("change", () => {
      this.discovery.setSlotKey(this.slotSelect.value);
    });

    this.delayInput?.addEventListener("change", () => {
      this.discovery.setResponseTimeoutMs(Number(this.delayInput.value));
    });

    this.discoverButton?.addEventListener("click", () => {
      void this.startDiscovery();
    });

    this.stopButton?.addEventListener("click", () => {
      this.discovery.requestStop();
    });
  }

  exportJson() {
    downloadEffectTypeRegistryJson(exportEffectTypeRegistryJson());
  }

  async startDiscovery() {
    if (this.discovery.isRunning()) return;

    const slotKey = this.slotSelect?.value || "stompA";
    const timeoutMs = Number(this.delayInput?.value || 1000);
    this.discovery.setSlotKey(slotKey);
    this.discovery.setResponseTimeoutMs(timeoutMs);

    const confirmed = window.confirm(
      "Discover Effect Types will temporarily change the selected effect slot (IDs 0–250).\n\nContinue?"
    );
    if (!confirmed) return;

    let previousTypeId = null;
    if (this.readCurrentEffectType) {
      try {
        previousTypeId = await this.readCurrentEffectType(slotKey);
      } catch {
        previousTypeId = null;
      }
    }

    this.onDiscoveryRunningChange?.(true);
    this.renderDiscoveryChrome();

    try {
      await this.discovery.start();
    } catch (error) {
      console.warn("[Effect Type Discovery] failed:", error);
      if (this.progressEl) {
        this.progressEl.textContent =
          error?.message || "Discovery failed.";
      }
    } finally {
      if (previousTypeId != null) {
        try {
          const typeParamId = EFFECT_TYPE_PARAMETERS[slotKey];
          if (typeParamId != null) {
            await parameterService.setParameter(typeParamId, previousTypeId);
          }
        } catch {
          // restore best-effort
        }
      }
      this.onDiscoveryRunningChange?.(false);
      this.renderDiscoveryChrome();
    }
  }

  /**
   * @param {{
   *   currentId: number,
   *   maxId: number,
   *   entry: import("./effectTypeRegistry.js").EffectTypeEntry | null,
   *   phase?: string,
   *   running: boolean
   * }} progress
   */
  onDiscoveryProgress(progress) {
    if (!this.progressEl) return;
    if (!progress.running) {
      this.renderDiscoveryChrome();
      return;
    }

    let detail = `ID ${progress.currentId}`;
    if (progress.phase === "write") detail = `writing ID ${progress.currentId}`;
    else if (progress.phase === "waiting") {
      detail = `waiting for Kemper response (ID ${progress.currentId})`;
    } else if (progress.entry) {
      detail = `${progress.entry.id}: ${progress.entry.name} (${progress.entry.status})`;
    }

    this.progressEl.textContent = `Scanning ${progress.currentId} / ${progress.maxId} — ${detail}`;
    this.renderDiscoveryChrome();
  }

  /**
   * @param {{ scanned: number, confirmed: number, unused: number, unknown: number }} summary
   */
  onDiscoveryComplete(summary) {
    if (this.progressEl) {
      this.progressEl.textContent = `Done — scanned ${summary.scanned}: ${summary.confirmed} confirmed, ${summary.unused} unused, ${summary.unknown} unknown. JSON exported.`;
    }
    this.render();
  }

  renderDiscoveryChrome() {
    const running = this.discovery.isRunning();
    if (this.discoverButton) {
      this.discoverButton.disabled = running;
      this.discoverButton.textContent = running
        ? "Discovering…"
        : "Discover Effect Types";
    }
    if (this.stopButton) {
      this.stopButton.hidden = !running;
      this.stopButton.disabled = !running;
    }
    if (this.slotSelect) this.slotSelect.disabled = running;
    if (this.delayInput) this.delayInput.disabled = running;
    if (this.rootElement) {
      this.rootElement.dataset.effectDiscovery = running ? "true" : "false";
    }
  }

  render() {
    const rows = listEffectTypes({ sort: this.sortMode });
    const confirmedCount = rows.filter(
      (row) => row.confirmed || row.status === "confirmed"
    ).length;
    if (this.countEl) {
      this.countEl.textContent = String(confirmedCount);
    }
    if (!this.bodyEl) return;

    if (!rows.length) {
      this.bodyEl.innerHTML = `
        <tr class="bidirectional-analyzer-empty-row">
          <td colspan="4">No effect types yet — run Discover Effect Types.</td>
        </tr>`;
      return;
    }

    this.bodyEl.innerHTML = rows
      .map(
        (row) => `<tr data-status="${escapeHtml(row.status)}">
          <td class="bidirectional-param-raw">${escapeHtml(String(row.id))}</td>
          <td>
            <div class="bidirectional-param-name">${escapeHtml(row.name)}</div>
          </td>
          <td><span class="research-lab-status-pill" data-status="${escapeHtml(row.status)}">${escapeHtml(statusDisplay(row.status))}</span></td>
          <td class="bidirectional-param-raw">${escapeHtml(String(row.occurrences))}</td>
        </tr>`
      )
      .join("");
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

/**
 * @param {string} status
 * @returns {string}
 */
function statusDisplay(status) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "unused":
      return "Unused";
    case "unknown":
      return "Unknown";
    case "seeded":
      return "Seeded";
    default:
      return status;
  }
}

/**
 * @param {ConstructorParameters<typeof EffectTypesPanel>[0]} [options]
 * @returns {EffectTypesPanel}
 */
export function initializeEffectTypesPanel(options = {}) {
  return new EffectTypesPanel(options);
}
