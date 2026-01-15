/**
 * SmartFilterExtractor Service
 * 
 * AI-powered filter extraction that uses schema awareness to intelligently
 * map natural language queries to database fields.
 * 
 * This service solves the problem of users not knowing exact field names:
 * - "IT findings 2025" → { findingDepartment: "IT", auditYear: 2025 }
 * - "show me HR department in project A" → { findingDepartment: "HR", projectName: "Project A" }
 * - "critical hospital findings" → { priorityLevel: "Critical", projectType: "Hospital" }
 * 
 * @see .kiro/specs/smart-query-router/design.md
 */

import { ExtractedFilters } from '../types/queryRouter.types';
import { schemaService, SchemaField } from './SchemaService';
import { sendMessageToGemini, isGeminiConfigured } from './GeminiService';
import { filterExtractor } from './FilterExtractor';

// ============================================================================
// AI Filter Extraction Schema
// ============================================================================

/**
 * Function declaration for Gemini to extract filters
 */
const EXTRACT_FILTERS_FUNCTION = {
  name: 'extract_filters',
  description: 'Extract structured database filters from a natural language query about audit findings',
  parameters: {
    type: 'object',
    properties: {
      auditYear: {
        type: 'number',
        description: 'Year of audit (e.g., 2024, 2025). Extract from phrases like "2025", "in 2024", "last year", "this year"',
      },
      findingDepartment: {
        type: 'string',
        description: 'Department name (e.g., IT, HR, Finance, Sales, Procurement, Legal, Marketing). Extract from phrases like "IT findings", "HR department", "from Finance", "Sales issues"',
      },
      projectType: {
        type: 'string',
        description: 'Project type. Valid values: Hotel, Landed House, Apartment, School, University, Insurance, Hospital, Clinic, Mall, Office Building, Mixed-Use Development',
        enum: [
          'Hotel', 'Landed House', 'Apartment', 'School', 'University',
          'Insurance', 'Hospital', 'Clinic', 'Mall', 'Office Building',
          'Mixed-Use Development'
        ],
      },
      projectName: {
        type: 'string',
        description: 'Specific project name (e.g., "Grand Hotel Jakarta", "Project A", "Central Hospital")',
      },
      subholding: {
        type: 'string',
        description: 'Business unit or subholding company name',
      },
      priorityLevel: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['Critical', 'High', 'Medium', 'Low'],
        },
        description: 'Priority/severity levels. Extract from phrases like "critical", "high priority", "urgent", "important", "medium", "low"',
      },
      status: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['Open', 'In Progress', 'Closed', 'Deferred'],
        },
        description: 'Finding status. Extract from phrases like "open", "pending", "in progress", "closed", "resolved", "deferred"',
      },
      controlCategory: {
        type: 'string',
        description: 'Control category type',
        enum: ['Preventive', 'Detective', 'Corrective'],
      },
      processArea: {
        type: 'string',
        description: 'Business process area (e.g., Sales, Procurement, Finance, HR, IT, Legal, Marketing)',
      },
      primaryTag: {
        type: 'string',
        description: 'Primary category tag',
      },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Keywords for text search in finding title, description, or other text fields',
      },
    },
    required: [],
  },
};

// ============================================================================
// SmartFilterExtractor Class
// ============================================================================

/**
 * AI-powered filter extraction with schema awareness
 */
export class SmartFilterExtractor {
  private fallbackExtractor = filterExtractor;

  constructor() {
    // No dependencies needed
  }

  /**
   * Extract filters using AI with schema awareness
   * Falls back to pattern-based extraction if AI fails
   * 
   * @param query - Natural language query
   * @returns Extracted filters
   */
  async extractFilters(query: string): Promise<ExtractedFilters> {
    try {
      // Try AI extraction first
      const aiFilters = await this.extractWithAI(query);
      
      // Validate and sanitize
      const validated = this.validateAndSanitize(aiFilters);
      
      // If AI extraction yielded good results, use it
      if (Object.keys(validated).length > 0) {
        console.log('[SmartFilterExtractor] AI extraction successful:', validated);
        return validated;
      }
      
      // Otherwise fall back to pattern-based
      console.log('[SmartFilterExtractor] AI extraction yielded no results, falling back to patterns');
      return this.fallbackExtractor.extractWithPatterns(query);
      
    } catch (error) {
      console.error('[SmartFilterExtractor] AI extraction failed, using pattern fallback:', error);
      return this.fallbackExtractor.extractWithPatterns(query);
    }
  }

  /**
   * Extract filters using AI (Gemini with JSON response)
   * 
   * @param query - Natural language query
   * @returns Extracted filters from AI
   */
  private async extractWithAI(query: string): Promise<ExtractedFilters> {
    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      console.warn('[SmartFilterExtractor] Gemini not configured, skipping AI extraction');
      return {};
    }

    // Build context-aware prompt
    const prompt = this.buildExtractionPrompt(query);
    
    try {
      // Call Gemini with low thinking mode for fast extraction
      const response = await sendMessageToGemini(prompt, 'low');
      
      // Parse JSON response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        return this.parseAIResponse(parsed);
      }
      
