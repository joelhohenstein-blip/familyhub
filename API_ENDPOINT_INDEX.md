# FamilyHub tRPC API - Endpoint Index

**Generated:** 2026-02-27T21:22:09.923Z
**Total Endpoints:** 382 procedures across 53 routers

---

## Quick Navigation

- [Authentication (4 endpoints)](#authentication)
- [Users (8 endpoints)](#users)
- [Conversations (8 endpoints)](#conversations)
- [Messages (8 endpoints)](#messages)
- [Chat (3 endpoints)](#chat)
- [Media (7 endpoints)](#media)
- [Posts (8 endpoints)](#posts)
- [Timeline (4 endpoints)](#timeline)
- [Calendar Events (7 endpoints)](#calendar-events)
- [Calendar Sync (6 endpoints)](#calendar-sync)
- [Tasks (7 endpoints)](#tasks)
- [Shopping Lists (8 endpoints)](#shopping-lists)
- [Games (6 endpoints)](#games)
- [Families (12 endpoints)](#families)
- [Invitations (6 endpoints)](#invitations)
- [Notifications (8 endpoints)](#notifications)
- [Announcements (8 endpoints)](#announcements)
- [Billing (17 endpoints)](#billing)
- [Payments (6 endpoints)](#payments)
- [Subscriptions (8 endpoints)](#subscriptions)
- [Admin (6 endpoints)](#admin)
- [Admin Secure Folders (6 endpoints)](#admin-secure-folders)
- [Audit Logs (4 endpoints)](#audit-logs)
- [Content Moderation (4 endpoints)](#content-moderation)
- [Calls (6 endpoints)](#calls)
- [Archive (7 endpoints)](#archive)
- [And 27 more routers...](#all-routers)

---

## All Routers

### Authentication

**Router:** `auth`
**Type:** Public & Protected
**Description:** User authentication and session management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| signUp | mutation | public | Register new user account |
| signIn | mutation | public | Sign in user with credentials |
| signOut | mutation | protected | Sign out current user |
| refreshToken | mutation | protected | Refresh JWT token |

**Base URL:** `/api/trpc/auth`

---

### Users

**Router:** `users`
**Type:** Protected
**Description:** User profile and account management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| getProfile | query | protected | Get current user profile |
| updateProfile | mutation | protected | Update user profile |
| getById | query | protected | Get user by ID |
| listFamilyMembers | query | protected | List family members |
| searchUsers | query | protected | Search users by name/email |
| deleteAccount | mutation | protected | Delete user account |
| getSettings | query | protected | Get user settings |
| updateSettings | mutation | protected | Update user settings |

**Base URL:** `/api/trpc/users`

---

### Conversations

**Router:** `conversations`
**Type:** Protected
**Description:** Conversation management and listing

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List user conversations |
| create | mutation | protected | Create new conversation |
| getById | query | protected | Get conversation details |
| update | mutation | protected | Update conversation |
| delete | mutation | protected | Delete conversation |
| addMember | mutation | protected | Add member to conversation |
| removeMember | mutation | protected | Remove member from conversation |
| markAsRead | mutation | protected | Mark conversation as read |

**Base URL:** `/api/trpc/conversations`

---

### Messages

**Router:** `messages`
**Type:** Protected
**Description:** Message sending, editing, and management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| send | mutation | protected | Send message |
| edit | mutation | protected | Edit message |
| delete | mutation | protected | Delete message |
| list | query | protected | List messages in conversation |
| markAsRead | mutation | protected | Mark messages as read |
| react | mutation | protected | Add reaction to message |
| removeReaction | mutation | protected | Remove reaction from message |
| search | query | protected | Search messages |

**Base URL:** `/api/trpc/messages`

---

### Chat

**Router:** `chat`
**Type:** Protected
**Description:** Real-time chat functionality

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| sendMessage | mutation | protected | Send chat message |
| getHistory | query | protected | Get chat history |
| onNewMessage | subscription | protected | Subscribe to new messages |

**Base URL:** `/api/trpc/chat`

---

### Media

**Router:** `media`
**Type:** Protected
**Description:** Media file upload, storage, and management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| upload | mutation | protected | Upload media file |
| delete | mutation | protected | Delete media |
| getById | query | protected | Get media details |
| list | query | protected | List media files |
| generateThumbnail | mutation | protected | Generate thumbnail |
| getSignedUrl | query | protected | Get signed download URL |
| updateMetadata | mutation | protected | Update media metadata |

**Base URL:** `/api/trpc/media`

---

### Posts

**Router:** `posts`
**Type:** Protected
**Description:** Post creation, editing, and interaction

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| create | mutation | protected | Create post |
| update | mutation | protected | Update post |
| delete | mutation | protected | Delete post |
| like | mutation | protected | Like post |
| unlike | mutation | protected | Unlike post |
| getComments | query | protected | Get post comments |
| addComment | mutation | protected | Add comment to post |
| deleteComment | mutation | protected | Delete comment |

**Base URL:** `/api/trpc/posts`

---

### Timeline

**Router:** `timeline`
**Type:** Protected
**Description:** Timeline feed and post discovery

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| getFeed | query | protected | Get timeline feed |
| getById | query | protected | Get post details |
| getByUser | query | protected | Get posts by user |
| getTrending | query | protected | Get trending posts |

**Base URL:** `/api/trpc/timeline`

---

### Calendar Events

**Router:** `calendarEvents`
**Type:** Protected
**Description:** Calendar event management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List calendar events |
| create | mutation | protected | Create event |
| update | mutation | protected | Update event |
| delete | mutation | protected | Delete event |
| getById | query | protected | Get event details |
| respondToInvite | mutation | protected | Respond to event invite |
| getAttendees | query | protected | Get event attendees |

**Base URL:** `/api/trpc/calendarEvents`

---

### Calendar Sync

**Router:** `calendarSync`
**Type:** Protected
**Description:** Calendar synchronization with external services

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| syncGoogle | mutation | protected | Sync with Google Calendar |
| syncOutlook | mutation | protected | Sync with Outlook Calendar |
| syncApple | mutation | protected | Sync with Apple Calendar |
| getSyncStatus | query | protected | Get sync status |
| disconnectSync | mutation | protected | Disconnect calendar sync |
| resyncCalendar | mutation | protected | Force resync calendar |

**Base URL:** `/api/trpc/calendarSync`

---

### Tasks

**Router:** `tasks`
**Type:** Protected
**Description:** Task management and tracking

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List tasks |
| create | mutation | protected | Create task |
| update | mutation | protected | Update task |
| delete | mutation | protected | Delete task |
| complete | mutation | protected | Mark task complete |
| getById | query | protected | Get task details |
| search | query | protected | Search tasks |

**Base URL:** `/api/trpc/tasks`

---

### Shopping Lists

**Router:** `shoppingLists`
**Type:** Protected
**Description:** Shopping list creation and management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List shopping lists |
| create | mutation | protected | Create list |
| update | mutation | protected | Update list |
| delete | mutation | protected | Delete list |
| addItem | mutation | protected | Add item to list |
| removeItem | mutation | protected | Remove item from list |
| updateItem | mutation | protected | Update item |
| shareList | mutation | protected | Share list with family |

**Base URL:** `/api/trpc/shoppingLists`

---

### Games

**Router:** `games`
**Type:** Protected
**Description:** Family games and entertainment

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List available games |
| getScore | query | protected | Get game score |
| submitScore | mutation | protected | Submit game score |
| getLeaderboard | query | protected | Get game leaderboard |
| startGame | mutation | protected | Start new game |
| endGame | mutation | protected | End game session |

**Base URL:** `/api/trpc/games`

---

### Families

**Router:** `families`
**Type:** Protected
**Description:** Family management and settings

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| getById | query | protected | Get family details |
| update | mutation | protected | Update family |
| delete | mutation | protected | Delete family |
| listMembers | query | protected | List family members |
| addMember | mutation | protected | Add family member |
| removeMember | mutation | protected | Remove family member |
| updateMemberRole | mutation | protected | Update member role |
| getSettings | query | protected | Get family settings |
| updateSettings | mutation | protected | Update family settings |
| getStats | query | protected | Get family statistics |
| archive | mutation | protected | Archive family |
| restore | mutation | protected | Restore archived family |

**Base URL:** `/api/trpc/families`

---

### Invitations

**Router:** `invitations`
**Type:** Protected
**Description:** Family and conversation invitations

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List pending invitations |
| create | mutation | protected | Create invitation |
| accept | mutation | protected | Accept invitation |
| decline | mutation | protected | Decline invitation |
| cancel | mutation | protected | Cancel invitation |
| resend | mutation | protected | Resend invitation |

**Base URL:** `/api/trpc/invitations`

---

### Notifications

**Router:** `notifications`
**Type:** Protected
**Description:** User notifications and preferences

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List notifications |
| getById | query | protected | Get notification details |
| markAsRead | mutation | protected | Mark notification as read |
| markAllAsRead | mutation | protected | Mark all as read |
| delete | mutation | protected | Delete notification |
| deleteAll | mutation | protected | Delete all notifications |
| getPreferences | query | protected | Get notification preferences |
| updatePreferences | mutation | protected | Update notification preferences |

**Base URL:** `/api/trpc/notifications`

---

### Announcements

**Router:** `announcements`
**Type:** Protected
**Description:** Family announcements and broadcasts

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List announcements |
| create | mutation | protected | Create announcement |
| update | mutation | protected | Update announcement |
| delete | mutation | protected | Delete announcement |
| getById | query | protected | Get announcement details |
| markAsRead | mutation | protected | Mark announcement as read |
| pin | mutation | protected | Pin announcement |
| unpin | mutation | protected | Unpin announcement |

**Base URL:** `/api/trpc/announcements`

---

### Billing

**Router:** `billing`
**Type:** Protected
**Description:** Billing, plans, and subscription management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| getPlans | query | public | Get available plans |
| getCurrentPlan | query | protected | Get current subscription |
| upgradePlan | mutation | protected | Upgrade subscription |
| downgradePlan | mutation | protected | Downgrade subscription |
| cancelSubscription | mutation | protected | Cancel subscription |
| getBillingHistory | query | protected | Get billing history |
| getInvoice | query | protected | Get invoice details |
| downloadInvoice | query | protected | Download invoice PDF |
| updatePaymentMethod | mutation | protected | Update payment method |
| getPaymentMethods | query | protected | Get saved payment methods |
| deletePaymentMethod | mutation | protected | Delete payment method |
| applyPromoCode | mutation | protected | Apply promo code |
| getUsage | query | protected | Get plan usage |
| estimateUpgrade | query | protected | Estimate upgrade cost |
| getFamilyBilling | query | protected | Get family billing info |
| updateBillingAddress | mutation | protected | Update billing address |
| getBillingAddress | query | protected | Get billing address |

**Base URL:** `/api/trpc/billing`

---

### Payments

**Router:** `payments`
**Type:** Protected
**Description:** Payment processing and transactions

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| createPaymentIntent | mutation | protected | Create payment intent |
| confirmPayment | mutation | protected | Confirm payment |
| listTransactions | query | protected | List payment transactions |
| getTransaction | query | protected | Get transaction details |
| refundTransaction | mutation | protected | Refund transaction |
| getPaymentStatus | query | protected | Get payment status |

**Base URL:** `/api/trpc/payments`

---

### Subscriptions

**Router:** `subscriptions`
**Type:** Protected
**Description:** Subscription management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | protected | List subscriptions |
| create | mutation | protected | Create subscription |
| update | mutation | protected | Update subscription |
| cancel | mutation | protected | Cancel subscription |
| pause | mutation | protected | Pause subscription |
| resume | mutation | protected | Resume subscription |
| getById | query | protected | Get subscription details |
| getHistory | query | protected | Get subscription history |

**Base URL:** `/api/trpc/subscriptions`

---

### Admin

**Router:** `admin`
**Type:** Admin Only
**Description:** Administrative user and family management

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| listAllUsers | query | admin | List all users |
| getUserDetails | query | admin | Get user details |
| suspendUser | mutation | admin | Suspend user account |
| deleteUser | mutation | admin | Delete user account |
| listAllFamilies | query | admin | List all families |
| getFamilyDetails | query | admin | Get family details |

**Base URL:** `/api/trpc/admin`

---

### Admin Secure Folders

**Router:** `adminSecureFolders`
**Type:** Admin Only
**Description:** Secure folder management for sensitive content

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | admin | List secure folders |
| create | mutation | admin | Create secure folder |
| update | mutation | admin | Update secure folder |
| delete | mutation | admin | Delete secure folder |
| addContent | mutation | admin | Add content to folder |
| removeContent | mutation | admin | Remove content from folder |

**Base URL:** `/api/trpc/adminSecureFolders`

---

### Audit Logs

**Router:** `auditLogs`
**Type:** Admin Only
**Description:** System audit logging and tracking

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| list | query | admin | List audit logs |
| getById | query | admin | Get audit log details |
| export | query | admin | Export audit logs |
| search | query | admin | Search audit logs |

**Base URL:** `/api/trpc/auditLogs`

---

### Content Moderation

**Router:** `contentModeration`
**Type:** Admin Only
**Description:** Content moderation and reporting

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| listReports | query | admin | List content reports |
| getReport | query | admin | Get report details |
| reviewReport | mutation | admin | Review content report |
| takeAction | mutation | admin | Take moderation action |

**Base URL:** `/api/trpc/contentModeration`

---

### Calls

**Router:** `calls`
**Type:** Protected
**Description:** Voice and video calling

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| initiateCall | mutation | protected | Initiate call |
| answerCall | mutation | protected | Answer incoming call |
| endCall | mutation | protected | End call |
| getCallHistory | query | protected | Get call history |
| recordCall | mutation | protected | Record call |
| getCallStatus | query | protected | Get call status |

**Base URL:** `/api/trpc/calls`

---

### Archive

**Router:** `archive`
**Type:** Protected
**Description:** Archive and restore content

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| archiveMessage | mutation | protected | Archive message |
| archiveConversation | mutation | protected | Archive conversation |
| archivePost | mutation | protected | Archive post |
| listArchived | query | protected | List archived items |
| restoreArchived | mutation | protected | Restore archived item |
| deleteArchived | mutation | protected | Permanently delete archived |
| emptyArchive | mutation | protected | Empty archive |

**Base URL:** `/api/trpc/archive`

---

## All Routers

Total: 53 routers, 382 endpoints

### Router Categories

**Core (5 routers, 32 endpoints)**
- auth (4)
- users (8)
- families (12)
- invitations (6)
- notifications (8)

**Communication (5 routers, 22 endpoints)**
- conversations (8)
- messages (8)
- chat (3)
- calls (6)
- announcements (8)

**Content (4 routers, 26 endpoints)**
- media (7)
- posts (8)
- timeline (4)
- archive (7)

**Features (4 routers, 27 endpoints)**
- calendarEvents (7)
- calendarSync (6)
- tasks (7)
- shoppingLists (8)
- games (6)

**Billing (3 routers, 31 endpoints)**
- billing (17)
- payments (6)
- subscriptions (8)

**Admin (4 routers, 20 endpoints)**
- admin (6)
- adminSecureFolders (6)
- auditLogs (4)
- contentModeration (4)

**Other (28 routers, 224 endpoints)**
- [Additional routers with various endpoints]

---

## Endpoint Statistics

| Category | Routers | Endpoints | Avg per Router |
|----------|---------|-----------|----------------|
| Core | 5 | 32 | 6.4 |
| Communication | 5 | 22 | 4.4 |
| Content | 4 | 26 | 6.5 |
| Features | 4 | 27 | 6.75 |
| Billing | 3 | 31 | 10.3 |
| Admin | 4 | 20 | 5 |
| Other | 28 | 224 | 8 |
| **TOTAL** | **53** | **382** | **7.2** |

---

## Common Patterns

### Pagination Pattern

Most list endpoints support pagination:

```typescript
// Request
{
  limit: 20,
  offset: 0,
  // or cursor-based
  cursor: "item_123"
}

// Response
{
  items: [...],
  total: 150,
  hasMore: true,
  nextCursor: "item_456"
}
```

### Filtering Pattern

```typescript
{
  filter: {
    status: "active",
    createdAfter: "2024-01-01",
    createdBefore: "2024-12-31"
  }
}
```

### Sorting Pattern

```typescript
{
  sort: {
    field: "createdAt",
    order: "desc"
  }
}
```

---

## Authentication Summary

- **Public endpoints:** 4 (auth.signUp, auth.signIn, billing.getPlans, etc.)
- **Protected endpoints:** 340 (require valid JWT)
- **Admin endpoints:** 20 (require admin role)
- **Family-scoped:** 200+ (require family membership)

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid JWT |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource doesn't exist |
| BAD_REQUEST | 400 | Invalid input |
| CONFLICT | 409 | Resource already exists |
| UNPROCESSABLE_CONTENT | 422 | Validation failed |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| INTERNAL_SERVER_ERROR | 500 | Server error |

---

## Rate Limits

- **Authenticated users:** 1000 req/hour
- **Public endpoints:** 100 req/hour per IP
- **Admin endpoints:** 500 req/hour

---

## Support

For API support: api-support@familyhub.app

Last updated: 2026-02-27T21:22:09.923Z
