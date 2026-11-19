/*
 * Campus directory.
 * Coordinates are not automatically official. Block 34 uses a community-reported approximate point,
 * not an official LPU source; verify the exact entrance with campus staff before relying on it.
 * Other numbered blocks are searchable directory entries, but have no fabricated coordinates.
 */
const CAMPUS_PLACES = [
  {
    id: "campus-center",
    name: "LPU campus area (approx.)",
    category: "General area",
    description: "Approximate campus-area reference point for map orientation; not a building entrance.",
    lat: 31.2559,
    lng: 75.7033,
    verified: false,
    directionsEnabled: true,
    source: "Approximate campus-area reference; not an official building pin."
  },
  {
    id: "block-34",
    name: "Block 34 — CSE",
    category: "Academic block",
    description: "Community map listings place Block 34 around this area. This is an approximate, non-official pin; confirm the correct entrance on campus.",
    lat: 31.25162,
    lng: 75.70463,
    verified: false,
    directionsEnabled: true,
    source: "Approximate coordinates from public community map listings; not officially verified."
  },
  {
    id: "library",
    name: "Central Library",
    category: "Facility",
    description: "Searchable destination. Confirm the exact entrance/location before enabling routing.",
    lat: null, lng: null, verified: false, directionsEnabled: false,
    source: "Coordinates not added because an exact entrance has not been verified."
  },
  {
    id: "hostel-reception",
    name: "Hostel Reception",
    category: "Student services",
    description: "Choose the specific hostel/reception desk; location must be confirmed first.",
    lat: null, lng: null, verified: false, directionsEnabled: false,
    source: "Coordinates not yet verified."
  },
  {
    id: "student-help",
    name: "Student Help / Information Desk",
    category: "Student services",
    description: "General help-desk entry. Confirm the current office location with LPU.",
    lat: null, lng: null, verified: false, directionsEnabled: false,
    source: "Coordinates not yet verified."
  },
  {
    id: "unimall",
    name: "Uni-Mall",
    category: "Facility",
    description: "Searchable destination; exact entrance coordinates need verification.",
    lat: null, lng: null, verified: false, directionsEnabled: false,
    source: "Coordinates not yet verified."
  },
  {
    id: "unihospital",
    name: "Uni-Hospital",
    category: "Healthcare",
    description: "Searchable destination; verify the entrance and current access route with LPU.",
    lat: null, lng: null, verified: false, directionsEnabled: false,
    source: "Coordinates not yet verified."
  },
  ...Array.from({ length: 50 }, (_, index) => {
    const number = index + 1;
    if (number === 34) return null; // use the named Block 34 record above
    return {
      id: `block-${number}`,
      name: `Block ${number}`,
      category: "Academic block",
      description: `Block ${number} directory entry. Add its verified coordinates and entrance details before routing.`,
      lat: null,
      lng: null,
      verified: false,
      directionsEnabled: false,
      source: "No verified coordinates added yet."
    };
  }).filter(Boolean)
];


/* USER_SUPPLIED_COORDINATES_2026_11_07
 * Coordinates below were supplied by the project owner on 2026-11-07.
 * They are enabled as map destinations but are not independently field-verified.
 * A centre/reference pin is not necessarily the building's accessible entrance.
 */
const USER_COORDINATE_SOURCE = "Coordinates supplied by the project owner on 2026-11-07; not independently field-verified. Confirm the building identity and entrance on campus.";

const USER_BLOCK_COORDINATES = {
  "block-1":  { name: "Block 1", lat: 31.258514158736183, lng: 75.70872669290094 },
  "block-14": { name: "Block 14 — Mittal School of Business", lat: 31.254408889938322, lng: 75.70560013738735 },
  "block-15": { name: "Block 15 — Lovely School of Hospitality", lat: 31.255600547324168, lng: 75.70416594065433 },
  "block-18": { name: "Block 18 — Humanities", lat: 31.255222229674647, lng: 75.70372944593953 },
  "block-25": { name: "Block 25", lat: 31.252611547465655, lng: 75.70246403760521 },
  "block-26": { name: "Block 26", lat: 31.25254494678762, lng: 75.70285713485053 },
  "block-27": { name: "Block 27", lat: 31.252514043400225, lng: 75.7033300843912 },
  "block-28": { name: "Block 28", lat: 31.252496016419233, lng: 75.70372772347959 },
  "block-31": { name: "Block 31 — Admissions", lat: 31.252459672210758, lng: 75.70496339447749 },
  "block-32": { name: "Block 32 — Division of Career Services", lat: 31.252067803473242, lng: 75.70481427611107 },
  "block-33": { name: "Block 33", lat: 31.251622784080816, lng: 75.70478495144805 },
  "block-35": { name: "Block 35", lat: 31.25137549773394, lng: 75.70415066696445 },
  "block-36": { name: "Block 36", lat: 31.251585729029035, lng: 75.7041205511061 },
  "block-37": { name: "Block 37", lat: 31.251928373965757, lng: 75.70351618682554 },
  "block-38": { name: "Block 38 — Computer Applications and Research", lat: 31.25221026175347, lng: 75.70311561611962 },
  "block-39": { name: "Block 39 — LPU Innovation Studio", lat: 31.25112840983009, lng: 75.7054468722551 }
};

