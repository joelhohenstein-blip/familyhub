# FamilyHub Database Schema Guide

**Last Updated:** February 2025  
**Version:** 1.0.0  
**Database:** PostgreSQL 16+

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Migrations](#migrations)
6. [Query Examples](#query-examples)
7. [Performance Tips](#performance-tips)
8. [Backup & Recovery](#backup--recovery)

---

## Schema Overview

FamilyHub uses PostgreSQL with Drizzle ORM for type-safe database operations.

**Key Statistics:**
- Total Tables: 25+
- Total Relationships: 40+
- Total Indexes: 50+
- Supported Users: Millions
- Data Retention: Configurable (default: 7 years)

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL 16                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Users     │  │   Families   │  │   Messages   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Calendar   │  │     Tasks    │  │   Shopping   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Gallery   │  │   Billing    │  │     Audit    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Core Tables

### Users Table

Stores user account information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone_number VARCHAR(20),
  date_of_birth DATE,
  bio TEXT,
  status VARCHAR(50) DEFAULT 'active',
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

**Columns:**
- `id` - Unique user identifier (UUID)
- `clerk_id` - Clerk authentication ID
- `email` - User email address (unique)
- `name` - User's full name
- `avatar_url` - Profile picture URL
- `phone_number` - Contact phone number
- `date_of_birth` - User's birthday
- `bio` - User biography/about
- `status` - Account status (active, suspended, deleted)
- `last_seen_at` - Last login timestamp
- `created_at` - Account creation date
- `updated_at` - Last profile update
- `deleted_at` - Soft delete timestamp

**Indexes:**
- `clerk_id` - Fast authentication lookups
- `email` - Email verification and login
- `status` - Filter active users

---

### Families Table

Stores family group information.

```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_type VARCHAR(50),
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  privacy_level VARCHAR(50) DEFAULT 'private',
  member_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_families_owner_id ON families(owner_id);
CREATE INDEX idx_families_created_at ON families(created_at);
```

**Columns:**
- `id` - Unique family identifier
- `name` - Family name
- `description` - Family description
- `avatar_url` - Family photo
- `owner_id` - Family creator/owner
- `family_type` - Type (nuclear, extended, blended, etc.)
- `timezone` - Family timezone
- `language` - Preferred language
- `privacy_level` - Privacy setting (private, family-only, public)
- `member_count` - Number of members (cached)
- `created_at` - Creation date
- `updated_at` - Last update
- `deleted_at` - Soft delete

---

### Family Members Table

Stores family membership and relationships.

```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50),
  role VARCHAR(50) DEFAULT 'member',
  status VARCHAR(50) DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  accepted_at TIMESTAMP,
  UNIQUE(family_id, user_id)
);

CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_family_members_status ON family_members(status);
```

**Columns:**
- `id` - Unique membership record
- `family_id` - Family reference
- `user_id` - User reference
- `relationship` - Relationship type (parent, sibling, child, etc.)
- `role` - Role in family (admin, member)
- `status` - Membership status (active, invited, suspended)
- `joined_at` - When they joined
- `invited_by` - Who invited them
- `invited_at` - Invitation date
- `accepted_at` - When they accepted

---

### Messages Table

Stores all messages and conversations.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  attachments JSONB,
  reactions JSONB,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

**Columns:**
- `id` - Unique message ID
- `conversation_id` - Conversation reference
- `sender_id` - Message author
- `content` - Message text
- `message_type` - Type (text, image, file, system)
- `attachments` - JSON array of file attachments
- `reactions` - JSON object of emoji reactions
- `edited_at` - When message was edited
- `deleted_at` - Soft delete timestamp
- `created_at` - Message timestamp
- `updated_at` - Last update

---

### Conversations Table

Stores conversation metadata.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(255),
  description TEXT,
  conversation_type VARCHAR(50) DEFAULT 'group',
  creator_id UUID NOT NULL REFERENCES users(id),
  last_message_at TIMESTAMP,
  message_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_family_id ON conversations(family_id);
CREATE INDEX idx_conversations_creator_id ON conversations(creator_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
```

---

### Calendar Events Table

Stores calendar events and reminders.

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(255),
  event_type VARCHAR(50),
  recurrence_rule VARCHAR(255),
  reminder_minutes INT ARRAY,
  color VARCHAR(7),
  is_all_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_calendar_events_family_id ON calendar_events(family_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_creator_id ON calendar_events(creator_id);
```

---

### Tasks Table

Stores tasks and to-do items.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_family_id ON tasks(family_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

---

### Shopping Lists Table

Stores shopping lists and items.

```sql
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  estimated_price DECIMAL(10, 2),
  actual_price DECIMAL(10, 2),
  is_purchased BOOLEAN DEFAULT FALSE,
  purchased_by UUID REFERENCES users(id),
  purchased_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shopping_items_list_id ON shopping_items(list_id);
CREATE INDEX idx_shopping_items_is_purchased ON shopping_items(is_purchased);
```

---

### Gallery Table

Stores photos and albums.

```sql
CREATE TABLE gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  photo_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES gallery_albums(id) ON DELETE SET NULL,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  webp_url TEXT,
  caption TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gallery_photos_family_id ON gallery_photos(family_id);
CREATE INDEX idx_gallery_photos_album_id ON gallery_photos(album_id);
CREATE INDEX idx_gallery_photos_uploaded_by ON gallery_photos(uploaded_by);
```

---

### Billing Table

Stores subscription and billing information.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start DATE,
  current_period_end DATE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  stripe_invoice_id VARCHAR(255),
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50),
  invoice_date DATE,
  due_date DATE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_family_id ON subscriptions(family_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
```

---

### Audit Log Table

Stores all system actions for compliance and debugging.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_family_id ON audit_logs(family_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## Relationships

### User Relationships

```
users (1) ──→ (many) families (owner)
users (1) ──→ (many) family_members
users (1) ──→ (many) messages (sender)
users (1) ──→ (many) calendar_events (creator)
users (1) ──→ (many) tasks (creator/assigned)
users (1) ──→ (many) gallery_photos (uploader)
```

### Family Relationships

```
families (1) ──→ (many) family_members
families (1) ──→ (many) conversations
families (1) ──→ (many) calendar_events
families (1) ──→ (many) tasks
families (1) ──→ (many) shopping_lists
families (1) ──→ (many) gallery_albums
families (1) ──→ (many) subscriptions
families (1) ──→ (many) audit_logs
```

### Message Relationships

```
conversations (1) ──→ (many) messages
messages (1) ──→ (many) message_reactions
```

---

## Indexes

### Performance Indexes

**User Lookups:**
```sql
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
```

**Family Queries:**
```sql
CREATE INDEX idx_families_owner_id ON families(owner_id);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
```

**Message Queries:**
```sql
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_conversations_family_id ON conversations(family_id);
```

**Calendar Queries:**
```sql
CREATE INDEX idx_calendar_events_family_id ON calendar_events(family_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
```

**Task Queries:**
```sql
CREATE INDEX idx_tasks_family_id ON tasks(family_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
```

**Composite Indexes (for common queries):**
```sql
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_tasks_family_status ON tasks(family_id, status);
CREATE INDEX idx_calendar_family_time ON calendar_events(family_id, start_time);
```

---

## Migrations

### Running Migrations

```bash
# Push schema changes to database
bun run db:push

# Generate migration files
bun run drizzle:generate

# Apply migrations
bun run drizzle:push

# Reset database (WARNING: deletes all data)
bun run db:reset
```

### Migration Files Location

```
drizzle/
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_audit_logs.sql
│   ├── 0003_add_billing.sql
│   └── ...
└── schema.ts
```

### Creating a New Migration

```bash
# 1. Update schema in drizzle/schema.ts
# 2. Generate migration
bun run drizzle:generate

# 3. Review migration in drizzle/migrations/
# 4. Apply migration
bun run db:push
```

### Migration Best Practices

1. **Always backup before migrating:**
   ```bash
   docker-compose exec postgres pg_dump -U family_hub family_hub > backup.sql
   ```

2. **Test migrations locally first:**
   ```bash
   bun run db:push
   ```

3. **Review generated SQL:**
   ```bash
   cat drizzle/migrations/0001_*.sql
   ```

4. **Use transactions for safety:**
   ```sql
   BEGIN;
   -- migration statements
   COMMIT;
   ```

---

## Query Examples

### User Queries

**Get user by ID:**
```sql
SELECT * FROM users WHERE id = $1;
```

**Get user by email:**
```sql
SELECT * FROM users WHERE email = $1;
```

**Get user's families:**
```sql
SELECT f.* FROM families f
JOIN family_members fm ON f.id = fm.family_id
WHERE fm.user_id = $1 AND fm.status = 'active';
```

### Family Queries

**Get family members:**
```sql
SELECT u.*, fm.relationship, fm.role
FROM users u
JOIN family_members fm ON u.id = fm.user_id
WHERE fm.family_id = $1 AND fm.status = 'active'
ORDER BY u.name;
```

**Get family statistics:**
```sql
SELECT 
  f.id,
  f.name,
  COUNT(DISTINCT fm.user_id) as member_count,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT ce.id) as event_count
FROM families f
LEFT JOIN family_members fm ON f.id = fm.family_id
LEFT JOIN conversations c ON f.id = c.family_id
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN calendar_events ce ON f.id = ce.family_id
WHERE f.id = $1
GROUP BY f.id, f.name;
```

### Message Queries

**Get recent messages:**
```sql
SELECT m.*, u.name, u.avatar_url
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.conversation_id = $1
ORDER BY m.created_at DESC
LIMIT 50;
```

**Search messages:**
```sql
SELECT m.*, u.name
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.conversation_id = $1
  AND m.content ILIKE '%' || $2 || '%'
ORDER BY m.created_at DESC;
```

### Calendar Queries

**Get upcoming events:**
```sql
SELECT * FROM calendar_events
WHERE family_id = $1
  AND start_time >= NOW()
  AND start_time <= NOW() + INTERVAL '30 days'
ORDER BY start_time;
```

**Get events for date range:**
```sql
SELECT * FROM calendar_events
WHERE family_id = $1
  AND start_time >= $2
  AND start_time < $3
ORDER BY start_time;
```

### Task Queries

**Get pending tasks:**
```sql
SELECT * FROM tasks
WHERE family_id = $1
  AND status = 'pending'
ORDER BY due_date, priority DESC;
```

**Get tasks assigned to user:**
```sql
SELECT * FROM tasks
WHERE family_id = $1
  AND assigned_to = $2
  AND status != 'completed'
ORDER BY due_date;
```

---

## Performance Tips

### Query Optimization

1. **Always use indexes:**
   ```sql
   -- Good: uses index
   SELECT * FROM users WHERE email = $1;
   
   -- Bad: full table scan
   SELECT * FROM users WHERE LOWER(email) = LOWER($1);
   ```

2. **Limit result sets:**
   ```sql
   -- Good: limited results
   SELECT * FROM messages LIMIT 50;
   
   -- Bad: could return millions
   SELECT * FROM messages;
   ```

3. **Use EXPLAIN to analyze:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM messages WHERE conversation_id = $1;
   ```

### Connection Pooling

Use connection pooling for better performance:

```typescript
// server/db/client.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Caching Strategy

Cache frequently accessed data:

```typescript
// Cache family member lists
const familyMembers = await redis.get(`family:${familyId}:members`);
if (!familyMembers) {
  const members = await db.query.familyMembers.findMany({
    where: eq(familyMembers.familyId, familyId),
  });
  await redis.set(`family:${familyId}:members`, JSON.stringify(members), 'EX', 3600);
}
```

### Batch Operations

Use batch operations for better performance:

```typescript
// Good: batch insert
await db.insert(messages).values([
  { conversationId, senderId, content: 'msg1' },
  { conversationId, senderId, content: 'msg2' },
  { conversationId, senderId, content: 'msg3' },
]);

// Bad: individual inserts
for (const msg of messages) {
  await db.insert(messages).values(msg);
}
```

---

## Backup & Recovery

### Automated Backups

```bash
# Daily backup at 2 AM
0 2 * * * pg_dump -U family_hub family_hub | gzip > /backups/backup-$(date +\%Y\%m\%d).sql.gz
```

### Manual Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U family_hub family_hub > backup.sql

# Backup with compression
docker-compose exec postgres pg_dump -U family_hub family_hub | gzip > backup.sql.gz
```

### Restore from Backup

```bash
# Restore from backup
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U family_hub family_hub

# Or without compression
docker-compose exec -T postgres psql -U family_hub family_hub < backup.sql
```

### Point-in-Time Recovery

```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'

# Restore to specific time
pg_restore --recovery-target-time='2025-02-07 12:00:00' backup.sql
```

---

## Maintenance

### Analyze Query Performance

```bash
# Connect to database
docker-compose exec postgres psql -U family_hub family_hub

# Analyze table
ANALYZE messages;

# Check table size
SELECT pg_size_pretty(pg_total_relation_size('messages'));

# Check index size
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Vacuum & Cleanup

```bash
# Vacuum database
VACUUM ANALYZE;

# Reindex table
REINDEX TABLE messages;

# Check for bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

**Last Updated:** February 2025  
**Maintained By:** FamilyHub Team  
**Version:** 1.0.0
