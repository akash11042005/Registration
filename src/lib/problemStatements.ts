// ============================================================
// Problem Statements Data — AAYODHYAM 2026 (10 tasks)
// Sourced from the official "Aayodhyam Problem Statements &
// Working Instructions" document.
// ============================================================

export type ProblemCategory =
  | 'Metallography'
  | 'Heat Treatment'
  | 'Mechanical Testing'
  | 'Computation & AI'
  | 'Phase Transformations';

export type Difficulty = 'Medium' | 'Hard' | 'Advanced';

export type EvaluationMode = 'Offline' | 'Online/Offline';

export interface ProblemStatement {
  id: number;
  title: string;
  category: ProblemCategory;
  difficulty: Difficulty;
  mode: EvaluationMode;
  objective: string;
  objectiveFull: string;
  labEquipment: string[];
  evaluationCriteria: string;
  tags: string[];
  cap: number;
}

// General instructions applicable to every problem statement, per the
// official document — not yet surfaced in the UI; shown here so the
// content isn't lost, and easy to wire into the Problem Statements page
// as an intro banner later if wanted.
export const GENERAL_WORK_INSTRUCTIONS: string[] = [
  'All processes/results/treatment images must be captured with GPS location tracking enabled (geotagged photos).',
  'Teams must clearly mention whether the work was carried out inside the college laboratory or at an outside facility.',
  'Photographic/documentary evidence must be maintained at every stage of processing, not only for the final result.',
  'Sample identification stamp/marking must be maintained throughout processing.',
  'Teams must present their treatment parameters, evaluation and measurement methods, and final test results in the PPT.',
  'The exact material type and grade of the sample will be provided.',
  'This evaluation will be carried out at Walchand College of Engineering, Sangli.',
];

