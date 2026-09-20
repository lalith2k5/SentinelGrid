import { KnowledgeDocument, KnowledgeCorpusMetadata } from './types.ts';

export const CORPUS_METADATA: KnowledgeCorpusMetadata = {
  corpusId: 'CORPUS-EMERGENCY-OPS-V1',
  name: 'SentinelGrid Offline Emergency Operations Knowledge Corpus',
  version: '1.0.0',
  description: 'Deterministic local emergency procedures, first aid protocols, disaster mitigation guidelines, and responder safety standards.',
  lastUpdated: '2026-03-01T00:00:00.000Z',
  totalDocuments: 25,
  activeDocuments: 25,
  categoriesCount: 23,
  isOffline: true,
  provenanceStatement: 'LOCAL DEMONSTRATION GUIDANCE (Offline-First Operational Decision Support). Compiled from standard public disaster management and emergency triage practices.',
  medicalSafetyNotice: 'DECISION SUPPORT ONLY. This offline guidance is derived from the local emergency knowledge corpus (v1.0.0). It does not constitute clinical diagnosis or prescription. Always verify with trained medical and emergency responders.'
};

export const DEFAULT_KNOWLEDGE_CORPUS: KnowledgeDocument[] = [
  {
    id: 'DOC-MED-TRAUMA-001',
    title: 'Severe External Bleeding & Hemorrhage Control',
    category: 'TRAUMA_BLEEDING',
    subcategory: 'Immediate Hemorrhage Control',
    version: '1.0.0',
    source: 'Tactical Emergency Casualty & First Aid Standards (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-15T00:00:00.000Z',
    lastReviewed: '2026-01-10T00:00:00.000Z',
    priority: 10,
    status: 'ACTIVE',
    summary: 'Procedures for managing life-threatening external arterial and venous bleeding using direct pressure, pressure dressings, and extremity tourniquets.',
    content: `# Severe External Bleeding & Hemorrhage Control Protocol

## 1. Overview
Uncontrolled severe hemorrhage is the leading preventable cause of death in trauma incidents. Rapid intervention is paramount.

## 2. Immediate Assessment
- Ensure scene safety before approaching casualty.
- Expose the wound to identify the exact source of bleeding.
- Distinguish between pulsatile/spurting arterial bleeding (immediate priority) and steady venous flow.

## 3. Intervention Sequence
1. **Direct Pressure**: Apply firm, continuous manual pressure directly over the bleeding site with clean gauze or cloth.
2. **Pressure Dressing**: If bleeding continues, pack wound tightly (except head/chest cavities) with hemostatic or standard gauze and wrap securely with elastic bandage.
3. **Tourniquet Application**:
   - For severe extremity bleeding unresponsive to direct pressure or in mass casualty settings.
   - Apply 2 to 3 inches proximal to the wound (above the joint if near an articulation).
   - Tighten until bleeding stops and distal pulse is absent.
   - Mark the time of application clearly on the patient's forehead or tourniquet band (e.g. 'TK 14:30').
   - **NEVER loosen or remove a tourniquet in the field without direct surgical oversight.**

## 4. Shock Mitigation
- Lay patient flat with legs elevated if no spinal trauma is suspected.
- Maintain body warmth with thermal blankets.
- Monitor airway and mental status continuously.`,
    keywords: ['bleeding', 'hemorrhage', 'arterial', 'tourniquet', 'trauma', 'wound', 'blood', 'laceration', 'pressure dressing', 'hemostatic'],
    tags: ['FIRST_AID', 'TRAUMA', 'BLEEDING', 'P1_CRITICAL', 'LIFE_THREATENING'],
    hazards: ['BIOHAZARD', 'BLOODBORNE_PATHOGENS'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['MEDICAL', 'ROAD_ACCIDENT', 'STRUCTURAL_COLLAPSE', 'SECURITY', 'OTHER'],
    actionSteps: [
      'Apply immediate direct pressure over bleeding site with clean dressing.',
      'Pack wound cavity tightly with sterile gauze if anatomical location allows.',
      'Apply mechanical windlass tourniquet 2-3 inches above wound for limb hemorrhage.',
      'Record exact time of tourniquet application (e.g. TK 14:30).',
      'Keep patient warm and elevate legs if no head/spinal injury is suspected.'
    ],
    safetyPrecautions: [
      'Wear protective gloves and eye protection to prevent bloodborne pathogen exposure.',
      'Do not apply tourniquet directly over joints (elbows or knees).'
    ],
    contraindications: [
      'Do not remove an applied tourniquet in the field.',
      'Do not pack wounds inside chest, abdomen, or skull cavities.'
    ],
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-BURNS-002',
    title: 'Thermal, Chemical & Electrical Burn Protocols',
    category: 'BURNS',
    subcategory: 'Burn Injury Management',
    version: '1.0.0',
    source: 'Disaster Field Medical Guidelines (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-02-01T00:00:00.000Z',
    lastReviewed: '2026-01-15T00:00:00.000Z',
    priority: 9,
    status: 'ACTIVE',
    summary: 'First responder protocols for managing thermal burns, chemical skin contacts, and electrical burns while preventing hypothermia and further tissue damage.',
    content: `# Thermal, Chemical & Electrical Burn Management

## 1. Safety & Scene Control
- Ensure electrical power is isolated or chemical source neutralized before touching the patient.
- Stop the burning process immediately (smother flames, brush dry chemicals off, flush liquid chemicals).

## 2. Thermal Burns
- **Cool the Burn**: Irrigate with clean, room-temperature or cool running water for 10-20 minutes.
- **NEVER use ice, ice water, butter, or greasy ointments.** Ice causes vasoconstriction and worsens tissue necrosis.
- Cover loosely with sterile, non-adherent dry dressings or clean dry plastic wrap.
- Remove jewelry, tight clothing, or belts near burned areas before edema develops.

## 3. Chemical Burns
- Brush off dry powder chemicals before liquid flushing.
- Irrigate with continuous low-pressure water for at least 20-30 minutes.
- Preserve chemical containers/labels for HazMat identification if safe.

## 4. Electrical Burns
- Always assume high voltage entry and exit wounds exist.
- Continuous cardiac rhythm monitoring is required due to arrhythmia risk.
- Treat for potential spinal injury if the victim was thrown by electrical shock.`,
    keywords: ['burn', 'thermal', 'chemical burn', 'electrical burn', 'fire', 'scald', 'cooling', 'decontamination', 'blister'],
    tags: ['BURNS', 'FIRE', 'FIRST_AID', 'HAZMAT', 'MEDICAL'],
    hazards: ['OPEN_FLAME', 'ELECTRICAL_SHOCK', 'HAZARDOUS_GAS', 'CHEMICAL_SPILL'],
    severityLevels: ['P1', 'P2', 'P3', 'CRITICAL', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['FIRE', 'HAZMAT', 'MEDICAL', 'ROAD_ACCIDENT'],
    actionSteps: [
      'Extinguish fire or isolate chemical/electrical source.',
      'Cool thermal burns with clean cool running water for 10-20 minutes.',
      'Brush off dry chemicals prior to water irrigation; flush liquids for 20+ minutes.',
      'Remove constrictive rings, watches, and clothing before swelling starts.',
      'Cover burn loosely with clean sterile non-adherent dressing.'
    ],
    safetyPrecautions: [
      'Do not apply ice, iced water, or greasy ointments to burns.',
      'Monitor for hypothermia when cooling large surface area burns.'
    ],
    contraindications: [
      'Do NOT use ice or freezing water on burn wounds.',
      'Do NOT pop, puncture, or debride intact blisters in the field.'
    ],
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-FRACTURE-003',
    title: 'Extremity Fractures & Spinal Immobilization',
    category: 'FRACTURES_DISLOCATION',
    subcategory: 'Orthopedic & Spinal Stabilization',
    version: '1.0.0',
    source: 'Pre-Hospital Trauma Care Field Manual (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-20T00:00:00.000Z',
    lastReviewed: '2026-01-20T00:00:00.000Z',
    priority: 8,
    status: 'ACTIVE',
    summary: 'Stabilization protocols for open/closed limb fractures, joint dislocations, and manual cervical spine immobilization after blunt force trauma or falls.',
    content: `# Extremity Fractures & Spinal Immobilization Protocol

## 1. Spinal Protection
- Any blunt trauma, fall > 2 meters, high-speed vehicle impact, or unconscious patient must be managed with cervical spine precautions.
- Maintain head and neck in neutral alignment without traction. Do not turn head if patient reports severe pain or resistance.
- Log-roll patient with at least 3 responders keeping head, shoulders, and hips aligned.

## 2. Extremity Fracture Splinting
- **Check PMS Before & After**: Pulse, Motor, Sensory function distal to the fracture site.
- Immobilize the joint above and the joint below the fracture site.
- For open fractures: Cover bone ends with sterile moist or dry dressing; do not push bone back into tissue.
- Splint in position found unless pulse is absent and transport is delayed.`,
    keywords: ['fracture', 'broken bone', 'dislocation', 'splint', 'spine', 'c-spine', 'immobilization', 'neck', 'fall', 'trauma'],
    tags: ['FRACTURES', 'TRAUMA', 'SPINAL', 'FIRST_AID'],
    hazards: ['STRUCTURAL_COLLAPSE', 'FALL_HAZARD'],
    severityLevels: ['P1', 'P2', 'P3', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['ROAD_ACCIDENT', 'STRUCTURAL_COLLAPSE', 'LANDSLIDE', 'MEDICAL', 'OTHER'],
    actionSteps: [
      'Maintain manual in-line stabilization of the cervical spine.',
      'Assess distal pulses, motor ability, and sensation (PMS).',
      'Apply padded rigid splint extending above and below the injured joint.',
      'Cover open fracture sites with sterile dressing.',
      'Re-check distal PMS immediately after securing splint.'
    ],
    safetyPrecautions: [
      'Do not move patient with suspected spinal injury without full rigid backboard or vacuum mattress unless in immediate mortal danger.'
    ],
    contraindications: [
      'Do NOT attempt to force or straighten a severely angulated fracture against resistance.',
      'Do NOT push exposed bone fragments back under the skin.'
    ],
    createdAt: '2025-01-20T00:00:00.000Z',
    updatedAt: '2026-01-20T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-UNCONSCIOUS-004',
    title: 'Unconscious Casualty & Airway Management (Recovery Position)',
    category: 'UNCONSCIOUSNESS',
    subcategory: 'Airway & Consciousness Assessment',
    version: '1.0.0',
    source: 'Basic Life Support & Airway Protocols (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-10T00:00:00.000Z',
    lastReviewed: '2026-01-25T00:00:00.000Z',
    priority: 10,
    status: 'ACTIVE',
    summary: 'Managing an unresponsive breathing casualty using airway maneuvers and recovery positioning, and identifying respiratory arrest requiring CPR.',
    content: `# Unconscious Casualty & Airway Management

## 1. AVPU Assessment
- **A**: Alert
- **V**: Responds to Voice
- **P**: Responds to Pain
- **U**: Unresponsive

## 2. Airway Opening
- **No Trauma**: Head-tilt chin-lift maneuver.
- **Suspected Spinal Trauma**: Modified jaw-thrust maneuver without neck extension.
- Clear vomitus or secretions with suction or gentle finger sweep only if solid object is visibly accessible.

## 3. Breathing Evaluation
- Look, listen, and feel for normal chest rise and air flow for up to 10 seconds.
- **Breathing Normally**: Place in lateral Recovery Position to prevent tongue obstruction and aspiration of vomitus.
- **No Breathing / Agonal Gasping**: Initiate immediate High-Quality Cardiopulmonary Resuscitation (CPR) (30 compressions : 2 breaths or continuous hands-only compressions).`,
    keywords: ['unconscious', 'unresponsive', 'airway', 'cpr', 'recovery position', 'breathing', 'fainting', 'coma', 'choking'],
    tags: ['UNCONSCIOUS', 'AIRWAY', 'CPR', 'LIFE_THREATENING', 'P1_CRITICAL'],
    hazards: ['ASPIRATION', 'AIRWAY_OBSTRUCTION'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['MEDICAL', 'ROAD_ACCIDENT', 'HAZMAT', 'STRUCTURAL_COLLAPSE'],
    actionSteps: [
      'Assess responsiveness using voice and shoulder tap.',
      'Open airway with head-tilt chin-lift or jaw-thrust for trauma.',
      'Check breathing for 10 seconds.',
      'If breathing normally, roll into stable lateral recovery position.',
      'If not breathing or agonal gasps, begin immediate CPR at 100-120 bpm.'
    ],
    safetyPrecautions: [
      'Continually monitor breathing in recovery position; roll back if breathing ceases.'
    ],
    contraindications: [
      'Do NOT place in recovery position if severe spinal injury is suspected unless vomiting threatens immediate airway occlusion.'
    ],
    createdAt: '2025-01-10T00:00:00.000Z',
    updatedAt: '2026-01-25T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-RESPIRATORY-005',
    title: 'Acute Respiratory Distress & Airway Obstruction',
    category: 'RESPIRATORY_DISTRESS',
    subcategory: 'Respiratory Emergencies',
    version: '1.0.0',
    source: 'Emergency Medical Dispatch & Field Protocols (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-02-05T00:00:00.000Z',
    lastReviewed: '2026-02-01T00:00:00.000Z',
    priority: 9,
    status: 'ACTIVE',
    summary: 'Evaluation and first-aid response for acute asthma exacerbation, smoke inhalation, foreign body airway obstruction (Heimlich maneuver), and anaphylaxis.',
    content: `# Acute Respiratory Distress & Airway Obstruction

## 1. Foreign Body Airway Obstruction (Choking)
- **Mild Obstruction (Victim can cough/speak)**: Encourage forceful coughing. Do not intervene manually.
- **Severe Obstruction (Victim cannot breathe, silent cough, cyanosis)**:
  - Deliver 5 sharp back blows between shoulder blades.
  - Deliver 5 abdominal thrusts (Heimlich maneuver) inward and upward.
  - Repeat 5 & 5 sequence until object is expelled or casualty becomes unconscious.
  - If casualty loses consciousness, transition to CPR and inspect oral cavity during ventilations.

## 2. Smoke Inhalation & Toxic Vapor Distress
- Evacuate casualty to clean ambient air immediately.
- Administer high-flow humidified oxygen if equipped.
- Position patient upright (high Fowler position) to reduce work of breathing.
- Watch for stridor, hoarseness, and facial singeing indicating upper airway thermal burn.`,
    keywords: ['respiratory', 'breathing', 'choking', 'asthma', 'smoke inhalation', 'stridor', 'heimlich', 'anaphylaxis', 'wheezing', 'oxygen'],
    tags: ['RESPIRATORY', 'AIRWAY', 'CHOKING', 'INHALATION', 'MEDICAL'],
    hazards: ['HAZARDOUS_GAS', 'SMOKE', 'TOXIC_FUMES'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['MEDICAL', 'FIRE', 'HAZMAT', 'ROAD_ACCIDENT'],
    actionSteps: [
      'Move patient to fresh, uncontaminated air.',
      'Position conscious patient in comfortable upright sitting position.',
      'Perform 5 back blows followed by 5 abdominal thrusts for severe choking.',
      'Assist patient with prescribed bronchodilator or epinephrine auto-injector if authorized.',
      'Monitor oxygen saturation and ventilatory effort continuously.'
    ],
    safetyPrecautions: [
      'Do not enter smoke-filled or gas-filled structures without self-contained breathing apparatus (SCBA).'
    ],
    contraindications: [
      'Do NOT perform abdominal thrusts on infants under 1 year (use 5 back blows and 5 chest thrusts).'
    ],
    createdAt: '2025-02-05T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-CARDIAC-006',
    title: 'Non-Traumatic Chest Pain & Cardiac Alert Protocols',
    category: 'CARDIAC_CHEST_PAIN',
    subcategory: 'Cardiovascular Emergencies',
    version: '1.0.0',
    source: 'Cardiovascular Life Support Protocols (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-25T00:00:00.000Z',
    lastReviewed: '2026-02-05T00:00:00.000Z',
    priority: 9,
    status: 'ACTIVE',
    summary: 'Response guidelines for acute coronary syndrome, chest tightness, radiating shoulder pain, and preparing automated external defibrillators (AED).',
    content: `# Acute Chest Pain & Suspected Cardiac Event

## 1. Clinical Presentation
- Crushing retrosternal chest pain, tightness, pressure, radiating to jaw, neck, left arm, or back.
- Associated diaphoresis, shortness of breath, nausea, or profound weakness.

## 2. Immediate Operational Steps
1. Keep patient resting quietly; prohibit physical exertion.
2. Place in semi-recumbent position with knees slightly bent.
3. Loosen tight clothing around neck and waist.
4. Prepare Automated External Defibrillator (AED) and emergency resuscitation kit nearby.
5. If patient has prescribed nitroglycerin and systolic BP is adequate, assist with administration.
6. Provide rapid dispatch alert for Advanced Life Support (ALS) medical transport.`,
    keywords: ['cardiac', 'chest pain', 'heart attack', 'angina', 'infarction', 'aed', 'defibrillator', 'cpr', 'pulse'],
    tags: ['CARDIAC', 'CHEST_PAIN', 'AED', 'P1_CRITICAL', 'MEDICAL'],
    hazards: ['CARDIAC_ARREST'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['MEDICAL', 'OTHER'],
    actionSteps: [
      'Have patient stop all exertion and sit in resting position.',
      'Deploy AED to patient side and power on in case of sudden collapse.',
      'Loosen constrictive clothing and provide reassuring environment.',
      'Dispatch highest available ALS ambulance resource.',
      'Prepare for immediate CPR if patient becomes unresponsive.'
    ],
    safetyPrecautions: [
      'Ensure nobody touches patient during AED rhythm analysis and shock delivery.'
    ],
    contraindications: [
      'Do NOT allow patient to walk or exert themselves physically.'
    ],
    createdAt: '2025-01-25T00:00:00.000Z',
    updatedAt: '2026-02-05T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-SEIZURE-007',
    title: 'Active Seizure & Post-Ictal State Care',
    category: 'SEIZURES',
    subcategory: 'Neurological Emergencies',
    version: '1.0.0',
    source: 'Field First Aid Reference (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-18T00:00:00.000Z',
    lastReviewed: '2026-01-28T00:00:00.000Z',
    priority: 8,
    status: 'ACTIVE',
    summary: 'Protecting seizing casualties from secondary trauma, timing convulsions, airway safeguarding during post-ictal confusion, and status epilepticus alerts.',
    content: `# Active Seizure Management Protocol

## 1. During the Convulsive Phase
- **Protect From Injury**: Move hard, sharp, or hot objects away from the patient.
- Place a soft cushion or jacket under the patient's head.
- **DO NOT restrain limbs.**
- **DO NOT force any object or fingers into the patient's mouth.** (Risk of dental fracture and responder bite trauma).
- Time the duration of the seizure.

## 2. Post-Ictal Phase (After Convulsions Stop)
- Roll the patient into the lateral recovery position to drain saliva and keep the airway patent.
- Expect grogginess, confusion, and temporary disorientation.
- Check for trauma sustained during seizure (tongue lacerations, head contusions).
- Treat prolonged seizure (> 5 minutes) or repeated seizures without recovery as medical emergency (Status Epilepticus).`,
    keywords: ['seizure', 'convulsion', 'epilepsy', 'fits', 'post-ictal', 'neurological', 'tremors', 'unconscious'],
    tags: ['SEIZURE', 'FIRST_AID', 'NEUROLOGY', 'MEDICAL'],
    hazards: ['SECONDARY_TRAUMA', 'AIRWAY_OBSTRUCTION'],
    severityLevels: ['P1', 'P2', 'P3', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['MEDICAL', 'OTHER'],
    actionSteps: [
      'Clear surrounding area of hazardous objects.',
      'Place soft padding under patient head.',
      'Record start and end time of convulsions.',
      'Turn into lateral recovery position once muscle spasms cease.',
      'Monitor airway continuously throughout recovery.'
    ],
    safetyPrecautions: [
      'Never place fingers, spoons, or bite sticks into mouth of seizing patient.'
    ],
    contraindications: [
      'Do NOT restrain seizing limbs or try to hold patient down.',
      'Do NOT offer food or fluids until patient is fully alert and oriented.'
    ],
    createdAt: '2025-01-18T00:00:00.000Z',
    updatedAt: '2026-01-28T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-HEAT-008',
    title: 'Heat Exhaustion & Heat Stroke Management',
    category: 'ENVIRONMENTAL_HEAT',
    subcategory: 'Thermal Environmental Emergencies',
    version: '1.0.0',
    source: 'Wilderness & Environmental Emergency Protocol (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-02-10T00:00:00.000Z',
    lastReviewed: '2026-02-10T00:00:00.000Z',
    priority: 8,
    status: 'ACTIVE',
    summary: 'Distinguishing heat exhaustion from life-threatening heat stroke, active cooling protocols, and hydration guidelines.',
    content: `# Heat-Related Illnesses Protocol

## 1. Heat Exhaustion vs Heat Stroke
- **Heat Exhaustion**: Heavy sweating, cold/pale/clammy skin, dizziness, nausea, normal mental status.
- **Heat Stroke (CRITICAL EMERGENCY)**: High core temperature (> 40°C / 104°F), hot/dry or sweaty skin, confusion, delirium, seizures, coma.

## 2. Immediate Action for Heat Stroke
- **Cool First, Transport Second**: Rapid active cooling is life-saving.
- Move patient immediately into shade or air-conditioned vehicle.
- Remove excess heavy clothing.
- Immerse in cold water bath or apply cold wet towels/ice packs to neck, armpits, and groin.
- Fan vigorously to maximize evaporative cooling.`,
    keywords: ['heat stroke', 'heat exhaustion', 'hyperthermia', 'sunstroke', 'cooling', 'dehydration', 'high temperature'],
    tags: ['HEAT', 'ENVIRONMENTAL', 'HYPERTHERMIA', 'FIRST_AID'],
    hazards: ['ENVIRONMENTAL_HEAT', 'DEHYDRATION'],
    severityLevels: ['P1', 'P2', 'P3', 'CRITICAL', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['MEDICAL', 'EVACUATION_SHELTER', 'OTHER'],
    actionSteps: [
      'Move patient immediately to shaded or cool area.',
      'Strip outer layers of clothing.',
      'Apply cold wet compresses or ice packs to axillae, groin, and neck.',
      'Provide small sips of cool electrolyte fluid if fully conscious.',
      'Evacuate immediately via ALS if altered mental status is present.'
    ],
    safetyPrecautions: [
      'Do not give oral fluids to an altered or unconscious patient.'
    ],
    contraindications: [
      'Do NOT administer antipyretic medications (aspirin/acetaminophen) for environmental heat stroke.'
    ],
    createdAt: '2025-02-10T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-COLD-009',
    title: 'Hypothermia & Cold Water Immersion Protocols',
    category: 'ENVIRONMENTAL_COLD',
    subcategory: 'Cold Injuries & Submersion',
    version: '1.0.0',
    source: 'Cold Weather Operations & Immersion Manual (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-02-12T00:00:00.000Z',
    lastReviewed: '2026-02-12T00:00:00.000Z',
    priority: 8,
    status: 'ACTIVE',
    summary: 'Rewarming protocols for mild to severe hypothermia, preventing ventricular fibrillation after immersion, and handling frostbite.',
    content: `# Hypothermia & Cold Immersion Protocol

## 1. Staging of Hypothermia
- **Mild (32-35°C)**: Vigorous shivering, apathy, clumsy speech.
- **Moderate (28-32°C)**: Shivering stops, stupor, muscle rigidity.
- **Severe (< 28°C)**: Unconscious, barely perceptible pulse, dilated pupils.

## 2. Gentle Handling Rule
- Hypothermic heart myocardium is extremely irritable.
- **Handle casualty very gently**; rough movement or abrupt jostling can trigger fatal ventricular fibrillation.

## 3. Passive & Active Rewarming
- Remove wet garments and insulate in dry thermal sleeping bags and windproof vapor barriers.
- Apply chemical heat packs to torso only (axillae, chest, back), NOT directly to bare skin or extremities.
- Do NOT rub frostbitten tissue.`,
    keywords: ['hypothermia', 'cold immersion', 'freezing', 'frostbite', 'rewarming', 'shivering', 'submersion', 'flood water'],
    tags: ['COLD', 'HYPOTHERMIA', 'FLOOD', 'ENVIRONMENTAL', 'FIRST_AID'],
    hazards: ['COLD_TEMPERATURE', 'FLOOD_WATER'],
    severityLevels: ['P1', 'P2', 'P3', 'CRITICAL', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['FLOOD', 'MEDICAL', 'SEARCH_AND_RESCUE', 'OTHER'],
    actionSteps: [
      'Gently extract casualty from cold/wet environment.',
      'Remove wet garments and wrap in multiple layers of dry insulation.',
      'Apply warm packs wrapped in cloth to torso/groin.',
      'Protect head and neck with warm covering.',
      'Transfer with minimal physical disturbance.'
    ],
    safetyPrecautions: [
      'Avoid rapid rewarming of extremities which can cause core temperature drop (afterdrop).'
    ],
    contraindications: [
      'Do NOT rub or massage frozen or frostbitten skin.',
      'Do NOT allow patient to walk on frostbitten feet.'
    ],
    createdAt: '2025-02-12T00:00:00.000Z',
    updatedAt: '2026-02-12T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-SHOCK-010',
    title: 'Hypovolemic & Anaphylactic Shock Mitigation',
    category: 'DEHYDRATION_SHOCK',
    subcategory: 'Circulatory Collapse & Resuscitation',
    version: '1.0.0',
    source: 'Emergency Medical Field Diagnostics (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-30T00:00:00.000Z',
    lastReviewed: '2026-01-30T00:00:00.000Z',
    priority: 9,
    status: 'ACTIVE',
    summary: 'Recognition and pre-hospital support for hypovolemic, cardiogenic, and distributive shock in disaster casualties.',
    content: `# Shock Management Protocol

## 1. Pathophysiology & Recognition
- Inadequate cellular perfusion causing organ ischemia.
- Tachycardia (> 100 bpm), weak thready pulse, pale/cold/clammy skin, delayed capillary refill (> 2s), tachypnea, hypotension.

## 2. Immediate Management
1. Control active hemorrhage immediately (direct pressure/tourniquet).
2. Maintain patent airway and deliver supplemental high-flow oxygen.
3. Keep casualty in supine position with lower limbs elevated 20-30 cm (unless contraindicated by respiratory distress or spinal trauma).
4. Insulate patient against hypothermia.
5. Provide prompt emergency dispatch for intravenous fluid resuscitation.`,
    keywords: ['shock', 'hypovolemia', 'perfusion', 'blood pressure', 'tachycardia', 'anaphylaxis', 'pallor', 'collapse'],
    tags: ['SHOCK', 'TRAUMA', 'MEDICAL', 'P1_CRITICAL'],
    hazards: ['CIRCULATORY_COLLAPSE'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['MEDICAL', 'ROAD_ACCIDENT', 'STRUCTURAL_COLLAPSE', 'OTHER'],
    actionSteps: [
      'Eliminate source of volume loss (stop external hemorrhage).',
      'Position patient flat with legs elevated (Trendelenburg/shock position).',
      'Maintain core body temperature with insulated blankets.',
      'Check vital signs every 3 to 5 minutes.',
      'Request priority ALS emergency transport.'
    ],
    safetyPrecautions: [
      'Do not elevate legs if pelvis fracture, spinal fracture, or head injury is suspected.'
    ],
    contraindications: [
      'Do NOT give oral food or drinks to patients in shock.'
    ],
    createdAt: '2025-01-30T00:00:00.000Z',
    updatedAt: '2026-01-30T00:00:00.000Z'
  },
  {
    id: 'DOC-DIS-FLOOD-011',
    title: 'Flood Rapid Water Evacuation & Perimeter Safety',
    category: 'NATURAL_FLOOD',
    subcategory: 'Hydrological Disaster Response',
    version: '1.0.0',
    source: 'National Flood Disaster Operations Guide (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-05T00:00:00.000Z',
    lastReviewed: '2026-02-15T00:00:00.000Z',
    priority: 10,
    status: 'ACTIVE',
    summary: 'Operational protocols for flash flood zones, swiftwater hazard perimeters, vehicle submersion dangers, and evacuation corridor safety.',
    content: `# Flood & Swiftwater Hazard Protocol

## 1. Swiftwater Hazard Rules
- **Rule of 6**: Just 6 inches (15 cm) of fast-moving water can knock an adult off their feet.
- **Rule of 12**: 12 inches (30 cm) of moving water will carry away a passenger car.
- **Rule of 24**: 24 inches (60 cm) will sweep away trucks and heavy SUVs.
- **Turn Around, Don't Drown**: Never allow emergency personnel or civilians to drive through water of unknown depth.

## 2. Ingress & Perimeter Discipline
- Establish warm/cold boundary markers at high ground.
- Responders operating within 10 feet of moving water MUST wear Personal Flotation Devices (PFDs) and helmets.
- Watch for hidden hazards: open manholes, submerged fences, floating debris, and downed energized power lines.
- Treat all flood water as contaminated biohazard waste.`,
    keywords: ['flood', 'water', 'submersion', 'swiftwater', 'drowning', 'flash flood', 'evacuation', 'pfd', 'washout', 'river'],
    tags: ['FLOOD', 'SWIFTWATER', 'DISASTER', 'EVACUATION', 'HAZARD_ZONE'],
    hazards: ['FLOOD', 'ELECTRICAL_SHOCK', 'STRUCTURAL_COLLAPSE', 'BIOHAZARD'],
    severityLevels: ['P1', 'P2', 'P3', 'CRITICAL', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['FLOOD', 'LANDSLIDE', 'ROAD_ACCIDENT', 'EVACUATION_SHELTER'],
    actionSteps: [
      'Establish safety perimeter on confirmed dry ground above flood line.',
      'Mandate PFDs for all personnel within 10 ft of water margin.',
      'Barricade submerged roads and underpasses immediately.',
      'Deploy swiftwater rescue boat units for stranded residents.',
      'Decontaminate personnel and equipment after flood contact.'
    ],
    safetyPrecautions: [
      'Do not walk, wade, or drive through moving water.',
      'Assume all flood water is biologically contaminated and electrically energized until verified.'
    ],
    contraindications: [
      'Do NOT deploy uncertified personnel into moving water without tethered safety line.'
    ],
    createdAt: '2025-01-05T00:00:00.000Z',
    updatedAt: '2026-02-15T00:00:00.000Z'
  },
  {
    id: 'DOC-DIS-FIRE-012',
    title: 'Structural & Wildland Interface Fire Containment Support',
    category: 'NATURAL_FIRE',
    subcategory: 'Fire Suppression & Interface Safety',
    version: '1.0.0',
    source: 'Wildland-Urban Interface Fire Response Manual (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-12T00:00:00.000Z',
    lastReviewed: '2026-01-20T00:00:00.000Z',
    priority: 9,
    status: 'ACTIVE',
    summary: 'Perimeter management, defensible space enforcement, smoke plume evacuation, and firefighter hydration/rehab standards.',
    content: `# Structural & Interface Fire Support Protocol

## 1. LCES Rule (Mandatory Wildland Protocol)
- **L**: Lookouts (Continuous observation of fire behavior).
- **C**: Communications (Tactical radio check and dual frequencies).
- **E**: Escape Routes (At least two unobstructed paths to safety).
- **S**: Safety Zones (Locations where fire shelters or engines are unnecessary).

## 2. Structural Fire Perimeters
- Hot Zone: Collapse zone around building (1.5 times the height of the walls).
- Warm Zone: Decontamination, secondary line, engineer pumping stations.
- Cold Zone: Command post, triage area, public boundary.`,
    keywords: ['fire', 'wildfire', 'smoke', 'structure fire', 'lces', 'flame', 'burn', 'combustion', 'evacuation'],
    tags: ['FIRE', 'WILDFIRE', 'SMOKE', 'SUPPRESSION', 'SAFETY'],
    hazards: ['OPEN_FLAME', 'SMOKE', 'HAZARDOUS_GAS', 'STRUCTURAL_COLLAPSE'],
    severityLevels: ['P1', 'P2', 'P3', 'CRITICAL', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['FIRE', 'HAZMAT', 'ROAD_ACCIDENT'],
    actionSteps: [
      'Verify LCES (Lookouts, Communications, Escape routes, Safety zones) before deployment.',
      'Establish 1.5x wall height collapse perimeter around burning structures.',
      'Order downwind evacuation for toxic smoke corridors.',
      'Stage water tankers and hose lines at defensible access points.',
      'Implement mandatory 20-minute firefighter rehab rotations.'
    ],
    safetyPrecautions: [
      'Never position personnel downwind in narrow canyons or saddles.'
    ],
    contraindications: [
      'Do NOT enter burning structures without complete PPE and SCBA.'
    ],
    createdAt: '2025-01-12T00:00:00.000Z',
    updatedAt: '2026-01-20T00:00:00.000Z'
  },
  {
    id: 'DOC-DIS-COLLAPSE-013',
    title: 'Structural Collapse Void Search & Shoring Protocols',
    category: 'STRUCTURAL_COLLAPSE',
    subcategory: 'Urban Search and Rescue (USAR)',
    version: '1.0.0',
    source: 'Urban Search & Rescue Field Operations Guide (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-16T00:00:00.000Z',
    lastReviewed: '2026-02-01T00:00:00.000Z',
    priority: 10,
    status: 'ACTIVE',
    summary: 'Safety protocols for searching pancake, lean-to, and V-shape collapse voids, secondary collapse monitoring, and utility isolation.',
    content: `# Structural Collapse & USAR Operations

## 1. Initial Collapse Assessment
- Isolate all gas, electrical, and water utilities entering the structure before search entry.
- Identify collapse pattern: Lean-to (void along supported wall), V-shape (void along two outer walls), Pancake (dense compact floor layers).

## 2. Safety & Entry Controls
- Appoint dedicated Structural Safety Lookout equipped with air horn.
- Evacuate structure immediately upon hearing 3 short horn blasts (Standard evacuation signal).
- Perform physical void shoring with cribbing before deep penetration.
- Atmospheric testing for carbon monoxide, explosive methane, and low oxygen is mandatory before entering confined voids.`,
    keywords: ['collapse', 'rubble', 'void', 'trapped', 'shoring', 'usar', 'earthquake', 'debris', 'search and rescue'],
    tags: ['STRUCTURAL_COLLAPSE', 'USAR', 'SEARCH', 'DISASTER'],
    hazards: ['STRUCTURAL_COLLAPSE', 'HAZARDOUS_GAS', 'ELECTRICAL_SHOCK', 'FALL_HAZARD'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['STRUCTURAL_COLLAPSE', 'EARTHQUAKE', 'LANDSLIDE', 'OTHER'],
    actionSteps: [
      'Shut off gas, power, and water service meters outside building.',
      'Deploy air-monitoring meter to check explosive gases and oxygen level.',
      'Mark building exterior with standardized INSARAG/FEMA search markings.',
      'Install timber or pneumatic shoring before entering void spaces.',
      'Sound 3 horn blasts for immediate emergency withdrawal if shifting occurs.'
    ],
    safetyPrecautions: [
      'Do not cut structural load-bearing columns or headers without engineer sign-off.'
    ],
    contraindications: [
      'Do NOT allow heavy machinery to vibrate debris while live search teams are inside voids.'
    ],
    createdAt: '2025-01-16T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z'
  },
  {
    id: 'DOC-DIS-LANDSLIDE-014',
    title: 'Landslide & Mudflow Warning Zone Evacuation',
    category: 'LANDSLIDE',
    subcategory: 'Geotechnical & Slope Hazards',
    version: '1.0.0',
    source: 'Geological Hazards Emergency Management Manual (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-02-01T00:00:00.000Z',
    lastReviewed: '2026-02-01T00:00:00.000Z',
    priority: 8,
    status: 'ACTIVE',
    summary: 'Recognizing precursor slope failure signs, setting up runout zone perimeters, and managing debris flow evacuation corridors.',
    content: `# Landslide & Mudflow Emergency Response

## 1. Warning Indicators of Imminent Slope Failure
- Sudden appearance of tension cracks in ground, pavement, or building foundations.
- Leaning telephone poles, fences, or retaining walls.
- Rapid change in creek water turbidity (sudden mud pulse) or abrupt drop in water flow despite heavy rain (dammed upstream).
- Rumbling sound resembling a freight train or artillery fire.

## 2. Operational Action
- Evacuate downstream and down-slope runout fan areas laterally (out of the chute, not down the path).
- Close all road passes traversing the toe or head scarp of the slide.
- Maintain safety distance at least 3 times the vertical height of the unstable bluff.`,
    keywords: ['landslide', 'mudflow', 'slope failure', 'debris flow', 'erosion', 'cliff', 'toe scarp', 'evacuation'],
    tags: ['LANDSLIDE', 'GEOTECHNICAL', 'DISASTER', 'EVACUATION'],
    hazards: ['LANDSLIDE', 'STRUCTURAL_COLLAPSE', 'FLOOD'],
    severityLevels: ['P1', 'P2', 'P3', 'CRITICAL', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['LANDSLIDE', 'FLOOD', 'ROAD_ACCIDENT'],
    actionSteps: [
      'Order lateral evacuation away from natural drainage channels and chutes.',
      'Close roads traversing affected slope toes and ridges.',
      'Place visual spotters to observe scarp movement and creek discharge.',
      'Establish staging areas outside the debris runout fan.'
    ],
    safetyPrecautions: [
      'Do not approach the head scarp or toe of an active landslide.'
    ],
    contraindications: [
      'Do NOT evacuate along the bottom of narrow gullies or drainage beds.'
    ],
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z'
  },
  {
    id: 'DOC-HAZ-CHEM-015',
    title: 'Hazardous Chemical Spill & Decontamination Procedures',
    category: 'HAZMAT_CHEMICAL',
    subcategory: 'Chemical Incident Containment',
    version: '1.0.0',
    source: 'Emergency Response Guidebook (ERG) & HazMat Operations (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-10T00:00:00.000Z',
    lastReviewed: '2026-01-20T00:00:00.000Z',
    priority: 10,
    status: 'ACTIVE',
    summary: 'Isolation distances, placard identification, chemical decontamination corridors, and PPE level selection for corrosive and toxic releases.',
    content: `# Hazardous Chemical Spill Response Protocol

## 1. Initial Approach & Isolation
- Approach from **upwind, uphill, and upstream**.
- Minimum initial isolation distance for unknown chemical spill: 100 meters (330 feet) in all directions; 800 meters downwind for toxic gases.
- Identify 4-digit UN number from placard or shipping papers from a safe distance using binoculars.

## 2. Decontamination Corridor Setup
- Hot Zone (Exclusion): Area of immediate vapor or liquid contamination.
- Warm Zone (Contamination Reduction): Decon line where responders remove contaminated gear.
- Cold Zone (Support): Command post, triage, and clean transport vehicles.
- Mass casualty gross decon: Strip clothing (removes 80-90% of contaminant) and perform rapid high-volume low-pressure water shower.`,
    keywords: ['hazmat', 'chemical', 'spill', 'decontamination', 'toxic', 'un number', 'placard', 'corrosive', 'acid', 'ppe'],
    tags: ['HAZMAT', 'CHEMICAL', 'DECON', 'SAFETY', 'P1_CRITICAL'],
    hazards: ['CHEMICAL_SPILL', 'HAZARDOUS_GAS', 'TOXIC_FUMES'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['HAZMAT', 'ROAD_ACCIDENT', 'FIRE'],
    actionSteps: [
      'Approach incident strictly from upwind and uphill.',
      'Establish 100m initial isolation perimeter; expand for toxic vapors.',
      'Identify UN placard numbers from distance using optical magnification.',
      'Set up gross decontamination water shower in warm zone.',
      'Ensure no un-decontaminated casualties enter ambulances or hospitals.'
    ],
    safetyPrecautions: [
      'Never enter chemical vapor cloud without Level A encapsulated suit and SCBA.'
    ],
    contraindications: [
      'Do NOT wash water-reactive chemicals (e.g., sodium, potassium) with water.'
    ],
    createdAt: '2025-01-10T00:00:00.000Z',
    updatedAt: '2026-01-20T00:00:00.000Z'
  },
  {
    id: 'DOC-HAZ-ELEC-016',
    title: 'Downed Power Lines & Energized Flood Water Protocols',
    category: 'ELECTRICAL_HAZARDS',
    subcategory: 'Electrical Safety & Grid Isolation',
    version: '1.0.0',
    source: 'Electrical Utility Emergency Field Guide (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-15T00:00:00.000Z',
    lastReviewed: '2026-02-01T00:00:00.000Z',
    priority: 10,
    status: 'ACTIVE',
    summary: 'Establishing step-potential exclusion zones, managing vehicle electrical entrapment, and responding to energized pools/fences.',
    content: `# Downed Power Lines & Electrical Safety Protocol

## 1. Step Potential & Exclusion Zone
- High voltage current radiates through the ground in concentric voltage rings.
- Walking with separated feet creates a voltage gradient (step potential) causing electrocution.
- **Safety Perimeter**: Keep all personnel at least 10 meters (33 feet) away from downed line, pole, or connected metal fence. (30 meters for transmission lines).
- If forced to move away from energized area: Shuffle with feet together without lifting feet off the ground, or bunny-hop with feet clamped together.

## 2. Occupants in Vehicle with Downed Line
- Instruct occupants to **STAY INSIDE THE VEHICLE**. The rubber tires provide insulation.
- Only evacuate if vehicle catches fire: Jump clear without touching car and ground simultaneously; land with feet together and shuffle away.`,
    keywords: ['electrical', 'power line', 'high voltage', 'electrocution', 'step potential', 'energized', 'transformer', 'wire'],
    tags: ['ELECTRICAL', 'HAZMAT', 'SAFETY', 'P1_CRITICAL'],
    hazards: ['ELECTRICAL_SHOCK', 'OPEN_FLAME', 'FLOOD'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['ROAD_ACCIDENT', 'FLOOD', 'FIRE', 'STRUCTURAL_COLLAPSE'],
    actionSteps: [
      'Establish 10m (33ft) exclusion zone around downed line and touching metal structures.',
      'Contact electric utility dispatch immediately for remote grid circuit lockout.',
      'Instruct vehicle occupants to remain seated inside vehicle.',
      'If vehicle fire forces exit, jump clear landing on both feet simultaneously.',
      'Treat all standing water touching wires as live high voltage.'
    ],
    safetyPrecautions: [
      'Assume all lines are energized even if silent and not sparking.'
    ],
    contraindications: [
      'Do NOT attempt to move power lines with wooden poles, ropes, or hoses (moisture conducts high voltage).'
    ],
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z'
  },
  {
    id: 'DOC-OPS-EVAC-017',
    title: 'Community Evacuation Corridor Management & Staging',
    category: 'EVACUATION_SHELTER',
    subcategory: 'Mass Evacuation Logistics',
    version: '1.0.0',
    source: 'Emergency Evacuation & Corridor Operations (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-22T00:00:00.000Z',
    lastReviewed: '2026-02-10T00:00:00.000Z',
    priority: 8,
    status: 'ACTIVE',
    summary: 'Designating one-way contraflow evacuation routes, establishing transit pickup staging points, and vulnerable population tracking.',
    content: `# Evacuation Corridor Operations Protocol

## 1. Corridor Designation & Contraflow
- Convert inbound highway lanes to outbound evacuation traffic (contraflow) with police escort and signage.
- Clear breakdown lanes and assign tow trucks at 2 km intervals to remove stalled vehicles rapidly.

## 2. Public Assembly & Transit Staging
- Designate safe staging hubs in cold zones equipped with emergency drinking water, sanitation, and bus loading.
- Prioritize non-ambulatory, elderly, and medical facility patients using accessible transport resources.`,
    keywords: ['evacuation', 'corridor', 'contraflow', 'traffic', 'staging area', 'shelter', 'transit', 'residents', 'mass movement'],
    tags: ['EVACUATION', 'LOGISTICS', 'SHELTER', 'OPERATIONS'],
    hazards: ['FLOOD', 'FIRE', 'HAZARDOUS_GAS', 'STRUCTURAL_COLLAPSE'],
    severityLevels: ['P1', 'P2', 'P3', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['FLOOD', 'FIRE', 'HAZMAT', 'LANDSLIDE', 'STRUCTURAL_COLLAPSE'],
    actionSteps: [
      'Publish authorized primary and secondary outbound evacuation routes.',
      'Deploy traffic control units at critical highway intersections.',
      'Establish transit bus pickup hubs at designated school/recreation centers.',
      'Maintain continuous liaison with receiving emergency shelters.'
    ],
    safetyPrecautions: [
      'Ensure designated evacuation route does not cross active flood basins or smoke paths.'
    ],
    contraindications: [
      'Do NOT allow civilian traffic onto unverified bypass roads during flash flood alerts.'
    ],
    createdAt: '2025-01-22T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z'
  },
  {
    id: 'DOC-OPS-SHELTER-018',
    title: 'Emergency Temporary Shelter Intake & Sanitation Operations',
    category: 'EVACUATION_SHELTER',
    subcategory: 'Shelter Management',
    version: '1.0.0',
    source: 'FEMA Shelter Field Guide & Sphere Project Standards (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-28T00:00:00.000Z',
    lastReviewed: '2026-02-10T00:00:00.000Z',
    priority: 7,
    status: 'ACTIVE',
    summary: 'Operational layout, minimum square footage per occupant (3.5 sqm), water/sanitation ratios, and registration procedures.',
    content: `# Temporary Emergency Shelter Operations

## 1. Capacity & Spatial Standards
- Minimum sleeping area: 3.5 square meters (40 sq ft) per person.
- Minimum aisle width between cot rows: 1.2 meters (4 feet) for emergency egress.
- Separate quiet areas for families, unaccompanied minors, and medical isolation.

## 2. Water & Sanitation Ratios
- Potable water supply: Minimum 15 liters per person per day (drinking, cooking, hygiene).
- Toilet ratio: 1 toilet per 20 persons; handwashing station at every latrine block.
- Waste disposal: Sealed bins emptied daily to prevent vector-borne disease.`,
    keywords: ['shelter', 'intake', 'sanitation', 'potable water', 'cots', 'displaced', 'registration', 'hygiene'],
    tags: ['SHELTER', 'INTAKE', 'HUMANITARIAN', 'LOGISTICS'],
    hazards: ['BIOHAZARD', 'DISEASE_OUTBREAK'],
    severityLevels: ['P2', 'P3', 'P4', 'MEDIUM', 'LOW'],
    applicableIncidentTypes: ['EVACUATION_SHELTER', 'FLOOD', 'FIRE', 'STRUCTURAL_COLLAPSE'],
    actionSteps: [
      'Set up registration and triage desk at shelter main entrance.',
      'Configure sleeping cots according to 3.5 sqm spatial standards.',
      'Verify potable drinking water supply meets 15L/person/day threshold.',
      'Establish isolated first-aid and medical check station.'
    ],
    safetyPrecautions: [
      'Maintain continuous fire watch and unobstructed emergency exit routes.'
    ],
    contraindications: [
      'Do NOT exceed maximum certified building occupancy in temporary shelters.'
    ],
    createdAt: '2025-01-28T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z'
  },
  {
    id: 'DOC-OPS-SAR-019',
    title: 'Urban & Wilderness Search and Rescue Grid Coordination',
    category: 'SEARCH_AND_RESCUE',
    subcategory: 'Search Management',
    version: '1.0.0',
    source: 'National Search and Rescue Manual (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-02-02T00:00:00.000Z',
    lastReviewed: '2026-02-15T00:00:00.000Z',
    priority: 8,
    status: 'ACTIVE',
    summary: 'Hasty search, grid sweep patterns, GPS sector assignment, canine team integration, and lost person behavioral profiles.',
    content: `# Search & Rescue (SAR) Grid Protocol

## 1. Search Phasing
1. **Type I (Hasty Search)**: Rapid check of high-probability routes, trails, structures, and drainage lines.
2. **Type II (Efficient Grid Sweep)**: Oriented teams spaced 10-20 meters apart covering designated terrain blocks.
3. **Type III (Comprehensive Sweep)**: Close-interval shoulder-to-shoulder sweep for dense brush or buried evidence.

## 2. Sector Tracking & Safety
- Every search team must have designated Team Leader, Navigator, Radio Operator, and First Aider.
- Hourly radio check-in with GPS coordinate status report.
- Mandatory return before nightfall unless certified for night-vision wilderness tracking.`,
    keywords: ['search and rescue', 'sar', 'grid search', 'lost person', 'canine', 'k9', 'gps', 'sweep', 'missing'],
    tags: ['SAR', 'SEARCH', 'RESCUE', 'OPERATIONS'],
    hazards: ['FALL_HAZARD', 'ENVIRONMENTAL_COLD', 'ENVIRONMENTAL_HEAT'],
    severityLevels: ['P1', 'P2', 'P3', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['SEARCH_AND_RESCUE', 'LANDSLIDE', 'STRUCTURAL_COLLAPSE', 'FLOOD'],
    actionSteps: [
      'Partition operational map into alphanumeric grid sectors (e.g. Sector Alpha-1).',
      'Deploy Hasty Search teams along primary paths of travel and watercourses.',
      'Assign K9 tracking units into uncontaminated windward sectors.',
      'Log GPS track logs and track coverage percentage for each team.'
    ],
    safetyPrecautions: [
      'Never dispatch lone searchers; maintain two-in two-out team discipline.'
    ],
    contraindications: [
      'Do NOT allow untrained volunteer civilian searchers into high-hazard collapse or cliff zones.'
    ],
    createdAt: '2025-02-02T00:00:00.000Z',
    updatedAt: '2026-02-15T00:00:00.000Z'
  },
  {
    id: 'DOC-OPS-CROWD-020',
    title: 'Mass Gathering Crowd Surge & Evacuation Chokepoints',
    category: 'CROWD_SAFETY',
    subcategory: 'Public Safety & Crowd Control',
    version: '1.0.0',
    source: 'Public Event Safety & Crowd Incident Guidelines (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-20T00:00:00.000Z',
    lastReviewed: '2026-02-01T00:00:00.000Z',
    priority: 8,
    status: 'ACTIVE',
    summary: 'Preventing crowd collapse and compressive asphyxiation, opening emergency egress relief corridors, and clear public address broadcasts.',
    content: `# Crowd Surge & Chokepoint Management

## 1. Density Thresholds
- **Safe Density**: < 2 persons per square meter.
- **Critical Threshold (Warning)**: 4-5 persons per sq meter (spontaneous crowd waves start).
- **Lethal Surge Danger**: > 6 persons per sq meter (compressive asphyxiation risk without falling).

## 2. Emergency Interventions
- Release side barriers and open all peripheral gates to dissipate pressure.
- Broadcast clear, calm, directional announcements (e.g., 'Move slowly toward North Exit Gates 3 and 4').
- Form wedge formations with responders to guide crowd flow around obstacles.`,
    keywords: ['crowd', 'surge', 'stampede', 'chokepoint', 'evacuation', 'asphyxiation', 'density', 'public address'],
    tags: ['CROWD', 'SAFETY', 'PUBLIC_ORDER', 'OPERATIONS'],
    hazards: ['CRUSH_HAZARD', 'ASPHYXIATION'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['SECURITY', 'EVACUATION_SHELTER', 'OTHER'],
    actionSteps: [
      'Immediately unlatch and open secondary relief exits and side barriers.',
      'Transmit calm, repetitive directional audio instructions over PA.',
      'Deploy line officers to divert incoming crowd flows away from congested gates.',
      'Establish triage staging outside main egress paths.'
    ],
    safetyPrecautions: [
      'Avoid yelling words like "Stampede" or "Fire" over loudspeakers which incite panic.'
    ],
    contraindications: [
      'Do NOT lock or obstruct exit turnstiles or gates during crowd pressure build-up.'
    ],
    createdAt: '2025-01-20T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z'
  },
  {
    id: 'DOC-OPS-COMMS-021',
    title: 'Emergency Radio & Tactical Mesh Communication Protocols',
    category: 'EMERGENCY_COMMUNICATIONS',
    subcategory: 'Tactical Interoperability',
    version: '1.0.0',
    source: 'National Incident Management System (NIMS) Comms Guide (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-08T00:00:00.000Z',
    lastReviewed: '2026-02-01T00:00:00.000Z',
    priority: 9,
    status: 'ACTIVE',
    summary: 'Standardized radio brevity codes, clear text language (no 10-codes), relay mesh placement, and emergency traffic priority declaration.',
    content: `# Tactical Communications & Mesh Networking Protocol

## 1. Plain Text Mandate
- Use **Plain Text / Clear Language**. Do not use agency-specific 10-codes (e.g. say 'Request Ambulance' instead of '10-52').
- Radio messages must be concise: Identify self, state recipient, concise message, wait for acknowledgment.

## 2. Emergency Traffic Interruption
- Any unit with immediate life safety emergency declares: **'EMERGENCY TRAFFIC, ALL UNITS STAND BY.'**
- All other radio communications must halt until emergency traffic is cleared.

## 3. Offline Mesh Relay Discipline
- Place relay nodes at elevated topographical crests to maintain optical line of sight.
- Limit hop counts to <= 7 hops to avoid packet collision and latency spikes.`,
    keywords: ['communications', 'radio', 'mesh', 'lora', 'plain text', 'emergency traffic', 'relay', 'packet', 'dispatch'],
    tags: ['COMMS', 'RADIO', 'MESH', 'TACTICAL', 'DISPATCH'],
    hazards: ['COMMUNICATION_OUTAGE'],
    severityLevels: ['P1', 'P2', 'P3', 'P4', 'HIGH', 'MEDIUM', 'LOW'],
    applicableIncidentTypes: ['MEDICAL', 'FIRE', 'FLOOD', 'HAZMAT', 'STRUCTURAL_COLLAPSE', 'OTHER'],
    actionSteps: [
      'Transmit all traffic in clear plain English without coded jargon.',
      'Acknowledge critical dispatch messages with repeater read-back.',
      'Reserve channel 1 for Tactical Command and channel 2 for Field Operations.',
      'Deploy battery-buffered mesh repeaters on ridges to bridge dark zones.'
    ],
    safetyPrecautions: [
      'Keep transmissions under 20 seconds to prevent channel saturation.'
    ],
    contraindications: [
      'Do NOT use complex numerical 10-codes during multi-agency operations.'
    ],
    createdAt: '2025-01-08T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z'
  },
  {
    id: 'DOC-OPS-SAFETY-022',
    title: 'Responder Personal Protective Equipment & Zone Ingress Standards',
    category: 'RESPONDER_SAFETY',
    subcategory: 'Occupational Safety & Health in Disasters',
    version: '1.0.0',
    source: 'Responder Safety & Environmental Health Manual (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-14T00:00:00.000Z',
    lastReviewed: '2026-01-28T00:00:00.000Z',
    priority: 10,
    status: 'ACTIVE',
    summary: 'PPE matching matrix for biological, structural, chemical, and flood hazards, buddy system enforcement, and rehabilitation criteria.',
    content: `# Responder Safety & PPE Ingress Protocol

## 1. Mandatory PPE Matrix
- **Structural Collapse / Debris**: ANSI Hard Hat, steel-toe puncture-resistant boots, heavy leather work gloves, eye protection, N95/P100 respirator.
- **Flood / Swiftwater**: Type V PFD, swiftwater helmet, dry suit, throw bag, strobe light.
- **HazMat Warm Zone**: Chemical splash suit, nitrile inner/outer gloves, neoprene boots, APR/SCBA.
- **Biohazard / Triage**: Nitrile gloves, fluid-resistant gown, eye shield, N95 mask.

## 2. Buddy System
- No responder enters hot or warm zones alone.
- Minimum team size: 2 personnel (2-in / 2-out rule for structural or IDLH environments).`,
    keywords: ['ppe', 'responder safety', 'helmet', 'boots', 'gloves', 'respirator', 'buddy system', 'rehab'],
    tags: ['SAFETY', 'RESPONDER', 'PPE', 'OPERATIONS'],
    hazards: ['BIOHAZARD', 'STRUCTURAL_COLLAPSE', 'CHEMICAL_SPILL', 'FLOOD'],
    severityLevels: ['P1', 'P2', 'P3', 'P4', 'CRITICAL', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['MEDICAL', 'FIRE', 'FLOOD', 'HAZMAT', 'STRUCTURAL_COLLAPSE', 'OTHER'],
    actionSteps: [
      'Inspect PPE integrity before crossing staging line.',
      'Enforce mandatory buddy system pairing for all operational entries.',
      'Conduct 10-point safety check (head, eyes, respiratory, hands, feet).',
      'Mandate rehab station rest every 45 minutes of heavy physical exertion.'
    ],
    safetyPrecautions: [
      'Immediately replace damaged or torn protective garments.'
    ],
    contraindications: [
      'Do NOT permit unequipped personnel into active operational hot zones.'
    ],
    createdAt: '2025-01-14T00:00:00.000Z',
    updatedAt: '2026-01-28T00:00:00.000Z'
  },
  {
    id: 'DOC-OPS-ZONE-023',
    title: 'Hot / Warm / Cold Zone Perimeter Discipline',
    category: 'HAZARD_ZONE_PRECAUTIONS',
    subcategory: 'Incident Scene Geometry',
    version: '1.0.0',
    source: 'National Incident Management System (NIMS) ICS-100/200 (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-10T00:00:00.000Z',
    lastReviewed: '2026-02-05T00:00:00.000Z',
    priority: 9,
    status: 'ACTIVE',
    summary: 'Standardized boundary marking, entry control points (ECP), decontamination station placement, and command post setback distance.',
    content: `# Incident Perimeter & Zone Discipline Protocol

## 1. Tri-Zone Architecture
- **Hot Zone (Exclusion Zone)**: The area with active hazards, contamination, or collapse danger. Access strictly restricted to certified specialists in full PPE.
- **Warm Zone (Contamination Reduction / Support Zone)**: Buffers the hot zone. Contains Decontamination corridor, tool staging, and safety backup teams.
- **Cold Zone (Support Zone)**: Free from hazards. Houses Incident Command Post (ICP), Public Information Officer (PIO), Medical Staging, and Logistics.

## 2. Entry Control Point (ECP)
- Exactly one marked entry and exit point connecting Cold and Warm zones.
- Access log maintains real-time roster of every individual inside hot/warm perimeters with time-in and SCBA air pressure.`,
    keywords: ['zones', 'hot zone', 'warm zone', 'cold zone', 'perimeter', 'entry control', 'icp', 'safety cordon'],
    tags: ['PERIMETER', 'ZONES', 'ICS', 'COMMAND', 'SAFETY'],
    hazards: ['CHEMICAL_SPILL', 'OPEN_FLAME', 'STRUCTURAL_COLLAPSE', 'BIOHAZARD'],
    severityLevels: ['P1', 'P2', 'P3', 'CRITICAL', 'HIGH', 'MEDIUM'],
    applicableIncidentTypes: ['HAZMAT', 'FIRE', 'STRUCTURAL_COLLAPSE', 'FLOOD', 'SECURITY'],
    actionSteps: [
      'Erect barrier tape marking Hot (Red), Warm (Yellow), and Cold (Green) perimeters.',
      'Establish single Entry Control Point with accountability officer.',
      'Position Command Post and staging area in upwind Cold Zone.',
      'Mandate that all personnel exiting Hot Zone pass through Warm Zone Decon.'
    ],
    safetyPrecautions: [
      'Ensure the Cold Zone is positioned well outside potential collapse or vapor plume trajectories.'
    ],
    contraindications: [
      'Do NOT allow media or unassigned civilians past the Cold Zone cordon.'
    ],
    createdAt: '2025-01-10T00:00:00.000Z',
    updatedAt: '2026-02-05T00:00:00.000Z'
  },
  {
    id: 'DOC-MED-TRIAGE-024',
    title: 'Mass Casualty Incident (MCI) START Triage Standards',
    category: 'MEDICAL_EMERGENCY',
    subcategory: 'Simple Triage and Rapid Treatment (START)',
    version: '1.0.0',
    source: 'START & JumpSTART Pediatric Triage Standards (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-05T00:00:00.000Z',
    lastReviewed: '2026-02-10T00:00:00.000Z',
    priority: 10,
    status: 'ACTIVE',
    summary: 'RPM triage algorithm (Respirations, Perfusion, Mental Status) for categorizing casualties into Immediate (Red), Delayed (Yellow), Minor (Green), and Expectant (Black).',
    content: `# START Triage Algorithm for Mass Casualty Incidents

## 1. Initial Step (Walking Wounded)
- Announce loudly: 'Anyone who can hear my voice and needs help, walk to the designated green flag area.'
- All ambulatory casualties are designated **GREEN (Minor / P3)**.

## 2. Individual Assessment (RPM <= 30 Seconds per casualty)
1. **Respirations**:
   - No breathing -> Open airway. Still no breathing -> **BLACK (Expectant/Deceased)**.
   - Breathing after airway opened -> **RED (Immediate / P1)**.
   - Respiration rate > 30 / min -> **RED (Immediate / P1)**.
   - Respiration rate < 30 / min -> Check Perfusion.
2. **Perfusion**:
   - Radial pulse absent OR Capillary refill > 2 seconds -> **RED (Immediate / P1)** (control bleeding).
   - Radial pulse present AND Cap refill <= 2 seconds -> Check Mental Status.
3. **Mental Status**:
   - Cannot follow simple commands (unconscious or confused) -> **RED (Immediate / P1)**.
   - Follows simple commands -> **YELLOW (Delayed / P2)**.`,
    keywords: ['triage', 'start triage', 'mci', 'mass casualty', 'rpm', 'respirations', 'perfusion', 'mental status', 'red', 'yellow', 'green', 'black'],
    tags: ['TRIAGE', 'MCI', 'START', 'FIRST_AID', 'P1_CRITICAL'],
    hazards: ['MASS_CASUALTY'],
    severityLevels: ['P1', 'P2', 'P3', 'P4', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    applicableIncidentTypes: ['MEDICAL', 'ROAD_ACCIDENT', 'STRUCTURAL_COLLAPSE', 'FIRE', 'FLOOD'],
    actionSteps: [
      'Direct walking wounded to designated Green assembly area.',
      'Assess non-ambulatory casualties in under 30 seconds using RPM.',
      'Tag casualties with visible colored triage ribbons/tags (Red, Yellow, Green, Black).',
      'Provide immediate airway positioning and major arterial tourniquet only during initial sweep.',
      'Prioritize transport for Red tag casualties.'
    ],
    safetyPrecautions: [
      'Do not perform extensive treatment during primary triage sweep beyond airway opening and hemorrhage control.'
    ],
    contraindications: [
      'Do NOT spend more than 30-60 seconds on any single patient during initial START triage.'
    ],
    createdAt: '2025-01-05T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z'
  },
  {
    id: 'DOC-HAZ-GAS-025',
    title: 'Combustible Gas Leak & Vapor Dispersion Response',
    category: 'HAZMAT_CHEMICAL',
    subcategory: 'Flammable Gas Hazards',
    version: '1.0.0',
    source: 'Natural Gas & LPG Emergency Response Standards (Local Corpus)',
    sourceOrganization: 'Emergency Operations Resource Center',
    provenanceType: 'LOCAL_DEMONSTRATION',
    publicationDate: '2025-01-18T00:00:00.000Z',
    lastReviewed: '2026-02-10T00:00:00.000Z',
    priority: 9,
    status: 'ACTIVE',
    summary: 'Lower Explosive Limit (LEL) monitoring, eliminating ignition sources, vapor cloud water fog dispersion, and residential evacuation.',
    content: `# Combustible Gas & Vapor Dispersion Protocol

## 1. Lower Explosive Limit (LEL) Safety Rules
- Methane (Natural Gas) explosive range: 5% to 15% in air.
- LPG (Propane/Butane) is heavier than air and pools in basements, trenches, and storm drains.
- **Evacuation Threshold**: Any indoor atmosphere >= 10% LEL requires immediate evacuation.
- **Zero Ignition Rule**: Prohibit doorbells, light switches, cell phones, vehicle starters, or flares within 100 meters.

## 2. Tactical Water Fog Dispersion
- Deploy wide-angle fog nozzles (100 psi) upwind of vapor cloud to direct and disperse gas plumes away from ignition sources.
- Never extinguish a burning gas jet unless the gas supply valve can be shut off immediately (unignited gas cloud creates greater explosion hazard).`,
    keywords: ['gas leak', 'methane', 'propane', 'lpg', 'lel', 'explosion', 'vapor cloud', 'ignition', 'flammable'],
    tags: ['GAS', 'HAZMAT', 'EXPLOSION', 'SAFETY', 'FIRE'],
    hazards: ['HAZARDOUS_GAS', 'OPEN_FLAME', 'STRUCTURAL_COLLAPSE'],
    severityLevels: ['P1', 'P2', 'CRITICAL', 'HIGH'],
    applicableIncidentTypes: ['HAZMAT', 'FIRE', 'STRUCTURAL_COLLAPSE', 'ROAD_ACCIDENT'],
    actionSteps: [
      'Eliminate all potential ignition sources in 100m perimeter.',
      'Monitor atmosphere with calibrated 4-gas detector for % LEL.',
      'Order immediate evacuation if LEL exceeds 10%.',
      'Use wide fog spray patterns to dissipate outdoor vapor pockets.',
      'Isolate main gas service shutoff valve outside structure if safe.'
    ],
    safetyPrecautions: [
      'Remember propane sinks to low points; check basements and sumps thoroughly.'
    ],
    contraindications: [
      'Do NOT operate electrical switches, doorbells, or flashlights in suspected gas clouds.',
      'Do NOT extinguish burning pressurized gas flames if the fuel source cannot be isolated.'
    ],
    createdAt: '2025-01-18T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z'
  }
];
