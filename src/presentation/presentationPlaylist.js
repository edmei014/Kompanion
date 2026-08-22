/**
 * Presentation playlist builders — bag shuffle and curated museum sequencing.
 *
 * Goals:
 * - Shuffle without replacement (each amp at most once per round)
 * - Spread manufacturers (no same-brand streaks)
 * - Museum: also vary decade, amp type, and power class
 */

/**
 * @typedef {{
 *   ampId: string,
 *   manufacturerId: string,
 *   manufacturer: string,
 *   sortYear?: number | null,
 *   ampType?: string | null,
 *   power?: string | null,
 *   decade?: number | null,
 *   powerClass?: string,
 *   chapterId?: string | null
 * }} PresentationPlaylistItem
 */

/**
 * @param {string | null | undefined} power
 * @returns {string}
 */
export function classifyPowerClass(power) {
  const text = String(power || "");
  const match = text.match(/(\d+(?:\.\d+)?)\s*W/i);
  if (!match) return "unknown";
  const watts = Number(match[1]);
  if (!Number.isFinite(watts)) return "unknown";
  if (watts < 30) return "low";
  if (watts <= 50) return "mid";
  if (watts <= 100) return "high";
  return "touring";
}

/**
 * @param {number | null | undefined} year
 * @returns {number | null}
 */
export function decadeFromYear(year) {
  if (year == null || !Number.isFinite(year)) return null;
  return Math.floor(year / 10) * 10;
}

/**
 * Fisher–Yates shuffle (in place copy).
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
export function shuffleBag(items) {
  const bag = [...items];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  return bag;
}

/**
 * Score how diverse `candidate` is vs the recent tail of `sequence`.
 * Higher is better.
 * @param {PresentationPlaylistItem} candidate
 * @param {PresentationPlaylistItem[]} recent
 * @param {{ museum?: boolean }} [options]
 * @returns {number}
 */
function diversityScore(candidate, recent, options = {}) {
  if (!recent.length) return Math.random();

  const last = recent[recent.length - 1];
  let score = Math.random() * 0.35;

  if (candidate.manufacturerId !== last.manufacturerId) score += 8;
  else score -= 20;

  // Soft penalty if manufacturer appears anywhere in the recent window.
  const recentMfrHits = recent.filter(
    (item) => item.manufacturerId === candidate.manufacturerId
  ).length;
  score -= recentMfrHits * 6;

  if (options.museum) {
    if (
      candidate.decade != null &&
      last.decade != null &&
      candidate.decade !== last.decade
    ) {
      score += 3.5;
    }
    if (
      candidate.ampType &&
      last.ampType &&
      normalizeKey(candidate.ampType) !== normalizeKey(last.ampType)
    ) {
      score += 2.5;
    }
    if (
      candidate.powerClass &&
      last.powerClass &&
      candidate.powerClass !== "unknown" &&
      last.powerClass !== "unknown" &&
      candidate.powerClass !== last.powerClass
    ) {
      score += 2;
    }
    if (
      candidate.chapterId &&
      last.chapterId &&
      candidate.chapterId !== last.chapterId
    ) {
      score += 1.5;
    }
  }

  return score;
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/**
 * Build a round playlist: each item once, manufacturers spread out.
 * @param {PresentationPlaylistItem[]} items
 * @param {{ museum?: boolean, recentWindow?: number }} [options]
 * @returns {PresentationPlaylistItem[]}
 */
export function buildDiverseBagPlaylist(items, options = {}) {
  const museum = Boolean(options.museum);
  const recentWindow = Math.max(2, Number(options.recentWindow) || (museum ? 5 : 3));

  if (items.length <= 1) return [...items];

  /** @type {PresentationPlaylistItem[]} */
  const remaining = shuffleBag(items);
  /** @type {PresentationPlaylistItem[]} */
  const sequence = [];

  while (remaining.length) {
    const recent = sequence.slice(-recentWindow);
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const score = diversityScore(remaining[i], recent, { museum });
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    sequence.push(picked);
  }

  return sequence;
}

/**
 * Bag shuffle without replacement, with manufacturer anti-streak.
 * @param {PresentationPlaylistItem[]} items
 * @returns {PresentationPlaylistItem[]}
 */
export function buildBagShufflePlaylist(items) {
  return buildDiverseBagPlaylist(items, { museum: false, recentWindow: 4 });
}

/**
 * Curated museum order — varied manufacturers, decades, types, power.
 * @param {PresentationPlaylistItem[]} items
 * @returns {PresentationPlaylistItem[]}
 */
export function buildMuseumCuratedPlaylist(items) {
  return buildDiverseBagPlaylist(items, { museum: true, recentWindow: 6 });
}

/**
 * @param {PresentationPlaylistItem[]} items
 * @param {import("./presentationModes.js").PresentationPlaylistStrategy} strategy
 * @returns {PresentationPlaylistItem[]}
 */
export function buildPlaylistByStrategy(items, strategy) {
  switch (strategy) {
    case "museum-curated":
      return buildMuseumCuratedPlaylist(items);
    case "bag":
      return buildBagShufflePlaylist(items);
    case "none":
    default:
      return [...items];
  }
}
