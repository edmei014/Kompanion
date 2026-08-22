/**
 * Protocol Research Lab — Kemper parameter capability discovery.
 *
 * Research only. Does not participate in Live Companion production control.
 * Discovers Read / Write / Push support and accumulates a persistent registry.
 */

import {
  buildSingleParameterChange,
  buildSingleParameterRequest,
  clampRaw14
} from "./decoder/protocolMessages.js";
import { PARAMETER_TYPE } from "./decoder/parameterTypes.js";
import {
  formatParameterIdHex,
  lookupParameter
} from "./decoder/parameterRegistry.js";
import { CapabilityScanner } from "./CapabilityScanner.js";
import { ProtocolExplorer } from "./ProtocolExplorer.js";
import { LearningWizard, formatDelta, formatPercent } from "./LearningWizard.js";
import { ParameterCensus } from "./ParameterCensus.js";
import {
  downloadParameterCapabilitiesJson,
  listParameterCapabilities,
  markParameterPushObserved,
  subscribeParameterCapabilities,
  upsertParameterCapability
} from "./parameterCapabilityRegistry.js";
import {
  downloadLearnedParametersJson,
  listLearningSessions,
  subscribeLearnedParameters
} from "./learnedParameterRegistry.js";
import {
  downloadParameterCensusJson,
  getCensusJob,
  listCensusParameters,
  subscribeParameterCensus,
  updateCensusJob
} from "./parameterCensusRegistry.js";
import { subscribeExplorerHistory } from "./protocolExplorerStore.js";

const RESPONSE_TIMEOUT_MS = 2500;
const READ_TIMEOUT_MS = 1500;
const MAX_EXPERIMENT_LOG = 80;

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

/**
 * @param {number} timestamp
 * @returns {string}
 */
