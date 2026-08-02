export const GEAR_CATEGORY = {
  MANUFACTURERS: "manufacturers",
  AMPS: "amps",
  CABINETS: "cabinets",
  EFFECTS: "effects",
  SPEAKERS: "speakers",
  MICROPHONES: "microphones",
  PEDALS: "pedals"
};

export const gearLibraryCategories = [
  { id: GEAR_CATEGORY.MANUFACTURERS, label: "Manufacturers", enabled: true },
  { id: GEAR_CATEGORY.AMPS, label: "Amps", enabled: true },
  { id: GEAR_CATEGORY.CABINETS, label: "Cabinets", enabled: false },
  { id: GEAR_CATEGORY.EFFECTS, label: "Effects", enabled: false },
  { id: GEAR_CATEGORY.SPEAKERS, label: "Speakers", enabled: false },
  { id: GEAR_CATEGORY.MICROPHONES, label: "Microphones", enabled: false },
  { id: GEAR_CATEGORY.PEDALS, label: "Pedals", enabled: false }
];

export function getEnabledGearCategories() {
  return gearLibraryCategories.filter((category) => category.enabled);
}

export function getGearCategory(categoryId) {
  return gearLibraryCategories.find((category) => category.id === categoryId) || null;
}
