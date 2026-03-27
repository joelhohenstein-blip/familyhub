# FamilyHub tRPC API - Quick Reference Guide

**Last Updated:** 2026-02-27T21:22:51.888Z

---

## 🚀 Quick Start (30 seconds)

### 1. Import the client
```typescript
import { trpc } from '@/lib/trpc/client';
```

### 2. Make a query
```typescript
const user = await trpc.users.getProfile.query();
```

### 3. Make a mutation
```typescript
const updated = await trpc.users.updateProfile.mutate({
  firstName: "John"
});
```

### 4. Subscribe to updates
```typescript
const unsubscribe = trpc.messages.onNewMessage.subscribe(
  { conversationId: "conv_123" },
  {
    onData: (msg) => console.log("New:", msg),
    onError: (err) => console.error("Error:", err)
  }
);
```

---

## 📚 Most Common Endpoints

### Authentication
```typescript
// Sign up
await trpc.auth.signUp.mutate({
  email: "user@example.com",
  password: "SecurePass123",
  firstName: "John",
  lastName: "Doe"
});

// Sign in
await trpc.auth.signIn.mutate({
  email: "user@example.com",
  password: "SecurePass123"
});

// Sign out
await trpc.auth.signOut.mutate();
```

### User Profile
```typescript
// Get profile
const profile = await trpc.users.getProfile.query();

// Update profile
await trpc.users.updateProfile.mutate({
  firstName: "Jane",
  bio: "Updated bio"
});
```

### Messages
```typescript
// Send message
await trpc.messages.send.mutate({
  conversationId: "conv_123",
  content: "Hello!",
  type: "text"
});

// List messages
const messages = await trpc.messages.list.query({
  conversationId: "conv_123",
  limit: 20,
  offset: 0
});

// Mark as read
await trpc.messages.markAsRead.mutate({
  messageIds: ["msg_1", "msg_2"]
});
```

### Conversations
```typescript
// List conversations
const convs = await trpc.conversations.list.query();

// Create conversation
await trpc.conversations.create.mutate({
  name: "Family Chat",
  members: ["user_1", "user_2"]
});

// Get conversation
const conv = await trpc.conversations.getById.query({
  id: "conv_123"
});
```

### Calendar Events
```typescript
// Create event
await trpc.calendarEvents.create.mutate({
  title: "Family Dinner",
  startTime: new Date("2024-01-27T18:00:00"),
  endTime: new Date("2024-01-27T20:00:00"),
  location: "Home"
});

// List events
const events = await trpc.calendarEvents.list.query();

// Update event
await trpc.calendarEvents.update.mutate({
  id: "evt_123",
  title: "Updated Title"
});
```

### Tasks
```typescript
// Create task
await trpc.tasks.create.mutate({
  title: "Buy groceries",
  dueDate: new Date("2024-01-27"),
  priority: "high"
});

// List tasks
const tasks = await trpc.tasks.list.query();

// Mark complete
await trpc.tasks.complete.mutate({
  id: "task_123"
});
```

### Shopping Lists
```typescript
// Create list
await trpc.shoppingLists.create.mutate({
  name: "Weekly Shopping"
});

// Add item
await trpc.shoppingLists.addItem.mutate({
  listId: "list_123",
  name: "Milk",
  quantity: 2,
  unit: "liters"
});

// List items
const items = await trpc.shoppingLists.list.query();
```

---

## 🔐 Authentication

### How It Works
1. Clerk handles authentication automatically
2. JWT token is attached to all requests
3. Protected endpoints check token validity
4. Admin endpoints check user role

### Protected Endpoint Example
```typescript
try {
  const data = await trpc.users.getProfile.query();
} catch (error) {
  if (error.code === "UNAUTHORIZED") {
    // User not logged in
    redirectToLogin();
  }
}
```

### Admin Endpoint Example
```typescript
try {
  const users = await trpc.admin.listAllUsers.query();
} catch (error) {
  if (error.code === "FORBIDDEN") {
    // User is not admin
    showAccessDenied();
  }
}
```

---

## 📋 Pagination

### Offset-Based
```typescript
const result = await trpc.messages.list.query({
  conversationId: "conv_123",
  limit: 20,
  offset: 0
});

// Response
{
  items: [...],
  total: 150,
  hasMore: true
}
```

### Cursor-Based
```typescript
const result = await trpc.messages.list.query({
  conversationId: "conv_123",
  limit: 20,
  cursor: "msg_123"
});

// Response
{
  items: [...],
  hasMore: true,
  nextCursor: "msg_456"
}
```

---

## 🔍 Filtering & Sorting

