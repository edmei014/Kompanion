import {
  getAliasIndexEntriesForAmp,
  getAllAmps,
  getAmpById,
  getGearRegistryReport,
  resolveAmpIdFromTextSources
} from "../src/library/index.js";
import { allAmpRecords } from "../src/data/amps/index.js";

console.log("raw allAmpRecords:", allAmpRecords.length);
console.log("normalized getAllAmps:", getAllAmps().length);

const report = getGearRegistryReport();
console.log("registry ok:", report.ok);
console.log("missingManufacturerIds:", report.missingManufacturerIds);
console.log("duplicateAmpIds:", report.duplicateAmpIds);

const aq2 = getAmpById("bell-and-howell-filmosound-aq-2");
console.log(
  "AQ2 record:",
  aq2 && {
    id: aq2.id,
    manufacturerId: aq2.manufacturerId,
    manufacturer: aq2.manufacturer,
    model: aq2.model,
    aliases: aq2.aliases,
    image: aq2.image
  }
);

const aliasIndex = getAliasIndexEntriesForAmp(
  "bell-and-howell-filmosound-aq-2"
);
console.log(
  "AQ2 alias index:",
  aliasIndex.map((entry) => entry.alias)
);

const tests = [
  "AQ2",
  "aq2",
  "AQ-2",
  "Filmosound AQ-2",
  "Bell & Howell AQ2",
  "Bell and Howell AQ2",
  "Bell & Howell Filmosound AQ-2",
  "Bell and Howell Filmosound AQ-2"
];

for (const text of tests) {
  console.log(`resolve ${JSON.stringify(text)} ->`, resolveAmpIdFromTextSources(text));
}
