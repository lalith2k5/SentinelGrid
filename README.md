# SentinelGrid — Offline-First Emergency Command & Coordination Platform

SentinelGrid is an offline-first emergency incident command, triage, and resource coordination platform engineered for mission-critical disaster response in compromised communication environments.

---

## Phase 1 Architecture & Operational Guarantees

SentinelGrid Phase 1 provides an air-gapped, zero-cloud foundation designed to operate continuously when cell towers, power grids, and internet backbones fail.

### Core Architectural Principles:
1. **100% Offline-First**: All core incident tracking, resource staging, triage workflows, user management, and audit logging execute entirely on local hardware with zero external dependencies.
2. **Zero Cloud Requirement**: Phase 1 does not require a cloud database (e.g. Firebase, Cloud SQL, MongoDB Atlas) or remote storage. All data is persisted to a local, atomic JSON datastore with transaction journaling and automatic sequence numbering.
3. **No External APIs or Internet Required**: SentinelGrid requires zero internet connectivity to run. It does not ping external analytics, CDNs, telemetry servers, or remote endpoints.
4. **Gemini & AI are Completely Optional**: Phase 1 does **not** require Gemini or any external AI services. If a `GEMINI_API_KEY` is provided, it is strictly optional and only evaluated for later-phase AI advisory features. Core local emergency response operates autonomously without AI.
5. **Phase Boundaries**:
   - **Phase 1 (Current)**: Hardened offline core — Incident management, resource staging, strict role-based access control, cryptographic session handling, and immutable audit logs.
   - **Phase 2 (Roadmap)**: Decentralized Mesh Communication & virtual LoRa packet router simulation.
   - **Phase 3 (Roadmap)**: Local-first AI-assisted incident triage & resource dispatch recommendations.

---

## Radio Frequency & Indian Regulatory Compliance

During the Phase 2 hardware integration phase, radio frequency selection and power profiles will strictly adhere to national telecommunications standards:

> **Radio configuration will be selected according to the applicable Indian regulatory requirements and the specific Meshtastic-compatible hardware used during the hardware integration phase.**

- **Phase 1 Status**: No physical LoRa or radio hardware is connected. Mesh network telemetry is presented transparently as a Phase 2 simulation foundation.
- **No Preset Frequency Claim**: No single frequency (e.g., US915, EU868, 433 MHz) is claimed as the final SentinelGrid deployment configuration. Frequencies and transmission masks will comply with Department of Telecommunications (DoT) / WPC guidelines for license-exempt operations in India once compatible hardware is integrated.

---

## Security Model & Role-Based Access Control (RBAC)

All authorization checks in SentinelGrid are strictly enforced **server-side**:

| Role | Incident Creation | Incident Status Update | Resource Creation & Status | User Management | System Diagnostics & AI Config |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **ADMIN** |  |  |  |  |  |
| **DISPATCHER** |  |  |  | ❌ (403) | ❌ (403) |
| **RESPONDER** | ❌ (403) |  | ❌ (403) | ❌ (403) | ❌ (403) |
| **OPERATOR** |  | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |

### Key Security Safeguards:
- **Authoritative Database Role Resolution**: Tokens verify identity (`userId`), but the user's role is always re-queried from the local database on each request. If an admin demotes or deletes a user, subsequent requests with existing tokens immediately reflect the updated status or are rejected (401).
- **Disabled Account Rejection**: Disabled accounts are instantly rejected at the authentication layer.
- **Last Administrator Protection**: The system prevents demoting or deleting the final remaining administrator account. At least one active administrator account must remain at all times.
- **Revoked Token Hashing**: Revoked session tokens are stored as cryptographic SHA-256 hashes (`64 hex characters`). Raw bearer tokens are never persisted in the database.
- **Protected System Endpoints**: `/api/system/status`, `/api/system/mesh-metrics`, and `/api/system/ai-providers` require authenticated sessions. `/api/system/ai-providers` requires `ADMIN` role. No API keys, passwords, or authentication secrets are ever exposed.

---

## Development & Testing

```bash
# Run standalone verification test suite (all auth, RBAC, safety, and token tests)
bun run test

# Run code linter
npm run lint

# Compile and build application
npm run build
```
