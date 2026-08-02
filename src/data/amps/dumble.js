/** @typedef {import("../../library/ampLibrary.js").AmpRecord} AmpRecord */

/** @type {AmpRecord[]} */
export const dumbleAmps = [

{
  id: "dumble-overdrive-special",
  manufacturerId: "dumble",
  manufacturer: "Dumble",
  model: "Overdrive Special",
  aliases: [
    "ODS",
    "Overdrive Special",
    "dumb Overdrive Special",
    "Dumble ODS"
  ],
  image: "overdrive-special.png",
  description:
    "The Overdrive Special is Dumble's most famous amplifier, renowned for its harmonically rich clean channel and smooth cascading overdrive. Individually hand-built by Alexander Dumble, each unit was uniquely voiced for its owner.",
  history:
    "Introduced in the early 1970s, the Overdrive Special became the amplifier that defined the Dumble name. Built entirely by hand in extremely limited numbers, each amplifier was customized for the player, making no two examples exactly alike. It remains one of the most sought-after guitar amplifiers ever produced.",
  introduced: 1972,
  discontinued: 2000,
  country: "United States",
  ampType: "Tube Head",
  power: "50–100 W",
  channels: 2,
  tubes: {
    preamp: ["12AX7"],
    power: ["6L6GC"]
  },
  genres: ["Blues", "Fusion", "Rock"],
  notableUsers: ["Robben Ford", "Larry Carlton", "John Mayer"],
  tags: ["Boutique", "Legendary", "Handwired"]
},
{
  id: "dumble-steel-string-singer",
  manufacturerId: "dumble",
  manufacturer: "Dumble",
  model: "Steel String Singer",
  aliases: [
    "SSS",
    "Steel String Singer"
  ],
  image: null,
  description:
    "The Steel String Singer is an ultra-clean, high-headroom amplifier celebrated for its huge dynamic range, shimmering cleans and exceptional touch sensitivity.",
  history:
    "Developed during the 1970s, the Steel String Singer became one of Alexander Dumble's most legendary clean amplifiers. Produced only in very small numbers, it achieved cult status through players seeking unmatched clean tone and headroom.",
  introduced: 1973,
  discontinued: 1990,
  country: "United States",
  ampType: "Tube Head",
  power: "100–150 W",
  channels: 1,
  tubes: {
    preamp: ["12AX7"],
    power: ["6L6GC"]
  },
  genres: ["Blues", "Jazz", "Fusion"],
  notableUsers: ["Stevie Ray Vaughan", "John Mayer", "Eric Johnson"],
  tags: ["Clean", "Boutique", "Legendary"]
},
{
  id: "dumble-winterland",
  manufacturerId: "dumble",
  manufacturer: "Dumble",
  model: "Winterland",
  aliases: [
    "Winterland"
  ],
  image: null,
  description:
    "The Winterland is an extremely rare high-powered Dumble amplifier designed for exceptional clean headroom and massive stage volume.",
  history:
    "Built in very limited numbers during the late 1970s, the Winterland was created for large concert stages where enormous clean power was required. It remains one of the rarest Dumble models ever produced.",
  introduced: 1978,
  discontinued: 1982,
  country: "United States",
  ampType: "Tube Head",
  power: "150 W",
  channels: 1,
  tubes: {
    preamp: ["12AX7"],
    power: ["6550"]
  },
  genres: ["Blues", "Rock"],
  notableUsers: [],
  tags: ["Rare", "High Headroom", "Boutique"]
},
{
  id: "dumble-steel-string-singer-reverb",
  manufacturerId: "dumble",
  manufacturer: "Dumble",
  model: "Steel String Singer Reverb",
  aliases: [
    "SSS Reverb"
  ],
  image: null,
  description:
    "A reverb-equipped version of the Steel String Singer featuring the same immense clean headroom with Dumble's lush onboard spring reverb.",
  history:
    "Produced in very small quantities, the Steel String Singer Reverb expanded the celebrated SSS platform by adding an integrated spring reverb while retaining its legendary clean response.",
  introduced: 1975,
  discontinued: 1990,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 1,
  tubes: {
    preamp: ["12AX7"],
    power: ["6L6GC"]
  },
  genres: ["Blues", "Jazz"],
  notableUsers: [],
  tags: ["Reverb", "Boutique", "Clean"]
},
{
  id: "dumble-manzamp",
  manufacturerId: "dumble",
  manufacturer: "Dumble",
  model: "Manzamp",
  aliases: [
    "Manzamp"
  ],
  image: null,
  description:
    "The Manzamp is one of Dumble's rarest and most powerful creations, combining enormous clean headroom with smooth overdrive in a custom-built platform.",
  history:
    "Developed in the 1980s as a bespoke amplifier for select professional musicians, the Manzamp was never a standard production model. Like all Dumble amplifiers, each example was individually voiced and built to order.",
  introduced: 1983,
  discontinued: 1995,
  country: "United States",
  ampType: "Tube Head",
  power: "100–150 W",
  channels: 2,
  tubes: {
    preamp: ["12AX7"],
    power: ["6L6GC"]
  },
  genres: ["Fusion", "Rock", "Blues"],
  notableUsers: [],
  tags: ["Rare", "Boutique", "Custom Built"]
}
]