CAMPUS_PLACES.forEach((place) => {
  const supplied = USER_BLOCK_COORDINATES[place.id];
  if (!supplied) return;
  place.name = supplied.name;
  place.lat = supplied.lat;
  place.lng = supplied.lng;
  place.verified = false;
  place.directionsEnabled = true;
  place.source = USER_COORDINATE_SOURCE;
  place.description = "Location coordinate supplied by the project owner. Treat this as a map reference point; confirm the exact building identity and accessible entrance on campus.";
});

const USER_SUPPLIED_CAMPUS_FACILITIES = [
  { id: "lpu-main-parking", name: "LPU Main Parking", category: "Gate / parking", lat: 31.25289553392606, lng: 75.7057074257848 },
  { id: "robo-park", name: "Robo Park LPU", category: "Sports / ground", lat: 31.25348028186916, lng: 75.7032755637416 },
  { id: "school-biosciences", name: "School of Biosciences", category: "Academic block", lat: 31.25323059008924, lng: 75.70376868185426 },
  { id: "lpu-helipad", name: "LPU Helipad", category: "Other", lat: 31.25436554741007, lng: 75.70301762502974 },
  { id: "school-education", name: "School of Education", category: "Academic block", lat: 31.255176371154548, lng: 75.70341160418087 },
  { id: "school-hotel-management", name: "LPU School of Hotel Management", category: "Academic block", lat: 31.255653552864757, lng: 75.70433863872012 },
  { id: "division-student-welfare", name: "Division of Student Welfare", category: "Student facility", lat: 31.255151411074987, lng: 75.70606155724799 },
  { id: "security-office", name: "Security Office", category: "Student facility", lat: 31.256833888775205, lng: 75.70527910859467 },
  { id: "product-industrial-block", name: "Product and Industrial Block", category: "Academic block", lat: 31.25660459986696, lng: 75.70655852227294 },
  { id: "shri-baldev-raj-mittal-hospital", name: "Shri Baldev Raj Mittal Hospital", category: "Medical", lat: 31.25665733636526, lng: 75.70700376895596 },
  { id: "school-design", name: "School of Design — Multimedia and Animation", category: "Academic block", lat: 31.256808190664394, lng: 75.70738580490396 },
  { id: "school-architecture", name: "Lovely School of Architecture", category: "Academic block", lat: 31.256950963401962, lng: 75.7072563514793 },
  { id: "mb-food-square", name: "MB Food Square", category: "Cafe / restaurant", lat: 31.256564452717928, lng: 75.70873444718471 },
  { id: "lovely-institute-international-studies", name: "Lovely Institute of International Studies", category: "Academic block", lat: 31.258026617996148, lng: 75.70687568947656 },
  { id: "lpu-main-sports-field", name: "LPU Main Sports Field", category: "Sports / ground", lat: 31.256891720224, lng: 75.70941888175166 },
  { id: "basketball-court", name: "Basketball Court", category: "Sports / ground", lat: 31.256463692236505, lng: 75.70976785764678 },
  { id: "volleyball-court", name: "Volleyball Court", category: "Sports / ground", lat: 31.2556103795743, lng: 75.70980478494513 },
  { id: "lawn-tennis-court", name: "Lawn Tennis Court", category: "Sports / ground", lat: 31.25554693716592, lng: 75.710237652052 },
  { id: "lpu-cricket-ground", name: "LPU Cricket Ground", category: "Sports / ground", lat: 31.25621575025179, lng: 75.7108767374345 },
  { id: "it-tech-lpu", name: "IT Tech LPU", category: "Academic block", lat: 31.2537968298595, lng: 75.70495016717565 },
  { id: "school-electronics-electrical", name: "School of Electronics and Electrical Engineering", category: "Academic block", lat: 31.251690031683573, lng: 75.7041261330845 },
  { id: "shanti-devi-mittal-auditorium", name: "Shanti Devi Mittal Auditorium", category: "Student facility", lat: 31.25207052837543, lng: 75.70410919296067 },
  { id: "lpu-central-store", name: "LPU Central Store", category: "Shop / service", lat: 31.251857012161302, lng: 75.70320690531202 },
  { id: "lpu-startup-school", name: "LPU Startup School", category: "Academic block", lat: 31.25217403959199, lng: 75.70312555646339 },
  { id: "boys-apartment-41a", name: "Boys Apartment 41A", category: "Hostel", lat: 31.251649701459655, lng: 75.70195359219272 },
  { id: "block-41d", name: "Block 41D", category: "Hostel", lat: 31.251936689620344, lng: 75.70098158050794 },
  { id: "south-central-mess", name: "South Central Mess", category: "Cafe / restaurant", lat: 31.25213717699715, lng: 75.70089679693243 },
  { id: "lpu-shooting-range", name: "LPU Shooting Range", category: "Sports / ground", lat: 31.251226411112675, lng: 75.70160555940427 },
  { id: "lpu-sports-center", name: "LPU Sports Center", category: "Sports / ground", lat: 31.250906002325454, lng: 75.70216375724516 },
  { id: "indoor-playground-stadium", name: "Indoor Playground Stadium", category: "Sports / ground", lat: 31.25050242205039, lng: 75.70152262715364 },
  { id: "lpu-college-gym", name: "LPU College Gym", category: "Sports / ground", lat: 31.25095495365039, lng: 75.70085237045203 },
  { id: "boys-hostel-bh1", name: "LPU Boys Hostel 1 — BH1", category: "Hostel", lat: 31.251388828832052, lng: 75.70034452628732 },
  { id: "bh1-football-ground", name: "BH1 Football Ground", category: "Sports / ground", lat: 31.251572200899, lng: 75.69893441643013 },
  { id: "boys-hostel-bh3", name: "LPU Boys Hostel 3 — BH3", category: "Hostel", lat: 31.24965777790852, lng: 75.7001462406722 },
  { id: "boys-hostel-bh2", name: "LPU Boys Hostel 2 — BH2", category: "Hostel", lat: 31.24984071351034, lng: 75.7005868103799 },
  { id: "boys-hostel-bh7", name: "LPU Boys Hostel 7 — BH7", category: "Hostel", lat: 31.249560282441557, lng: 75.6982460243672 },
  { id: "boys-hostel-bh4", name: "LPU Boys Hostel 4 — BH4", category: "Hostel", lat: 31.248694961823798, lng: 75.69978888833818 },
  { id: "block-51a", name: "Block 51A", category: "Academic block", lat: 31.24855746729026, lng: 75.70018194817969 },
  { id: "block-52a", name: "Block 52A", category: "Academic block", lat: 31.248526389939578, lng: 75.69956949421407 },
  { id: "block-52b", name: "Block 52B", category: "Academic block", lat: 31.248589431633185, lng: 75.69923564506672 },
  { id: "food-factory", name: "Food Factory", category: "Cafe / restaurant", lat: 31.24787459127092, lng: 75.69862368424869 }
];

