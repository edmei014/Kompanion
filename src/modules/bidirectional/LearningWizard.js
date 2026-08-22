/**
 * Learning Wizard — assign Kemper functions via before/after snapshots.
 *
 * Reads every Parameter-Census readable ID (Snapshot A), waits for one user
 * action, then reads them again (Snapshot B). Only changed parameters are shown.
 * Optional further snapshots refine continuous-knob candidates.
 */

import { buildSingleParameterRequest } from "./decoder/protocolMessages.js";
import {
  formatParameterIdHex,
  lookupParameter
} from "./decoder/parameterRegistry.js";
import {
  listParameterCapabilities,
  lookupParameterCapability,
  upsertParameterCapability
} from "./parameterCapabilityRegistry.js";
import {
  listCensusReadableIds,
  lookupCensusParameter
} from "./parameterCensusRegistry.js";
import {
  confirmLearnedParameter,
  recordLearningSession
} from "./learnedParameterRegistry.js";

const READ_TIMEOUT_MS = 70;
const INTER_READ_MS = 8;

/**
 * @typedef {"idle" | "naming" | "snapshot_a" | "await_change" | "snapshot_n" | "compare" | "confirm" | "done"} WizardPhase
 *
 * @typedef {{
 *   label: string,
 *   at: number,
 *   values: Map<number, number | null>,
 *   ascii: Map<number, string | null>
 * }} WizardSnapshot
 *
 * @typedef {{
 *   id: number,
 *   idHex: string,
 *   name: string,
 *   type: string,
 *   before: number | null,
 *   after: number | null,
 *   beforeAscii: string | null,
 *   afterAscii: string | null,
 *   delta: number | null,
 *   percent: number | null,
 *   series: Array<number | null>,
 *   changeCount: number,
 *   supportsRead: boolean | null,
 *   supportsWrite: boolean | null,
 *   supportsPush: boolean | null
 * }} ChangedParameter
 */

export class LearningWizard {
  /**
   * @param {{
   *   discovery: import("./BidirectionalDiscovery.js").BidirectionalDiscovery,
   *   onChange?: () => void
   * }} options
   */
  constructor(options) {
    this.discovery = options.discovery;
    this.onChange = options.onChange ?? null;

    /** @type {WizardPhase} */
    this.phase = "idle";
    /** @type {string} */
    this.functionName = "";
    /** @type {string} */
    this.status = "Enter a function name to begin.";
    /** @type {boolean} */
    this.busy = false;
    /** @type {boolean} */
    this.abortRequested = false;

    /** @type {number[]} */
    this.targetIds = [];
    /** @type {WizardSnapshot[]} */
    this.snapshots = [];
    /** @type {ChangedParameter[]} */
    this.changed = [];
    /** @type {number | null} */
    this.selectedCandidateId = null;

    /** @type {{ current: number, total: number, label: string } | null} */
    this.progress = null;

    /** @type {{
     *   supportsRead: boolean | null,
     *   supportsWrite: boolean | null,
     *   supportsPush: boolean | null
     * }} */
    this.verification = {
      supportsRead: null,
      supportsWrite: null,
      supportsPush: null
    };

    /** @type {string | null} */
    this.sessionStartedAt = null;

    /** @type {null | {
     *   id: number,
     *   resolve: (payload: {
     *     raw: number | null,
     *     ascii: string | null
     *   } | null) => void
     * }} */
    this.waitHandle = null;

    /** @type {Set<number>} */
    this.explicitReadIds = new Set();
  }

  /**
   * @param {{
   *   result: { state: import("./decoder/parameterState.js").ParameterState | null },
   *   decoded: import("./decoder/decodeSysEx.js").DecodedSysEx
   * }} event
   */
  onTraffic(event) {
    if (!this.waitHandle) return;
    const decoded = event?.decoded;
    const state = event?.result?.state ?? null;
    const id = decoded?.parameterId ?? state?.id;
    if (id == null || (id & 0xffff) !== this.waitHandle.id) return;

    const raw =
      state?.rawValue != null
        ? state.rawValue
        : decoded?.value != null
          ? decoded.value
          : null;
    const ascii =
      (state?.ascii && state.ascii) ||
      (decoded?.hasReadableAscii && decoded.ascii) ||
      null;

    if (raw == null && !ascii) return;

    const { resolve } = this.waitHandle;
    this.waitHandle = null;
    resolve({
      raw,
      ascii: ascii ? String(ascii) : null
    });
  }

