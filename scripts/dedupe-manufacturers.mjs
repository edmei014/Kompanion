import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { manufacturerRecords } from "../src/data/manufacturers/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../src/data/manufacturers/index.js");

const seen = new Set();
const unique = [];

for (const record of manufacturerRecords) {
  if (!record?.id || seen.has(record.id)) continue;
  seen.add(record.id);
  unique.push(record);
}

unique.sort((left, right) => left.name.localeCompare(right.name));

function serializeRecord(record) {
  return JSON.stringify(record, null, 2).replace(/"([^"]+)":/g, "$1:");
}

const body = unique.map((record) => serializeRecord(record)).join(",\n");
const out = `/** @typedef {import("./manufacturerSchema.js").ManufacturerRecord} ManufacturerRecord */

/** @type {ManufacturerRecord[]} */
export const manufacturerRecords = [
${body}
];
`;

fs.writeFileSync(outPath, out);
console.log(`wrote ${unique.length} manufacturers`);
console.log(unique.map((record) => record.id).join(", "));
