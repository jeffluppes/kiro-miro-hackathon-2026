# Design Document

> Source: Miro board https://miro.com/app/board/uXjVHOVGJIA=/

## Overview

SchoolGuard (codename: Defuse) is a web-based PoC that helps teachers manage bullying cases. It combines AI-assisted case management, an agentic helpline that proactively supports students/parents/teachers, and tone-aware multi-stakeholder communication. The PoC runs in the cloud or fully local via `docker-compose`.

This design covers the structure needed to demonstrate the end-to-end flow: a student flags an issue (via form or via helpline conversation), a teacher gets alerted, AI generates a jurisdiction-aware checklist, and the teacher communicates with parents, staff, and authorities with AI-drafted, tone-adapted messages.

## Architecture

The system follows a hub-and-spoke model with the SchoolGuard Platform connecting Students, Teachers, Parents, Government Systems, and Local Resources.

```
┌──────────────────────────────────────────────┐
│  App Entry (role pick: student or teacher)    │
│   ├── Student → Report Incident               │
│   │              └── Helpline (AI chat)        │
│   └── Teacher → Dashboard                     │
│         ├── Case Detail                       │
│         │    ├── Lifecycle Tracker             │
│         │    ├── Evidence Documentation        │
│         │    ├── AI Checklist                  │
│         │    ├── Communication (3 channels)    │
│         │    ├── Legal Guidance Panel          │
│         │    ├── Local Resources Panel         │
│         │    └── Authorities Channel           │
│         └── Helpline (AI chat)                │
└──────────────────────────────────────────────┘
```

### Sequence Flow

```
Student          Teacher          Platform         Helpline AI    Parent       Government
  │                │                │                │              │              │
  │── Open Helpline ──────────────────────────────>│              │              │
  │<─ Conversation, signal detected ───────────────│              │              │
  │── Submit incident ─────────────>│              │              │              │
  │                │<── Alert ──────│              │              │              │
  │                │── Open case ──>│              │              │              │
  │                │<── AI checklist ──────────────│              │              │
  │                │── Upload evidence ──>│        │              │              │
  │                │── Send message ──>│           │              │              │
  │                │                │── Tone-adapted ─────────────>│              │
  │                │── Escalate ───>│              │              │              │
  │                │                │── Drafted report ─────────────────────────>│
```

## Components and Interfaces

### Web App (React + Vite + TypeScript)
- Single-page app, responsive design
- Lightweight role-based identity (student or teacher) stored in localStorage
- Real-time-ish updates via polling
- Browser notifications for alerts

### Backend API (Node.js + Express)
- RESTful API for cases, evidence, messages, audit log
- Endpoints for AI features (checklists, helpline chat, tone adaptation)
- JWT-lite or session token (PoC scope)

### Data Layer
- SQLite for local dev, Postgres in cloud
- Local filesystem or S3-compatible storage for evidence files
- Single audit log table

### AI Services
- Single LLM provider (OpenAI / Anthropic / Bedrock)
- Functions:
  - Generate jurisdiction-aware checklists from case context
  - Helpline chat with bullying-signal detection
  - Tone adaptation for messages (kid / parent / staff)
  - Government report drafting

### AI Endpoints (backend)

- `POST /api/ai/checklist` — generate checklist from case + jurisdiction
- `POST /api/ai/helpline/chat` — multi-turn helpline conversation with signal detection
- `POST /api/ai/tone-adapt` — rewrite message for given recipient
- `POST /api/ai/draft-report` — generate jurisdiction-appropriate authority report

### Key Screens

1. **Role Picker** — Lightweight entry point (student or teacher)
2. **Student Report Form** — Confidential form to file an incident
3. **Teacher Dashboard** — Active cases, new alerts, AI-suggested next steps
4. **Case Detail** — Lifecycle, stakeholders, evidence, checklist, communication, legal context, local resources, authorities
5. **Helpline (AI Chat)** — Available to students, parents, and teachers; can detect signals and link to case

## Data Models

### User
- `id`, `role` (student | teacher), `displayName`

### Case
- `id`, `teacherId`, `studentId` (nullable for anonymous reports)
- `status`: report | triage | review | action | resolve
- `priority`: critical | high | medium | low
- `incidentType`, `description`
- `jurisdiction` (for AI checklist + legal context)
- `createdAt`, `updatedAt`

### Evidence
- `id`, `caseId`
- `type`: photo | statement | file | note
- `fileUrl` (storage reference)
- `note` (text)
- `uploadedBy`, `uploadedAt`

### ChecklistItem
- `id`, `caseId`
- `text`, `done` (boolean)
- `order`

### Message
- `id`, `caseId`
- `channel`: student | parent | staff | authorities
- `direction`: inbound | outbound
- `originalText`, `adaptedText` (for tone adaptation)
- `sentAt`, `readAt`

### HelplineConversation
- `id`, `userId` (or anonymous)
- `messages[]`
- `linkedCaseId` (optional)
- `signalDetected` (boolean)

### LocalResource
- `id`, `name`, `description`, `contact`, `jurisdiction`

### AuditLog
- `id`, `caseId`, `userId`
- `action`, `metadata`, `timestamp`

## Correctness Properties

### Property 1: Valid case lifecycle stage
A case always has a stage from the defined lifecycle (Report, Triage, Review, Action, Resolve).
**Validates: Requirements 4.1**

### Property 2: Teacher assignment before triage
A case must have a teacher assigned before it can be moved past Triage.
**Validates: Requirements 4.1**

### Property 3: Linked evidence and messages
Evidence and messages are always linked to a valid case.
**Validates: Requirements 5.1, 8.1**

### Property 4: User-driven checklist completion
AI-generated checklist items are not auto-marked done; user action is required to mark a step complete.
**Validates: Requirements 6.1**

### Property 5: Helpline conversations in audit trail
Helpline conversations linked to a case appear in that case's audit trail.
**Validates: Requirements 7.1, 13.1**

### Property 6: Original message preservation
Tone-adapted messages preserve the original text alongside the adapted version for audit purposes.
**Validates: Requirements 8.1, 13.1**

## Error Handling

- LLM provider failures fall back to a static, jurisdiction-agnostic checklist and a UI banner that explains AI is unavailable
- File upload failures show an inline error and allow retry; the case is not blocked from progressing
- Authorities-channel sends are stubbed in PoC; failures log a warning rather than block the user
- Database write failures surface a toast with a "retry" affordance; nothing is silently dropped

## Testing Strategy

- Manual testing for the demo flow: student report → teacher alert → checklist → message → escalate
- A small number of unit tests around data model integrity (case stage transitions, audit log writes)
- Mocked LLM responses for any AI endpoint tests
- No load or security testing in PoC scope

## Out of Scope (PoC)

- Real biometric or strong auth
- End-to-end encryption
- Real government API integrations (mocked / stubbed)
- Mobile apps and offline mode
- Multi-tenant billing
- GDPR-grade compliance and audit
