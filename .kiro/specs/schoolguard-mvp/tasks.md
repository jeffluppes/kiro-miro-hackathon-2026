# Implementation Plan: SchoolGuard MVP — Jurisdiction-Aware Resource Discovery

## Overview

Implement a local-first hackathon MVP where a teacher enters a school name and an AI agent (Anthropic Claude with tool-use) discovers jurisdiction-specific anti-bullying resources. The system uses React + Vite + TypeScript on the frontend, Node.js + Express on the backend, SQLite for persistence, and fast-check/vitest for testing. Tasks are ordered to deliver the hero feature (jurisdiction discovery) first, then layer on resource routing, case management, and the frontend.

## Tasks

- [ ] 1. Project scaffolding and shared types
  - [ ] 1.1 Initialize monorepo structure with backend and frontend directories
    - Create `backend/` (Express + TypeScript) and `frontend/` (React + Vite + TypeScript) directories
    - Add root `package.json` with workspace scripts (`npm run dev`, `npm run test`)
    - Configure `tsconfig.json` for both packages with strict mode
    - Install dependencies: express, better-sqlite3, uuid, zod, @anthropic-ai/sdk, vitest, fast-check
    - _Requirements: 12.1, 12.2_

  - [ ] 1.2 Define shared data model interfaces and types
    - Create `backend/src/types/` with interfaces: `JurisdictionProfile`, `DiscoveredResource`, `LegalObligation`, `ReportingProcedure`, `Case`, `ChecklistItem`, `LegalGuidance`
    - Define enums/unions: `ProfileStatus`, `StakeholderRole`, `ResourceCategory`, `CaseStage`, `CasePriority`
    - Add Zod schemas for runtime validation of API request/response payloads
    - _Requirements: 1.2, 8.1, 6.4_

  - [ ] 1.3 Set up SQLite database layer with migrations
    - Create `backend/src/db/` with better-sqlite3 initialization
    - Write migration for tables: `jurisdiction_profiles`, `discovered_resources`, `legal_obligations`, `reporting_procedures`, `cases`, `checklist_items`, `case_stage_history`
    - Implement basic repository functions: `createProfile`, `getProfile`, `updateProfile`, `getProfileBySchoolName`
    - _Requirements: 12.1_

- [ ] 2. Jurisdiction Discovery Service (hero feature)
  - [ ] 2.1 Implement known Dutch resource seed data
    - Create `backend/src/services/knownResources.ts` with pre-seeded Dutch resources (Kindertelefoon, Meldknop.nl, Stichting School & Veiligheid, Stop Pesten NU, stoppestennu.nl)
    - Each resource includes: name, description, url, phone, targetAudience, category, confidence (0.99)
    - Implement `getKnownResourcesForCountry(country: string)` function
    - _Requirements: 2.1, 2.3, 7.5_

  - [ ] 2.2 Implement the AI agent loop with Anthropic tool-use
    - Create `backend/src/services/aiAgent.ts` implementing `processAgentLoop()`
    - Define the `web_search` tool schema for Anthropic tool-use
    - Implement the agentic loop: send message → process tool_use blocks → execute web search → feed results back → repeat until stop
    - Parse final text response into `StructuredDiscoveryResult` using Zod
    - Handle partial failures: if a search fails, continue with remaining goals
    - _Requirements: 1.1, 1.5, 9.1, 9.2_

  - [ ] 2.3 Implement `mergeWithKnownResources()` logic
    - Create merge function that combines AI-discovered resources with known resources
    - Implement fuzzy matching (name includes matchKey, URL contains fragment) for deduplication
    - When duplicate found: set `isKnownResource = true`, confidence = max(discovered, 0.95)
    - When not found: add known resource with confidence 0.99, source = "pre-seeded"
    - Preserve all AI-discovered resources (never remove)
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 2.4 Write property tests for known resource merging
    - **Property 1: Known resources always present**
    - **Property 2: Merge preserves discovered resources**
    - **Property 3: Known resource confidence floor**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 7.5**

  - [ ] 2.5 Implement `JurisdictionDiscoveryService` orchestrator
    - Create `backend/src/services/jurisdictionDiscovery.ts` implementing `IJurisdictionDiscoveryService`
    - Implement `discoverJurisdiction(schoolName)`: check cache → create profile → run AI agent → merge known resources → store as pending_review
    - Implement `approveProfile(profileId, teacherId)`: validate status is pending_review → update to approved → set approvedAt, approvedBy → mark all resources verified
    - Implement `rejectProfile(profileId, teacherId, reason)`: validate status → update to rejected → record reason
    - Implement `getApprovedProfile(schoolId)`: return cached approved profile if not stale
    - Implement `refreshProfile(profileId)`: trigger new discovery, create new pending profile
    - Handle error case: if AI cannot locate school, return profile with empty municipality, confidence 0.1
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.2, 4.3, 5.4, 9.1_

  - [ ]* 2.6 Write property tests for profile status transitions
    - **Property 6: Profile status transitions**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 2.7 Write property tests for confidence score bounds
    - **Property 7: Confidence score bounds**
    - **Validates: Requirements 7.1, 7.2**

