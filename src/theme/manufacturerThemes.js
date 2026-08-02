/**
 * Subtle manufacturer lighting themes for Gear Library cards and detail heroes.
 * These act as soft ambient light — never as dominant card coloring.
 *
 * Amp-level `theme` overrides still win when present.
 *
 * @typedef {import("./ampTheme.js").AmpTheme} AmpTheme
 * @typedef {import("./ampTheme.js").AmpThemeInput} AmpThemeInput
 */

import { DEFAULT_AMP_DETAIL_THEME, DEFAULT_AMP_THEME, resolveAmpTheme } from "./ampTheme.js";

/**
 * Card themes: translucent surfaces + soft light.
 * Keep saturation extremely low.
 *
 * @type {Record<string, AmpThemeInput>}
 */
const MANUFACTURER_CARD_THEMES = {
  marshall: {
    surface: "rgba(15, 14, 13, 0.82)",
    gradientStart: "rgba(188, 156, 108, 0.05)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(120, 92, 52, 0.18)",
    border: "rgba(56, 50, 42, 0.95)"
  },
  "mesa-boogie": {
    surface: "rgba(10, 9, 9, 0.86)",
    gradientStart: "rgba(140, 72, 52, 0.045)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(96, 42, 30, 0.16)",
    border: "rgba(48, 36, 32, 0.95)"
  },
  bogner: {
    surface: "rgba(12, 13, 14, 0.84)",
    gradientStart: "rgba(150, 168, 186, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(88, 100, 112, 0.14)",
    border: "rgba(44, 48, 52, 0.95)"
  },
  fender: {
    surface: "rgba(11, 13, 16, 0.84)",
    gradientStart: "rgba(120, 148, 186, 0.045)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(92, 112, 138, 0.15)",
    border: "rgba(46, 52, 60, 0.95)"
  },
  vox: {
    surface: "rgba(16, 13, 11, 0.84)",
    gradientStart: "rgba(176, 136, 78, 0.05)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(118, 84, 42, 0.17)",
    border: "rgba(58, 46, 34, 0.95)"
  },
  orange: {
    surface: "rgba(10, 9, 8, 0.88)",
    gradientStart: "rgba(176, 96, 42, 0.045)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(128, 64, 24, 0.15)",
    border: "rgba(52, 38, 28, 0.95)"
  },
  engl: {
    surface: "rgba(12, 11, 11, 0.86)",
    gradientStart: "rgba(168, 48, 48, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(104, 36, 36, 0.14)",
    border: "rgba(50, 36, 36, 0.95)"
  },
  diezel: {
    surface: "rgba(10, 10, 11, 0.88)",
    gradientStart: "rgba(120, 128, 148, 0.035)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(72, 76, 92, 0.14)",
    border: "rgba(42, 44, 50, 0.95)"
  },
  friedman: {
    surface: "rgba(14, 12, 11, 0.84)",
    gradientStart: "rgba(168, 132, 84, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(108, 80, 44, 0.15)",
    border: "rgba(54, 44, 34, 0.95)"
  },
  soldano: {
    surface: "rgba(11, 11, 12, 0.86)",
    gradientStart: "rgba(150, 150, 160, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(90, 90, 102, 0.14)",
    border: "rgba(46, 46, 52, 0.95)"
  },
  peavey: {
    surface: "rgba(12, 12, 12, 0.84)",
    gradientStart: "rgba(150, 150, 150, 0.035)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(96, 96, 96, 0.12)",
    border: "rgba(48, 48, 48, 0.95)"
  },
  hiwatt: {
    surface: "rgba(12, 13, 14, 0.84)",
    gradientStart: "rgba(170, 180, 190, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(110, 120, 130, 0.13)",
    border: "rgba(48, 52, 56, 0.95)"
  },
  roland: {
    surface: "rgba(11, 12, 14, 0.84)",
    gradientStart: "rgba(120, 140, 170, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(80, 96, 120, 0.13)",
    border: "rgba(42, 48, 56, 0.95)"
  },
  evh: {
    surface: "rgba(14, 11, 10, 0.86)",
    gradientStart: "rgba(170, 70, 48, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(120, 48, 32, 0.14)",
    border: "rgba(54, 38, 32, 0.95)"
  },
  "tone-king": {
    surface: "rgba(15, 13, 11, 0.84)",
    gradientStart: "rgba(176, 148, 96, 0.045)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(120, 96, 56, 0.15)",
    border: "rgba(56, 46, 34, 0.95)"
  },
  "3rd-power": {
    surface: "rgba(12, 12, 13, 0.84)",
    gradientStart: "rgba(140, 150, 170, 0.035)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(88, 96, 112, 0.13)",
    border: "rgba(46, 48, 54, 0.95)"
  },
  egnater: {
    surface: "rgba(12, 12, 12, 0.84)",
    gradientStart: "rgba(150, 120, 90, 0.035)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(100, 78, 54, 0.13)",
    border: "rgba(50, 44, 38, 0.95)"
  },
  krank: {
    surface: "rgba(11, 10, 10, 0.86)",
    gradientStart: "rgba(160, 60, 50, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(110, 40, 34, 0.14)",
    border: "rgba(50, 36, 34, 0.95)"
  },
  redplate: {
    surface: "rgba(14, 11, 11, 0.84)",
    gradientStart: "rgba(160, 70, 60, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(110, 46, 40, 0.14)",
    border: "rgba(54, 38, 36, 0.95)"
  },
  randall: {
    surface: "rgba(11, 11, 12, 0.86)",
    gradientStart: "rgba(130, 140, 150, 0.035)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(80, 86, 94, 0.13)",
    border: "rgba(44, 46, 50, 0.95)"
  },
  driftwood: {
    surface: "rgba(14, 12, 10, 0.84)",
    gradientStart: "rgba(160, 128, 88, 0.04)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    glow: "rgba(108, 82, 50, 0.14)",
    border: "rgba(54, 44, 34, 0.95)"
  }
};