  /**
   * Backward-compatible hook used by ProtocolResearchLab.
   * @param {import("./decoder/parameterState.js").ParameterState} state
   */
  onParameterState(state) {
    this.onTraffic({
      result: { state },
      decoded: {
        ok: true,
        parameterId: state?.id ?? null,
        value: state?.rawValue ?? null,
        ascii: state?.ascii ?? null,
        hasReadableAscii: Boolean(state?.ascii)
      }
    });
  }

  /**
   * @param {number} id
   * @returns {boolean}
   */
  isWaitingFor(id) {
    return this.waitHandle?.id === (id & 0xffff);
  }

  /**
   * @param {number} id
   * @returns {boolean}
   */
  isExplicitReadOutstanding(id) {
    return this.explicitReadIds.has(id & 0xffff);
  }

  isBusy() {
    return this.busy;
  }

  isRecording() {
    return false;
  }

  getPhase() {
    return this.phase;
  }

  getSnapshot() {
    const candidate =
      this.selectedCandidateId == null
        ? null
        : this.changed.find((row) => row.id === this.selectedCandidateId) ||
          null;

    const snapshotCount = this.snapshots.length;
    const lastLabel =
      snapshotCount > 0 ? this.snapshots[snapshotCount - 1].label : null;

    return {
      phase: this.phase,
      functionName: this.functionName,
      status: this.status,
      busy: this.busy,
      recording: false,
      progress: this.progress,
      targetCount: this.targetIds.length,
      snapshotCount,
      lastSnapshotLabel: lastLabel,
      trafficCount: 0,
      eventCount: 0,
      changed: this.changed,
      selectedCandidateId: this.selectedCandidateId,
      selectedCandidate: candidate,
      verification: { ...this.verification },
      canStart:
        Boolean(this.functionName.trim()) &&
        !this.busy &&
        (this.phase === "idle" ||
          this.phase === "naming" ||
          this.phase === "done"),
      canCaptureB: this.phase === "await_change" && !this.busy,
      canAddSnapshot:
        (this.phase === "compare" || this.phase === "confirm") &&
        !this.busy &&
        this.snapshots.length >= 2,
      canStop: this.phase === "await_change" && !this.busy,
      canConfirm:
        this.phase === "confirm" &&
        this.selectedCandidateId != null &&
        !this.busy
    };
  }

  /**
   * @param {string} name
   */
  setFunctionName(name) {
    this.functionName = String(name || "").trim();
    if (this.phase === "idle" || this.phase === "naming" || this.phase === "done") {
      this.phase = this.functionName ? "naming" : "idle";
      this.status = this.functionName
        ? `Ready to learn “${this.functionName}” against ${collectReadableIds().length} readable parameter(s).`
        : "Enter a function name to begin.";
    }
    this.notify();
  }

  /**
   * Snapshot A — read every census/capability readable parameter.
   */
  async startLearning() {
    if (this.busy) return;
    const name = this.functionName.trim();
    if (!name) {
      this.status = "Enter a function name first.";
      this.notify();
      return;
    }

    if (!this.discovery?.output && !this.discovery?.externalSend) {
      this.status = "No MIDI output available.";
      this.notify();
      return;
    }

    this.targetIds = collectReadableIds();
    if (!this.targetIds.length) {
      this.status =
        "No readable parameters found. Run Parameter Census first (or Capability Scanner).";
      this.phase = "naming";
      this.notify();
      return;
    }

    this.busy = true;
    this.abortRequested = false;
    this.functionName = name;
    this.sessionStartedAt = new Date().toISOString();
    this.snapshots = [];
    this.changed = [];
    this.selectedCandidateId = null;
    this.verification = {
      supportsRead: null,
      supportsWrite: null,
      supportsPush: null
    };
    this.phase = "snapshot_a";
    this.status = `Snapshot A — reading ${this.targetIds.length} readable parameter(s)…`;
    this.notify();

    try {
      const shot = await this.takeSnapshot("A");
      if (this.abortRequested || !shot) {
        this.phase = "naming";
        this.status = "Learning aborted.";
        return;
      }

      this.snapshots = [shot];
      this.phase = "await_change";
      this.progress = null;
      this.status = `Snapshot A done (${countFilled(shot)} values). Change ONLY “${name}” on the Kemper, then capture Snapshot B.`;
    } catch (error) {
      console.warn("[Learning Wizard] snapshot A failed:", error);
      this.phase = "naming";
      this.status = "Snapshot A failed.";
    } finally {
      this.busy = false;
      this.notify();
    }
  }

  /**
   * Snapshot B (first after action) or next snapshot in a multi-shot sequence.
   */
  async stopLearning() {
    if (this.phase === "await_change") {
      return this.captureNextSnapshot("B");
    }
    return undefined;
  }