- [ ] 3. Checkpoint — Core discovery service
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Resource Routing Service
  - [ ] 4.1 Implement `ResourceRoutingService`
    - Create `backend/src/services/resourceRouting.ts` implementing `IResourceRoutingService`
    - Implement `getResourcesForRole(role, jurisdictionId)`: fetch approved profile → filter by targetAudience includes role → filter by verifiedByTeacher === true → sort (known first, then confidence desc)
    - Implement `getAllResources(jurisdictionId)`: return all verified resources from approved profile
    - Return empty array when profile not approved or no resources match
    - Map resources to `RoutedResource` format with `actionLabel` and `actionUrl`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.4_

  - [ ]* 4.2 Write property tests for resource routing
    - **Property 4: Resource routing correctness**
    - **Property 5: Resource routing sort order**
    - **Validates: Requirements 3.1, 3.2, 3.3, 4.4**

- [ ] 5. Case Management Service
  - [ ] 5.1 Implement `CaseManagementService`
    - Create `backend/src/services/caseManagement.ts` implementing `ICaseManagementService`
    - Implement `createCase(data)`: validate jurisdictionProfileId references an approved profile → create case with stage "report" → generate checklist via AI using jurisdiction context
    - Implement `updateStage(caseId, stage)`: validate transition → update stage → record in case_stage_history with timestamp and teacherId
    - Implement `getCase(caseId)` and `getCasesForTeacher(teacherId)`
    - Implement `getLegalGuidance(caseId)`: fetch linked profile → return legalObligations and reportingProcedures
    - Implement `generateChecklist(caseId)`: call AI agent with case context + jurisdiction profile to produce jurisdiction-aware checklist items
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 5.2 Write property tests for case-jurisdiction linkage
    - **Property 9: Case-jurisdiction linkage**
    - **Validates: Requirements 6.1**

  - [ ]* 5.3 Write property tests for case stage audit trail
    - **Property 12: Case stage audit trail**
    - **Validates: Requirements 6.5**

- [ ] 6. Checkpoint — Backend services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. REST API layer
  - [ ] 7.1 Implement jurisdiction discovery API routes
    - Create `backend/src/routes/jurisdiction.ts`
    - `POST /api/jurisdiction/discover` — accepts `{ schoolName }`, returns JurisdictionProfile (status: pending_review or cached approved)
    - `GET /api/jurisdiction/:profileId` — returns profile by ID
    - `POST /api/jurisdiction/:profileId/approve` — teacher approves profile
    - `POST /api/jurisdiction/:profileId/reject` — teacher rejects profile with reason
    - `POST /api/jurisdiction/:profileId/refresh` — trigger re-discovery for stale profile
    - `PATCH /api/jurisdiction/:profileId/resources/:resourceId` — edit individual resource during review
    - Add Zod validation middleware for all request bodies
    - _Requirements: 1.1, 1.2, 1.3, 4.2, 4.3, 4.5, 5.4_

  - [ ] 7.2 Implement resource routing API routes
    - Create `backend/src/routes/resources.ts`
    - `GET /api/resources?role={role}&jurisdictionId={id}` — returns filtered resources for role
    - `GET /api/resources/all?jurisdictionId={id}` — returns all verified resources
    - Add input validation for role enum
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 7.3 Implement case management API routes
    - Create `backend/src/routes/cases.ts`
    - `POST /api/cases` — create case linked to jurisdiction profile
    - `GET /api/cases/:id` — get case with checklist
    - `GET /api/cases?teacherId={id}` — list cases for teacher
    - `PATCH /api/cases/:id/stage` — update case stage
    - `GET /api/cases/:id/legal-guidance` — get jurisdiction-specific legal guidance
    - Add Zod validation for all inputs
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.1, 11.3_

  - [ ] 7.4 Implement Express app entry point and middleware
    - Create `backend/src/index.ts` with Express app setup
    - Add CORS middleware, JSON body parser, error handling middleware
    - Mount all route modules
    - Add environment variable loading (ANTHROPIC_API_KEY)
    - _Requirements: 12.2_

