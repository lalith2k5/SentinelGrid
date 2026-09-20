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
   - **Future Phases (Not in Scope / Roadmap Only)**: Phase 7 Offline Operational GIS / Map & Routing expansion, real Meshtastic/LoRa physical hardware interfaces, satellite failover, and acoustic detection.

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

> **Operational Disclaimer**: Phase 4 and Phase 5 provide a genuinely local, deterministic route calculation and resource matching engine using a synthetic offline road graph. They do not connect to external Google Maps, OpenStreetMap, or cloud GIS services.

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

| Role | Incident Creation | Incident Status Update | AI Triage Execution | Resource Creation & Status | Hazard Creation | Road Block / Hazard Del | User Management | Mesh Simulation | System Diagnostics |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DISPATCHER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (403) | ✅ | ❌ (403) |
| **RESPONDER** | ❌ (403) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| **OPERATOR** | ✅ | ❌ (403) | ✅ | ❌ (403) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |

### Key Security Safeguards:
- **Authoritative Database Role Resolution**: Tokens verify identity (`userId`), but the user's role is always re-queried from the local database on each request.
- **Disabled Account Rejection**: Disabled accounts are instantly rejected at the authentication layer.
- **Last Administrator Protection**: The system prevents demoting or deleting the final remaining administrator account.
- **Revoked Token Hashing**: Revoked session tokens are stored as cryptographic SHA-256 hashes (`64 hex characters`).
- **Protected System Endpoints**: All triage, mesh, and system routes enforce authentication and granular role checks.

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
