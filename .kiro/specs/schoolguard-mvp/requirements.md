# Requirements Document

## Introduction

SchoolGuard is a hackathon MVP that helps teachers manage bullying cases with **jurisdiction-aware resource discovery** as its hero feature. A teacher enters a school name, and the system uses an AI agent (Anthropic tool-use with web search) to discover anti-bullying resources, legal procedures, and government reporting requirements specific to that school's jurisdiction. Teachers review and approve discovered information before it enters the system's knowledge base.

The system follows a local-first development approach (phase 1) with cloud deployment as phase 2. Case management serves as a secondary backbone that consumes the jurisdiction context discovered by the hero feature.

## Glossary

- **Discovery_Agent** — the Anthropic Claude AI agent that uses web search tool-use to find jurisdiction-specific anti-bullying information at runtime
- **JurisdictionProfile** — a cached collection of local resources, legal obligations, and reporting procedures for a specific school's jurisdiction
- **Resource_Routing_Service** — the component that filters discovered resources by stakeholder role (student, parent, teacher)
- **Case_Management_Service** — the component that manages bullying case lifecycle and integrates jurisdiction context
- **Teacher_Approval_Gate** — the review step where a teacher verifies AI-discovered information before it enters the knowledge base
- **Known_Resource** — a pre-seeded Dutch anti-bullying resource with high confidence (e.g., Kindertelefoon, Meldknop.nl)
- **StakeholderRole** — one of: student, parent, teacher, coordinator
- **ProfileStatus** — one of: discovering, pending_review, approved, rejected, stale
- **CaseStage** — one of: report, triage, review, action, resolve
- **Confidence_Score** — a numeric value between 0 and 1 indicating how reliable AI-discovered information is

## Requirements

### Requirement 1: Jurisdiction Discovery

**User Story:** As a teacher, I want to enter a school name and have the system discover jurisdiction-specific anti-bullying resources, so that I have locally relevant information without manual research.

#### Acceptance Criteria

1. WHEN a teacher submits a school name, THE Discovery_Agent SHALL determine the school's municipality, province, and country via web search
2. WHEN the Discovery_Agent completes a search, THE Jurisdiction_Discovery_Service SHALL store the results as a JurisdictionProfile with status "pending_review"
3. WHEN a JurisdictionProfile with status "approved" and unexpired cache exists for the submitted school name, THE Jurisdiction_Discovery_Service SHALL return the cached profile without making API calls
4. IF the Discovery_Agent cannot determine the school's location, THEN THE Jurisdiction_Discovery_Service SHALL return a profile with empty municipality and confidence score of 0.1, and prompt the teacher to manually provide the municipality
5. THE Discovery_Agent SHALL execute multiple web searches to find: local anti-bullying policies, government reporting requirements, local support organizations, and relevant legal obligations

### Requirement 2: Known Resource Seeding

**User Story:** As a teacher at a Dutch school, I want the system to always include verified Dutch anti-bullying resources, so that I have a reliable baseline regardless of AI search quality.

#### Acceptance Criteria

1. WHEN the Discovery_Agent detects the school is in the Netherlands, THE Jurisdiction_Discovery_Service SHALL include all known Dutch resources (Kindertelefoon, Meldknop.nl, Stichting School & Veiligheid, Stop Pesten NU, stoppestennu.nl) in the JurisdictionProfile
2. WHEN the Discovery_Agent independently discovers a known resource, THE Jurisdiction_Discovery_Service SHALL merge the discovered entry with the pre-seeded data and set confidence to at least 0.95
3. WHEN the Discovery_Agent fails to discover a known resource, THE Jurisdiction_Discovery_Service SHALL add the pre-seeded resource with confidence 0.99 and source marked as "pre-seeded"
4. THE Jurisdiction_Discovery_Service SHALL preserve all AI-discovered resources when merging with known resources

### Requirement 3: Resource Routing by Stakeholder Role

