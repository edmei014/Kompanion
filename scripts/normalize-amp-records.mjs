import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createAmpRecord, serializeAmpRecord } from "../src/data/ampSchema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ampsDir = path.join(root, "src/data/amps");

const { allAmpRecords } = await import(
  pathToFileURL(path.join(ampsDir, "index.js")).href
);

const FILE_NAMES = {
  Marshall: "marshall",
  Peavey: "peavey",
  Krank: "krank",
  Engl: "engl",
  Randall: "randall",
  EVH: "evh",
  "Mesa Boogie": "mesa",
  Soldano: "soldano",
  Diezel: "diezel",
  Bogner: "bogner",
  Vox: "vox",
  Roland: "roland",
  Fender: "fender",
  Friedman: "friedman",
  Hiwatt: "hiwatt",
  Egnater: "egnater",
  "3rd Power": "thirdPower",
  Orange: "orange",
  RedPlate: "redplate",
  "Tone King": "toneKing"
};

const groups = new Map();

for (const raw of allAmpRecords) {
  const record = createAmpRecord(raw);
  const fileKey =
    FILE_NAMES[record.manufacturer] ||
    record.manufacturer.toLowerCase().replace(/[^a-z0-9]+/g, "");

  if (!groups.has(fileKey)) {
    groups.set(fileKey, []);
  }

  groups.get(fileKey).push(record);
}

const imports = [];

for (const [fileKey, records] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const exportName = `${fileKey}Amps`;
  const serializedRecords = records
    .map((record) => serializeAmpRecord(record))
    .join(",\n");

  const content = `/** @typedef {import("../../library/ampLibrary.js").AmpRecord} AmpRecord */

/** @type {AmpRecord[]} */
export const ${exportName} = [
${serializedRecords}
];
`;

  fs.writeFileSync(path.join(ampsDir, `${fileKey}.js`), content, "utf8");
  imports.push({ fileKey, exportName });
}

const indexContent = `${imports
  .map(({ fileKey, exportName }) => `import { ${exportName} } from "./${fileKey}.js";`)
  .join("\n")}

/** @type {import("../../library/ampLibrary.js").AmpRecord[]} */
export const allAmpRecords = [
${imports.map(({ exportName }) => `  ...${exportName},`).join("\n")}
];
`;

fs.writeFileSync(path.join(ampsDir, "index.js"), indexContent, "utf8");
console.log(`Normalized ${allAmpRecords.length} amps across ${imports.length} manufacturer files.`);
