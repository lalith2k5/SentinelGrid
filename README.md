# SentinelGrid — Offline-First Emergency Command & Mesh Simulation Platform

SentinelGrid is an offline-first emergency incident command, triage, and resource coordination platform engineered for mission-critical disaster response in compromised communication environments.

---

## Architecture & Operational Guarantees

SentinelGrid is designed to continue operating without internet, cellular connectivity, or cloud services, provided the local computing and radio equipment remain powered.

### Core Architectural Principles:
1. **100% Offline-First**: All core incident tracking, resource staging, triage workflows, user management, mesh routing simulation, and audit logging execute entirely on local hardware with zero external cloud dependencies.
2. **Zero Cloud Requirement**: SentinelGrid does not require a cloud database (e.g. Firebase, Cloud SQL, MongoDB Atlas) or remote storage. All data is persisted to a local, atomic JSON file datastore with memory indexing and automatic sequence numbering.
3. **No External APIs or Internet Required**: SentinelGrid requires zero internet connectivity to run. It does not ping external analytics, CDNs, telemetry servers, or remote endpoints.
4. **Strict Phase Boundaries**:
   - **Phase 1 (Completed & Hardened)**: Offline core — Incident management, resource staging, strict role-based access control (RBAC), database-authoritative roles, last-admin protection, SHA-256 hashed revoked token storage, and audit logs.
   - **Phase 2 & 2.1 (Completed & Hardened)**: Offline Mesh Network Simulation — Virtual multi-hop packet propagation, BFS shortest-path routing, loop prevention, duplicate packet detection with collision handling, hop-by-hop latency and RF packet loss simulation, reverse ACK return path verification with node state validation, configurable maxHops/TTL boundaries, telemetry event logs, and dynamic topology controls.
   - **Phase 3 & 3.1 (Completed & Hardened)**: Offline AI-Assisted Triage & Structured Incident Intelligence — Local heuristic triage engine, priority urgency scoring, victim count extraction/separation, hazard and symptom detection, location clue parsing, prompt injection defense, append-only triage history, and RBAC-protected audit logs.
   - **Phase 4 & 4.1 (Completed & Hardened)**: Offline GIS Foundation & Hazard-Aware Routing — Local graph map provider, synthetic offline road network, `MAX_SNAP_DISTANCE_METERS` (5000m) snapping distance boundary, Dijkstra shortest/safest path calculation engine, hazard penalty cost functions, truthful active network blocked road accounting, explainable route selection, persistent hazard & blocked road management, interactive SVG map visualization, and RBAC-protected routing API.
   - **Phase 5 & 5.1 & 5.1.1 (Completed & Hardened)**: Resource Matching & Allocation — Local multi-factor deterministic scoring, structured capacity verification by resource type, eligibility and routing safety checks, explainable resource recommendations, local stateful allocation & release, strict dispatcher/admin/operator RBAC limits, and audit logs.
   - **Phase 6 & 6.1 & 6.1.1 (Completed & Hardened)**: Offline Dispatch, Responder Workflows & Authoritative Ownership Hardening — Real-time state machine transitions, strict server-side owner validation for responders, standard HTTP status alignment, robust input safeguards, and full regression testing suite.
   - **Phase 7 (Completed & Hardened)**: Offline Operational GIS & Map Expansion — Extended 25-node, 35-road synthetic topology, 8 operational layers, multi-mode routing comparison (FASTEST, SAFEST, BALANCED), operational overlay mapping with location-unavailable handling, diagnostic telemetry, and RBAC-protected map management.
   - **Phase 8 & 8.1 (Completed & Hardened)**: Offline Emergency Knowledge Base & Deterministic Local RAG — 25-document local corpus (v1.0.0), deterministic weighted lexical retrieval, evidence traceability, conflict detection, human-review gates, local demonstration provenance, protocol versioning, RBAC-protected endpoints, and zero cloud AI/vector DB dependencies.
   - **Phase 9 (Completed & Hardened)**: Incident Corroboration & Evidence Fusion — Multi-source evidence aggregation, deterministic multi-factor corroboration scoring (0–100), duplicate mesh packet deduplication & fingerprinting, 7-type evidence conflict detection, strict non-mutation safety invariants, human review gate triggers, audit logging, and RBAC-protected APIs.
   - **Future Roadmap (Phase 10+ — Not Implemented / Out of Scope)**: Phase 10 Operations Analytics, real Meshtastic/LoRa physical hardware transceivers, satellite failover, and acoustic detection.

---

## Phase 8 & 8.1 — Offline Emergency Knowledge Base & Deterministic Local RAG

SentinelGrid implements a 100% offline, deterministic Retrieval-Augmented Generation (RAG) decision-support system designed to surface authoritative emergency operational manuals, safety precautions, and contraindications during disaster operations without cloud connectivity.

### 25-Document Local Knowledge Corpus (v1.0.0)
- **Baseline Coverage**: 25 pre-indexed, structured operational manuals spanning 12 critical emergency categories:
  - `TRAUMA_BLEEDING`: Arterial/venous hemorrhage control, tourniquet application, and wound packing.
  - `BURNS`: Thermal burn cooling, sterile dressing, and chemical burn irrigation.
  - `FRACTURES`: Splinting, spinal immobilization, and neurovascular assessment.
  - `RESPIRATORY`: Airway management, recovery position, and choking protocols.
  - `CARDIAC`: CPR, chest compression rates, and AED deployment guidelines.
  - `ENVIRONMENTAL`: Hypothermia passive/active rewarming and heat stroke rapid cooling.
  - `NATURAL_FLOOD`: Flash flood vertical evacuation and swiftwater crossing safety.
  - `NATURAL_FIRE`: Wildfire defensible space and structural protection.
  - `STRUCTURAL_COLLAPSE`: Urban search and rescue (USAR) void assessment, marking, and crush syndrome management.
  - `HAZMAT_CHEMICAL`: Isolation perimeters, decontamination, and agent-specific responses (anhydrous ammonia, chlorine gas, petroleum spills, lithium-ion battery fires, water-reactive chemicals).
  - `ELECTRICAL_HAZARDS`: Downed power line clearance zones and step potential safety.
  - `MASS_CASUALTY`: START / SALT triage protocols and color-coded casualty tagging.