  /**
   * Capture Snapshot B / C / D … after the user action (or further moves).
   * @param {string} [forcedLabel]
   */
  async captureNextSnapshot(forcedLabel) {
    if (this.busy) return;
    if (
      this.phase !== "await_change" &&
      this.phase !== "compare" &&
      this.phase !== "confirm"
    ) {
      return;
    }

    if (!this.discovery?.output && !this.discovery?.externalSend) {
      this.status = "No MIDI output available.";
      this.notify();
      return;
    }

    const label =
      forcedLabel ||
      String.fromCharCode(65 + Math.min(25, this.snapshots.length));

    this.busy = true;
    this.abortRequested = false;
    this.phase = "snapshot_n";
    this.status = `Snapshot ${label} — reading ${this.targetIds.length} parameter(s)…`;
    this.notify();

    try {
      const shot = await this.takeSnapshot(label);
      if (this.abortRequested || !shot) {
        this.phase = this.snapshots.length ? "compare" : "naming";
        this.status = "Snapshot aborted.";
        return;
      }

      this.snapshots.push(shot);
      this.changed = this.diffSnapshots(this.snapshots);
      this.progress = null;

      if (!this.changed.length) {
        this.phase = "compare";
        this.status =
          this.snapshots.length === 2
            ? "No parameter changes detected. Move the control further and capture another snapshot."
            : `Snapshot ${label} captured — still no stable changes. Try a larger move.`;
        if (this.snapshots.length === 2) {
          this.recordSession({
            status: "aborted",
            verified: false,
            parameterIdNum: null,
            changedCount: 0
          });
        }
      } else {
        this.selectedCandidateId = this.changed[0].id;
        const top = this.changed[0];
        this.verification = {
          supportsRead: top.supportsRead,
          supportsWrite: top.supportsWrite,
          supportsPush: top.supportsPush
        };
        this.phase = "confirm";
        this.status = `${this.changed.length} changed parameter(s) across ${this.snapshots.length} snapshots. Select the match for “${this.functionName}”.`;
      }
    } catch (error) {
      console.warn("[Learning Wizard] snapshot failed:", error);
      this.phase = "compare";
      this.status = "Snapshot failed.";
    } finally {
      this.busy = false;
      this.notify();
    }
  }

  async addSnapshot() {
    return this.captureNextSnapshot();
  }

  requestAbort() {
    this.abortRequested = true;
    if (this.waitHandle) {
      const { resolve } = this.waitHandle;
      this.waitHandle = null;
      resolve(null);
    }
  }

  reset() {
    this.requestAbort();
    this.busy = false;
    this.phase = this.functionName.trim() ? "naming" : "idle";
    this.status = this.functionName.trim()
      ? `Ready to learn “${this.functionName.trim()}”.`
      : "Enter a function name to begin.";
    this.progress = null;
    this.snapshots = [];
    this.changed = [];
    this.selectedCandidateId = null;
    this.targetIds = [];
    this.verification = {
      supportsRead: null,
      supportsWrite: null,
      supportsPush: null
    };
    this.notify();
  }

  /**
   * @param {number} id
   */
  selectCandidate(id) {
    if (this.busy) return;
    if (this.phase !== "compare" && this.phase !== "confirm" && this.phase !== "done") {
      return;
    }
    const normalized = id & 0xffff;
    if (!this.changed.some((row) => row.id === normalized)) return;
    this.selectedCandidateId = normalized;
    this.phase = "confirm";
    const row = this.lookupChanged(normalized);
    this.verification = {
      supportsRead: row?.supportsRead ?? null,
      supportsWrite: row?.supportsWrite ?? null,
      supportsPush: row?.supportsPush ?? null
    };
    this.status = `Selected ${formatParameterIdHex(normalized)} for “${this.functionName}”.`;
    this.notify();
  }

  async confirmAssignment() {
    if (this.busy || this.selectedCandidateId == null) return;
    const candidate = this.lookupChanged(this.selectedCandidateId);
    if (!candidate) return;

    const supportsRead = this.verification.supportsRead ?? candidate.supportsRead ?? true;
    const supportsWrite =
      this.verification.supportsWrite ?? candidate.supportsWrite;
    const supportsPush =
      this.verification.supportsPush ?? candidate.supportsPush;

    const entry = confirmLearnedParameter({
      idNum: candidate.id,
      name: this.functionName.trim(),
      verified: true,
      method: "Learning Wizard",
      supportsRead,
      supportsWrite,
      supportsPush,
      confidence: 1,
      notes: `Snapshots ${this.snapshots.map((s) => s.label).join("→")} · Δ ${formatDelta(candidate.delta)} · ${formatPercent(candidate.percent)}`
    });

    upsertParameterCapability(candidate.id, {
      name: entry.name,
      supportsRead,
      supportsWrite,
      supportsPush,
      lastProbed: new Date().toISOString(),
      notes: "Assigned via Learning Wizard"
    });

    this.recordSession({
      status: "completed",
      verified: true,
      parameterIdNum: candidate.id,
      changedCount: this.changed.length,
      supportsRead,
      supportsWrite,
      supportsPush
    });

    this.phase = "done";
    this.status = `Assigned “${entry.name}” → ${entry.id}.`;
    this.notify();
  }

