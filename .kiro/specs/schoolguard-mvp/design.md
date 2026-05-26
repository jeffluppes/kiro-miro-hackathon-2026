# Design: SchoolGuard (Defuse) MVP

> Source: Miro board https://miro.com/app/board/uXjVHOVGJIA=/

## Architecture Overview

Web-based PoC with a React frontend and lightweight backend. The system follows a hub-and-spoke model where the SchoolGuard Platform is the central processing system connecting Students, Teachers, Parents, and Government Systems.

## System Components

### 1. Web App (React + Vite)
- Single-page app, responsive design
- Simple email/password auth (JWT)
- Real-time updates via polling or WebSocket

### 2. Backend API (Node.js + Express)
- RESTful API for case management
- JWT authentication
- AI engine integration for checklists and tone adaptation

### 3. Data Layer
- PostgreSQL or DynamoDB for case data
- S3 for evidence file storage
- Simple audit log table

### 4. AI Services
- Checklist generation based on case type + jurisdiction
- Communication tone adaptation (student/parent/staff)
- Government API integration generation

## Screen Architecture

Based on the prototype from the Miro board:

```
┌─────────────────────────────────────────────┐
│  App Entry                                   │
│  └── Login (Email/Password)                  │
│       └── Incident Alert Dashboard           │
│            ├── Case Creation & Overview       │
│            │    └── Evidence Documentation    │
│            └── Communication & Resolution     │
└─────────────────────────────────────────────┘
```

### Key Screens:
1. **Login** — Simple email/password form
2. **Incident Alert Dashboard** — Active cases, unresolved incidents, AI-suggested next steps
3. **Case Creation & Overview** — 5-stage lifecycle, stakeholder info, basic audit metadata
4. **Evidence Documentation** — File upload, notes, evidence list per case
5. **Communication & Resolution Tracker** — Messaging channels, resolution tasks

### Bottom Navigation:
- Access | Alerts | Cases | Evidence | Comms

## Sequence Flow (from Miro diagram)

```
Student          Teacher          Platform         Parent       Government
  │                 │                │                │              │
  │─── Submit ─────────────────────>│                │              │
  │    incident                     │                │              │
  │                 │<── Alert ─────│                │              │
  │                 │               │                │              │
  │                 │── Create ────>│                │              │
  │                 │   case file   │                │              │
  │                 │── Upload ────>│                │              │
  │                 │   evidence    │                │              │
  │                 │               │── Notify ─────>│              │
  │                 │               │                │              │
  │                 │               │── Compliance ──────────────── >│
  │                 │               │   report                      │
```

## Data Model

### Case
- `id`, `schoolId`, `teacherId`
- `status`: Report | Triage | Review | Action | Resolve
- `priority`: Critical | High | Medium | Low
- `incidentType`, `description`
- `stakeholders[]`
- `createdAt`, `updatedAt`
- `jurisdictionSettings`

### Evidence
- `id`, `caseId`
- `type`: photo | statement | file | note
- `fileUrl` (S3 or local storage reference)
- `uploadedBy`, `uploadedAt`

### Communication
- `id`, `caseId`
- `channel`: student | parent | staff
- `messages[]`
- `unreadCount`

### AuditLog
- `id`, `caseId`, `userId`
- `action`, `timestamp`
- `metadata`

## Business Model

| Tier | Price | Limits |
|------|-------|--------|
| Free | €0 | 1 teacher, 5 active cases |
| School | €29/teacher/month | Unlimited cases, full features |
| District | €19/teacher/month (min 50) | Centralized admin, priority support |

Annual billing: 20% discount.
