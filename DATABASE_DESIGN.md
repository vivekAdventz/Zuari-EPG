# Database Design — Zuari-EPG HR Chatbot

## Overview

The application uses **two databases**:

| Database | Technology | Purpose |
|----------|-----------|---------|
| **Primary DB** | MongoDB (via Mongoose) | All application data — users, conversations, policies, tickets, analytics |
| **Vector DB** | LanceDB (local, file-based) | Policy chunk embeddings for semantic search (3072-dim vectors) |

---

## Entity-Relationship Diagram

```
┌──────────────┐       ┌────────────────┐       ┌──────────────────┐
│    Entity     │◄──────│  ImpactLevel   │       │ EmployeeCategory │
│              │  M:1   │                │       │                  │
└──────┬───────┘       └───────┬────────┘       └────────┬─────────┘
       │                       │                         │
       │ 1:M                   │ 1:M                     │ 1:M
       ▼                       ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                            User                                  │
│  roles: [employee | admin | superAdmin | hrOps]                  │
│  entity ──► Entity    level ──► ImpactLevel                      │
│  empCategory ──► EmployeeCategory                                │
│  assignedThemes ──► [QuestionTheme]                              │
└──────┬──────────────────┬──────────────┬────────────┬────────────┘
       │                  │              │            │
       │ 1:M              │ 1:M          │ 1:M        │ 1:M
       ▼                  ▼              ▼            ▼
┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│Conversation │  │   Ticket     │  │   Log    │  │ UserFeedback │
└──────┬──────┘  └──────┬───────┘  └──────────┘  └──────────────┘
       │ 1:M            │ 1:M
       ▼                ▼
┌─────────────┐  ┌───────────────┐
│   Message   │  │TicketMessage  │
└──────┬──────┘  └───────────────┘
       │
       ├─── 1:M ──► QueryFeedback
       └─── 1:M ──► MessageThemeLog ──► QuestionTheme


┌──────────────┐       ┌──────────┐       ┌────────────────┐
│   Policy     │◄──1:M─│   FAQ    │       │ PolicyCategory │
│  entity[] ──► Entity │          │       │  (standalone)  │
│  impactLevel[]       │          │       └────────────────┘
│  empCategory[]       │          │
│  chunks[]            └──────────┘
└──────────────┘
        │
        │ (content indexed into)
        ▼
┌───────────────────────────┐
│   LanceDB: policies table │
│   (vector embeddings)     │
└───────────────────────────┘
```

---

## MongoDB Collections

### 1. User

Stores all system users — employees, admins, super admins, and HR ops.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `name` | String | required | Full name |
| `email` | String | required, unique, lowercase | Login email |
| `password` | String | optional, `select: false` | Hashed password (not used for SSO employees) |
| `gender` | String | enum: `Male`, `Female`, `Other` | Default: `Male` |
| `entity` | ObjectId → Entity | | Organization entity |
| `level` | ObjectId → ImpactLevel | | Employee impact level |
| `empCategory` | ObjectId → EmployeeCategory | | Employment type |
| `assignedThemes` | [ObjectId → QuestionTheme] | | Ticket themes assigned to HR ops |
| `entity_code` | String | | Denormalized entity code for quick access |
| `is_account_active` | Boolean | default: `true` | Account enabled/disabled |
| `is_account_activated` | Boolean | default: `false` | First-login activation flag |
| `roles` | [String] | enum: `employee`, `admin`, `superAdmin`, `hrOps` | Default: `["employee"]` |
| `loginCount` | Number | default: 0 | Total logins |
| `status` | String | enum: `active`, `inactive` | Default: `active` |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 2. Conversation

Groups messages into chat sessions per user.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `userId` | ObjectId → User | required, **indexed** | Conversation owner |
| `title` | String | default: `"New Chat"` | Display title |
| `lastMessage` | String | default: `""` | Preview text of last message |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 3. Message

Individual chat messages within a conversation.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `userId` | ObjectId → User | required | Message author |
| `conversationId` | ObjectId → Conversation | required, **indexed** | Parent conversation |
| `role` | String | enum: `user`, `ai` | Sender role |
| `content` | String | required | Message text |
| `tokensUsed` | Number | default: 0 | Token count for this response |
| `policyName` | String | default: `null` | Policy referenced in AI response |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**Indexes:** `{ conversationId: 1, createdAt: 1 }` — fast chat history loading.

