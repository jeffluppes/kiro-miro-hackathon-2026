# Tasks: SchoolGuard (Defuse) — Hackathon PoC

> Scoped for demo-able proof of concept. Security, compliance, and offline deferred.

## Phase 1: Project Setup & Auth

- [ ] **Task 1.1:** Initialize React project with TypeScript (Vite + React)
  - Requirements: REQ-1
  - Files: `package.json`, `tsconfig.json`, `vite.config.ts`

- [ ] **Task 1.2:** Set up simple backend (Node.js + Express or serverless)
  - Requirements: REQ-3, REQ-4
  - Files: `backend/package.json`, `backend/src/index.ts`

- [ ] **Task 1.3:** Implement email/password login (simple JWT auth)
  - Requirements: REQ-1
  - Files: `src/screens/Login.tsx`, `backend/src/routes/auth.ts`

## Phase 2: Core Case Management

- [ ] **Task 2.1:** Build Incident Alert Dashboard
  - Requirements: REQ-2, REQ-8
  - Files: `src/screens/Dashboard.tsx`, `src/components/AlertCard.tsx`

- [ ] **Task 2.2:** Implement case CRUD API
  - Requirements: REQ-3
  - Files: `backend/src/routes/cases.ts`, `backend/src/models/Case.ts`

- [ ] **Task 2.3:** Build Case Overview screen with lifecycle tracker
  - Requirements: REQ-3, REQ-8
  - Files: `src/screens/CaseOverview.tsx`, `src/components/LifecycleTracker.tsx`

- [ ] **Task 2.4:** Student incident submission form
  - Requirements: REQ-2
  - Files: `src/screens/ReportIncident.tsx`

## Phase 3: Evidence & Communication

- [ ] **Task 3.1:** Build Evidence Documentation screen
  - Requirements: REQ-4
  - Files: `src/screens/EvidenceDocumentation.tsx`

- [ ] **Task 3.2:** Implement file upload (S3 or simple cloud storage)
  - Requirements: REQ-4
  - Files: `backend/src/routes/evidence.ts`, `src/services/upload.ts`

- [ ] **Task 3.3:** Build Communication screen with basic messaging
  - Requirements: REQ-6
  - Files: `src/screens/Communication.tsx`, `src/components/MessageThread.tsx`

## Phase 4: AI Features (Demo Polish)

- [ ] **Task 4.1:** Implement AI checklist generation (LLM API call)
  - Requirements: REQ-5
  - Files: `backend/src/services/ai-checklist.ts`, `src/components/TaskChecklist.tsx`

- [ ] **Task 4.2:** Implement AI tone adaptation for messages
  - Requirements: REQ-6
  - Files: `backend/src/services/ai-tone.ts`

- [ ] **Task 4.3:** Add bottom navigation and screen routing
  - Requirements: All
  - Files: `src/navigation/AppRouter.tsx`, `src/components/BottomNav.tsx`
