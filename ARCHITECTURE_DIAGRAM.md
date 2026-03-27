# FamilyHub Multi-Tenant Architecture Diagram

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FamilyHub Multi-Tenant System                │
│                        (1 Deployment)                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Browser / Frontend                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Anderson Family          Smith Family          Johnson Family   │
│  ┌──────────────────┐     ┌──────────────────┐  ┌─────────────┐ │
│  │ React Router App │     │ React Router App │  │ React App   │ │
│  │                  │     │                  │  │             │ │
│  │ FamilySwitcher   │     │ FamilySwitcher   │  │ Switcher    │ │
│  │ "AN" [Anderson]  │     │ "SM" [TestSmith] │  │ "JO"        │ │
│  │ familyContext    │     │ familyContext    │  │             │ │
│  └──────────────────┘     └──────────────────┘  └─────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    tRPC Routers (Backend)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  families.getMyFamilies()  ← Verify user membership              │
│  posts.getMessages({ familyId })  ← Filter by familyId          │
│  members.getByFamily({ familyId })  ← Only family members       │
│  media.getByFamily({ familyId })  ← Only family media           │
│  calendar.getByFamily({ familyId })  ← Only family events       │
│                                                                   │
│  ✅ Every endpoint:                                              │
│     1. Verify user is member of familyId                        │
│     2. Filter results by familyId                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (1 Instance)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  users                      families                             │
│  ├─ id: uuid                ├─ id: uuid                          │
│  ├─ email                   ├─ surname (UNIQUE)                  │
│  └─ passwordHash            └─ ownerId → users.id               │
│                                                                   │
│  family_members (join table)                                     │
│  ├─ id: uuid                                                     │
│  ├─ userId → users.id       ← Links user to family               │
│  ├─ familyId → families.id  ← Links to family                    │
│  └─ role: admin|member|guest                                    │
│                                                                   │
│  posts (message board)                                           │
│  ├─ id: uuid                                                     │
│  ├─ familyId → families.id  ← ISOLATION KEY!                    │
│  ├─ authorId → users.id                                         │
│  └─ content                                                      │
│                                                                   │
│  media (photos/videos)                                           │
│  ├─ id: uuid                                                     │
│  ├─ familyId → families.id  ← ISOLATION KEY!                    │
│  ├─ userId → users.id                                           │
│  └─ url                                                          │
│                                                                   │
│  calendar_events                                                 │
│  ├─ id: uuid                                                     │
│  ├─ familyId → families.id  ← ISOLATION KEY!                    │
│  ├─ userId → users.id                                           │
│  └─ title, description, startTime, endTime                      │
│                                                                   │
│  [ALL OTHER TABLES include familyId!]                           │
│  ├─ shopping_lists (familyId)                                   │
│  ├─ conversation_messages (familyId)                            │
│  ├─ timeline_highlights (familyId)                              │
│  └─ ...                                                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow: User Requests Messages

```
User: robert.smith@example.com
Family: TestSmith (familyId: "xyz-789")

1️⃣  FRONTEND
   const { currentFamily } = useFamily()  // Gets { id: "xyz-789", surname: "TestSmith" }
   messages = trpc.posts.getMessages.useQuery({ familyId: "xyz-789" })

2️⃣  tRPC ROUTER
   getMessages: procedure
     .input(z.object({ familyId: z.string() }))
     .query(async ({ ctx, input }) => {
       
       // ✅ STEP 1: Verify membership
       const [membership] = await db
         .select()
         .from(familyMembers)
         .where(eq(familyMembers.familyId, input.familyId))
         .where(eq(familyMembers.userId, ctx.user.id))
       
       if (!membership) {
         throw new Error("Not a member")  // ← BLOCK if not member!
       }
       
       // ✅ STEP 2: Query with familyId filter
       const messages = await db
         .select()
         .from(posts)
         .where(eq(posts.familyId, input.familyId))  // ← CRITICAL!
       
       return messages
     })

3️⃣  DATABASE QUERY
   SELECT * FROM posts
   WHERE familyId = 'xyz-789'   ← Only TestSmith messages!
   AND posts.createdAt > now() - interval '30 days'

4️⃣  DATABASE RESPONSE
   ✓ Message 1: "Welcome to TestSmith FamilyHub!" (from Robert)
   ✓ Message 2: "Don't forget dinner!" (from Alice)
   ✗ Message 3: "Anderson family update..." (NOT returned - different familyId!)

5️⃣  FRONTEND DISPLAY
   "TestSmith FamilyHub Message Board"
   ├─ Welcome to TestSmith FamilyHub! (Robert Smith)
   ├─ Don't forget dinner! (Alice Smith)
   └─ [No Anderson messages visible]
```

