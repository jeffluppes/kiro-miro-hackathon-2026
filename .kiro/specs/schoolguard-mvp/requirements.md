# Requirements Document

> Source: Miro board https://miro.com/app/board/uXjVHOVGJIA=/
> Scope: Hackathon proof of concept (web app, minimal auth, no encryption)

## Introduction

SchoolGuard (codename: Defuse) is a platform that helps teachers manage bullying cases at school. Teachers currently spend 5-10 hours per week on bullying-related admin work, navigating fragmented tools, multiple stakeholders, and varying local procedures. This PoC demonstrates how an AI-assisted case management system with an agentic helpline can consolidate that workflow.

The PoC focuses on demonstrating the core value: a student flags an issue, a teacher gets alerted, an AI helps generate the right next steps, and communication is routed to the appropriate stakeholders (parents, government, law enforcement) with the right tone.

## Glossary

- **Case** — a record of a bullying incident, with lifecycle stages from initial report to resolution
- **Helpline** — the AI agent that proactively collects signals, supports users (kids/parents/teachers), and routes messages
- **Stakeholder** — anyone involved in a case: student, teacher, parent, school admin, government body, law enforcement
- **Jurisdiction** — the local legal context (e.g., a school in the Netherlands has different reporting obligations than one in Germany)
- **Local resource** — a regional support organization, e.g., Bureau Halt in the Netherlands

## Requirements

### REQ-1: Lightweight User Identity

When a user opens the app, the system shall provide a basic role-based identity (student or teacher) so that case access and views can be differentiated, without requiring strong auth in the PoC.

**Priority:** Low | **Estimate:** XS

**Acceptance Criteria:**
- [ ] User picks/enters a role on first load (student or teacher)
- [ ] Role persists across sessions (localStorage is fine)
- [ ] No password required for PoC

### REQ-2: Student Incident Reporting

When a student wants to report a bullying incident, the system shall provide a confidential reporting form so that issues are captured without barriers.

**Priority:** Critical | **Estimate:** S

**Acceptance Criteria:**
- [ ] Student-facing form with description, date, optional attachments
- [ ] Submission creates a new case in the system
- [ ] Confidentiality is communicated clearly in the UI

### REQ-3: Teacher Alerts

When a student submits a report, the system shall surface the new incident to the relevant teacher so that they can act quickly.

**Priority:** Critical | **Estimate:** S

**Acceptance Criteria:**
- [ ] New incidents appear on the teacher's dashboard immediately (polling or push)
- [ ] Visual indicator for unread/new alerts
- [ ] In-app notification (browser notification API acceptable for PoC)

### REQ-4: Case Lifecycle Management

When a teacher opens a case, the system shall display the full lifecycle (Report → Triage → Review → Action → Resolve) so that cases are tracked end-to-end and nothing falls through the cracks.

**Priority:** Critical | **Estimate:** L

**Acceptance Criteria:**
- [ ] Each case has a stage indicator
- [ ] Teacher can move a case through stages
- [ ] Case detail view shows incident summary, stakeholders, and history
- [ ] Stage changes are recorded in the audit log

### REQ-5: Evidence Documentation

When a teacher documents evidence for a case, the system shall accept file uploads and written notes so that incidents are properly recorded.

**Priority:** High | **Estimate:** M

**Acceptance Criteria:**
- [ ] Upload photos and files (stored to cloud or local storage)
- [ ] Add written notes/statements per case
- [ ] Evidence list is visible on the case detail view

### REQ-6: AI-Generated Task Checklists

When a case is created, the system shall generate an AI-powered checklist of recommended next steps so that teachers follow proper procedures without memorizing them.

**Priority:** High | **Estimate:** M

**Acceptance Criteria:**
- [ ] Checklist is generated when a case is opened
- [ ] Checklist adapts to the jurisdiction selected for the case
- [ ] Each item can be marked complete
- [ ] Progress (e.g., 3/5 done) is visible on the case

### REQ-7: Agentic Helpline

When a stakeholder (student, parent, teacher) interacts with the platform, the system shall provide an AI helpline that proactively collects signs of bullying, answers procedural questions, and supports them through next steps.