function formatClock(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

/**
 * @param {string} iso
 * @returns {string}
 */
function formatSessionDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      hour12: false,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

/**
 * @param {string | null | undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parseHexId(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const normalized = text.toLowerCase().startsWith("0x") ? text : `0x${text}`;
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed & 0xffff : fallback;
}

/**
 * @param {string} type
 * @param {string} filter
 * @returns {boolean}
 */
function matchesCensusFilter(type, filter) {
  if (!filter || filter === "all") return true;
  if (filter === "binary") {
    return type === "binary" || type === "unknown_binary";
  }
  return type === filter;
}

/**
 * @param {import("./decoder/parameterState.js").ParameterState | null} state
 * @returns {boolean}
 */
function isWritableDecodedParameter(state) {
  if (!state) return false;
  if (state.rawValue == null || !Number.isFinite(state.rawValue)) return false;
  if (state.type === PARAMETER_TYPE.STRING) return false;
  if (state.ascii != null && state.ascii !== "" && state.rawValue == null) {
    return false;
  }
  return true;
}

export class ProtocolResearchLab {
  /**
   * @param {{
   *   rootElement?: HTMLElement | null,
   *   discovery?: import("./BidirectionalDiscovery.js").BidirectionalDiscovery | null,
   *   resolveLabel?: (parameterId: number, rawValue: number) => Promise<string>
   * }} [options]
   */
  constructor(options = {}) {
    this.rootElement = options.rootElement ?? null;
    this.discovery = options.discovery ?? null;
    this.resolveLabel = options.resolveLabel ?? null;

    /** @type {number | null} */
    this.selectedId = null;

    /** @type {null | {
     *   id: number,
     *   idHex: string,
     *   name: string,
     *   previousRaw: number,
     *   sentRaw: number,
     *   sentAt: number,
     *   receivedRaw: number | null,
     *   status: "waiting" | "accepted" | "rejected" | "no_response" | "unexpected"
     * }} */
    this.pending = null;

    /** @type {Array<{
     *   at: number,
     *   id: number,
     *   idHex: string,
     *   name: string,
     *   previousRaw: number,
     *   sentRaw: number,
     *   receivedRaw: number | null,
     *   status: string,
     *   statusLabel: string
     * }>} */
    this.experimentLog = [];

    /** @type {ReturnType<typeof setTimeout> | null} */
    this.responseTimer = null;

    /** @type {(() => void) | null} */
    this.unsubscribe = null;

    /** @type {number | null} */
    this.lastMirroredRaw = null;

    /** @type {null | {
     *   id: number,
     *   idHex: string,
     *   name: string,
     *   previousRaw: number,
     *   sentRaw: number
     * }} */
    this.pendingConfirm = null;

    /** @type {null | {
     *   id: number,
     *   idHex: string,
     *   name: string,
     *   requestedAt: number,
     *   rawValue: number | null,
     *   decoded: string | null,
     *   status: "waiting" | "ok" | "no_response" | "error"
     * }} */
    this.pendingRead = null;

    /** @type {ReturnType<typeof setTimeout> | null} */
    this.readTimer = null;

    this.boundRootClick = (event) => this.handleRootClick(event);
    this.boundConfirmClick = (event) => this.handleConfirmClick(event);

    /** @type {CapabilityScanner | null} */
    this.scanner = null;
    /** @type {ProtocolExplorer | null} */
    this.explorer = null;
    /** @type {LearningWizard | null} */
    this.wizard = null;
    /** @type {ParameterCensus | null} */
    this.census = null;
    /** @type {"all" | "boolean" | "continuous" | "enum" | "string" | "binary"} */
    this.censusFilter = "all";
    /** @type {(() => void) | null} */
    this.unsubscribeCapabilities = null;
    /** @type {(() => void) | null} */
    this.unsubscribeExplorerHistory = null;
    /** @type {(() => void) | null} */
    this.unsubscribeLearned = null;
    /** @type {(() => void) | null} */
    this.unsubscribeCensus = null;

    this.bindDom();
    this.bindControls();
    this.attachDiscovery(this.discovery);
    this.unsubscribeCapabilities = subscribeParameterCapabilities(() => {
      this.renderCapabilityTable();
      this.renderExplorer();
    });
    this.unsubscribeExplorerHistory = subscribeExplorerHistory(() => {
      this.renderExplorer();
    });
    this.unsubscribeLearned = subscribeLearnedParameters(() => {
      this.renderWizardHistory();
    });
    this.unsubscribeCensus = subscribeParameterCensus(() => {
      this.renderCensus();
    });
    this.boundPageHide = () => {
      this.restoreExplorerBestEffort();
      if (this.census?.isRunning()) this.census.pause();
    };
    window.addEventListener("pagehide", this.boundPageHide);
    this.render();
  }

  /**
   * Best-effort sync restore if the page is closing mid-exploration.
   */
  restoreExplorerBestEffort() {
    const explorer = this.explorer;
    if (!explorer || explorer.activeId == null || explorer.originalRaw == null) {
      return;
    }
    if (explorer.currentRaw === explorer.originalRaw) return;
    this.discovery?.sendResearchSysEx?.(
      buildSingleParameterChange(explorer.activeId, explorer.originalRaw)
    );
  }

  /**
   * @param {import("./BidirectionalDiscovery.js").BidirectionalDiscovery | null} discovery
   */
  attachDiscovery(discovery) {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.discovery = discovery;
    this.scanner = discovery
      ? new CapabilityScanner({
          discovery,
          onProgress: (progress) => this.onScanProgress(progress)
        })
      : null;
    this.explorer = discovery
      ? new ProtocolExplorer({
          discovery,
          resolveLabel: this.resolveLabel,
          onChange: () => this.renderExplorer()
        })
      : null;
    this.wizard = discovery
      ? new LearningWizard({
          discovery,
          onChange: () => this.renderWizard()
        })
      : null;
    this.census = discovery
      ? new ParameterCensus({
          discovery,
          onChange: () => this.renderCensus()
        })
      : null;
    if (!discovery) return;

    // Census full-range scan remains paused — Learning Wizard uses discovered IDs.
    if (this.census?.isRunning()) {
      this.census.pause();
    } else if (getCensusJob().status === "running") {
      updateCensusJob({ status: "paused" });
    }

    this.unsubscribe = discovery.subscribe((event) => {
      this.onParameterUpdate(event);
    });
    this.syncCensusInputsFromJob();
  }

  bindDom() {
    const root = this.rootElement;
    if (!root) return;

    this.panelEl = root.querySelector("[data-research-lab]");
    this.paramIdEl = root.querySelector("[data-research-param-id]");
    this.paramNameEl = root.querySelector("[data-research-param-name]");
    this.paramRawEl = root.querySelector("[data-research-param-raw]");
    this.paramDecodedEl = root.querySelector("[data-research-param-decoded]");
    this.writeSectionEl = root.querySelector("[data-research-write]");
    this.writeInputEl = root.querySelector("[data-research-write-input]");
    this.writeSendButton = root.querySelector("[data-research-write-send]");
    this.writeHintEl = root.querySelector("[data-research-write-hint]");
    this.readSectionEl = root.querySelector("[data-research-read]");
    this.readSendButton = root.querySelector("[data-research-read-send]");
    this.readResultEl = root.querySelector("[data-research-read-result]");
    this.readIdEl = root.querySelector("[data-research-read-id]");
    this.readRawEl = root.querySelector("[data-research-read-raw]");
    this.readDecodedEl = root.querySelector("[data-research-read-decoded]");
    this.readStatusEl = root.querySelector("[data-research-read-status]");
    this.observeEl = root.querySelector("[data-research-observe]");
    this.compareEl = root.querySelector("[data-research-compare]");
    this.comparePrevEl = root.querySelector("[data-research-compare-prev]");
    this.compareSentEl = root.querySelector("[data-research-compare-sent]");
    this.compareRecvEl = root.querySelector("[data-research-compare-recv]");
    this.compareStatusEl = root.querySelector("[data-research-compare-status]");
    this.logBodyEl = root.querySelector("[data-research-log]");
    this.emptyEl = root.querySelector("[data-research-empty]");
    this.selectedEl = root.querySelector("[data-research-selected]");
    this.scanSelectedButton = root.querySelector("[data-research-scan-selected]");
    this.scanAllButton = root.querySelector("[data-research-scan-all]");
    this.scanStopButton = root.querySelector("[data-research-scan-stop]");
    this.scanExportButton = root.querySelector("[data-research-scan-export]");
    this.scanProgressEl = root.querySelector("[data-research-scan-progress]");
    this.capabilityBodyEl = root.querySelector("[data-research-capabilities]");
    this.capabilityCountEl = root.querySelector("[data-research-capability-count]");
    this.capabilitySelectedEl = root.querySelector("[data-research-capability-selected]");

    this.explorerEmptyEl = root.querySelector("[data-research-explorer-empty]");
    this.explorerActiveEl = root.querySelector("[data-research-explorer-active]");
    this.explorerIdEl = root.querySelector("[data-explorer-id]");
    this.explorerNameEl = root.querySelector("[data-explorer-name]");
    this.explorerRawEl = root.querySelector("[data-explorer-raw]");
    this.explorerDecodedEl = root.querySelector("[data-explorer-decoded]");
    this.explorerLabelEl = root.querySelector("[data-explorer-label]");
    this.explorerOriginalEl = root.querySelector("[data-explorer-original]");
    this.explorerCapsEl = root.querySelector("[data-explorer-caps]");
    this.explorerStatusEl = root.querySelector("[data-explorer-status]");
    this.explorerEnumsEl = root.querySelector("[data-explorer-enums]");
    this.explorerHistoryEl = root.querySelector("[data-explorer-history]");
    this.explorerActionButtons = root.querySelectorAll("[data-explorer-action]");

    this.wizardFunctionInput = root.querySelector("[data-wizard-function]");
    this.wizardStatusEl = root.querySelector("[data-wizard-status]");
    this.wizardProgressEl = root.querySelector("[data-wizard-progress]");
    this.wizardResultsEl = root.querySelector("[data-wizard-results]");
    this.wizardChangedEl = root.querySelector("[data-wizard-changed]");
    this.wizardVerifyEl = root.querySelector("[data-wizard-verify]");
    this.wizardCandidateEl = root.querySelector("[data-wizard-candidate]");
    this.wizardVerifyFlagsEl = root.querySelector("[data-wizard-verify-flags]");
    this.wizardAssignPromptEl = root.querySelector("[data-wizard-assign-prompt]");
    this.wizardHistoryEl = root.querySelector("[data-wizard-history]");
    this.wizardHistoryCountEl = root.querySelector("[data-wizard-history-count]");
    this.wizardStartButton = root.querySelector('[data-wizard-action="start"]');
    this.wizardStopButton = root.querySelector('[data-wizard-action="stop"]');
    this.wizardAddSnapshotButton = root.querySelector(
      '[data-wizard-action="add-snapshot"]'
    );

    this.censusStartInput = root.querySelector("[data-census-start]");
    this.censusEndInput = root.querySelector("[data-census-end]");
    this.censusDelayInput = root.querySelector("[data-census-delay]");
    this.censusTimeoutInput = root.querySelector("[data-census-timeout]");
    this.censusStatusEl = root.querySelector("[data-census-status]");
    this.censusBodyEl = root.querySelector("[data-census-body]");
    this.censusStartButton = root.querySelector('[data-census-action="start"]');
    this.censusPauseButton = root.querySelector('[data-census-action="pause"]');
    this.censusResumeButton = root.querySelector('[data-census-action="resume"]');

    this.confirmDialog = document.querySelector("#protocolResearchConfirmDialog");
    this.confirmMessageEl = document.querySelector("[data-research-confirm-message]");
    this.confirmCancelButton = document.querySelector("[data-research-confirm-cancel]");
    this.confirmSendButton = document.querySelector("[data-research-confirm-send]");
  }

  bindControls() {
    const root = this.rootElement;
    if (root) {
      root.addEventListener("click", this.boundRootClick);
    }

    this.writeSendButton?.addEventListener("click", () => {
      this.requestWriteConfirm();
    });

    this.readSendButton?.addEventListener("click", () => {
      void this.executeRead();
    });

    this.scanSelectedButton?.addEventListener("click", () => {
      void this.scanSelectedCapability();
    });
    this.scanAllButton?.addEventListener("click", () => {
      void this.scanAllObservedCapabilities();
    });
    this.scanStopButton?.addEventListener("click", () => {
      this.scanner?.requestStop();
    });
    this.scanExportButton?.addEventListener("click", () => {
      downloadParameterCapabilitiesJson();
    });

    this.writeInputEl?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.requestWriteConfirm();
      }
    });

    this.wizardFunctionInput?.addEventListener("input", () => {
      this.wizard?.setFunctionName(this.wizardFunctionInput?.value || "");
    });
    this.wizardFunctionInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void this.wizard?.startLearning();
      }
    });

    this.confirmDialog?.addEventListener("click", this.boundConfirmClick);
    this.confirmCancelButton?.addEventListener("click", () => {
      this.closeConfirm();
    });
    this.confirmSendButton?.addEventListener("click", () => {
      this.confirmAndSend();
    });
  }

  /**
   * @param {MouseEvent} event
   */
  handleRootClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const censusFilter = target.closest("[data-census-filter]");
    if (censusFilter instanceof HTMLElement) {
      const filter = censusFilter.dataset.censusFilter || "all";
      this.censusFilter = /** @type {typeof this.censusFilter} */ (filter);
      this.renderCensus();
      return;
    }

    const censusAction = target.closest("[data-census-action]");
    if (censusAction instanceof HTMLElement) {
      void this.handleCensusAction(censusAction.dataset.censusAction || "");
      return;
    }

    const wizardAction = target.closest("[data-wizard-action]");
    if (wizardAction instanceof HTMLElement) {
      void this.handleWizardAction(wizardAction.dataset.wizardAction || "");
      return;
    }

    const wizardPick = target.closest("[data-wizard-pick]");
    if (wizardPick instanceof HTMLElement) {
      const id = Number(wizardPick.dataset.wizardPick);
      if (Number.isFinite(id)) {
        this.wizard?.selectCandidate(id);
      }
      return;
    }

    const explorerAction = target.closest("[data-explorer-action]");
    if (explorerAction instanceof HTMLElement) {
      void this.handleExplorerAction(explorerAction);
      return;
    }

    const selectButton = target.closest("[data-bidi-research]");
    if (selectButton instanceof HTMLElement) {
      const id = Number(selectButton.dataset.bidiResearch);
      if (Number.isFinite(id)) {
        this.selectParameter(id);
      }
    }
  }

  /**
   * @param {string} action
   */
  async handleCensusAction(action) {
    if (!this.census) return;

    if (action === "export") {
      downloadParameterCensusJson();
      return;
    }

    if (action === "pause") {
      this.census.pause();
      return;
    }

    if (action === "start" || action === "resume") {
      if (this.wizard?.isBusy() || this.scanner?.isRunning()) {
        this.setObserveMessage(
          "Finish the Learning Wizard / Capability Scanner before running Parameter Census.",
          "error"
        );
        return;
      }
      if (!this.discovery?.output && !this.discovery?.externalSend) {
        this.setObserveMessage("No MIDI output available.", "error");
        return;
      }

      if (action === "start") {
        const confirmed = window.confirm(
          "Restart Parameter Census from the beginning?\n\nThis probes every ID in the range and may take hours. Prefer the Learning Wizard on already discovered IDs."
        );
        if (!confirmed) return;
      } else {
        const confirmed = window.confirm(
          "Resume the full Parameter Census scan?\n\nThis continues the long address-space probe."
        );
        if (!confirmed) return;
      }

      this.census.configure({
        startId: parseHexId(this.censusStartInput?.value, 0x0000),
        endId: parseHexId(this.censusEndInput?.value, 0x7f7f),
        delayMs: Number(this.censusDelayInput?.value ?? 5),
        timeoutMs: Number(this.censusTimeoutInput?.value ?? 80),
        resetProgress: action === "start"
      });

      await this.census.start();
    }
  }

  syncCensusInputsFromJob() {
    const job = getCensusJob();
    if (this.censusStartInput && document.activeElement !== this.censusStartInput) {
      this.censusStartInput.value = formatParameterIdHex(job.startId);
    }
    if (this.censusEndInput && document.activeElement !== this.censusEndInput) {
      this.censusEndInput.value = formatParameterIdHex(job.endId);
    }
    if (this.censusDelayInput && document.activeElement !== this.censusDelayInput) {
      this.censusDelayInput.value = String(job.delayMs);
    }
    if (this.censusTimeoutInput && document.activeElement !== this.censusTimeoutInput) {
      this.censusTimeoutInput.value = String(job.timeoutMs);
    }
  }

  /**
   * @param {string} action
   */
  async handleWizardAction(action) {
    if (!this.wizard) return;
    switch (action) {
      case "start":
        if (this.census?.isRunning()) {
          this.setObserveMessage(
            "Pause Parameter Census before starting the Learning Wizard.",
            "error"
          );
          return;
        }
        if (this.wizardFunctionInput) {
          this.wizard.setFunctionName(this.wizardFunctionInput.value || "");
        }
        await this.wizard.startLearning();
        break;
      case "stop":
        await this.wizard.stopLearning();
        break;
      case "add-snapshot":
        await this.wizard.addSnapshot();
        break;
      case "reset":
        this.wizard.reset();
        break;
      case "export":
        downloadLearnedParametersJson();
        break;
      case "confirm":
        await this.wizard.confirmAssignment();
        break;
      case "reject":
        this.wizard.rejectAssignment();
        break;
      default:
        break;
    }
  }

  /**
   * @param {HTMLElement} button
   */
  async handleExplorerAction(button) {
    if (!this.explorer || this.explorer.isBusy()) return;
    if (!this.discovery?.output && !this.discovery?.externalSend) {
      this.setObserveMessage("No MIDI output available.", "error");
      return;
    }

    const action = button.dataset.explorerAction;
    if (action === "read" || action === "refresh") {
      await this.explorer.read();
      return;
    }
    if (action === "restore") {
      await this.explorer.restoreOriginal();
      return;
    }
    if (action === "step") {
      const delta = Number(button.dataset.explorerDelta);
      if (!Number.isFinite(delta) || delta === 0) return;
      await this.explorer.step(delta);
    }
  }

  /**
   * @param {MouseEvent} event
   */
  handleConfirmClick(event) {
    if (event.target === this.confirmDialog) {
      this.closeConfirm();
    }
  }

  /**
   * @param {number} id
   */
  selectParameter(id) {
    if (
      this.pending?.status === "waiting" ||
      this.pendingRead?.status === "waiting" ||
      this.explorer?.isBusy() ||
      this.scanner?.isRunning() ||
      this.wizard?.isBusy()
    ) {
      return;
    }

    const normalized = id & 0xffff;
    const state = this.discovery?.getParameter(normalized) ?? null;
    if (!state) return;

    this.selectedId = normalized;
    this.pending = null;
    this.pendingRead = null;
    this.clearResponseTimer();
    this.clearReadTimer();

    if (this.writeInputEl && state.rawValue != null) {
      this.writeInputEl.value = String(state.rawValue);
      this.lastMirroredRaw = state.rawValue;
    }

    this.render();
    this.discovery?.queueRender();
    void this.explorer?.begin(normalized);
  }

  /**
   * Drop the current selection (e.g. after Reset State). Does not clear experiment log.
   * Restores the explored parameter to its original value first.
   */
  clearSelection() {
    if (this.pending?.status === "waiting") {
      this.clearResponseTimer();
      this.pending.status = "no_response";
      this.commitExperiment(this.pending);
    }
    this.clearReadTimer();
    this.selectedId = null;
    this.pending = null;
    this.pendingRead = null;
    this.pendingConfirm = null;
    this.lastMirroredRaw = null;
    this.closeConfirm();
    if (this.writeInputEl) this.writeInputEl.value = "";
    void this.explorer?.end().then(() => this.render());
    this.render();
  }

  /**
   * Highlight helper for parameter table rows.
   * @returns {number | null}
   */
  getSelectedId() {
    return this.selectedId;
  }

  getSelectedState() {
    if (this.selectedId == null || !this.discovery) return null;
    return this.discovery.getParameter(this.selectedId);
  }

  requestWriteConfirm() {
    if (this.pending?.status === "waiting" || this.pendingRead?.status === "waiting") {
      return;
    }

    const state = this.getSelectedState();
    if (!isWritableDecodedParameter(state)) return;
    if (!this.discovery?.output && !this.discovery?.externalSend) {
      this.setObserveMessage("No MIDI output available.", "error");
      return;
    }

    const rawText = this.writeInputEl?.value?.trim() ?? "";
    const parsed = Number(rawText);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      this.setObserveMessage("Enter a whole decimal raw value (0–16383).", "error");
      return;
    }

    const sentRaw = clampRaw14(parsed);
    if (sentRaw !== parsed) {
      this.setObserveMessage("Value must be an integer between 0 and 16383.", "error");
      return;
    }

    this.pendingConfirm = {
      id: state.id,
      idHex: state.idHex,
      name: state.name,
      previousRaw: state.rawValue,
      sentRaw
    };

    if (this.confirmMessageEl) {
      this.confirmMessageEl.innerHTML = `
        Send parameter <code>${escapeHtml(state.idHex)}</code>
        (<strong>${escapeHtml(state.name)}</strong>)<br />
        with value <strong>${escapeHtml(String(sentRaw))}</strong>?
      `;
    }
    this.openConfirm();
  }

  openConfirm() {
    if (!this.confirmDialog) return;
    this.confirmDialog.dataset.open = "true";
    this.confirmDialog.setAttribute("aria-hidden", "false");
    this.confirmSendButton?.focus();
  }

  closeConfirm() {
    if (!this.confirmDialog) return;
    this.confirmDialog.dataset.open = "false";
    this.confirmDialog.setAttribute("aria-hidden", "true");
    this.pendingConfirm = null;
  }

  confirmAndSend() {
    const draft = this.pendingConfirm;
    this.closeConfirm();
    if (!draft) return;
    this.executeWrite(draft);
  }

  /**
   * @param {{
   *   id: number,
   *   idHex: string,
   *   name: string,
   *   previousRaw: number,
   *   sentRaw: number
   * }} draft
   */
  executeWrite(draft) {
    const bytes = buildSingleParameterChange(draft.id, draft.sentRaw);
    const sent = this.discovery?.sendResearchSysEx?.(bytes) ?? false;

    if (!sent) {
      this.setObserveMessage("Send failed — MIDI output rejected the frame.", "error");
      return;
    }

    this.pending = {
      id: draft.id,
      idHex: draft.idHex,
      name: draft.name,
      previousRaw: draft.previousRaw,
      sentRaw: draft.sentRaw,
      sentAt: Date.now(),
      receivedRaw: null,
      status: "waiting"
    };

    this.clearResponseTimer();
    this.responseTimer = window.setTimeout(() => {
      this.finalizeNoResponse();
    }, RESPONSE_TIMEOUT_MS);

    this.render();
  }

  /**
   * Temporary research action: Request Single Parameter (0x41) and wait for reply.
   * Prefer testing with Gain (0x0A04).
   */
  executeRead() {
    if (this.pending?.status === "waiting" || this.pendingRead?.status === "waiting") {
      return;
    }

    const state = this.getSelectedState();
    if (!state) return;

    if (state.type === PARAMETER_TYPE.STRING) {
      this.setObserveMessage("Read currently supports numeric parameters only.", "error");
      return;
    }

    if (!this.discovery?.output && !this.discovery?.externalSend) {
      this.setObserveMessage("No MIDI output available.", "error");
      return;
    }

    const bytes = buildSingleParameterRequest(state.id);
    const sent = this.discovery?.sendResearchSysEx?.(bytes) ?? false;
    if (!sent) {
      this.setObserveMessage("Read request failed — MIDI output rejected the frame.", "error");
      return;
    }

    this.pendingRead = {
      id: state.id,
      idHex: state.idHex,
      name: state.name,
      requestedAt: Date.now(),
      rawValue: null,
      decoded: null,
      status: "waiting"
    };

    console.log("[Research Lab] Read request", {
      parameterIdHex: state.idHex,
      name: state.name,
      frame: bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ")
    });

    this.clearReadTimer();
    this.readTimer = window.setTimeout(() => {
      this.finalizeReadNoResponse();
    }, READ_TIMEOUT_MS);

    this.setObserveMessage(
      `Read request sent for ${state.idHex} — waiting for Kemper response…`,
      "info"
    );
    this.render();
  }

  /**
   * @param {{
   *   result: {
   *     state: import("./decoder/parameterState.js").ParameterState | null
   *   },
   *   decoded: import("./decoder/decodeSysEx.js").DecodedSysEx
   * }} event
   */
  onParameterUpdate(event) {
    // Census / Learning Wizard accept addressed responses even without full state.
    this.census?.onTraffic(event);
    this.wizard?.onTraffic?.(event);

    const state = event?.result?.state;
    if (!state) return;

    // Capability scanner / Protocol Explorer share traffic.
    this.scanner?.onParameterState(state);
    this.explorer?.onParameterState(state);
    this.wizard?.onParameterState(state);

    // Ensure registry knows the parameter exists.
    const definition = lookupParameter(state.id);
    upsertParameterCapability(state.id, {
      name: state.name || definition?.name,
      scale: definition?.scaleFunction || "unknown"
    });

    // Unsolicited updates (no outstanding explicit read) => Supports Push.
    // During Learning Wizard snapshots, suppress false push marks from solicited reads.
    const wizardPhase = this.wizard?.getPhase?.() ?? null;
    const wizardScanning =
      wizardPhase === "snapshot_a" || wizardPhase === "snapshot_n";
    const explicitRead =
      this.scanner?.isExplicitReadOutstanding(state.id) ||
      Boolean(this.census?.isExplicitReadOutstanding(state.id)) ||
      Boolean(this.wizard?.isExplicitReadOutstanding(state.id)) ||
      (this.pendingRead?.status === "waiting" &&
        this.pendingRead.id === state.id) ||
      Boolean(this.explorer?.isWaitingFor(state.id)) ||
      Boolean(this.wizard?.isWaitingFor?.(state.id));
    const explicitWrite =
      (this.pending?.status === "waiting" && this.pending.id === state.id) ||
      (Boolean(this.explorer?.isBusy()) &&
        this.explorer?.getActiveId() === state.id);
    if (
      !explicitRead &&
      !explicitWrite &&
      !this.scanner?.isRunning() &&
      !this.census?.isRunning() &&
      !this.wizard?.isBusy() &&
      !wizardScanning
    ) {
      markParameterPushObserved(state.id, {
        name: state.name,
        scale: definition?.scaleFunction || "unknown"
      });
    }

    // Keep current-parameter readout live when idle.
    if (
      this.selectedId != null &&
      state.id === this.selectedId &&
      this.pending?.status !== "waiting"
    ) {
      if (
        this.writeInputEl &&
        document.activeElement !== this.writeInputEl &&
        state.rawValue != null &&
        (this.writeInputEl.value === "" ||
          Number(this.writeInputEl.value) === this.lastMirroredRaw)
      ) {
        this.writeInputEl.value = String(state.rawValue);
        this.lastMirroredRaw = state.rawValue;
      }
      this.renderCurrentParameter();
      this.renderSelectedCapability();
    }

    // Resolve outstanding parameter READ first (query response).
    if (
      this.pendingRead?.status === "waiting" &&
      state.id === this.pendingRead.id &&
      state.rawValue != null &&
      state.updatedAt >= this.pendingRead.requestedAt - 20
    ) {
      this.clearReadTimer();
      this.pendingRead.rawValue = state.rawValue;
      this.pendingRead.decoded = state.scaledDisplay || String(state.rawValue);
      this.pendingRead.status = "ok";
      upsertParameterCapability(state.id, {
        name: state.name,
        supportsRead: true,
        lastProbed: new Date().toISOString()
      });
      console.log("[Research Lab] Read response", {
        parameterIdHex: this.pendingRead.idHex,
        raw: this.pendingRead.rawValue,
        decoded: this.pendingRead.decoded
      });
      this.setObserveMessage(
        `Read OK — ${this.pendingRead.idHex} raw ${this.pendingRead.rawValue}`,
        "ok"
      );
      this.render();
      return;
    }

    if (!this.pending || this.pending.status !== "waiting") return;
    if (state.id !== this.pending.id) return;
    if (state.rawValue == null) return;

    // Ignore stale echoes that arrive before our send timestamp.
    if (state.updatedAt < this.pending.sentAt - 20) return;

    this.clearResponseTimer();
    this.pending.receivedRaw = state.rawValue;

    if (state.rawValue === this.pending.sentRaw) {
      this.pending.status = "accepted";
      upsertParameterCapability(state.id, {
        name: state.name,
        supportsWrite: true,
        lastProbed: new Date().toISOString()
      });
    } else if (state.rawValue === this.pending.previousRaw) {
      this.pending.status = "rejected";
    } else {
      this.pending.status = "unexpected";
      upsertParameterCapability(state.id, {
        name: state.name,
        supportsWrite: true,
        lastProbed: new Date().toISOString(),
        notes: "Write produced a different raw value than sent"
      });
    }

    this.commitExperiment(this.pending);
    this.render();
  }

  finalizeNoResponse() {
    if (!this.pending || this.pending.status !== "waiting") return;
    this.pending.status = "no_response";
    this.pending.receivedRaw = null;
    this.commitExperiment(this.pending);
    this.render();
  }

  finalizeReadNoResponse() {
    if (!this.pendingRead || this.pendingRead.status !== "waiting") return;
    this.pendingRead.status = "no_response";
    this.pendingRead.rawValue = null;
    this.pendingRead.decoded = null;
    console.log("[Research Lab] Read timeout — no response", {
      parameterIdHex: this.pendingRead.idHex
    });
    this.setObserveMessage(
      `No read response for ${this.pendingRead.idHex} within ${READ_TIMEOUT_MS}ms.`,
      "error"
    );
    this.render();
  }

  /**
   * @param {NonNullable<ProtocolResearchLab["pending"]>} experiment
   */
  commitExperiment(experiment) {
    const statusLabel = statusToLabel(experiment.status);
    this.experimentLog.unshift({
      at: experiment.sentAt,
      id: experiment.id,
      idHex: experiment.idHex,
      name: experiment.name,
      previousRaw: experiment.previousRaw,
      sentRaw: experiment.sentRaw,
      receivedRaw: experiment.receivedRaw,
      status: experiment.status,
      statusLabel
    });
    if (this.experimentLog.length > MAX_EXPERIMENT_LOG) {
      this.experimentLog.length = MAX_EXPERIMENT_LOG;
    }
  }

  clearResponseTimer() {
    if (this.responseTimer != null) {
      window.clearTimeout(this.responseTimer);
      this.responseTimer = null;
    }
  }

  clearReadTimer() {
    if (this.readTimer != null) {
      window.clearTimeout(this.readTimer);
      this.readTimer = null;
    }
  }

  /**
   * @param {string} message
   * @param {"info" | "error" | "ok"} [tone]
   */
  setObserveMessage(message, tone = "info") {
    if (!this.observeEl) return;
    this.observeEl.dataset.tone = tone;
    this.observeEl.innerHTML = `<p>${escapeHtml(message)}</p>`;
  }

  /**
   * Probe Read / Write for the Lab-selected parameter.
   */
  async scanSelectedCapability() {
    if (
      !this.scanner ||
      this.scanner.isRunning() ||
      this.wizard?.isBusy() ||
      this.census?.isRunning()
    ) {
      return;
    }
    if (this.selectedId == null) {
      this.setObserveMessage("Select a parameter with Lab first.", "error");
      return;
    }
    if (!this.discovery?.output && !this.discovery?.externalSend) {
      this.setObserveMessage("No MIDI output available.", "error");
      return;
    }

    this.renderScanChrome(true);
    const result = await this.scanner.scanParameter(this.selectedId);
    this.renderScanChrome(false);

    if (!result) {
      this.setObserveMessage("Capability scan cancelled or failed.", "error");
      return;
    }

    this.setObserveMessage(
      `${result.name}: Read ${flagLabel(result.supportsRead)} · Write ${flagLabel(result.supportsWrite)} · Push ${flagLabel(result.supportsPush)}`,
      "ok"
    );
    this.render();
  }

  /**
   * Probe every currently observed parameter in Current Parameters.
   */
  async scanAllObservedCapabilities() {
    if (
      !this.scanner ||
      this.scanner.isRunning() ||
      this.wizard?.isBusy() ||
      this.census?.isRunning()
    ) {
      return;
    }
    if (!this.discovery?.output && !this.discovery?.externalSend) {
      this.setObserveMessage("No MIDI output available.", "error");
      return;
    }

    const currentMap = this.discovery.parameterState?.current;
    const ids = currentMap ? [...currentMap.keys()] : [];
    if (!ids.length) {
      this.setObserveMessage("No observed parameters to scan yet.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Scan capabilities for ${ids.length} observed parameter(s)?\n\nWrite tests use the same value (device left unmodified).`
    );
    if (!confirmed) return;

    this.renderScanChrome(true);
    const results = await this.scanner.scanMany(ids);
    this.renderScanChrome(false);

    this.setObserveMessage(
      `Capability scan finished — ${results.length} parameter(s) probed.`,
      "ok"
    );
    this.render();
  }

  /**
   * @param {{
   *   id: number,
   *   idHex: string,
   *   name: string,
   *   phase: string,
   *   running: boolean
   * }} progress
   */
  onScanProgress(progress) {
    if (!this.scanProgressEl) return;
    if (!progress.running && progress.phase === "idle") {
      this.renderScanChrome(false);
      return;
    }
    this.scanProgressEl.textContent = `${progress.idHex} ${progress.name} — ${progress.phase}`;
    this.renderScanChrome(true);
  }

  /**
   * @param {boolean} running
   */
  renderScanChrome(running) {
    if (this.scanSelectedButton) this.scanSelectedButton.disabled = running;
    if (this.scanAllButton) this.scanAllButton.disabled = running;
    if (this.scanStopButton) {
      this.scanStopButton.hidden = !running;
      this.scanStopButton.disabled = !running;
    }
    if (!running && this.scanProgressEl && !this.scanner?.isRunning()) {
      // keep last message unless empty
    }
  }

  render() {
    this.renderCurrentParameter();
    this.renderReadResult();
    this.renderSelectedCapability();
    this.renderCapabilityTable();
    this.renderCensus();
    this.renderWizard();
    this.renderExplorer();
    this.renderObserve();
    this.renderCompare();
    this.renderLog();
  }

  renderCensus() {
    const snapshot = this.census?.getSnapshot();
    if (!snapshot) return;

    const { job, stats, running } = snapshot;
    const paused = job.status === "paused";
    const completed = job.status === "completed";

    if (this.censusStartButton) {
      this.censusStartButton.disabled = running;
    }
    if (this.censusPauseButton) {
      this.censusPauseButton.hidden = !running;
      this.censusPauseButton.disabled = !running;
    }
    if (this.censusResumeButton) {
      this.censusResumeButton.disabled = running;
      this.censusResumeButton.hidden = false;
    }

    const inputsDisabled = running;
    if (this.censusStartInput) this.censusStartInput.disabled = inputsDisabled;
    if (this.censusEndInput) this.censusEndInput.disabled = inputsDisabled;
    if (this.censusDelayInput) this.censusDelayInput.disabled = inputsDisabled;
    if (this.censusTimeoutInput) this.censusTimeoutInput.disabled = inputsDisabled;

    if (!running) this.syncCensusInputsFromJob();

    if (this.censusStatusEl) {
      if (running) {
        this.censusStatusEl.textContent = `Scanning ${snapshot.currentIdHex}… ${stats.idsTested} tested · ${stats.readable} readable`;
      } else if (paused) {
        this.censusStatusEl.textContent = `Census paused at ${formatParameterIdHex(job.nextId)} — ${stats.readable} readable. Use Observe below.`;
      } else if (completed) {
        this.censusStatusEl.textContent = `Census complete — ${stats.readable} readable parameters.`;
      } else {
        this.censusStatusEl.textContent =
          "Census scan paused — use the Learning Wizard on discovered IDs.";
      }
    }

    const setStat = (key, value) => {
      const el = this.rootElement?.querySelector(`[data-census-stat="${key}"]`);
      if (el) el.textContent = String(value);
    };
    setStat("idsTested", stats.idsTested);
    setStat("readable", stats.readable);
    setStat("strings", stats.strings);
    setStat("booleans", stats.booleans);
    setStat("continuous", stats.continuous);
    setStat("enums", stats.enums);
    setStat("binary", stats.binary);

    this.rootElement
      ?.querySelectorAll("[data-census-filter]")
      .forEach((button) => {
        if (!(button instanceof HTMLElement)) return;
        const active = (button.dataset.censusFilter || "all") === this.censusFilter;
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });

    this.renderCensusTable();
  }

  renderCensusTable() {
    if (!this.censusBodyEl) return;
    const rows = listCensusParameters().filter((row) =>
      matchesCensusFilter(row.type, this.censusFilter)
    );

    if (!rows.length) {
      this.censusBodyEl.innerHTML = `
        <tr class="bidirectional-analyzer-empty-row">
          <td colspan="5">${
            listCensusParameters().length
              ? "No parameters match this filter."
              : "No readable parameters discovered yet."
          }</td>
        </tr>`;
      return;
    }

    this.censusBodyEl.innerHTML = rows
      .map((row) => {
        const censusRaw =
          row.ascii != null && row.ascii !== ""
            ? row.ascii
            : row.rawValue == null
              ? "—"
              : String(row.rawValue);
        return `<tr>
          <td><code class="bidirectional-param-id">${escapeHtml(row.id)}</code></td>
          <td>${escapeHtml(row.type)}</td>
          <td class="bidirectional-param-raw">${escapeHtml(censusRaw)}</td>
          <td class="bidirectional-param-raw">${
            row.dataLength == null ? "—" : escapeHtml(String(row.dataLength))
          }</td>
          <td class="bidirectional-param-time">${escapeHtml(
            formatSessionDate(row.firstSeen)
          )}</td>
        </tr>`;
      })
      .join("");
  }

  renderWizard() {
    const snapshot = this.wizard?.getSnapshot();
    if (!snapshot) return;

    if (
      this.wizardFunctionInput &&
      document.activeElement !== this.wizardFunctionInput &&
      this.wizardFunctionInput.value !== snapshot.functionName
    ) {
      if (snapshot.phase !== "naming" && snapshot.phase !== "idle") {
        this.wizardFunctionInput.value = snapshot.functionName;
      }
    }

    if (this.wizardFunctionInput) {
      this.wizardFunctionInput.disabled = Boolean(snapshot.busy);
    }
    if (this.wizardStartButton) {
      this.wizardStartButton.disabled = !snapshot.canStart;
      this.wizardStartButton.hidden =
        snapshot.phase === "await_change" ||
        snapshot.phase === "snapshot_a" ||
        snapshot.phase === "snapshot_n";
    }
    if (this.wizardStopButton) {
      this.wizardStopButton.hidden = !snapshot.canCaptureB;
      this.wizardStopButton.disabled = !snapshot.canCaptureB;
      this.wizardStopButton.textContent = "Snapshot B";
    }
    if (this.wizardAddSnapshotButton) {
      this.wizardAddSnapshotButton.hidden = !snapshot.canAddSnapshot;
      this.wizardAddSnapshotButton.disabled = !snapshot.canAddSnapshot;
      if (snapshot.snapshotCount >= 2) {
        const next = String.fromCharCode(
          65 + Math.min(25, snapshot.snapshotCount)
        );
        this.wizardAddSnapshotButton.textContent = `Snapshot ${next}`;
      }
    }

    if (this.wizardStatusEl) {
      this.wizardStatusEl.textContent = snapshot.status;
    }

    if (this.wizardProgressEl) {
      if (snapshot.progress) {
        this.wizardProgressEl.hidden = false;
        this.wizardProgressEl.textContent = `${snapshot.progress.label}: ${snapshot.progress.current} / ${snapshot.progress.total}`;
      } else {
        this.wizardProgressEl.hidden = true;
        this.wizardProgressEl.textContent = "";
      }
    }

    const showResults =
      snapshot.changed.length > 0 ||
      snapshot.phase === "compare" ||
      snapshot.phase === "confirm" ||
      snapshot.phase === "done";

    if (this.wizardResultsEl) {
      this.wizardResultsEl.hidden = !showResults;
    }

    if (this.wizardChangedEl) {
      if (!snapshot.changed.length) {
        this.wizardChangedEl.innerHTML = `
          <tr class="bidirectional-analyzer-empty-row">
            <td colspan="6">No changed parameters detected.</td>
          </tr>`;
      } else {
        this.wizardChangedEl.innerHTML = snapshot.changed
          .map((row) => {
            const selected = row.id === snapshot.selectedCandidateId;
            const before =
              row.beforeAscii ||
              (row.before == null ? "—" : String(row.before));
            const after =
              row.afterAscii || (row.after == null ? "—" : String(row.after));
            const series = Array.isArray(row.series)
              ? row.series
                  .map((value) => (value == null ? "·" : String(value)))
                  .join(" → ")
              : "—";
            return `<tr data-selected="${selected ? "true" : "false"}">
              <td>
                <button type="button" class="research-lab-wizard-pick" data-wizard-pick="${row.id}">
                  <div class="bidirectional-param-name">${escapeHtml(row.name)}</div>
                  <code class="bidirectional-param-id">${escapeHtml(row.idHex)}</code>
                  <div class="research-lab-muted">${escapeHtml(row.type)} · ${row.changeCount} step(s)</div>
                </button>
              </td>
              <td class="bidirectional-param-raw">${escapeHtml(before)}</td>
              <td class="bidirectional-param-raw">${escapeHtml(after)}</td>
              <td class="bidirectional-param-raw">${escapeHtml(formatDelta(row.delta))}</td>
              <td class="bidirectional-param-raw">${escapeHtml(formatPercent(row.percent))}</td>
              <td class="bidirectional-param-raw">${escapeHtml(series)}</td>
            </tr>`;
          })
          .join("");
      }
    }

    const showVerify =
      snapshot.selectedCandidate != null &&
      (snapshot.phase === "confirm" || snapshot.phase === "done");

    if (this.wizardVerifyEl) {
      this.wizardVerifyEl.hidden = !showVerify;
    }

    if (showVerify && snapshot.selectedCandidate) {
      const candidate = snapshot.selectedCandidate;
      if (this.wizardCandidateEl) {
        this.wizardCandidateEl.textContent = `${candidate.idHex}  ${candidate.before ?? "—"} → ${candidate.after ?? "—"}  (Δ ${formatDelta(candidate.delta)}, ${formatPercent(candidate.percent)})`;
      }
      if (this.wizardVerifyFlagsEl) {
        const read =
          snapshot.verification.supportsRead ?? candidate.supportsRead;
        const write =
          snapshot.verification.supportsWrite ?? candidate.supportsWrite;
        const push =
          snapshot.verification.supportsPush ?? candidate.supportsPush;
        this.wizardVerifyFlagsEl.innerHTML = `
          <li>Read ${flagMarkup(read)}</li>
          <li>Write ${flagMarkup(write)}</li>
          <li>Push ${flagMarkup(push)}</li>`;
      }
      if (this.wizardAssignPromptEl) {
        this.wizardAssignPromptEl.hidden = false;
        this.wizardAssignPromptEl.textContent = `Assign “${snapshot.functionName}” → ${candidate.idHex}?`;
      }
    }

    const verifyBusy = Boolean(snapshot.busy);
    this.rootElement
      ?.querySelectorAll(
        '[data-wizard-action="confirm"], [data-wizard-action="reject"]'
      )
      .forEach((button) => {
        if (button instanceof HTMLButtonElement) {
          if (button.dataset.wizardAction === "confirm") {
            button.disabled = !snapshot.canConfirm;
          } else {
            button.disabled = verifyBusy || snapshot.phase === "done";
          }
        }
      });

    this.renderWizardHistory();
  }

  renderWizardHistory() {
    const sessions = listLearningSessions();
    if (this.wizardHistoryCountEl) {
      this.wizardHistoryCountEl.textContent = String(sessions.length);
    }
    if (!this.wizardHistoryEl) return;

    if (!sessions.length) {
      this.wizardHistoryEl.innerHTML = `
        <tr class="bidirectional-analyzer-empty-row">
          <td colspan="5">No learning sessions yet.</td>
        </tr>`;
      return;
    }

    this.wizardHistoryEl.innerHTML = sessions
      .map((session) => {
        const verified = session.verified ? "✓" : session.status;
        const when = formatSessionDate(session.finishedAt);
        return `<tr>
          <td>${escapeHtml(session.functionName)}</td>
          <td><code class="bidirectional-param-id">${escapeHtml(
            session.parameterId || "—"
          )}</code></td>
          <td>${escapeHtml(verified)}</td>
          <td>
            ${flagMarkup(session.supportsRead)}
            ${flagMarkup(session.supportsWrite)}
            ${flagMarkup(session.supportsPush)}
          </td>
          <td class="bidirectional-param-time">${escapeHtml(when)}</td>
        </tr>`;
      })
      .join("");
  }

  renderExplorer() {
    const snapshot = this.explorer?.getSnapshot();
    const active = Boolean(snapshot?.id != null);

    if (this.explorerEmptyEl) this.explorerEmptyEl.hidden = active;
    if (this.explorerActiveEl) this.explorerActiveEl.hidden = !active;

    if (!active || !snapshot) {
      if (this.explorerStatusEl) this.explorerStatusEl.textContent = "Ready.";
      return;
    }

    if (this.explorerIdEl) this.explorerIdEl.textContent = snapshot.idHex;
    if (this.explorerNameEl) this.explorerNameEl.textContent = snapshot.name;
    if (this.explorerRawEl) {
      this.explorerRawEl.textContent =
        snapshot.raw == null ? "—" : String(snapshot.raw);
    }
    if (this.explorerDecodedEl) {
      this.explorerDecodedEl.textContent = snapshot.decoded || "—";
    }
    if (this.explorerLabelEl) {
      this.explorerLabelEl.textContent = snapshot.label || "—";
    }
    if (this.explorerOriginalEl) {
      this.explorerOriginalEl.textContent =
        snapshot.originalRaw == null ? "—" : String(snapshot.originalRaw);
    }

    if (this.explorerCapsEl) {
      this.explorerCapsEl.innerHTML = `
        <li>Read ${flagMarkup(snapshot.supportsRead)}</li>
        <li>Write ${flagMarkup(snapshot.supportsWrite)}</li>
        <li>Push ${flagMarkup(snapshot.supportsPush)}</li>`;
    }

    if (this.explorerStatusEl) {
      this.explorerStatusEl.textContent = explorerStatusLabel(snapshot);
    }

    const busy = Boolean(snapshot.busy);
    this.explorerActionButtons?.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const delta = Number(button.dataset.explorerDelta);
      const isLargeStep =
        button.dataset.explorerAction === "step" &&
        Number.isFinite(delta) &&
        Math.abs(delta) >= 100;
      // Large increments are primarily for continuous params.
      button.hidden = Boolean(isLargeStep && snapshot.isEffectType);
      button.disabled = busy;
    });

    if (this.explorerEnumsEl) {
      if (!snapshot.enums.length) {
        this.explorerEnumsEl.innerHTML = `
          <tr class="bidirectional-analyzer-empty-row">
            <td colspan="2">No enum labels learned yet.</td>
          </tr>`;
      } else {
        this.explorerEnumsEl.innerHTML = snapshot.enums
          .map(
            (row) => `<tr>
              <td class="bidirectional-param-raw">${escapeHtml(String(row.value))}</td>
              <td>${escapeHtml(row.label)}</td>
            </tr>`
          )
          .join("");
      }
    }

    if (this.explorerHistoryEl) {
      if (!snapshot.steps.length) {
        this.explorerHistoryEl.innerHTML = `
          <tr class="bidirectional-analyzer-empty-row">
            <td colspan="3">No exploration steps yet.</td>
          </tr>`;
      } else {
        this.explorerHistoryEl.innerHTML = snapshot.steps
          .map((step) => {
            const detail = step.label || step.decoded || "—";
            return `<tr>
              <td>${escapeHtml(step.action)}</td>
              <td class="bidirectional-param-raw">${
                step.raw == null ? "—" : escapeHtml(String(step.raw))
              }</td>
              <td>${escapeHtml(detail)}</td>
            </tr>`;
          })
          .join("");
      }
    }
  }

  renderSelectedCapability() {
    if (!this.capabilitySelectedEl) return;
    if (this.selectedId == null) {
      this.capabilitySelectedEl.innerHTML =
        `<p class="research-lab-muted">Select a parameter to view or scan capabilities.</p>`;
      return;
    }

    const rows = listParameterCapabilities();
    const entry =
      rows.find((row) => row.idNum === (this.selectedId & 0xffff)) || null;
    if (!entry) {
      this.capabilitySelectedEl.innerHTML =
        `<p class="research-lab-muted">Not probed yet — run Capability Scan.</p>`;
      return;
    }

    this.capabilitySelectedEl.innerHTML = `
      <div class="research-lab-capability-card">
        <div class="bidirectional-param-name">${escapeHtml(entry.name)}</div>
        <code class="bidirectional-param-id">${escapeHtml(entry.id)}</code>
        <ul class="research-lab-capability-flags">
          <li>Read ${flagMarkup(entry.supportsRead)}</li>
          <li>Write ${flagMarkup(entry.supportsWrite)}</li>
          <li>Push ${flagMarkup(entry.supportsPush)}</li>
        </ul>
      </div>`;
  }

  renderCapabilityTable() {
    const rows = listParameterCapabilities();
    if (this.capabilityCountEl) {
      this.capabilityCountEl.textContent = String(rows.length);
    }
    if (!this.capabilityBodyEl) return;

    if (!rows.length) {
      this.capabilityBodyEl.innerHTML = `
        <tr class="bidirectional-analyzer-empty-row">
          <td colspan="5">No capability data yet — scan selected or observed parameters.</td>
        </tr>`;
      return;
    }

    this.capabilityBodyEl.innerHTML = rows
      .map(
        (row) => `<tr>
          <td>
            <div class="bidirectional-param-name">${escapeHtml(row.name)}</div>
            <code class="bidirectional-param-id">${escapeHtml(row.id)}</code>
          </td>
          <td>${flagMarkup(row.supportsRead)}</td>
          <td>${flagMarkup(row.supportsWrite)}</td>
          <td>${flagMarkup(row.supportsPush)}</td>
          <td class="bidirectional-param-raw">${escapeHtml(row.scale || "unknown")}</td>
        </tr>`
      )
      .join("");
  }

  renderCurrentParameter() {
    const state = this.getSelectedState();
    const hasSelection = Boolean(state);
    const busy =
      this.pending?.status === "waiting" || this.pendingRead?.status === "waiting";

    if (this.emptyEl) this.emptyEl.hidden = hasSelection;
    if (this.selectedEl) this.selectedEl.hidden = !hasSelection;
    if (this.writeSectionEl) {
      this.writeSectionEl.hidden = !hasSelection;
    }
    if (this.readSectionEl) {
      this.readSectionEl.hidden = !hasSelection;
    }

    if (!state) {
      if (this.paramIdEl) this.paramIdEl.textContent = "—";
      if (this.paramNameEl) this.paramNameEl.textContent = "—";
      if (this.paramRawEl) this.paramRawEl.textContent = "—";
      if (this.paramDecodedEl) this.paramDecodedEl.textContent = "—";
      return;
    }

    if (this.paramIdEl) this.paramIdEl.textContent = state.idHex;
    if (this.paramNameEl) this.paramNameEl.textContent = state.name;
    if (this.paramRawEl) {
      this.paramRawEl.textContent =
        state.rawValue == null ? "—" : String(state.rawValue);
    }
    if (this.paramDecodedEl) {
      this.paramDecodedEl.textContent = state.scaledDisplay || "—";
    }

    const writable = isWritableDecodedParameter(state);
    const readable = state.type !== PARAMETER_TYPE.STRING;
    if (this.writeInputEl) {
      this.writeInputEl.disabled = !writable || busy;
    }
    if (this.writeSendButton) {
      this.writeSendButton.disabled = !writable || busy;
    }
    if (this.readSendButton) {
      this.readSendButton.disabled = !readable || busy;
      this.readSendButton.textContent =
        this.pendingRead?.status === "waiting" ? "Reading…" : "Read";
    }
    if (this.writeHintEl) {
      if (!writable) {
        this.writeHintEl.hidden = false;
        this.writeHintEl.textContent =
          "Write tests support decoded numeric parameters only (not strings).";
      } else {
        this.writeHintEl.hidden = true;
        this.writeHintEl.textContent = "";
      }
    }
  }

  renderReadResult() {
    if (!this.readResultEl) return;

    if (!this.pendingRead) {
      this.readResultEl.hidden = true;
      return;
    }

    this.readResultEl.hidden = false;
    if (this.readIdEl) this.readIdEl.textContent = this.pendingRead.idHex;
    if (this.readRawEl) {
      this.readRawEl.textContent =
        this.pendingRead.rawValue == null
          ? "—"
          : String(this.pendingRead.rawValue);
    }
    if (this.readDecodedEl) {
      this.readDecodedEl.textContent = this.pendingRead.decoded || "—";
    }
    if (this.readStatusEl) {
      const statusText =
        this.pendingRead.status === "waiting"
          ? "Waiting…"
          : this.pendingRead.status === "ok"
            ? "OK"
            : this.pendingRead.status === "no_response"
              ? "No Response"
              : "Error";
      this.readStatusEl.textContent = statusText;
      this.readStatusEl.dataset.status = this.pendingRead.status;
    }
  }

  renderObserve() {
    if (!this.observeEl) return;

    if (!this.pending && !this.pendingRead) {
      this.observeEl.dataset.tone = "idle";
      this.observeEl.innerHTML =
        `<p class="research-lab-muted">Use Parameter Census for readable IDs, Learning Wizard (snapshot A→B) to map functions, Protocol Explorer to step values, or Capability Scanner for R/W/P probes.</p>`;
      return;
    }

    if (this.pendingRead?.status === "waiting") {
      this.observeEl.dataset.tone = "waiting";
      this.observeEl.innerHTML = `
        <div class="research-lab-observe-block">
          <div class="research-lab-observe-label">Read request</div>
          <div class="research-lab-observe-value"><code>${escapeHtml(this.pendingRead.idHex)}</code> (0x41)</div>
          <div class="research-lab-observe-waiting">Waiting for Kemper response…</div>
        </div>`;
      return;
    }

    if (!this.pending) {
      // Keep last observe message from read OK / timeout via setObserveMessage.
      return;
    }

    const idHex = escapeHtml(this.pending.idHex);
    const sent = escapeHtml(String(this.pending.sentRaw));

    if (this.pending.status === "waiting") {
      this.observeEl.dataset.tone = "waiting";
      this.observeEl.innerHTML = `
        <div class="research-lab-observe-block">
          <div class="research-lab-observe-label">Sent</div>
          <div class="research-lab-observe-value"><code>${idHex}</code> = ${sent}</div>
          <div class="research-lab-observe-waiting">Waiting for response…</div>
        </div>`;
      return;
    }

    if (this.pending.status === "no_response") {
      this.observeEl.dataset.tone = "warn";
      this.observeEl.innerHTML = `
        <div class="research-lab-observe-block">
          <div class="research-lab-observe-label">Sent</div>
          <div class="research-lab-observe-value"><code>${idHex}</code> = ${sent}</div>
          <div class="research-lab-observe-result">No observable response.</div>
        </div>`;
      return;
    }

    const received = escapeHtml(String(this.pending.receivedRaw));
    const accepted = this.pending.status === "accepted";
    this.observeEl.dataset.tone = accepted ? "ok" : "warn";
    this.observeEl.innerHTML = `
      <div class="research-lab-observe-block">
        <div class="research-lab-observe-label">Response received</div>
        <div class="research-lab-observe-value"><code>${idHex}</code></div>
        <div class="research-lab-observe-value">${received}</div>
        <div class="research-lab-observe-result">${
          accepted
            ? "✓ Accepted"
            : this.pending.status === "rejected"
              ? "Rejected / unchanged"
              : "Unexpected value"
        }</div>
      </div>`;
  }

  renderCompare() {
    if (!this.compareEl) return;

    if (!this.pending) {
      this.compareEl.hidden = true;
      return;
    }

    this.compareEl.hidden = false;
    if (this.comparePrevEl) {
      this.comparePrevEl.textContent = String(this.pending.previousRaw);
    }
    if (this.compareSentEl) {
      this.compareSentEl.textContent = String(this.pending.sentRaw);
    }
    if (this.compareRecvEl) {
      this.compareRecvEl.textContent =
        this.pending.status === "waiting" || this.pending.receivedRaw == null
          ? "—"
          : String(this.pending.receivedRaw);
    }
    if (this.compareStatusEl) {
      this.compareStatusEl.textContent =
        this.pending.status === "waiting"
          ? "Waiting…"
          : statusToLabel(this.pending.status);
      this.compareStatusEl.dataset.status = this.pending.status;
    }
  }

  renderLog() {
    if (!this.logBodyEl) return;

    if (!this.experimentLog.length) {
      this.logBodyEl.innerHTML = `
        <tr class="bidirectional-analyzer-empty-row">
          <td colspan="6">No write experiments yet.</td>
        </tr>`;
      return;
    }

    this.logBodyEl.innerHTML = this.experimentLog
      .map((row) => {
        const received =
          row.receivedRaw == null ? "—" : String(row.receivedRaw);
        return `<tr data-status="${escapeHtml(row.status)}">
          <td class="bidirectional-param-time">${formatClock(row.at)}</td>
          <td>
            <div class="bidirectional-param-name">${escapeHtml(row.name)}</div>
            <code class="bidirectional-param-id">${escapeHtml(row.idHex)}</code>
          </td>
          <td class="bidirectional-param-raw">${escapeHtml(String(row.previousRaw))}</td>
          <td class="bidirectional-param-raw">${escapeHtml(String(row.sentRaw))}</td>
          <td class="bidirectional-param-raw">${escapeHtml(received)}</td>
          <td><span class="research-lab-status-pill" data-status="${escapeHtml(row.status)}">${escapeHtml(row.statusLabel)}</span></td>
        </tr>`;
      })
      .join("");
  }
}