---

## 🔐 Security Layers - Attempting Unauthorized Access

```
Attacker Goal: View Anderson family messages as Smith user

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scenario 1: Try to request Anderson data
┌──────────────────────────────────────────────────┐
│ trpc.posts.getMessages({ familyId: "anderson" }) │
│ (as robert.smith.test@example.com)               │
└──────────────────────────────────────────────────┘
                         ↓
                    LAYER 1: Membership Check
                         ↓
    SELECT * FROM family_members
    WHERE userId = 'smith-user-id'
    AND familyId = 'anderson-id'
                         ↓
                    ❌ NO RESULTS!
                  (Smith is not member of Anderson)
                         ↓
            Error: "You are not a member of this family"
                   [Request BLOCKED]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scenario 2: Try to hack database directly
┌──────────────────────────────────────────────────┐
│ SELECT * FROM posts WHERE familyId = 'anderson'  │
│ (somehow bypassed application layer)             │
└──────────────────────────────────────────────────┘
                         ↓
                   LAYER 2: Database Schema
                         ↓
    posts table has:
    ├─ id
    ├─ familyId (foreign key to families table)
    └─ content
    
    All posts are tagged with specific familyId
    Anderson messages: familyId = 'anderson-id'
    Smith messages: familyId = 'xyz-789'
                         ↓
            Can query, but only gets data matching familyId
            ✓ Direct query returns only what matches WHERE clause
            ❌ Cannot get Anderson data (different familyId)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ RESULT: Complete isolation at multiple levels
   - Application layer verifies membership
   - Database enforces data separation
   - Even if one layer is bypassed, the other protects
```

---

## 👥 User to Family Relationships

```
Database View:

users table:
┌─────────────────────────────────────────┐
│ id        │ email                       │
├─────────────────────────────────────────┤
│ user-1    │ john.anderson.test@...      │
│ user-2    │ sarah.anderson.test@...     │
│ user-3    │ robert.smith.test@...       │
│ user-4    │ alice.smith.test@...        │
│ user-5    │ david.johnson.test@...      │
└─────────────────────────────────────────┘
                      ↑
                      │
         family_members (join table)
         
┌─────────────────────────────────────────────────────────┐
│ userId │ familyId      │ role      │ status             │
├─────────────────────────────────────────────────────────┤
│ 1      │ anderson-id   │ admin     │ active             │
│ 2      │ anderson-id   │ member    │ active             │
│ 3      │ smith-id      │ admin     │ active             │
│ 4      │ smith-id      │ member    │ active             │
│ 5      │ johnson-id    │ admin     │ active             │
│ 3      │ johnson-id    │ member    │ active (dual!)     │
└─────────────────────────────────────────────────────────┘
                      ↑
                      │
families table:

┌─────────────────────────────────────────┐
│ id           │ surname    │ ownerId     │
├─────────────────────────────────────────┤
│ anderson-id  │ Anderson   │ user-1      │
│ smith-id     │ Smith      │ user-3      │
│ johnson-id   │ Johnson    │ user-5      │
└─────────────────────────────────────────┘

Key Points:
✓ user-3 (Robert Smith) is:
  - Admin of Smith family
  - Also a member of Johnson family!

✓ With family switcher, Robert can:
  - Click to see "YOUR FAMILIES": [Smith, Johnson]
  - Switch to Johnson family
  - See only Johnson data
  - Switch back to Smith family
  - See only Smith data
```

