# Requirements Document

> Source: Miro board https://miro.com/app/board/uXjVHOVGJIA=/
> Context: #[[file:BULLYING_IN_THE_NETHERLANDS.md]]
> Scope: Hackathon proof of concept — Netherlands-first, web app, minimal auth

## Introduction

SchoolGuard (codename: Defuse) is a platform that helps Dutch teachers manage bullying cases at school. Teachers currently spend 5-10 hours per week on bullying-related admin work and increasingly report "handelingsverlegenheid" — a lack of confidence in how to intervene. With ~154,000 primary and ~57,000 secondary students bullied annually in the Netherlands, and psychological violence being the fastest-growing incident category, schools need better tooling.

This PoC demonstrates how an AI-assisted case management system with an agentic helpline can:
1. Detect prolonged psychological bullying earlier through conversational AI
2. Give teachers confidence by generating procedure-specific checklists citing Dutch obligations
3. Streamline multi-stakeholder communication (parents, Onderwijsinspectie, wijkteams)
4. Connect students and parents to the right Dutch support resources at the right time

The demo targets a Dutch primary school scenario. The architecture remains jurisdiction-extensible, but all content, resources, and legal references are Netherlands-specific.

## Glossary

- **Case / Dossier** — a record of a bullying incident, using the same "dossier" terminology as the Onderwijsinspectie
- **Helpline** — the AI agent that proactively collects signals, supports users (kids/parents/teachers), and routes messages
- **Stakeholder** — anyone involved in a case: student, teacher, parent, school admin, Onderwijsinspectie, wijkteam
- **Handelingsverlegenheid** — Dutch term for a teacher's lack of confidence in how to intervene in bullying situations
- **Onderwijsinspectie** — Dutch Education Inspectorate; receives mandatory dossier reports for serious incidents
- **Wijkteam** — municipal neighborhood team providing youth social work and mental health referrals
- **Vertrouwensinspecteur** — confidential inspector at the Onderwijsinspectie who handles reports

## Requirements

### REQ-1: Lightweight User Identity

When a user opens the app, the system shall provide a basic role-based identity (student or teacher) so that case access and views can be differentiated.

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
- [ ] Submission creates a new dossier in the system
- [ ] Confidentiality is communicated clearly in the UI (in Dutch)
- [ ] Anonymous reporting is supported (no name required)

### REQ-3: Teacher Alerts

When a student submits a report (or the helpline detects a signal), the system shall surface the new incident to the relevant teacher so that they can act quickly.

**Priority:** Critical | **Estimate:** S

**Acceptance Criteria:**
- [ ] New incidents appear on the teacher's dashboard immediately (polling)
- [ ] Visual indicator for unread/new alerts with priority level
- [ ] In-app notification (browser notification API acceptable for PoC)
- [ ] Helpline-detected signals also generate alerts

### REQ-4: Case/Dossier Lifecycle Management

When a teacher opens a dossier, the system shall display the full lifecycle (Melding → Triage → Onderzoek → Actie → Afronding) so that cases are tracked end-to-end following Dutch procedures.

**Priority:** Critical | **Estimate:** L

**Acceptance Criteria:**
- [ ] Each dossier has a stage indicator using Dutch terminology
- [ ] Teacher can move a dossier through stages
- [ ] Dossier detail view shows incident summary, stakeholders, and history
- [ ] Stage changes are recorded in the audit log
- [ ] Dossier format aligns with Onderwijsinspectie reporting expectations

### REQ-5: Evidence Documentation

When a teacher documents evidence for a dossier, the system shall accept file uploads and written notes so that incidents are properly recorded.

**Priority:** High | **Estimate:** M

**Acceptance Criteria:**
- [ ] Upload photos and files (stored to cloud or local storage)
- [ ] Add written notes/statements per dossier
- [ ] Evidence list is visible on the dossier detail view
- [ ] Evidence is timestamped for audit purposes

### REQ-6: AI-Generated Task Checklists (Dutch Procedures)

When a dossier is created, the system shall generate an AI-powered checklist of recommended next steps based on Dutch school safety obligations so that teachers overcome handelingsverlegenheid.

**Priority:** High | **Estimate:** M

**Acceptance Criteria:**
- [ ] Checklist is generated when a dossier is opened
- [ ] Steps reference Dutch obligations (WPO sociale veiligheid, Onderwijsinspectie monitoring)
- [ ] Each item can be marked complete
- [ ] Progress (e.g., 3/5 done) is visible on the dossier
- [ ] Checklist adapts to severity (mild vs. prolonged psychological violence)

### REQ-7: Agentic Helpline

When a stakeholder (student, parent, teacher) interacts with the platform, the system shall provide an AI helpline that proactively collects signs of bullying, answers procedural questions, and supports them through next steps.

**Priority:** High | **Estimate:** L

**Acceptance Criteria:**
- [ ] Chat-style interface accessible from the dashboard
- [ ] AI agent responds with context-appropriate support
- [ ] Agent can detect prolonged psychological bullying signals from conversation
- [ ] Conversation can be linked to a dossier as evidence
- [ ] Agent surfaces relevant Dutch resources contextually (Kindertelefoon, Stop Pesten Nu)

### REQ-8: Multi-Stakeholder Communication with Tone Adaptation