- **Corpus Version**: Authoritative baseline version `1.0.0` (Offline Core Baseline).
- **Provenance Standard**: Marked as `LOCAL_DEMONSTRATION` provenance with source organizations and review metadata.

### Deterministic Weighted Lexical Retrieval Engine
- **Multi-Factor Deterministic Scoring**: Computes a transparent, reproducible relevance score (0–100) per document:
  - **Lexical Keyword Overlap (max 40 pts)**: Evaluates normalized query tokens against document keywords, title, summary, and content.
  - **Category Alignment (max 25 pts)**: Matches incident or query categories against document classifications.
  - **Hazard Profile Correlation (max 20 pts)**: Correlates operational hazards (e.g. `FLOOD`, `CHEMICAL_SPILL`, `STRUCTURAL_COLLAPSE`) with manual hazard tags.
  - **Severity & Urgency Calibration (max 10 pts)**: Calibrates high-priority (P1/P2) life threats against critical response procedures.
  - **Symptom & Condition Tagging (max 10 pts)**: Matches clinical/field signs with protocol applicability.
  - **Review Interval Penalty (-30%)**: Applies a 30% reduction penalty for protocols exceeding the 365-day review threshold.
- **Secondary Deterministic Tie-Breaking**: Documents with identical scores are ordered deterministically by document ID.
- **Zero Hallucination / Traceability**: Synthesized action checklists and safety precautions are strictly derived from matched documents with citations to document ID, version, and source.

### Safety, Guardrails & Non-Mutation Invariants
- **Conflict Detection**: Automatically scans matched manuals for conflicting directives (such as water suppression on water-reactive chemicals like Class D metals or sulfuric acid) and surfaces explicit warnings.
- **Human Review Gates**: Flags mandatory human incident commander review for:
  - P1 critical life-safety incidents.
  - Low retrieval confidence (< 40 relevance score).
  - Queries with matched outdated protocols (> 365 days since review).
  - Dangerous chemical / hazardous materials procedures.
- **Insufficient Evidence Handling**: When no document meets the minimum confidence threshold, returns `INSUFFICIENT_LOCAL_EVIDENCE` with clear guidance rather than inventing synthetic advice.
- **Non-Mutation Invariant**: RAG queries are strictly read-only decision-support queries; they **NEVER** mutate incident status, severity, resources, or dispatch states.
- **Mandatory Safety Disclaimer**: Every RAG output includes an explicit emergency operations disclaimer: *"Advisory emergency field reference only. Local commander judgment, responder scene safety, and trained personnel take precedence."*

### Zero Cloud AI & Zero Vector Database Invariants
- **No Cloud AI Dependency**: SentinelGrid RAG does not call Gemini, OpenAI, Claude, or any external LLM APIs.
- **No Remote Vector Database**: Does not require Pinecone, Weaviate, Qdrant, Chroma, or Milvus. Operates entirely in-memory and local JSON persistence.
- **100% Offline**: All tokenization, scoring, ranking, synthesis, conflict detection, and document management execute on local hardware without internet.

### Knowledge Versioning & RBAC
- **Semantic Protocol Versioning**: Administrators can publish new versions with structured changelogs, archiving prior versions in `versionHistory`.
- **Status Lifecycle**: Documents transition across `ACTIVE`, `INACTIVE`, `ARCHIVED`, and `DRAFT` states. Inactive/archived documents are excluded from standard RAG retrieval.
- **RBAC Policy**:
  - `POST /api/knowledge/retrieve` & `POST /api/knowledge/query`: Requires authenticated user session (`ADMIN`, `DISPATCHER`, `OPERATOR`, `RESPONDER`).
  - `POST /api/knowledge` (Create), `PUT /api/knowledge/:id` (Update), `POST /api/knowledge/:id/version` (Publish Version), `PATCH /api/knowledge/:id/status` (Status Mutation): Strictly restricted to `ADMIN` role.

### Knowledge Subsystem API Endpoints