// Update existing generic entries when a supplied coordinate exists (e.g. library and Uni-Mall).
const userFacilityOverrides = {
  "library": { name: "Central Library", category: "Library", lat: 31.2520037645069, lng: 75.7033832605494 },
  "unimall": { name: "Uni-Mall", category: "Student facility", lat: 31.25580465575617, lng: 75.70544242963815 }
};
CAMPUS_PLACES.forEach((place) => {
  const supplied = userFacilityOverrides[place.id];
  if (!supplied) return;
  Object.assign(place, supplied, { verified: false, directionsEnabled: true, source: USER_COORDINATE_SOURCE,
    description: "Coordinate supplied by the project owner. Treat as a destination reference; confirm the actual accessible entrance on campus." });
});

USER_SUPPLIED_CAMPUS_FACILITIES.forEach((place) => {
  CAMPUS_PLACES.push({
    ...place,
    description: "Coordinate supplied by the project owner. Treat as a map reference point; confirm the facility identity and accessible entrance on campus.",
    verified: false,
    directionsEnabled: true,
    source: USER_COORDINATE_SOURCE
  });
});


/* ADDITIONAL USER-SUPPLIED CAMPUS COORDINATES — 2026-11-07
 * Values below were supplied by the project owner. They have not been independently surveyed.
 * They are map reference pins; confirm the identity and accessible entrance before relying on navigation.
 */
