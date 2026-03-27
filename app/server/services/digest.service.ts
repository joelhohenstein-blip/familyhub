import OpenAI from 'openai';
import { db } from '~/db/index.server';
import { familyDigests, conversationMessagesTable, conversationsTable, familyMembers } from '~/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

// Initialize OpenAI client
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Exponential backoff retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (
        error instanceof OpenAI.APIError &&
        (error.status === 429 || error.status === 500 || error.status === 503)
      ) {
        const delayMs = 1000 * Math.pow(2, attempt);
        console.warn(
          `OpenAI API error (attempt ${attempt + 1}/${maxRetries}): ${error.message}. Retrying in ${delayMs}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Unknown error generating digest');
}

// Fetch recent messages for a family within a date range
async function fetchFamilyMessages(
  familyId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ author: string; content: string; timestamp: Date }>> {
  try {
    // First, get all conversations for the family
    const conversations = await db.query.conversationsTable.findMany({
      where: eq(conversationsTable.familyId, familyId),
      columns: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    if (conversationIds.length === 0) {
      return [];
    }

    // Then fetch messages from those conversations within the date range
    const messages = await db.query.conversationMessagesTable.findMany({
      where: and(
        inArray(conversationMessagesTable.conversationId, conversationIds),
        gte(conversationMessagesTable.createdAt, startDate),
        lte(conversationMessagesTable.createdAt, endDate)
      ),
      limit: 100,
      orderBy: conversationMessagesTable.createdAt,
      with: {
        author: {
          columns: { id: true },
        },
      },
    });

    return messages.map((msg: any) => ({
      author: `User ${msg.senderId.substring(0, 8)}`,
      content: msg.content,
      timestamp: msg.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching family messages:', error);
    return [];
  }
}

// Generate a placeholder summary when AI fails or no messages exist
function generatePlaceholderSummary(startDate: Date, endDate: Date): string {
  const start = startDate.toLocaleDateString();
  const end = endDate.toLocaleDateString();
  return `Family Digest (${start} - ${end})\n\nNo recent activities to summarize. Check back soon for family updates and conversations.`;
}

// Generate a concise AI summary of family conversations
export async function generateFamilyDigest(
  familyId: string,
  startDate: Date,
  endDate: Date
): Promise<{ title: string; content: string }> {
  try {
    // Fetch messages within date range
    const messages = await fetchFamilyMessages(familyId, startDate, endDate);

    // If no messages, return placeholder
    if (messages.length === 0) {
      const placeholder = generatePlaceholderSummary(startDate, endDate);
      return {
        title: `Family Digest: ${startDate.toLocaleDateString()}`,
        content: placeholder,
      };
    }

    // Prepare message content for AI
    const messagesSummary = messages
      .slice(0, 50) // Limit to last 50 messages for context
      .map((msg) => `${msg.author}: ${msg.content}`)
      .join('\n');

    // Generate summary using OpenAI with retry
    const summary = await withRetry(async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a family digest assistant. Create a warm, friendly summary of family conversations and activities. 
Focus on key topics, important announcements, and highlights. Keep the tone positive and inclusive.
Format the response with clear sections: Key Conversations, Important Updates, and Highlights.
Keep it concise but meaningful (max 500 words).`,
          },
          {
            role: 'user',
            content: `Please summarize these recent family messages:\n\n${messagesSummary}`,
          },
        ],
        max_tokens: 600,
      });

      return response.choices[0]?.message?.content || '';
    });

    if (!summary) {
      const placeholder = generatePlaceholderSummary(startDate, endDate);
      return {
        title: `Family Digest: ${startDate.toLocaleDateString()}`,
        content: placeholder,
      };
    }

    return {
      title: `Family Digest: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      content: summary,
    };
  } catch (error) {
    console.error('Error generating family digest:', error);
    // Return placeholder on error
    const placeholder = generatePlaceholderSummary(startDate, endDate);
    return {
      title: `Family Digest: ${startDate.toLocaleDateString()}`,
      content: placeholder,
    };
  }
}

// Save a digest to the database
export async function saveDigest(
  familyId: string,
  title: string,
  content: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const digest = await db
      .insert(familyDigests)
      .values({
        familyId,
        title,
        content,
        startDate,
        endDate,
      })
      .returning();

    return digest[0];
  } catch (error) {
    console.error('Error saving digest:', error);
    throw new Error('Failed to save digest');
  }
}

// Retrieve a digest by ID
export async function getDigestById(digestId: string) {
  try {
    const digest = await db.query.familyDigests.findFirst({
      where: eq(familyDigests.id, digestId),
      with: {
        family: {
          columns: { id: true, surname: true },
        },
      },
    });

    return digest;
  } catch (error) {
    console.error('Error retrieving digest:', error);
    throw new Error('Failed to retrieve digest');
  }
}

// Retrieve digests for a family within a date range
export async function getDigestsByDateRange(
  familyId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const digests = await db.query.familyDigests.findMany({
      where: and(
        eq(familyDigests.familyId, familyId),
        gte(familyDigests.startDate, startDate),
        lte(familyDigests.endDate, endDate)
      ),
      orderBy: familyDigests.createdAt,
    });

    return digests;
  } catch (error) {
    console.error('Error retrieving digests:', error);
    throw new Error('Failed to retrieve digests');
  }
}