  rejectAssignment() {
    if (this.busy) return;
    this.recordSession({
      status: "rejected",
      verified: false,
      parameterIdNum: this.selectedCandidateId,
      changedCount: this.changed.length,
      supportsRead: this.verification.supportsRead,
      supportsWrite: this.verification.supportsWrite,
      supportsPush: this.verification.supportsPush
    });
    this.phase = "naming";
    this.status = `Rejected assignment for “${this.functionName}”. Ready for another run.`;
    this.snapshots = [];
    this.changed = [];
    this.selectedCandidateId = null;
    this.verification = {
      supportsRead: null,
      supportsWrite: null,
      supportsPush: null
    };
    this.notify();
  }

  /**
   * @param {string} label
   * @returns {Promise<WizardSnapshot | null>}
   */
  async takeSnapshot(label) {
    const ids = this.targetIds.length ? this.targetIds : collectReadableIds();
    this.targetIds = ids;
    /** @type {Map<number, number | null>} */
    const values = new Map();
    /** @type {Map<number, string | null>} */
    const ascii = new Map();

    for (let index = 0; index < ids.length; index += 1) {
      if (this.abortRequested) return null;
      const id = ids[index];
      this.progress = {
        current: index + 1,
        total: ids.length,
        label: `Snapshot ${label}`
      };
      this.status = `Snapshot ${label}… ${index + 1} / ${ids.length}`;
      this.notify();

      const response = await this.readRaw(id);
      values.set(id, response?.raw ?? null);
      ascii.set(id, response?.ascii ?? null);
      await delay(INTER_READ_MS);
    }

    return {
      label,
      at: Date.now(),
      values,
      ascii
    };
  }

  /**
   * Diff consecutive snapshots; prefer params that changed in the latest step.
   * Multi-shot: boost candidates that also changed in earlier steps (continuous).
   * @param {WizardSnapshot[]} shots
   * @returns {ChangedParameter[]}
   */
  diffSnapshots(shots) {
    if (shots.length < 2) return [];

    const first = shots[0];
    const last = shots[shots.length - 1];
    const prev = shots[shots.length - 2];

    /** @type {Map<number, number>} */
    const changeCounts = new Map();
    for (let i = 1; i < shots.length; i += 1) {
      const a = shots[i - 1];
      const b = shots[i];
      for (const id of this.targetIds) {
        if (valuesDiffer(a, b, id)) {
          changeCounts.set(id, (changeCounts.get(id) || 0) + 1);
        }
      }
    }

    /** @type {ChangedParameter[]} */
    const rows = [];
    for (const id of this.targetIds) {
      // Must have changed on the latest step (prev → last).
      if (!valuesDiffer(prev, last, id)) continue;

      const before = first.values.get(id) ?? null;
      const after = last.values.get(id) ?? null;
      const beforeAscii = first.ascii.get(id) ?? null;
      const afterAscii = last.ascii.get(id) ?? null;
      const delta =
        before != null && after != null && Number.isFinite(before) && Number.isFinite(after)
          ? after - before
          : null;
      const percent =
        before != null && before !== 0 && delta != null
          ? (delta / Math.abs(before)) * 100
          : before === 0 && after != null && after !== 0
            ? 100
            : null;

      const census = lookupCensusParameter(id);
      const definition = lookupParameter(id);
      const cap = lookupParameterCapability(id);
      const existing = this.discovery.getParameter(id);
      const series = shots.map((shot) => shot.values.get(id) ?? null);

      rows.push({
        id,
        idHex: formatParameterIdHex(id),
        name:
          existing?.name && !String(existing.name).startsWith("Readable")
            ? existing.name
            : definition?.name && definition.known
              ? definition.name
              : formatParameterIdHex(id),
        type: census?.type || "continuous",
        before,
        after,
        beforeAscii,
        afterAscii,
        delta,
        percent,
        series,
        changeCount: changeCounts.get(id) || 1,
        supportsRead: true,
        supportsWrite: cap?.supportsWrite ?? null,
        supportsPush: cap?.supportsPush ?? null
      });
    }

    rows.sort((left, right) => {
      if (right.changeCount !== left.changeCount) {
        return right.changeCount - left.changeCount;
      }
      const ld = Math.abs(left.delta ?? 0);
      const rd = Math.abs(right.delta ?? 0);
      return rd - ld;
    });
    return rows;
  }