      console.warn('[SmartFilterExtractor] No JSON found in AI response');
      return {};
      
    } catch (error) {
      console.error('[SmartFilterExtractor] AI extraction error:', error);
      return {};
    }
  }

  /**
   * Build extraction prompt with schema context
   * 
   * @param query - User query
   * @returns Formatted prompt for AI
   */
  private buildExtractionPrompt(query: string): string {
    const commonFields = schemaService.getCommonFilters();
    
    let prompt = `Extract structured database filters from this natural language query about audit findings.

## Database Schema Context:
`;

    // Add schema information for common fields
    for (const field of commonFields) {
      prompt += `\n### ${field.displayName} (${field.fieldName}):\n`;
      prompt += `- ${field.description}\n`;
      prompt += `- User might say: ${field.aliases.slice(0, 5).join(', ')}\n`;
      
      if (field.enumValues) {
        prompt += `- Valid values: ${field.enumValues.join(', ')}\n`;
      }
    }

    prompt += `\n## Important Mapping Rules:
- "IT findings" or "IT department" → findingDepartment = "IT"
- "HR issues" or "from HR" → findingDepartment = "HR"
- "2025" or "in 2025" → auditYear = 2025
- "critical" or "urgent" → priorityLevel = ["Critical"]
- "high priority" → priorityLevel = ["High"]
- "open" or "pending" → status = ["Open"]
- "hotel" or "hotels" → projectType = "Hotel"
- "hospital" or "clinic" → projectType = "Hospital" or "Clinic"

## User Query:
"${query}"

## Task:
Extract all filters you can identify from the query and return them as a JSON object.
Map natural language to the correct database field names.
Be intelligent about implicit mentions (e.g., "IT findings" means findingDepartment="IT").

Return ONLY a JSON object with this structure (omit fields that don't apply):
\`\`\`json
{
  "auditYear": 2025,
  "findingDepartment": "IT",
  "projectType": "Hotel",
  "projectName": "Project A",
  "priorityLevel": ["Critical", "High"],
  "status": ["Open"],
  "keywords": ["security", "access"]
}
\`\`\`
`;

    return prompt;
  }

  /**
   * Parse AI response into ExtractedFilters format
   * 
   * @param args - Function call arguments from AI
   * @returns Parsed filters
   */
  private parseAIResponse(args: any): ExtractedFilters {
    const filters: ExtractedFilters = {};

    // Map AI response to ExtractedFilters format
    if (args.auditYear !== undefined) {
      filters.year = args.auditYear;
    }

    if (args.findingDepartment !== undefined) {
      filters.department = args.findingDepartment;
    }

    if (args.projectType !== undefined) {
      filters.projectType = args.projectType;
    }

    if (args.priorityLevel !== undefined) {
      filters.severity = Array.isArray(args.priorityLevel) 
        ? args.priorityLevel 
        : [args.priorityLevel];
    }

    if (args.status !== undefined) {
      filters.status = Array.isArray(args.status) 
        ? args.status 
        : [args.status];
    }

    if (args.keywords !== undefined && Array.isArray(args.keywords)) {
      filters.keywords = args.keywords;
    }

    // Add any other fields that might be useful for context
    // but aren't in the standard ExtractedFilters interface
    // (These can be used by the query builder)

    return filters;
  }

  /**
   * Validate and sanitize extracted filters
   * 
   * @param filters - Raw extracted filters
   * @returns Validated and sanitized filters
   */
  private validateAndSanitize(filters: ExtractedFilters): ExtractedFilters {
    const result = this.fallbackExtractor.validateFilters(filters);
    
    if (!result.valid) {
      console.warn('[SmartFilterExtractor] Validation warnings:', result.errors);
    }
    
    return result.sanitizedFilters;
  }

  /**
   * Extract filters with hybrid approach (AI + patterns)
   * Combines AI extraction with pattern-based extraction for best results
   * 
   * @param query - Natural language query
   * @returns Merged filters from both approaches
   */
  async extractWithHybrid(query: string): Promise<ExtractedFilters> {
    // Run both extractions in parallel
    const [aiFilters, patternFilters] = await Promise.all([
      this.extractWithAI(query).catch(() => ({})),
      Promise.resolve(this.fallbackExtractor.extractWithPatterns(query)),
    ]);

    // Merge results, preferring AI results when both exist
    const merged: ExtractedFilters = {
      ...patternFilters,
      ...aiFilters,
    };

    // Merge arrays (keywords, severity, status)
    if (patternFilters.keywords || aiFilters.keywords) {
      const allKeywords = [
        ...(patternFilters.keywords || []),
        ...(aiFilters.keywords || []),
      ];
      merged.keywords = Array.from(new Set(allKeywords));
    }

    if (patternFilters.severity || aiFilters.severity) {
      const allSeverities = [
        ...(patternFilters.severity || []),
        ...(aiFilters.severity || []),
      ];
      merged.severity = Array.from(new Set(allSeverities));
    }

    if (patternFilters.status || aiFilters.status) {
      const allStatuses = [
        ...(patternFilters.status || []),
        ...(aiFilters.status || []),
      ];
      merged.status = Array.from(new Set(allStatuses));
    }

    return this.validateAndSanitize(merged);
  }
}

/**
 * Export singleton instance
 */
export const smartFilterExtractor = new SmartFilterExtractor();
