# Database Schema Documentation

**Last Updated:** 2024
**Database:** PostgreSQL 14+
**ORM:** Drizzle ORM
**Total Tables:** 61

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Domain](#authentication-domain)
3. [Family Domain](#family-domain)
4. [Messaging Domain](#messaging-domain)
5. [Calendar Domain](#calendar-domain)
6. [Media Domain](#media-domain)
7. [Billing Domain](#billing-domain)
8. [System Domain](#system-domain)
9. [Indexes & Performance](#indexes--performance)
10. [Relationships & Constraints](#relationships--constraints)
11. [Migration Guide](#migration-guide)
12. [Backup & Recovery](#backup--recovery)

---

## Overview

### Database Architecture

```
PostgreSQL Database (family_app)
├── Authentication Domain (4 tables)
├── Family Domain (4 tables)
├── Messaging Domain (7 tables)
├── Calendar Domain (5 tables)
├── Media Domain (3 tables)
├── Billing Domain (3 tables)
├── System Domain (31 tables)
└── Utility Tables (4 tables)
```

### Key Statistics

| Metric | Value |
|--------|-------|
| Total Tables | 61 |
| Total Columns | ~400+ |
| Primary Keys | 61 |
| Foreign Keys | ~80+ |
| Indexes | ~120+ |
| Constraints | ~200+ |

### Naming Conventions

- **Tables:** snake_case, plural (e.g., `users`, `family_members`)
- **Columns:** snake_case (e.g., `created_at`, `user_id`)
- **Indexes:** `{table}_{column(s)}_idx` (e.g., `users_email_idx`)
- **Foreign Keys:** `{table}_{column}_fk` (e.g., `sessions_user_id_fk`)
- **Constraints:** `{table}_{constraint_type}` (e.g., `users_email_unique`)

---

## Authentication Domain

### users

Core user account table.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,                    -- Nullable for OAuth-only users
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  image_url TEXT,
  subscription_id VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_role_idx ON users(role);
CREATE INDEX users_subscription_id_idx ON users(subscription_id);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY | Unique user identifier |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | User email address |
| `password_hash` | TEXT | NULLABLE | Bcrypt hash (null for OAuth users) |
| `first_name` | VARCHAR(100) | NULLABLE | User's first name |
| `last_name` | VARCHAR(100) | NULLABLE | User's last name |
| `image_url` | TEXT | NULLABLE | Profile picture URL |
| `subscription_id` | VARCHAR(255) | NULLABLE | Stripe subscription ID |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'user' | 'user' or 'admin' |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `users_email_idx` - Fast email lookups for login
- `users_role_idx` - Admin filtering
- `users_subscription_id_idx` - Subscription lookups

**Constraints:**
- `users_email_unique` - Prevent duplicate emails
- `users_role_check` - Validate role values

---

### sessions

Active user sessions.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_token_idx ON sessions(token);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY | Session identifier |
| `user_id` | UUID | NOT NULL, FK | Reference to user |
| `token` | VARCHAR(255) | NOT NULL, UNIQUE | Session token (64 hex chars) |
| `expires_at` | TIMESTAMP | NOT NULL | Session expiration time |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Session creation time |

**Indexes:**
- `sessions_token_idx` - Fast token validation
- `sessions_user_id_idx` - Find sessions by user
- `sessions_expires_at_idx` - Cleanup expired sessions

**Constraints:**
- `sessions_user_id_fk` - Cascade delete on user deletion

**Lifecycle:**
- Created on login/signup
- Expires after 7 days
- Deleted on logout
- Deleted on password change
- Deleted on account deletion

---

### oauth_accounts

OAuth provider links.

```sql
CREATE TABLE oauth_accounts (
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, provider_user_id)
);

CREATE INDEX oauth_accounts_user_id_idx ON oauth_accounts(user_id);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `provider` | VARCHAR(50) | PRIMARY KEY | OAuth provider (google, github, etc.) |
| `provider_user_id` | VARCHAR(255) | PRIMARY KEY | User ID from provider |
| `user_id` | UUID | NOT NULL, FK | Reference to user |
| `email` | VARCHAR(255) | NULLABLE | Email from provider |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Link creation time |

**Supported Providers:**
- `google`
- `github`
- `facebook`
- `apple`

---

### password_reset_tokens

Password reset tokens.

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX password_reset_tokens_token_idx ON password_reset_tokens(token);
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);
```

**Lifecycle:**
- Created on password reset request
- Expires after 1 hour
- Marked as used on reset completion
- Cleaned up after 24 hours

---

## Family Domain

### families

Family groups.

```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surname VARCHAR(255) NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  description TEXT,
  settings JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX families_owner_id_idx ON families(owner_id);
CREATE INDEX families_surname_idx ON families(surname);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY | Family identifier |
| `surname` | VARCHAR(255) | NOT NULL, UNIQUE | Family name |
| `owner_id` | UUID | NOT NULL, FK | Family owner (user) |
| `avatar_url` | TEXT | NULLABLE | Family avatar/logo |
| `description` | TEXT | NULLABLE | Family description |
| `settings` | JSONB | NULLABLE | Family settings (JSON) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Settings JSON Schema:**
```json
{
  "notificationsEnabled": boolean,
  "digestFrequency": "daily" | "weekly" | "monthly",
  "privacyLevel": "public" | "private",
  "allowPhotoUploads": boolean,
  "allowEventCreation": boolean,
  "maxMembers": number
}
```

---

### family_members

Family membership records.

```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',  -- 'member' | 'admin'
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

CREATE INDEX family_members_family_id_idx ON family_members(family_id);
CREATE INDEX family_members_user_id_idx ON family_members(user_id);
CREATE INDEX family_members_role_idx ON family_members(role);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY | Membership identifier |
| `family_id` | UUID | NOT NULL, FK | Reference to family |
| `user_id` | UUID | NOT NULL, FK | Reference to user |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'member' | 'member' or 'admin' |
| `joined_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Join date |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation time |

**Constraints:**
- `family_members_unique` - One membership per user per family

---

### family_invitations

Pending family invitations.

```sql
CREATE TABLE family_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected'
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, email)
);

CREATE INDEX family_invitations_family_id_idx ON family_invitations(family_id);
CREATE INDEX family_invitations_email_idx ON family_invitations(email);
CREATE INDEX family_invitations_status_idx ON family_invitations(status);
CREATE INDEX family_invitations_expires_at_idx ON family_invitations(expires_at);
```

**Lifecycle:**
- Created when admin invites user
- Expires after 7 days
- Marked as accepted when user joins
- Cleaned up after expiration

---

### family_digests

Weekly/monthly family summaries.

```sql
CREATE TABLE family_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX family_digests_family_id_idx ON family_digests(family_id);
CREATE INDEX family_digests_period_idx ON family_digests(period_start, period_end);
```

**Content JSON Schema:**
```json
{
  "messageCount": number,
  "photoCount": number,
  "eventCount": number,
  "newMembers": string[],
  "highlights": string[],
  "topContributors": {
    "userId": string,
    "count": number
  }[]
}
```

---

## Messaging Domain

### conversations

1-to-1 conversations between family members.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  participant1_id UUID NOT NULL REFERENCES users(id),
  participant2_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',  -- 'active' | 'archived'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id))
);

CREATE INDEX conversations_family_id_idx ON conversations(family_id);
CREATE INDEX conversations_participant1_idx ON conversations(participant1_id);
CREATE INDEX conversations_participant2_idx ON conversations(participant2_id);
CREATE INDEX conversations_status_idx ON conversations(status);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY | Conversation identifier |
| `family_id` | UUID | NOT NULL, FK | Reference to family |
| `participant1_id` | UUID | NOT NULL, FK | First participant |
| `participant2_id` | UUID | NOT NULL, FK | Second participant |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'active' | 'active' or 'archived' |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last activity time |

**Constraints:**
- Unique constraint prevents duplicate conversations
- Uses LEAST/GREATEST to ensure consistent ordering

---

### conversation_messages

Messages in conversations.

```sql
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX conversation_messages_conversation_id_idx ON conversation_messages(conversation_id);
CREATE INDEX conversation_messages_sender_id_idx ON conversation_messages(sender_id);
CREATE INDEX conversation_messages_created_at_idx ON conversation_messages(created_at);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY | Message identifier |
| `conversation_id` | UUID | NOT NULL, FK | Reference to conversation |
| `sender_id` | UUID | NOT NULL, FK | Message sender |
| `content` | TEXT | NOT NULL | Message text |
| `media_url` | TEXT | NULLABLE | Attached media URL |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Send time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Edit time |

---

### message_reactions

Emoji reactions on messages.

```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX message_reactions_message_id_idx ON message_reactions(message_id);
CREATE INDEX message_reactions_user_id_idx ON message_reactions(user_id);
```

---

### pinned_messages

Pinned message references.

```sql
CREATE TABLE pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES users(id),
  pinned_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX pinned_messages_conversation_id_idx ON pinned_messages(conversation_id);
CREATE INDEX pinned_messages_message_id_idx ON pinned_messages(message_id);
```

---

### typing_indicators

Real-time typing status.

```sql
CREATE TABLE typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX typing_indicators_conversation_id_idx ON typing_indicators(conversation_id);
CREATE INDEX typing_indicators_expires_at_idx ON typing_indicators(expires_at);
```

**Lifecycle:**
- Created when user starts typing
- Expires after 5 seconds
- Cleaned up automatically

---

### message_moderation_logs

Content moderation records.

```sql
CREATE TABLE message_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  moderator_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX message_moderation_logs_message_id_idx ON message_moderation_logs(message_id);
CREATE INDEX message_moderation_logs_status_idx ON message_moderation_logs(status);
```

---

## Calendar Domain

### calendar_events

Family calendar events.

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(255),
  visibility VARCHAR(50) NOT NULL DEFAULT 'public',  -- 'public' | 'private'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX calendar_events_family_id_idx ON calendar_events(family_id);
CREATE INDEX calendar_events_created_by_idx ON calendar_events(created_by);
CREATE INDEX calendar_events_start_time_idx ON calendar_events(start_time);
CREATE INDEX calendar_events_end_time_idx ON calendar_events(end_time);
```

---

### event_rsvps

Event attendance tracking.

```sql
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,  -- 'yes' | 'no' | 'maybe'
  responded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX event_rsvps_event_id_idx ON event_rsvps(event_id);
CREATE INDEX event_rsvps_user_id_idx ON event_rsvps(user_id);
CREATE INDEX event_rsvps_status_idx ON event_rsvps(status);
```

---

### calendar_integrations

Calendar provider integrations.

```sql
CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,  -- 'google' | 'ical'
  provider_calendar_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, family_id, provider)
);

CREATE INDEX calendar_integrations_user_id_idx ON calendar_integrations(user_id);
CREATE INDEX calendar_integrations_family_id_idx ON calendar_integrations(family_id);
```

---

### calendar_sync_logs

Calendar synchronization history.

```sql
CREATE TABLE calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,  -- 'success' | 'failed' | 'partial'
  events_synced INTEGER,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX calendar_sync_logs_integration_id_idx ON calendar_sync_logs(integration_id);
CREATE INDEX calendar_sync_logs_created_at_idx ON calendar_sync_logs(created_at);
```

---

## Media Domain

### media

Photos and videos.

```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,  -- 'photo' | 'video'
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX media_family_id_idx ON media(family_id);
CREATE INDEX media_uploaded_by_idx ON media(uploaded_by);
CREATE INDEX media_type_idx ON media(type);
CREATE INDEX media_created_at_idx ON media(created_at);
```

**Metadata JSON Schema:**
```json
{
  "width": number,
  "height": number,
  "duration": number,
  "size": number,
  "mimeType": string,
  "exif": {
    "camera": string,
    "date": string,
    "location": {
      "latitude": number,
      "longitude": number
    }
  }
}
```

---

### photo_tags

User tags in photos.

```sql
CREATE TABLE photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX photo_tags_media_id_idx ON photo_tags(media_id);
CREATE INDEX photo_tags_user_id_idx ON photo_tags(user_id);
```

---

### media_moderation

Content moderation for media.

```sql
CREATE TABLE media_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  moderator_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX media_moderation_media_id_idx ON media_moderation(media_id);
CREATE INDEX media_moderation_status_idx ON media_moderation(status);
```

---

## Billing Domain

### subscriptions

User subscriptions.

```sql
CREATE TABLE subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'enterprise'
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX subscriptions_stripe_customer_id_idx ON subscriptions(stripe_customer_id);
CREATE INDEX subscriptions_tier_idx ON subscriptions(tier);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);
```

**Tier Definitions:**
- `free` - No cost, limited features
- `pro` - $9.99/month, full features
- `enterprise` - Custom pricing, dedicated support

---

### subscription_tiers

Tier feature definitions.

```sql
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  features JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Features JSON Schema:**
```json
{
  "maxFamilies": number,
  "maxMembers": number,
  "maxStorage": number,
  "maxPhotoSize": number,
  "advancedSearch": boolean,
  "calendarSync": boolean,
  "videoCall": boolean,
  "prioritySupport": boolean
}
```

---

### invoices

Billing invoices.

```sql
CREATE TABLE invoices (
  id VARCHAR(255) PRIMARY KEY,
  subscription_id VARCHAR(255) NOT NULL REFERENCES subscriptions(id),
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,  -- 'draft' | 'sent' | 'paid' | 'void'
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  pdf_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX invoices_subscription_id_idx ON invoices(subscription_id);
CREATE INDEX invoices_status_idx ON invoices(status);
CREATE INDEX invoices_created_at_idx ON invoices(created_at);
```

---

## System Domain

### notifications

User notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_read_idx ON notifications(read);
CREATE INDEX notifications_created_at_idx ON notifications(created_at);
```

**Notification Types:**
- `message_received` - New message
- `event_created` - New calendar event
- `member_joined` - New family member
- `photo_uploaded` - New photo
- `comment_reply` - Reply to comment

---

### notification_settings

User notification preferences.

```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  digest_frequency VARCHAR(50) NOT NULL DEFAULT 'weekly',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### audit_log

Activity audit trail.

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_user_id_idx ON audit_log(user_id);
CREATE INDEX audit_log_resource_type_idx ON audit_log(resource_type);
CREATE INDEX audit_log_created_at_idx ON audit_log(created_at);
```

**Actions:**
- `create`, `read`, `update`, `delete`
- `login`, `logout`, `password_change`
- `invite_sent`, `member_added`, `member_removed`

---

### error_logs

Application error tracking.

```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  error_type VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX error_logs_user_id_idx ON error_logs(user_id);
CREATE INDEX error_logs_error_type_idx ON error_logs(error_type);
CREATE INDEX error_logs_created_at_idx ON error_logs(created_at);
```

---

### health_checks

System health monitoring.

```sql
CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,  -- 'healthy' | 'degraded' | 'down'
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX health_checks_service_name_idx ON health_checks(service_name);
CREATE INDEX health_checks_created_at_idx ON health_checks(created_at);
```

---

### feature_flags

Feature flag management.

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,
  target_users JSONB,
  target_tiers JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX feature_flags_name_idx ON feature_flags(name);
CREATE INDEX feature_flags_enabled_idx ON feature_flags(enabled);
```

**Target Tiers:**
```json
["free", "pro", "enterprise"]
```

---

### webhook_dedup

Webhook deduplication.

```sql
CREATE TABLE webhook_dedup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id VARCHAR(255) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX webhook_dedup_webhook_id_idx ON webhook_dedup(webhook_id);
CREATE INDEX webhook_dedup_created_at_idx ON webhook_dedup(created_at);
```

---

## Indexes & Performance

### Index Strategy

**High-Priority Indexes (Query Performance):**
```sql
-- Authentication
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX sessions_token_idx ON sessions(token);

-- Family Access
CREATE INDEX family_members_user_id_idx ON family_members(user_id);
CREATE INDEX family_members_family_id_idx ON family_members(family_id);

-- Messaging
CREATE INDEX conversation_messages_conversation_id_idx ON conversation_messages(conversation_id);
CREATE INDEX conversation_messages_created_at_idx ON conversation_messages(created_at);

-- Calendar
CREATE INDEX calendar_events_family_id_idx ON calendar_events(family_id);
CREATE INDEX calendar_events_start_time_idx ON calendar_events(start_time);

-- Media
CREATE INDEX media_family_id_idx ON media(family_id);
CREATE INDEX media_created_at_idx ON media(created_at);
```

**Composite Indexes (Multi-column Queries):**
```sql
-- Find conversations between two users
CREATE INDEX conversations_participants_idx ON conversations(family_id, participant1_id, participant2_id);

-- Find messages in date range
CREATE INDEX messages_conversation_date_idx ON conversation_messages(conversation_id, created_at DESC);

-- Find events in time range
CREATE INDEX events_family_time_idx ON calendar_events(family_id, start_time, end_time);
```

### Index Maintenance

```sql
-- Analyze table statistics
ANALYZE users;
ANALYZE conversation_messages;

-- Reindex if fragmented
REINDEX INDEX users_email_idx;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## Relationships & Constraints

### Foreign Key Relationships

```
users (1) ──────────────────────── (N) sessions
users (1) ──────────────────────── (N) families (owner)
users (1) ──────────────────────── (N) family_members
users (1) ──────────────────────── (N) subscriptions
users (1) ──────────────────────── (N) notifications

families (1) ──────────────────────── (N) family_members
families (1) ──────────────────────── (N) conversations
families (1) ──────────────────────── (N) calendar_events
families (1) ──────────────────────── (N) media

conversations (1) ──────────────────────── (N) conversation_messages
conversation_messages (1) ──────────────────────── (N) message_reactions
conversation_messages (1) ──────────────────────── (N) pinned_messages

calendar_events (1) ──────────────────────── (N) event_rsvps

media (1) ──────────────────────── (N) photo_tags
media (1) ──────────────────────── (N) media_moderation

subscriptions (1) ──────────────────────── (N) invoices
```

### Cascade Delete Rules

| Parent | Child | Action |
|--------|-------|--------|
| `users` | `sessions` | CASCADE |
| `users` | `families` | CASCADE |
| `users` | `family_members` | CASCADE |
| `families` | `family_members` | CASCADE |
| `families` | `conversations` | CASCADE |
| `families` | `calendar_events` | CASCADE |
| `families` | `media` | CASCADE |
| `conversations` | `conversation_messages` | CASCADE |
| `conversation_messages` | `message_reactions` | CASCADE |
| `media` | `photo_tags` | CASCADE |

---

## Migration Guide

### Creating a New Table

```typescript
// app/db/schema/new_table.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Adding a Column

```typescript
// Modify schema file
export const users = pgTable('users', {
  // ... existing columns
  newColumn: varchar('new_column', { length: 255 }),
});

// Run migration
bun run db:push
```

### Creating an Index

```typescript
import { index } from 'drizzle-orm/pg-core';

export const newTable = pgTable('new_table', {
  // ... columns
}, (table) => ({
  nameIdx: index('new_table_name_idx').on(table.name),
}));
```

### Running Migrations

```bash
# Push schema changes to database
bun run db:push

# Generate migration files
bun run drizzle:generate

# View migration status
bun run db:migrate

# Rollback (if needed)
# Manual: restore from backup
```

---

## Backup & Recovery

### Backup Strategy

```bash
# Daily automated backups (AWS RDS)
- Retention: 30 days
- Multi-AZ replication
- Cross-region backup

# Manual backup
pg_dump -h localhost -U postgres family_app > backup.sql

# Restore from backup
psql -h localhost -U postgres family_app < backup.sql
```

### Point-in-Time Recovery

```sql
-- Restore to specific timestamp
SELECT pg_restore_point('before_migration');

-- List restore points
SELECT * FROM pg_ls_waldir();
```

### Data Integrity Checks

```sql
-- Check for orphaned records
SELECT * FROM sessions WHERE user_id NOT IN (SELECT id FROM users);

-- Verify foreign key constraints
ALTER TABLE sessions VALIDATE CONSTRAINT sessions_user_id_fk;

-- Check index health
REINDEX DATABASE family_app;
```

---

## Performance Tuning

### Query Optimization

```sql
-- Analyze slow queries
EXPLAIN ANALYZE
SELECT * FROM conversation_messages
WHERE conversation_id = 'conv-123'
ORDER BY created_at DESC
LIMIT 50;

-- Add missing indexes if needed
CREATE INDEX messages_conversation_date_idx 
ON conversation_messages(conversation_id, created_at DESC);
```

### Connection Pooling

```
PgBouncer Configuration:
- Pool mode: transaction
- Max connections: 100
- Default pool size: 25
- Reserve pool size: 5
- Timeout: 600 seconds
```

### Vacuum & Analyze

```sql
-- Clean up dead rows
VACUUM ANALYZE users;
VACUUM ANALYZE conversation_messages;

-- Schedule regular maintenance
-- (Automated by PostgreSQL)
```

---

**Document Version:** 1.0
**Last Updated:** 2024
**Maintained By:** Engineering Team
**Next Review:** Quarterly