When a teacher needs to send a message about a dossier, the system shall route it to the appropriate channel (student, parent, internal staff) and adapt the tone for the recipient.

**Priority:** High | **Estimate:** M

**Acceptance Criteria:**
- [ ] Three channels per dossier: Student, Ouder (Parent), Intern (Staff)
- [ ] AI rewrites/suggests message phrasing based on recipient
- [ ] Unread message indicators per channel
- [ ] Message history is part of the dossier record

### REQ-9: Onderwijsinspectie Dossier Reporting

When a dossier involves serious or prolonged bullying, the system shall help the teacher draft and submit a report to the Onderwijsinspectie (vertrouwensinspecteur) so that mandatory reporting obligations are met.

**Priority:** Medium | **Estimate:** M

**Acceptance Criteria:**
- [ ] "Melden bij Inspectie" action on a dossier
- [ ] AI generates a draft report in the format expected by the Onderwijsinspectie
- [ ] Report includes: incident description, duration, severity, actions taken, stakeholders involved
- [ ] Outbound report log on the dossier
- [ ] PoC: submission is mocked (real Inspectie API out of scope)

### REQ-10: Legal Guidance (Dutch School Safety Law)

When a teacher is handling a dossier, the system shall surface Dutch-specific legal context and procedural guidance so that they have the information they need without leaving the app.

**Priority:** Medium | **Estimate:** S

**Acceptance Criteria:**
- [ ] Legal context panel on the dossier detail view
- [ ] References WPO (Wet primair onderwijs) sociale veiligheid obligations
- [ ] References Onderwijsinspectie monitoring requirements
- [ ] Explains when reporting to vertrouwensinspecteur is mandatory
- [ ] Content is static/seeded (not AI-generated) for accuracy

### REQ-11: Dutch Resource Directory

When a teacher or parent needs external support, the system shall list relevant Dutch resources so that they can connect to specialized organizations.

**Priority:** Medium | **Estimate:** S

**Acceptance Criteria:**
- [ ] Seeded directory with real Dutch organizations:
  - Stichting School & Veiligheid (anti-bullying protocols)
  - Stop Pesten Nu (awareness, reporting guidance)
  - Kindertelefoon (anonymous youth support)
  - Ouders & Onderwijs (parent rights, mediation)
  - Local wijkteam (municipal youth support)
  - Expertisepunt Burgerschap (citizenship education)
- [ ] Each entry has name, description, website, and when to use
- [ ] Resources surface contextually (e.g., parent channel shows Ouders & Onderwijs)

### REQ-12: Crisis Escalation (Acute Distress Detection)

When the helpline detects signals of acute distress (self-harm, severe emotional crisis), the system shall immediately surface crisis resources so that vulnerable minors get help fast.

**Priority:** Critical | **Estimate:** S

**Acceptance Criteria:**
- [ ] Helpline detects acute distress keywords/patterns
- [ ] Immediately surfaces 113 Zelfmoordpreventie (0900-0113) and Kindertelefoon (0800-0432)
- [ ] Crisis banner is prominent and cannot be dismissed without acknowledgment
- [ ] Teacher is alerted when crisis escalation triggers
- [ ] System does NOT attempt to provide crisis counseling itself

### REQ-13: Calm, Professional UI

When any user interacts with the app, the system shall present a calm, professional interface so that users feel reassured while handling sensitive situations.

**Priority:** High | **Estimate:** M

**Acceptance Criteria:**
- [ ] Consistent design system (color palette, spacing, typography)
- [ ] Soft, non-alarming colors and language
- [ ] Clear navigation structure
- [ ] Dutch-language UI for the demo

### REQ-14: Basic Audit Trail

When actions are taken on a dossier, the system shall log key events so that there's a basic activity history per dossier.

**Priority:** Medium | **Estimate:** S

**Acceptance Criteria:**
- [ ] Log entries for: dossier created, stage changed, evidence added, message sent, report drafted
- [ ] Each entry has timestamp and user attribution
- [ ] Visible in the dossier detail view

### REQ-15: AWS Serverless Deployment

When the platform is deployed, it shall run on AWS serverless infrastructure and also be runnable locally for development.

**Priority:** Low | **Estimate:** M

**Acceptance Criteria:**
- [ ] CDK stack deploys: API Gateway, Lambda, DynamoDB, S3, CloudFront
- [ ] Frontend served via CloudFront + S3
- [ ] `cdk deploy` provisions the entire stack
- [ ] Local development possible via SAM local or direct Lambda invocation

## Non-Functional Requirements

- **Security:** Minimal for PoC. HTTPS via CloudFront. No Cognito auth.
- **Platform:** Web app (React + Vite) on S3 + CloudFront. Backend on API Gateway + Lambda.
- **Language:** Dutch UI for the demo; English codebase.
- **AI:** Amazon Bedrock (Claude 3.5 Sonnet) for checklists, helpline, tone adaptation, and report drafting.
- **Database:** DynamoDB (on-demand capacity for PoC).
- **Storage:** S3 for evidence files (presigned URL uploads).
- **IaC:** AWS CDK (TypeScript). Single stack.
- **Hosting:** AWS eu-west-1 (closest to Netherlands).
- **Out of scope:** Cognito, WAF, custom domain, end-to-end encryption, real Onderwijsinspectie API, mobile/offline, multi-tenant billing, GDPR-grade compliance.
