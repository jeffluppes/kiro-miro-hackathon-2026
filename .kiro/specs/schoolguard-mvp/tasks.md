# Implementation Plan

## Overview

Netherlands-first hackathon PoC on AWS serverless. Frontend on S3+CloudFront, backend on API Gateway + Lambda + DynamoDB, AI via Amazon Bedrock (Claude). All content, resources, and legal references target Dutch schools.

## Tasks

### Phase 1: Project Skeleton & Infrastructure

- [ ] 1. Initialize Vite + React + TypeScript project with Dutch locale
  - _Requirements: REQ-13, REQ-15_
  - Files: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/src/i18n/nl.ts`

- [ ] 2. Initialize AWS CDK project (TypeScript)
  - _Requirements: REQ-15_
  - Files: `infra/package.json`, `infra/bin/app.ts`, `infra/lib/defuse-stack.ts`

- [ ] 3. CDK: DynamoDB tables (Dossiers, Evidence, Messages, HelplineConversations, AuditLog, ChecklistItems)
  - _Requirements: REQ-4, REQ-5, REQ-8, REQ-14_
  - Files: `infra/lib/defuse-stack.ts`

- [ ] 4. CDK: S3 buckets (frontend hosting, evidence uploads) + CloudFront distribution
  - _Requirements: REQ-5, REQ-15_
  - Files: `infra/lib/defuse-stack.ts`

- [ ] 5. CDK: API Gateway REST API + Lambda function scaffolding
  - _Requirements: REQ-4_
  - Files: `infra/lib/defuse-stack.ts`, `backend/src/handlers/dossiers.ts`

- [ ] 6. Lightweight role-based identity (leerling/docent in localStorage)
  - _Requirements: REQ-1_
  - Files: `frontend/src/contexts/UserContext.tsx`, `frontend/src/screens/RolePicker.tsx`

### Phase 2: Core Dossier Management

- [ ] 7. Lambda: Dossier CRUD handler (create, get, list, update status)
  - _Requirements: REQ-4_
  - Files: `backend/src/handlers/dossiers.ts`, `backend/src/models/Dossier.ts`

- [ ] 8. Student incident reporting form (Melding doen)
  - _Requirements: REQ-2_
  - Files: `frontend/src/screens/ReportIncident.tsx`

- [ ] 9. Teacher dashboard with dossier list and alerts
  - _Requirements: REQ-3, REQ-13_
  - Files: `frontend/src/screens/Dashboard.tsx`, `frontend/src/components/AlertCard.tsx`

- [ ] 10. Dossier detail screen with Dutch lifecycle tracker (Melding→Triage→Onderzoek→Actie→Afronding)
  - _Requirements: REQ-4_
  - Files: `frontend/src/screens/DossierDetail.tsx`, `frontend/src/components/LifecycleTracker.tsx`

- [ ] 11. In-app/browser notifications for new alerts
  - _Requirements: REQ-3_
  - Files: `frontend/src/services/notifications.ts`

### Phase 3: Evidence & Communication

- [ ] 12. Lambda: Evidence handler (presigned S3 upload URL + metadata save)
  - _Requirements: REQ-5_
  - Files: `backend/src/handlers/evidence.ts`

- [ ] 13. Evidence upload UI (bewijs: foto, verklaring, bestand, notitie)
  - _Requirements: REQ-5_
  - Files: `frontend/src/components/EvidencePanel.tsx`

- [ ] 14. Lambda: Messages handler (send/receive per channel)
  - _Requirements: REQ-8_
  - Files: `backend/src/handlers/messages.ts`

- [ ] 15. Communication panel with three channels (leerling/ouder/intern)
  - _Requirements: REQ-8_
  - Files: `frontend/src/components/CommunicationPanel.tsx`

- [ ] 16. Inspectie reporting panel with draft + mock submit
  - _Requirements: REQ-9_
  - Files: `frontend/src/components/InspectiePanel.tsx`, `backend/src/handlers/inspectie.ts`

### Phase 4: AI Features (Bedrock)

- [ ] 17. Bedrock client wrapper (Claude model invocation abstraction)
  - _Requirements: REQ-6, REQ-7, REQ-8, REQ-9_
  - Files: `backend/src/services/bedrock.ts`

- [ ] 18. Lambda: AI checklist generation citing Dutch procedures (WPO, Onderwijsinspectie)
  - _Requirements: REQ-6_
  - Files: `backend/src/handlers/checklist.ts`, `frontend/src/components/ChecklistPanel.tsx`

- [ ] 19. Lambda: Agentic helpline with psychological bullying signal detection
  - _Requirements: REQ-7_
  - Files: `backend/src/handlers/helpline.ts`, `frontend/src/screens/Helpline.tsx`

- [ ] 20. Crisis detection + escalation (113, Kindertelefoon)
  - _Requirements: REQ-12_
  - Files: `backend/src/services/crisis.ts`, `frontend/src/components/CrisisBanner.tsx`

- [ ] 21. Lambda: Tone adaptation for outbound messages (leerling/ouder/collega)
  - _Requirements: REQ-8_
  - Files: `backend/src/handlers/tone-adapt.ts`

- [ ] 22. Lambda: AI-drafted Onderwijsinspectie dossier report
  - _Requirements: REQ-9_
  - Files: `backend/src/handlers/draft-inspectie-report.ts`

### Phase 5: Context & Polish

- [ ] 23. Legal guidance panel (WPO, Onderwijsinspectie obligations)
  - _Requirements: REQ-10_
  - Files: `frontend/src/components/LegalPanel.tsx`, `backend/src/data/legal-content.ts`

- [ ] 24. Dutch resource directory (Stop Pesten Nu, Kindertelefoon, Ouders & Onderwijs, etc.)
  - _Requirements: REQ-11_
  - Files: `frontend/src/components/ResourcesPanel.tsx`, `backend/src/data/resources.ts`

- [ ] 25. Audit log per dossier (logboek)
  - _Requirements: REQ-14_
  - Files: `frontend/src/components/AuditLog.tsx`, `backend/src/handlers/audit.ts`

- [ ] 26. Design system: calm color palette, Dutch typography, spacing
  - _Requirements: REQ-13_
  - Files: `frontend/src/styles/theme.ts`, `frontend/src/components/ui/*`

- [ ] 27. App routing and main navigation
  - _Requirements: All_
  - Files: `frontend/src/App.tsx`, `frontend/src/router.tsx`

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2], "description": "Initialize frontend and CDK projects" },
    { "wave": 2, "tasks": [3, 4, 5, 6], "description": "CDK infra (DynamoDB, S3, API GW, Lambda scaffold) + identity" },
    { "wave": 3, "tasks": [7, 8, 9, 10, 17], "description": "Dossier CRUD + core screens + Bedrock wrapper" },
    { "wave": 4, "tasks": [11, 12, 13, 14, 15, 16, 18, 19, 20, 23, 24, 25, 26], "description": "All features on top of dossier + Bedrock" },
    { "wave": 5, "tasks": [21, 22], "description": "AI features depending on communication channels" },
    { "wave": 6, "tasks": [27], "description": "Final routing and navigation wiring" }
  ]
}
```

## Notes

- **Demo path priority:** 1-6 → 7 → 8 → 9 → 10 → 17 → 19 → 20 → 18 → 15 → 21 → 16 → 22
- The helpline (19) + crisis detection (20) is the most impressive demo moment — prioritize it
- AI checklist (18) is the "confidence builder" for teachers — second priority
- Inspectie reporting (22) is the "one-click compliance" moment — third priority
- Deploy early with `cdk deploy` so the demo URL is live throughout development
- All UI strings should be in Dutch for the demo
- Bedrock model access: ensure Claude 3.5 Sonnet is enabled in the target AWS region
