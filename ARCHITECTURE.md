# System Architecture Documentation

**Last Updated:** 2024
**Status:** Production
**Tech Stack:** React Router v7 + tRPC + Drizzle ORM + PostgreSQL

---

## Table of Contents

1. [C1: System Context](#c1-system-context)
2. [C2: Container Architecture](#c2-container-architecture)
3. [C3: Component Architecture](#c3-component-architecture)
4. [Authentication & Authorization](#authentication--authorization)
5. [Data Models & Relationships](#data-models--relationships)
6. [API Design (tRPC Routers)](#api-design-trpc-routers)
7. [Real-Time Updates](#real-time-updates)
8. [Deployment Architecture](#deployment-architecture)
9. [Security & Compliance](#security--compliance)
10. [Performance Considerations](#performance-considerations)

---

## C1: System Context

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         End Users                               │
│  (Family Members, Admins, Content Moderators)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Web Application                              │
│  React Router v7 + TypeScript + Vite                            │
│  - Authentication UI                                            │
│  - Family Management                                            │
│  - Messaging & Chat                                             │
│  - Calendar & Events                                            │
│  - Photo Gallery & Media                                        │
│  - Shopping Lists & Tasks                                       │
│  - Admin Dashboard                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ tRPC (HTTP/WebSocket)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API Server                           │
│  Node.js + tRPC + Express                                       │
│  - Authentication & Sessions                                    │
│  - Business Logic                                               │
│  - Authorization & Feature Gates                                │
│  - Real-Time Subscriptions                                      │
│  - External Integrations                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   PostgreSQL      External APIs    File Storage
   (Primary DB)    (Stripe, OAuth,   (S3/CDN)
                    Calendar Sync)
```

### Key Actors

| Actor | Role | Interactions |
|-------|------|--------------|
| **Family Member** | Regular user | View family data, messaging, calendar, photos |
| **Family Admin** | Family owner | Manage members, settings, billing |
| **System Admin** | Platform admin | Moderation, feature flags, analytics |
| **External Services** | Integrations | Stripe (billing), OAuth providers, Calendar APIs |

---

## C2: Container Architecture

### Application Containers

```
┌──────────────────────────────────────────────────────────────────┐
│                     CLIENT CONTAINER                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ React Router v7 Application                                │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Routes & Pages                                       │   │  │
│  │ │ - /auth (login, signup, password reset)              │   │  │
│  │ │ - /family (dashboard, members, settings)             │   │  │
│  │ │ - /messages (conversations, chat)                    │   │  │
│  │ │ - /calendar (events, scheduling)                     │   │  │
│  │ │ - /gallery (photos, albums, media)                   │   │  │
│  │ │ - /admin (dashboard, moderation, analytics)          │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ tRPC Client                                          │   │  │
│  │ │ - Query hooks (useQuery)                             │   │  │
│  │ │ - Mutation hooks (useMutation)                       │   │  │
│  │ │ - Subscription hooks (useSubscription)               │   │  │
│  │ │ - React Query integration                            │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ State Management                                     │   │  │
│  │ │ - React Context (Auth, Theme)                        │   │  │
│  │ │ - React Query (Server State)                         │   │  │
│  │ │ - Local Storage (Preferences)                        │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Technology: React 18+, TypeScript, Vite, TailwindCSS            │
└──────────────────────────────────────────────────────────────────┘
```

### Backend Containers

```
┌──────────────────────────────────────────────────────────────────┐
│                    API SERVER CONTAINER                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ tRPC Router Layer                                          │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Public Routers (No Auth Required)                    │   │  │
│  │ │ - auth.router (signup, login, logout)                │   │  │
│  │ │ - inquiry.router (contact forms)                     │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Protected Routers (Auth Required)                    │   │  │
│  │ │ - families.router (CRUD operations)                  │   │  │
│  │ │ - familyMembers.router (member management)           │   │  │
│  │ │ - conversations.router (messaging)                   │   │  │
│  │ │ - messages.router (message operations)               │   │  │
│  │ │ - chat.router (AI chat)                              │   │  │
│  │ │ - calendarEvents.router (event management)           │   │  │
│  │ │ - media.router (photo/video operations)              │   │  │
│  │ │ - notifications.router (notification management)     │   │  │
│  │ │ - billing.router (subscription management)           │   │  │
│  │ │ - users.router (profile management)                  │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Admin Routers (Admin Role Required)                  │   │  │
│  │ │ - admin.router (system administration)               │   │  │
│  │ │ - moderation.router (content moderation)             │   │  │
│  │ │ - auditLogs.router (audit trail)                     │   │  │
│  │ │ - featureAccess.router (feature flags)               │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Middleware Layer                                           │  │
│  │ - Authentication (session validation)                      │  │
│  │ - Authorization (role-based access control)                │  │
│  │ - Feature Gates (subscription tier checks)                 │  │
│  │ - Error Handling (Zod validation, error formatting)        │  │
│  │ - Logging & Monitoring                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Business Logic Layer                                       │  │
│  │ - Family management logic                                  │  │
│  │ - Message processing & notifications                       │  │
│  │ - Calendar synchronization                                 │  │
│  │ - Media processing & optimization                          │  │
│  │ - Billing & subscription management                        │  │
│  │ - Content moderation                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Data Access Layer (Drizzle ORM)                            │  │
│  │ - Type-safe database queries                               │  │
│  │ - Query builders & relations                               │  │
│  │ - Transaction management                                   │  │
│  │ - Connection pooling                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Technology: Node.js, Express, tRPC, TypeScript                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   DATABASE CONTAINER                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Database                                        │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Core Tables                                          │   │  │
│  │ │ - users (authentication & profiles)                  │   │  │
│  │ │ - sessions (active sessions)                         │   │  │
│  │ │ - oauthAccounts (OAuth provider links)               │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Family Domain Tables                                 │   │  │
│  │ │ - families (family groups)                           │   │  │
│  │ │ - familyMembers (membership records)                 │   │  │
│  │ │ - familyInvitations (pending invites)                │   │  │
│  │ │ - familyDigests (weekly summaries)                   │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Messaging Tables                                     │   │  │
│  │ │ - conversations (1-to-1 chats)                       │   │  │
│  │ │ - conversationMessages (message content)             │   │  │
│  │ │ - messageReactions (emoji reactions)                 │   │  │
│  │ │ - pinnedMessages (pinned message references)         │   │  │
│  │ │ - typingIndicators (real-time typing status)         │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Calendar & Events Tables                             │   │  │
│  │ │ - calendarEvents (event records)                     │   │  │
│  │ │ - eventRsvps (attendance tracking)                   │   │  │
│  │ │ - calendarIntegrations (provider configs)            │   │  │
│  │ │ - calendarSyncLogs (sync history)                    │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Media & Gallery Tables                               │   │  │
│  │ │ - media (photo/video metadata)                       │   │  │
│  │ │ - photoTags (photo tagging)                          │   │  │
│  │ │ - mediaModeration (content flags)                    │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Billing & Subscription Tables                        │   │  │
│  │ │ - subscriptions (user subscriptions)                 │   │  │
│  │ │ - subscriptionTiers (tier definitions)               │   │  │
│  │ │ - invoices (billing records)                         │   │  │
│  │ │ - featureFlags (feature access control)              │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ System Tables                                        │   │  │
│  │ │ - auditLog (activity tracking)                       │   │  │
│  │ │ - notifications (user notifications)                 │   │  │
│  │ │ - errorLogs (error tracking)                         │   │  │
│  │ │ - healthChecks (system health)                       │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Technology: PostgreSQL 14+, Drizzle ORM, Connection Pooling     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES CONTAINER                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Payment Processing                                         │  │
│  │ - Stripe API (subscriptions, invoices)                     │  │
│  │ - Webhook handlers for payment events                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Authentication Providers                                   │  │
│  │ - OAuth 2.0 (Google, GitHub, etc.)                         │  │
│  │ - Email verification                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Calendar Synchronization                                   │  │
│  │ - Google Calendar API                                      │  │
│  │ - iCal sync                                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ File Storage & CDN                                         │  │
│  │ - AWS S3 (media storage)                                   │  │
│  │ - CloudFront (CDN distribution)                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Real-Time Communication                                    │  │
│  │ - Pusher (WebSocket subscriptions)                         │  │
│  │ - Email service (transactional emails)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## C3: Component Architecture

### Frontend Component Hierarchy

```
App (Root)
├── AuthLayout
│   ├── LoginPage
│   ├── SignupPage
│   └── PasswordResetPage
├── MainLayout
│   ├── Navigation
│   │   ├── Sidebar
│   │   └── TopBar
│   ├── FamilyDashboard
│   │   ├── FamilySelector
│   │   ├── MembersList
│   │   └── QuickStats
│   ├── MessagingModule
│   │   ├── ConversationList
│   │   ├── ChatWindow
│   │   │   ├── MessageList
│   │   │   ├── MessageInput
│   │   │   └── TypingIndicator
│   │   └── ChatAI
│   ├── CalendarModule
│   │   ├── CalendarView
│   │   ├── EventForm
│   │   └── EventDetails
│   ├── GalleryModule
│   │   ├── PhotoGrid
│   │   ├── PhotoViewer
│   │   ├── AlbumManager
│   │   └── PhotoUploader
│   ├── ShoppingListModule
│   │   ├── ListManager
│   │   ├── ItemList
│   │   └── ItemForm
│   └── AdminDashboard
│       ├── UserManagement
│       ├── ModerationPanel
│       ├── AnalyticsDashboard
│       └── FeatureFlagManager
└── ModalContainer
    ├── ConfirmDialog
    ├── FormModal
    └── NotificationToast
```

### Backend Service Architecture

```
tRPC Router
├── Auth Service
│   ├── Session Management
│   ├── Password Hashing (bcrypt)
│   ├── Token Generation
│   └── OAuth Integration
├── Family Service
│   ├── Family CRUD
│   ├── Member Management
│   ├── Invitation System
│   └── Settings Management
├── Messaging Service
│   ├── Conversation Management
│   ├── Message CRUD
│   ├── Reaction Handling
│   ├── Typing Indicators
│   └── Real-Time Subscriptions
├── Calendar Service
│   ├── Event Management
│   ├── RSVP Tracking
│   ├── Calendar Sync
│   └── Reminder Scheduling
├── Media Service
│   ├── Upload Handling
│   ├── Image Optimization
│   ├── Tagging System
│   └── Moderation
├── Notification Service
│   ├── Notification Creation
│   ├── Delivery Management
│   ├── Preference Handling
│   └── Digest Generation
├── Billing Service
│   ├── Subscription Management
│   ├── Stripe Integration
│   ├── Invoice Generation
│   └── Feature Access Control
└── Admin Service
    ├── User Management
    ├── Content Moderation
    ├── Audit Logging
    └── Feature Flags
```

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIGNUP FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

User Input (Email, Password)
        │
        ▼
┌─────────────────────────────────────────┐
│ Validate Input (Zod Schema)             │
│ - Email format                          │
│ - Password strength (8+ chars)          │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Check Email Uniqueness                  │
│ Query: SELECT * FROM users WHERE email  │
└─────────────────────────────────────────┘
        │
        ├─ Email exists? → Return error
        │
        ▼
┌─────────────────────────────────────────┐
│ Hash Password (bcrypt, 12 rounds)       │
│ passwordHash = bcrypt.hash(password)    │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Create User Record                      │
│ INSERT INTO users (email, passwordHash) │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Generate Session Token                  │
│ token = crypto.randomBytes(32).hex()    │
│ expiresAt = now + 7 days                │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Create Session Record                   │
│ INSERT INTO sessions (userId, token)    │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Set Session Cookie                      │
│ Set-Cookie: session_token=<token>       │
│ HttpOnly, SameSite=None, Secure         │
└─────────────────────────────────────────┘
        │
        ▼
Return Success + Redirect to Dashboard
```

### Login Flow

```
User Input (Email, Password)
        │
        ▼
┌─────────────────────────────────────────┐
│ Validate Input                          │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Query User by Email                     │
│ SELECT * FROM users WHERE email = ?     │
└─────────────────────────────────────────┘
        │
        ├─ User not found? → Return error
        │
        ▼
┌─────────────────────────────────────────┐
│ Verify Password                         │
│ bcrypt.compare(input, passwordHash)     │
└─────────────────────────────────────────┘
        │
        ├─ Password mismatch? → Return error
        │
        ▼
┌─────────────────────────────────────────┐
│ Invalidate Old Sessions                 │
│ DELETE FROM sessions WHERE userId = ?   │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Create New Session                      │
│ (same as signup flow)                   │
└─────────────────────────────────────────┘
        │
        ▼
Return Success + Session Cookie
```

### Session Validation (Per Request)

```
Incoming Request
        │
        ▼
┌─────────────────────────────────────────┐
│ Extract Session Cookie                  │
│ sessionToken = cookies[SESSION_COOKIE]  │
└─────────────────────────────────────────┘
        │
        ├─ No token? → ctx.user = null
        │
        ▼
┌─────────────────────────────────────────┐
│ Query Session & User                    │
│ SELECT users.*, sessions.*              │
│ FROM sessions                           │
│ JOIN users ON sessions.userId = users.id│
│ WHERE sessions.token = ? AND            │
│       sessions.expiresAt > NOW()        │
└─────────────────────────────────────────┘
        │
        ├─ Session not found/expired? → ctx.user = null
        │
        ▼
┌─────────────────────────────────────────┐
│ Populate Context                        │
│ ctx.user = {                            │
│   id, email, firstName, lastName,       │
│   imageUrl, subscriptionId, role        │
│ }                                       │
└─────────────────────────────────────────┘
        │
        ▼
Proceed with Request
```

### Authorization Middleware

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTHORIZATION CHECKS                           │
└─────────────────────────────────────────────────────────────────┘

1. PUBLIC PROCEDURES
   - No middleware required
   - Examples: auth.signup, auth.login, inquiry.submit

2. PROTECTED PROCEDURES (isAuthed)
   - Middleware: Check ctx.user exists
   - Throws: UNAUTHORIZED if not authenticated
   - Examples: families.list, messages.send, calendar.create

3. ADMIN PROCEDURES (isAdmin)
   - Middleware: Check ctx.user.role === 'admin'
   - Throws: FORBIDDEN if not admin
   - Examples: admin.getUsers, moderation.flagContent

4. FEATURE-GATED PROCEDURES (requireFeature)
   - Middleware: Check subscription tier + feature access
   - Throws: FORBIDDEN if feature not available
   - Examples: media.uploadPhoto, calendar.syncGoogle

5. FAMILY-SCOPED PROCEDURES
   - Middleware: Verify user is family member
   - Throws: FORBIDDEN if not in family
   - Examples: families.update, familyMembers.list

Middleware Chain:
  publicProcedure
    ↓
  protectedProcedure (isAuthed)
    ↓
  adminProcedure (isAuthed + isAdmin)
    ↓
  featureGatedProcedure (isAuthed + requireFeature)
```

---

## Data Models & Relationships

### Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION DOMAIN                        │
└─────────────────────────────────────────────────────────────────┘

users (1) ──────────────────────────────── (N) sessions
  │ id                                        │ id
  │ email (UNIQUE)                            │ userId (FK)
  │ passwordHash                              │ token (UNIQUE)
  │ firstName                                 │ expiresAt
  │ lastName                                  │ createdAt
  │ imageUrl
  │ subscriptionId
  │ role (user | admin)
  │ createdAt
  │ updatedAt

users (1) ──────────────────────────────── (N) oauthAccounts
  │ id                                        │ provider
  │                                           │ providerUserId
  │                                           │ userId (FK)
  │                                           │ email
  │                                           │ createdAt

┌─────────────────────────────────────────────────────────────────┐
│                    FAMILY DOMAIN                                │
└─────────────────────────────────────────────────────────────────┘

users (1) ──────────────────────────────── (N) families
  │ id                                        │ id
  │                                           │ ownerId (FK)
  │                                           │ surname (UNIQUE)
  │                                           │ avatarUrl
  │                                           │ description
  │                                           │ settings (JSON)
  │                                           │ createdAt
  │                                           │ updatedAt

families (1) ──────────────────────────────── (N) familyMembers
  │ id                                        │ id
  │                                           │ familyId (FK)
  │                                           │ userId (FK)
  │                                           │ role (member | admin)
  │                                           │ joinedAt
  │                                           │ createdAt

families (1) ──────────────────────────────── (N) familyInvitations
  │ id                                        │ id
  │                                           │ familyId (FK)
  │                                           │ email
  │                                           │ invitedBy (FK to users)
  │                                           │ status (pending | accepted)
  │                                           │ expiresAt
  │                                           │ createdAt

┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGING DOMAIN                             │
└─────────────────────────────────────────────────────────────────┘

families (1) ──────────────────────────────── (N) conversations
  │ id                                        │ id
  │                                           │ familyId (FK)
  │                                           │ participant1Id (FK to users)
  │                                           │ participant2Id (FK to users)
  │                                           │ status (active | archived)
  │                                           │ createdAt
  │                                           │ updatedAt

conversations (1) ──────────────────────────── (N) conversationMessages
  │ id                                        │ id
  │                                           │ conversationId (FK)
  │                                           │ senderId (FK to users)
  │                                           │ content
  │                                           │ mediaUrl
  │                                           │ createdAt
  │                                           │ updatedAt

conversationMessages (1) ──────────────────── (N) messageReactions
  │ id                                        │ id
  │                                           │ messageId (FK)
  │                                           │ userId (FK)
  │                                           │ emoji
  │                                           │ createdAt

conversationMessages (1) ──────────────────── (N) pinnedMessages
  │ id                                        │ id
  │                                           │ messageId (FK)
  │                                           │ conversationId (FK)
  │                                           │ pinnedBy (FK to users)
  │                                           │ pinnedAt

┌─────────────────────────────────────────────────────────────────┐
│                    CALENDAR DOMAIN                              │
└─────────────────────────────────────────────────────────────────┘

families (1) ──────────────────────────────── (N) calendarEvents
  │ id                                        │ id
  │                                           │ familyId (FK)
  │                                           │ createdBy (FK to users)
  │                                           │ title
  │                                           │ description
  │                                           │ startTime
  │                                           │ endTime
  │                                           │ location
  │                                           │ visibility (public | private)
  │                                           │ createdAt
  │                                           │ updatedAt

calendarEvents (1) ──────────────────────────── (N) eventRsvps
  │ id                                        │ id
  │                                           │ eventId (FK)
  │                                           │ userId (FK)
  │                                           │ status (yes | no | maybe)
  │                                           │ respondedAt

┌─────────────────────────────────────────────────────────────────┐
│                    MEDIA DOMAIN                                 │
└─────────────────────────────────────────────────────────────────┘

families (1) ──────────────────────────────── (N) media
  │ id                                        │ id
  │                                           │ familyId (FK)
  │                                           │ uploadedBy (FK to users)
  │                                           │ type (photo | video)
  │                                           │ url
  │                                           │ thumbnailUrl
  │                                           │ metadata (JSON)
  │                                           │ createdAt
  │                                           │ updatedAt

media (1) ──────────────────────────────── (N) photoTags
  │ id                                        │ id
  │                                           │ mediaId (FK)
  │                                           │ userId (FK)
  │                                           │ x (position)
  │                                           │ y (position)
  │                                           │ createdAt

media (1) ──────────────────────────────── (N) mediaModeration
  │ id                                        │ id
  │                                           │ mediaId (FK)
  │                                           │ flaggedBy (FK to users)
  │                                           │ reason
  │                                           │ status (pending | approved | rejected)
  │                                           │ createdAt

┌─────────────────────────────────────────────────────────────────┐
│                    BILLING DOMAIN                               │
└─────────────────────────────────────────────────────────────────┘

users (1) ──────────────────────────────── (N) subscriptions
  │ id                                        │ id
  │                                           │ userId (FK)
  │                                           │ stripeSubscriptionId
  │                                           │ stripeCustomerId
  │                                           │ tier (free | pro | enterprise)
  │                                           │ status (active | canceled | past_due)
  │                                           │ currentPeriodStart
  │                                           │ currentPeriodEnd
  │                                           │ trialEndDate
  │                                           │ createdAt
  │                                           │ updatedAt

subscriptions (1) ──────────────────────────── (N) invoices
  │ id                                        │ id
  │                                           │ subscriptionId (FK)
  │                                           │ stripeInvoiceId
  │                                           │ amount
  │                                           │ currency
  │                                           │ status (draft | sent | paid | void)
  │                                           │ dueDate
  │                                           │ paidAt
  │                                           │ createdAt
```

### Key Tables Summary

| Table | Purpose | Key Fields | Indexes |
|-------|---------|-----------|---------|
| **users** | User accounts | id, email, passwordHash, role | email (UNIQUE) |
| **sessions** | Active sessions | id, userId, token, expiresAt | token (UNIQUE), userId |
| **families** | Family groups | id, ownerId, surname | surname (UNIQUE), ownerId |
| **familyMembers** | Family membership | id, familyId, userId, role | familyId, userId |
| **conversations** | 1-to-1 chats | id, familyId, participant1Id, participant2Id | familyId, participants |
| **conversationMessages** | Chat messages | id, conversationId, senderId, content | conversationId, createdAt |
| **calendarEvents** | Calendar events | id, familyId, createdBy, startTime | familyId, startTime |
| **media** | Photos/videos | id, familyId, uploadedBy, url | familyId, uploadedBy |
| **subscriptions** | User subscriptions | id, userId, tier, status | userId, stripeSubscriptionId |
| **notifications** | User notifications | id, userId, type, read | userId, createdAt |

---

## API Design (tRPC Routers)

### Router Organization

```
app/server/trpc/routers/
├── auth.router.ts              # Authentication (signup, login, logout)
├── users.router.ts             # User profile management
├── families.router.ts          # Family CRUD operations
├── familyMembers.router.ts     # Family member management
├── familyInvitations.router.ts # Invitation system
├── conversations.router.ts     # Conversation management
├── messages.router.ts          # Message operations
├── chat.router.ts              # AI chat interface
├── calendarEvents.router.ts    # Calendar event management
├── calendarSync.router.ts      # Calendar provider sync
├── media.router.ts             # Photo/video operations
├── notifications.router.ts     # Notification management
├── billing.router.ts           # Subscription management
├── admin.router.ts             # Admin operations
├── moderation.router.ts        # Content moderation
├── auditLogs.router.ts         # Audit trail
├── featureAccess.router.ts     # Feature flag access
└── [other domain routers]
```

### Example: Auth Router

```typescript
// Procedures
auth.me()
  → Returns: { user: SafeUser | null, isSignedIn: boolean }
  → Auth: Public
  → Purpose: Get current session

auth.signup(email, password)
  → Input: { email: string, password: string }
  → Returns: { user: SafeUser, sessionToken: string }
  → Auth: Public
  → Purpose: Create new user account

auth.login(email, password)
  → Input: { email: string, password: string }
  → Returns: { user: SafeUser, sessionToken: string }
  → Auth: Public
  → Purpose: Authenticate user

auth.logout()
  → Returns: { success: boolean }
  → Auth: Protected
  → Purpose: Invalidate session

auth.changePassword(currentPassword, newPassword)
  → Input: { currentPassword: string, newPassword: string }
  → Returns: { success: boolean }
  → Auth: Protected
  → Purpose: Update user password

auth.requestPasswordReset(email)
  → Input: { email: string }
  → Returns: { success: boolean }
  → Auth: Public
  → Purpose: Send password reset email

auth.resetPassword(token, newPassword)
  → Input: { token: string, newPassword: string }
  → Returns: { success: boolean }
  → Auth: Public
  → Purpose: Complete password reset
```

### Example: Families Router

```typescript
// Procedures
families.list()
  → Returns: Family[]
  → Auth: Protected
  → Purpose: Get user's families

families.create(surname, description)
  → Input: { surname: string, description?: string }
  → Returns: Family
  → Auth: Protected
  → Purpose: Create new family

families.getById(familyId)
  → Input: { familyId: string }
  → Returns: Family
  → Auth: Protected (family member check)
  → Purpose: Get family details

families.update(familyId, updates)
  → Input: { familyId: string, surname?: string, description?: string }
  → Returns: Family
  → Auth: Protected (family admin check)
  → Purpose: Update family info

families.delete(familyId)
  → Input: { familyId: string }
  → Returns: { success: boolean }
  → Auth: Protected (family owner check)
  → Purpose: Delete family

families.getMembers(familyId)
  → Input: { familyId: string }
  → Returns: FamilyMember[]
  → Auth: Protected (family member check)
  → Purpose: List family members

families.getSettings(familyId)
  → Input: { familyId: string }
  → Returns: FamilySettings
  → Auth: Protected (family member check)
  → Purpose: Get family settings

families.updateSettings(familyId, settings)
  → Input: { familyId: string, settings: Partial<FamilySettings> }
  → Returns: FamilySettings
  → Auth: Protected (family admin check)
  → Purpose: Update family settings
```

### Example: Messages Router

```typescript
// Procedures
messages.send(conversationId, content, mediaUrl?)
  → Input: { conversationId: string, content: string, mediaUrl?: string }
  → Returns: ConversationMessage
  → Auth: Protected
  → Purpose: Send message

messages.list(conversationId, limit, cursor)
  → Input: { conversationId: string, limit?: number, cursor?: string }
  → Returns: { messages: ConversationMessage[], nextCursor?: string }
  → Auth: Protected
  → Purpose: Get message history (paginated)

messages.update(messageId, content)
  → Input: { messageId: string, content: string }
  → Returns: ConversationMessage
  → Auth: Protected (sender check)
  → Purpose: Edit message

messages.delete(messageId)
  → Input: { messageId: string }
  → Returns: { success: boolean }
  → Auth: Protected (sender check)
  → Purpose: Delete message

messages.addReaction(messageId, emoji)
  → Input: { messageId: string, emoji: string }
  → Returns: MessageReaction
  → Auth: Protected
  → Purpose: Add emoji reaction

messages.removeReaction(messageId, emoji)
  → Input: { messageId: string, emoji: string }
  → Returns: { success: boolean }
  → Auth: Protected
  → Purpose: Remove emoji reaction

messages.pin(messageId)
  → Input: { messageId: string }
  → Returns: PinnedMessage
  → Auth: Protected
  → Purpose: Pin message

messages.unpin(messageId)
  → Input: { messageId: string }
  → Returns: { success: boolean }
  → Auth: Protected
  → Purpose: Unpin message
```

### Subscription Procedures (Real-Time)

```typescript
// Subscriptions (WebSocket)
messages.onMessage(conversationId)
  → Emits: ConversationMessage
  → Auth: Protected
  → Purpose: Real-time message updates

messages.onTyping(conversationId)
  → Emits: { userId: string, isTyping: boolean }
  → Auth: Protected
  → Purpose: Real-time typing indicators

notifications.onNotification()
  → Emits: Notification
  → Auth: Protected
  → Purpose: Real-time notifications

conversations.onConversationUpdate(familyId)
  → Emits: Conversation
  → Auth: Protected
  → Purpose: Real-time conversation updates

calendarEvents.onEventUpdate(familyId)
  → Emits: CalendarEvent
  → Auth: Protected
  → Purpose: Real-time calendar updates
```

---

## Real-Time Updates

### WebSocket Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ tRPC Client with WebSocket Transport                       │  │
│  │ - Automatic reconnection                                   │  │
│  │ - Message queuing during disconnection                     │  │
│  │ - Subscription management                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                         │
                         │ WebSocket (ws://)
                         │ Upgrade from HTTP
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ tRPC WebSocket Handler                                     │  │
│  │ - Connection management                                    │  │
│  │ - Message routing                                          │  │
│  │ - Subscription lifecycle                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Event Emitter / Pub-Sub System                             │  │
│  │ - In-memory event bus                                      │  │
│  │ - Channel subscriptions                                    │  │
│  │ - Message broadcasting                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Database Triggers / Change Streams                         │  │
│  │ - Listen for data changes                                  │  │
│  │ - Emit events to subscribers                               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Real-Time Event Flow

```
User Action (Send Message)
        │
        ▼
┌─────────────────────────────────────────┐
│ tRPC Mutation: messages.send()          │
│ - Validate input                        │
│ - Check authorization                   │
│ - Insert into database                  │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Emit Event: "message:created"           │
│ - Conversation ID                       │
│ - Message data                          │
│ - Timestamp                             │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Broadcast to Subscribers                │
│ - Find all clients subscribed to        │
│   conversation                          │
│ - Send message via WebSocket            │
└─────────────────────────────────────────┘
        │
        ├─ Sender's client
        │  └─ Update local state
        │     └─ Re-render UI
        │
        ├─ Other participants' clients
        │  └─ Receive message
        │     └─ Update conversation
        │     └─ Show notification
        │
        └─ Offline clients
           └─ Message queued
              └─ Delivered on reconnect
```

### Subscription Lifecycle

```
Client Subscribes
        │
        ▼
┌─────────────────────────────────────────┐
│ tRPC Subscription Handler               │
│ - Authenticate user                     │
│ - Validate subscription parameters      │
│ - Check authorization                   │
└─────────────────────────────────────────┘
        │
        ├─ Authorization failed?
        │  └─ Close subscription
        │
        ▼
┌─────────────────────────────────────────┐
│ Register Subscription                   │
│ - Add to active subscriptions map       │
│ - Store client connection info          │
│ - Set up event listeners                │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ Listen for Events                       │
│ - Database changes                      │
│ - User actions                          │
│ - System events                         │
└─────────────────────────────────────────┘
        │
        ├─ Event matches subscription?
        │  └─ Send to client
        │
        ▼
┌─────────────────────────────────────────┐
│ Client Unsubscribes / Disconnects       │
│ - Remove from subscriptions map         │
│ - Clean up event listeners              │
│ - Close WebSocket connection            │
└─────────────────────────────────────────┘
```

### Real-Time Features

| Feature | Mechanism | Latency | Use Case |
|---------|-----------|---------|----------|
| **Messages** | WebSocket subscription | <100ms | Live chat updates |
| **Typing Indicators** | Debounced events | <500ms | Show who's typing |
| **Notifications** | Server push | <1s | Alert user of events |
| **Presence** | Heartbeat + timeout | <5s | Show online status |
| **Calendar Updates** | Event emission | <1s | Live event changes |
| **Media Uploads** | Progress events | Real-time | Upload progress bar |

---

## Deployment Architecture

### Production Environment

```
┌──────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT ARCHITECTURE                       │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CDN / EDGE LAYER                             │
│  - CloudFront (AWS)                                             │
│  - Static asset caching                                         │
│  - Gzip compression                                             │
│  - DDoS protection                                              │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER                                │
│  - AWS Application Load Balancer (ALB)                          │
│  - SSL/TLS termination                                          │
│  - Health checks                                                │
│  - Request routing                                              │
└─────────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ App Server 1 │  │ App Server 2 │  │ App Server 3 │
│ (Node.js)    │  │ (Node.js)    │  │ (Node.js)    │
│ Port 3000    │  │ Port 3000    │  │ Port 3000    │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostgreSQL Primary (Read/Write)                            │ │
│  │ - AWS RDS Multi-AZ                                         │ │
│  │ - Automated backups                                        │ │
│  │ - Point-in-time recovery                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostgreSQL Replica (Read-Only)                             │ │
│  │ - Standby instance                                         │ │
│  │ - Automatic failover                                       │ │
│  │ - Read scaling                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
        │
        ├─ Connection Pooling (PgBouncer)
        │  └─ Max 100 connections per app server
        │
        └─ Backup Strategy
           ├─ Daily snapshots
           ├─ 30-day retention
           └─ Cross-region replication

┌─────────────────────────────────────────────────────────────────┐
│                    CACHE LAYER                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Redis (Session Store)                                      │ │
│  │ - AWS ElastiCache                                          │ │
│  │ - Multi-AZ replication                                     │ │
│  │ - 24-hour TTL for sessions                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Browser Cache                                              │ │
│  │ - Static assets: 1 year                                    │ │
│  │ - API responses: 5 minutes                                 │ │
│  │ - HTML: no-cache                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FILE STORAGE                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ AWS S3 (Media Storage)                                     │ │
│  │ - Bucket: family-photos-prod                               │ │
│  │ - Versioning enabled                                       │ │
│  │ - Server-side encryption                                   │ │
│  │ - Lifecycle policies (archive old files)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ CloudFront (CDN for Media)                                 │ │
│  │ - Origin: S3 bucket                                        │ │
│  │ - Cache: 30 days                                           │ │
│  │ - Compression: gzip, brotli                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING & LOGGING                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ CloudWatch (AWS)                                           │ │
│  │ - Application logs                                         │ │
│  │ - Error tracking                                           │ │
│  │ - Performance metrics                                      │ │
│  │ - Alarms & notifications                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Sentry (Error Tracking)                                    │ │
│  │ - Client-side errors                                       │ │
│  │ - Server-side exceptions                                   │ │
│  │ - Performance monitoring                                   │ │
│  │ - Release tracking                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ DataDog (APM)                                              │ │
│  │ - Request tracing                                          │ │
│  │ - Database query analysis                                  │ │
│  │ - Infrastructure monitoring                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Configuration

```
PRODUCTION (.env.production)
├── DATABASE_URL=postgresql://user:pass@prod-db.rds.amazonaws.com/family_app
├── REDIS_URL=redis://prod-cache.elasticache.amazonaws.com:6379
├── NODE_ENV=production
├── STRIPE_SECRET_KEY=sk_live_...
├── STRIPE_PUBLISHABLE_KEY=pk_live_...
├── AWS_ACCESS_KEY_ID=...
├── AWS_SECRET_ACCESS_KEY=...
├── AWS_S3_BUCKET=family-photos-prod
├── CLOUDFRONT_DOMAIN=d123.cloudfront.net
├── SENTRY_DSN=https://...@sentry.io/...
├── LOG_LEVEL=info
└── CORS_ORIGIN=https://familyapp.com

STAGING (.env.staging)
├── DATABASE_URL=postgresql://user:pass@staging-db.rds.amazonaws.com/family_app
├── REDIS_URL=redis://staging-cache.elasticache.amazonaws.com:6379
├── NODE_ENV=production
├── STRIPE_SECRET_KEY=sk_test_...
├── AWS_S3_BUCKET=family-photos-staging
└── [other staging configs]

DEVELOPMENT (.env.local)
├── DATABASE_URL=postgresql://localhost/family_app_dev
├── REDIS_URL=redis://localhost:6379
├── NODE_ENV=development
├── STRIPE_SECRET_KEY=sk_test_...
├── AWS_S3_BUCKET=family-photos-dev
└── [other dev configs]
```

### Deployment Process

```
1. Code Commit
   └─ Push to main branch

2. CI/CD Pipeline (GitHub Actions)
   ├─ Run tests
   ├─ Type checking
   ├─ Linting
   ├─ Build application
   ├─ Build Docker image
   └─ Push to ECR

3. Staging Deployment
   ├─ Pull image from ECR
   ├─ Run database migrations
   ├─ Deploy to staging environment
   ├─ Run smoke tests
   └─ Notify team

4. Production Deployment (Manual Approval)
   ├─ Create release tag
   ├─ Pull image from ECR
   ├─ Blue-green deployment
   │  ├─ Start new instances (green)
   │  ├─ Run health checks
   │  ├─ Switch load balancer (blue → green)
   │  └─ Keep old instances for rollback
   ├─ Run smoke tests
   ├─ Monitor error rates
   └─ Notify stakeholders

5. Rollback (if needed)
   ├─ Switch load balancer back to blue
   ├─ Investigate issue
   └─ Deploy fix
```

### Database Migration Strategy

```
1. Pre-Deployment
   ├─ Create backup
   ├─ Test migration on staging
   ├─ Estimate downtime
   └─ Plan rollback

2. Migration Execution
   ├─ Enable read-only mode (optional)
   ├─ Run Drizzle migrations
   │  └─ drizzle-kit push:pg
   ├─ Verify schema changes
   └─ Disable read-only mode

3. Post-Deployment
   ├─ Monitor query performance
   ├─ Check error logs
   ├─ Verify data integrity
   └─ Update documentation

4. Rollback (if needed)
   ├─ Restore from backup
   ├─ Verify data
   └─ Redeploy previous version
```

---

## Security & Compliance

### Authentication Security

```
┌─────────────────────────────────────────────────────────────────┐
│                    PASSWORD SECURITY                            │
└─────────────────────────────────────────────────────────────────┘

Password Requirements:
  ✓ Minimum 8 characters
  ✓ No common patterns (checked against dictionary)
  ✓ Hashed with bcrypt (12 rounds)
  ✓ Never stored in plain text
  ✓ Never logged or exposed

Password Hashing:
  1. User enters password
  2. Validate against requirements
  3. Generate salt (bcrypt, 12 rounds)
  4. Hash password with salt
  5. Store hash in database
  6. Discard original password

Password Verification:
  1. User enters password
  2. Retrieve hash from database
  3. Compare with bcrypt.compare()
  4. Return true/false
  5. Never expose hash or password

Password Reset:
  1. User requests reset
  2. Generate secure token (crypto.randomBytes)
  3. Store token with expiry (1 hour)
  4. Send reset link via email
  5. User clicks link, enters new password
  6. Validate token & expiry
  7. Hash new password
  8. Update database
  9. Invalidate all sessions
  10. Invalidate reset token
```

### Session Security

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION MANAGEMENT                           │
└─────────────────────────────────────────────────────────────────┘

Session Token Generation:
  ✓ Cryptographically secure random (crypto.randomBytes)
  ✓ 32 bytes (256 bits) of entropy
  ✓ Hex-encoded (64 characters)
  ✓ Unique per session
  ✓ Stored in database with hash

Session Cookie:
  ✓ HttpOnly (not accessible via JavaScript)
  ✓ Secure (HTTPS only)
  ✓ SameSite=None (for iframe support)
  ✓ Max-Age=604800 (7 days)
  ✓ Path=/

Session Validation:
  ✓ Check token exists in database
  ✓ Verify expiry time
  ✓ Verify user still exists
  ✓ Verify user not banned/deleted
  ✓ Populate context with user data

Session Expiry:
  ✓ 7 days from creation
  ✓ Automatic cleanup of expired sessions
  ✓ User can manually logout (invalidate)
  ✓ Suspicious activity triggers logout

Session Invalidation:
  ✓ On logout: DELETE FROM sessions WHERE userId = ?
  ✓ On password change: DELETE all sessions
  ✓ On account deletion: DELETE all sessions
  ✓ On suspicious activity: DELETE all sessions
```

### Authorization & Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLE-BASED ACCESS CONTROL                    │
└─────────────────────────────────────────────────────────────────┘

User Roles:
  1. user (default)
     - Access own profile
     - Create/join families
     - Send messages
     - Upload media
     - View family data

  2. admin (platform)
     - All user permissions
     - Moderate content
     - Manage users
     - View audit logs
     - Manage feature flags
     - Access admin dashboard

  3. family_admin (family-scoped)
     - All family member permissions
     - Manage family members
     - Update family settings
     - Delete family
     - Manage invitations

Authorization Checks:
  ✓ Middleware validates user is authenticated
  ✓ Middleware validates user has required role
  ✓ Procedure validates user has access to resource
  ✓ Procedure validates user has permission for action

Example: Update Family
  1. Check user is authenticated (isAuthed middleware)
  2. Check user is family admin (custom middleware)
  3. Check family exists
  4. Check user is member of family
  5. Check user is admin in family
  6. Perform update
  7. Log action in audit log
```

### Data Protection

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA SECURITY                                │
└─────────────────────────────────────────────────────────────────┘

Encryption at Rest:
  ✓ Database: AWS RDS encryption (AES-256)
  ✓ S3: Server-side encryption (AES-256)
  ✓ Backups: Encrypted snapshots
  ✓ Sensitive fields: Application-level encryption

Encryption in Transit:
  ✓ HTTPS/TLS 1.3 for all connections
  ✓ WSS (WebSocket Secure) for real-time
  ✓ Certificate pinning (optional)
  ✓ HSTS headers enabled

Data Minimization:
  ✓ Only collect necessary data
  ✓ Delete data after retention period
  ✓ Anonymize data for analytics
  ✓ Purge old sessions/logs

Sensitive Data Handling:
  ✓ Never log passwords
  ✓ Never log payment info
  ✓ Never log API keys
  ✓ Mask PII in logs
  ✓ Encrypt sensitive fields in database
```

### API Security

```
┌─────────────────────────────────────────────────────────────────┐
│                    API SECURITY                                 │
└─────────────────────────────────────────────────────────────────┘

Input Validation:
  ✓ Zod schema validation on all inputs
  ✓ Type checking at compile time
  ✓ Runtime validation at procedure entry
  ✓ Reject invalid/malicious input
  ✓ Return clear error messages

Rate Limiting:
  ✓ Per-user rate limits
  ✓ Per-IP rate limits
  ✓ Per-endpoint rate limits
  ✓ Exponential backoff for retries
  ✓ Block after threshold exceeded

CORS Configuration:
  ✓ Whitelist allowed origins
  ✓ Allow credentials
  ✓ Restrict HTTP methods
  ✓ Restrict headers
  ✓ Preflight caching

CSRF Protection:
  ✓ SameSite cookies (SameSite=None for iframes)
  ✓ CSRF tokens for state-changing operations
  ✓ Verify origin header
  ✓ Validate referer header

SQL Injection Prevention:
  ✓ Use parameterized queries (Drizzle ORM)
  ✓ Never concatenate SQL strings
  ✓ Validate input types
  ✓ Escape special characters
```

### Compliance & Audit

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT & COMPLIANCE                           │
└─────────────────────────────────────────────────────────────────┘

Audit Logging:
  ✓ Log all user actions
  ✓ Log all admin actions
  ✓ Log all data modifications
  ✓ Include timestamp, user, action, resource
  ✓ Immutable audit log (append-only)
  ✓ Retention: 1 year

Data Privacy:
  ✓ GDPR compliance
  ✓ Right to access (export data)
  ✓ Right to deletion (delete account)
  ✓ Right to rectification (update data)
  ✓ Privacy policy available
  ✓ Consent management

Security Monitoring:
  ✓ Monitor failed login attempts
  ✓ Alert on suspicious activity
  ✓ Track API abuse
  ✓ Monitor error rates
  ✓ Alert on security events
  ✓ Regular security audits

Incident Response:
  ✓ Incident response plan
  ✓ Security contact information
  ✓ Breach notification procedures
  ✓ Post-incident analysis
  ✓ Continuous improvement
```

---

## Performance Considerations

### Frontend Performance

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE OPTIMIZATION                     │
└─────────────────────────────────────────────────────────────────┘

Code Splitting:
  ✓ Route-based code splitting (React.lazy)
  ✓ Component-based code splitting
  ✓ Vendor bundle separation
  ✓ Lazy load non-critical routes
  ✓ Prefetch critical routes

Image Optimization:
  ✓ WebP format with fallbacks
  ✓ Responsive images (srcset)
  ✓ Lazy loading (loading="lazy")
  ✓ Image compression (quality profiles)
  ✓ CDN distribution (CloudFront)

Caching Strategy:
  ✓ Browser cache: 1 year for static assets
  ✓ Service Worker: offline support
  ✓ HTTP cache headers: Cache-Control
  ✓ React Query: client-side caching
  ✓ CDN cache: 30 days for media

Bundle Size:
  ✓ Target: <100KB gzipped (initial)
  ✓ Monitor with webpack-bundle-analyzer
  ✓ Remove unused dependencies
  ✓ Tree-shake unused code
  ✓ Minify and compress

Core Web Vitals:
  ✓ LCP (Largest Contentful Paint): <2.5s
  ✓ FID (First Input Delay): <100ms
  ✓ CLS (Cumulative Layout Shift): <0.1
  ✓ Monitor with Web Vitals library
  ✓ Report to analytics
```

### Backend Performance

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND OPTIMIZATION                         │
└─────────────────────────────────────────────────────────────────┘

Database Optimization:
  ✓ Indexes on frequently queried columns
  ✓ Query optimization (EXPLAIN ANALYZE)
  ✓ Connection pooling (PgBouncer)
  ✓ Read replicas for scaling
  ✓ Caching layer (Redis)

Query Performance:
  ✓ N+1 query prevention (eager loading)
  ✓ Pagination for large result sets
  ✓ Limit query results
  ✓ Use appropriate indexes
  ✓ Monitor slow queries

API Response Time:
  ✓ Target: <200ms for 95th percentile
  ✓ Monitor with APM tools
  ✓ Optimize hot paths
  ✓ Cache expensive operations
  ✓ Async processing for heavy tasks

Scaling Strategy:
  ✓ Horizontal scaling (multiple app servers)
  ✓ Load balancing (ALB)
  ✓ Database replication
  ✓ Cache layer (Redis)
  ✓ CDN for static assets
  ✓ Message queue for async tasks

Resource Limits:
  ✓ Memory: 512MB per app instance
  ✓ CPU: 2 vCPU per instance
  ✓ Database connections: 100 per app
  ✓ Request timeout: 30 seconds
  ✓ Payload size: 10MB max
```

### Monitoring & Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEY METRICS                                  │
└─────────────────────────────────────────────────────────────────┘

Application Metrics:
  ✓ Request rate (req/sec)
  ✓ Response time (p50, p95, p99)
  ✓ Error rate (errors/sec)
  ✓ Success rate (%)
  ✓ Active users
  ✓ API endpoint usage

Database Metrics:
  ✓ Query execution time
  ✓ Slow query count
  ✓ Connection pool usage
  ✓ Replication lag
  ✓ Disk usage
  ✓ Backup status

Infrastructure Metrics:
  ✓ CPU usage (%)
  ✓ Memory usage (%)
  ✓ Disk usage (%)
  ✓ Network I/O
  ✓ Instance health
  ✓ Auto-scaling events

Business Metrics:
  ✓ User signups
  ✓ Active users
  ✓ Feature usage
  ✓ Subscription conversions
  ✓ Churn rate
  ✓ Revenue

Alerting:
  ✓ Error rate > 1%
  ✓ Response time > 1s
  ✓ CPU > 80%
  ✓ Memory > 85%
  ✓ Disk > 90%
  ✓ Database replication lag > 10s
```

---

## Appendix: Technology Stack

### Frontend
- **Framework**: React 18+ with React Router v7
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Query + React Context
- **API Client**: tRPC Client
- **Real-Time**: tRPC Subscriptions (WebSocket)
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **API**: tRPC
- **Database**: PostgreSQL 14+
- **ORM**: Drizzle ORM
- **Authentication**: Session-based (bcrypt + crypto)
- **Validation**: Zod
- **Real-Time**: WebSocket (tRPC)
- **Testing**: Vitest + Supertest

### Infrastructure
- **Hosting**: AWS (EC2, RDS, S3, CloudFront)
- **Load Balancing**: AWS ALB
- **Caching**: Redis (ElastiCache)
- **CDN**: CloudFront
- **Monitoring**: CloudWatch + Sentry + DataDog
- **CI/CD**: GitHub Actions
- **Container**: Docker + ECR

### External Services
- **Payments**: Stripe
- **Authentication**: OAuth 2.0 (Google, GitHub)
- **Calendar**: Google Calendar API
- **Email**: SendGrid / AWS SES
- **File Storage**: AWS S3
- **Error Tracking**: Sentry
- **Analytics**: Mixpanel / Segment

---

**Document Version**: 1.0
**Last Updated**: 2024
**Maintained By**: Engineering Team
**Next Review**: Quarterly
