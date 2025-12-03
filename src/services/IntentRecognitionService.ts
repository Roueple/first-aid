/**
 * IntentRecognitionService
 * 
 * Uses LLM to understand user intent from natural language queries.
 * Handles variations in wording that express the same intent.
 * 
 * Examples:
 * - "show me critical findings 2024"
 * - "show me severity critical 2024"
 * - "show me highest risk findings 2024"
 * All should be recognized as: intent to find Critical severity findings from 2024
 */

import { sendMessageToGemini, isGeminiConfigured } from './GeminiService';
import { ExtractedFilters } from '../types/queryRouter.types';
import { FindingSeverity, FindingStatus, ProjectType } from '../types/finding.types';

export interface RecognizedIntent {
  /** Normalized intent description */
  intent: string;
  
  /** Extracted filters from the intent */
  filters: ExtractedFilters;
  
  /** Whether the query requires analytical reasoning */
  requiresAnalysis: boolean;
  
  /** Confidence score 0-1 */
  confidence: number;
  
  /** Original query for reference */
  originalQuery: string;
}

export class IntentRecognitionService {
  /**
   * Recognize user intent using LLM
   * @param maskedQuery - Query with sensitive data masked
   * @returns Recognized intent with normalized filters
   */
  async recognizeIntent(maskedQuery: string): Promise<RecognizedIntent> {
    if (!isGeminiConfigured()) {
      // Fallback to pattern-based recognition if LLM not available
      return this.fallbackRecognition(maskedQuery);
    }

    try {
      const prompt = this.buildIntentPrompt(maskedQuery);
      const response = await sendMessageToGemini(prompt, 'low');
      
      return this.parseIntentResponse(response, maskedQuery);
    } catch (error) {
      console.error('Intent recognition error:', error);
      // Fallback to pattern-based recognition
      return this.fallbackRecognition(maskedQuery);
    }
  }

  /**
   * Build prompt for intent recognition
   */
  private buildIntentPrompt(query: string): string {
    return `You are an intent recognition system for an audit findings database. Analyze the user's query and extract:

1. The core intent (what they want to know/do)
2. Filters to apply (severity, status, year, project type, department, keywords)
3. Whether they need analysis/reasoning (vs just data retrieval)

User Query: "${query}"

Respond in JSON format:
{
  "intent": "brief description of what user wants",
  "filters": {
    "severity": ["Critical", "High", "Medium", "Low"] or null,
    "status": ["Open", "In Progress", "Closed", "Deferred"] or null,
    "year": 2024 or null,
    "projectType": "Hotel" or null,
    "department": "string" or null,
    "keywords": ["word1", "word2"] or null
  },
  "requiresAnalysis": true/false,
  "confidence": 0.0-1.0
}

CRITICAL RULES FOR DEPARTMENT EXTRACTION:
- Common departments: IT, HR, Finance, Accounting, Marketing, Sales, Operations, Legal, Procurement, Admin, Engineering, R&D
- If user mentions a department name (e.g., "IT findings", "HR department", "Finance issues"), extract it to "department" field
- Department names are case-insensitive but should be returned in proper case (e.g., "IT", "HR", "Finance")
- DO NOT put department names in "keywords" - they belong in "department" field
- Examples:
  * "show me IT findings" → department: "IT", keywords: null
  * "HR department issues 2024" → department: "HR", year: 2024, keywords: null
  * "Finance critical findings" → department: "Finance", severity: ["Critical"], keywords: null

Valid severity values: Critical, High, Medium, Low
Valid status values: Open, In Progress, Closed, Deferred
Valid project types: Hotel, Landed House, Apartment, School, University, Insurance, Hospital, Clinic, Mall, Office Building, Mixed-Use Development

Recognize synonyms:
- "critical", "urgent", "severe", "highest risk" → Critical severity
- "high priority", "important" → High severity
- "open", "pending", "new" → Open status
- "closed", "resolved", "completed" → Closed status

Set requiresAnalysis=true if query asks for:
- Recommendations, suggestions, advice
- Analysis, patterns, trends
- Comparisons, predictions
- Explanations, insights, summaries
- "Why", "How should", "What should"

Set requiresAnalysis=false if query asks for:
- List, show, find, display findings
- Count, how many
- Simple filtering/searching

Respond ONLY with valid JSON, no other text.`;
  }