### Filtering
```typescript
const messages = await trpc.messages.list.query({
  conversationId: "conv_123",
  filter: {
    type: "text",
    from: "2024-01-01",
    to: "2024-12-31"
  }
});
```

### Sorting
```typescript
const messages = await trpc.messages.list.query({
  conversationId: "conv_123",
  sort: {
    field: "createdAt",
    order: "desc"
  }
});
```

---

## ⚠️ Error Handling

### Error Structure
```typescript
{
  code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | ...,
  message: "Human-readable message",
  data?: {
    code: "SPECIFIC_CODE",
    httpStatus: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500
  }
}
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| UNAUTHORIZED | Not logged in | Redirect to login |
| FORBIDDEN | No permission | Show access denied |
| NOT_FOUND | Resource missing | Show 404 page |
| BAD_REQUEST | Invalid input | Show validation error |
| CONFLICT | Already exists | Show duplicate error |
| UNPROCESSABLE_CONTENT | Validation failed | Show field errors |
| TOO_MANY_REQUESTS | Rate limited | Show retry message |
| INTERNAL_SERVER_ERROR | Server error | Show error message |

### Error Handling Pattern
```typescript
try {
  const result = await trpc.users.getById.query({ id: "user_123" });
} catch (error) {
  switch (error.code) {
    case "UNAUTHORIZED":
      redirectToLogin();
      break;
    case "NOT_FOUND":
      showNotFound();
      break;
    case "FORBIDDEN":
      showAccessDenied();
      break;
    default:
      showError(error.message);
  }
}
```

---

## 🚦 Rate Limiting

### Limits
- **Authenticated users:** 1000 requests/hour
- **Public endpoints:** 100 requests/hour per IP
- **Admin endpoints:** 500 requests/hour

### Rate Limit Response
```json
{
  "code": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded",
  "data": {
    "retryAfter": 60
  }
}
```

### Handling Rate Limits
```typescript
try {
  await trpc.messages.send.mutate({ ... });
} catch (error) {
  if (error.code === "TOO_MANY_REQUESTS") {
    const retryAfter = error.data?.retryAfter || 60;
    console.log(`Try again in ${retryAfter} seconds`);
  }
}
```

---

## 🔄 Real-Time Subscriptions

### Message Subscription
```typescript
const unsubscribe = trpc.messages.onNewMessage.subscribe(
  { conversationId: "conv_123" },
  {
    onData: (message) => {
      console.log("New message:", message);
      // Update UI
    },
    onError: (error) => {
      console.error("Subscription error:", error);
    },
    onComplete: () => {
      console.log("Subscription ended");
    }
  }
);

// Unsubscribe when done
unsubscribe();
```

### Chat Subscription
```typescript
const unsubscribe = trpc.chat.onNewMessage.subscribe(
  { conversationId: "conv_123" },
  {
    onData: (message) => updateChatUI(message),
    onError: (error) => handleError(error)
  }
);
```

---

## 📤 File Upload

### Upload Media
```typescript
const formData = new FormData();
formData.append('file', file);

const media = await trpc.media.upload.mutate({
  file: file,
  type: "image",
  description: "Family photo"
});