**Priority:** High | **Estimate:** L

**Acceptance Criteria:**
- [ ] Chat-style interface accessible from the dashboard
- [ ] AI agent responds with context-appropriate support
- [ ] Agent can detect bullying signals from conversation and prompt the user to file a report
- [ ] Conversation can be linked to a case as evidence

### REQ-8: Multi-Stakeholder Communication with Tone Adaptation

When a teacher needs to send a message about a case, the system shall route it to the appropriate channel (student, parent, internal staff) and adapt the tone for the recipient so that messages are contextually appropriate.

**Priority:** High | **Estimate:** M

**Acceptance Criteria:**
- [ ] Three channels per case: Student, Parent, Internal Staff
- [ ] AI rewrites/suggests message phrasing based on recipient
- [ ] Unread message indicators per channel
- [ ] Message history is part of the case record

### REQ-9: Government & Law Enforcement Communication

When a case requires escalation to authorities, the system shall provide a channel to communicate with local government bodies and law enforcement so that mandatory reporting is streamlined.

**Priority:** Medium | **Estimate:** M

**Acceptance Criteria:**
- [ ] "Escalate to authorities" action on a case
- [ ] AI generates a draft report appropriate to the jurisdiction
- [ ] Outbound message log on the case
- [ ] PoC: integration is mocked or uses a stub endpoint (real government APIs out of scope)

### REQ-10: Legal Guidance & Procedural Information

When a teacher is handling a case, the system shall surface jurisdiction-specific legal context and procedural guidance so that they have the information they need without leaving the app.

**Priority:** Medium | **Estimate:** S

**Acceptance Criteria:**
- [ ] Legal context panel on the case detail view
- [ ] Content adapts to selected jurisdiction
- [ ] References to relevant laws/directives (e.g., EU directives, local school law)

### REQ-11: Local Resource Directory

When a teacher needs external support for a case, the system shall list relevant local resources so that they can connect students/parents to specialized organizations.

**Priority:** Medium | **Estimate:** S

**Acceptance Criteria:**
- [ ] List of local support organizations (e.g., Bureau Halt for Netherlands)
- [ ] Filter/scope by jurisdiction
- [ ] Each entry has contact info and a description

### REQ-12: Calm, Professional UI

When any user interacts with the app, the system shall present a calm, professional interface so that users feel reassured while handling sensitive situations.

**Priority:** High | **Estimate:** M

**Acceptance Criteria:**
- [ ] Consistent design system (color palette, spacing, typography)
- [ ] Soft, non-alarming colors and language
- [ ] Clear navigation structure

### REQ-13: Basic Audit Trail

When actions are taken on a case, the system shall log key events so that there's a basic activity history per case.

**Priority:** Medium | **Estimate:** S

**Acceptance Criteria:**
- [ ] Log entries for: case created, stage changed, evidence added, message sent
- [ ] Each entry has timestamp and user attribution
- [ ] Visible in the case detail view

### REQ-14: Cloud-Native with Local Run Option

When the platform is deployed, it shall be runnable in the cloud and locally on a developer machine so that schools without cloud infrastructure can still operate it.

**Priority:** Low | **Estimate:** S

**Acceptance Criteria:**
- [ ] Deployable to a cloud provider (Vercel, Railway, AWS)
- [ ] `docker-compose up` or `npm run dev` runs the entire stack locally
- [ ] No external services required for local mode beyond an LLM API key

## Non-Functional Requirements

- **Security:** Minimal for PoC. HTTPS in transit only. No encryption at rest. No GDPR-grade controls.
- **Platform:** Web app (React + Vite). No mobile apps in PoC.
- **Hosting:** Lightweight cloud deployment (Vercel, Railway, or similar) plus local docker option.
- **AI:** Single LLM provider (e.g., OpenAI, Anthropic, Bedrock) for checklists, helpline, and tone adaptation.
- **Out of scope:** Biometric auth, end-to-end encryption, real government API integrations, mobile/offline mode, multi-tenant billing tiers.