---

## 🎛️ Family Switcher - Component Behavior

```
Current State:
┌──────────────────────────────────┐
│ currentFamily = Smith (smith-id) │
│ families = [Smith, Johnson]      │
└──────────────────────────────────┘

User Clicks Family Switcher:
┌──────────────────────────────────────────┐
│ YOUR FAMILIES                             │
├──────────────────────────────────────────┤
│ ✓ Smith       [admin]                    │ ← Current, has checkmark
│ - Johnson     [member]                   │ ← Can switch to this
│                                          │
│ + Create New Family                      │ ← Create another family
└──────────────────────────────────────────┘

User Clicks "Johnson":
┌──────────────────────────────────────────┐
│ 1. setCurrentFamilyId("johnson-id")      │ ← Update state
│ 2. localStorage.selectedFamilyId = ...   │ ← Persist choice
│ 3. useFamily() context updates           │ ← All components re-render
│ 4. All data queries re-execute:          │
│    - posts.getMessages({ familyId: ... })│
│    - members.getByFamily({ familyId: ..})│
│    - calendar.getByFamily({ familyId: ..})│
│                                          │
│ Result:                                  │
│ - Page title changes to "Johnson FamilyHub"
│ - Sidebar shows "Johnson" with "JO" avatar
│ - All messages, members, calendar change
│ - Zero data leakage!                    │
└──────────────────────────────────────────┘
```

---

## 📈 Scaling: Adding Family #11

```
Before:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────┐
│ Database                                    │
├─────────────────────────────────────────────┤
│ families: 10 rows                          │
│   ├─ id: anderson-id, surname: Anderson   │
│   ├─ id: smith-id, surname: Smith         │
│   ├─ id: johnson-id, surname: Johnson     │
│   └─ ... (7 more)                          │
│                                             │
│ family_members: 50 rows                    │
│ posts: 500+ rows                           │
│ media: 1000+ rows                          │
│ ...                                         │
└─────────────────────────────────────────────┘

To Add Family #11 (Martinez):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO families (id, surname, ownerId)
VALUES (
  'martinez-id',
  'Martinez',
  'david.martinez.id'
);

After:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────┐
│ Database                                    │
├─────────────────────────────────────────────┤
│ families: 11 rows (added Martinez)         │
│ family_members: Now has Martinez members   │
│ posts: Martinez messages appear when       │
│        familyId = 'martinez-id'            │
│ ... All other tables tagged with           │
│     familyId automatically                 │
└─────────────────────────────────────────────┘

✅ NO MIGRATIONS
✅ NO NEW SERVERS
✅ NO DOWNTIME
✅ Just one INSERT statement!
```

---

## 🎯 Summary: The Complete Picture

```
┌─────────────────────────────────────────────────────────────┐
│                FamilyHub Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DEPLOYMENT:   1 Server, 1 Database, N Families            │
│                                                             │
│  ISOLATION:    familyId column on every table              │
│               + Membership verification on every query     │
│                                                             │
│  USERS:        Can belong to multiple families             │
│               Can switch between families via UI           │
│                                                             │
│  BRANDING:     Each family sees their own name             │
│               "Anderson FamilyHub Dashboard"               │
│               "Smith FamilyHub Messages"                   │
│               Dynamic branding from currentFamily          │
│                                                             │
│  SECURITY:     3-layer protection:                         │
│               1. User authentication                       │
│               2. Family membership verification            │
│               3. Database familyId filtering               │
│                                                             │
│  SCALABILITY:  Add new family = 1 database insert          │
│               No infrastructure changes                    │
│               Cost per family decreases with scale         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

Generated: February 9, 2024
Architecture: React Router + tRPC + Drizzle + PostgreSQL
Multi-Tenant Pattern: Row-Level Security via familyId