**User Story:** As a user (student, parent, or teacher), I want to see only the anti-bullying resources relevant to my role, so that I am not overwhelmed with irrelevant information.

#### Acceptance Criteria

1. WHEN a user requests resources for a given role, THE Resource_Routing_Service SHALL return only resources where the role is included in the resource's target audience
2. WHEN returning resources, THE Resource_Routing_Service SHALL sort results with known resources first, then by descending confidence score
3. THE Resource_Routing_Service SHALL return only resources that have been verified by a teacher (verifiedByTeacher equals true)
4. WHEN no resources match the given role, THE Resource_Routing_Service SHALL return an empty list

### Requirement 4: Teacher Approval Gate

**User Story:** As a teacher, I want to review and approve AI-discovered information before it is used in the system, so that hallucinated or incorrect resources are never presented to students or parents.

#### Acceptance Criteria

1. WHEN a JurisdictionProfile has status "pending_review", THE System SHALL present the discovered resources, legal obligations, and reporting procedures to the teacher for review
2. WHEN a teacher approves a profile, THE Jurisdiction_Discovery_Service SHALL update the profile status to "approved", set approvedAt to the current timestamp, and mark all resources as verified
3. WHEN a teacher rejects a profile, THE Jurisdiction_Discovery_Service SHALL update the profile status to "rejected" and record the rejection reason
4. WHILE a JurisdictionProfile has status "pending_review" or "rejected", THE Resource_Routing_Service SHALL NOT serve resources from that profile to end users
5. WHEN a teacher edits an individual resource during review, THE System SHALL update that resource's fields while preserving the rest of the profile

### Requirement 5: Profile Caching and Staleness

**User Story:** As a teacher, I want jurisdiction profiles to be cached and refreshed periodically, so that I do not wait for repeated AI searches and information stays current.

#### Acceptance Criteria

1. WHEN a JurisdictionProfile is created, THE Jurisdiction_Discovery_Service SHALL set an expiration date of 30 days from discovery
2. WHEN the current date exceeds a profile's expiration date, THE System SHALL mark the profile as stale
3. WHILE a profile is stale, THE System SHALL continue serving the stale profile but display a banner indicating the information may be outdated
4. WHEN a teacher triggers a refresh on a stale profile, THE Jurisdiction_Discovery_Service SHALL run a new discovery and create a new profile with status "pending_review"
5. WHEN a profile has confidence score below 0.6 and is older than 7 days, THE System SHALL recommend a refresh to the teacher

### Requirement 6: Case Management with Jurisdiction Context

**User Story:** As a teacher, I want bullying cases to be linked to the school's jurisdiction profile, so that checklists and legal guidance are locally relevant.

#### Acceptance Criteria

1. WHEN a teacher creates a case, THE Case_Management_Service SHALL require a link to an approved JurisdictionProfile
2. WHEN a case is created, THE Case_Management_Service SHALL generate a jurisdiction-aware checklist using the AI agent and the linked profile's legal obligations and reporting procedures
3. WHEN a teacher requests legal guidance for a case, THE Case_Management_Service SHALL return the legal obligations and reporting procedures from the linked JurisdictionProfile
4. THE Case_Management_Service SHALL support case lifecycle stages: report, triage, review, action, resolve
5. WHEN a teacher changes a case stage, THE Case_Management_Service SHALL record the transition with a timestamp and user attribution

### Requirement 7: Confidence Scoring and Transparency

**User Story:** As a teacher, I want to see how confident the AI is in each discovered resource, so that I can prioritize verification of uncertain information.

#### Acceptance Criteria

1. THE Discovery_Agent SHALL assign a confidence score between 0 and 1 to each discovered resource
2. THE Discovery_Agent SHALL assign an overall confidence score between 0 and 1 to each JurisdictionProfile
3. WHEN a profile's overall confidence score is below 0.5, THE System SHALL display a warning badge on the review panel
4. WHEN an individual resource has confidence below 0.4, THE System SHALL visually de-emphasize that resource in the review interface
5. THE System SHALL assign known pre-seeded resources a confidence score of at least 0.95

