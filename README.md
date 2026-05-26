# SchoolGuard MVP

> **Demo slides:** [SchoolGuard (Team Defuse).pdf](<./SchoolGuard  (Team Defuse).pdf>)

![SchoolGuard Cover Slide](./cover-slide.png)

---

## Overview

SchoolGuard is a hackathon MVP that helps teachers manage bullying cases with **jurisdiction-aware resource discovery** as its hero feature. A teacher enters a school name, and the system uses an AI agent (Anthropic Claude with web search tool-use) to discover anti-bullying resources, legal procedures, and government reporting requirements specific to that school's jurisdiction.

The demo flow: **Enter school name → AI discovers jurisdiction → Teacher reviews/approves → System shows role-specific resources for handling bullying cases.**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + TypeScript)                   │
│  Discovery Form · Review Panel · Resource Viewer        │
│  Case Lifecycle · Report Page                           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST
┌────────────────────────▼────────────────────────────────┐
│  Backend API (Node.js + Express)                        │
│  Jurisdiction Discovery · Resource Routing              │
│  Case Management                                        │
└──────┬─────────────────────────────────────┬────────────┘
       │                                     │
┌──────▼──────────────┐        ┌─────────────▼────────────┐
│  AI Layer           │        │  Data Layer              │
│  Anthropic Claude   │        │  SQLite                  │
│  Web Search Tool    │        │  JurisdictionProfile     │
│  Checklist Gen      │        │  Cases & Resources       │
└─────────────────────┘        └──────────────────────────┘
```

## Key Features

- **Jurisdiction Discovery** — AI agent performs runtime web searches to find municipality-specific anti-bullying policies, legal obligations, and support organizations
- **Teacher Review** — discovered resources go through teacher approval before entering the knowledge base
- **Role-Based Resource Routing** — students, parents, and teachers each see resources relevant to them
- **Pre-seeded Dutch Resources** — known resources (Kindertelefoon, Meldknop.nl, Stichting School & Veiligheid) are always included
- **Case Management** — jurisdiction-aware checklists and legal guidance for handling bullying incidents

## Running Locally

This is an npm workspaces monorepo. Install and run from the root:

```bash
npm install
npm run dev
```

Or run backend/frontend separately:

```bash
# Backend (Express + SQLite, port 3001)
npm run dev -w backend

# Frontend (Vite, port 5173)
npm run dev -w frontend
```

### Prerequisites

- Node.js >= 18 (Node 22 LTS recommended — Node 26 has native module issues with better-sqlite3)
- An `ANTHROPIC_API_KEY` in `backend/.env` for the AI discovery features

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Vite, TypeScript |
| Backend | Express, TypeScript, Zod validation |
| AI | Anthropic Claude (tool-use with web search) |
| Database | SQLite (better-sqlite3) |
| Testing | Vitest, fast-check (property-based) |

## Project Structure

```
├── backend/
│   └── src/
│       ├── db/          # SQLite repositories & migrations
│       ├── routes/      # Express route handlers
│       ├── services/    # Business logic (AI agent, case mgmt, routing)
│       └── types/       # TypeScript models, enums, Zod schemas
├── frontend/
│   └── src/
│       ├── api/         # HTTP client
│       ├── components/  # Reusable UI components
│       └── pages/       # Route pages
└── infra/               # Infrastructure (CDK)
```