---

### 4. Policy

Uploaded HR policy documents with metadata, versioning, and chunked content.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `title` | String | required, trimmed | Policy name |
| `filename` | String | required | Uploaded file name |
| `uploadDate` | Date | default: now | Upload timestamp |
| `entity` | [ObjectId → Entity] | required | Applicable entities |
| `impactLevel` | [ObjectId → ImpactLevel] | | Applicable impact levels |
| `empCategory` | [ObjectId → EmployeeCategory] | | Applicable employee categories |
| `description` | String | | Policy summary |
| `category` | String | default: `"General"` | Classification (e.g. `HR - Compensation`) |
| `expiryDate` | Date | | Optional expiry |
| `status` | String | enum: `pending`, `live`, `draft`, `archived`, `failed-please retry` | Default: `pending` |
| `ischunked` | Boolean | default: `false` | Whether content has been chunked |
| `hasFaqs` | Boolean | default: `false` | Whether FAQs have been generated |
| `version` | String | default: `"1.0"` | Current version label |
| `versions` | [{ version, updatedAt, changedBy, changeNote, filename }] | | Version history |
| `chunks` | [{ content (required), header (required) }] | | Extracted text chunks |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 5. FAQ

Auto-generated FAQs linked to a policy.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `policyId` | ObjectId → Policy | required, **indexed** | Parent policy |
| `faqs` | [{ question: String }] | | Array of FAQ questions |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 6. Entity

Organization entities (business units, subsidiaries).

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `name` | String | required, unique, trimmed | Full entity name |
| `entityCode` | String | required, unique, uppercase | Short code (e.g. `ZIL`, `EPG`) |
| `createdBy` | String | | Admin who created it |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 7. ImpactLevel

