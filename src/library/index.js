/**
 * Public Gear Library API.
 * Application code should import from here — never from src/data/* directly.
 */
export {
  AMP_ATLAS_PRESENTATION,
  AMP_ATLAS_PRESENTATION_DEFAULT,
  AMP_BROWSER_VIEW,
  AMP_BROWSER_VIEWS,
  AMP_BROWSER_VIEW_DEFAULT,
  AMP_IMAGE_BASE_PATH,
  AMP_IMAGE_FILTER,
  AMP_SORT,
  AMP_SORT_DEFAULT,
  AMP_SORT_OPTIONS,
  buildAmpBrowseSections,
  buildAmpManufacturerViewSections,
  buildAmpTimelineSections,
  compareAmpBrowseEntries,
  getAllAmps,
  getAmpAliases,
  getAmpBrowseEntries,
  getAmpBrowseSortModeForView,
  getAmpById,
  getAmpDetailView,
  getAmpFieldDisplayValue,
  getAmpImage,
  getAmpPerformanceThumbnail,
  getAmpImageFilename,
  getAmpImageFilenameForText,
  getAmpImageForText,
  getAmpLibraryStats,
  getAmpsByManufacturer,
  getAmpsByManufacturerId,
  getManufacturers,
  groupAmpBrowseEntriesByManufacturer,
  hasAmpImage,
  isAmpBrowserView,
  isAmpSortMode,
  isAmpSortOption,
  isManufacturerSort,
  normalizeAmpSort,
  parseAmpSortSpec,
  parseAmpSortYear,
  parseManufacturerFoundedYear,
  segmentAmpBrowseEntriesByManufacturerRuns,
  resolveAmpIdFromText,
  resolveAmpIdFromTextSources,
  resolveAmpRecordFromText,
  resolveAmpRecordFromTextSources,
  searchAmps
} from "./ampLibrary.js";

export {
  getAllManufacturerIds,
  getManufacturerBrowseEntries,
  getManufacturerById,
  getManufacturerDisplayName,
  getManufacturerDetailView,
  getManufacturerLibraryStats,
  resolveManufacturerIdFromAmpManufacturerName
} from "./manufacturerLibrary.js";

export {
  getAllCabinets,
  getCabinetById,
  getCabinetDetailView,
  getCabinetImage,
  resolveCabinetRecordFromTextSources,
  searchCabinets
} from "./cabinetLibrary.js";
export { getAllEffects } from "./effectLibrary.js";

export {
  DISCOVER_BOARD_CATEGORIES,
  DISCOVER_CATEGORY,
  DISCOVER_CATEGORY_LABELS,
  advanceDiscoverBoard,
  advanceDiscoverSlot,
  createDiscoverBoardState,
  createDiscoverEntryView,
  getAllDiscoverRecords,
  getDiscoverById,
  getDiscoverCategoryLabel,
  getDiscoverEntryView,
  getDiscoverLibraryStats,
  getDiscoverRecordsByCategory,
  isDiscoverCategoryId
} from "./discoverLibrary.js";

export {
  DISCOVER_ROTATION_FADE_MS,
  DISCOVER_ROTATION_INTERVAL_MS,
  DISCOVER_ROTATION_STAGGER_MS,
  createDiscoverRotationController,
  pickRandomIndexExcluding,
  rotateDiscoverSlot
} from "./discoverRotation.js";
