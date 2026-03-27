import OpenAI from 'openai';

// Lazy initialize OpenAI client
let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Simple in-memory rate limiting for OpenAI API
const requestTimestamps: number[] = [];
const RATE_LIMIT = 10; // requests
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove old timestamps outside the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }
  
  if (requestTimestamps.length >= RATE_LIMIT) {
    return false;
  }
  
  requestTimestamps.push(now);
  return true;
}

// Exponential backoff retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check rate limit
      if (!checkRateLimit()) {
        throw new Error('Rate limit exceeded for OpenAI API');
      }
      
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (
        error instanceof OpenAI.APIError &&
        (error.status === 429 || error.status === 500 || error.status === 503)
      ) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        console.warn(
          `OpenAI API error (attempt ${attempt + 1}/${maxRetries}): ${error.message}. Retrying in ${delayMs}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Unknown error in OpenAI API call');
}

// Scan text content for moderation
export async function moderateText(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
}> {
  return withRetry(async () => {
    const client = getOpenAI();
    if (!client) throw new Error('OpenAI client not initialized');
    const response = await client.moderations.create({
      input: text,
      model: 'text-moderation-007',
    });
    
    const result = response.results[0];
    return {
      flagged: result.flagged,
      categories: result.categories as unknown as Record<string, boolean>,
      scores: result.category_scores as unknown as Record<string, number>,
    };
  });
}

// Analyze image for explicit/disallowed content using Vision API
export async function analyzeImageContent(imageUrl: string): Promise<{
  isExplicit: boolean;
  analysis: string;
  confidence: number;
}> {
  return withRetry(async () => {
    const client = getOpenAI();
    if (!client) throw new Error('OpenAI client not initialized');
    const response = await client.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `Analyze this image for:
1. Explicit or adult content
2. Violence or graphic imagery
3. Hate symbols or supremacist content
4. Other policy violations

Respond with JSON: { isExplicit: boolean, reason: string, confidence: 0-1 }`,
            },
          ],
        },
      ],
      max_tokens: 200,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Vision API');
    }
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isExplicit: false,
        analysis: content,
        confidence: 0.5,
      };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      isExplicit: parsed.isExplicit ?? false,
      analysis: parsed.reason ?? content,
      confidence: parsed.confidence ?? 0.5,
    };
  });
}

// Get AI summary of content for moderation review
export async function generateModerationSummary(content: string, contentType: 'message' | 'media'): Promise<string> {
  return withRetry(async () => {
    const client = getOpenAI();
    if (!client) throw new Error('OpenAI client not initialized');
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a content moderation assistant. Provide a brief, factual summary (max 100 words) of the key concerns about this ${contentType} content for review by a human moderator.`,
        },
        {
          role: 'user',
          content: `${contentType.toUpperCase()} CONTENT:\n\n${content.substring(0, 1000)}`,
        },
      ],
      max_tokens: 150,
    });
    
    return response.choices[0]?.message?.content || 'Unable to generate summary';
  });
}

// Detect obfuscated profanity using AI
export async function detectObfuscatedProfanity(text: string): Promise<{
  detected: boolean;
  normalizedText: string;
  confidence: number;
}> {
  return withRetry(async () => {
    const client = getOpenAI();
    if (!client) throw new Error('OpenAI client not initialized');
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a content moderation AI. Detect obfuscated, misspelled, or encoded profanity and policy violations.
Respond with JSON: { detected: boolean, normalizedText: string (with violations clarified), confidence: 0-1 }`,
        },
        {
          role: 'user',
          content: `Check for obfuscated profanity: "${text}"`,
        },
      ],
      max_tokens: 300,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { detected: false, normalizedText: text, confidence: 0 };
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { detected: false, normalizedText: text, confidence: 0 };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      detected: parsed.detected ?? false,
      normalizedText: parsed.normalizedText ?? text,
      confidence: parsed.confidence ?? 0,
    };
  });
}

export default openai;