Employee hierarchy levels, scoped per entity.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `name` | String | required, trimmed | Level name |
| `entity` | ObjectId → Entity | required | Parent entity |
| `createdBy` | String | required | Admin who created it |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**Indexes:** `{ name: 1, entity: 1 }` — unique compound (same name can't repeat within an entity).

---

### 8. EmployeeCategory

Employment types (e.g. Permanent, Fixed-Term Contract).

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `name` | String | required, unique, trimmed | Category name |
| `code` | String | required, unique, uppercase | Short code (e.g. `PE`, `FTC`) |
| `createdBy` | String | required | Admin who created it |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 9. PolicyCategory

Standalone lookup for policy classification labels.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `name` | String | required, unique, trimmed | Category name |
| `createdBy` | String | required | Admin who created it |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 10. Ticket

HR support tickets raised by employees, auto-numbered.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `ticketNumber` | String | unique, auto-generated | Format: `#HR-00001` (auto-increment via Counter collection) |
| `userId` | ObjectId → User | required | Ticket creator |
| `userName` | String | required | Creator name (denormalized) |
| `userEmail` | String | required | Creator email (denormalized) |
| `userEntity` | String | default: `""` | Creator entity (denormalized) |
| `subject` | String | default: `""` | Ticket subject line |
| `queryMessageId` | ObjectId → Message | | Original chat message |
| `responseMessageId` | ObjectId → Message | | AI response message |
| `userQuestion` | String | default: `""` | Original user question |
| `aiResponse` | String | default: `""` | AI response text |
| `description` | String | default: `""` | Additional context |
| `theme` | ObjectId → QuestionTheme | | Ticket category |
| `themeName` | String | default: `"Other / Unclassified"` | Denormalized theme name |
| `assignedTo` | [ObjectId → User] | | HR ops assigned to ticket |
| `status` | String | enum: `open`, `hold`, `resolved` | Default: `open` |
| `hrResponse` | String | default: `""` | HR ops response text |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**Auto-increment:** Uses a `Counter` collection (`{ _id: "ticketNumber", seq: Number }`) to generate sequential ticket numbers via `pre('save')` hook.

---

### 11. TicketMessage

Chat messages within a ticket thread (employee ↔ HR ops).

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `ticketId` | ObjectId → Ticket | required | Parent ticket |
| `senderId` | ObjectId → User | required | Message sender |
| `senderName` | String | required | Sender name (denormalized) |
| `senderRole` | String | enum: `employee`, `hrOps` | Sender role |
| `message` | String | optional, trimmed | Message text |
| `attachmentUrl` | String | default: `null` | File attachment URL |
| `attachmentType` | String | enum: `image`, `pdf`, `null` | Attachment MIME category |
| `attachmentName` | String | default: `null` | Attachment display name |
| `requestUpload` | Boolean | default: `false` | HR request for file from employee |
| `requestUploadType` | String | enum: `image`, `pdf`, `null` | Requested file type |
| `readBy` | [ObjectId → User] | | Users who have read this message |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**Indexes:** `{ ticketId: 1, createdAt: 1 }` — fast ticket chat loading.

---

### 12. QuestionTheme

Categories for classifying employee questions for analytics and ticket routing.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `name` | String | required, unique, trimmed | Theme name |
| `description` | String | trimmed | Theme description |
| `exampleQueries` | String | trimmed | Sample queries for this theme |
| `isPredefined` | Boolean | default: `false` | System-created vs. admin-created |
| `count` | Number | default: 0 | Running total of classified questions |
| `daysToClosure` | Number | default: `null` | SLA days for ticket resolution |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**12 Predefined Themes:** Leave & Attendance, Payroll & Compensation, Benefits & Insurance, HR Policies & Guidelines, Performance & Appraisals, Recruitment & Referrals, Learning & Development, Employee Lifecycle, HR Systems & Tools, HR Contacts & Support, Workplace & Facilities, Other / Unclassified.

---

### 13. MessageThemeLog

Links each user message to a classified theme for analytics.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `messageId` | ObjectId → Message | required | Classified message |
| `userId` | ObjectId → User | required | Message author |
| `conversationId` | ObjectId → Conversation | required | Parent conversation |
| `themeId` | ObjectId → QuestionTheme | required | Assigned theme |
| `themeName` | String | required | Denormalized theme name |
| `question` | String | required | User question text |
| `entity` | String | default: `""` | User's entity |
| `level` | String | default: `""` | User's impact level |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**Indexes:** `{ themeId: 1, createdAt: -1 }`, `{ userId: 1, createdAt: -1 }`

---

### 14. QueryFeedback

Thumbs up/down feedback on individual AI responses.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `queryId` | ObjectId → Message | required | User's question message |
| `responseId` | ObjectId → Message | required | AI's response message |
| `userName` | String | required | User name (denormalized) |
| `userEntity` | String | | User entity (denormalized) |
| `userMail` | String | required | User email (denormalized) |
| `userImpactLevel` | String | | User level (denormalized) |
| `userCategory` | String | | Employee category (denormalized) |
| `userQuestion` | String | required | Question text |
| `aiResponse` | String | required | Response text |
| `thumbs` | String | enum: `up`, `down` | Feedback signal |
| `description` | String | default: `""` | Optional comment |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 15. UserFeedback

General app experience feedback (star ratings).

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `user` | ObjectId → User | required | Feedback author |
| `userName` | String | required | Name (denormalized) |
| `userEmail` | String | required | Email (denormalized) |
| `userEntity` | String | | Entity (denormalized) |
| `userImpactLevel` | String | | Level (denormalized) |
| `rating` | Number | required, 1–5 | Star rating |
| `category` | String | default: `"Other"` | Feedback category |
| `improvementAreas` | [String] | default: `[]` | Areas needing improvement |
| `successAreas` | [String] | default: `[]` | Areas working well |
| `comment` | String | default: `""` | Free-text comment |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 16. ApiUsage

Tracks AI API token consumption and cost per call.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `model` | String | required | AI model name |
| `promptTokens` | Number | default: 0 | Input tokens |
| `completionTokens` | Number | default: 0 | Output tokens |
| `totalTokens` | Number | default: 0 | Total tokens |
| `cost` | Number | default: 0 | Estimated cost |
| `operation` | String | default: `"unknown"` | Operation type |
| `userId` | ObjectId → User | optional | User who triggered the call |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**Indexes:** `{ createdAt: -1 }`

---

### 17. DemandCache

Cached clustering results for demand/insights analytics dashboard.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `entity` | String | required | Entity name or `"all"` |
| `period` | String | required | Time window: `"30"`, `"90"`, `"year"` |
| `feedbackCount` | Number | required | Feedback count at cache time |
| `clusters` | Array | required | Cluster analysis results |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**Indexes:** `{ entity: 1, period: 1, feedbackCount: 1 }`

---

### 18. InsightFlag

Allows admins to flag specific feedback items for review.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `feedbackId` | ObjectId → Feedback | required | Flagged feedback |
| `flaggedBy` | ObjectId → User | required | Admin who flagged |
| `question` | String | | Question text |
| `policy` | String | | Policy name |
| `entity` | String | | Entity name |
| `level` | String | | Impact level |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

**Indexes:** `{ feedbackId: 1, flaggedBy: 1 }` — unique compound (one flag per admin per feedback).

---

### 19. Log

Audit log for admin/system actions.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `logDescription` | String | required | What happened |
| `userId` | ObjectId → User | required | Who did it |
| `name` | String | required | User name |
| `role` | String | required | User role |
| `entity` | ObjectId → Entity | | Associated entity |
| `createdAt` | Date | default: now, **indexed** | When it happened |
| `updatedAt` | Date | auto | Timestamp |

---

### 20. Document

Standalone text documents (non-policy content).

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `name` | String | required, unique | Document identifier |
| `content` | String | required | Full text content |
| `fileName` | String | | Original file name |
| `uploadedAt` | Date | default: now | Upload timestamp |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

---

### 21. Counter (Internal)

Auto-increment counter used by the Ticket model.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `_id` | String | required | Counter identifier (e.g. `"ticketNumber"`) |
| `seq` | Number | default: 0 | Current sequence value |

---

## LanceDB — Vector Store

A local file-based vector database at `backend/policy_db/` storing policy chunk embeddings for semantic search.

**Table:** `policies`

| Column | Arrow Type | Nullable | Description |
|--------|-----------|----------|-------------|
| `id` | Utf8 | No | Unique chunk identifier |
| `vector` | FixedSizeList(3072, Float32) | No | OpenAI embedding (3072 dimensions) |
| `content` | Utf8 | No | Chunk text |
| `heading` | Utf8 | Yes | Section heading |
| `policy` | Utf8 | No | Parent policy name |
| `entity` | Utf8 | No | Entity scope |
| `impactLevel` | Utf8 | No | Impact level scope |
| `empCategory` | Utf8 | No | Employee category scope |

---

## Index Summary

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| ApiUsage | `{ createdAt: -1 }` | Single, descending | Recent usage queries |
| Conversation | `{ userId: 1 }` | Single | User's conversations |
| DemandCache | `{ entity: 1, period: 1, feedbackCount: 1 }` | Compound | Cache lookups |
| FAQ | `{ policyId: 1 }` | Single | FAQs by policy |
| ImpactLevel | `{ name: 1, entity: 1 }` | Compound, unique | Prevent duplicate levels per entity |
| InsightFlag | `{ feedbackId: 1, flaggedBy: 1 }` | Compound, unique | One flag per admin per feedback |
| Log | `{ createdAt: 1 }` | Single | Date-range filtering |
| Message | `{ conversationId: 1, createdAt: 1 }` | Compound | Chat history loading |
| MessageThemeLog | `{ themeId: 1, createdAt: -1 }` | Compound | Theme analytics |
| MessageThemeLog | `{ userId: 1, createdAt: -1 }` | Compound | User analytics |
| TicketMessage | `{ ticketId: 1, createdAt: 1 }` | Compound | Ticket chat loading |

---

## Design Patterns

| Pattern | Where Used | Why |
|---------|-----------|-----|
| **Denormalization** | `Ticket.userName`, `MessageThemeLog.themeName`, `User.entity_code`, `QueryFeedback.userName` | Avoid joins for read-heavy dashboards and lists |
| **Auto-increment** | `Ticket.ticketNumber` via Counter collection | Human-readable sequential ticket IDs (`#HR-00001`) |
| **Versioning** | `Policy.versions[]` array | Track policy revision history |
| **Chunking** | `Policy.chunks[]` + LanceDB vectors | Split documents for RAG semantic search |
| **Caching** | `DemandCache` collection | Cache expensive clustering computations |
| **Soft status** | `User.is_account_active`, `Policy.status` | Soft delete / lifecycle management |
| **Select exclusion** | `User.password` with `select: false` | Password never returned unless explicitly requested |