/**
 * Detail hero themes: denser surfaces, softer accent glow.
 * @type {Record<string, AmpThemeInput>}
 */
const MANUFACTURER_DETAIL_THEMES = {
  marshall: {
    surface: "#121110",
    gradientStart: "#3a3226",
    gradientEnd: "#121110",
    glow: "#261f16",
    border: "rgba(220, 200, 170, 0.045)"
  },
  "mesa-boogie": {
    surface: "#0d0b0b",
    gradientStart: "#3a241c",
    gradientEnd: "#0d0b0b",
    glow: "#1f1410",
    border: "rgba(200, 150, 130, 0.04)"
  },
  bogner: {
    surface: "#101214",
    gradientStart: "#2c343c",
    gradientEnd: "#101214",
    glow: "#1a1e22",
    border: "rgba(190, 205, 220, 0.04)"
  },
  fender: {
    surface: "#0e1116",
    gradientStart: "#243044",
    gradientEnd: "#0e1116",
    glow: "#161c26",
    border: "rgba(180, 200, 220, 0.045)"
  },
  vox: {
    surface: "#14110e",
    gradientStart: "#3a2c1c",
    gradientEnd: "#14110e",
    glow: "#241a12",
    border: "rgba(210, 180, 130, 0.045)"
  },
  orange: {
    surface: "#0e0c0a",
    gradientStart: "#3a2414",
    gradientEnd: "#0e0c0a",
    glow: "#20160e",
    border: "rgba(210, 140, 80, 0.04)"
  },
  engl: {
    surface: "#110e0e",
    gradientStart: "#3a1c1c",
    gradientEnd: "#110e0e",
    glow: "#1f1212",
    border: "rgba(200, 140, 140, 0.04)"
  },
  diezel: {
    surface: "#0e0e10",
    gradientStart: "#262830",
    gradientEnd: "#0e0e10",
    glow: "#16181c",
    border: "rgba(180, 185, 200, 0.04)"
  },
  friedman: {
    surface: "#12100e",
    gradientStart: "#34281c",
    gradientEnd: "#12100e",
    glow: "#1f1812",
    border: "rgba(200, 175, 130, 0.04)"
  },
  soldano: {
    surface: "#0f0f11",
    gradientStart: "#2a2a32",
    gradientEnd: "#0f0f11",
    glow: "#18181c",
    border: "rgba(190, 190, 205, 0.04)"
  },
  peavey: {
    surface: "#111111",
    gradientStart: "#2c2c2c",
    gradientEnd: "#111111",
    glow: "#1a1a1a",
    border: "rgba(200, 200, 200, 0.035)"
  },
  hiwatt: {
    surface: "#101214",
    gradientStart: "#2c343a",
    gradientEnd: "#101214",
    glow: "#181c20",
    border: "rgba(190, 205, 215, 0.04)"
  },
  roland: {
    surface: "#0f1114",
    gradientStart: "#243040",
    gradientEnd: "#0f1114",
    glow: "#161c24",
    border: "rgba(170, 190, 215, 0.04)"
  },
  evh: {
    surface: "#120e0c",
    gradientStart: "#3a2218",
    gradientEnd: "#120e0c",
    glow: "#20150f",
    border: "rgba(210, 140, 110, 0.04)"
  },
  "tone-king": {
    surface: "#13110e",
    gradientStart: "#3a2e1c",
    gradientEnd: "#13110e",
    glow: "#221a12",
    border: "rgba(210, 185, 140, 0.04)"
  },
  "3rd-power": {
    surface: "#101113",
    gradientStart: "#2a3038",
    gradientEnd: "#101113",
    glow: "#181c22",
    border: "rgba(180, 190, 205, 0.04)"
  },
  egnater: {
    surface: "#11100e",
    gradientStart: "#32281c",
    gradientEnd: "#11100e",
    glow: "#1c1812",
    border: "rgba(190, 165, 130, 0.035)"
  },
  krank: {
    surface: "#100e0e",
    gradientStart: "#3a1e1a",
    gradientEnd: "#100e0e",
    glow: "#1e1210",
    border: "rgba(200, 130, 120, 0.04)"
  },
  redplate: {
    surface: "#120e0e",
    gradientStart: "#3a201c",
    gradientEnd: "#120e0e",
    glow: "#1f1311",
    border: "rgba(200, 140, 130, 0.04)"
  },
  randall: {
    surface: "#0f0f11",
    gradientStart: "#282c32",
    gradientEnd: "#0f0f11",
    glow: "#16181c",
    border: "rgba(180, 185, 195, 0.035)"
  },
  driftwood: {
    surface: "#12100e",
    gradientStart: "#34281c",
    gradientEnd: "#12100e",
    glow: "#1f1812",
    border: "rgba(195, 165, 120, 0.04)"
  }
};

