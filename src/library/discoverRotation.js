import {
  DISCOVER_BOARD_CATEGORIES,
  createDiscoverBoardState,
  createDiscoverEntryView,
  getDiscoverRecordsByCategory,
  isDiscoverCategoryId
} from "./discoverLibrary.js";

/**
 * @typedef {import("./discoverLibrary.js").DiscoverBoardState} DiscoverBoardState
 * @typedef {import("./discoverLibrary.js").DiscoverCategoryId} DiscoverCategoryId
 * @typedef {import("./discoverLibrary.js").DiscoverEntryView} DiscoverEntryView
 * @typedef {import("./discoverLibrary.js").DiscoverSlotState} DiscoverSlotState
 */

/** Independent rotation interval per Discover category. */
export const DISCOVER_ROTATION_INTERVAL_MS = 90_000;

/** Suggested UI crossfade duration for Discover slot updates. */
export const DISCOVER_ROTATION_FADE_MS = 320;

/**
 * Stagger between category timers so slots do not all change at once.
 * Keeps categories independent while spreading DOM/work over time.
 */
export const DISCOVER_ROTATION_STAGGER_MS = 30_000;

/**
 * Picks a random index, never repeating `excludeIndex` when alternatives exist.
 * @param {number} length
 * @param {number} excludeIndex
 * @returns {number}
 */
export function pickRandomIndexExcluding(length, excludeIndex) {
  if (length <= 0) return -1;
  if (length === 1) return 0;

  const safeExclude =
    excludeIndex >= 0 && excludeIndex < length ? excludeIndex : -1;
  if (safeExclude < 0) {
    return Math.floor(Math.random() * length);
  }

  let next = Math.floor(Math.random() * (length - 1));
  if (next >= safeExclude) next += 1;
  return next;
}

/**
 * Advances one category to another random entry from its own pool.
 * Never repeats the current entry when the pool has 2+ items.
 *
 * @param {DiscoverBoardState} state
 * @param {DiscoverCategoryId} categoryId
 * @returns {DiscoverBoardState}
 */
export function rotateDiscoverSlot(state, categoryId) {
  if (!isDiscoverCategoryId(categoryId)) return state;

  const records = getDiscoverRecordsByCategory(categoryId);
  if (!records.length) {
    return {
      ...state,
      [categoryId]: {
        categoryId,
        index: -1,
        view: null
      }
    };
  }

  const currentIndex = state[categoryId]?.index ?? -1;
  const nextIndex = pickRandomIndexExcluding(records.length, currentIndex);
  const record = records[nextIndex];

  /** @type {DiscoverSlotState} */
  const slot = {
    categoryId,
    index: nextIndex,
    view: record ? createDiscoverEntryView(record) : null
  };

  return {
    ...state,
    [categoryId]: slot
  };
}

/**
 * @typedef {Object} DiscoverRotationController
 * @property {() => DiscoverBoardState} start
 * @property {() => void} stop
 * @property {() => boolean} isRunning
 * @property {() => DiscoverBoardState | null} getState
 */

/**
 * Encapsulated Discover rotation engine.
 * View code should only render callbacks — not own timers or pick logic.
 *
 * @param {{
 *   intervalMs?: number,
 *   staggerMs?: number,
 *   onSlotRotate?: (payload: {
 *     categoryId: DiscoverCategoryId,
 *     view: DiscoverEntryView | null,
 *     state: DiscoverBoardState
 *   }) => void
 * }} [options]
 * @returns {DiscoverRotationController}
 */
export function createDiscoverRotationController(options = {}) {
  const {
    intervalMs = DISCOVER_ROTATION_INTERVAL_MS,
    staggerMs = DISCOVER_ROTATION_STAGGER_MS,
    onSlotRotate = null
  } = options;

  /** @type {DiscoverBoardState | null} */
  let state = null;
  let running = false;

  /** @type {Map<DiscoverCategoryId, ReturnType<typeof setInterval>>} */
  const intervalTimers = new Map();

  /** @type {Map<DiscoverCategoryId, ReturnType<typeof setTimeout>>} */
  const startTimeouts = new Map();

  function clearCategoryTimers(categoryId) {
    const intervalId = intervalTimers.get(categoryId);
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalTimers.delete(categoryId);
    }

    const timeoutId = startTimeouts.get(categoryId);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      startTimeouts.delete(categoryId);
    }
  }

  function clearAllTimers() {
    for (const { id } of DISCOVER_BOARD_CATEGORIES) {
      clearCategoryTimers(id);
    }
  }

  /**
   * @param {DiscoverCategoryId} categoryId
   */
  function rotateCategory(categoryId) {
    if (!running || !state) return;

    const records = getDiscoverRecordsByCategory(categoryId);
    if (records.length < 2) return;

    state = rotateDiscoverSlot(state, categoryId);
    onSlotRotate?.({
      categoryId,
      view: state[categoryId]?.view ?? null,
      state
    });
  }

  /**
   * Arms one category timer. Initial board pick stays visible until the first
   * rotate at `intervalMs + categoryIndex * staggerMs`, then every `intervalMs`.
   *
   * @param {DiscoverCategoryId} categoryId
   * @param {number} categoryIndex
   */
  function armCategory(categoryId, categoryIndex) {
    clearCategoryTimers(categoryId);

    const records = getDiscoverRecordsByCategory(categoryId);
    if (records.length < 2) return;

    const firstRotateDelay = intervalMs + categoryIndex * staggerMs;
    const timeoutId = setTimeout(() => {
      startTimeouts.delete(categoryId);
      if (!running) return;

      rotateCategory(categoryId);
      const intervalId = setInterval(() => {
        rotateCategory(categoryId);
      }, intervalMs);
      intervalTimers.set(categoryId, intervalId);
    }, firstRotateDelay);

    startTimeouts.set(categoryId, timeoutId);
  }

  /**
   * Creates a fresh random board and starts independent category timers.
   * Callers should render the returned state immediately (no fade on open).
   */
  function start() {
    stop();
    running = true;
    state = createDiscoverBoardState({ strategy: "random" });

    DISCOVER_BOARD_CATEGORIES.forEach(({ id }, index) => {
      armCategory(id, index);
    });

    return state;
  }

  function stop() {
    running = false;
    clearAllTimers();
  }

  /**
   * Advances every category once (independent picks). Used by Presentation
   * Discover Only — does not require the background interval engine.
   *
   * @param {{ emit?: boolean }} [options]
   * @returns {DiscoverBoardState}
   */
  function rotateAll(options = {}) {
    const { emit = true } = options;

    if (!state) {
      state = createDiscoverBoardState({ strategy: "random" });
    }

    for (const { id } of DISCOVER_BOARD_CATEGORIES) {
      const records = getDiscoverRecordsByCategory(id);
      if (!records.length) continue;
      state = rotateDiscoverSlot(state, id);
      if (emit) {
        onSlotRotate?.({
          categoryId: id,
          view: state[id]?.view ?? null,
          state
        });
      }
    }

    return state;
  }

  return {
    start,
    stop,
    rotateAll,
    isRunning: () => running,
    getState: () => state
  };
}
