/** @typedef {import("../../library/ampLibrary.js").AmpRecord} AmpRecord */

/** @type {AmpRecord[]} */
export const peaveyAmps = [
{
  id: "peavey-5150",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "5150",
  aliases: [
    "peavey 5150",
    "pea v 5150",
    "pea v 150",
    "fifty-one fifty",
    "five one five zero",
    "five fifteen zero",
    "five fifteen oh"
  ],
  image: "peavey5150.png",
  description:
    "The Peavey 5150 is one of the most influential high-gain amplifiers ever produced, delivering aggressive saturation, exceptional note definition and the unmistakable sound that helped define modern metal.",
  history:
    "Developed in collaboration with Eddie Van Halen and released in 1992, the original 5150 established a new benchmark for high-gain guitar amplifiers. Following the end of the EVH partnership, the design continued as the Peavey 6505.",
  introduced: 1992,
  discontinued: 2004,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [
    "Eddie Van Halen",
    "Machine Head",
    "Trivium"
  ],
  tags: [
    "Signature",
    "High Gain",
    "Legendary",
    "American"
  ]
},
{
  id: "peavey-6505",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "6505",
  aliases: [
    "6505",
    "6505 standard"
  ],
  image: "6505.png",
  description:
    "The 6505 is the direct continuation of the original Peavey 5150, delivering the same aggressive high-gain character, tight low end and cutting midrange that made the amplifier a staple of modern metal.",
  history:
    "Released in 2004 to celebrate Peavey's 40th anniversary, the 6505 replaced the original 5150 after the Eddie Van Halen endorsement ended. Internally it remained essentially the same amplifier as the original 5150.",
  introduced: 2004,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Metalcore"
  ],
  notableUsers: [
    "Machine Head",
    "Trivium",
    "As I Lay Dying"
  ],
  tags: [
    "6505 Series",
    "High Gain",
    "American",
    "Legendary"
  ]
},
{
  id: "peavey-6505-plus",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "6505+",
  aliases: [
    "6505+",
    "6505 plus"
  ],
  image: "peavey6505plus.png",
  description:
    "The 6505+ builds upon the original 6505 platform by adding an extra preamp tube and independent EQ controls for each channel, providing greater flexibility while retaining Peavey's legendary high-gain sound.",
  history:
    "Introduced in 2004 as the successor to the 5150 II, the 6505+ continued the evolution of Eddie Van Halen's second signature amplifier after the endorsement agreement ended.",
  introduced: 2004,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 2,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Progressive Metal"
  ],
  notableUsers: [
    "Bullet For My Valentine",
    "All That Remains",
    "Whitechapel"
  ],
  tags: [
    "6505 Series",
    "High Gain",
    "American",
    "Flagship"
  ]
},
{
  id: "peavey-5150-ii",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "5150 II",
  aliases: [
    "5150 ii",
    "5150 2",
    "5150ii"
  ],
  image: "5150-ii.png",
  description:
    "The 5150 II refined the original 5150 design with an additional preamp tube and independent EQ controls for each channel, delivering greater flexibility while preserving its legendary high-gain character.",
  history:
    "Released in 1999, the 5150 II represented the evolution of Eddie Van Halen's original signature amplifier. Following the end of the EVH partnership, it was renamed the 6505+.",
  introduced: 1999,
  discontinued: 2004,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 2,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [
    "Eddie Van Halen"
  ],
  tags: [
    "Signature",
    "High Gain",
    "5150 Series",
    "American"
  ]
},

