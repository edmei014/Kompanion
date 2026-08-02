/** @typedef {import("../../library/ampLibrary.js").AmpRecord} AmpRecord */

/** @type {AmpRecord[]} */
export const fenderAmps = [
{
  id: "fender-tweed-champ",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Tweed Champ",
  aliases: [
    "champ",
    "tweed champ",
    "5f1",
    "fender champ"
  ],
  image: "tweed-champ.png",
  description:
    "The Tweed Champ is one of the most iconic low-wattage guitar amplifiers ever built. Despite its simple single-ended design, it delivers rich harmonic overdrive and exceptional touch sensitivity that have made it a studio favorite for decades.",
  history:
    "Produced throughout the 1950s, the Tweed Champ became one of Leo Fender's most influential amplifier designs. The 5F1 circuit remains one of the most copied tube amplifier circuits in history.",
  introduced: 1958,
  discontinued: 1964,
  country: "United States",
  ampType: "Tube Combo",
  power: "5 W",
  channels: 1,
  tubes: {
    preamp: ["1 × 12AX7"],
    power: ["1 × 6V6GT"],
    rectifier: ["1 × 5Y3GT"]
  },
  genres: [
    "Blues",
    "Classic Rock",
    "Country",
    "Recording"
  ],
  notableUsers: [
    "Eric Clapton",
    "Joe Walsh"
  ],
  tags: [
    "Tweed",
    "Vintage",
    "Single-Ended",
    "Studio"
  ]
},
{
  id: "fender-tweed-princeton",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Tweed Princeton",
  aliases: [
    "princeton",
    "tweed princeton",
    "5f2",
    "5f2-a"
  ],
  image: "tweed-princeton.png",
  description:
    "The Tweed Princeton expands upon the Champ platform with additional tonal flexibility while preserving the warm, responsive character that defines Fender's early tweed amplifiers.",
  history:
    "Introduced during the 1950s, the Tweed Princeton became one of Fender's most respected small amplifiers and laid the foundation for later Princeton models.",
  introduced: 1956,
  discontinued: 1964,
  country: "United States",
  ampType: "Tube Combo",
  power: "12 W",
  channels: 1,
  tubes: {
    preamp: ["1 × 12AX7"],
    power: ["1 × 6V6GT"],
    rectifier: ["1 × 5Y3GT"]
  },
  genres: [
    "Blues",
    "Country",
    "Jazz",
    "Classic Rock"
  ],
  notableUsers: [],
  tags: [
    "Tweed",
    "Vintage",
    "Recording"
  ]
},
{
  id: "fender-tweed-deluxe",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Tweed Deluxe",
  aliases: [
    "tweed deluxe",
    "tweet deluxe",
    "fan deluxe",
    "fender deluxe",
    "tweet d'lux",
    "d'lux"
  ],
  image: "tweet_deluxe_1953.png",
  description:
    "The Tweed Deluxe is one of Fender's most celebrated vintage amplifiers, prized for its warm clean tones, rich midrange and smooth natural overdrive when pushed.",
  history:
    "The Deluxe evolved throughout the 1950s into one of Leo Fender's most influential amplifier designs. Later Tweed Deluxe circuits became legendary among collectors and inspired countless boutique amplifiers.",
  introduced: 1953,
  discontinued: 1960,
  country: "United States",
  ampType: "Tube Combo",
  power: "15 W",
  channels: 2,
  tubes: {
    preamp: ["2 × 12AY7", "1 × 12AX7"],
    power: ["2 × 6V6GT"],
    rectifier: ["1 × 5Y3GT"]
  },
  genres: [
    "Blues",
    "Classic Rock",
    "Country",
    "Americana"
  ],
  notableUsers: [
    "Neil Young",
    "Larry Carlton"
  ],
  tags: [
    "Tweed",
    "Vintage",
    "Classic"
  ]
},
{
  id: "fender-tweed-pro",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Tweed Pro",
  aliases: [
    "pro",
    "tweed pro",
    "5e5",
    "5e5-a"
  ],
  image: "tweed-pro.png",
  description:
    "The Tweed Pro offers increased headroom and a fuller low end than Fender's smaller tweed amplifiers while retaining the warm breakup and dynamic feel of the era.",
  history:
    "As one of Fender's professional-grade tweed amplifiers, the Pro helped define the company's expanding amplifier lineup during the 1950s.",
  introduced: 1955,
  discontinued: 1960,
  country: "United States",
  ampType: "Tube Combo",
  power: "26 W",
  channels: 2,
  tubes: {
    preamp: ["2 × 12AX7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × 5U4GB"]
  },
  genres: [
    "Blues",
    "Country",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Tweed",
    "Vintage",
    "Professional"
  ]
},
{
  id: "fender-tweed-bandmaster",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Tweed Bandmaster",
  aliases: [
    "bandmaster",
    "tweed bandmaster",
    "5e7"
  ],
  image: "bandmaster.png",
  description:
    "The Tweed Bandmaster combines strong clean headroom with warm overdrive, making it one of Fender's most versatile tweed amplifiers for both rhythm and lead playing.",
  history:
    "Introduced in the late 1950s, the Bandmaster became an important step in Fender's professional amplifier lineup and influenced many later amplifier designs.",
  introduced: 1955,
  discontinued: 1960,
  country: "United States",
  ampType: "Tube Head",
  power: "26 W",
  channels: 2,
  tubes: {
    preamp: ["2 × 12AX7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × 5U4GB"]
  },
  genres: [
    "Blues",
    "Country",
    "Classic Rock"
  ],
  notableUsers: [],
  tags: [
    "Tweed",
    "Vintage",
    "Head"
  ]
},
{
  id: "fender-blonde-bassman",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Blonde Bassman",
  aliases: [
    "blonde bassman",
    "blobassman",
    "fan bass",
    "bm62",
    "fan bm",
    "fender bb",
    "fan bb",
    "blonde bassgirl"
  ],
  image: "fender_bm_1962.png",
  description:
    "The Bassman is one of the most influential guitar amplifiers ever created. Originally designed for bass, its powerful clean sound and dynamic overdrive made it a favorite among guitarists and inspired countless amplifier designs.",
  history:
    "By the early 1960s the Bassman had become one of Fender's flagship amplifiers. Its 5F6-A circuit famously served as the foundation for the original Marshall JTM45, making it one of the most historically significant amplifiers ever built.",
  introduced: 1962,
  discontinued: 1963,
  country: "United States",
  ampType: "Tube Head",
  power: "50 W",
  channels: 2,
  tubes: {
    preamp: ["2 × 12AX7", "1 × 12AT7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country",
    "Classic Rock"
  ],
  notableUsers: [
    "Brian Setzer",
    "Mike Campbell"
  ],
  tags: [
    "Bassman",
    "Vintage",
    "Legendary",
    "Head"
  ]
},
{
  id: "fender-tweed-twin",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Tweed Twin",
  aliases: [
    "fender twin",
    "fan twin",
    "fan twins",
    "twin amp"
  ],
  image: "fender twin amp.png",
  description:
    "The Fender Twin was designed as the company's flagship professional amplifier, offering exceptional clean headroom, rich dynamics and enough power for large stages long before the introduction of onboard reverb.",
  history:
    "Introduced during the 1950s, the Twin evolved through several circuit revisions before eventually becoming the famous Twin Reverb. It established Fender's reputation for powerful, crystal-clear clean tones.",
  introduced: 1952,
  discontinued: 1963,
  country: "United States",
  ampType: "Tube Combo",
  power: "80 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["4 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Country",
    "Jazz",
    "Blues",
    "Rock"
  ],
  notableUsers: [
    "Buddy Holly",
    "Keith Richards"
  ],
  tags: [
    "Twin",
    "Vintage",
    "Flagship",
    "Clean"
  ]
},
{
  id: "fender-deluxe-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Deluxe Reverb",
  aliases: [
    "fender deluxe",
    "fan deluxe",
    "lux reverb"
  ],
  image: "fender deluxe reverb.png",
  description:
    "The Deluxe Reverb is one of the most iconic guitar amplifiers ever built, offering sparkling cleans, lush spring reverb and smooth tube overdrive at practical stage volumes.",
  history:
    "Introduced during the Blackface era in 1963, the Deluxe Reverb became a benchmark for studio and live performance. It remains one of Fender's most influential amplifier designs.",
  introduced: 1963,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "22 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["2 × 6V6GT"],
    rectifier: ["1 × 5AR4/GZ34"]
  },
  genres: [
    "Blues",
    "Country",
    "Rock",
    "Indie",
    "Jazz"
  ],
  notableUsers: [
    "Mike Campbell",
    "Larry Carlton",
    "Johnny Marr"
  ],
  tags: [
    "Blackface",
    "Spring Reverb",
    "Vintage",
    "Classic"
  ]
},
{
  id: "fender-showman",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Showman",
  aliases: [
    "showman",
    "showgirl",
    "fan showman 1962"
  ],
  image: "fender showman1962.png",
  description:
    "The Showman was Fender's first high-powered head designed specifically for large stages, delivering exceptional clean headroom and dynamic response.",
  history:
    "Introduced in the early 1960s, the Showman became closely associated with surf music and helped establish Fender as a leader in professional stage amplification.",
  introduced: 1962,
  discontinued: 1963,
  country: "United States",
  ampType: "Tube Head",
  power: "85 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["4 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Surf",
    "Country",
    "Rock",
    "Blues"
  ],
  notableUsers: [
    "Dick Dale"
  ],
  tags: [
    "Brownface",
    "Vintage",
    "Head",
    "Clean"
  ]
},
{
  id: "fender-twin-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Twin Reverb",
  aliases: [
    "twin reverb",
    "blackface twin",
    "silverface twin"
  ],
  image: "fender_twins_dark_face.png",
  description:
    "The Twin Reverb is widely regarded as the definitive clean guitar amplifier, offering enormous headroom, lush spring reverb and rich tube-driven vibrato.",
  history:
    "Introduced in 1963, the Twin Reverb became one of Fender's flagship amplifiers and remains one of the most recorded and widely used guitar amplifiers in history.",
  introduced: 1963,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "85 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["4 × 6L6GC"],
    rectifier: ["1 × 5AR4/GZ34"]
  },
  genres: [
    "Country",
    "Jazz",
    "Blues",
    "Rock"
  ],
  notableUsers: [
    "Stevie Ray Vaughan",
    "Eric Johnson",
    "John Mayer"
  ],
  tags: [
    "Blackface",
    "Spring Reverb",
    "Flagship",
    "Clean"
  ]
},
{
  id: "fender-princeton-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Princeton Reverb",
  aliases: [
    "princeton reverb",
    "blackface princeton"
  ],
  image: "princeton-reverb.png",
  description:
    "The Princeton Reverb combines classic Fender cleans with warm natural breakup, lush spring reverb and tube tremolo, making it one of the most beloved recording amplifiers ever produced.",
  history:
    "Introduced in 1964, the Princeton Reverb became a studio favorite thanks to its manageable volume and unmistakable Blackface character.",
  introduced: 1964,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "12 W",
  channels: 1,
  tubes: {
    preamp: ["3 × 12AX7", "2 × 12AT7"],
    power: ["2 × 6V6GT"],
    rectifier: ["1 × 5AR4/GZ34"]
  },
  genres: [
    "Blues",
    "Country",
    "Jazz",
    "Indie"
  ],
  notableUsers: [
    "Ryan Adams"
  ],
  tags: [
    "Blackface",
    "Studio",
    "Spring Reverb",
    "Vintage"
  ]
},
{
  id: "fender-super-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Super Reverb",
  aliases: [
    "super reverb",
    "super"
  ],
  image: "super-reverb.png",
  description:
    "The Super Reverb delivers expansive clean tones, rich spring reverb and powerful projection through its iconic four-speaker configuration.",
  history:
    "Introduced in 1963, the Super Reverb became one of the defining amplifiers of blues and classic rock, earning legendary status among professional guitarists.",
  introduced: 1963,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "45 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Blues",
    "Rock",
    "Classic Rock"
  ],
  notableUsers: [
    "Stevie Ray Vaughan"
  ],
  tags: [
    "Blackface",
    "4x10",
    "Spring Reverb",
    "Vintage"
  ]
},
{
  id: "fender-vibrolux-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Vibrolux Reverb",
  aliases: [
    "vibrolux",
    "vibrolux reverb"
  ],
  image: "vibrolux-reverb.png",
  description:
    "The Vibrolux Reverb is prized for its lively attack, rich cleans and earlier breakup, sitting perfectly between the Deluxe Reverb and Super Reverb in power and feel.",
  history:
    "Introduced during the Blackface era, the Vibrolux Reverb became a favorite among blues and country players looking for classic Fender tone with manageable stage volume.",
  introduced: 1964,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "35 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Blues",
    "Country",
    "Rock"
  ],
  notableUsers: [
    "Ronnie Earl"
  ],
  tags: [
    "Blackface",
    "2x10",
    "Spring Reverb",
    "Vintage"
  ]
},
{
  id: "fender-pro-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Pro Reverb",
  aliases: [
    "pro reverb",
    "pro"
  ],
  image: "pro-reverb.png",
  description:
    "The Pro Reverb combines the spacious clean tone of larger Fender amplifiers with slightly earlier breakup, making it a versatile choice for blues, rock and country.",
  history:
    "Introduced in 1965, the Pro Reverb became a popular alternative to the Twin Reverb by offering similar Fender clarity with lower output power and earlier saturation.",
  introduced: 1965,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "40 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country"
  ],
  notableUsers: [],
  tags: [
    "Blackface",
    "Spring Reverb",
    "Vintage"
  ]
},
{
  id: "fender-bandmaster-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Bandmaster Reverb",
  aliases: [
    "bandmaster reverb",
    "bandmaster"
  ],
  image: "bandmaster-reverb.png",
  description:
    "The Bandmaster Reverb delivers classic Fender clean tones with spring reverb in a head format, making it a flexible platform for a variety of speaker cabinets.",
  history:
    "Introduced during the Blackface era, the Bandmaster Reverb continued Fender's successful Bandmaster lineage while adding onboard reverb for greater versatility.",
  introduced: 1968,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "40 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Country",
    "Rock",
    "Blues"
  ],
  notableUsers: [],
  tags: [
    "Head",
    "Spring Reverb",
    "Vintage"
  ]
},
{
  id: "fender-dual-showman",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Dual Showman",
  aliases: [
    "dual showman",
    "showman reverb"
  ],
  image: "dual-showman.png",
  description:
    "The Dual Showman provides massive clean headroom and powerful stage projection, making it one of Fender's premier professional amplifier heads.",
  history:
    "Developed as the larger successor to the original Showman, the Dual Showman became a staple for touring musicians throughout the late 1960s and 1970s.",
  introduced: 1968,
  discontinued: null,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["4 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Surf",
    "Country",
    "Rock",
    "Blues"
  ],
  notableUsers: [
    "Dick Dale"
  ],
  tags: [
    "Head",
    "Clean",
    "Vintage",
    "Flagship"
  ]
},
{
  id: "fender-bassman-70",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Bassman 70",
  aliases: [
    "bassman 70",
    "silverface bassman"
  ],
  image: "bassman70.png",
  description:
    "The Bassman 70 modernized the classic Bassman platform with increased clean headroom while preserving the warm tube response that made the series famous.",
  history:
    "Introduced during the Silverface era, the Bassman 70 became one of Fender's best-known amplifier heads of the 1970s and remains popular among guitarists today.",
  introduced: 1977,
  discontinued: 1983,
  country: "United States",
  ampType: "Tube Head",
  power: "70 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Blues",
    "Country"
  ],
  notableUsers: [],
  tags: [
    "Silverface",
    "Head",
    "Vintage"
  ]
},
{
  id: "fender-bassman-100",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Bassman 100",
  aliases: [
    "bassman 100"
  ],
  image: "bassman100.png",
  description:
    "The Bassman 100 expanded the Bassman series with additional output power, offering enormous clean headroom while remaining an excellent pedal platform.",
  history:
    "Released during the Silverface period, the Bassman 100 became one of Fender's most common touring amplifier heads throughout the 1970s.",
  introduced: 1972,
  discontinued: 1983,
  country: "United States",
  ampType: "Tube Head",
  power: "100 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["4 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Country",
    "Blues"
  ],
  notableUsers: [],
  tags: [
    "Silverface",
    "Head",
    "Clean"
  ]
},
{
  id: "fender-super-champ",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Super Champ",
  aliases: [
    "super champ",
    "rivera super champ"
  ],
  image: "super-champ.png",
  description:
    "The Super Champ combines classic Fender clean tones with an additional gain stage, creating one of the most versatile compact amplifiers of the Rivera era.",
  history:
    "Designed by Paul Rivera and introduced in 1982, the Super Champ is regarded as one of the finest amplifiers Fender produced during the early 1980s.",
  introduced: 1982,
  discontinued: 1986,
  country: "United States",
  ampType: "Tube Combo",
  power: "18 W",
  channels: 2,
  tubes: {
    preamp: ["2 × 12AX7"],
    power: ["2 × 6V6GT"],
    rectifier: ["Solid State"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country"
  ],
  notableUsers: [
    "Jeff Beck"
  ],
  tags: [
    "Rivera Era",
    "Vintage",
    "Combo"
  ]
},
{
  id: "fender-concert-ii",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Concert II",
  aliases: [
    "concert ii",
    "rivera concert"
  ],
  image: "concert-ii.png",
  description:
    "The Concert II blends classic Fender clean tones with a dedicated lead channel, offering significantly greater versatility than earlier Fender amplifiers.",
  history:
    "Released during the Rivera era, the Concert II marked Fender's move toward more modern channel-switching amplifiers while maintaining traditional tube tone.",
  introduced: 1982,
  discontinued: 1986,
  country: "United States",
  ampType: "Tube Combo",
  power: "60 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Blues",
    "Country"
  ],
  notableUsers: [],
  tags: [
    "Rivera Era",
    "Channel Switching",
    "Vintage"
  ]
},
{
  id: "fender-deluxe-reverb-ii",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Deluxe Reverb II",
  aliases: [
    "deluxe reverb ii",
    "rivera deluxe reverb"
  ],
  image: "deluxe-reverb-ii.png",
  description:
    "The Deluxe Reverb II combines the legendary Fender clean sound with an additional lead channel, creating one of the most versatile amplifiers of the Rivera era.",
  history:
    "Introduced in 1982 under Paul Rivera's leadership, the Deluxe Reverb II modernized the classic Deluxe platform while preserving its renowned clean character.",
  introduced: 1982,
  discontinued: 1986,
  country: "United States",
  ampType: "Tube Combo",
  power: "22 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7"],
    power: ["2 × 6V6GT"],
    rectifier: ["Solid State"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country"
  ],
  notableUsers: [],
  tags: [
    "Rivera Era",
    "Channel Switching",
    "Vintage"
  ]
},
{
  id: "fender-twin-reverb-ii",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Twin Reverb II",
  aliases: [
    "twin reverb ii",
    "rivera twin"
  ],
  image: "twin-reverb-ii.png",
  description:
    "The Twin Reverb II combines Fender's famous clean headroom with a dedicated lead channel, offering significantly more versatility than the traditional Twin Reverb.",
  history:
    "Developed during the Rivera era, the Twin Reverb II represented Fender's transition toward modern channel-switching amplifiers while retaining its signature clean tone.",
  introduced: 1982,
  discontinued: 1986,
  country: "United States",
  ampType: "Tube Combo",
  power: "105 W",
  channels: 2,
  tubes: {
    preamp: ["5 × 12AX7"],
    power: ["4 × 6L6GC"],
    rectifier: ["Solid State"]
  },
  genres: [
    "Rock",
    "Country",
    "Blues",
    "Jazz"
  ],
  notableUsers: [],
  tags: [
    "Rivera Era",
    "Flagship",
    "Channel Switching"
  ]
},
{
  id: "fender-hot-rod-deluxe",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Hot Rod Deluxe",
  aliases: [
    "hot rod deluxe",
    "hrd"
  ],
  image: "hot-rod-deluxe.png",
  description:
    "The Hot Rod Deluxe is one of Fender's best-selling amplifiers, offering classic clean tones, strong pedal compatibility and a versatile overdrive channel.",
  history:
    "Introduced in 1996, the Hot Rod Deluxe became one of the world's most popular gigging amplifiers and remains a staple on stages and in rehearsal rooms.",
  introduced: 1996,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "40 W",
  channels: 3,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × 6L6GC"],
    rectifier: ["Solid State"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country",
    "Pop"
  ],
  notableUsers: [
    "Justin Vernon"
  ],
  tags: [
    "Modern",
    "Pedal Platform",
    "Classic"
  ]
},
{
  id: "fender-hot-rod-deville",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Hot Rod DeVille",
  aliases: [
    "hot rod deville",
    "deville"
  ],
  image: "hot-rod-deville.png",
  description:
    "The Hot Rod DeVille expands the Hot Rod platform with greater output power and speaker configurations designed for larger stages.",
  history:
    "Released alongside the Hot Rod Deluxe, the DeVille became one of Fender's flagship production amplifiers for touring musicians.",
  introduced: 1996,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "60 W",
  channels: 3,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Rock",
    "Blues",
    "Country"
  ],
  notableUsers: [],
  tags: [
    "Modern",
    "High Headroom",
    "Classic"
  ]
},
{
  id: "fender-blues-deluxe",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Blues Deluxe",
  aliases: [
    "blues deluxe"
  ],
  image: "blues-deluxe.png",
  description:
    "The Blues Deluxe revives the spirit of Fender's classic tweed amplifiers with warm clean tones, smooth overdrive and straightforward controls.",
  history:
    "Introduced in the early 1990s, the Blues Deluxe became one of Fender's most successful vintage-inspired production amplifiers.",
  introduced: 1993,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "40 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Blues",
    "Classic Rock",
    "Country"
  ],
  notableUsers: [],
  tags: [
    "Tweed Inspired",
    "Modern",
    "Classic"
  ]
},
{
  id: "fender-blues-deville",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Blues DeVille",
  aliases: [
    "blues deville"
  ],
  image: "blues-deville.png",
  description:
    "The Blues DeVille offers vintage-inspired Fender cleans with increased stage volume, making it ideal for players seeking traditional tube tone with modern reliability.",
  history:
    "Released alongside the Blues Deluxe, the Blues DeVille became a favorite among blues and roots musicians requiring additional clean headroom.",
  introduced: 1993,
  discontinued: 2010,
  country: "United States",
  ampType: "Tube Combo",
  power: "60 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × 6L6GC"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country"
  ],
  notableUsers: [],
  tags: [
    "Tweed Inspired",
    "High Headroom",
    "Modern"
  ]
},
{
  id: "fender-bassbreaker-15",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Bassbreaker 15",
  aliases: [
    "bassbreaker 15",
    "bb15"
  ],
  image: "bassbreaker15.png",
  description:
    "The Bassbreaker 15 blends the heritage of the original Bassman with a distinctly British-inspired voice, offering dynamic cleans, rich crunch and modern gain in a compact format.",
  history:
    "Introduced in 2016, the Bassbreaker series reinterpreted Fender's historic Bassman platform for players seeking a more Marshall-inspired response.",
  introduced: 2016,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "15 W",
  channels: 3,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × EL84"]
  },
  genres: [
    "Blues",
    "Rock",
    "Classic Rock"
  ],
  notableUsers: [],
  tags: [
    "Bassman Inspired",
    "British Voicing",
    "Modern"
  ]
},
{
  id: "fender-bassbreaker-45",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Bassbreaker 45",
  aliases: [
    "bassbreaker 45",
    "bb45"
  ],
  image: "bassbreaker45.png",
  description:
    "The Bassbreaker 45 pays tribute to the legendary Bassman circuit while delivering increased headroom and a thicker, British-inspired overdrive character.",
  history:
    "Released as the flagship of the Bassbreaker range, the Bassbreaker 45 celebrates the amplifier that ultimately inspired the original Marshall JTM45.",
  introduced: 2016,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "45 W",
  channels: 2,
  tubes: {
    preamp: ["3 × 12AX7"],
    power: ["2 × EL34"]
  },
  genres: [
    "Classic Rock",
    "Blues",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Bassman Inspired",
    "British Voicing",
    "Modern"
  ]
},
{
  id: "fender-tone-master-deluxe-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Tone Master Deluxe Reverb",
  aliases: [
    "tone master deluxe",
    "tone master deluxe reverb",
    "tm deluxe"
  ],
  image: "tone-master-deluxe-reverb.png",
  description:
    "The Tone Master Deluxe Reverb faithfully recreates the sound and feel of the classic tube Deluxe Reverb using Fender's digital modeling technology while dramatically reducing weight and maintenance.",
  history:
    "Introduced in 2019, the Tone Master series marked Fender's first serious move into premium digital recreations of its most iconic tube amplifiers and was widely adopted by touring musicians.",
  introduced: 2019,
  discontinued: null,
  country: "United States",
  ampType: "Modeling Combo",
  power: "100 W (22 W equivalent)",
  channels: 2,
  tubes: null,
  genres: [
    "Blues",
    "Country",
    "Rock",
    "Jazz",
    "Indie"
  ],
  notableUsers: [],
  tags: [
    "Tone Master",
    "Digital",
    "Lightweight",
    "Modern"
  ]
},
{
  id: "fender-tone-master-twin-reverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Tone Master Twin Reverb",
  aliases: [
    "tone master twin",
    "tone master twin reverb",
    "tm twin"
  ],
  image: "tone-master-twin-reverb.png",
  description:
    "The Tone Master Twin Reverb captures the legendary clean sound and dynamic response of the classic Twin Reverb while offering significantly lower weight and modern digital convenience.",
  history:
    "Released alongside the Tone Master Deluxe Reverb, it demonstrated Fender's ability to reproduce its historic amplifier designs using advanced digital technology.",
  introduced: 2019,
  discontinued: null,
  country: "United States",
  ampType: "Modeling Combo",
  power: "200 W (85 W equivalent)",
  channels: 2,
  tubes: null,
  genres: [
    "Country",
    "Jazz",
    "Blues",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Tone Master",
    "Digital",
    "Flagship",
    "Modern"
  ]
},
{
  id: "fender-vibro-king",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Vibro-King",
  aliases: [
    "vibro king",
    "vibro-king"
  ],
  image: "vibro-king.png",
  description:
    "The Vibro-King combines vintage-inspired Fender cleans with rich harmonic overdrive, tube-driven spring reverb and classic tremolo, making it one of Fender's premier boutique-style amplifiers.",
  history:
    "Introduced in 1993, the Vibro-King became Fender's Custom Shop flagship amplifier and remains highly regarded for its expressive tone and premium construction.",
  introduced: 1993,
  discontinued: null,
  country: "United States",
  ampType: "Tube Combo",
  power: "60 W",
  channels: 1,
  tubes: {
    preamp: ["5 × 12AX7", "2 × 12AT7"],
    power: ["3 × 6L6GC"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country",
    "Jazz"
  ],
  notableUsers: [
    "Pete Townshend",
    "John Mayer"
  ],
  tags: [
    "Custom Shop",
    "Boutique",
    "Vintage",
    "Flagship"
  ]
},
{
  id: "fender-vibroverb",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Vibroverb",
  aliases: [
    "vibroverb",
    "vibro verb"
  ],
  image: "vibroverb.png",
  description:
    "The Vibroverb combines warm Fender cleans with lush spring reverb and tube vibrato, offering earlier breakup than larger Blackface models.",
  history:
    "Introduced in 1963, the Vibroverb holds the distinction of being Fender's first amplifier to feature built-in spring reverb and became a favorite among blues guitarists.",
  introduced: 1963,
  discontinued: 1964,
  country: "United States",
  ampType: "Tube Combo",
  power: "40 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Blues",
    "Rock",
    "Country"
  ],
  notableUsers: [
    "Stevie Ray Vaughan"
  ],
  tags: [
    "Blackface",
    "Spring Reverb",
    "Vintage",
    "Legendary"
  ]
},
{
  id: "fender-vibro-champ",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Vibro Champ",
  aliases: [
    "vibro champ",
    "vibrochamp"
  ],
  image: "vibro-champ.png",
  description:
    "The Vibro Champ adds Fender's signature tube vibrato to the classic Champ platform, creating one of the most popular recording amplifiers ever built.",
  history:
    "Introduced in 1964, the Vibro Champ remained in production for decades and became a studio favorite thanks to its manageable volume and unmistakable vintage Fender tone.",
  introduced: 1964,
  discontinued: 1982,
  country: "United States",
  ampType: "Tube Combo",
  power: "5 W",
  channels: 1,
  tubes: {
    preamp: ["2 × 12AX7"],
    power: ["1 × 6V6GT"],
    rectifier: ["1 × 5Y3GT"]
  },
  genres: [
    "Blues",
    "Country",
    "Recording",
    "Rock"
  ],
  notableUsers: [
    "Eric Clapton"
  ],
  tags: [
    "Vintage",
    "Recording",
    "Tube Vibrato"
  ]
},
{
  id: "fender-vibrolux",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Vibrolux",
  aliases: [
    "vibrolux"
  ],
  image: "vibrolux.png",
  description:
    "The original Vibrolux introduced onboard tube vibrato to Fender's amplifier lineup, combining warm clean tones with expressive modulation.",
  history:
    "First introduced in the late 1950s, the Vibrolux became one of Fender's most important amplifier families and eventually evolved into the celebrated Vibrolux Reverb.",
  introduced: 1956,
  discontinued: 1963,
  country: "United States",
  ampType: "Tube Combo",
  power: "35 W",
  channels: 2,
  tubes: {
    preamp: ["2 × 12AX7", "1 × 12AY7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Blues",
    "Country",
    "Rock"
  ],
  notableUsers: [],
  tags: [
    "Brownface",
    "Vintage",
    "Tube Vibrato"
  ]
},
{
  id: "fender-concert",
  manufacturerId: "fender",
  manufacturer: "Fender",
  model: "Concert",
  aliases: [
    "concert",
    "brownface concert"
  ],
  image: "concert.png",
 description:
    "The Concert was Fender's first amplifier to feature harmonic vibrato, combining exceptional clean headroom with one of the most distinctive modulation effects ever built into a guitar amplifier.",
  history:
    "Produced during the Brownface era, the Concert is regarded as one of Leo Fender's most innovative amplifier designs and remains highly sought after by collectors.",
  introduced: 1960,
  discontinued: 1963,
  country: "United States",
  ampType: "Tube Combo",
  power: "40 W",
  channels: 2,
  tubes: {
    preamp: ["4 × 12AX7", "2 × 12AT7"],
    power: ["2 × 6L6GC"],
    rectifier: ["1 × GZ34"]
  },
  genres: [
    "Blues",
    "Country",
    "Rock",
    "Surf"
  ],
  notableUsers: [],
  tags: [
    "Brownface",
    "Harmonic Vibrato",
    "Vintage",
    "Classic"
  ]
}
];