/**
 * @param {string | null | undefined} manufacturerId
 * @returns {AmpTheme}
 */
export function getManufacturerCardTheme(manufacturerId) {
  const partial = manufacturerId ? MANUFACTURER_CARD_THEMES[manufacturerId] : null;
  return resolveAmpTheme(partial, DEFAULT_AMP_THEME);
}

/**
 * @param {string | null | undefined} manufacturerId
 * @returns {AmpTheme}
 */
export function getManufacturerDetailTheme(manufacturerId) {
  const partial = manufacturerId ? MANUFACTURER_DETAIL_THEMES[manufacturerId] : null;
  return resolveAmpTheme(partial, DEFAULT_AMP_DETAIL_THEME);
}

/**
 * Resolves the effective theme for an amp: amp override → manufacturer → default.
 * @param {{ theme?: AmpThemeInput | null, manufacturerId?: string | null } | null | undefined} amp
 * @param {{ detail?: boolean }} [options]
 * @returns {AmpTheme}
 */
export function resolveThemeForAmp(amp, options = {}) {
  const manufacturerDefaults = options.detail
    ? getManufacturerDetailTheme(amp?.manufacturerId)
    : getManufacturerCardTheme(amp?.manufacturerId);

  return resolveAmpTheme(amp?.theme, manufacturerDefaults);
}