{
  id: "peavey-jsx",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "JSX",
  aliases: [
    "jsx",
    "joe satriani",
    "jsx head"
  ],
  image: "jsx.png",
  description:
    "The JSX was developed with Joe Satriani to provide pristine cleans, articulate crunch and fluid lead tones in a highly versatile three-channel design.",
  history:
    "Introduced in 2004, the JSX became one of Peavey's most respected signature amplifiers and was later reissued as the XXX II.",
  introduced: 2004,
  discontinued: 2010,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 3,
  tubes: {
    preamp: ["4 × 12AX7"],
    power: ["4 × EL34"]
  },
  genres: [
    "Rock",
    "Fusion",
    "Hard Rock",
    "Metal"
  ],
  notableUsers: [
    "Joe Satriani"
  ],
  tags: [
    "Signature",
    "Three Channel",
    "American"
  ]
},
{
  id: "peavey-xxx",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "XXX",
  aliases: [
    "xxx",
    "triple x",
    "peavey xxx"
  ],
  image: "xxx.png",
  description:
    "The XXX delivers aggressive modern gain while offering excellent clean and crunch channels, making it one of Peavey's most versatile high-gain amplifiers.",
  history:
    "Released in 2002, the XXX became a flagship Peavey amplifier for modern rock and metal and later evolved into the JSX platform.",
  introduced: 2002,
  discontinued: 2011,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 3,
  tubes: {
    preamp: ["4 × 12AX7"],
    power: ["4 × EL34"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "High Gain",
    "Three Channel",
    "American"
  ]
},
{
  id: "peavey-ultra-plus",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "Ultra Plus",
  aliases: [
    "ultra plus",
    "ultra+",
    "ultra"
  ],
  image: "ultra-plus.png",
  description:
    "The Ultra Plus was Peavey's flagship high-gain amplifier before the arrival of the 5150, offering tight distortion, powerful cleans and excellent versatility.",
  history:
    "Introduced in the early 1990s, the Ultra Plus became a favorite among hard rock and metal players and laid much of the groundwork for Peavey's later high-gain amplifiers.",
  introduced: 1991,
  discontinued: 1995,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 3,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Vintage",
    "High Gain",
    "American"
  ]
},
{
  id: "peavey-ultra-120",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "Ultra 120",
  aliases: [
    "ultra 120",
    "ultra"
  ],
  image: "ultra120.png",
  description:
    "The Ultra 120 introduced Peavey's early high-gain platform, delivering aggressive distortion, excellent clean headroom and exceptional reliability.",
  history:
    "Released in the late 1980s, the Ultra 120 became the predecessor to the Ultra Plus and established Peavey's reputation for affordable professional high-gain amplifiers.",
  introduced: 1988,
  discontinued: 1991,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 3,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Vintage",
    "High Gain",
    "American"
  ]
},
{
  id: "peavey-vtm-60",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "VTM 60",
  aliases: [
    "vtm 60",
    "vtm60"
  ],
  image: "vtm60.png",
  description:
    "The VTM 60 is a hot-rodded British-inspired amplifier featuring switchable gain modifications and powerful classic rock tones.",
  history:
    "Introduced in the late 1980s, the VTM Series was Peavey's answer to the modified Marshall amplifiers popular among hard rock guitarists of the era.",
  introduced: 1987,
  discontinued: 1990,
  country: "United States",
  ampType: "Tube Head",
  power: "60 W",
  channels: 1,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Classic Rock",
    "Hard Rock",
    "Blues"
  ],
  notableUsers: [],
  tags: [
    "Vintage",
    "British Voicing",
    "American"
  ]
},
{
  id: "peavey-vtm-120",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "VTM 120",
  aliases: [
    "vtm 120",
    "vtm120"
  ],
  image: "vtm120.png",
  description:
    "The VTM 120 expands the VTM platform with increased headroom while preserving its hot-rodded British character and dynamic response.",
  history:
    "Released alongside the VTM 60, the VTM 120 became one of Peavey's most respected vintage amplifiers and remains highly sought after today.",
  introduced: 1987,
  discontinued: 1990,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 1,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Classic Rock",
    "Hard Rock",
    "Metal"
  ],
  notableUsers: [],
  tags: [
    "Vintage",
    "British Voicing",
    "American"
  ]
},
{
  id: "peavey-classic-30",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "Classic 30",
  aliases: [
    "classic 30",
    "classic thirty"
  ],
  image: "classic30.png",
  description:
    "The Classic 30 delivers warm American-style cleans, smooth overdrive and excellent pedal compatibility, making it one of Peavey's most successful combo amplifiers.",
  history:
    "Introduced in the 1990s, the Classic 30 became a favorite among blues, country and rock players thanks to its reliability, portability and expressive tube tone.",
  introduced: 1995,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "30 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["4 × EL84"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country",
    "Classic Rock"
  ],
  notableUsers: [
    "Johnny Hiland"
  ],
  tags: [
    "Classic Series",
    "Combo",
    "American",
    "Pedal Platform"
  ]
},
{
  id: "peavey-classic-50",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "Classic 50",
  aliases: [
    "classic 50",
    "classic fifty"
  ],
  image: "classic50.png",
  description:
    "The Classic 50 builds upon the Classic 30 with greater clean headroom and stage volume while retaining its warm vintage-inspired character.",
  history:
    "Released alongside the Classic 30, the Classic 50 became one of Peavey's flagship clean and blues-oriented amplifiers.",
  introduced: 1994,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "50 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["4 × EL84"]
  },
  genres: [
    "Blues",
    "Country",
    "Classic Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Classic Series",
    "American",
    "Pedal Platform"
  ]
},
{
  id: "peavey-delta-blues",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "Delta Blues",
  aliases: [
    "delta blues",
    "delta"
  ],
  image: "deltablues210.png",
  description:
    "The Delta Blues combines the warm character of the Classic Series with onboard tremolo, delivering expressive vintage-inspired American tones for blues, country and rock players.",
  history:
    "Introduced in the mid-1990s, the Delta Blues became one of Peavey's most respected combo amplifiers thanks to its rich cleans, smooth breakup and built-in tremolo.",
  introduced: 1995,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "30 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["4 × EL84"]
  },
  genres: [
    "Blues",
    "Country",
    "Classic Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Classic Series",
    "Combo",
    "American",
    "Tremolo"
  ]
},
{
  id: "peavey-windsor",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "Windsor",
  aliases: [
    "windsor",
    "windsor head"
  ],
  image: "windsor.png",
  description:
    "The Windsor delivers classic British-inspired crunch with a straightforward single-channel layout, making it one of Peavey's most Marshall-style amplifiers.",
  history:
    "Released in 2007, the Windsor targeted players seeking vintage British tones at an affordable price while retaining Peavey's renowned reliability.",
  introduced: 2007,
  discontinued: 2013,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 1,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["4 × EL34"]
  },
  genres: [
    "Classic Rock",
    "Hard Rock",
    "Blues"
  ],
  notableUsers: [],
  tags: [
    "British Voicing",
    "Single Channel",
    "American"
  ]
},
{
  id: "peavey-invective-120",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "Invective.120",
  aliases: [
    "invective",
    "invective 120",
    "invective.120"
  ],
  image: "invective.png",
  description:
    "Developed with Misha Mansoor, the Invective.120 refines the legendary 6505 platform with expanded clean tones, integrated noise gate, boost and MIDI functionality for modern progressive metal players.",
  history:
    "Introduced in 2017, the Invective.120 became Peavey's flagship modern high-gain amplifier, combining the company's iconic gain structure with contemporary features.",
  introduced: 2017,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 2,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Progressive Metal",
    "Metal",
    "Hard Rock"
  ],
  notableUsers: [
    "Misha Mansoor"
  ],
  tags: [
    "Signature",
    "Modern",
    "High Gain",
    "American"
  ]
},
{
  id: "peavey-butcher",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "Butcher",
  aliases: [
    "butcher",
    "butcher head"
  ],
  image: "butcher.png",
  description:
    "The Butcher is a classic British-inspired amplifier known for its straightforward design, punchy EL34 power section and dynamic rock tones.",
  history:
    "Introduced in the early 1980s, the Butcher was Peavey's first serious entry into the British-style amplifier market and laid the groundwork for later VTM models.",
  introduced: 1983,
  discontinued: 1988,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["4 × EL34"]
  },
  genres: [
    "Classic Rock",
    "Hard Rock",
    "Blues"
  ],
  notableUsers: [],
  tags: [
    "Vintage",
    "British Voicing",
    "American"
  ]
},
{
  id: "peavey-6534-plus",
  manufacturerId: "peavey",
  manufacturer: "Peavey",
  model: "6534+",
  aliases: [
    "6534+",
    "6534 plus",
    "6534",
    "534 plus",
    "534+"
  ],
  image: "6534plus.png",
  description:
    "The 6534+ combines the legendary 6505+ preamp with an EL34 power section, delivering a more British-flavored midrange while preserving Peavey's signature high-gain aggression.",
  history:
    "Introduced in 2007, the 6534+ expanded the 6505 family by offering players an EL34-powered alternative to the traditional 6L6 platform.",
  introduced: 2007,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "120 W",
  channels: 2,
  tubes: {
    preamp: ["6 × 12AX7"],
    power: ["4 × EL34"]
  },
  genres: [
    "Metal",
    "Hard Rock",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "6505 Series",
    "EL34",
    "High Gain",
    "American"
  ]
}
];