const USER_COORDINATE_BATCH_2 = [
  { id: 'block-55', name: 'Block 55 — School of Mechanical Engineering', category: 'Academic block', lat: 31.24707017354715, lng: 75.70344652347 },
  { id: 'block-56', name: 'Block 56 — School of Civil Engineering', category: 'Academic block', lat: 31.246748387148443, lng: 75.70400950586308 },
  { id: 'block-57', name: 'Block 57 — School of Agriculture', category: 'Academic block', lat: 31.246243889322216, lng: 75.70363471588422 },
  { id: 'school-mechanical-engineering-block55', name: 'School of Mechanical Engineering — Block 55', category: 'Academic block', lat: 31.24707017354715, lng: 75.70344652347 },
  { id: 'school-aerospace-engineering-block55', name: 'School of Aerospace Engineering — Block 55', category: 'Academic block', lat: 31.24693655051632, lng: 75.70326152075702 },
  { id: 'school-civil-engineering-block56', name: 'School of Civil Engineering — Block 56', category: 'Academic block', lat: 31.246748387148443, lng: 75.70400950586308 },
  { id: 'school-bio-engineering', name: 'School of Bioengineering', category: 'Academic block', lat: 31.24672111706459, lng: 75.70350712780629 },
  { id: 'forensic-science-block', name: 'Forensic Science Block', category: 'Academic block', lat: 31.246590220552424, lng: 75.70363471588422 },
  { id: 'school-agriculture-block57', name: 'School of Agriculture — Block 57', category: 'Academic block', lat: 31.246243889322216, lng: 75.70363471588422 },
  { id: 'school-polytechnic', name: 'School of Polytechnic, LPU', category: 'Academic block', lat: 31.24629279008923, lng: 75.70395453784725 },
  { id: 'boys-hostel-bh6', name: 'LPU Boys Hostel 6 — BH6', category: 'Hostel', lat: 31.24839360317166, lng: 75.70413931879672 },
  { id: 'nk-food-court', name: 'NK Food Court', category: 'Cafe / restaurant', lat: 31.247088589945214, lng: 75.70467748177622 },
  { id: 'lpu-school-of-law', name: 'LPU School of Law', category: 'Academic block', lat: 31.254169640004076, lng: 75.6998296327982 },
  { id: 'school-film-production', name: 'School of Film Production', category: 'Academic block', lat: 31.254597678393356, lng: 75.70128622783865 },
  { id: 'law-gate', name: 'Law Gate', category: 'Gate / parking', lat: 31.255064221477635, lng: 75.70049396149435 },
  { id: 'girls-hostels-area', name: 'Girls Hostels — campus area reference', category: 'Hostel', lat: 31.258140707828666, lng: 75.70474082868064 },
  { id: 'gre-toefl-test-center', name: 'GRE / TOEFL ETS Test Center, LPU', category: 'Student facility', lat: 31.25479866090148, lng: 75.70100857391085 },
  { id: 'management-block', name: 'Management Block', category: 'Academic block', lat: 31.254712675772243, lng: 75.70133714450523 },
];

const USER_COORDINATE_UPDATES_BATCH_2 = {
  "product-industrial-block": { name: 'Product and Industrial Block', category: 'Academic block', lat: 31.256619323332217, lng: 75.70651035863668 },
  "security-office": { name: 'Security Office', category: 'Student facility', lat: 31.25685109449426, lng: 75.7052153396458 },
};

CAMPUS_PLACES.forEach((place) => {
  const update = USER_COORDINATE_UPDATES_BATCH_2[place.id];
  if (update) Object.assign(place, update, {
    verified: false,
    directionsEnabled: true,
    source: USER_COORDINATE_SOURCE,
    description: "Coordinate supplied by the project owner. Treat as a map reference point; confirm the facility identity and accessible entrance on campus."
  });
});

// Prevent duplicate insertion if the script is imported more than once.
const existingCampusPlaceIds = new Set(CAMPUS_PLACES.map(place => place.id));
USER_COORDINATE_BATCH_2.forEach((place) => {
  if (existingCampusPlaceIds.has(place.id)) {
    const existing = CAMPUS_PLACES.find(item => item.id === place.id);
    Object.assign(existing, place, {
      verified: false,
      directionsEnabled: true,
      source: USER_COORDINATE_SOURCE,
      description: "Coordinate supplied by the project owner. Treat as a map reference point; confirm the facility identity and accessible entrance on campus."
    });
    return;
  }
  CAMPUS_PLACES.push({
    ...place,
    description: "Coordinate supplied by the project owner. Treat as a map reference point; confirm the facility identity and accessible entrance on campus.",
    verified: false,
    directionsEnabled: true,
    source: USER_COORDINATE_SOURCE
  });
  existingCampusPlaceIds.add(place.id);
});
