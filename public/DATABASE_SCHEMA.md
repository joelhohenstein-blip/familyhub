# FamilyHub Database Schema Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Relationships & Diagrams](#relationships--diagrams)
4. [Field Specifications](#field-specifications)
5. [Indexing Strategy](#indexing-strategy)
6. [Migration History](#migration-history)
7. [Performance Considerations](#performance-considerations)
8. [Backup & Recovery](#backup--recovery)

---

## Overview

**Database Type:** PostgreSQL 15+
**ORM:** Drizzle ORM
**Migration Tool:** Drizzle Kit
**Total Tables:** 18 core tables + 3 junction tables
**Estimated Data Volume:** 10M+ users, 500M+ messages, 1B+ media files

### Database Naming Conventions
- **Tables:** snake_case, plural (e.g., `users`, `family_members`)
- **Columns:** snake_case (e.g., `created_at`, `user_id`)
- **Primary Keys:** `id` (UUID v4)
- **Foreign Keys:** `{table_singular}_id` (e.g., `user_id`, `family_id`)
- **Timestamps:** `created_at`, `updated_at` (UTC, auto-managed)
- **Soft Deletes:** `deleted_at` (nullable timestamp)

---

## Core Tables

### 1. Users
**Purpose:** Core user accounts and authentication

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login identifier |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hash |
| first_name | VARCHAR(100) | | Optional |
| last_name | VARCHAR(100) | | Optional |
| avatar_url | TEXT | | Profile picture |
| phone_number | VARCHAR(20) | | Optional |
| date_of_birth | DATE | | Optional |
| timezone | VARCHAR(50) | DEFAULT 'UTC' | User timezone |
| language | VARCHAR(10) | DEFAULT 'en' | Preferred language |
| notification_preferences | JSONB | DEFAULT '{}' | Per-user settings |
| privacy_settings | JSONB | DEFAULT '{}' | Granular controls |
| two_factor_enabled | BOOLEAN | DEFAULT false | 2FA flag |
| subscription_tier | VARCHAR(50) | DEFAULT 'free' | free, premium, family |
| stripe_customer_id | VARCHAR(255) | | Billing integration |
| last_login_at | TIMESTAMP | | Audit trail |
| status | VARCHAR(50) | DEFAULT 'active' | active, suspended, deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Indexes:**
- `idx_users_email` (UNIQUE)
- `idx_users_status`
- `idx_users_subscription_tier`
- `idx_users_created_at DESC`
- `idx_users_deleted_at` (partial: WHERE deleted_at IS NOT NULL)

---

### 2. Families
**Purpose:** Family group management

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| name | VARCHAR(255) | NOT NULL | Family name |
| description | TEXT | | Optional |
| owner_id | UUID | FK → users | Family owner |
| avatar_url | TEXT | | Family avatar |
| member_count | INTEGER | DEFAULT 1 | Denormalized count |
| max_members | INTEGER | DEFAULT 50 | Limit |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Indexes:**
- `idx_families_owner_id`
- `idx_families_created_at DESC`

---

### 3. Family Members
**Purpose:** User membership in families with roles

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| user_id | UUID | FK → users | NOT NULL |
| role | VARCHAR(50) | DEFAULT 'member' | owner, admin, moderator, member, guest |
| status | VARCHAR(50) | DEFAULT 'active' | active, invited, pending, removed |
| joined_at | TIMESTAMP | DEFAULT NOW() | Membership date |
| invited_at | TIMESTAMP | | Invitation date |
| invited_by_id | UUID | FK → users | Who invited |
| permissions | JSONB | DEFAULT '{}' | Granular permissions |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Constraints:**
- UNIQUE(family_id, user_id)

**Indexes:**
- `idx_family_members_family_id`
- `idx_family_members_user_id`
- `idx_family_members_status`
- `idx_family_members_role`
- `idx_family_members_family_user` (composite)

---

### 4. Messages
**Purpose:** Real-time messaging with threading
**Partitioning:** By created_at (monthly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| channel_id | UUID | FK → channels | Optional |
| thread_id | UUID | FK → messages | Self-reference for threading |
| sender_id | UUID | FK → users | NOT NULL |
| content | TEXT | NOT NULL | Message body |
| content_type | VARCHAR(50) | DEFAULT 'text' | text, image, video, file, system |
| media_urls | TEXT[] | | Array of URLs |
| mentions | UUID[] | | @mentioned users |
| reactions | JSONB | DEFAULT '{}' | {emoji: [user_ids]} |
| edited_at | TIMESTAMP | | Edit timestamp |
| pinned | BOOLEAN | DEFAULT false | Pinned flag |
| deleted | BOOLEAN | DEFAULT false | Soft delete |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |

**Indexes:**
- `idx_messages_family_id`
- `idx_messages_channel_id`
- `idx_messages_thread_id`
- `idx_messages_sender_id`
- `idx_messages_created_at DESC`
- `idx_messages_pinned` (partial: WHERE pinned = true)
- `idx_messages_family_created` (composite: family_id, created_at DESC)
- `idx_messages_mentions` (GIN array)

---

### 5. Channels
**Purpose:** Message channels (general, announcements, direct messages)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| name | VARCHAR(255) | NOT NULL | Channel name |
| description | TEXT | | Optional |
| type | VARCHAR(50) | DEFAULT 'public' | public, private, direct |
| is_direct | BOOLEAN | DEFAULT false | DM flag |
| participant_ids | UUID[] | NOT NULL | Array of user IDs |
| created_by_id | UUID | FK → users | Creator |
| last_message_id | UUID | FK → messages | Latest message |
| last_message_at | TIMESTAMP | | Latest activity |
| message_count | INTEGER | DEFAULT 0 | Denormalized count |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Constraints:**
- UNIQUE(family_id, name)

**Indexes:**
- `idx_channels_family_id`
- `idx_channels_type`
- `idx_channels_is_direct`
- `idx_channels_participant_ids` (GIN array)

---

### 6. Media Gallery
**Purpose:** Photo/video storage with metadata
**Partitioning:** By created_at (quarterly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| uploader_id | UUID | FK → users | NOT NULL |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_key | VARCHAR(255) | UNIQUE | S3 key |
| file_size | INTEGER | NOT NULL | Bytes |
| file_type | VARCHAR(50) | NOT NULL | image, video, document |
| mime_type | VARCHAR(100) | NOT NULL | e.g., image/jpeg |
| width | INTEGER | | Pixels |
| height | INTEGER | | Pixels |
| duration_seconds | INTEGER | | For videos |
| thumbnail_key | VARCHAR(255) | | S3 key |
| thumbnail_url | TEXT | | Thumbnail URL |
| original_url | TEXT | | Full-size URL |
| optimized_urls | JSONB | DEFAULT '{}' | {webp: url, avif: url} |
| metadata | JSONB | DEFAULT '{}' | EXIF, camera info |
| tags | TEXT[] | | Search tags |
| album_id | UUID | FK → albums | Optional |
| visibility | VARCHAR(50) | DEFAULT 'family' | family, members, private |
| visible_to_ids | UUID[] | | Specific members |
| description | TEXT | | Optional |
| location_lat | DECIMAL(10,8) | | Latitude |
| location_lng | DECIMAL(11,8) | | Longitude |
| location_name | VARCHAR(255) | | Place name |
| taken_at | TIMESTAMP | | Photo date |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Indexes:**
- `idx_media_gallery_family_id`
- `idx_media_gallery_uploader_id`
- `idx_media_gallery_album_id`
- `idx_media_gallery_tags` (GIN array)
- `idx_media_gallery_created_at DESC`
- `idx_media_gallery_taken_at DESC`
- `idx_media_gallery_visibility`

---

### 7. Albums
**Purpose:** Organize media into albums

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| created_by_id | UUID | FK → users | NOT NULL |
| name | VARCHAR(255) | NOT NULL | Album name |
| description | TEXT | | Optional |
| cover_image_id | UUID | FK → media_gallery | Optional |
| media_count | INTEGER | DEFAULT 0 | Denormalized count |
| visibility | VARCHAR(50) | DEFAULT 'family' | family, members, private |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Constraints:**
- UNIQUE(family_id, name)

**Indexes:**
- `idx_albums_family_id`
- `idx_albums_created_by_id`

---

### 8. Calendar Events
**Purpose:** Family calendar with recurring events
**Partitioning:** By start_date (quarterly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| created_by_id | UUID | FK → users | NOT NULL |
| title | VARCHAR(255) | NOT NULL | Event title |
| description | TEXT | | Optional |
| event_type | VARCHAR(50) | DEFAULT 'event' | event, birthday, anniversary, holiday |
| start_date | DATE | NOT NULL | Start date |
| start_time | TIME | | Optional |
| end_date | DATE | | Optional |
| end_time | TIME | | Optional |
| all_day | BOOLEAN | DEFAULT false | All-day flag |
| timezone | VARCHAR(50) | DEFAULT 'UTC' | Event timezone |
| location | VARCHAR(255) | | Optional |
| location_lat | DECIMAL(10,8) | | Latitude |
| location_lng | DECIMAL(11,8) | | Longitude |
| color | VARCHAR(7) | DEFAULT '#3B82F6' | Hex color |
| recurrence_rule | VARCHAR(255) | | iCal RRULE format |
| recurrence_end_date | DATE | | Recurrence end |
| attendee_ids | UUID[] | | Array of attendees |
| rsvp_status | JSONB | DEFAULT '{}' | {user_id: 'yes'\|'no'\|'maybe'} |
| reminders | JSONB | DEFAULT '[]' | [{type, minutes_before}] |
| is_birthday | BOOLEAN | DEFAULT false | Birthday flag |
| birthday_user_id | UUID | FK → users | Birthday person |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Indexes:**
- `idx_calendar_events_family_id`
- `idx_calendar_events_start_date`
- `idx_calendar_events_event_type`
- `idx_calendar_events_is_birthday`
- `idx_calendar_events_attendee_ids` (GIN array)

---

### 9. Shopping Lists
**Purpose:** Collaborative shopping lists

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| created_by_id | UUID | FK → users | NOT NULL |
| name | VARCHAR(255) | NOT NULL | List name |
| description | TEXT | | Optional |
| category | VARCHAR(100) | | groceries, household, gifts |
| status | VARCHAR(50) | DEFAULT 'active' | active, archived, completed |
| item_count | INTEGER | DEFAULT 0 | Denormalized count |
| completed_item_count | INTEGER | DEFAULT 0 | Denormalized count |
| assigned_to_ids | UUID[] | | Shoppers |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Constraints:**
- UNIQUE(family_id, name)

**Indexes:**
- `idx_shopping_lists_family_id`
- `idx_shopping_lists_status`
- `idx_shopping_lists_category`

---

### 10. Shopping List Items
**Purpose:** Individual items in shopping lists

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| shopping_list_id | UUID | FK → shopping_lists | NOT NULL |
| created_by_id | UUID | FK → users | NOT NULL |
| name | VARCHAR(255) | NOT NULL | Item name |
| description | TEXT | | Optional |
| quantity | DECIMAL(10,2) | | Amount |
| unit | VARCHAR(50) | | kg, lbs, pieces |
| estimated_price | DECIMAL(10,2) | | Budget |
| actual_price | DECIMAL(10,2) | | Actual cost |
| category | VARCHAR(100) | | Item category |
| priority | VARCHAR(50) | DEFAULT 'normal' | low, normal, high |
| completed | BOOLEAN | DEFAULT false | Done flag |
| completed_by_id | UUID | FK → users | Who completed |
| completed_at | TIMESTAMP | | Completion time |
| assigned_to_id | UUID | FK → users | Assigned shopper |
| notes | TEXT | | Optional |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Indexes:**
- `idx_shopping_list_items_shopping_list_id`
- `idx_shopping_list_items_completed`
- `idx_shopping_list_items_assigned_to_id`

---

### 11. Video Calls
**Purpose:** Track video call sessions
**Partitioning:** By created_at (monthly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| initiator_id | UUID | FK → users | NOT NULL |
| call_type | VARCHAR(50) | DEFAULT '1-on-1' | 1-on-1, group |
| participant_ids | UUID[] | NOT NULL | All participants |
| status | VARCHAR(50) | DEFAULT 'pending' | pending, active, completed, missed |
| started_at | TIMESTAMP | | Call start |
| ended_at | TIMESTAMP | | Call end |
| duration_seconds | INTEGER | | Call length |
| recording_key | VARCHAR(255) | | S3 key |
| recording_url | TEXT | | Recording URL |
| call_quality | JSONB | DEFAULT '{}' | {latency, packet_loss, resolution} |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |

**Indexes:**
- `idx_video_calls_family_id`
- `idx_video_calls_initiator_id`
- `idx_video_calls_status`
- `idx_video_calls_created_at DESC`
- `idx_video_calls_participant_ids` (GIN array)

---

### 12. Streaming Theater
**Purpose:** Watch party sessions
**Partitioning:** By created_at (monthly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| created_by_id | UUID | FK → users | NOT NULL |
| title | VARCHAR(255) | NOT NULL | Session title |
| description | TEXT | | Optional |
| content_type | VARCHAR(50) | | movie, tv_show, live_event |
| content_source | VARCHAR(100) | | netflix, youtube, custom_url |
| content_url | TEXT | | Content URL |
| thumbnail_url | TEXT | | Thumbnail |
| duration_minutes | INTEGER | | Content length |
| participant_ids | UUID[] | | Viewers |
| status | VARCHAR(50) | DEFAULT 'scheduled' | scheduled, active, completed |
| scheduled_start_at | TIMESTAMP | | Scheduled time |
| actual_start_at | TIMESTAMP | | Actual start |
| ended_at | TIMESTAMP | | End time |
| current_timestamp_seconds | INTEGER | | Sync position |
| chat_enabled | BOOLEAN | DEFAULT true | Chat flag |
| reactions_enabled | BOOLEAN | DEFAULT true | Reactions flag |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Indexes:**
- `idx_streaming_theater_family_id`
- `idx_streaming_theater_status`
- `idx_streaming_theater_scheduled_start_at`

---

### 13. Photo Digitization Orders
**Purpose:** Track photo digitization service orders
**Partitioning:** By created_at (quarterly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| requested_by_id | UUID | FK → users | NOT NULL |
| order_number | VARCHAR(50) | UNIQUE | Order ID |
| status | VARCHAR(50) | DEFAULT 'pending' | pending, processing, completed, shipped |
| quantity_photos | INTEGER | NOT NULL | Photo count |
| estimated_cost | DECIMAL(10,2) | | Budget |
| actual_cost | DECIMAL(10,2) | | Final cost |
| service_type | VARCHAR(100) | | basic_scan, hd_scan, restoration |
| shipping_address | JSONB | | Address object |
| tracking_number | VARCHAR(255) | | Shipping tracking |
| estimated_delivery_date | DATE | | Expected delivery |
| actual_delivery_date | DATE | | Actual delivery |
| notes | TEXT | | Optional |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| deleted_at | TIMESTAMP | | Soft delete |

**Indexes:**
- `idx_photo_digitization_orders_family_id`
- `idx_photo_digitization_orders_status`
- `idx_photo_digitization_orders_order_number`

---

### 14. Notifications
**Purpose:** User notification log
**Partitioning:** By created_at (monthly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | FK → users | NOT NULL |
| family_id | UUID | FK → families | Optional |
| type | VARCHAR(100) | NOT NULL | message, event_reminder, birthday, call_missed |
| title | VARCHAR(255) | NOT NULL | Notification title |
| body | TEXT | | Notification body |
| data | JSONB | DEFAULT '{}' | Context data |
| read | BOOLEAN | DEFAULT false | Read flag |
| read_at | TIMESTAMP | | Read timestamp |
| action_url | VARCHAR(255) | | Deep link |
| delivery_method | VARCHAR(50) | DEFAULT 'push' | push, email, sms, in_app |
| delivery_status | VARCHAR(50) | DEFAULT 'pending' | pending, sent, failed, bounced |
| delivered_at | TIMESTAMP | | Delivery time |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |

**Indexes:**
- `idx_notifications_user_id`
- `idx_notifications_read`
- `idx_notifications_created_at DESC`
- `idx_notifications_user_read` (composite: user_id, read)

---

### 15. Audit Logs
**Purpose:** Track all user actions for compliance
**Partitioning:** By created_at (monthly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | FK → users | Optional |
| family_id | UUID | FK → families | Optional |
| action | VARCHAR(100) | NOT NULL | create, update, delete, login, export |
| resource_type | VARCHAR(100) | | user, message, media, event |
| resource_id | UUID | | Resource ID |
| changes | JSONB | DEFAULT '{}' | {field: {old, new}} |
| ip_address | VARCHAR(45) | | IP address |
| user_agent | TEXT | | Browser info |
| status | VARCHAR(50) | DEFAULT 'success' | success, failure |
| error_message | TEXT | | Error details |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |

**Indexes:**
- `idx_audit_logs_user_id`
- `idx_audit_logs_family_id`
- `idx_audit_logs_action`
- `idx_audit_logs_created_at DESC`
- `idx_audit_logs_resource` (composite: resource_type, resource_id)

---

### 16. Invitations
**Purpose:** Pending family invitations

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| family_id | UUID | FK → families | NOT NULL |
| invited_by_id | UUID | FK → users | NOT NULL |
| email | VARCHAR(255) | NOT NULL | Invitee email |
| token | VARCHAR(255) | UNIQUE | Invitation token |
| role | VARCHAR(50) | DEFAULT 'member' | Assigned role |
| status | VARCHAR(50) | DEFAULT 'pending' | pending, accepted, declined, expired |
| expires_at | TIMESTAMP | NOT NULL | Expiration |
| accepted_at | TIMESTAMP | | Acceptance time |
| accepted_by_id | UUID | FK → users | Who accepted |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |

**Indexes:**
- `idx_invitations_family_id`
- `idx_invitations_email`
- `idx_invitations_token`
- `idx_invitations_status`
- `idx_invitations_expires_at`

---

### 17. Sessions
**Purpose:** User session management

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | FK → users | NOT NULL |
| token | VARCHAR(255) | UNIQUE | Session token |
| refresh_token | VARCHAR(255) | UNIQUE | Refresh token |
| ip_address | VARCHAR(45) | | IP address |
| user_agent | TEXT | | Browser info |
| device_name | VARCHAR(255) | | Device name |
| device_type | VARCHAR(50) | | web, mobile, tablet |
| expires_at | TIMESTAMP | NOT NULL | Expiration |
| last_activity_at | TIMESTAMP | DEFAULT NOW() | Last activity |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |

**Indexes:**
- `idx_sessions_user_id`
- `idx_sessions_token`
- `idx_sessions_expires_at`

---

### 18. Billing Subscriptions
**Purpose:** Subscription and payment tracking
**Partitioning:** By created_at (quarterly)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | FK → users | NOT NULL |
| family_id | UUID | FK → families | Optional |
| stripe_subscription_id | VARCHAR(255) | UNIQUE | Stripe ID |
| stripe_customer_id | VARCHAR(255) | | Stripe customer |
| plan_id | VARCHAR(100) | NOT NULL | free, premium_monthly, family_yearly |
| status | VARCHAR(50) | DEFAULT 'active' | active, past_due, canceled, expired |
| current_period_start | DATE | | Billing period start |
| current_period_end | DATE | | Billing period end |
| cancel_at_period_end | BOOLEAN | DEFAULT false | Cancellation flag |
| canceled_at | TIMESTAMP | | Cancellation time |
| cancellation_reason | TEXT | | Reason |
| amount_cents | INTEGER | | Price in cents |
| currency | VARCHAR(3) | DEFAULT 'USD' | Currency code |
| billing_cycle | VARCHAR(50) | | monthly, yearly |
| auto_renew | BOOLEAN | DEFAULT true | Auto-renew flag |
| created_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-managed |

**Indexes:**
- `idx_billing_subscriptions_user_id`
- `idx_billing_subscriptions_family_id`
- `idx_billing_subscriptions_status`
- `idx_billing_subscriptions_stripe_subscription_id`

---

## Relationships & Diagrams

### Key Relationships

| Parent | Child | Type | Cascade |
|--------|-------|------|----------|
| users | families | 1:N | ON DELETE CASCADE |
| users | family_members | 1:N | ON DELETE CASCADE |
| families | family_members | 1:N | ON DELETE CASCADE |
| families | messages | 1:N | ON DELETE CASCADE |
| families | channels | 1:N | ON DELETE CASCADE |
| families | media_gallery | 1:N | ON DELETE CASCADE |
| families | albums | 1:N | ON DELETE CASCADE |
| families | calendar_events | 1:N | ON DELETE CASCADE |
| families | shopping_lists | 1:N | ON DELETE CASCADE |
| families | video_calls | 1:N | ON DELETE CASCADE |
| families | streaming_theater | 1:N | ON DELETE CASCADE |
| families | photo_digitization_orders | 1:N | ON DELETE CASCADE |
| users | messages (sender) | 1:N | ON DELETE SET NULL |
| users | media_gallery (uploader) | 1:N | ON DELETE SET NULL |
| users | calendar_events (creator) | 1:N | ON DELETE SET NULL |
| users | shopping_lists (creator) | 1:N | ON DELETE SET NULL |
| users | video_calls (initiator) | 1:N | ON DELETE SET NULL |
| channels | messages | 1:N | ON DELETE CASCADE |
| messages | messages (thread) | 1:N | ON DELETE CASCADE |
| albums | media_gallery | 1:N | ON DELETE SET NULL |
| shopping_lists | shopping_list_items | 1:N | ON DELETE CASCADE |
| users | billing_subscriptions | 1:N | ON DELETE CASCADE |

---

## Indexing Summary

**Total Indexes:** 50+

### Index Types
- **Primary Keys:** 18 (automatic)
- **Foreign Keys:** 25+
- **Filtering:** 15 (status, type, visibility)
- **Sorting:** 10 (timestamps DESC)
- **Composite:** 5 (multi-column queries)
- **GIN (Array/JSONB):** 8 (mentions, tags, participants)
- **Partial:** 5 (soft deletes, boolean flags)

### Performance Targets
- Message retrieval: <10ms (1M messages)
- Media pagination: <50ms (100K items)
- Calendar range query: <20ms (10K events)
- User lookup: <1ms (by email)

---

## Migration & Deployment

### Initial Setup
```bash
bunx drizzle-kit push:pg
```

### Verify Schema
```bash
bunx drizzle-kit studio
```

### Backup
```bash
pg_dump -h localhost -U postgres -d familyhub -F c -f backup_$(date +%Y%m%d).dump
```

---

## Summary

This schema supports:
- ✅ 10M+ users
- ✅ 500M+ messages
- ✅ 1B+ media files
- ✅ Real-time messaging with threading
- ✅ Video calls & streaming
- ✅ Media management with optimization
- ✅ Calendar with recurring events
- ✅ Collaborative shopping lists
- ✅ GDPR/CCPA compliance
- ✅ Audit logging
- ✅ Subscription billing
