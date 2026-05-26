# Design Document

> Source: Miro board https://miro.com/app/board/uXjVHOVGJIA=/
> Context: #[[file:BULLYING_IN_THE_NETHERLANDS.md]]

## Overview

SchoolGuard (codename: Defuse) is a Netherlands-first web PoC that helps Dutch teachers manage bullying dossiers. It combines AI-assisted case management, an agentic helpline that detects prolonged psychological bullying, and tone-aware multi-stakeholder communication aligned with Dutch school safety obligations.

The demo scenario: a Dutch primary school student opens the helpline, AI detects sustained psychological bullying signals, prompts a confidential report, teacher gets alerted, AI generates a Dutch-procedure checklist citing Onderwijsinspectie obligations, teacher communicates with parents (tone-adapted), and drafts an Inspectorate dossier with one click.

The architecture is jurisdiction-extensible but all seeded content, resources, legal references, and UI language target the Netherlands.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  App Entry (role pick: leerling or docent)            │
│   ├── Leerling (Student)                             │
│   │    ├── Melding doen (Report Incident)            │
│   │    └── Hulplijn (AI Helpline)                    │
│   └── Docent (Teacher)                               │
│         ├── Dashboard (alerts, active dossiers)      │
│         ├── Dossier Detail                           │
│         │    ├── Lifecycle (Melding→Triage→           │
│         │    │   Onderzoek→Actie→Afronding)          │
│         │    ├── Bewijs (Evidence)                    │
│         │    ├── AI Checklist (Dutch procedures)      │
│         │    ├── Communicatie (3 channels)            │
│         │    ├── Inspectie Melding (report draft)     │
│         │    ├── Juridisch (Legal guidance)           │
│         │    ├── Hulpbronnen (Resources)              │
│         │    └── Logboek (Audit trail)                │
│         └── Hulplijn (AI Helpline)                   │
└──────────────────────────────────────────────────────┘
```

### Sequence Flow

```
Leerling       Docent          Platform        Hulplijn AI    Ouder        Inspectie
  │               │               │               │            │              │
  │── Hulplijn ──────────────────────────────────>│            │              │
  │<─ Gesprek, signaal gedetecteerd ──────────────│            │              │
  │── Melding indienen ────────────>│             │            │              │
  │               │<── Alert ───────│             │            │              │
  │               │── Dossier ─────>│             │            │              │
  │               │<── AI checklist (NL procedures)│           │              │
  │               │── Bewijs uploaden ──>│        │            │              │
  │               │── Bericht sturen ──>│         │            │              │
  │               │               │── Tone-adapted ───────────>│              │
  │               │── Melden ─────>│              │            │              │
  │               │               │── Inspectie dossier ───────────────────── >│
```

### Crisis Escalation Flow

```
Leerling       Hulplijn AI       Platform         Docent
  │               │                │                │
  │── "ik wil niet meer" ────────>│                │
  │<── CRISIS: 113 + Kindertelefoon│               │
  │    (prominent banner)          │                │
  │               │── Alert ───────────────────────>│
  │               │   (crisis detected)            │