  /**
   * @param {number} id
   * @returns {Promise<{ raw: number | null, ascii: string | null } | null>}
   */
  async readRaw(id) {
    this.explicitReadIds.add(id & 0xffff);
    try {
      const sent = this.discovery.sendResearchSysEx(
        buildSingleParameterRequest(id)
      );
      if (!sent) return null;
      return this.waitForResponse(id, READ_TIMEOUT_MS);
    } finally {
      window.setTimeout(() => {
        this.explicitReadIds.delete(id & 0xffff);
      }, 25);
    }
  }

  /**
   * @param {number} id
   * @param {number} timeoutMs
   * @returns {Promise<{ raw: number | null, ascii: string | null } | null>}
   */
  waitForResponse(id, timeoutMs) {
    return new Promise((resolve) => {
      const normalized = id & 0xffff;
      if (this.waitHandle) {
        this.waitHandle.resolve(null);
        this.waitHandle = null;
      }
      const timer = window.setTimeout(() => {
        if (this.waitHandle?.id === normalized) {
          this.waitHandle = null;
          resolve(null);
        }
      }, timeoutMs);
      this.waitHandle = {
        id: normalized,
        resolve: (value) => {
          window.clearTimeout(timer);
          resolve(value);
        }
      };
    });
  }

  /**
   * @param {number | null} id
   * @returns {ChangedParameter | null}
   */
  lookupChanged(id) {
    if (id == null) return null;
    return this.changed.find((row) => row.id === (id & 0xffff)) || null;
  }

  /**
   * @param {{
   *   status: "completed" | "rejected" | "aborted",
   *   verified: boolean,
   *   parameterIdNum: number | null,
   *   changedCount: number,
   *   supportsRead?: boolean | null,
   *   supportsWrite?: boolean | null,
   *   supportsPush?: boolean | null
   * }} input
   */
  recordSession(input) {
    const idNum = input.parameterIdNum;
    recordLearningSession({
      functionName: this.functionName.trim() || "Unknown",
      parameterId: idNum == null ? null : formatParameterIdHex(idNum),
      parameterIdNum: idNum,
      verified: input.verified,
      supportsRead: input.supportsRead ?? null,
      supportsWrite: input.supportsWrite ?? null,
      supportsPush: input.supportsPush ?? null,
      changedCount: input.changedCount,
      status: input.status,
      startedAt: this.sessionStartedAt || new Date().toISOString(),
      finishedAt: new Date().toISOString()
    });
  }

  notify() {
    this.onChange?.();
  }
}

/**
 * Prefer Parameter Census readable IDs; fall back to capability-confirmed reads.
 * @returns {number[]}
 */
export function collectReadableIds() {
  const censusIds = listCensusReadableIds();
  if (censusIds.length) return censusIds;

  return listParameterCapabilities()
    .filter((row) => row.supportsRead === true)
    .map((row) => row.idNum)
    .sort((a, b) => a - b);
}

/**
 * @param {WizardSnapshot} a
 * @param {WizardSnapshot} b
 * @param {number} id
 * @returns {boolean}
 */
function valuesDiffer(a, b, id) {
  const aRaw = a.values.get(id);
  const bRaw = b.values.get(id);
  const aAscii = a.ascii.get(id);
  const bAscii = b.ascii.get(id);

  if (aAscii != null || bAscii != null) {
    return String(aAscii || "") !== String(bAscii || "");
  }
  if (aRaw == null || bRaw == null) return false;
  return aRaw !== bRaw;
}

/**
 * @param {WizardSnapshot} shot
 * @returns {number}
 */
function countFilled(shot) {
  let n = 0;
  for (const value of shot.values.values()) {
    if (value != null) n += 1;
  }
  for (const value of shot.ascii.values()) {
    if (value) n += 1;
  }
  return n;
}

/**
 * @param {number | null | undefined} delta
 * @returns {string}
 */
export function formatDelta(delta) {
  if (delta == null || !Number.isFinite(delta)) return "—";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

/**
 * @param {number | null | undefined} percent
 * @returns {string}
 */
export function formatPercent(percent) {
  if (percent == null || !Number.isFinite(percent)) return "—";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
