# Requirements: SchoolGuard (Defuse) MVP

> Source: Miro board https://miro.com/app/board/uXjVHOVGJIA=/

## Problem Statement

Teachers spend 5-10 hours per week managing administrative tasks related to bullying cases. This platform reduces that burden by consolidating case management, secure communication, and compliance tracking into one system.

## Functional Requirements

### REQ-1: User Authentication (Simplified for PoC)
**Priority:** Medium | **Estimate:** S

When a user opens the app, the system shall provide simple email/password authentication so that users can log in and access their cases.

**Acceptance Criteria:**
- [ ] Email/password login
- [ ] Basic role distinction (teacher vs. student)
- [ ] Session persistence (stay logged in)

### REQ-2: Incident Reporting & Alerts
**Priority:** Critical | **Estimate:** S

When a student submits a confidential incident report, the system shall send a real-time alert notification to the assigned teacher so that incidents are addressed promptly.

**Acceptance Criteria:**
- [ ] Students can submit confidential reports via the mobile app
- [ ] Teachers receive push notifications for new incidents
- [ ] Alert dashboard shows active cases and unresolved incidents with priority indicators

### REQ-3: Case Management
**Priority:** Critical | **Estimate:** L

When a teacher opens a case, the system shall display the full incident lifecycle (Report → Triage → Review → Action → Resolve) so that cases are tracked from initial report to resolution.

**Acceptance Criteria:**
- [ ] Case files are created with encrypted documentation
- [ ] 5-stage lifecycle is visible and trackable
- [ ] Teachers can manage up to 5 active cases in the free tier
- [ ] Case completion rate is tracked (target: 75% reach documented resolution)

### REQ-4: Evidence Documentation (Simplified for PoC)
**Priority:** High | **Estimate:** M

When a teacher documents evidence, the system shall provide file and note uploads so that incidents are properly documented.

**Acceptance Criteria:**
- [ ] Photo/file upload to cloud storage
- [ ] Written statement/notes input
- [ ] Evidence list visible per case

### REQ-5: AI-Generated Task Checklists
**Priority:** High | **Estimate:** M

When a case is created, the system shall generate AI-powered task checklists so that teachers follow proper procedures and reduce administrative time.

**Acceptance Criteria:**
- [ ] Checklists are auto-generated based on case type and jurisdiction
- [ ] Progress is tracked (percentage complete)
- [ ] Legal context is provided at each step (e.g., EU directives, local legislation)

### REQ-6: Secure Multi-Stakeholder Communication
**Priority:** High | **Estimate:** M

When a teacher needs to communicate about a case, the system shall provide encrypted channels for students, parents, and internal staff so that sensitive information is shared securely.

**Acceptance Criteria:**
- [ ] Separate encrypted channels: Student, Parent, Internal Staff
- [ ] Unread message indicators
- [ ] AI tone adaptation for different recipients
- [ ] Communication routed to appropriate channels automatically

### REQ-7: Audit Trail (Simplified for PoC)
**Priority:** Low | **Estimate:** S

When actions are taken on a case, the system shall log key events so that a basic activity history is available.

**Acceptance Criteria:**
- [ ] Basic event log per case (created, updated, evidence added)
- [ ] Timestamps and user attribution

### REQ-8: Case Tracking & Resolution
**Priority:** High | **Estimate:** S

When a teacher views their dashboard, the system shall display case timelines and stakeholder interactions so that no cases fall through the cracks.

**Acceptance Criteria:**
- [ ] Resolution task checklist with AI-generated steps
- [ ] Audit trail with sync status
- [ ] Legal guidance specific to jurisdiction with compliance deadlines

### REQ-9: Offline Mode
**Priority:** Low | **Estimate:** M — *Deferred, not in PoC scope*

### REQ-10: Push Notifications
**Priority:** High | **Estimate:** S

When critical case developments occur, the system shall send push notifications so that teachers stay informed without constantly checking the app.

**Acceptance Criteria:**
- [ ] Real-time push notifications for new incidents
- [ ] Configurable notification preferences
- [ ] Works on both iOS and Android

## Non-Functional Requirements (PoC scope)

- **Security:** Basic auth; HTTPS in transit (no E2E encryption for PoC)
- **Platform:** Web app (React) — mobile can come later
- **UI/UX:** Calm, professional interface designed to reassure users handling sensitive situations
- **Hosting:** AWS or simple cloud deployment (Vercel/Railway acceptable for demo)
