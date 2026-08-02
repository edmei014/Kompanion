import { legendaryRecordings } from "./legendaryRecordings.js";
import { ampStories } from "./ampStories.js";
import { didYouKnowEntries } from "./didYouKnow.js";

/**
 * Central Discover catalog.
 * Add entries in the category files; this index only aggregates them.
 *
 * @type {import("./discoverSchema.js").DiscoverRecord[]}
 */
export const discoverRecords = [
  ...legendaryRecordings,
  ...ampStories,
  ...didYouKnowEntries
];

export { legendaryRecordings } from "./legendaryRecordings.js";
export { ampStories } from "./ampStories.js";
export { didYouKnowEntries } from "./didYouKnow.js";