| Method | Endpoint | Description | Access / RBAC |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/knowledge/status` | Subsystem operational status, corpus metadata, and offline guarantees | Public / Internal |
| `GET` | `/api/knowledge/categories` | Categories with document counts and active counts | Public / Internal |
| `GET` | `/api/knowledge/versions` | Corpus version metadata and document revision history | Public / Internal |
| `GET` | `/api/knowledge` | List knowledge documents with category, hazard, status, and text search | Public / Internal |
| `GET` | `/api/knowledge/:id` | Retrieve single knowledge document by ID | Public / Internal |
| `POST` | `/api/knowledge/retrieve` | Execute deterministic RAG query with score breakdowns and checklists | Authenticated (`ADMIN`, `DISPATCHER`, `OPERATOR`, `RESPONDER`) |
| `POST` | `/api/knowledge/query` | Alias for deterministic RAG query execution | Authenticated (`ADMIN`, `DISPATCHER`, `OPERATOR`, `RESPONDER`) |
| `POST` | `/api/knowledge` | Register a new emergency protocol document | `ADMIN` only |
| `PUT` | `/api/knowledge/:id` | Update an existing knowledge document | `ADMIN` only |
| `POST` | `/api/knowledge/:id/version`| Publish a new SemVer version with audit changelog | `ADMIN` only |
| `PATCH` | `/api/knowledge/:id/status` | Update document lifecycle status (`ACTIVE`, `INACTIVE`, `ARCHIVED`, `DRAFT`) | `ADMIN` only |

### Known Limitations & Operational Disclaimers
1. **Advisory Decision Support**: The RAG subsystem is designed as an operational job aid for incident commanders and field teams. It does not replace licensed medical training, certified HazMat specialists, or incident commander authority.
2. **Local Demonstration Provenance**: The default 25-document emergency corpus is configured as a demonstration and baseline disaster reference. It does not claim clinical certification or official government endorsement.
3. **Lexical Matching Constraints**: The engine uses deterministic weighted lexical retrieval. Queries phrased with terminology completely unrepresented in document keywords or text will correctly return `INSUFFICIENT_LOCAL_EVIDENCE`.

---

## Phase 9 — Incident Corroboration & Evidence Fusion

SentinelGrid implements a 100% offline, deterministic Incident Corroboration and Evidence Fusion Engine designed to synthesize heterogeneous disaster reports (Responders, Staged Resources, Mesh Network Observations, Public/Community Reports, AI Triage, and RAG Knowledge) into a unified, transparent Corroboration Score (0–100) and authoritative Verification Status.

### Multi-Factor Deterministic Scoring Model (0–100 Points)
The corroboration engine evaluates 6 distinct sub-scores plus conflict penalties without external network calls or `Math.random()` dependencies:
1. **Source Reliability Score (0–25 pts)**: Evaluates the authoritative weight of the highest-quality reporter (`RESPONDER_CONFIRMATION` = 25, `RESPONDER_OBSERVATION` = 22, `RESOURCE_OBSERVATION` = 20, `MESH_OBSERVATION` = 18, `SECONDARY_REPORT` = 16, `INITIAL_REPORT` = 15, `AI_TRIAGE` = 10, `RAG_KNOWLEDGE` = 5).
2. **Directness Score (0–15 pts)**: Rewards direct physical scene observations (Responder on scene = 15 pts, Mesh/Public field witness = 10 pts, Derived/AI = 5 pts).
3. **Source Independence Score (0–20 pts)**: Rewards corroboration across independent reporting source groups (1 group = 0 pts, 2 groups = 10 pts, 3 groups = 15 pts, 4+ groups = 20 pts).
4. **Location Consistency Score (0–15 pts)**: Evaluates Haversine spatial proximity between reported evidence coordinates and incident location (<= 500m = 15 pts, <= 2000m = 10 pts, > 2000m = 0 pts).
5. **Temporal Consistency Score (0–15 pts)**: Measures report freshness against incident creation timestamp (<= 30 mins = 15 pts, <= 120 mins = 10 pts, > 120 mins = 5 pts).
6. **Fact Consistency Score (0–10 pts)**: Analyzes content consensus across reporting text and category tags (Consensus = 10 pts, Minor variance = 5 pts, Discrepancy = 0 pts).
7. **Conflict Penalty (0 to -30 pts)**: Deducts points based on active evidence conflict severity (CRITICAL = -15 pts, HIGH = -10 pts, MEDIUM = -5 pts, LOW = -2 pts, capped at -30 pts total penalty).

### Corroboration Verification Lifecycle States
- **`UNVERIFIED`**: Default state when no valid evidence items exist for an incident.
- **`REPORTED`**: Single initial community or public report recorded.
- **`AI_TRIAGED`**: AI Triage advisory classification processed without independent field corroboration.
- **`CORROBORATED`**: High corroboration score (>= 60) backed by 2 or more independent field witness sources without critical conflicts.
- **`RESPONDER_VERIFIED`**: Direct physical scene confirmation submitted by a verified field responder unit.
- **`CONFIRMED`**: Explicit manual verification set by an authorized Human Incident Commander (`ADMIN` or `DISPATCHER`).
- **`CONFLICTING`**: Automatic state when high-severity or critical evidence discrepancies are detected across reports.
- **`DISPUTED`**: Manual status set by an Incident Commander when field reports are formally disputed.

### Duplicate Mesh Packet Deduplication & Fingerprinting
- **SHA-256 Payload Fingerprinting**: Generates a deterministic hash from `incidentId`, `type`, `sourceId`, normalized text content, and rounded location coordinates.
- **Mesh Retransmission Safeguard**: Duplicate mesh packets or repeated submissions with identical fingerprints are flagged as `isDuplicate: true` and excluded from source independence counting to prevent artificial inflation of corroboration scores.

### 7-Type Evidence Conflict Detection Engine
Automatically scans evidence streams for material discrepancies:
1. `CATEGORY_CONFLICT`: Mismatched core incident types (e.g. `FIRE` vs `FLOOD`).
2. `SEVERITY_CONFLICT`: Discrepancy between reported severity tiers (e.g. `P1` vs `P4`).
3. `HAZARD_CONFLICT`: Opposing hazard claims (e.g. `HAZMAT` vs `NO_HAZARD`).
4. `LOCATION_CONFLICT`: Spatial distance exceeding `2000m` threshold between reports.
5. `TIME_CONFLICT`: Temporal lag exceeding `120 minutes` between report timestamps.
6. `VICTIM_COUNT_CONFLICT`: Discrepancy exceeding 3 victims between responder-verified counts and unverified estimates.
7. `STATUS_CONFLICT`: Discrepancy between active scene reports and claims of containment (`CONTAINED`/`RESOLVED`).

### Strict Non-Mutation Safety Invariants (Human-in-the-Loop)
To prevent autonomous action risks, Phase 9 strictly enforces human-authoritative boundaries:
- **No Auto-Resolution**: Corroboration NEVER automatically resolves or closes an incident.
- **No Auto-Dispatch**: Corroboration NEVER automatically dispatches emergency resources.
- **No Auto-Cancellation**: Corroboration NEVER automatically cancels existing dispatches.
- **No Auto-Resource Status Mutation**: Corroboration NEVER alters resource availability states (`AVAILABLE`, `ASSIGNED`, `EN_ROUTE`, etc.).
- **No Auto-Victim Count Verification**: Unverified public estimates are never automatically marked as responder-verified victim counts.
- **No Auto-Incident Confirmation**: Corroboration NEVER sets incident status to `CONFIRMED` without human decision or direct responder on-scene observation.
- **No Overriding Responder Observations**: Algorithmic scoring NEVER overwrites or suppresses physical responder scene reports.

### Mandatory Human Review Gate Triggers
Automatically flags `requiresHumanReview: true` when any of the following conditions are met:
- Active evidence conflicts detected (`conflictCount > 0`).
- Single reporting source with no independent witness corroboration (`independentSourceCount < 2`).
- Low corroboration score (`corroborationScore < 40`).
- Critical / P1 priority incidents (`severity === 'CRITICAL'` or `'P1'`).
- Chemical, hazmat, collapse, or explosion hazards present.
- Discrepancy between estimated and responder-verified victim counts.
- Derived-only evidence present without direct physical field reports.

### Corroboration Subsystem API Endpoints

| Method | Endpoint | Description | Access / RBAC |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/corroboration/:id` | Retrieve complete corroboration score, breakdown, evidence items, conflicts, and human review status | Authenticated (`ADMIN`, `DISPATCHER`, `OPERATOR`, `RESPONDER`) |
| `POST` | `/api/corroboration/:id/evidence` | Submit new evidence item (Responder observation, mesh report, public update) | Authenticated (`ADMIN`, `DISPATCHER`, `OPERATOR`, `RESPONDER`) |
| `POST` | `/api/corroboration/:id/verify` | Apply authoritative human verification override (`CONFIRMED` or `DISPUTED`) | `ADMIN` or `DISPATCHER` only |

