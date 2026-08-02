/** @typedef {import("../../library/ampLibrary.js").AmpRecord} AmpRecord */

/** @type {AmpRecord[]} */
export const mesaAmps = [
{
  id: "mesa-boogie-dual-rectifier",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Dual Rectifier",
  aliases: [
    "dual rectifier",
    "recto",
    "rectifier",
    "rect"
  ],
  image: "dual_rectifier.png",
  description:
    "The Dual Rectifier is one of the defining high-gain amplifiers of the modern era, celebrated for its massive low end, aggressive saturation and unmistakable 'Rectifier' character.",
  history:
    "Introduced in the early 1990s, the Dual Rectifier helped shape the sound of modern rock and metal. Its switchable tube and silicon diode rectification inspired its name and established Mesa/Boogie as a dominant force in high-gain amplification.",
  introduced: 1992,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 3,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Alternative Metal",
    "Rock"
  ],
  notableUsers: [
    "James Hetfield",
    "Kirk Hammett",
    "John Petrucci"
  ],
  tags: [
    "Rectifier",
    "High Gain",
    "Flagship",
    "American"
  ]
},
{
  id: "mesa-boogie-mark-5-35",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Mark V:35",
  aliases: [
    "mark 5:35",
    "mark v 35",
    "mark five 35",
    "mesa mark 5:35"
  ],
  image: "mark_5_35.png",
  description:
    "The Mark V:35 brings the versatility of Mesa's legendary Mark Series into a compact format, offering multiple classic Mark voicings with modern flexibility.",
  history:
    "Released as a smaller member of the Mark V family, the Mark V:35 combines iconic Mark I, Mark II and Mark IV-inspired sounds with contemporary switching and recording features.",
  introduced: 2015,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "35 W",
  channels: 2,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × EL84"]
  },
  genres: [
    "Rock",
    "Metal",
    "Fusion",
    "Blues"
  ],
  notableUsers: [],
  tags: [
    "Mark Series",
    "Compact",
    "Versatile",
    "American"
  ]
},
{
  id: "mesa-boogie-mark-vii",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Mark VII",
  aliases: [
    "mark vii",
    "mark 7",
    "mesa vii",
    "mark v"
  ],
  image: "mark_vii.png",
  description:
    "The Mark VII represents the latest evolution of Mesa/Boogie's legendary Mark Series, combining classic Mark circuits with modern switching and extensive tonal flexibility.",
  history:
    "Introduced in 2023, the Mark VII continues the lineage that began with the original Mark I, bringing together several generations of Mesa lead and clean sounds in a single amplifier.",
  introduced: 2023,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "90 W",
  channels: 3,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Metal",
    "Fusion",
    "Progressive Rock"
  ],
  notableUsers: [],
  tags: [
    "Mark Series",
    "Flagship",
    "Modern",
    "American"
  ]
},
{
  id: "mesa-boogie-mark-iic-plus",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Mark IIC+",
  aliases: [
    "mark iic+",
    "mark iic plus",
    "iic+",
    "mark 2c+"
  ],
  image: null,
  description:
    "The Mark IIC+ is widely regarded as one of the greatest high-gain amplifiers ever built, combining exceptional clarity, singing sustain and a highly responsive lead channel.",
  history:
    "Produced in the mid-1980s, the Mark IIC+ became one of Mesa/Boogie's most legendary amplifiers. Its rarity, influence and association with countless landmark recordings have made it one of the most sought-after tube amplifiers ever produced.",
  introduced: 1984,
  discontinued: 1985,
  country: "United States",
  ampType: "Tube Head",
  power: "60/100 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Rock",
    "Fusion",
    "Progressive Metal"
  ],
  notableUsers: [
    "James Hetfield",
    "Kirk Hammett",
    "John Petrucci"
  ],
  tags: [
    "Mark Series",
    "Legendary",
    "Vintage",
    "American"
  ]
},
{
  id: "mesa-boogie-lone-star",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Lone Star",
  aliases: [
    "lone star",
    "lonestar"
  ],
  image: null,
  description:
    "The Lone Star is known for its warm cleans, smooth overdrive and exceptional dynamic response, making it one of Mesa/Boogie's most respected non-high-gain amplifiers.",
  history:
    "Introduced in the early 2000s, the Lone Star broadened Mesa/Boogie's lineup by focusing on vintage-inspired American tones while retaining the company's renowned versatility and build quality.",
  introduced: 2004,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 2,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country",
    "Jazz"
  ],
  notableUsers: [],
  tags: [
    "American Voicing",
    "Clean",
    "Boutique",
    "Flagship"
  ]
},
{
  id: "mesa-boogie-mark-i",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Mark I",
  aliases: [
    "mark i",
    "mark 1",
    "mesa mark i",
    "boogie"
  ],
  image: null,
  description:
    "The Mark I is the amplifier that launched Mesa/Boogie, combining cascading gain stages with exceptional sustain and expressive lead tones that changed the future of guitar amplification.",
  history:
    "Introduced in 1971 by Randall Smith, the Mark I is widely regarded as the world's first production high-gain amplifier. Its innovative design laid the foundation for every Mesa Mark amplifier that followed.",
  introduced: 1971,
  discontinued: 1978,
  country: "United States",
  ampType: "Tube Head",
  power: "60/100 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Fusion",
    "Blues"
  ],
  notableUsers: [
    "Carlos Santana",
    "Keith Richards"
  ],
  tags: [
    "Mark Series",
    "Historic",
    "Boutique",
    "American"
  ]
},
{
  id: "mesa-boogie-mark-iv",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Mark IV",
  aliases: [
    "mark iv",
    "mark 4"
  ],
  image: null,
  description:
    "The Mark IV combines pristine cleans, articulate crunch and singing lead tones in one of Mesa/Boogie's most versatile amplifier platforms.",
  history:
    "Released in 1990, the Mark IV refined the Mark Series with three independent channels and extensive switching options, becoming a favorite among progressive rock and metal players.",
  introduced: 1990,
  discontinued: 2008,
  country: "United States",
  ampType: "Tube Head",
  power: "85 W",
  channels: 3,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Rock",
    "Fusion",
    "Progressive Rock"
  ],
  notableUsers: [
    "John Petrucci",
    "James Hetfield"
  ],
  tags: [
    "Mark Series",
    "Three Channel",
    "American"
  ]
},
{
  id: "mesa-boogie-mark-v",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Mark V",
  aliases: [
    "mark v",
    "mark 5",
    "mark five"
  ],
  image: null,
  description:
    "The Mark V brings together decades of Mesa history by recreating multiple classic Mark circuits within a single highly versatile amplifier.",
  history:
    "Introduced in 2009, the Mark V celebrated Mesa/Boogie's history by combining the voices of the Mark I, Mark IIC+ and Mark IV into one flagship amplifier.",
  introduced: 2009,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "90 W",
  channels: 3,
  tubes: {
    preamp: ["7 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Metal",
    "Fusion",
    "Progressive Metal"
  ],
  notableUsers: [
    "John Petrucci"
  ],
  tags: [
    "Mark Series",
    "Flagship",
    "American"
  ]
},
{
  id: "mesa-boogie-single-rectifier",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Single Rectifier",
  aliases: [
    "single rectifier",
    "single recto",
    "solo 50"
  ],
  image: null,
  description:
    "The Single Rectifier delivers the unmistakable Rectifier sound with earlier power-stage saturation and a slightly more open, responsive feel than the Dual Rectifier.",
  history:
    "Released in the mid-1990s, the Single Rectifier expanded the Rectifier family by offering the same aggressive character in a lower-powered format.",
  introduced: 1995,
  discontinued: 2010,
  country: "United States",
  ampType: "Tube Head",
  power: "50 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Rectifier",
    "High Gain",
    "American"
  ]
},
{
  id: "mesa-boogie-triple-rectifier",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Triple Rectifier",
  aliases: [
    "triple rectifier",
    "triple recto",
    "triple rec"
  ],
  image: null,
  description:
    "The Triple Rectifier offers enormous clean headroom, crushing low end and exceptional stage volume while retaining the signature Rectifier character.",
  history:
    "Introduced shortly after the Dual Rectifier, the Triple Rectifier became Mesa/Boogie's most powerful production amplifier and a staple among touring metal bands.",
  introduced: 1994,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "150 W",
  channels: 3,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["6 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Progressive Metal"
  ],
  notableUsers: [
    "Kirk Hammett"
  ],
  tags: [
    "Rectifier",
    "Flagship",
    "High Gain",
    "American"
  ]
},
{
  id: "mesa-boogie-badlander-100",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Badlander 100",
  aliases: [
    "badlander",
    "badlander 100"
  ],
  image: null,
  description:
    "The Badlander 100 reimagines the Rectifier platform with a tighter low end, more focused midrange and a more immediate response aimed at modern rock and metal players.",
  history:
    "Introduced in 2020, the Badlander represented Mesa/Boogie's next evolution of the Rectifier concept, replacing switchable rectification with a more streamlined modern design.",
  introduced: 2020,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × EL34"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Modern",
    "Rectifier",
    "British Voicing",
    "American"
  ]
},
{
  id: "mesa-boogie-caliber-50-plus",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Caliber .50+",
  aliases: [
    "caliber 50+",
    "50 plus",
    "caliber .50+"
  ],
  image: null,
  description:
    "The Caliber .50+ offers Mesa's signature lead tones in a simpler, more compact package while maintaining excellent clean sounds and dynamic response.",
  history:
    "Released during the 1980s, the Caliber Series made Mesa's cascading gain architecture available in a more affordable and straightforward amplifier.",
  introduced: 1986,
  discontinued: 1991,
  country: "United States",
  ampType: "Tube Head",
  power: "50 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Blues",
    "Fusion",
    "Metal"
  ],
  notableUsers: [],
  tags: [
    "Caliber",
    "Vintage",
    "American"
  ]
},
{
  id: "mesa-boogie-stiletto-deuce",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Stiletto Deuce",
  aliases: [
    "stiletto",
    "stiletto deuce"
  ],
  image: null,
  description:
    "The Stiletto Deuce delivers Mesa's interpretation of classic British amplifier tones, combining articulate crunch with powerful modern features.",
  history:
    "Introduced in the early 2000s, the Stiletto Series represented Mesa/Boogie's dedicated approach to EL34-powered British-style amplifiers.",
  introduced: 2004,
  discontinued: 2016,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × EL34"]
  },
  genres: [
    "Classic Rock",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "British Voicing",
    "EL34",
    "American"
  ]
},
{
  id: "mesa-boogie-road-king-ii",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Road King II",
  aliases: [
    "road king",
    "road king ii",
    "roadking"
  ],
  image: null,
  description:
    "The Road King II combines multiple Rectifier and vintage Mesa voices with extensive routing options, making it one of the most versatile tube amplifiers ever produced.",
  history:
    "Building upon the original Road King, the Mark II version became Mesa's flagship all-in-one amplifier, featuring switchable power tubes, rectifiers and speaker outputs.",
  introduced: 2006,
  discontinued: 2016,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 4,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × 6L6GC", "2 × EL34"]
  },
  genres: [
    "Rock",
    "Metal",
    "Blues",
    "Fusion"
  ],
  notableUsers: [],
  tags: [
    "Flagship",
    "Four Channel",
    "Rectifier",
    "American"
  ]
},
{
  id: "mesa-boogie-roadster",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Roadster",
  aliases: [
    "roadster",
    "recto roadster"
  ],
  image: null,
  description:
    "The Roadster combines the signature Rectifier sound with expanded clean tones and flexible channel voicings, making it one of Mesa's most versatile modern amplifiers.",
  history:
    "Released as a more streamlined alternative to the Road King, the Roadster offered much of the same flexibility while retaining the unmistakable Rectifier character.",
  introduced: 2004,
  discontinued: 2021,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 4,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Metal",
    "Hard Rock"
  ],
  notableUsers: [],
  tags: [
    "Rectifier",
    "Four Channel",
    "Versatile",
    "American"
  ]
},
{
  id: "mesa-boogie-mini-rectifier-25",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Mini Rectifier 25",
  aliases: [
    "mini rectifier",
    "mini recto",
    "rectifier 25"
  ],
  image: null,
  description:
    "The Mini Rectifier 25 delivers the unmistakable Rectifier character in a compact, recording-friendly format while retaining the aggressive attack and saturated gain that define the series.",
  history:
    "Introduced in 2012, the Mini Rectifier brought Mesa's flagship Rectifier sound to smaller stages and home studios without sacrificing its signature voice.",
  introduced: 2012,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "25 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × EL84"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Rectifier",
    "Compact",
    "High Gain",
    "American"
  ]
},
{
  id: "mesa-boogie-recto-verb-25",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Recto-Verb 25",
  aliases: [
    "recto-verb",
    "rectoverb",
    "rectoverb 25",
    "recto verb"
  ],
  image: "rectoverb25.png",
  description:
    "The Recto-Verb 25 combines the classic Rectifier sound with built-in spring reverb, offering a versatile platform for everything from clean tones to modern high gain.",
  history:
    "Introduced as a compact member of the Rectifier family, the Recto-Verb 25 expanded the series with onboard reverb and enhanced versatility.",
  introduced: 2013,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "25 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × EL84"]
  },
  genres: [
    "Rock",
    "Hard Rock",
    "Metal"
  ],
  notableUsers: [],
  tags: [
    "Rectifier",
    "Spring Reverb",
    "Compact",
    "American"
  ]
},
{
  id: "mesa-boogie-fillmore-25",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Fillmore 25",
  aliases: [
    "fillmore 25",
    "fillmore"
  ],
  image: "fillmore25.png",
  description:
    "The Fillmore 25 focuses on vintage American clean and overdrive tones with exceptional touch sensitivity and dynamic response.",
  history:
    "Released in 2018, the Fillmore Series marked Mesa/Boogie's return to simpler, vintage-inspired amplifier designs rooted in classic American tube tone.",
  introduced: 2018,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "25 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × 6V6GT"]
  },
  genres: [
    "Blues",
    "Classic Rock",
    "Country",
    "Jazz"
  ],
  notableUsers: [],
  tags: [
    "Vintage",
    "American Voicing",
    "Boutique"
  ]
},
{
  id: "mesa-boogie-fillmore-50",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Fillmore 50",
  aliases: [
    "fillmore 50"
  ],
  image: "fillmore50.png",
  description:
    "The Fillmore 50 expands the Fillmore platform with greater clean headroom while preserving its warm vintage-inspired American character and smooth overdrive.",
  history:
    "Introduced alongside the Fillmore 25, the Fillmore 50 quickly became a favorite among players seeking traditional Mesa craftsmanship with classic tube tones.",
  introduced: 2018,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "50 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country",
    "Jazz"
  ],
  notableUsers: [],
  tags: [
    "Vintage",
    "American Voicing",
    "Boutique"
  ]
},
{
  id: "mesa-boogie-transatlantic-ta-30",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "TransAtlantic TA-30",
  aliases: [
    "transatlantic",
    "ta-30",
    "ta30"
  ],
  image: "ta30.png",
  description:
    "The TransAtlantic TA-30 blends classic American and British amplifier voices into a highly versatile compact head, offering everything from sparkling cleans to vintage overdrive.",
  history:
    "Released in 2010, the TransAtlantic Series showcased Mesa/Boogie's interpretation of iconic British and American amplifier circuits in a portable format.",
  introduced: 2010,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "40 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × EL84"]
  },
  genres: [
    "Classic Rock",
    "Rock",
    "Blues",
    "Indie"
  ],
  notableUsers: [],
  tags: [
    "British Voicing",
    "American Voicing",
    "Compact",
    "Versatile"
  ]
},
{
  id: "mesa-boogie-express-5-50-plus",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Express 5:50+",
  aliases: [
    "express 5:50+",
    "express 550",
    "5:50 plus"
  ],
  image: "express-5-50.png",
  description:
    "The Express 5:50+ combines classic Mesa clean tones with smooth overdrive and switchable power settings, making it one of the company's most versatile all-purpose amplifiers.",
  history:
    "Introduced as the evolution of the original Express series, the Express 5:50+ became a popular choice for players seeking Mesa versatility without the complexity of the Mark or Rectifier series.",
  introduced: 2010,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "5 / 25 / 50 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country",
    "Fusion"
  ],
  notableUsers: [],
  tags: [
    "Express",
    "Versatile",
    "American"
  ]
},
{
  id: "mesa-boogie-subway-rocket",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Subway Rocket",
  aliases: [
    "subway rocket",
    "rocket"
  ],
  image: "subway-rocket.png",
  description:
    "The Subway Rocket delivers Mesa's signature lead tones in a compact combo-sized platform with excellent recording and club performance capabilities.",
  history:
    "Introduced during the 1990s, the Subway Rocket became one of Mesa's most successful compact amplifiers and remains highly regarded on the used market.",
  introduced: 1993,
  discontinued: 2003,
  country: "United States",
  ampType: "Tube Combo",
  power: "20 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × EL84"]
  },
  genres: [
    "Rock",
    "Blues",
    "Fusion"
  ],
  notableUsers: [],
  tags: [
    "Compact",
    "Vintage",
    "American"
  ]
},
{
  id: "mesa-boogie-dc-5",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "DC-5",
  aliases: [
    "dc5",
    "dc-5",
    "dual caliber"
  ],
  image: "dc5.png",
  description:
    "The DC-5 combines Mesa's renowned clean tones with expressive lead sounds in a straightforward two-channel design that became a favorite among gigging musicians.",
  history:
    "Part of the Dual Caliber series introduced in the 1990s, the DC-5 bridged the gap between the Caliber and Mark families while offering outstanding versatility.",
  introduced: 1994,
  discontinued: 2000,
  country: "United States",
  ampType: "Tube Head",
  power: "50 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Blues",
    "Fusion",
    "Metal"
  ],
  notableUsers: [],
  tags: [
    "Dual Caliber",
    "Vintage",
    "American"
  ]
},
{
  id: "mesa-boogie-nomad-55",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Nomad 55",
  aliases: [
    "nomad",
    "nomad 55"
  ],
  image: "nomad55.png",
  description:
    "The Nomad 55 was designed as a flexible multi-channel amplifier capable of covering clean, crunch and lead tones within a single platform.",
  history:
    "Released around the turn of the millennium, the Nomad series expanded Mesa's lineup with a more traditional channel-switching design aimed at working musicians.",
  introduced: 1999,
  discontinued: 2003,
  country: "United States",
  ampType: "Tube Head",
  power: "55 W",
  channels: 3,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Blues",
    "Hard Rock"
  ],
  notableUsers: [],
  tags: [
    "Three Channel",
    "American",
    "Versatile"
  ]
},
{
  id: "mesa-boogie-heartbreaker",
  manufacturerId: "mesa-boogie",
  manufacturer: "Mesa Boogie",
  model: "Heartbreaker",
  aliases: [
    "heartbreaker"
  ],
  image: "heartbreaker.png",
  description:
    "The Heartbreaker delivers vintage-inspired American and British tones with exceptional dynamic response, standing apart from Mesa's high-gain heritage.",
  history:
    "Introduced in the 1990s, the Heartbreaker became one of Mesa's most respected boutique-style amplifiers, prized for its expressive clean and edge-of-breakup sounds.",
  introduced: 1994,
  discontinued: 2000,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 2,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Blues",
    "Classic Rock",
    "Jazz",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Boutique",
    "Vintage",
    "American"
  ]
}
];