  /**
   * Parse LLM response into RecognizedIntent
   */
  private parseIntentResponse(response: string, originalQuery: string): RecognizedIntent {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      // Normalize filters
      const filters: ExtractedFilters = {};
      
      if (parsed.filters.severity && Array.isArray(parsed.filters.severity)) {
        filters.severity = parsed.filters.severity as FindingSeverity[];
      }
      
      if (parsed.filters.status && Array.isArray(parsed.filters.status)) {
        filters.status = parsed.filters.status as FindingStatus[];
      }
      
      if (parsed.filters.year) {
        filters.year = parseInt(parsed.filters.year, 10);
      }
      
      if (parsed.filters.projectType) {
        filters.projectType = parsed.filters.projectType as ProjectType;
      }
      
      if (parsed.filters.department) {
        filters.department = parsed.filters.department;
      }
      
      if (parsed.filters.keywords && Array.isArray(parsed.filters.keywords)) {
        filters.keywords = parsed.filters.keywords;
      }

      return {
        intent: parsed.intent || 'Find findings',
        filters,
        requiresAnalysis: parsed.requiresAnalysis || false,
        confidence: Math.min(Math.max(parsed.confidence || 0.7, 0), 1),
        originalQuery,
      };
    } catch (error) {
      console.error('Failed to parse intent response:', error);
      return this.fallbackRecognition(originalQuery);
    }
  }

  /**
   * Fallback pattern-based recognition when LLM unavailable
   */
  private fallbackRecognition(query: string): RecognizedIntent {
    const lowerQuery = query.toLowerCase();
    const filters: ExtractedFilters = {};

    // Extract year
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      filters.year = parseInt(yearMatch[1], 10);
    }

    // Extract severity (recognize synonyms)
    const severityMap: Record<string, FindingSeverity> = {
      'critical': 'Critical',
      'urgent': 'Critical',
      'severe': 'Critical',
      'highest risk': 'Critical',
      'high': 'High',
      'important': 'High',
      'medium': 'Medium',
      'moderate': 'Medium',
      'low': 'Low',
      'minor': 'Low',
    };

    const severities: FindingSeverity[] = [];
    for (const [keyword, severity] of Object.entries(severityMap)) {
      if (lowerQuery.includes(keyword) && !severities.includes(severity)) {
        severities.push(severity);
      }
    }
    if (severities.length > 0) {
      filters.severity = severities;
    }

    // Extract status
    const statusMap: Record<string, FindingStatus> = {
      'open': 'Open',
      'pending': 'Open',
      'new': 'Open',
      'in progress': 'In Progress',
      'ongoing': 'In Progress',
      'closed': 'Closed',
      'resolved': 'Closed',
      'completed': 'Closed',
      'deferred': 'Deferred',
    };

    const statuses: FindingStatus[] = [];
    for (const [keyword, status] of Object.entries(statusMap)) {
      if (lowerQuery.includes(keyword) && !statuses.includes(status)) {
        statuses.push(status);
      }
    }
    if (statuses.length > 0) {
      filters.status = statuses;
    }

    // Determine if analysis required
    const analysisKeywords = [
      'recommend', 'suggest', 'analyze', 'analyse', 'compare', 'pattern',
      'trend', 'predict', 'why', 'how should', 'what should', 'insight',
      'summary', 'summarize', 'explain'
    ];
    const requiresAnalysis = analysisKeywords.some(kw => lowerQuery.includes(kw));

    return {
      intent: requiresAnalysis ? 'Analyze findings' : 'Find findings',
      filters,
      requiresAnalysis,
      confidence: 0.6,
      originalQuery: query,
    };
  }
}

// Export singleton instance
export const intentRecognitionService = new IntentRecognitionService();