/**
 * @param {string} status
 * @returns {string}
 */
function statusToLabel(status) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "no_response":
      return "No response";
    case "unexpected":
      return "Unexpected";
    case "waiting":
      return "Waiting";
    default:
      return status;
  }
}

/**
 * @param {boolean | null | undefined} flag
 * @returns {string}
 */
function flagLabel(flag) {
  if (flag === true) return "✓";
  if (flag === false) return "✗";
  return "?";
}

/**
 * @param {boolean | null | undefined} flag
 * @returns {string}
 */
function flagMarkup(flag) {
  if (flag === true) {
    return `<span class="research-lab-flag research-lab-flag--yes" title="Supported">✓</span>`;
  }
  if (flag === false) {
    return `<span class="research-lab-flag research-lab-flag--no" title="Not supported">✗</span>`;
  }
  return `<span class="research-lab-flag research-lab-flag--unknown" title="Unknown">?</span>`;
}

/**
 * @param {ReturnType<ProtocolExplorer["getSnapshot"]>} snapshot
 * @returns {string}
 */
function explorerStatusLabel(snapshot) {
  if (!snapshot) return "Ready.";
  if (snapshot.busy) {
    switch (snapshot.status) {
      case "read":
      case "refresh":
        return "Reading…";
      case "restore":
        return "Restoring original…";
      case "starting":
        return "Capturing original value…";
      default:
        if (String(snapshot.status).startsWith("step:")) {
          return `Stepping ${String(snapshot.status).slice(5)}…`;
        }
        return "Working…";
    }
  }
  switch (snapshot.status) {
    case "restored":
      return "Original value restored.";
    case "no_response":
      return "No response from Kemper.";
    case "error":
      return "Explorer action failed.";
    case "ready":
      return `Exploring ${snapshot.idHex} — original ${
        snapshot.originalRaw == null ? "?" : snapshot.originalRaw
      }.`;
    default:
      return "Ready.";
  }
}

/**
 * @param {{
 *   discovery: import("./BidirectionalDiscovery.js").BidirectionalDiscovery,
 *   rootElement?: HTMLElement | null,
 *   resolveLabel?: (parameterId: number, rawValue: number) => Promise<string>
 * }} options
 * @returns {ProtocolResearchLab}
 */
export function initializeProtocolResearchLab(options) {
  const lab = new ProtocolResearchLab({
    discovery: options.discovery,
    rootElement:
      options.rootElement ?? document.querySelector("#bidirectionalMonitor"),
    resolveLabel: options.resolveLabel
  });
  options.discovery?.attachResearchLab?.(lab);
  return lab;
}