### Operational Disclaimers & Limitations
1. **Decision-Support Tool**: The corroboration engine is an advisory decision-support system. It provides transparent evidence synthesis for incident commanders and does not act autonomously.
2. **Deterministic Heuristics**: Scoring models rely on deterministic mathematical rules and server-authoritative roles. They do not claim clinical validation, 100% statistical accuracy, or zero false positive guarantees.
3. **Local Scope**: All evidence aggregation, deduplication, and scoring execute 100% locally on the host system with zero cloud API or external service dependencies.

---

## Phase 7 — Offline Operational GIS & Map Expansion

Phase 7 extends the foundational Phase 4 local graph routing engine into a complete, operational offline GIS interface for incident command, situational awareness, and multi-mode route planning.

### Offline Map Dataset
- **Graph Topology**: 25 discrete road nodes (`N-01` through `N-25`) and 35 directed road edges (`E-01` through `E-35`).
- **Operational Bounding Box**: Covers synthetic grid coordinates `[minLat: 9.9700, maxLat: 10.0600, minLng: 9.9700, maxLng: 10.0600]`.
- **Road Classifications**: Multi-tier infrastructure including `HIGHWAY`, `PRIMARY`, `SECONDARY`, `BRIDGE`, `TUNNEL`, and `LOCAL` streets with realistic speed limits and traversal penalties.
- **Directionality**: Directed edges supporting both `BIDIRECTIONAL` corridors and strictly enforced `ONE_WAY` passages.
- **Travel-Time Metadata**: Base edge travel durations calculated deterministically from distance and road classification speeds.
- **Deterministic Synthetic Dataset**: Version 2.0.0 synthetic operational emergency network.

> **CRITICAL OPERATIONAL NOTICE**:
> **THE CURRENT MAP DATASET IS SYNTHETIC AND IS FOR OFFLINE DEVELOPMENT, TESTING, AND DEMONSTRATION.**
> It does not represent real-world geographic coverage. All coordinates, street labels, and topology belong to a simulated local sector.

### 8 Operational Map Layers
SentinelGrid manages 8 independent operational layers with dynamic visibility toggling:
1. `BASE_MAP`: Local coordinate reference grid, bounding box boundary, and background sector styling.
2. `ROADS`: Road segments rendered by classification with one-way directionality indicators and status colors.
3. `INCIDENTS`: Incident location overlays snapped to the nearest road network node.
4. `RESOURCES`: Active staged emergency assets, displaying unit types, availability, and capacity tags.
5. `RESPONDERS`: Field responder position markers displaying unit telemetry and offline simulation status.
6. `HAZARDS`: Active environmental and physical threats (`FLOOD`, `FIRE`, `LANDSLIDE`, `CHEMICAL_SPILL`, `STRUCTURAL_COLLAPSE`, `DOWNED_POWER_LINE`) with dynamic danger radii and severity styling.
7. `BLOCKED_ROADS`: Impassable road segments with physical blockage indicators.
8. `ACTIVE_ROUTE`: Live navigation trajectories and multi-mode route comparison paths.

### Operational Objects
- **Incidents**: Real incident coordinates mapped to the road graph. Incidents with missing or `(0,0)` coordinates are identified as `isLocationUnavailable: true` without artificial fallback.
- **Resources**: Equipment, vehicles, and medical units mapped with actual database capacities and operational capabilities.
- **Responders**: Field responder markers labeled with `locationStatus: SIMULATED_OFFLINE_POSITION`, clearly distinguishing simulated responder telemetry from live physical GPS feeds.
- **Hazards**: Threat perimeters evaluated for edge intersections and route avoidance.
- **Blocked Roads**: Active road segment closures blocking graph traversal.
- **Routes**: Multi-segment paths connecting origins to destinations.