- [ ] 8. Checkpoint — Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Frontend — Discovery form and review panel (hero feature UI)
  - [ ] 9.1 Set up React + Vite frontend with routing
    - Initialize Vite + React + TypeScript project in `frontend/`
    - Install dependencies: react-router-dom, axios or fetch wrapper
    - Set up basic routing: `/discover`, `/review/:profileId`, `/resources`, `/cases`, `/report`
    - Create shared API client module for backend communication
    - _Requirements: 12.2_

  - [ ] 9.2 Implement School Discovery Form component
    - Create `frontend/src/components/DiscoveryForm.tsx`
    - Input field for school name with submit button
    - On submit: call `POST /api/jurisdiction/discover`
    - Show progress indicators during discovery (phases: locating school, finding policies, discovering resources)
    - Handle long discovery (>10s): show "continue working" option
    - Handle error states: display partial results with confidence warning
    - On completion: navigate to review panel
    - _Requirements: 1.1, 10.1, 10.2, 10.3_

  - [ ] 9.3 Implement Teacher Review Panel component
    - Create `frontend/src/components/ReviewPanel.tsx`
    - Display discovered resources, legal obligations, and reporting procedures
    - Show confidence scores with visual indicators (warning badge if profile < 0.5, de-emphasize resources < 0.4)
    - Allow teacher to approve entire profile, reject with reason, or edit individual resources
    - Show profile status badge (pending_review, approved, rejected, stale)
    - Stale profile: show banner "information may be outdated" with refresh button
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.3, 7.3, 7.4_

  - [ ] 9.4 Implement Resource Viewer component
    - Create `frontend/src/components/ResourceViewer.tsx`
    - Role selector (student, parent, teacher, coordinator)
    - Fetch and display resources filtered by selected role
    - Show known resources with distinct styling (higher trust indicator)
    - Display action buttons (call, visit website, report) per resource category
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 10. Frontend — Case management and student reporting
  - [ ] 10.1 Implement Teacher Dashboard component
    - Create `frontend/src/components/TeacherDashboard.tsx`
    - List active cases with status indicators
    - Show new incident alerts
    - Quick access to jurisdiction profiles (approved, pending, stale)
    - Link to create new case or start new discovery
    - _Requirements: 11.3, 6.4_

  - [ ] 10.2 Implement Case Lifecycle component
    - Create `frontend/src/components/CaseLifecycle.tsx`
    - Display case details with jurisdiction-aware checklist
    - Stage progression UI (report → triage → review → action → resolve)
    - Legal guidance panel showing obligations and procedures from linked profile
    - Stage transition buttons with confirmation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 10.3 Implement Student Report Form component
    - Create `frontend/src/components/StudentReportForm.tsx`
    - Simple form: description (textarea), date (date picker), optional file attachment placeholder
    - On submit: create case via `POST /api/cases` linked to school's approved profile
    - Confirmation message after submission
    - _Requirements: 11.1, 11.2_

- [ ] 11. Integration wiring and cache/staleness logic
  - [ ] 11.1 Implement cache staleness checks and refresh flow
    - Add `isStale()` and `shouldRefresh()` utility functions
    - Wire staleness check into profile retrieval: mark profiles as stale when expired
    - Implement low-confidence refresh recommendation (confidence < 0.6 AND age > 7 days)
    - Ensure stale profiles continue serving while showing outdated banner
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 11.2 Write property tests for cache staleness
    - **Property 10: Cache staleness correctness**
    - **Validates: Requirements 5.1, 5.2, 5.5**

  - [ ] 11.3 Wire frontend to backend end-to-end
    - Ensure all frontend components connect to correct API endpoints
    - Add loading states, error boundaries, and toast notifications
    - Verify the full demo flow: enter school → discover → review → approve → view resources → create case
    - _Requirements: 10.1, 10.2, 10.3, 12.2_

- [ ] 12. Final checkpoint — Full system integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The hero feature (jurisdiction discovery) is prioritized in tasks 1-3 so it can be demoed early
- All TypeScript throughout — no language ambiguity
- Local-first: only external dependency is the Anthropic API key

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.5"] },
    { "id": 4, "tasks": ["2.4", "2.6", "2.7"] },
    { "id": 5, "tasks": ["4.1", "5.1"] },
    { "id": 6, "tasks": ["4.2", "5.2", "5.3"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["9.1"] },
    { "id": 9, "tasks": ["9.2", "9.3", "9.4", "10.1", "10.2", "10.3"] },
    { "id": 10, "tasks": ["11.1"] },
    { "id": 11, "tasks": ["11.2", "11.3"] }
  ]
}
```