```

## Components and Interfaces

### Web App (React + Vite + TypeScript)
- Single-page app hosted on S3 + CloudFront
- Dutch-language UI for the demo
- Lightweight role-based identity (localStorage)
- Real-time-ish updates via polling API Gateway
- Browser notifications for alerts

### Backend (AWS Serverless)

```
┌─────────────────────────────────────────────────────────┐
│  AWS Cloud                                               │
│                                                          │
│  CloudFront ──> S3 (React SPA)                           │
│                                                          │
│  API Gateway (REST) ──> Lambda Functions                 │
│       │                    │                             │
│       │    ┌───────────────┼───────────────┐             │
│       │    │               │               │             │
│       ▼    ▼               ▼               ▼             │
│  DynamoDB        S3 (evidence)      Bedrock (Claude)     │
│  (dossiers,      (photos, files)    (AI features)        │
│   messages,                                              │
│   audit log)                                             │
└─────────────────────────────────────────────────────────┘
```

**API Gateway (REST API)**
- Routes all `/api/*` requests to Lambda functions
- CORS configured for CloudFront origin
- No auth for PoC (API key optional)

**Lambda Functions (Node.js 20.x, TypeScript)**
- `dossiers` — CRUD for dossiers (cases)
- `evidence` — file upload presigned URLs + metadata
- `messages` — communication channels per dossier
- `helpline` — multi-turn AI chat with signal/crisis detection
- `checklist` — AI-generated Dutch-procedure checklists
- `tone-adapt` — message rewriting for recipient
- `inspectie-report` — AI-drafted Onderwijsinspectie dossier
- `resources` — Dutch resource directory (static data)
- `audit` — audit log reads

**DynamoDB Tables**
- `Dossiers` — PK: `dossierId`, GSI on `teacherId` and `status`
- `Evidence` — PK: `dossierId`, SK: `evidenceId`
- `Messages` — PK: `dossierId#channel`, SK: `timestamp`
- `HelplineConversations` — PK: `conversationId`, GSI on `linkedDossierId`
- `AuditLog` — PK: `dossierId`, SK: `timestamp`
- `ChecklistItems` — PK: `dossierId`, SK: `order`

**S3 Buckets**
- `defuse-frontend` — React SPA static assets (served via CloudFront)
- `defuse-evidence` — uploaded evidence files (presigned URL upload from client)

**Amazon Bedrock**
- Model: Claude 3.5 Sonnet (or Claude 3 Haiku for lower latency)
- Used for: checklists, helpline, tone adaptation, inspectie report drafting, crisis detection
- System prompts reference Dutch school safety law

### Infrastructure as Code (AWS CDK)
- Single CDK stack for the entire PoC
- `infra/lib/defuse-stack.ts` — all resources in one stack
- Deploys with `cdk deploy`
- Outputs: CloudFront URL, API Gateway URL

### AI Endpoints (via API Gateway → Lambda)

| Route | Lambda | Purpose |
|---|---|---|
| `POST /api/dossiers` | dossiers | Create/update dossier |
| `GET /api/dossiers` | dossiers | List dossiers for teacher |
| `GET /api/dossiers/{id}` | dossiers | Get dossier detail |
| `POST /api/evidence/upload-url` | evidence | Get presigned S3 upload URL |
| `POST /api/evidence/{dossierId}` | evidence | Save evidence metadata |
| `GET /api/messages/{dossierId}/{channel}` | messages | Get messages for channel |
| `POST /api/messages/{dossierId}/{channel}` | messages | Send message |
| `POST /api/ai/checklist` | checklist | Generate Dutch-procedure checklist |
| `POST /api/ai/helpline/chat` | helpline | Multi-turn helpline with signal + crisis detection |
| `POST /api/ai/tone-adapt` | tone-adapt | Rewrite message for recipient |
| `POST /api/ai/draft-inspectie-report` | inspectie-report | Generate Onderwijsinspectie-format report |
| `GET /api/resources` | resources | Dutch resource directory |
| `GET /api/audit/{dossierId}` | audit | Audit log for dossier |

### Key Screens

1. **Rolkeuze** — Lightweight entry (leerling or docent)
2. **Melding doen** — Confidential student reporting form
3. **Dashboard** — Active dossiers, new alerts, AI-suggested next steps
4. **Dossier Detail** — Lifecycle, stakeholders, evidence, checklist, communication, legal, resources, inspectie reporting
5. **Hulplijn** — AI chat for students/parents/teachers; crisis escalation built in

## Data Models

All models stored in DynamoDB. Single-table design per entity for simplicity in PoC.

### User
- `id`, `role` (leerling | docent), `displayName`
- Stored in localStorage only (no DynamoDB table for PoC)

### Dossier — DynamoDB `Dossiers` table
- `dossierId` (PK), `teacherId` (GSI), `studentId` (nullable)
- `status`: melding | triage | onderzoek | actie | afronding
- `priority`: kritiek | hoog | gemiddeld | laag
- `incidentType`, `description`
- `severity`: mild | prolonged | severe
- `createdAt`, `updatedAt`

### Evidence (Bewijs) — DynamoDB `Evidence` table
- `dossierId` (PK), `evidenceId` (SK)
- `type`: foto | verklaring | bestand | notitie
- `s3Key`, `note`
- `uploadedBy`, `uploadedAt`

### ChecklistItem — DynamoDB `ChecklistItems` table
- `dossierId` (PK), `order` (SK)
- `text`, `legalReference` (e.g., "WPO art. 4c")
- `done` (boolean)

### Message (Bericht) — DynamoDB `Messages` table
- `dossierId#channel` (PK), `timestamp` (SK)
- `channel`: leerling | ouder | intern | inspectie
- `direction`: inbound | outbound
- `originalText`, `adaptedText`
- `readAt`

### HelplineConversation (Hulplijn) — DynamoDB `HelplineConversations` table
- `conversationId` (PK)
- `userId` (or anonymous)
- `messages` (list attribute)
- `linkedDossierId` (GSI, optional)
- `signalDetected` (boolean)
- `crisisDetected` (boolean)

### Resource (Hulpbron) — seeded in Lambda code (no DynamoDB)
- `id`, `name`, `description`, `website`, `phone`
- `audience`: leerling | ouder | docent | school
- `whenToUse`

### AuditLog (Logboek) — DynamoDB `AuditLog` table
- `dossierId` (PK), `timestamp` (SK)
- `userId`, `action`, `metadata`

## Correctness Properties

### Property 1: Valid dossier lifecycle stage
A dossier always has a stage from the defined lifecycle (Melding, Triage, Onderzoek, Actie, Afronding).
**Validates: Requirements 4.1**

### Property 2: Teacher assignment before triage
A dossier must have a teacher assigned before it can be moved past Triage.
**Validates: Requirements 4.1**

### Property 3: Linked evidence and messages
Evidence and messages are always linked to a valid dossier.
**Validates: Requirements 5.1, 8.1**

### Property 4: User-driven checklist completion
AI-generated checklist items are not auto-marked done; user action is required.
**Validates: Requirements 6.1**

### Property 5: Crisis escalation is immediate and non-dismissable
When crisis is detected, the system surfaces 113 and Kindertelefoon immediately. The banner cannot be silently dismissed.
**Validates: Requirements 12.1**

### Property 6: Original message preservation
Tone-adapted messages preserve the original text alongside the adapted version for audit.
**Validates: Requirements 8.1, 14.1**

### Property 7: Helpline signals generate teacher alerts
When the helpline detects a bullying signal, it generates a teacher alert even if no formal report is filed.
**Validates: Requirements 3.1, 7.1**

## Error Handling

- Bedrock throttling/failures fall back to a static Dutch-language checklist and a UI banner explaining AI is unavailable
- S3 presigned URL generation failures return a clear error; client retries with exponential backoff
- DynamoDB write failures surface a toast with a "retry" affordance; nothing is silently dropped
- Inspectie report submission is mocked; failures log a warning rather than block the user
- Crisis detection uses keyword matching as a fallback if Bedrock is unavailable
- Lambda cold starts mitigated by provisioned concurrency on the helpline function (optional for PoC)

## Testing Strategy

- Manual testing for the demo flow: student helpline → signal detection → report → teacher alert → checklist → parent message → inspectie report
- Unit tests around dossier stage transitions and audit log writes
- Crisis detection tested with known trigger phrases
- Mocked Bedrock responses for AI endpoint tests
- `cdk synth` validates infrastructure before deploy
- No load or security testing in PoC scope

## Out of Scope (PoC)

- Real biometric or strong auth (Cognito deferred)
- End-to-end encryption
- Real Onderwijsinspectie API integration (mocked)
- Mobile apps and offline mode
- Multi-tenant billing
- GDPR-grade compliance
- Other jurisdictions (Germany, Belgium, etc.)
- WAF, custom domain, or production-grade CloudFront config