### Multi-Mode Route Comparison Engine
The Phase 7 routing engine provides parallel multi-mode evaluation comparing 3 distinct operational modes:
- **`FASTEST`**: Optimizes for minimal travel duration (`estimatedTravelSeconds`), utilizing higher-speed roads.
- **`SAFEST`**: Prioritizes hazard avoidance by heavily penalizing hazard proximity and routing around danger perimeters when viable alternatives exist.
- **`BALANCED`**: Evaluates a weighted compromise between travel time and safety penalties.
- **Operational Metrics**: Every calculated route provides total distance (meters), estimated travel time (seconds), cumulative hazard penalty, count of avoided hazards, and count of avoided road blockages.
- **Trade-off Analysis**: Natural-language operational explanations highlight tactical differences between modes (e.g., comparing time savings against hazard exposure). No route mode is labeled "best"; incident commanders select modes based on current mission constraints.

### Offline Guarantees
- **Zero External Map Services**: No Google Maps, Mapbox, Leaflet tile servers, or online OpenStreetMap connections.
- **Zero Remote Routing APIs**: All shortest-path and multi-mode calculations execute locally using internal graph algorithms.
- **No Internet Required**: Map rendering, snapping, layer toggling, hazard evaluation, and route comparisons run 100% locally.
- **Resilient Local Execution**: Core software workflows are designed to operate offline when the local computing and radio equipment remain powered.

### Map Safety & Coordinate Integrity
- **Maximum Snap Distance**: Enforces `MAX_SNAP_DISTANCE_METERS = 5000` (5 km). Coordinates beyond 5 km return an explicit `LOCATION_OUTSIDE_MAP` status without artificial snapping.
- **Truthful Coordinate Handling**: Missing or unavailable incident/resource coordinates remain unavailable (`null` / `isLocationUnavailable: true`). SentinelGrid does not use fake `(0,0)` coordinate fallbacks.
- **Dataset Validation**: Built-in automated validation checks for duplicate node IDs, invalid coordinate ranges, orphan edges, self-loops, and non-positive edge distances.
- **One-Way Routing Enforcement**: Graph traversal strictly respects directed edge constraints, rejecting illegal counter-flow navigation.

### Map Diagnostics & Telemetry
The map subsystem exposes comprehensive diagnostic telemetry:
- Operational status (`OPERATIONAL`, `DEGRADED`)
- Dataset version and name (`2.0.0`, Synthetic Emergency Operations Grid)
- Element counts: 25 nodes, 35 roads, active hazards, blocked roads, and overlay objects
- Coordinate reference system (`WGS-84 Local Grid`, offline projection)
- Automated topology validation report
- External internet dependency status: `NONE`

### Map API Endpoints
All map endpoints require authentication (`requireAuth`):

