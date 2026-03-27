import { messageModerationLogs } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { detectObfuscatedProfanity, moderateText } from './openai.service';
import type { PgDatabase } from 'drizzle-orm/pg-core';

// List of prohibited keywords (can be extended)
const PROHIBITED_KEYWORDS: string[] = [
  // Add prohibited keywords here
  // Examples: specific slurs, hate speech indicators, etc.
];

// Behavior patterns to detect
const BEHAVIOR_PATTERNS = [
  /harassment|bullying|threats/i,
  /hate|discrimination|racism/i,
  /spam|scam|phishing/i,
];

// Violation score thresholds
export const VIOLATION_THRESHOLDS = {
  LOW: 0.3,      // 30% confidence = flag for review
  MEDIUM: 0.6,   // 60% confidence = likely violation
  HIGH: 0.85,    // 85% confidence = definite violation
};

interface ScanResult {
  flagged: boolean;
  score: number;
  reasons: string[];
  obfuscationDetected: boolean;
  normalizedText: string;
}

/**
 * Scan a message for prohibited content
 * Returns violation score and flags for manual review
 */
export async function scanMessage(messageContent: string, userId: string): Promise<ScanResult> {
  const reasons: string[] = [];
  let score = 0;
  let obfuscationDetected = false;
  let normalizedText = messageContent;

  // Check for keyword matches
  for (const keyword of PROHIBITED_KEYWORDS) {
    if (new RegExp(keyword, 'i').test(messageContent)) {
      reasons.push(`Contains prohibited keyword: "${keyword}"`);
      score += 0.2;
    }
  }

  // Check for behavior patterns
  for (const pattern of BEHAVIOR_PATTERNS) {
    if (pattern.test(messageContent)) {
      reasons.push(`Matches behavior pattern: ${pattern.source}`);
      score += 0.15;
    }
  }

  // Use OpenAI moderation API for deeper analysis
  try {
    const moderationResult = await moderateText(messageContent);
    if (moderationResult.flagged) {
      reasons.push('Flagged by OpenAI moderation API');
      
      // Calculate score from category results
      const categoryScores = Object.values(moderationResult.scores);
      const avgScore = categoryScores.length > 0 
        ? categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length 
        : 0;
      
      score = Math.max(score, avgScore);
    }
  } catch (error) {
    console.error('Error calling OpenAI moderation API:', error);
    // Continue without OpenAI results on error
  }

  // Detect obfuscated profanity
  try {
    const obfuscationResult = await detectObfuscatedProfanity(messageContent);
    if (obfuscationResult.detected) {
      obfuscationDetected = true;
      normalizedText = obfuscationResult.normalizedText;
      reasons.push('Obfuscated profanity detected');
      score = Math.max(score, obfuscationResult.confidence);
    }
  } catch (error) {
    console.error('Error detecting obfuscated profanity:', error);
    // Continue without obfuscation detection on error
  }

  // Normalize score to 0-1 range
  score = Math.min(score, 1);

  const flagged = score >= VIOLATION_THRESHOLDS.LOW;

  return {
    flagged,
    score,
    reasons,
    obfuscationDetected,
    normalizedText,
  };
}

/**
 * Log a message moderation event in the database
 */
export async function logMessageModeration(
  db: PgDatabase<any>,
  messageId: string,
  userId: string,
  content: string,
  scanResult: ScanResult
) {
  try {
    await db.insert(messageModerationLogs).values({
      messageId,
      userId,
      content,
      flagged: scanResult.flagged,
      score: scanResult.score,
      reasons: scanResult.reasons,
      obfuscationDetected: scanResult.obfuscationDetected,
      normalizedText: scanResult.normalizedText,
      status: scanResult.score >= VIOLATION_THRESHOLDS.HIGH ? 'flagged_auto' : 'pending_review',
      reviewedAt: null,
      reviewedBy: null,
      reviewReason: null,
    });
  } catch (error) {
    console.error('Error logging message moderation:', error);
    throw error;
  }
}

/**
 * Get flagged messages pending review
 */
export async function getFlaggedMessages(
  db: PgDatabase<any>,
  status?: 'pending_review' | 'flagged_auto' | 'approved' | 'rejected',
  limit: number = 50,
  offset: number = 0
) {
  try {
    let query: any = db.select().from(messageModerationLogs);
    
    if (status) {
      query = query.where(eq(messageModerationLogs.status, status));
    }
    
    const results = await query
      .orderBy(messageModerationLogs.createdAt)
      .limit(limit)
      .offset(offset);
    
    return results;
  } catch (error) {
    console.error('Error fetching flagged messages:', error);
    throw error;
  }
}

/**
 * Update moderation decision for a message
 */
export async function updateMessageModerationDecision(
  db: PgDatabase<any>,
  logId: string,
  decision: 'approved' | 'rejected',
  reviewReason: string,
  reviewedBy: string
) {
  try {
    await db
      .update(messageModerationLogs)
      .set({
        status: decision,
        reviewedBy,
        reviewReason,
        reviewedAt: new Date(),
      })
      .where(eq(messageModerationLogs.id, logId));
  } catch (error) {
    console.error('Error updating message moderation decision:', error);
    throw error;
  }
}

/**
 * Check if a message has already been reviewed
 */
export async function isMessageAlreadyReviewed(db: PgDatabase<any>, messageId: string): Promise<boolean> {
  try {
    const result: any = await db
      .select()
      .from(messageModerationLogs)
      .where(eq(messageModerationLogs.messageId, messageId))
      .limit(1);
    
    return result.length > 0 && result[0]?.reviewedAt !== null;
  } catch (error) {
    console.error('Error checking if message was reviewed:', error);
    return false;
  }
}

export default {
  scanMessage,
  logMessageModeration,
  getFlaggedMessages,
  updateMessageModerationDecision,
  isMessageAlreadyReviewed,
};
