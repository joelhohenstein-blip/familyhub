# 🔌 FamilyHub API Documentation

**Version**: 1.0.0  
**Base URL**: `https://api.familyhub.app`  
**Status**: Production Ready

---

## Table of Contents

1. [Authentication](#authentication)
2. [Families](#families)
3. [Members](#members)
4. [Messages](#messages)
5. [Events](#events)
6. [Shopping Lists](#shopping-lists)
7. [Gallery](#gallery)
8. [Subscriptions](#subscriptions)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## Authentication

All API requests require authentication using a Bearer token.

### Getting an API Key

1. Go to **Settings** → **API Keys**
2. Click **Generate New Key**
3. Copy your API key (save it securely!)
4. Use it in the `Authorization` header

### Authentication Header

```bash
Authorization: Bearer YOUR_API_KEY
```

### Example Request

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.familyhub.app/v1/families
```

---

## Families

### List Families

Get all families for the authenticated user.

```
GET /v1/families
```

**Response**:
```json
{
  "data": [
    {
      "id": "fam_123",
      "surname": "Smith",
      "description": "The Smith family",
      "created_at": "2024-01-01T00:00:00Z",
      "member_count": 5,
      "role": "admin"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

### Get Family

Get details for a specific family.

```
GET /v1/families/{family_id}
```

**Response**:
```json
{
  "id": "fam_123",
  "surname": "Smith",
  "description": "The Smith family",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T00:00:00Z",
  "member_count": 5,
  "role": "admin",
  "members": [
    {
      "id": "mem_123",
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@example.com",
      "role": "admin",
      "avatar_url": "https://..."
    }
  ]
}
```

### Create Family

Create a new family.

```
POST /v1/families
```

**Request Body**:
```json
{
  "surname": "Smith",
  "description": "The Smith family"
}
```

**Response**:
```json
{
  "id": "fam_123",
  "surname": "Smith",
  "description": "The Smith family",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Update Family

Update family details.

```
PATCH /v1/families/{family_id}
```

**Request Body**:
```json
{
  "surname": "Smith",
  "description": "Updated description"
}
```

**Response**: Updated family object

### Delete Family

Delete a family (admin only).

```
DELETE /v1/families/{family_id}
```

**Response**:
```json
{
  "success": true,
  "message": "Family deleted"
}
```

---

## Members

### List Family Members

Get all members in a family.

```
GET /v1/families/{family_id}/members
```

**Response**:
```json
{
  "data": [
    {
      "id": "mem_123",
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@example.com",
      "role": "admin",
      "avatar_url": "https://...",
      "status": "active",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

### Get Member

Get details for a specific member.

```
GET /v1/families/{family_id}/members/{member_id}
```

**Response**: Member object

### Add Member

Add a new member to a family.

```
POST /v1/families/{family_id}/members
```

**Request Body**:
```json
{
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "member"
}
```

**Response**: Member object

### Update Member

Update member details.

```
PATCH /v1/families/{family_id}/members/{member_id}
```

**Request Body**:
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "admin"
}
```

**Response**: Updated member object

### Remove Member

Remove a member from a family.

```
DELETE /v1/families/{family_id}/members/{member_id}
```

**Response**:
```json
{
  "success": true,
  "message": "Member removed"
}
```

### Invite Member

Send an invitation to join a family.

```
POST /v1/families/{family_id}/invitations
```

**Request Body**:
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**Response**:
```json
{
  "id": "inv_123",
  "email": "newmember@example.com",
  "role": "member",
  "status": "pending",
  "created_at": "2024-01-01T00:00:00Z",
  "expires_at": "2024-01-08T00:00:00Z"
}
```

---

## Messages

### List Messages

Get messages from a family message board.

```
GET /v1/families/{family_id}/messages
```

**Query Parameters**:
- `limit`: Number of messages (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `thread_id`: Filter by thread (optional)

**Response**:
```json
{
  "data": [
    {
      "id": "msg_123",
      "family_id": "fam_123",
      "author_id": "mem_123",
      "author": {
        "first_name": "John",
        "last_name": "Smith",
        "avatar_url": "https://..."
      },
      "content": "Hello family!",
      "media": [
        {
          "id": "med_123",
          "type": "image",
          "url": "https://..."
        }
      ],
      "reactions": {
        "👍": 2,
        "❤️": 1
      },
      "reply_count": 3,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Get Message

Get a specific message.

```
GET /v1/families/{family_id}/messages/{message_id}
```

**Response**: Message object with replies

### Create Message

Create a new message.

```
POST /v1/families/{family_id}/messages
```

**Request Body**:
```json
{
  "content": "Hello family!",
  "media_ids": ["med_123", "med_124"],
  "thread_id": null
}
```

**Response**: Created message object

### Reply to Message

Reply to a message (create a thread).

```
POST /v1/families/{family_id}/messages/{message_id}/replies
```

**Request Body**:
```json
{
  "content": "Great idea!",
  "media_ids": []
}
```

**Response**: Reply message object

### Update Message

Update a message (author only).

```
PATCH /v1/families/{family_id}/messages/{message_id}
```

**Request Body**:
```json
{
  "content": "Updated message"
}
```

**Response**: Updated message object

### Delete Message

Delete a message (author or admin).

```
DELETE /v1/families/{family_id}/messages/{message_id}
```

**Response**:
```json
{
  "success": true,
  "message": "Message deleted"
}
```

### React to Message

Add an emoji reaction to a message.

```
POST /v1/families/{family_id}/messages/{message_id}/reactions
```

**Request Body**:
```json
{
  "emoji": "👍"
}
```

**Response**:
```json
{
  "emoji": "👍",
  "count": 3,
  "reacted_by": ["mem_123", "mem_124", "mem_125"]
}
```

### Pin Message

Pin a message (admin only).

```
POST /v1/families/{family_id}/messages/{message_id}/pin
```

**Response**:
```json
{
  "success": true,
  "pinned": true
}
```

---

## Events

### List Events

Get calendar events for a family.

```
GET /v1/families/{family_id}/events
```

**Query Parameters**:
- `start_date`: Filter by start date (ISO 8601)
- `end_date`: Filter by end date (ISO 8601)
- `limit`: Number of events (default: 20)

**Response**:
```json
{
  "data": [
    {
      "id": "evt_123",
      "title": "Family Dinner",
      "description": "Weekly family dinner",
      "start_at": "2024-01-15T18:00:00Z",
      "end_at": "2024-01-15T20:00:00Z",
      "location": "Home",
      "organizer_id": "mem_123",
      "visibility": "family",
      "rsvp_status": "going",
      "attendees": [
        {
          "member_id": "mem_123",
          "status": "going",
          "rsvp_at": "2024-01-01T00:00:00Z"
        }
      ],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Event

Get details for a specific event.

```
GET /v1/families/{family_id}/events/{event_id}
```

**Response**: Event object

### Create Event

Create a new event.

```
POST /v1/families/{family_id}/events
```

**Request Body**:
```json
{
  "title": "Family Dinner",
  "description": "Weekly family dinner",
  "start_at": "2024-01-15T18:00:00Z",
  "end_at": "2024-01-15T20:00:00Z",
  "location": "Home",
  "visibility": "family"
}
```

**Response**: Created event object

### Update Event

Update an event.

```
PATCH /v1/families/{family_id}/events/{event_id}
```

**Request Body**: Same as create (all fields optional)

**Response**: Updated event object

### Delete Event

Delete an event.

```
DELETE /v1/families/{family_id}/events/{event_id}
```

**Response**:
```json
{
  "success": true,
  "message": "Event deleted"
}
```

### RSVP to Event

RSVP to an event.

```
POST /v1/families/{family_id}/events/{event_id}/rsvp
```

**Request Body**:
```json
{
  "status": "going",
  "comment": "Looking forward to it!"
}
```

**Response**:
```json
{
  "status": "going",
  "rsvp_at": "2024-01-01T00:00:00Z"
}
```

---

## Shopping Lists

### List Shopping Lists

Get shopping lists for a family.

```
GET /v1/families/{family_id}/shopping-lists
```

**Response**:
```json
{
  "data": [
    {
      "id": "list_123",
      "title": "Grocery Shopping",
      "description": "Weekly groceries",
      "due_at": "2024-01-15T00:00:00Z",
      "created_by": "mem_123",
      "item_count": 12,
      "completed_count": 5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Shopping List

Get details for a shopping list.

```
GET /v1/families/{family_id}/shopping-lists/{list_id}
```

**Response**:
```json
{
  "id": "list_123",
  "title": "Grocery Shopping",
  "items": [
    {
      "id": "item_123",
      "name": "Milk",
      "category": "Dairy",
      "completed": false,
      "assigned_to": "mem_123",
      "quantity": 1,
      "unit": "gallon"
    }
  ]
}
```

### Create Shopping List

Create a new shopping list.

```
POST /v1/families/{family_id}/shopping-lists
```

**Request Body**:
```json
{
  "title": "Grocery Shopping",
  "description": "Weekly groceries",
  "due_at": "2024-01-15T00:00:00Z"
}
```

**Response**: Created list object

### Add Item to List

Add an item to a shopping list.

```
POST /v1/families/{family_id}/shopping-lists/{list_id}/items
```

**Request Body**:
```json
{
  "name": "Milk",
  "category": "Dairy",
  "quantity": 1,
  "unit": "gallon"
}
```

**Response**: Created item object

### Update Item

Update a shopping list item.

```
PATCH /v1/families/{family_id}/shopping-lists/{list_id}/items/{item_id}
```

**Request Body**:
```json
{
  "name": "Milk",
  "completed": true,
  "assigned_to": "mem_123"
}
```

**Response**: Updated item object

### Delete Item

Delete an item from a shopping list.

```
DELETE /v1/families/{family_id}/shopping-lists/{list_id}/items/{item_id}
```

**Response**:
```json
{
  "success": true
}
```

---

## Gallery

### List Photos

Get photos from the family gallery.

```
GET /v1/families/{family_id}/gallery
```

**Query Parameters**:
- `album_id`: Filter by album (optional)
- `limit`: Number of photos (default: 20)
- `offset`: Pagination offset

**Response**:
```json
{
  "data": [
    {
      "id": "photo_123",
      "url": "https://...",
      "thumbnail_url": "https://...",
      "caption": "Family photo",
      "tags": ["family", "outdoor"],
      "uploaded_by": "mem_123",
      "uploaded_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Upload Photo

Upload a photo to the gallery.

```
POST /v1/families/{family_id}/gallery
```

**Request Body** (multipart/form-data):
```
file: <image file>
caption: "Family photo"
album_id: "album_123" (optional)
```

**Response**: Created photo object

### Get Photo

Get details for a specific photo.

```
GET /v1/families/{family_id}/gallery/{photo_id}
```

**Response**: Photo object with metadata

### Delete Photo

Delete a photo.

```
DELETE /v1/families/{family_id}/gallery/{photo_id}
```

**Response**:
```json
{
  "success": true
}
```

---

## Subscriptions

### Get Subscription

Get the current subscription for a family.

```
GET /v1/families/{family_id}/subscription
```

**Response**:
```json
{
  "id": "sub_123",
  "plan": "pro",
  "status": "active",
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "cancel_at_period_end": false,
  "price": 9.99,
  "currency": "USD"
}
```

### Update Subscription

Change the subscription plan.

```
PATCH /v1/families/{family_id}/subscription
```

**Request Body**:
```json
{
  "plan": "enterprise"
}
```

**Response**: Updated subscription object

### Cancel Subscription

Cancel the subscription.

```
DELETE /v1/families/{family_id}/subscription
```

**Response**:
```json
{
  "success": true,
  "message": "Subscription cancelled"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

API requests are rate-limited to prevent abuse.

### Rate Limits

- **Free Plan**: 100 requests/hour
- **Pro Plan**: 1,000 requests/hour
- **Enterprise Plan**: Unlimited

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200
```

### Handling Rate Limits

When you hit the rate limit, you'll receive a 429 response:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retry_after": 60
  }
}
```

Wait the number of seconds specified in `retry_after` before retrying.

---

## Webhooks

### Webhook Events

Subscribe to events in your family:

```
POST /v1/webhooks
```

**Request Body**:
```json
{
  "url": "https://your-app.com/webhooks/familyhub",
  "events": [
    "message.created",
    "event.created",
    "member.added"
  ]
}
```

### Webhook Payload

```json
{
  "id": "evt_123",
  "type": "message.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "message_id": "msg_123",
    "family_id": "fam_123",
    "content": "Hello family!"
  }
}
```

### Webhook Events

- `message.created`
- `message.updated`
- `message.deleted`
- `event.created`
- `event.updated`
- `event.deleted`
- `member.added`
- `member.removed`
- `subscription.updated`

---

## SDK & Libraries

### JavaScript/TypeScript

```bash
npm install @familyhub/sdk
```

```typescript
import { FamilyHub } from '@familyhub/sdk';

const client = new FamilyHub({
  apiKey: 'sk_live_...'
});

const families = await client.families.list();
```

### Python

```bash
pip install familyhub
```

```python
from familyhub import FamilyHub

client = FamilyHub(api_key='sk_live_...')
families = client.families.list()
```

---

## Support

**API Status**: https://status.familyhub.app  
**Documentation**: https://docs.familyhub.app  
**Support Email**: api-support@familyhub.app  
**Community**: https://community.familyhub.app

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Next Update**: 2024 (Quarterly)
