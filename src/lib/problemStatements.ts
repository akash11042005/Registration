// ============================================================
// Problem Statements Data — AAYODHYAM 2026 (11 tasks)
// ============================================================

export type ProblemCategory =
  | 'Metallography'
  | 'Heat Treatment'
  | 'Mechanical Testing'
  | 'Computation & AI'
  | 'Phase Transformations';

export type Difficulty = 'Medium' | 'Hard' | 'Advanced';

export interface ProblemStatement {
  id: number;
  title: string;
  category: ProblemCategory;
  difficulty: Difficulty;
  objective: string;
  objectiveFull: string;
  labEquipment: string[];
  evaluationCriteria: string;
  tags: string[];
  cap: number;
}

export const PROBLEM_STATEMENTS: ProblemStatement[] = [
  {
    id: 1,
    title: 'Decarburization Zone Measurement',
    category: 'Metallography',
    difficulty: 'Medium',
    objective: 'Quantify decarburization depth from high-temperature atmospheric heating in carbon steels via ferrite-layer microstructural analysis.',
    objectiveFull: 'Participants will heat plain carbon steel specimens in an atmospheric furnace and metallographically prepare cross-sections to reveal the decarburized surface layer. The ferrite zone depth must be quantified using calibrated optical microscopy (eyepiece micrometer or image analysis), etched with 2% Nital. Results will be compared against expected depth based on heating time–temperature data.',
    labEquipment: ['Muffle furnace', 'Metallographic polishing wheel', 'Optical microscope with calibrated eyepiece', 'Nital etchant (2%)', 'Mounting press', 'SiC abrasive papers'],
    evaluationCriteria: 'Accuracy and precision of decarburization depth measurement; quality of metallographic preparation (surface finish, etch contrast); methodology documentation; correlation of microstructural observation with heating parameters; statistical repeatability across multiple sections.',
    tags: ['Decarburization', 'Carbon Steel', 'Optical Microscopy', 'Ferrite', 'Nital Etching', 'ASTM E1077'],
    cap: 8,
  },
  {
    id: 2,
    title: 'Prior Austenite Grain Size Revelation',
    category: 'Metallography',
    difficulty: 'Hard',
    objective: 'Reveal prior austenite grain boundaries in heat-treated steel using specialized etchants and calculate grain size to ASTM E112.',
    objectiveFull: 'Participants will reveal prior austenite grain boundaries (PAGBs) in hardened and tempered alloy or tool steel samples using Picral or saturated aqueous picric acid etchant with a wetting agent. The challenge lies in achieving consistent PAGB decoration without over- or under-etching. Grain size must be computed using the Heyn linear intercept method or comparison charts per ASTM E112.',
    labEquipment: ['Picral / saturated picric acid etchant with wetting agent', 'Optical microscope with eyepiece graticule', 'Metallographic preparation station', 'Hardness tester (HRC)'],
    evaluationCriteria: 'Quality of prior austenite grain boundary decoration; correct application of ASTM E112 intercept or comparison method; reproducibility across multiple fields of view; identification of etching artefacts; correlation of measured ASTM grain size number with reported heat treatment conditions.',
    tags: ['Prior Austenite', 'Grain Size', 'ASTM E112', 'Picral Etching', 'Hardened Steel', 'PAGBs'],
    cap: 8,
  },
  {
    id: 3,
    title: 'Automated Grain Size Measurement (Python)',
    category: 'Computation & AI',
    difficulty: 'Advanced',
    objective: 'Build an automated Python/OpenCV computer-vision pipeline for grain size evaluation from optical micrographs, benchmarked against the manual intercept method.',
    objectiveFull: 'Participants will develop a Python 3.x image-processing pipeline (using OpenCV, scikit-image, or similar) capable of ingesting optical micrograph images, segmenting grain boundaries, and computing mean intercept length or equivalent grain diameter. The automated result must be validated against manual ASTM E112 measurements on the same micrographs. Participants should demonstrate robustness to variations in etch contrast and magnification.',
    labEquipment: ['Computer lab with Python 3.x environment', 'Sample micrograph dataset (provided by WCE)', 'OpenCV / scikit-image libraries', 'Display for live demo'],
    evaluationCriteria: 'Accuracy of automated grain size measurement vs. manual ground truth (% error); code quality, modularity, and documentation; robustness to image variability; computational efficiency; live demonstration on unseen micrograph; innovation in pipeline design (e.g., deep-learning segmentation, adaptive thresholding).',
    tags: ['Python', 'OpenCV', 'Computer Vision', 'Image Analysis', 'Grain Size', 'scikit-image', 'ASTM E112', 'AI'],
    cap: 8,
  },
  {
    id: 4,
    title: 'Strain Ageing Demonstration',
    category: 'Mechanical Testing',
    difficulty: 'Hard',
    objective: 'Demonstrate yield-point return and strain ageing in low-carbon steel after prestraining and thermal ageing, illustrating the Cottrell atmosphere mechanism.',
    objectiveFull: 'Participants will conduct tensile testing of low-carbon steel specimens on a UTM to a pre-defined plastic strain (past the yield point), unload, and subject specimens to accelerated thermal ageing in an oil bath or oven at a specified temperature and duration. Re-testing must demonstrate a measurable increase in yield stress relative to the initial lower yield point, consistent with Cottrell atmosphere pinning of dislocations by interstitial carbon/nitrogen atoms. Engineering stress–strain curves must be plotted and annotated.',
    labEquipment: ['Universal Testing Machine (UTM)', 'Ageing oil bath or controlled oven (100–200°C)', 'Tensile specimens (low-carbon steel, pre-machined)', 'Data acquisition software', 'Vernier calipers'],
    evaluationCriteria: 'Clear demonstration of yield-point return (quantified ΔYS in MPa); quality and annotation of engineering stress–strain curves; accuracy of pre-strain calculation; thermal ageing parameter control; mechanistic explanation of Cottrell atmosphere in the written report; repeatability with duplicate specimens.',
    tags: ['Strain Ageing', 'Cottrell Atmosphere', 'Yield Point Return', 'Low-Carbon Steel', 'UTM', 'Dislocations'],
    cap: 8,
  },
  {
    id: 5,
    title: 'Blue Brittleness Phenomenon',
    category: 'Mechanical Testing',
    difficulty: 'Hard',
    objective: 'Investigate dynamic strain ageing and ductility drop in medium-carbon steel at 200–300°C, with blue oxide film as visual evidence.',
    objectiveFull: 'Participants will conduct tensile or impact tests on medium-carbon steel specimens at elevated temperatures (200–300°C) — the "blue brittleness" range — and compare UTS, elongation, and impact energy against room-temperature baseline values. The characteristic blue oxide film on fracture surfaces or gauge sections must be documented. Serrated flow (Portevin–Le Chatelier effect) on the stress–strain curve should be identified and reported.',
    labEquipment: ['High-temperature UTM or elevated-temperature impact tester', 'Heating chamber with thermocouple control', 'Medium-carbon steel specimens', 'Thermocouples + temperature logger', 'Photography for oxide film documentation'],
    evaluationCriteria: 'Observation and quantification of the UTS maximum and ductility minimum in the 200–300°C range; documentation of blue oxide film; identification of PLC serrations on stress–strain curve; quality of data across temperature range; mechanistic explanation linking DSA to interstitial–dislocation interaction; completeness of report.',
    tags: ['Blue Brittleness', 'DSA', 'PLC Effect', 'Medium-Carbon Steel', 'High-Temp Testing', 'Ductility', 'Oxide Film'],
    cap: 8,
  },
  {
    id: 6,
    title: 'Grain Size Refinement Challenge',
    category: 'Phase Transformations',
    difficulty: 'Medium',
    objective: 'Refine grain size of supplied plain carbon steel via thermomechanical processing or thermal cycling, demonstrating Hall–Petch strengthening.',
    objectiveFull: 'Starting from a coarse-grained plain carbon steel billet (supplied), participants will design and execute a thermomechanical processing route (controlled rolling + controlled cooling, or multiple austenitizing + quench thermal cycles) to maximize grain refinement. Metallographic characterization before and after processing must quantify the grain size change (ASTM E112). Hardness measurements must demonstrate the corresponding Hall–Petch strengthening effect.',
    labEquipment: ['Thermomechanical press or lab rolling mill (or controlled forging anvil)', 'Heat treatment furnaces', 'Metallography preparation bench', 'Optical microscope', 'Hardness tester (HV/HRB)'],
    evaluationCriteria: 'Degree of grain refinement achieved (ΔASTM grain size number); quality of metallographic evidence; correlation of hardness improvement with Hall–Petch relationship (ΔHV vs. d⁻¹/²); documentation of processing route; repeatability; explanation of recrystallization and grain growth suppression mechanisms.',
    tags: ['Grain Refinement', 'Hall–Petch', 'Thermomechanical Processing', 'Recrystallization', 'ASTM E112', 'Carbon Steel'],
    cap: 8,
  },
  {
    id: 7,
    title: 'Heat Treatment for Target Mechanical Properties',
    category: 'Heat Treatment',
    difficulty: 'Advanced',
    objective: 'Design and execute quenching/tempering/normalizing cycles to achieve specified target UTS, hardness, and elongation values in a supplied steel grade.',
    objectiveFull: 'Participants will be given a target property specification (UTS range, Rockwell hardness range, minimum elongation) for a supplied medium-alloy steel grade, without a predefined heat treatment recipe. Teams must independently research and design the austenitizing temperature, soaking time, quench medium, and tempering cycle, then execute the treatment using WCE lab furnaces and test the resulting mechanical properties on the UTM and hardness tester. Results will be compared against the target spec.',
    labEquipment: ['Heat treatment furnaces (up to 1100°C)', 'Quenching tanks (water, oil, polymer quench)', 'Rockwell hardness tester (HRC)', 'UTM with extensometer', 'Thermocouple + data logger', 'Metallography bench'],
    evaluationCriteria: 'Proximity of achieved mechanical properties to target spec (primary); correctness of processing logic and design rationale; microstructural characterization of final condition (martensite, bainite, etc.); quality of hardness profile; evidence of systematic experimental approach; completeness of report including TTT/CCT reference.',
    tags: ['Quenching', 'Tempering', 'Normalizing', 'Mechanical Properties', 'UTS', 'Hardness', 'Heat Treatment Design', 'TTT'],
    cap: 8,
  },
  {
    id: 8,
    title: 'Hardenability – Jominy End Quench Test',
    category: 'Heat Treatment',
    difficulty: 'Hard',
    objective: 'Conduct the standard Jominy End Quench test and plot hardness vs. distance-from-quenched-end curve to characterize steel hardenability.',
    objectiveFull: 'Participants will austenitize a Jominy bar of supplied steel grade per ASTM A255 / ISO 642 protocol, mount it in the Jominy fixture, and quench the flat end with a water jet of specified flow rate and temperature. After cooling, two parallel flats are ground along the bar length and hardness readings (HRC) are taken at defined intervals from the quenched end. The resulting Jominy curve must be plotted and compared against published hardenability band data for the steel grade.',
    labEquipment: ['Jominy end-quench setup with water jet fixture', 'High-temperature furnace with controlled atmosphere', 'Surface grinder or flat-file preparation', 'Rockwell C hardness tester', 'Vernier calipers for measurement positioning'],
    evaluationCriteria: 'Correctness of Jominy test procedure per ASTM A255; accuracy and repeatability of hardness readings; quality of Jominy curve (smoothness, correct shape); comparison with published hardenability band; identification of martensite start/finish and critical hardness position; completeness of metallurgical interpretation.',
    tags: ['Jominy Test', 'Hardenability', 'ASTM A255', 'Hardness Profile', 'Martensite', 'CCT', 'End Quench'],
    cap: 8,
  },
  {
    id: 9,
    title: 'Retained Austenite Detection',
    category: 'Metallography',
    difficulty: 'Advanced',
    objective: 'Detect and quantify retained austenite in high-carbon steel after incomplete martensitic transformation using point counting and sub-zero treatment.',
    objectiveFull: 'Participants will characterize the microstructure of supplied high-carbon (or high-alloy tool) steel specimens in the as-quenched condition containing significant retained austenite. Quantification will be performed by point-count stereology per ASTM E562 on etched metallographic sections observed under optical microscope. The effect of sub-zero (cryogenic) treatment on retained austenite content will be evaluated by comparing before/after point-count results and hardness values.',
    labEquipment: ['Optical microscope with point counter (eyepiece grid or digital overlay)', 'Sub-zero treatment bath (dry ice + acetone, or liquid nitrogen dewar)', 'Metallography preparation station', 'Rockwell / Vickers hardness tester', 'High-carbon tool steel specimens'],
    evaluationCriteria: 'Statistical rigor of point-count measurement (minimum field count per ASTM E562); correct sample preparation and etching for austenite/martensite contrast; quantification of retained austenite reduction after sub-zero treatment; correlation with hardness changes; uncertainty analysis; quality of microstructural photography and annotation.',
    tags: ['Retained Austenite', 'Martensite', 'Point Counting', 'ASTM E562', 'Cryogenic Treatment', 'High-Carbon Steel', 'Stereology'],
    cap: 8,
  },
  {
    id: 10,
    title: 'Overheating & Grain Coarsening',
    category: 'Phase Transformations',
    difficulty: 'Medium',
    objective: 'Demonstrate grain coarsening and embrittlement from severe thermal overheating and measure hardness and impact toughness degradation.',
    objectiveFull: 'Participants will subject supplied plain carbon or low-alloy steel specimens to severe overheating (>1100°C, well above the normal austenitizing range) for controlled durations, then normalize or air-cool. Metallographic sections must reveal dramatic grain coarsening compared to properly heat-treated baseline. Hardness traverses and Charpy impact tests will quantify the resulting embrittlement. The characteristic Widmanstätten ferrite or coarse pearlite structure should be documented.',
    labEquipment: ['High-temperature furnace capable of >1100°C', 'Charpy impact tester', 'Metallography preparation bench', 'Optical microscope', 'Hardness tester (HV/HRB)', 'Charpy specimens (pre-notched)'],
    evaluationCriteria: 'Quantification of grain coarsening (ASTM grain size before vs. after, ΔASTM number); documentation of Widmanstätten or coarse structure; measured reduction in Charpy impact energy; correlation of grain size with toughness loss; quality of metallographic images; mechanistic explanation of overheating embrittlement; practical implications discussed.',
    tags: ['Grain Coarsening', 'Overheating', 'Charpy Impact', 'Toughness', 'Widmanstätten', 'Embrittlement', 'Phase Transformations'],
    cap: 8,
  },
  {
    id: 11,
    title: 'Delta Ferrite Measurement in Stainless Steel',
    category: 'Metallography',
    difficulty: 'Hard',
    objective: 'Quantify delta-ferrite volume fraction in austenitic stainless steel weldments or heat-treated samples using ferrite meter and quantitative metallography.',
    objectiveFull: 'Participants will characterize delta-ferrite in austenitic stainless steel weld beads or heat-treated samples (304/316 type) using two complementary methods: (a) magnetic ferrite meter measurement (Feritscope or equivalent) directly on polished surfaces, and (b) quantitative image analysis / point counting on electrolytically etched cross-sections. The two methods must be compared and discrepancies explained in terms of measurement volume and ferrite morphology (skeletal/lacy vs. globular).',
    labEquipment: ['Ferrite meter (Feritscope / Fischer FE 8e or equivalent)', 'Electro-etching unit with oxalic acid (10%)', 'Optical metallographic microscope', 'Metallography preparation station', 'SS weld coupon / heat-treated specimens'],
    evaluationCriteria: 'Agreement between ferrite meter and point-count / image analysis methods; correctness of electrolytic etching procedure; quality of contrast between delta-ferrite and austenite matrix; statistical adequacy of point-count measurement; interpretation of ferrite morphology and its origin (solidification mode, heat treatment); completeness of comparative analysis.',
    tags: ['Delta Ferrite', 'Stainless Steel', 'Ferrite Meter', 'Feritscope', 'Electrolytic Etching', 'Weldment', 'Volume Fraction'],
    cap: 8,
  },
];

export const CATEGORIES: { value: string; label: string }[] = [
  { value: 'All', label: 'All Tasks' },
  { value: 'Metallography', label: 'Metallography' },
  { value: 'Heat Treatment', label: 'Heat Treatment' },
  { value: 'Mechanical Testing', label: 'Mechanical Testing' },
  { value: 'Computation & AI', label: 'Computation & AI' },
  { value: 'Phase Transformations', label: 'Phase Transformations' },
];