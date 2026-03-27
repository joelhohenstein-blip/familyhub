import { generateModerationSummary } from './openai.service';
import { VIOLATION_THRESHOLDS } from './moderation.service';

interface ContentAnalysisRequest {
  content: string;
  contentType: 'message' | 'media';
  violationScore?: number;
  detectedReasons?: string[];
}

interface AdvancedAnalysisResult {
  summary: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: 'approve' | 'review' | 'reject';
  keyIssues: string[];
}

/**
 * Perform advanced content analysis using OpenAI Chat API
 * Integrates moderation results into decision making
 */
export async function analyzeContentForModeration(
  request: ContentAnalysisRequest
): Promise<AdvancedAnalysisResult> {
  try {
    // Generate AI summary
    const summary = await generateModerationSummary(request.content, request.contentType);
    
    // Determine severity based on violation score and detected reasons
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (request.violationScore !== undefined) {
      if (request.violationScore >= VIOLATION_THRESHOLDS.HIGH) {
        severity = 'high';
      } else if (request.violationScore >= VIOLATION_THRESHOLDS.MEDIUM) {
        severity = 'medium';
      }
    }
    
    // Determine recommendation
    let recommendation: 'approve' | 'review' | 'reject' = 'approve';
    if (severity === 'high') {
      recommendation = 'reject';
    } else if (severity === 'medium' || (request.detectedReasons && request.detectedReasons.length > 0)) {
      recommendation = 'review';
    }
    
    // Extract key issues from detected reasons
    const keyIssues = request.detectedReasons || [];
    
    return {
      summary,
      severity,
      recommendation,
      keyIssues,
    };
  } catch (error) {
    console.error('Error in advanced content analysis:', error);
    
    // On error, default to conservative recommendation
    return {
      summary: 'Unable to perform AI analysis. Content requires manual review.',
      severity: 'medium',
      recommendation: 'review',
      keyIssues: ['AI analysis failed - requires human review'],
    };
  }
}

/**
 * Generate moderation decision with confidence scores
 */
export async function generateModerationDecision(
  contentId: string,
  contentType: 'message' | 'media',
  content: string,
  violationScore: number,
  detectedReasons: string[]
): Promise<{
  decision: 'approved' | 'rejected' | 'pending_review';
  confidence: number;
  explanation: string;
  summary: string;
}> {
  try {
    const analysis = await analyzeContentForModeration({
      content,
      contentType,
      violationScore,
      detectedReasons,
    });
    
    let decision: 'approved' | 'rejected' | 'pending_review';
    let confidence: number;
    
    switch (analysis.recommendation) {
      case 'approve':
        decision = 'approved';
        confidence = Math.max(1 - violationScore, 0.5);
        break;
      case 'reject':
        decision = 'rejected';
        confidence = violationScore;
        break;
      case 'review':
        decision = 'pending_review';
        confidence = 0.5;
        break;
    }
    
    return {
      decision,
      confidence,
      explanation: `${analysis.summary} (Severity: ${analysis.severity})`,
      summary: analysis.summary,
    };
  } catch (error) {
    console.error('Error generating moderation decision:', error);
    
    // Default to pending review on error
    return {
      decision: 'pending_review',
      confidence: 0.5,
      explanation: 'Error during automated analysis. Content flagged for manual review.',
      summary: 'Unable to perform analysis',
    };
  }
}

/**
 * Batch analyze multiple content items
 */
export async function batchAnalyzeContent(
  items: Array<{
    id: string;
    content: string;
    type: 'message' | 'media';
    score: number;
    reasons: string[];
  }>
): Promise<
  Array<{
    id: string;
    analysis: AdvancedAnalysisResult;
  }>
> {
  const results: Array<{ id: string; analysis: AdvancedAnalysisResult }> = [];
  
  for (const item of items) {
    try {
      const analysis = await analyzeContentForModeration({
        content: item.content,
        contentType: item.type,
        violationScore: item.score,
        detectedReasons: item.reasons,
      });
      
      results.push({
        id: item.id,
        analysis,
      });
    } catch (error) {
      console.error(`Error analyzing item ${item.id}:`, error);
      results.push({
        id: item.id,
        analysis: {
          summary: 'Analysis failed',
          severity: 'medium' as const,
          recommendation: 'review' as const,
          keyIssues: [],
        },
      });
    }
  }
  
  return results;
}

export default {
  analyzeContentForModeration,
  generateModerationDecision,
  batchAnalyzeContent,
};