// Response
{
  id: "media_123",
  url: "https://cdn.example.com/media_123.jpg",
  type: "image",
  size: 1024000,
  createdAt: "2024-01-20T16:00:00Z"
}
```

---

## 🎯 Batch Operations

### Mark Multiple as Read
```typescript
await trpc.messages.markAsRead.mutate({
  messageIds: ["msg_1", "msg_2", "msg_3"]
});
```

### Delete Multiple
```typescript
await trpc.messages.delete.mutate({
  messageIds: ["msg_1", "msg_2"]
});
```

---

## 📊 Endpoint Categories

### Core (32 endpoints)
- **auth** (4): signUp, signIn, signOut, refreshToken
- **users** (8): getProfile, updateProfile, getById, listFamilyMembers, searchUsers, deleteAccount, getSettings, updateSettings
- **families** (12): getById, update, delete, listMembers, addMember, removeMember, updateMemberRole, getSettings, updateSettings, getStats, archive, restore
- **invitations** (6): list, create, accept, decline, cancel, resend
- **notifications** (8): list, getById, markAsRead, markAllAsRead, delete, deleteAll, getPreferences, updatePreferences

### Communication (22 endpoints)
- **conversations** (8): list, create, getById, update, delete, addMember, removeMember, markAsRead
- **messages** (8): send, edit, delete, list, markAsRead, react, removeReaction, search
- **chat** (3): sendMessage, getHistory, onNewMessage
- **calls** (6): initiateCall, answerCall, endCall, getCallHistory, recordCall, getCallStatus
- **announcements** (8): list, create, update, delete, getById, markAsRead, pin, unpin

### Content (26 endpoints)
- **media** (7): upload, delete, getById, list, generateThumbnail, getSignedUrl, updateMetadata
- **posts** (8): create, update, delete, like, unlike, getComments, addComment, deleteComment
- **timeline** (4): getFeed, getById, getByUser, getTrending
- **archive** (7): archiveMessage, archiveConversation, archivePost, listArchived, restoreArchived, deleteArchived, emptyArchive

### Features (27 endpoints)
- **calendarEvents** (7): list, create, update, delete, getById, respondToInvite, getAttendees
- **calendarSync** (6): syncGoogle, syncOutlook, syncApple, getSyncStatus, disconnectSync, resyncCalendar
- **tasks** (7): list, create, update, delete, complete, getById, search
- **shoppingLists** (8): list, create, update, delete, addItem, removeItem, updateItem, shareList
- **games** (6): list, getScore, submitScore, getLeaderboard, startGame, endGame

### Billing (31 endpoints)
- **billing** (17): getPlans, getCurrentPlan, upgradePlan, downgradePlan, cancelSubscription, getBillingHistory, getInvoice, downloadInvoice, updatePaymentMethod, getPaymentMethods, deletePaymentMethod, applyPromoCode, getUsage, estimateUpgrade, getFamilyBilling, updateBillingAddress, getBillingAddress
- **payments** (6): createPaymentIntent, confirmPayment, listTransactions, getTransaction, refundTransaction, getPaymentStatus
- **subscriptions** (8): list, create, update, cancel, pause, resume, getById, getHistory

### Admin (20 endpoints)
- **admin** (6): listAllUsers, getUserDetails, suspendUser, deleteUser, listAllFamilies, getFamilyDetails
- **adminSecureFolders** (6): list, create, update, delete, addContent, removeContent
- **auditLogs** (4): list, getById, export, search
- **contentModeration** (4): listReports, getReport, reviewReport, takeAction

---

## 🔗 API Base URLs

- **Development:** `http://localhost:3000/api/trpc`
- **Production:** `https://familyhub.app/api/trpc`

---

## 📖 Documentation Files

1. **API_DOCUMENTATION.md** - Full API reference with detailed examples
2. **API_ENDPOINT_INDEX.md** - Complete endpoint index organized by router
3. **API_QUICK_REFERENCE.md** - This file, quick lookup guide

---

## 🆘 Common Issues

### "UNAUTHORIZED" Error
**Problem:** Getting 401 when calling protected endpoint
**Solution:** 
- Check user is logged in
- Verify JWT token is valid
- Check Clerk is properly configured

### "FORBIDDEN" Error
**Problem:** Getting 403 when calling admin endpoint
**Solution:**
- Verify user has admin role
- Check family membership for family-scoped endpoints
- Verify resource ownership

### "NOT_FOUND" Error
**Problem:** Getting 404 for valid endpoint
**Solution:**
- Check resource ID is correct
- Verify resource exists in database
- Check user has access to resource

### Rate Limit Error
**Problem:** Getting 429 "Too many requests"
**Solution:**
- Wait for `retryAfter` seconds
- Implement exponential backoff
- Batch requests where possible

### Subscription Not Receiving Updates
**Problem:** Real-time subscription not getting new data
**Solution:**
- Check WebSocket connection is open
- Verify subscription parameters are correct
- Check browser console for errors
- Ensure server is sending updates

---

## 💡 Best Practices

### 1. Always Handle Errors
```typescript
try {
  const result = await trpc.endpoint.query();
} catch (error) {
  // Handle error appropriately
}
```

### 2. Use Pagination for Large Lists
```typescript
// Don't fetch all messages at once
const messages = await trpc.messages.list.query({
  conversationId: "conv_123",
  limit: 20,
  offset: 0
});
```

### 3. Unsubscribe from Subscriptions
```typescript
const unsubscribe = trpc.messages.onNewMessage.subscribe(...);
// Later...
unsubscribe();
```

### 4. Validate Input Before Sending
```typescript
// Validate before mutation
if (!email || !password) {
  showError("Email and password required");
  return;
}

await trpc.auth.signIn.mutate({ email, password });
```

### 5. Use Optimistic Updates
```typescript
// Update UI immediately
setMessages([...messages, newMessage]);

// Then confirm with server
try {
  await trpc.messages.send.mutate(newMessage);
} catch (error) {
  // Revert on error
  setMessages(messages);
}
```

---

## 📞 Support

For API support: api-support@familyhub.app

Last updated: 2026-02-27T21:22:51.888Z
