import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Fallback generic tags for when Vision API fails or returns no tags
const FALLBACK_TAGS = ['photo', 'image', 'family'];

// Maximum number of tags to extract per photo
const MAX_TAGS = 10;

// Timeout for Vision API call (2 seconds)
const VISION_API_TIMEOUT_MS = 2000;

/**
 * Extract tags from a photo using OpenAI Vision API
 * Analyzes the image content and returns relevant descriptive tags
 * @param imageUrl - The URL of the image to analyze
 * @returns Array of tag strings extracted from the image
 */
export async function extractPhotoTags(imageUrl: string): Promise<string[]> {
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Vision API request timed out')), VISION_API_TIMEOUT_MS)
    );

    // Race between the API call and timeout
    const response = await Promise.race([
      openai.chat.completions.create({
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
                text: `Analyze this image and extract a list of descriptive tags. 
Focus on: people (names if recognizable), objects, animals, scenes, activities, and emotions.
Return ONLY a JSON object with a "tags" field containing an array of short tag strings (1-3 words each, lowercase, max ${MAX_TAGS} tags).
Example: {"tags": ["smiling", "outdoors", "family", "park"]}
Be concise and descriptive.`,
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
      timeoutPromise,
    ]);

    // Extract content from response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn('No response from Vision API, using fallback tags');
      return FALLBACK_TAGS;
    }

    // Parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('Could not parse JSON from Vision API response, using fallback tags');
        return FALLBACK_TAGS;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const tags = parsed.tags || [];

      // Validate and sanitize tags
      const sanitizedTags = tags
        .filter((tag: unknown) => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.trim().toLowerCase().slice(0, 50)) // Limit tag length
        .slice(0, MAX_TAGS); // Limit number of tags

      return sanitizedTags.length > 0 ? sanitizedTags : FALLBACK_TAGS;
    } catch (parseError) {
      console.warn('Failed to parse Vision API JSON response:', parseError);
      return FALLBACK_TAGS;
    }
  } catch (error) {
    console.error('Error extracting photo tags:', error);
    // Return fallback tags on any error
    return FALLBACK_TAGS;
  }
}

export default {
  extractPhotoTags,
};
