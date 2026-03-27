import Anthropic from "@anthropic-ai/sdk";

export interface FaceDetectionResult {
  faceCount: number;
  faces: Array<{
    id: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    description?: string;
  }>;
  imageWidth?: number;
  imageHeight?: number;
  processingTime?: number;
}

export interface FaceDetectionError {
  code: string;
  message: string;
  details?: string;
}

/**
 * Initialize Anthropic client for Claude Vision API
 */
function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

/**
 * Convert image URL or buffer to base64 data URL for Claude Vision API
 */
async function imageToBase64(imageSource: string | Buffer): Promise<string> {
  if (typeof imageSource === "string") {
    // If it's a URL, fetch the image
    if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
      const response = await fetch(imageSource);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    }
    // If it's already base64, return as-is
    return imageSource;
  }
  // If it's a buffer, convert to base64
  return imageSource.toString("base64");
}

/**
 * Detect faces in an image using Claude Vision API
 * @param imageSource - Image URL, file path, or buffer
 * @param imageMediaType - MIME type of the image (e.g., 'image/jpeg', 'image/png')
 * @returns Face detection results with confidence scores and bounding boxes
 */
export async function detectFacesInImage(
  imageSource: string | Buffer,
  imageMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg"
): Promise<FaceDetectionResult | FaceDetectionError> {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();

    // Convert image to base64
    const base64Image = await imageToBase64(imageSource);

    // Call Claude Vision API with face detection prompt
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `Analyze this image and detect all human faces. For each face detected, provide:
1. A confidence score (0-1) indicating how confident you are it's a face
2. The approximate bounding box coordinates as percentages of image dimensions (x, y, width, height as 0-1 values)
3. A brief description if possible

Return the response in this exact JSON format:
{
  "faceCount": <number>,
  "faces": [
    {
      "id": "<unique_id>",
      "confidence": <0-1>,
      "boundingBox": {
        "x": <0-1>,
        "y": <0-1>,
        "width": <0-1>,
        "height": <0-1>
      },
      "description": "<optional description>"
    }
  ]
}

If no faces are detected, return faceCount: 0 with an empty faces array.`,
            },
          ],
        },
      ],
    });

    // Extract the text response
    const textContent = response.content.find((block: any) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        code: "NO_TEXT_RESPONSE",
        message: "Claude Vision API did not return text response",
      };
    }

    // Parse the JSON response
    let detectionResult: FaceDetectionResult;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          code: "INVALID_JSON",
          message: "Could not extract JSON from Claude response",
          details: textContent.text,
        };
      }

      detectionResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      return {
        code: "JSON_PARSE_ERROR",
        message: "Failed to parse Claude Vision API response",
        details: textContent.text,
      };
    }

    // Add processing metadata
    detectionResult.processingTime = Date.now() - startTime;

    return detectionResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      code: "DETECTION_ERROR",
      message: "Face detection failed",
      details: errorMessage,
    };
  }
}

/**
 * Batch detect faces in multiple images
 * @param imageSources - Array of image URLs or buffers
 * @param imageMediaType - MIME type of the images
 * @returns Array of face detection results
 */
export async function detectFacesInBatch(
  imageSources: (string | Buffer)[],
  imageMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg"
): Promise<(FaceDetectionResult | FaceDetectionError)[]> {
  return Promise.all(
    imageSources.map((source) => detectFacesInImage(source, imageMediaType))
  );
}

/**
 * Check if a face detection result contains errors
 */
export function isDetectionError(
  result: FaceDetectionResult | FaceDetectionError
): result is FaceDetectionError {
  return "code" in result && "message" in result;
}

/**
 * Get face count from detection result
 */
export function getFaceCount(result: FaceDetectionResult | FaceDetectionError): number {
  if (isDetectionError(result)) {
    return 0;
  }
  return result.faceCount;
}

/**
 * Wrapper function for face detection - delegates to detectFacesInImage
 */
export async function detectFaces(
  imageSource: string | Buffer,
  imageMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg"
): Promise<FaceDetectionResult | FaceDetectionError> {
  return detectFacesInImage(imageSource, imageMediaType);
}