| Method | Endpoint | Description | Access / RBAC |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/map/status` | Offline map operational status, dataset metadata, and offline notice | Authenticated |
| `GET` | `/api/map/data` | Complete operational map package (nodes, edges, layers, overlays, diagnostics) | Authenticated |
| `GET` | `/api/map/layers` | Active layer definitions and visibility states | Authenticated |
| `PUT` | `/api/map/layers/:layerId/visibility` | Toggle visibility for an operational layer | Authenticated |
| `GET` | `/api/map/roads` | Authoritative road network edges with classification metadata | Authenticated |
| `GET` | `/api/map/hazards` | Active GIS hazard perimeters | Authenticated |
| `GET` | `/api/map/operational-objects` | Overlay objects (incidents, resources, responders, hazards, blockages) | Authenticated |
| `GET` | `/api/map/diagnostics` | Map validation integrity, node/edge counts, and diagnostic telemetry | Authenticated |
| `POST` | `/api/map/validate` | On-demand topology validation report | Authenticated |
| `POST` | `/api/map/compare-routes` | Multi-mode route comparison (`FASTEST`, `SAFEST`, `BALANCED`) | Authenticated |
| `POST` | `/api/map/hazards` | Register an active hazard perimeter | `ADMIN`, `DISPATCHER`, `OPERATOR` |
| `DELETE` | `/api/map/hazards/:hazardId` | Remove an active hazard perimeter | `ADMIN`, `DISPATCHER`, `OPERATOR` |
| `POST` | `/api/map/blocked-roads` | Register a blocked road obstacle | `ADMIN`, `DISPATCHER`, `OPERATOR` |
| `DELETE` | `/api/map/blocked-roads/:blockedRoadId` | Clear a blocked road obstacle | `ADMIN`, `DISPATCHER`, `OPERATOR` |

---

## Phase 6, 6.1 & 6.1.1 — Offline CAD, Dispatch & Responder Workflow

SentinelGrid implements a complete Computer-Aided Dispatch (CAD) and responder workflow engine with strict server-side ownership enforcement:

- **9-State Lifecycle Machine**: Enforces valid transitions across `PENDING`, `DISPATCHED`, `ACKNOWLEDGED`, `EN_ROUTE`, `ARRIVED`, `ON_SCENE`, `COMPLETED`, `CANCELLED`, and `DECLINED`.
- **Authoritative Responder Ownership**: Responders can only transition dispatches assigned to their verified resource (`responder.assignedResourceId`). Attempts to update other units' dispatches return `403 Forbidden`.
- **Reassignment Workflow**: `ADMIN` and `DISPATCHER` roles can reassign dispatches to new resources, atomically updating resource states (`ASSIGNED` vs `AVAILABLE`) and preserving reassignment history.
- **Field Completion Reports**: Completed dispatches record verified victim counts and completion debrief notes directly into the permanent record.
- **Strict Role Boundaries**: Operators cannot trigger CAD state transitions; dispatch creation and reassignment require `ADMIN` or `DISPATCHER` roles.
- **Persistent Audit Logs**: Every dispatch creation, transition, and reassignment creates append-only, sequential audit entries.

---

## PHASE 5 & 5.1 & 5.1.1 — COMPLETED
### Resource Matching & Allocation Hardening

SentinelGrid implements a 100% offline-capable, multi-factor deterministic matching engine linking incident requirements with real-time resource capabilities, capacities, and geographic constraints.

#### Core Subsystem Capabilities:
- **Comprehensive Resource Inventory**: Manages and displays active emergency assets across diverse types (`AMBULANCE`, `MEDICAL_TEAM`, `RESCUE_TEAM`, `SHELTER`, `SUPPLY_UNIT`, `FIRE_UNIT`, `HAZMAT_UNIT`, `POLICE_UNIT`, `COMM_UNIT`, `UTILITY_UNIT`).
- **Resource Capabilities & Certification**: Matches units based on specific skill tags (`MEDICAL`, `FIRE`, `RESCUE`, `HAZMAT`, `COMMUNICATIONS`, `UTILITY`, `TRANSPORT`, `SHELTER`).
- **Seven-Factor Weighted Match Formula (0–100%)**: Calculates a highly precise, deterministic match score:
  - **Capability Score (30%)**: Matches required vs. available skills.
  - **Availability Score (20%)**: Rejects busy or out-of-service assets ($0$ score).
  - **Route Safety (15%)**: Penalizes routes crossing active hazard areas.
  - **Geographic Proximity (10%)**: Favors closer assets using straight-line Haversine math.
  - **Hazard Compatibility (10%)**: Prioritizes HAZMAT-equipped units on chemical incidents.
  - **Severity Fit (10%)**: Align emergency-tier resources with high/critical incidents while preserving specialized assets for low-priority events.
  - **Structured Capacity Score (5%)**: Evaluates resource size/occupancy dynamically against incident demands.
- **Structured Capacity Evaluation by Type**:
  - **AMBULANCE**: Evaluates `patientCapacity` (and `criticalCareCapacity` for critical-need incidents).
  - **MEDICAL_TEAM / RESCUE_TEAM**: Evaluates `teamSize`.
  - **SHELTER**: Evaluates `occupantCapacity`.
  - **SUPPLY_UNIT**: Evaluates `supplyCapacity`.
  - Other resource types map to a neutral `NOT_EVALUATED` capacity status.
- **Strict Eligibility Policy**: A resource is marked as the primary recommended match (`recommendedMatch = true`) only when it is `AVAILABLE`, has a `capabilityScore > 0`, and has a `routeFeasibility` of `REACHABLE` or `REACHABLE_WITH_HAZARD_WARNING`.
- **Explainable Operational Recommendations**: Generates transparent mathematical breakdowns and natural language summaries explaining why a unit is matching or warning operators about constraints (such as "Outside offline map coverage" or "Requires location verification").
- **Stateful Allocation & Release**: Operators can assign available resources to an incident (mutating status to `ASSIGNED` and linking coordinates) and release them back to `AVAILABLE` once resolved, preventing double-allocation race conditions.
- **Strict Role-Based Access Control (RBAC)**: Resource allocation and release endpoints require `ADMIN`, `DISPATCHER`, or `OPERATOR` roles, returning a strict 403 Forbidden for `RESPONDER` role.
- **Appended Audit Logs**: Every resource allocation and release operation produces persistent, sequential database entries (`RESOURCE_ALLOCATED`, `RESOURCE_RELEASED`) with actor IDs and authoritative roles.

---

## PHASE 4 & 4.1 — COMPLETED
### Offline GIS Foundation, Hazard-Aware Routing & Location Hardening

Implemented capabilities:
- **100% Offline Map Provider**: `LocalGraphMapProvider` serving a synthetic offline road network (11 nodes, 15 edges) with zero external map tiles or cloud GIS APIs.
- **Explicit Labeling**: Synthetic offline road network clearly labeled as "Synthetic Offline Demo Road Network" to prevent misrepresenting mock data as real geographic infrastructure.
- **Location Snap Safety (`MAX_SNAP_DISTANCE_METERS = 5000`)**: Enforces a strict maximum snapping distance of 5000 meters. Coordinates outside this threshold or outside the synthetic dataset boundaries return explicit `LOCATION_OUTSIDE_MAP` status without silently snapping far-away coordinates.
- **Elimination of 0,0 Fallback Coordinates**: Missing or unavailable route points return explicit `null` values instead of dummy `0,0` placeholder coordinates.
- **Directed Edge & One-Way Routing**: Directed graph routing correctly enforces one-way edges (`ONE_WAY` edge flag), permitting forward travel while preventing illegal reverse traversal.
- **Truthful Active Network Metrics & Explanation**: Accurately distinguishes total active blocked roads in the network (`activeBlockedEdgesInNetwork`) from blocked roads actually affecting candidate paths (`blockedEdgesAvoided`). Generated explanations state `Active blocked roads in network: X` without misleadingly claiming distant blocked edges were "bypassed".
- **Deterministic Shortest & Safest Route Engine**: Custom Dijkstra-based routing engine evaluating distance (`distanceMeters`), travel time (`estimatedTravelSeconds`), road classifications (`PRIMARY`, `SECONDARY`, `BRIDGE`, `TUNNEL`), and hazard penalties.
- **Configurable Route Modes**: Supports `FASTEST` (min travel time), `SAFEST` (max hazard avoidance), and `BALANCED` (weighted trade-off).
- **Hazard Zone Intersection**: Computes precise point-to-segment distances to identify edges passing through hazard danger radiuses (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Critical Hazard Bypass**: Automatically avoids roads traversing `CRITICAL` hazards or explicitly marked blocked roads.
- **Disconnected Route Handling**: Gracefully returns `NO_ROUTE` status with detailed diagnostic explanations when destination is disconnected by hazards or road blocks.
- **Explainable Route Decisions**: Generates human-readable route explanations detailing calculated distance, estimated time, mode selected, hazards avoided, and active network blockages.
- **Incident Location Resolution**: Calculates optimal routes directly to incident coordinates or nearest graph node without altering incident state.
- **Interactive SVG Map Visualizer**: Pure offline SVG canvas displaying road nodes, directional edges, hazard overlays, blocked road markers, active route highlights, and interactive node/edge selection.
- **Hazard & Blocked Road Management**: Dynamic creation, inspection, toggling, and deletion of active hazards and road blockages with local JSON file persistence.
- **Audit Logging**: Generates structured audit log entries (`GIS_ROUTE_CALCULATED`, `HAZARD_CREATED`, `HAZARD_DELETED`, `BLOCKED_ROAD_CREATED`, `BLOCKED_ROAD_DELETED`) capturing user ID, actor role, timestamp, and entity parameters.
- **RBAC Security Constraints**:
  - `GET /api/routing/*` (Map, Nodes, Hazards, Blocked Roads, Calculate): Accessible by `ADMIN`, `DISPATCHER`, `OPERATOR`, `RESPONDER`.
  - Hazard Creation: `ADMIN`, `DISPATCHER`, `OPERATOR`.
  - Hazard Deletion & Blocked Road Creation/Deletion: `ADMIN`, `DISPATCHER`.

> **Operational Disclaimer**: Phases 4, 5, 6, and 7 provide genuinely local, deterministic route calculation, resource matching, CAD dispatch, and operational GIS mapping using a synthetic offline road graph. They do not connect to external Google Maps, OpenStreetMap, or cloud GIS services.

---

## PHASE 3 — COMPLETED
### Offline AI-Assisted Triage & Structured Incident Intelligence

Implemented capabilities:
- **Local Heuristic Triage Provider**: 100% offline rule-based extraction engine with zero remote API calls.
- **Deterministic Category Extraction**: Identifies emergency categories (HAZMAT, Structural Collapse, Earthquake, Landslide, Flood, Fire, Road Accident, Medical, Security, Missing Person, Other) with deterministic precedence rules.
- **Deterministic Severity Classification**: Maps incident text to P1 (Immediate Life Threat), P2 (Urgent), P3 (Soon), or P4 (Routine).
- **Urgency Classification**: Categorizes urgency as IMMEDIATE, URGENT, SOON, or ROUTINE.
- **Estimated Victim Count Extraction**: Parses numeric and word-based victim counts from unstructured narrative text.
- **Verified Victim Count Separation**: Preserves authoritative responder-verified counts and strictly prevents converting estimated bystander figures into verified counts.
- **Hazard Extraction**: Identifies operational threats (e.g. chemical leaks, structural instability, water currents, traffic hazards).
- **Condition / Symptom Extraction**: Parses physical symptoms and field operational constraints.
- **Location Clue Extraction**: Extracts landmarks, road markers, and zone references without fabricating GPS coordinates.
- **Deterministic Confidence Scoring**: Calculates confidence levels based on indicator match density and text clarity.
- **Human-Review Flagging**: Automatically flags high-severity (P1), low-confidence, or ambiguous reports for mandatory human operator review.
- **SHA-256 Source Text Hashing**: Computes deterministic input hashes to verify report data integrity.
- **Historical Triage Records**: Retains append-only triage history protected from modification through the application API.
- **AI_TRIAGE_PERFORMED Audit Events**: Records structured audit logs capturing actor ID, authoritative actor role (ADMIN, DISPATCHER, OPERATOR, or SYSTEM), incident ID, triage ID, provider version, source hash, severity, category, and human-review flag.
- **RBAC-Protected Triage Execution**: Restricts triage execution to ADMIN, DISPATCHER, and OPERATOR roles, denying RESPONDER (403) and unauthenticated requests (401).
- **No Cloud AI Dependency**: Operates completely air-gapped without Gemini or external cloud endpoints.
- **Offline-First Operation**: Runs entirely on local computing hardware.

> **Operational Disclaimer**: The Phase 3 engine is a deterministic local heuristic decision-support system. It is not an autonomous medical diagnosis system.
> 
> **Advisory Separation**: Triage results are advisory and do not automatically modify authoritative incident severity or incident status.

---

## Phase 2.1 Offline Mesh Network Simulation Engine

The Phase 2.1 simulation subsystem simulates virtual ad-hoc wireless mesh communication without physical radio hardware:

- **Node Types**: `COMMAND` (HQ/EOC), `RELAY` (Autonomous Repeaters), `RESPONDER` (Field Teams), and `FIELD` (Sensors/Outposts).
- **Topology Management**: Nodes can be dynamically created, edited, toggled `ONLINE`/`OFFLINE`, or linked to neighbor nodes.
- **Routing Engine**: Breadth-First Search (BFS) graph traversal through online nodes to determine the shortest hop path.
- **Duplicate Packet Detection**: Packets with duplicate `packetId` values are rejected immediately with `DUPLICATE_DROPPED` telemetry events and tracked in the duplicate metrics counter.
- **Hop & TTL Limits**: Packets decrement TTL at each hop (`TTL_EXPIRED` if 0) and enforce a configurable `maxHops` ceiling (`MAX_HOPS_EXCEEDED` if breached).
- **Asymmetric ACK Return**: When requested, destination nodes emit virtual ACK packets along the reverse path, verifying intermediate node operational status and simulating configurable ACK loss.
- **Incident Mesh Broadcast**: Integrates existing incident reports into standard virtual mesh packets for situational awareness broadcast.
- **Deterministic Testing Mode**: Supports deterministic mode for reproducible test executions with zero randomness.

---

## Radio Frequency & Indian Regulatory Compliance

During future physical hardware integration phases, radio frequency selection and power profiles will strictly adhere to national telecommunications standards:

> **Radio configuration will be selected according to the applicable Indian regulatory requirements and the specific Meshtastic-compatible hardware used during the hardware integration phase.**

- **Current Status**: No physical LoRa or radio hardware is connected. Mesh network telemetry is presented transparently as an offline simulation foundation.
- **No Preset Frequency Claim**: No single frequency (e.g., US915, EU868, 433 MHz) is claimed as the final SentinelGrid deployment configuration. Frequencies and transmission masks will comply with Department of Telecommunications (DoT) / WPC guidelines for license-exempt operations in India once compatible hardware is integrated.

---

## Security Model & Role-Based Access Control (RBAC)

All authorization checks in SentinelGrid are strictly enforced **server-side**:

| Role | Incident Creation | Incident Status Update | AI Triage | Resource Match/Alloc | Dispatch Create/Reassign | Dispatch Status Update | Map Routing & Overlays | Map Hazard/Block Mgmt | RAG Knowledge Query | Knowledge Protocol Mgmt | Corroboration Query | Corroboration Override | User Management | Mesh Simulation | System Diagnostics |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DISPATCHER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (403) | ✅ | ✅ | ❌ (403) | ✅ | ❌ (403) |
| **RESPONDER** | ❌ (403) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ✅ (Assigned Only) | ✅ | ❌ (403) | ✅ | ❌ (403) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| **OPERATOR** | ✅ | ❌ (403) | ✅ | ✅ | ❌ (403) | ❌ (403) | ✅ | ✅ | ✅ | ❌ (403) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |

### Initial Account Bootstrap & Credential Model
- **Zero Default Passwords**: SentinelGrid never ships with insecure hardcoded default credentials (e.g. no `admin/admin`).
- **First-User Administrator Bootstrap**:
  - The first user registered in a clean deployment is automatically granted the `ADMIN` role.
  - Subsequent registered users receive the `OPERATOR` role by default, preventing unprivileged users from self-assigning elevated roles.
  - System Administrators can adjust user roles (`ADMIN`, `DISPATCHER`, `RESPONDER`, `OPERATOR`) and disable accounts via the Admin Management console.
- **Cryptographic Secret Enforcement (`AUTH_SECRET`)**:
  - If `AUTH_SECRET` is supplied via environment variables, it must contain at least 64 characters (corresponding to a 32-byte hexadecimal secret representation). If present but shorter than 64 characters, the server fails closed immediately on startup.
  - If `AUTH_SECRET` is absent, SentinelGrid generates a cryptographically secure 32-byte (64 hex characters) secret and stores it locally at `data/.auth_secret` with restricted permissions (`0600`).
- **Database Persistence & Availability Safeguards**:
  - The local database engine explicitly enters a `DATABASE_UNAVAILABLE` degraded state if the storage directory or JSON file cannot be initialized or written.
  - Write and mutation operations fail closed (`DATABASE_UNAVAILABLE: Database persistence is currently unavailable`) instead of silently operating in volatile memory.
  - Corrupted JSON database files are automatically backed up with a timestamp before clean state re-initialization.
- **Atomic Dispatch Reassignment Safety**:
  - Reassignment of emergency dispatches executes with an atomic rollback safety wrapper. If allocation of the new resource or updating of the dispatch record fails, the prior resource allocation and dispatch state are restored cleanly. Neither resource is left orphaned or double-allocated.

### Key Security Safeguards:
- **Password Hashing**: Uses Node.js `crypto.scryptSync` with a cryptographically secure 16-byte random salt and 64-byte derived key length.
- **Session Tokens**: Uses signed HMAC-SHA256 tokens with timing-safe signature comparison (`crypto.timingSafeEqual`).
- **Authoritative Database Role Resolution**: Tokens verify identity (`userId`), but the user's role is always re-queried from the local database on each request.
- **Disabled Account Rejection**: Disabled accounts are instantly rejected at the authentication layer.
- **Last Administrator Protection**: The system prevents demoting or deleting the final remaining administrator account.
- **Revoked Token Hashing**: Revoked session tokens are stored as cryptographic SHA-256 hashes (`64 hex characters`).
- **Protected System Endpoints**: All triage, mesh, routing, dispatch, and system routes enforce authentication and granular role checks.
- **Append-Only Audit Logging**: System operations generate sequential audit log records in the local database. Note: While append-only at the application layer, local database files are not cryptographically signed/immutable against direct host filesystem edits.
- **AI Provider Boundary**: `LocalHeuristicProvider` is the sole active operational triage provider. Cloud `GeminiProvider` and local `LocalModelProvider` exist as inactive extension stubs with zero runtime invocation.

---

## Verification & Testing

```bash
# Run comprehensive automated test suite (Auth, RBAC, Data Integrity, Mesh Simulation, AI Triage, Audit Logs)
npm test

# Run code linter
npm run lint

# Compile and verify production build
npm run build
```
