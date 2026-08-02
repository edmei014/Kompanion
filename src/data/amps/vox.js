/** @typedef {import("../../library/ampLibrary.js").AmpRecord} AmpRecord */

/** @type {AmpRecord[]} */
export const voxAmps = [
{
  id: "vox-vbm-1",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "VBM-1",
  aliases: [
    "vox vbm",
    "voice vbm",
    "vbm1",
    "vbm 1",
    "vbm-1"
  ],
  image: "vox vbm1.png",
  description:
    "The VBM-1 is the official Brian May practice amplifier, recreating the distinctive Vox AC30 tone that defined Queen's legendary guitar sound in a compact format.",
  history:
    "Developed in collaboration with Brian May and released in 2007, the VBM-1 captures the response of his famous AC30 setup while including a built-in treble booster and recording features.",
  introduced: 2007,
  discontinued: null,
  country: "United Kingdom",
  ampType: "Hybrid Combo",
  power: "10 W",
  channels: 1,
  tubes: {
    preamp: ["12AX7"],
    power: null
  },
  genres: [
    "Rock",
    "Classic Rock",
    "Pop"
  ],
  notableUsers: [
    "Brian May"
  ],
  tags: [
    "Signature",
    "Practice Amp",
    "British",
    "Queen"
  ]
},
{
  id: "vox-ac15-custom",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "AC15 Custom",
  aliases: [
    "ac15",
    "ac15 custom",
    "ac fifteen",
    "ac fifteen custom",
    "ace fifteen"
  ],
  image: "vox ac15 custom.png",
  description:
    "The AC15 Custom delivers the legendary Vox chime, sparkling cleans and smooth Class A-style overdrive in a compact combo that has become a modern industry standard.",
  history:
    "Originally introduced in 1958, the AC15 was Vox's first successful guitar amplifier. The modern Custom Series faithfully recreates the classic circuit while adding contemporary reliability and features.",
  introduced: 2010,
  discontinued: null,
  country: "United Kingdom",
  ampType: "Tube Combo",
  power: "15 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × EL84"]
  },
  genres: [
    "Classic Rock",
    "Blues",
    "Indie",
    "Pop"
  ],
  notableUsers: [
    "The Edge",
    "Noel Gallagher"
  ],
  tags: [
    "British",
    "Combo",
    "Top Boost",
    "Classic"
  ]
},
{
  id: "vox-ac30-1965",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "AC30/6 Top Boost (1965)",
  aliases: [
    "ac30",
    "ac30 1965",
    "ace thirty"
  ],
  image: "vox ac30 1965.png",
  description:
    "The 1965 AC30/6 Top Boost is one of the most iconic guitar amplifiers ever built, celebrated for its brilliant chime, rich harmonic complexity and unmistakable British character.",
  history:
    "The Top Boost version of the AC30 became the defining Vox amplifier of the British Invasion. Used extensively throughout the 1960s, it shaped the sound of countless legendary recordings and remains one of the most influential amplifiers in history.",
  introduced: 1964,
  discontinued: 1967,
  country: "United Kingdom",
  ampType: "Tube Combo",
  power: "30 W",
  channels: 3,
  tubes: {
    preamp: ["ECC83", "ECC82"],
    power: ["4 × EL84"]
  },
  genres: [
    "Rock",
    "Pop",
    "Classic Rock",
    "Indie"
  ],
  notableUsers: [
    "The Beatles",
    "Brian May",
    "The Edge",
    "Tom Petty",
    "Rory Gallagher"
  ],
  tags: [
    "Legendary",
    "British",
    "Top Boost",
    "Vintage"
  ]
},
{
  id: "vox-ac4",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "AC4",
  aliases: [
    "ac4",
    "ac 4"
  ],
  image: "ac4.png",
  description:
    "The AC4 delivers the unmistakable Vox chime and Class A-style overdrive in a compact low-wattage amplifier designed for recording, rehearsal and home use.",
  history:
    "Originally introduced in 1961, the AC4 became one of Vox's earliest compact amplifiers. Modern reissues faithfully recreate its vintage character while adding contemporary reliability.",
  introduced: 1961,
  discontinued: null,
  country: "United Kingdom",
  ampType: "Tube Combo",
  power: "4 W",
  channels: 1,
  tubes: {
    preamp: ["2 × 12AX7"],
    power: ["1 × EL84"]
  },
  genres: [
    "Blues",
    "Classic Rock",
    "Indie",
    "Pop"
  ],
  notableUsers: [],
  tags: [
    "British",
    "Low Watt",
    "Combo",
    "Classic"
  ]
},
{
  id: "vox-ac10",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "AC10",
  aliases: [
    "ac10",
    "ac 10"
  ],
  image: "ac10.png",
  description:
    "The AC10 combines classic Vox sparkle with warm EL84 overdrive in a portable combo, making it one of the company's most popular modern amplifiers.",
  history:
    "First introduced in 1960 and later reintroduced as part of Vox's modern lineup, the AC10 fills the gap between the AC4 and AC15 while preserving the signature Vox sound.",
  introduced: 1960,
  discontinued: null,
  country: "United Kingdom",
  ampType: "Tube Combo",
  power: "10 W",
  channels: 2,
  tubes: {
    preamp: ["2 × 12AX7"],
    power: ["2 × EL84"]
  },
  genres: [
    "Rock",
    "Pop",
    "Indie",
    "Blues"
  ],
  notableUsers: [],
  tags: [
    "British",
    "Combo",
    "Top Boost"
  ]
},
{
  id: "vox-ac50",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "AC50",
  aliases: [
    "ac50",
    "ac 50"
  ],
  image: "ac50.png",
  description:
    "The AC50 delivers greater clean headroom and stage volume than the AC30 while preserving Vox's signature chime and rich harmonic character.",
  history:
    "Introduced in 1964, the AC50 was developed to satisfy touring musicians who needed more power than the AC30 could provide during increasingly larger live performances.",
  introduced: 1964,
  discontinued: 1970,
  country: "United Kingdom",
  ampType: "Tube Head",
  power: "50 W",
  channels: 2,
  tubes: {
    preamp: ["ECC83", "ECC82"],
    power: ["2 × EL34"]
  },
  genres: [
    "Classic Rock",
    "Rock",
    "Pop"
  ],
  notableUsers: [
    "The Beatles"
  ],
  tags: [
    "Vintage",
    "British",
    "Classic"
  ]
},
{
  id: "vox-ac100",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "AC100",
  aliases: [
    "ac100",
    "ac 100",
    "ac hundred",
    "ac one hundred",
    "ace hundred"
  ],
  image: "ac100.jpg",
  description:
    "The AC100 was Vox's highest-powered amplifier of the British Invasion era, delivering enormous clean headroom and the unmistakable Vox voice for stadium-sized performances.",
  history:
    "Introduced in 1965, the AC100 was created specifically for major touring acts and became one of Vox's most historically significant amplifiers.",
  introduced: 1965,
  discontinued: 1968,
  country: "United Kingdom",
  ampType: "Tube Head",
  power: "100 W",
  channels: 2,
  tubes: {
    preamp: ["ECC83", "ECC82"],
    power: ["4 × EL34"]
  },
  genres: [
    "Rock",
    "Pop",
    "Classic Rock"
  ],
  notableUsers: [
    "The Beatles"
  ],
  tags: [
    "Vintage",
    "British",
    "Flagship"
  ]
},
{
  id: "vox-night-train-g2",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "Night Train G2",
  aliases: [
    "night train",
    "night train g2",
    "nt15"
  ],
  image: "night-train-g2.png",
  description:
    "The Night Train G2 modernizes the classic Vox sound with higher gain, flexible voicing options and a compact lunchbox format while retaining the company's signature British character.",
  history:
    "Released in 2013 as the second generation of the Night Train series, the G2 expanded the original design with additional gain stages and enhanced tonal flexibility.",
  introduced: 2013,
  discontinued: 2017,
  country: "United Kingdom",
  ampType: "Tube Head",
  power: "15 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × EL84"]
  },
  genres: [
    "Rock",
    "Hard Rock",
    "Blues",
    "Indie"
  ],
  notableUsers: [],
  tags: [
    "British",
    "Lunchbox",
    "Modern",
    "High Gain"
  ]
},
{
  id: "vox-pathfinder-15r",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "Pathfinder 15R",
  aliases: [
    "pathfinder",
    "pathfinder 15r",
    "pf15r"
  ],
  image: "pathfinder15r.png",
  description:
    "The Pathfinder 15R is a beloved solid-state practice amplifier known for delivering surprisingly authentic Vox chime, spring reverb and tremolo in an affordable package.",
  history:
    "Introduced in the late 1990s, the Pathfinder 15R became one of the most respected practice amplifiers ever produced and remains highly sought after despite being discontinued.",
  introduced: 1999,
  discontinued: 2015,
  country: "United Kingdom",
  ampType: "Solid State Combo",
  power: "15 W",
  channels: 2,
  tubes: null,
  genres: [
    "Rock",
    "Blues",
    "Indie",
    "Pop"
  ],
  notableUsers: [],
  tags: [
    "Solid State",
    "Practice",
    "Spring Reverb",
    "British"
  ]
},
{
  id: "vox-cambridge-30-reverb",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "Cambridge 30 Reverb",
  aliases: [
    "cambridge 30",
    "cambridge",
    "cambridge 30 reverb"
  ],
  image: "cambridge-30-reverb.png",
  description:
    "The Cambridge 30 Reverb combines Vox's classic clean tones with hybrid tube technology, onboard reverb and excellent versatility for studio and stage use.",
  history:
    "Released during the late 1990s, the Cambridge Series bridged traditional Vox designs and modern amplifier technology, becoming a favorite among players seeking authentic Vox tone in a lightweight combo.",
  introduced: 1998,
  discontinued: 2005,
  country: "United Kingdom",
  ampType: "Hybrid Combo",
  power: "30 W",
  channels: 2,
  tubes: {
    preamp: ["1 × 12AX7"],
    power: null
  },
  genres: [
    "Rock",
    "Blues",
    "Pop",
    "Indie"
  ],
  notableUsers: [],
  tags: [
    "Hybrid",
    "British",
    "Spring Reverb"
  ]
},
{
  id: "vox-ad60vt",
  manufacturerId: "vox",
  manufacturer: "Vox",
  model: "Valvetronix AD60VT",
  aliases: [
    "ad60vt",
    "valvetronix",
    "ad 60vt"
  ],
  image: "valvetronix-ad60vt.png",
  description:
    "The AD60VT was one of the first highly successful modeling amplifiers to convincingly combine digital amp modeling with real tube dynamics through Vox's Valve Reactor technology.",
  history:
    "Introduced in the early 2000s, the Valvetronix Series became one of the industry's most influential modeling amplifier platforms and helped establish hybrid digital amplification as a professional solution.",
  introduced: 2002,
  discontinued: 2008,
  country: "United Kingdom",
  ampType: "Modeling Combo",
  power: "60 W",
  channels: 11,
  tubes: {
    preamp: null,
    power: ["1 × 12AX7 (Valve Reactor)"]
  },
  genres: [
    "Rock",
    "Blues",
    "Metal",
    "Pop",
    "Jazz"
  ],
  notableUsers: [],
  tags: [
    "Modeling",
    "Valve Reactor",
    "Hybrid",
    "British"
  ]
}
];