export const PROBLEM_STATEMENTS: ProblemStatement[] = [
  {
    id: 1,
    title: 'Decarburization Zone Measurement',
    category: 'Metallography',
    difficulty: 'Medium',
    mode: 'Offline',
    objective: 'Produce a decarburized zone in a steel specimen and accurately measure its depth under the microscope.',
    objectiveFull: 'The task is to produce a decarburized depth zone and measure it accurately. The decarburized zone must be clearly visible so its depth can be measured under a microscope. If the specimen requires mounting, it must be mounted prior to submission. Teams must provide a clear image showing the decarb zone, and sample identification stamp/marking must be maintained throughout processing. This evaluation will be carried out at Walchand College of Engineering, Sangli.',
    labEquipment: ['Muffle furnace', 'Metallographic mounting press', 'Polishing wheel', 'Optical microscope with calibrated eyepiece', 'Etchant for decarb-zone contrast', 'Sample marking/stamping tools'],
    evaluationCriteria: 'The team with a clearly visible decarburized zone and the maximum measured depth will be declared the winner.',
    tags: ['Decarburization', 'Offline', 'Optical Microscopy', 'Sample Marking', 'WCE Evaluation'],
    cap: 8,
  },
  {
    id: 2,
    title: 'Strain Ageing Demonstration',
    category: 'Mechanical Testing',
    difficulty: 'Hard',
    mode: 'Offline',
    objective: 'Determine and demonstrate the yield point phenomenon in a given sample, including its behavior after strain ageing.',
    objectiveFull: 'The team will receive a sample with its material type and grade specified. If the specimen requires mounting, it must be mounted prior to submission, and sample identification stamp/marking must be maintained throughout processing. Teams must communicate their requirements to the organizers prior to evaluation. This evaluation will be carried out at Walchand College of Engineering, Sangli.',
    labEquipment: ['Universal Testing Machine (UTM)', 'Ageing oven / oil bath', 'Tensile specimens as supplied', 'Data acquisition software'],
    evaluationCriteria: 'The team achieving the maximum reappearance of the yield point after strain ageing wins.',
    tags: ['Strain Ageing', 'Yield Point', 'Offline', 'UTM', 'WCE Evaluation'],
    cap: 8,
  },
  {
    id: 3,
    title: 'App-Based Automated Grain Size Measurement',
    category: 'Computation & AI',
    difficulty: 'Advanced',
    mode: 'Online/Offline',
    objective: 'Develop an app implementing both Planimetric and Intercept algorithms to extract grain size from a given image.',
    objectiveFull: 'Teams are required to develop an application that automatically measures grain size from a given image. Both applicable measurement methods must be implemented — the intercept and planimetric methods, per ASTM E112. This evaluation will be carried out in hybrid mode — teams have the choice to select online or offline evaluation.',
    labEquipment: ['Computer with development environment', 'Sample micrograph dataset (provided)'],
    evaluationCriteria: 'The team with the least error compared to the known reference grain size wins.',
    tags: ['Grain Size', 'ASTM E112', 'App Development', 'Online', 'Planimetric Method', 'Intercept Method'],
    cap: 8,
  },
  {
    id: 4,
    title: 'Heat Treatment for Target Mechanical Properties',
    category: 'Heat Treatment',
    difficulty: 'Advanced',
    mode: 'Offline',
    objective: 'Design and carry out a heat treatment to meet or exceed specified minimum mechanical property requirements.',
    objectiveFull: 'A material grade will be specified along with minimum required mechanical properties (tensile strength, yield strength, elongation). Teams must design and carry out a heat treatment to meet or exceed these minimum requirements. Sample identification stamp/marking must be maintained throughout processing. This evaluation will be carried out at Walchand College of Engineering, Sangli.',
    labEquipment: ['Heat treatment furnaces', 'Quenching tanks', 'Universal Testing Machine (UTM)', 'Hardness tester'],
    evaluationCriteria: 'The team achieving the maximum mechanical properties without compensating the minimum requirements will be declared winner.',
    tags: ['Heat Treatment', 'Mechanical Properties', 'Offline', 'Quenching', 'Tempering', 'WCE Evaluation'],
    cap: 8,
  },
  {
    id: 5,
    title: 'Cast Iron Nodularity',
    category: 'Metallography',
    difficulty: 'Medium',
    mode: 'Online/Offline',
    objective: 'Develop an app-based image analysis tool to evaluate a cast iron sample for graphite nodule count and percentage nodularity.',
    objectiveFull: 'Teams must evaluate the sample for graphite nodule count and % nodularity using an image-processing application developed by the team. Nodularity and nodule count must be assessed per the applicable standard, ISO 945 (graphite classification in cast iron). This evaluation will be carried out in hybrid mode — teams have the choice to select online or offline evaluation.',
    labEquipment: ['Computer with development environment', 'Optical microscope', 'Metallographic preparation station', 'Etchant for graphite contrast'],
    evaluationCriteria: 'The team with the measurement closest to the given quantity of nodules wins.',
    tags: ['Cast Iron', 'Nodularity', 'ISO 945', 'Graphite', 'Online', 'App Development'],
    cap: 8,
  },
  {
    id: 6,
    title: 'Grain Size Refinement',
    category: 'Phase Transformations',
    difficulty: 'Medium',
    mode: 'Offline',
    objective: 'Refine the grain size of a provided sample, which initially has a coarser grain size than the target.',
    objectiveFull: 'Refine the grain size of a provided sample, which initially has a coarser grain size than desired. Initial grain size must be recorded with photographic evidence before any processing, and teams must report the method used for grain size measurement. Final (refined) grain size must also be recorded with photographic evidence, with both initial and final evidence shown together for comparison. Sample identification stamp/marking must be maintained throughout processing. This evaluation will be carried out at Walchand College of Engineering, Sangli.',
    labEquipment: ['Heat treatment furnace', 'Optical microscope', 'Metallography preparation bench'],
    evaluationCriteria: 'The team achieving the finest grain size / grain size number will be declared winner.',
    tags: ['Grain Refinement', 'ASTM E112', 'Offline', 'Thermomechanical Processing', 'WCE Evaluation'],
    cap: 8,
  },
  {
    id: 7,
    title: 'AI Driven Material Identification via Spark Testing',
    category: 'Computation & AI',
    difficulty: 'Advanced',
    mode: 'Online/Offline',
    objective: 'Build an application that identifies material type from spark pattern testing.',
    objectiveFull: 'Build an application that identifies material type from spark pattern testing. The application must classify and display the type of material identified, capturing the spark pattern via live video/images in real time. Evaluation will be carried out across at least five different material grades. Teams must justify their ML model selection criteria and the libraries/frameworks used. This evaluation will be carried out in hybrid mode — teams have the choice to select online or offline evaluation.',
    labEquipment: ['Computer with development environment', 'Camera/imaging setup for spark capture'],
    evaluationCriteria: 'The team that accurately predicts the material for the highest number of spark videos/images wins.',
    tags: ['Spark Testing', 'Material Identification', 'AI', 'Machine Learning', 'Online'],
    cap: 8,
  },
  {
    id: 8,
    title: 'Low Temperature Impact Toughness Improvement',
    category: 'Mechanical Testing',
    difficulty: 'Hard',
    mode: 'Offline',
    objective: 'Apply a suitable treatment to a sample to maximize its low-temperature impact toughness.',
    objectiveFull: 'Apply any suitable treatment to a sample to maximize its low-temperature impact toughness. Teams will be provided with a reference sample previously tested as a baseline. Testing will be conducted at subzero temperatures from -50°C to 0°C. Test samples will be provided with a pre-machined V-notch already prepared per ASTM E23 — the V-notch must be retained by the team and verified against the standard. This evaluation will be carried out at Walchand College of Engineering, Sangli.',
    labEquipment: ['Charpy impact tester', 'Subzero cooling setup', 'Pre-notched test samples (as supplied)'],
    evaluationCriteria: 'The group with evidence of higher impact toughness values at lower temperatures (e.g. -40°C) will be treated as winner.',
    tags: ['Impact Toughness', 'ASTM E23', 'Subzero Testing', 'Offline', 'Charpy Test', 'WCE Evaluation'],
    cap: 8,
  },
  {
    id: 9,
    title: 'Precision Surface Hardening by Carburization',
    category: 'Heat Treatment',
    difficulty: 'Advanced',
    mode: 'Offline',
    objective: 'Perform controlled case carburizing on a given sample to meet target surface hardness while keeping case depth within a specified limit.',
    objectiveFull: 'Teams must perform controlled case carburizing on a given sample to meet target surface hardness requirements while keeping the case depth within a specified maximum limit. The minimum carburization depth per standard specifications must be met, and the carburization zone must be clearly visible and marked on the microphotograph. Surface hardness must fall strictly within the range of 35 to 40 HRC. Teams needing mounting equipment for microscope inspection must bring their own. Sample identification stamp/marking must be maintained throughout processing. This evaluation will be carried out at Walchand College of Engineering, Sangli.',
    labEquipment: ['Carburizing furnace', 'Rockwell hardness tester (HRC)', 'Optical microscope', 'Metallography preparation station'],
    evaluationCriteria: 'The team that achieves the highest valid carburization depth — while meeting the minimum required surface hardness (HRC) and respecting the maximum depth limit — wins.',
    tags: ['Carburization', 'Surface Hardening', 'ASTM E1245', 'Offline', 'Case Depth', 'WCE Evaluation'],
    cap: 8,
  },
  {
    id: 10,
    title: 'App-Based Delta Ferrite Measurement in Stainless Steel',
    category: 'Metallography',
    difficulty: 'Hard',
    mode: 'Online/Offline',
    objective: 'Develop an app-based image processing tool to determine the quantity of delta ferrite in a stainless steel sample.',
    objectiveFull: 'Determine the quantity of ferrite in the sample using an image-processing application developed by the team. Teams must build this application implementing ASTM E562, considering all formulas present in the standard. Sample identification stamp/marking must be maintained throughout processing. This evaluation will be carried out in hybrid mode — teams have the choice to select online or offline evaluation.',
    labEquipment: ['Computer with development environment', 'Sample stainless steel micrographs', 'Image-processing libraries'],
    evaluationCriteria: 'The team with the measurement closest to the given quantity of ferrite wins.',
    tags: ['Delta Ferrite', 'Stainless Steel', 'ASTM E562', 'Online', 'App Development', 'Image Processing'],
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