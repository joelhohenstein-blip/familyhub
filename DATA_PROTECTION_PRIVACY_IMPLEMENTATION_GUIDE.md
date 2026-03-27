# 🔐 Data Protection & Privacy Implementation Guide

**Version:** 1.0.0  
**Last Updated:** February 28, 2026  
**Status:** ✅ Active  
**Audience:** Developers, DevOps, Security Team, Legal Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Data Classification & Handling](#data-classification--handling)
3. [Encryption Standards](#encryption-standards)
4. [GDPR Compliance](#gdpr-compliance)
5. [Data Retention & Deletion](#data-retention--deletion)
6. [User Rights Implementation](#user-rights-implementation)
7. [Audit Logging & Monitoring](#audit-logging--monitoring)
8. [Third-Party Data Sharing](#third-party-data-sharing)
9. [Incident Response](#incident-response)
10. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

This guide provides technical implementation details for FamilyHub's data protection and privacy commitments. It covers:

- **Data Classification:** How to categorize and handle different data types
- **Encryption:** Standards for data in transit and at rest
- **GDPR Compliance:** Technical implementation of GDPR requirements
- **Data Retention:** Policies and automated deletion procedures
- **User Rights:** How to implement access, deletion, and portability requests
- **Audit Logging:** Tracking data access and modifications
- **Third-Party Management:** Vetting and monitoring service providers

**Key Principle:** Privacy by design. All systems must implement privacy controls from the ground up, not as an afterthought.

---

## Data Classification & Handling

### 1.1 Data Categories

#### **Tier 1: Highly Sensitive (PII)**
Personal Identifiable Information that requires maximum protection.

| Data Type | Examples | Storage | Encryption | Access |
|-----------|----------|---------|-----------|--------|
| **Authentication** | Passwords, API keys, tokens | Hashed DB | Bcrypt/Argon2 | Auth service only |
| **Identity** | Name, email, phone, SSN | Encrypted DB | AES-256 | Account owner, support (logged) |
| **Financial** | Credit card, bank account | Third-party (Stripe) | PCI-DSS | Stripe only, never stored |
| **Biometric** | Face recognition data | Encrypted DB | AES-256 | Vision API only, deleted after use |
| **Health** | Medical info, allergies | Encrypted DB | AES-256 | Family members only |
| **Location** | Precise GPS coordinates | Encrypted DB | AES-256 | User only, opt-in |

**Handling Rules:**
- ✅ Always encrypt in transit (HTTPS/TLS)
- ✅ Always encrypt at rest (AES-256)
- ✅ Minimize collection (only what's needed)
- ✅ Log all access (audit trail)
- ✅ Delete on request (within 30 days)
- ❌ Never log full values (hash or truncate)
- ❌ Never send in plain text
- ❌ Never store in logs or backups longer than necessary

#### **Tier 2: Sensitive (Family Data)**
Information shared within families that requires strong protection.

| Data Type | Examples | Storage | Encryption | Access |
|-----------|----------|---------|-----------|--------|
| **Family Content** | Messages, photos, videos | Encrypted DB + S3 | AES-256 | Family members only |
| **Calendar Events** | Family schedules, appointments | Encrypted DB | AES-256 | Family members only |
| **Shopping Lists** | Grocery items, wishlists | Encrypted DB | AES-256 | Family members only |
| **Family Relationships** | Member roles, permissions | Encrypted DB | AES-256 | Family members only |

**Handling Rules:**
- ✅ Encrypt in transit and at rest
- ✅ Enforce family-level access control
- ✅ Log modifications (who changed what, when)
- ✅ Support data export (user portability)
- ✅ Delete on account removal
- ❌ Never share between families
- ❌ Never expose to unauthorized users

#### **Tier 3: Non-Sensitive (Usage Data)**
Aggregated or anonymized data used for analytics and improvement.

| Data Type | Examples | Storage | Encryption | Access |
|-----------|----------|---------|-----------|--------|
| **Usage Analytics** | Feature usage, page views | Analytics DB | TLS in transit | Analytics team only |
| **Performance Metrics** | Load times, error rates | Monitoring DB | TLS in transit | DevOps team only |
| **Aggregated Stats** | Total users, feature adoption | Analytics DB | TLS in transit | Product team only |

**Handling Rules:**
- ✅ Anonymize or aggregate (no user IDs)
- ✅ Encrypt in transit
- ✅ Retain for 90 days max
- ✅ Allow users to opt out
- ❌ Never link back to individuals
- ❌ Never share with third parties

---

### 1.2 Data Flow Diagram

```
User Input
    ↓
[Validation & Sanitization]
    ↓
[Encryption (if Tier 1/2)]
    ↓
[Database / Storage]
    ↓
[Access Control Check]
    ↓
[Audit Log Entry]
    ↓
[Return to User]
```

---

## Encryption Standards

### 2.1 In-Transit Encryption

**Protocol:** HTTPS/TLS 1.3 (minimum)

```typescript
// ✅ CORRECT: All API calls use HTTPS
const response = await fetch('https://api.familyhub.app/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// ❌ WRONG: HTTP is not encrypted
const response = await fetch('http://api.familyhub.app/user/profile');
```

**WebSocket:** Secure WebSocket (WSS) for real-time features

```typescript
// ✅ CORRECT: Use WSS for real-time messaging
const socket = new WebSocket('wss://api.familyhub.app/ws');

// ❌ WRONG: WS is not encrypted
const socket = new WebSocket('ws://api.familyhub.app/ws');
```

**Certificate Pinning (Mobile Apps):**

```swift
// iOS: Pin certificate to prevent MITM attacks
let serverTrustPolicy = ServerTrustPolicy.pinCertificates(
  withNames: ["api.familyhub.app"],
  pinnedCertificates: [certificate]
)
```

### 2.2 At-Rest Encryption

**Database Encryption:** AES-256-GCM

```typescript
// ✅ CORRECT: Encrypt sensitive fields before storing
import crypto from 'crypto';

function encryptField(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptField(ciphertext: string, key: Buffer): string {
  const [iv, authTag, encrypted] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Usage
const encryptedEmail = encryptField(user.email, encryptionKey);
await db.users.update({ id: user.id }, { email: encryptedEmail });
```

**Password Hashing:** Argon2 (not bcrypt for new implementations)

```typescript
// ✅ CORRECT: Use Argon2 for password hashing
import argon2 from 'argon2';

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,    // 64 MB
    timeCost: 3,          // 3 iterations
    parallelism: 4        // 4 threads
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// Usage
const hashedPassword = await hashPassword(user.password);
await db.users.create({ email: user.email, password: hashedPassword });
```

**File Encryption (S3):**

```typescript
// ✅ CORRECT: Enable S3 server-side encryption
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  serverSideEncryption: 'AES256'
});

const params = {
  Bucket: 'familyhub-media',
  Key: `family/${familyId}/photo-${Date.now()}.jpg`,
  Body: fileBuffer,
  ServerSideEncryption: 'AES256',
  Metadata: {
    'user-id': userId,
    'family-id': familyId
  }
};

await s3.upload(params).promise();
```

**Backup Encryption:**

```bash
# ✅ CORRECT: Encrypt database backups
pg_dump familyhub_db | \
  openssl enc -aes-256-cbc -salt -out backup.sql.enc

# Restore from encrypted backup
openssl enc -d -aes-256-cbc -in backup.sql.enc | psql familyhub_db
```

### 2.3 Key Management

**Key Storage:**

```typescript
// ✅ CORRECT: Store keys in environment variables or key management service
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

// ✅ BETTER: Use AWS KMS or similar
import AWS from 'aws-sdk';

const kms = new AWS.KMS();
const encryptedKey = await kms.encrypt({
  KeyId: process.env.KMS_KEY_ID,
  Plaintext: Buffer.from(process.env.ENCRYPTION_KEY)
}).promise();
```

**Key Rotation:**

```typescript
// Rotate encryption keys every 90 days
async function rotateEncryptionKey() {
  const oldKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const newKey = crypto.randomBytes(32);
  
  // Re-encrypt all data with new key
  const users = await db.users.findAll();
  for (const user of users) {
    const decrypted = decryptField(user.email, oldKey);
    const reencrypted = encryptField(decrypted, newKey);
    await db.users.update({ id: user.id }, { email: reencrypted });
  }
  
  // Update environment variable
  process.env.ENCRYPTION_KEY = newKey.toString('hex');
}
```

---

## GDPR Compliance

### 3.1 Legal Basis for Processing

**Consent-Based Processing:**

```typescript
// ✅ CORRECT: Explicit consent for non-essential processing
interface UserConsent {
  marketing_emails: boolean;
  analytics: boolean;
  third_party_sharing: boolean;
  timestamp: Date;
  ip_address: string;
}

async function recordConsent(userId: string, consent: UserConsent) {
  await db.consents.create({
    user_id: userId,
    ...consent,
    created_at: new Date()
  });
  
  // Log for audit trail
  await auditLog.create({
    user_id: userId,
    action: 'CONSENT_RECORDED',
    details: consent,
    timestamp: new Date()
  });
}
```

**Contract-Based Processing:**

```typescript
// ✅ CORRECT: Process data necessary for service delivery
async function processServiceData(userId: string, data: any) {
  // Only process data necessary for the service
  const necessaryData = {
    email: data.email,
    name: data.name,
    family_id: data.family_id
  };
  
  await db.users.update({ id: userId }, necessaryData);
}
```

**Legal Obligation Processing:**

```typescript
// ✅ CORRECT: Document legal basis for required processing
async function processForCompliance(userId: string, data: any) {
  await db.users.update({ id: userId }, data);
  
  await auditLog.create({
    user_id: userId,
    action: 'LEGAL_OBLIGATION_PROCESSING',
    legal_basis: 'Tax compliance - EU VAT Directive',
    timestamp: new Date()
  });
}
```

### 3.2 Data Subject Rights Implementation

#### **Right to Access (Article 15)**

```typescript
// ✅ CORRECT: Implement data export functionality
async function exportUserData(userId: string): Promise<string> {
  const user = await db.users.findById(userId);
  const messages = await db.messages.findByUserId(userId);
  const photos = await db.photos.findByUserId(userId);
  
  const dataExport = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at
    },
    messages: messages.map(m => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at
    })),
    photos: photos.map(p => ({
      id: p.id,
      url: p.url,
      created_at: p.created_at
    }))
  };
  
  // Return as JSON
  return JSON.stringify(dataExport, null, 2);
}

// API endpoint
app.get('/api/user/data-export', async (req, res) => {
  const userId = req.user.id;
  const data = await exportUserData(userId);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
  res.send(data);
  
  // Log the request
  await auditLog.create({
    user_id: userId,
    action: 'DATA_EXPORT_REQUESTED',
    timestamp: new Date()
  });
});
```

#### **Right to Rectification (Article 16)**

```typescript
// ✅ CORRECT: Allow users to correct their data
app.patch('/api/user/profile', async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone } = req.body;
  
  // Validate input
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  
  // Store old values for audit trail
  const oldUser = await db.users.findById(userId);
  
  // Update user
  await db.users.update({ id: userId }, { name, email, phone });
  
  // Log the change
  await auditLog.create({
    user_id: userId,
    action: 'DATA_RECTIFIED',
    old_values: { name: oldUser.name, email: oldUser.email },
    new_values: { name, email, phone },
    timestamp: new Date()
  });
  
  res.json({ success: true });
});
```

#### **Right to Erasure (Article 17 - "Right to be Forgotten")**

```typescript
// ✅ CORRECT: Implement account deletion with data purging
async function deleteUserAccount(userId: string) {
  // Start transaction
  const transaction = await db.transaction();
  
  try {
    // Delete user data
    await db.users.delete({ id: userId }, { transaction });
    await db.messages.delete({ user_id: userId }, { transaction });
    await db.photos.delete({ user_id: userId }, { transaction });
    await db.consents.delete({ user_id: userId }, { transaction });
    
    // Delete from S3
    const photos = await db.photos.findByUserId(userId);
    for (const photo of photos) {
      await s3.deleteObject({
        Bucket: 'familyhub-media',
        Key: photo.s3_key
      }).promise();
    }
    
    // Log deletion (keep for 30 days for recovery)
    await db.deletionLog.create({
      user_id: userId,
      deleted_at: new Date(),
      recovery_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }, { transaction });
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// API endpoint
app.delete('/api/user/account', async (req, res) => {
  const userId = req.user.id;
  
  // Require password confirmation
  const { password } = req.body;
  const user = await db.users.findById(userId);
  
  if (!await verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  // Delete account
  await deleteUserAccount(userId);
  
  res.json({ success: true, message: 'Account deleted. Data will be purged within 30 days.' });
});
```

#### **Right to Data Portability (Article 20)**

```typescript
// ✅ CORRECT: Export data in portable format (JSON, CSV)
async function exportDataPortable(userId: string, format: 'json' | 'csv') {
  const data = await exportUserData(userId);
  
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  
  if (format === 'csv') {
    // Convert to CSV
    const csv = convertToCSV(data);
    return csv;
  }
}

// API endpoint
app.get('/api/user/data-portability', async (req, res) => {
  const userId = req.user.id;
  const format = req.query.format || 'json';
  
  const data = await exportDataPortable(userId, format);
  
  const contentType = format === 'json' ? 'application/json' : 'text/csv';
  const filename = `my-data.${format}`;
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(data);
  
  await auditLog.create({
    user_id: userId,
    action: 'DATA_PORTABILITY_REQUESTED',
    format,
    timestamp: new Date()
  });
});
```

#### **Right to Object (Article 21)**

```typescript
// ✅ CORRECT: Allow users to opt out of processing
async function optOutOfProcessing(userId: string, processingType: string) {
  const optOuts = {
    marketing_emails: false,
    analytics: false,
    profiling: false,
    third_party_sharing: false
  };
  
  optOuts[processingType] = true;
  
  await db.users.update({ id: userId }, optOuts);
  
  await auditLog.create({
    user_id: userId,
    action: 'OPT_OUT_RECORDED',
    processing_type: processingType,
    timestamp: new Date()
  });
}

// API endpoint
app.post('/api/user/opt-out', async (req, res) => {
  const userId = req.user.id;
  const { processing_type } = req.body;
  
  await optOutOfProcessing(userId, processing_type);
  
  res.json({ success: true });
});
```

### 3.3 Data Protection Impact Assessment (DPIA)

```typescript
// ✅ CORRECT: Document DPIA for high-risk processing
interface DPIA {
  processing_name: string;
  description: string;
  legal_basis: string;
  data_categories: string[];
  recipients: string[];
  retention_period: string;
  risks: Risk[];
  mitigations: Mitigation[];
  dpia_date: Date;
  approved_by: string;
}

const dpias: DPIA[] = [
  {
    processing_name: 'Family Member Profiling',
    description: 'Analyze family member behavior to recommend features',
    legal_basis: 'Legitimate Interest',
    data_categories: ['Usage data', 'Feature preferences'],
    recipients: ['Product team'],
    retention_period: '90 days',
    risks: [
      {
        description: 'Discrimination based on family composition',
        likelihood: 'Low',
        impact: 'High',
        mitigation: 'Anonymize data, regular audits'
      }
    ],
    mitigations: [
      {
        description: 'Implement fairness checks in algorithms',
        responsible_party: 'Data Science team',
        deadline: '2026-06-30'
      }
    ],
    dpia_date: new Date('2026-02-28'),
    approved_by: 'Data Protection Officer'
  }
];
```

---

## Data Retention & Deletion

### 4.1 Retention Schedule

```typescript
interface RetentionPolicy {
  data_type: string;
  retention_period: string;
  deletion_trigger: string;
  exceptions: string[];
}

const retentionPolicies: RetentionPolicy[] = [
  {
    data_type: 'User Account Data',
    retention_period: 'Active account duration',
    deletion_trigger: 'Account deletion',
    exceptions: ['Legal holds', 'Fraud investigation']
  },
  {
    data_type: 'Family Messages',
    retention_period: 'Active account duration',
    deletion_trigger: 'Account deletion or 7 years of inactivity',
    exceptions: ['Legal holds']
  },
  {
    data_type: 'Photos & Videos',
    retention_period: 'Active account duration',
    deletion_trigger: 'Account deletion or user deletion',
    exceptions: ['Legal holds']
  },
  {
    data_type: 'Audit Logs',
    retention_period: '90 days',
    deletion_trigger: 'Automatic after 90 days',
    exceptions: ['Active investigation', 'Legal hold']
  },
  {
    data_type: 'Backup Data',
    retention_period: '30 days',
    deletion_trigger: 'Automatic after 30 days',
    exceptions: ['Disaster recovery']
  },
  {
    data_type: 'Analytics Data',
    retention_period: '90 days',
    deletion_trigger: 'Automatic after 90 days',
    exceptions: ['Aggregated data (indefinite)']
  },
  {
    data_type: 'Payment Records',
    retention_period: '7 years',
    deletion_trigger: 'Automatic after 7 years',
    exceptions: ['Tax compliance', 'Dispute resolution']
  },
  {
    data_type: 'Deletion Logs',
    retention_period: '30 days',
    deletion_trigger: 'Automatic after 30 days',
    exceptions: ['Active recovery window']
  }
];
```

### 4.2 Automated Deletion

```typescript
// ✅ CORRECT: Implement automated data deletion
import cron from 'node-cron';

// Run daily at 2 AM UTC
cron.schedule('0 2 * * *', async () => {
  console.log('Running automated data deletion...');
  
  // Delete old audit logs (>90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db.auditLogs.delete({ created_at: { $lt: ninetyDaysAgo } });
  
  // Delete old analytics data (>90 days)
  await db.analytics.delete({ created_at: { $lt: ninetyDaysAgo } });
  
  // Delete old backups (>30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oldBackups = await s3.listObjectsV2({
    Bucket: 'familyhub-backups',
    Prefix: 'db-backups/'
  }).promise();
  
  for (const backup of oldBackups.Contents || []) {
    if (new Date(backup.LastModified) < thirtyDaysAgo) {
      await s3.deleteObject({
        Bucket: 'familyhub-backups',
        Key: backup.Key
      }).promise();
    }
  }
  
  // Delete deletion logs (>30 days)
  await db.deletionLogs.delete({ deleted_at: { $lt: thirtyDaysAgo } });
  
  console.log('Automated deletion completed');
});
```

### 4.3 Data Recovery Window

```typescript
// ✅ CORRECT: Allow account recovery within 30 days
async function recoverDeletedAccount(userId: string) {
  const deletionLog = await db.deletionLogs.findOne({ user_id: userId });
  
  if (!deletionLog) {
    throw new Error('Account not found');
  }
  
  if (new Date() > deletionLog.recovery_until) {
    throw new Error('Recovery window expired (30 days)');
  }
  
  // Restore from backup
  await restoreUserFromBackup(userId);
  
  // Remove deletion log
  await db.deletionLogs.delete({ user_id: userId });
  
  await auditLog.create({
    user_id: userId,
    action: 'ACCOUNT_RECOVERED',
    timestamp: new Date()
  });
}
```

---

## User Rights Implementation

### 5.1 Privacy Settings UI

```typescript
// ✅ CORRECT: Implement privacy controls in settings
interface PrivacySettings {
  user_id: string;
  
  // Data sharing
  share_with_family: boolean;
  share_location: boolean;
  share_activity_status: boolean;
  
  // Communications
  allow_messages: 'all' | 'family' | 'none';
  allow_video_calls: 'all' | 'family' | 'none';
  
  // Marketing
  marketing_emails: boolean;
  product_updates: boolean;
  
  // Analytics
  analytics_enabled: boolean;
  crash_reports: boolean;
  
  // Third-party
  third_party_integrations: boolean;
  
  updated_at: Date;
}

async function updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>) {
  const oldSettings = await db.privacySettings.findOne({ user_id: userId });
  
  await db.privacySettings.update({ user_id: userId }, settings);
  
  // Log changes
  await auditLog.create({
    user_id: userId,
    action: 'PRIVACY_SETTINGS_UPDATED',
    old_values: oldSettings,
    new_values: settings,
    timestamp: new Date()
  });
}
```

### 5.2 Consent Management

```typescript
// ✅ CORRECT: Track and manage user consents
interface ConsentRecord {
  user_id: string;
  consent_type: 'marketing' | 'analytics' | 'third_party' | 'cookies';
  granted: boolean;
  timestamp: Date;
  ip_address: string;
  user_agent: string;
  version: string; // Policy version
}

async function recordConsent(userId: string, consentType: string, granted: boolean, req: Request) {
  await db.consents.create({
    user_id: userId,
    consent_type: consentType,
    granted,
    timestamp: new Date(),
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    version: process.env.PRIVACY_POLICY_VERSION
  });
}

// Verify consent before processing
async function hasConsent(userId: string, consentType: string): Promise<boolean> {
  const consent = await db.consents.findOne(
    { user_id: userId, consent_type: consentType },
    { sort: { timestamp: -1 } }
  );
  
  return consent?.granted ?? false;
}
```

---

## Audit Logging & Monitoring

### 6.1 Comprehensive Audit Logging

```typescript
// ✅ CORRECT: Log all data access and modifications
interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values?: any;
  new_values?: any;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  status: 'success' | 'failure';
  error_message?: string;
}

async function auditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  await db.auditLogs.create({
    ...entry,
    id: generateId(),
    timestamp: new Date()
  });
}

// Middleware to log all API requests
app.use(async (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    await auditLog({
      user_id: req.user?.id || 'anonymous',
      action: `${req.method} ${req.path}`,
      resource_type: req.path.split('/')[1],
      resource_id: req.params.id || 'N/A',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: res.statusCode < 400 ? 'success' : 'failure',
      error_message: res.statusCode >= 400 ? res.statusMessage : undefined
    });
  });
  
  next();
});
```

### 6.2 Data Access Logging

```typescript
// ✅ CORRECT: Log sensitive data access
async function logDataAccess(userId: string, accessedUserId: string, dataType: string) {
  // Only log if accessing someone else's data
  if (userId !== accessedUserId) {
    await auditLog({
      user_id: userId,
      action: 'DATA_ACCESS',
      resource_type: 'user_data',
      resource_id: accessedUserId,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'success'
    });
  }
}

// Example: Log when support accesses user data
app.get('/api/admin/user/:userId/data', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user.id;
  
  await logDataAccess(adminId, userId, 'user_profile');
  
  const userData = await db.users.findById(userId);
  res.json(userData);
});
```

### 6.3 Monitoring & Alerts

```typescript
// ✅ CORRECT: Monitor for suspicious activity
async function monitorSuspiciousActivity() {
  // Alert on multiple failed login attempts
  const failedLogins = await db.auditLogs.find({
    action: 'LOGIN_FAILED',
    timestamp: { $gt: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
  });
  
  const groupedByUser = {};
  for (const log of failedLogins) {
    groupedByUser[log.user_id] = (groupedByUser[log.user_id] || 0) + 1;
  }
  
  for (const [userId, count] of Object.entries(groupedByUser)) {
    if (count > 5) {
      await sendSecurityAlert({
        type: 'BRUTE_FORCE_ATTEMPT',
        user_id: userId,
        attempt_count: count,
        timestamp: new Date()
      });
    }
  }
  
  // Alert on unusual data access patterns
  const dataAccess = await db.auditLogs.find({
    action: 'DATA_ACCESS',
    timestamp: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
  });
  
  const accessByUser = {};
  for (const log of dataAccess) {
    accessByUser[log.user_id] = (accessByUser[log.user_id] || 0) + 1;
  }
  
  for (const [userId, count] of Object.entries(accessByUser)) {
    if (count > 100) { // Threshold
      await sendSecurityAlert({
        type: 'UNUSUAL_DATA_ACCESS',
        user_id: userId,
        access_count: count,
        timestamp: new Date()
      });
    }
  }
}

// Run monitoring every 5 minutes
cron.schedule('*/5 * * * *', monitorSuspiciousActivity);
```

---

## Third-Party Data Sharing

### 7.1 Service Provider Vetting

```typescript
// ✅ CORRECT: Document and vet all service providers
interface ServiceProvider {
  name: string;
  purpose: string;
  data_categories: string[];
  location: string;
  dpa_signed: boolean;
  dpa_date: Date;
  certifications: string[];
  sub_processors: string[];
  contact: string;
  review_date: Date;
}

const serviceProviders: ServiceProvider[] = [
  {
    name: 'Clerk',
    purpose: 'Authentication & user management',
    data_categories: ['Email', 'Name', 'Profile picture'],
    location: 'United States',
    dpa_signed: true,
    dpa_date: new Date('2026-01-15'),
    certifications: ['SOC 2 Type II', 'GDPR compliant'],
    sub_processors: [],
    contact: 'legal@clerk.dev',
    review_date: new Date('2027-01-15')
  },
  {
    name: 'Stripe',
    purpose: 'Payment processing',
    data_categories: ['Billing address', 'Payment method (tokenized)'],
    location: 'United States',
    dpa_signed: true,
    dpa_date: new Date('2026-01-15'),
    certifications: ['PCI-DSS', 'SOC 2 Type II', 'GDPR compliant'],
    sub_processors: [],
    contact: 'legal@stripe.com',
    review_date: new Date('2027-01-15')
  },
  {
    name: 'AWS S3',
    purpose: 'Media storage',
    data_categories: ['Photos', 'Videos', 'Files'],
    location: 'United States',
    dpa_signed: true,
    dpa_date: new Date('2026-01-15'),
    certifications: ['SOC 2 Type II', 'GDPR compliant', 'ISO 27001'],
    sub_processors: [],
    contact: 'legal@amazon.com',
    review_date: new Date('2027-01-15')
  }
];
```

### 7.2 Data Processing Agreements (DPA)

```typescript
// ✅ CORRECT: Maintain DPAs with all processors
interface DataProcessingAgreement {
  processor_name: string;
  effective_date: Date;
  expiry_date: Date;
  data_categories: string[];
  processing_purposes: string[];
  sub_processors_allowed: boolean;
  sub_processors_list: string[];
  data_subject_rights: string[];
  audit_rights: boolean;
  liability_cap: string;
  termination_clause: string;
  signed_by: string;
}

async function verifyDPACompliance() {
  const dpas = await db.dpas.find({});
  
  for (const dpa of dpas) {
    if (new Date() > dpa.expiry_date) {
      console.warn(`DPA expired for ${dpa.processor_name}`);
      // Trigger renewal process
    }
  }
}
```

---

## Incident Response

### 8.1 Data Breach Response Plan

```typescript
// ✅ CORRECT: Implement incident response procedures
interface DataBreach {
  id: string;
  discovered_at: Date;
  reported_at: Date;
  affected_users: number;
  data_categories: string[];
  root_cause: string;
  remediation: string;
  notification_sent: boolean;
  notification_date?: Date;
  regulatory_report_sent: boolean;
  regulatory_report_date?: Date;
}

async function reportDataBreach(breach: Omit<DataBreach, 'id'>) {
  const breachId = generateId();
  
  // Store breach record
  await db.breaches.create({
    id: breachId,
    ...breach
  });
  
  // Notify affected users (within 72 hours)
  const affectedUsers = await getAffectedUsers(breach.data_categories);
  for (const user of affectedUsers) {
    await sendBreachNotification(user, breach);
  }
  
  // Report to regulators (within 72 hours for GDPR)
  if (breach.affected_users > 100) {
    await reportToRegulators(breach);
  }
  
  // Log incident
  await auditLog({
    user_id: 'system',
    action: 'DATA_BREACH_REPORTED',
    resource_type: 'security_incident',
    resource_id: breachId,
    ip_address: 'N/A',
    user_agent: 'N/A',
    status: 'success'
  });
}
```

### 8.2 Breach Notification Template

```typescript
// ✅ CORRECT: Notify users of data breaches
async function sendBreachNotification(user: User, breach: DataBreach) {
  const emailContent = `
Dear ${user.name},

We are writing to inform you of a security incident that may have affected your account.

**What Happened:**
${breach.root_cause}

**What Data Was Affected:**
${breach.data_categories.join(', ')}

**What We're Doing:**
${breach.remediation}

**What You Should Do:**
1. Change your password immediately
2. Enable two-factor authentication
3. Monitor your account for suspicious activity
4. Contact us if you have questions

**Contact Us:**
If you have any questions, please contact our security team at security@familyhub.app

Sincerely,
FamilyHub Security Team
  `;
  
  await sendEmail({
    to: user.email,
    subject: 'Important Security Notice',
    body: emailContent
  });
}
```

---

## Implementation Checklist

### Phase 1: Foundation (Weeks 1-4)

- [ ] **Data Classification**
  - [ ] Document all data types and sensitivity levels
  - [ ] Create data flow diagrams
  - [ ] Identify Tier 1, 2, 3 data

- [ ] **Encryption**
  - [ ] Implement AES-256 encryption for Tier 1/2 data
  - [ ] Enable HTTPS/TLS 1.3 for all APIs
  - [ ] Implement password hashing with Argon2
  - [ ] Enable S3 server-side encryption

- [ ] **Key Management**
  - [ ] Set up key storage (KMS or environment variables)
  - [ ] Implement key rotation procedures
  - [ ] Document key management policies

### Phase 2: GDPR Compliance (Weeks 5-8)

- [ ] **Data Subject Rights**
  - [ ] Implement data export functionality
  - [ ] Implement account deletion with purging
  - [ ] Implement data rectification
  - [ ] Implement data portability
  - [ ] Implement opt-out mechanisms

- [ ] **Consent Management**
  - [ ] Implement consent recording
  - [ ] Create privacy settings UI
  - [ ] Implement consent verification
  - [ ] Document legal basis for processing

- [ ] **DPIA**
  - [ ] Conduct Data Protection Impact Assessments
  - [ ] Document high-risk processing
  - [ ] Implement mitigations

### Phase 3: Audit & Monitoring (Weeks 9-12)

- [ ] **Audit Logging**
  - [ ] Implement comprehensive audit logging
  - [ ] Log all data access
  - [ ] Log all modifications
  - [ ] Implement log retention policies

- [ ] **Monitoring**
  - [ ] Set up suspicious activity alerts
  - [ ] Monitor failed login attempts
  - [ ] Monitor unusual data access
  - [ ] Implement 24/7 monitoring

- [ ] **Incident Response**
  - [ ] Create incident response plan
  - [ ] Implement breach notification procedures
  - [ ] Document regulatory reporting procedures
  - [ ] Test incident response

### Phase 4: Third-Party Management (Weeks 13-16)

- [ ] **Service Provider Vetting**
  - [ ] Document all service providers
  - [ ] Verify DPA signatures
  - [ ] Review certifications
  - [ ] Implement sub-processor tracking

- [ ] **Data Sharing Controls**
  - [ ] Implement data sharing agreements
  - [ ] Document data flows to third parties
  - [ ] Implement data minimization
  - [ ] Regular audits of third-party access

### Phase 5: Testing & Documentation (Weeks 17-20)

- [ ] **Testing**
  - [ ] Test data export functionality
  - [ ] Test account deletion
  - [ ] Test encryption
  - [ ] Test audit logging
  - [ ] Test incident response

- [ ] **Documentation**
  - [ ] Create implementation guide (this document)
  - [ ] Create operational procedures
  - [ ] Create incident response playbook
  - [ ] Create staff training materials

---

## Compliance Verification

### Regulatory Checklist

**GDPR (EU)**
- [ ] Legal basis documented for all processing
- [ ] Data subject rights implemented
- [ ] DPA in place with all processors
- [ ] DPIA conducted for high-risk processing
- [ ] Breach notification procedures in place
- [ ] Data Protection Officer appointed

**CCPA (California)**
- [ ] Privacy policy updated with CCPA rights
- [ ] Data access requests implemented
- [ ] Data deletion requests implemented
- [ ] Opt-out mechanisms implemented
- [ ] Non-discrimination policy in place

**COPPA (Children)**
- [ ] Parental consent for users under 13
- [ ] Age verification implemented
- [ ] No marketing to children
- [ ] Parental access to child data
- [ ] Data deletion for children

**LGPD (Brazil)**
- [ ] Legal basis documented
- [ ] Data subject rights implemented
- [ ] Data Protection Officer appointed
- [ ] Breach notification procedures

**PIPEDA (Canada)**
- [ ] Consent obtained for collection
- [ ] Data accuracy maintained
- [ ] Data security implemented
- [ ] Access requests implemented
- [ ] Complaint procedures in place

---

## References & Resources

- [GDPR Official Text](https://gdpr-info.eu/)
- [CCPA Official Text](https://oag.ca.gov/privacy/ccpa)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ISO 27001 Standard](https://www.iso.org/isoiec-27001-information-security-management.html)

---

## Document Control

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Status** | ✅ Active |
| **Last Updated** | February 28, 2026 |
| **Next Review** | February 28, 2027 |
| **Owner** | Data Protection Officer |
| **Approver** | Legal Team |

---

**This guide is a living document. Update it as regulations change, new technologies are adopted, or incidents occur.**

*Last reviewed by: Legal & Security Team*  
*Next review date: February 28, 2027*
