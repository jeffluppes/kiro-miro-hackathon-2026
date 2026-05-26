# Implementation Plan

## Overview

Hackathon PoC implementation tasks, scoped for a demo-able slice. Tasks are grouped into phases that build on each other. Each task references the requirements it satisfies.

## Tasks

### Phase 1: Project Skeleton

- [ ] 1. Initialize Vite + React + TypeScript project
  - _Requirements: REQ-12, REQ-14_
  - Files: `package.json`, `tsconfig.json`, `vite.config.ts`

- [ ] 2. Set up Express + TypeScript backend
  - _Requirements: REQ-14_
  - Files: `backend/package.json`, `backend/src/index.ts`

- [ ] 3. Add SQLite + simple migrations / seed data
  - _Requirements: REQ-4, REQ-11_
  - Files: `backend/src/db/schema.sql`, `backend/src/db/seed.ts`

- [ ] 4. Add `docker-compose.yml` for local run
  - _Requirements: REQ-14_
  - Files: `docker-compose.yml`, `Dockerfile`

- [ ] 5. Lightweight role-based identity (localStorage)
  - _Requirements: REQ-1_
  - Files: `src/contexts/UserContext.tsx`, `src/screens/RolePicker.tsx`

### Phase 2: Core Case Management

- [ ] 6. Student incident reporting form
  - _Requirements: REQ-2_
  - Files: `src/screens/ReportIncident.tsx`, `backend/src/routes/cases.ts`

- [ ] 7. Teacher dashboard with case list and alerts
  - _Requirements: REQ-3, REQ-12_
  - Files: `src/screens/Dashboard.tsx`, `src/components/AlertCard.tsx`

- [ ] 8. Case CRUD API and data model
  - _Requirements: REQ-4_
  - Files: `backend/src/routes/cases.ts`, `backend/src/models/Case.ts`

- [ ] 9. Case detail screen with lifecycle tracker
  - _Requirements: REQ-4_
  - Files: `src/screens/CaseDetail.tsx`, `src/components/LifecycleTracker.tsx`

- [ ] 10. In-app/browser notifications for new alerts
  - _Requirements: REQ-3_
  - Files: `src/services/notifications.ts`

### Phase 3: Evidence & Communication

- [ ] 11. Evidence upload (file + notes)
  - _Requirements: REQ-5_
  - Files: `src/components/EvidencePanel.tsx`, `backend/src/routes/evidence.ts`

- [ ] 12. Communication panel with three channels (student/parent/staff)
  - _Requirements: REQ-8_
  - Files: `src/components/CommunicationPanel.tsx`, `backend/src/routes/messages.ts`

- [ ] 13. Authorities/government channel with stub send
  - _Requirements: REQ-9_
  - Files: `src/components/AuthoritiesChannel.tsx`, `backend/src/routes/authorities.ts`

### Phase 4: AI Features

- [ ] 14. LLM client wrapper (single provider abstraction)
  - _Requirements: REQ-6, REQ-7, REQ-8, REQ-9_
  - Files: `backend/src/services/llm.ts`

- [ ] 15. AI checklist generation per case
  - _Requirements: REQ-6_
  - Files: `backend/src/services/checklist.ts`, `src/components/ChecklistPanel.tsx`

- [ ] 16. Agentic helpline chat with signal detection
  - _Requirements: REQ-7_
  - Files: `backend/src/services/helpline.ts`, `src/screens/Helpline.tsx`

- [ ] 17. Tone adaptation for outbound messages
  - _Requirements: REQ-8_
  - Files: `backend/src/services/tone.ts`

- [ ] 18. AI-drafted authority report
  - _Requirements: REQ-9_
  - Files: `backend/src/services/draft-report.ts`

### Phase 5: Context & Polish

- [ ] 19. Legal guidance panel with jurisdiction-aware content
  - _Requirements: REQ-10_
  - Files: `src/components/LegalGuidancePanel.tsx`, `backend/src/data/legal-content.ts`

- [ ] 20. Local resources directory (Bureau Halt and similar)
  - _Requirements: REQ-11_
  - Files: `src/components/LocalResourcesPanel.tsx`, `backend/src/data/resources.ts`

- [ ] 21. Audit log per case
  - _Requirements: REQ-13_
  - Files: `src/components/AuditLog.tsx`, `backend/src/services/audit.ts`

- [ ] 22. Design system: calm color palette, typography, spacing
  - _Requirements: REQ-12_
  - Files: `src/styles/theme.ts`, `src/components/ui/*`

- [ ] 23. App routing and main navigation
  - _Requirements: All_
  - Files: `src/App.tsx`, `src/router.tsx`

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2, 3, 4], "description": "Project skeleton (frontend, backend, db, docker)" },
    { "wave": 2, "tasks": [5, 8], "description": "Identity + case data model" },
    { "wave": 3, "tasks": [6, 7, 9, 14], "description": "Core screens + LLM wrapper" },
    { "wave": 4, "tasks": [10, 11, 12, 13, 15, 16, 19, 20, 21, 22], "description": "Features built on top of case detail and LLM" },
    { "wave": 5, "tasks": [17, 18], "description": "AI features depending on communication channels" },
    { "wave": 6, "tasks": [23], "description": "Final routing and navigation wiring" }
  ]
}
```

```
Phase 1 (skeleton)
  1 ──┬── 5
  2 ──┤
  3 ──┤
  4 ──┘

Phase 2 (case management) — depends on Phase 1
  8 (API) ── 6 (student form)
          ── 7 (dashboard) ── 10 (notifications)
          ── 9 (case detail)

Phase 3 (evidence + comms) — depends on 9
  9 ── 11 (evidence)
    ── 12 (communication)
    ── 13 (authorities)

Phase 4 (AI features) — depends on 14
  14 (LLM wrapper) ── 15 (checklist)        depends on 9
                  ── 16 (helpline)          standalone screen
                  ── 17 (tone adapt)        depends on 12
                  ── 18 (draft report)      depends on 13

Phase 5 (polish) — depends on 9
  19, 20, 21 attach to case detail
  22 (design system) — can be done in parallel
  23 (routing) — depends on 1, 5, key screens existing
```

## Notes

- Demo path priority: Phase 1 → 6 → 7 → 9 → 14 → 15 → 12 → 17 → 16 → 13 → 18
- Phases 1 and 2 are required before anything is demoable
- Phase 4 (AI features) is the differentiator; prioritize 15 (checklist) and 16 (helpline) for the demo
- Phase 5 polish items can be added incrementally as time allows