### Requirement 8: Profile Status Transitions

**User Story:** As a system operator, I want profile status changes to follow a strict state machine, so that data integrity is maintained and no invalid transitions occur.

#### Acceptance Criteria

1. THE Jurisdiction_Discovery_Service SHALL enforce the following valid status transitions: discovering to pending_review, pending_review to approved, pending_review to rejected, approved to stale
2. IF an invalid status transition is attempted, THEN THE Jurisdiction_Discovery_Service SHALL reject the operation and return an error
3. WHEN a profile transitions from approved to stale, THE System SHALL trigger the transition only via time-based expiry, not via direct user action

### Requirement 9: AI Agent Error Handling

**User Story:** As a teacher, I want the system to handle AI failures gracefully, so that I still get useful results even when searches partially fail.

#### Acceptance Criteria

1. IF the Anthropic API returns an error during discovery, THEN THE Jurisdiction_Discovery_Service SHALL return a partial profile with whatever was discovered, set confidence to 0.3, and include a note explaining the failure
2. IF the web search tool fails during the agent loop, THEN THE Discovery_Agent SHALL continue with remaining search goals rather than aborting entirely
3. IF the web search API is rate-limited, THEN THE System SHALL queue the discovery request and return status "discovering" with an estimated wait time
4. WHEN an API failure occurs, THE Jurisdiction_Discovery_Service SHALL still seed known resources for the detected country

### Requirement 10: Discovery Progress Feedback

**User Story:** As a teacher, I want to see progress while the AI is discovering jurisdiction information, so that I know the system is working and can estimate wait time.

#### Acceptance Criteria

1. WHILE the Discovery_Agent is executing searches, THE System SHALL display progress indicators showing the current search phase (locating school, finding policies, discovering resources)
2. WHEN discovery takes longer than 10 seconds, THE System SHALL allow the teacher to continue other work while discovery completes in the background
3. WHEN discovery completes, THE System SHALL notify the teacher that results are ready for review

### Requirement 11: Student Incident Reporting

**User Story:** As a student, I want to report a bullying incident confidentially, so that my teacher is alerted and can take action.

#### Acceptance Criteria

1. WHEN a student submits a report, THE System SHALL create a new case linked to the school's approved JurisdictionProfile
2. THE System SHALL provide a reporting form with fields for: description, date, and optional attachments
3. WHEN a student submits a report, THE System SHALL surface the new incident on the teacher's dashboard immediately

### Requirement 12: Local-First Architecture

**User Story:** As a developer, I want the system to run entirely on a local machine with only an LLM API key, so that schools without cloud infrastructure can still use it.

#### Acceptance Criteria

1. THE System SHALL use SQLite as the default database for local-first operation
2. THE System SHALL be runnable via a single command (npm run dev or docker-compose up) without external services beyond an Anthropic API key
3. WHEN deployed to the cloud, THE System SHALL support PostgreSQL as an alternative database

## Non-Functional Requirements

- **Security:** Minimal for PoC. No AI-discovered information reaches end users without teacher verification. Anthropic API key stored in environment variables only. Input sanitization on school name to prevent prompt injection.
- **Performance:** Discovery latency of 10-30 seconds is acceptable. Cache hit returns within 50ms. UI must show progress indicators during discovery.
- **Platform:** Web app (React + Vite + TypeScript frontend, Node.js + Express backend).
- **AI Provider:** Anthropic Claude with tool-use API for discovery agent and helpline.
- **Data:** SQLite for local-first, PostgreSQL for cloud deployment. Profile data under 50KB per profile.
- **Out of scope:** Strong authentication, end-to-end encryption, real government API integrations, mobile/offline mode, multi-tenant billing, GDPR-grade controls.
