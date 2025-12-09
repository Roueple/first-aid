# Design Document: DocAI Simple Query

## Overview

The DocAI Simple Query feature adds a pattern-matching layer to the existing DocAI service that intercepts common query patterns and translates them directly into Firebase queries without requiring LLM API calls. This provides instant, cost-free responses for frequently used query types while maintaining the existing AI-powered analysis for complex queries.

The system acts as a fast path that sits before the existing SmartQueryRouter, matching queries against predefined patterns and constructing Firebase queries directly. When no pattern matches, the query falls through to the existing LLM-powered processing pipeline.

## Architecture

### System Flow

```
User Query
    ↓
┌─────────────────────────────────┐
│  SimpleQueryMatcher             │
│  - Pattern matching             │
│  - Parameter extraction         │
└─────────────────────────────────┘
    ↓
    ├─ Match Found? ──→ Yes ──→ ┌─────────────────────────────────┐
    │                            │  SimpleQueryExecutor            │
    │                            │  - Build Firebase query         │
    │                            │  - Execute query                │
    │                            │  - Format results               │
    │                            └─────────────────────────────────┘
    │                                        ↓
    │                                    Response
    │
    └─ No ──→ ┌─────────────────────────────────┐
              │  SmartQueryRouter (existing)    │
              │  - LLM intent recognition       │
              │  - Complex query processing     │
              └─────────────────────────────────┘
                        ↓
                    Response
```

### Integration with Existing Services

The Simple Query feature integrates with:

1. **DocAIService**: Entry point that routes queries through SimpleQueryMatcher first
2. **AuditResultService**: Executes Firebase queries constructed by SimpleQueryExecutor
3. **SmartQueryRouter**: Fallback for non-matching queries
4. **DocChatService**: Stores query metadata including query type and execution metrics

## Components and Interfaces

### 1. SimpleQueryMatcher

**Purpose**: Matches user queries against predefined patterns and extracts parameters.

**Interface**:
```typescript
interface QueryPattern {
  id: string;
  name: string;
  priority: number;
  regex: RegExp;
  parameterExtractors: ParameterExtractor[];
  filterBuilder: (params: ExtractedParams) => FirestoreFilters;
  sortBuilder: (params: ExtractedParams) => FirestoreSort[];
}

interface ExtractedParams {
  [key: string]: string | number | boolean;
}

interface MatchResult {
  matched: boolean;
  pattern?: QueryPattern;
  params?: ExtractedParams;
  confidence: number;
}

class SimpleQueryMatcher {
  private patterns: QueryPattern[];
  
  constructor(patterns: QueryPattern[]);
  match(query: string): MatchResult;
  addPattern(pattern: QueryPattern): void;
  validatePattern(pattern: QueryPattern): ValidationResult;
}
```

**Pattern Examples**:
```typescript
const patterns: QueryPattern[] = [
  {
    id: 'temporal-year',
    name: 'Temporal Query - Year',
    priority: 10,
    regex: /(?:findings?|audit results?)\s+(?:from|in|for)\s+(\d{4})|(\d{4})\s+(?:findings?|audit results?)/i,
    parameterExtractors: [
      { name: 'year', type: 'number', captureGroup: 1 }
    ],
    filterBuilder: (params) => [
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'department-basic',
    name: 'Department Query',
    priority: 10,
    regex: /(IT|HR|Finance|Sales|Procurement|Legal|Marketing)\s+findings?|findings?\s+(?:from|for)\s+(IT|HR|Finance|Sales|Procurement|Legal|Marketing)/i,
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department }
    ],
    sortBuilder: () => [
      { field: 'year', direction: 'desc' }
    ]
  },
  {
    id: 'risk-critical',
    name: 'Critical Risk Query',
    priority: 15,
    regex: /critical\s+findings?|findings?\s+(?:with|above)\s+critical\s+risk/i,
    parameterExtractors: [],
    filterBuilder: () => [
      { field: 'nilai', operator: '>=', value: 15 }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  },
  {
    id: 'composite-dept-year',
    name: 'Department + Year Composite',
    priority: 20, // Higher priority for composite patterns
    regex: /(IT|HR|Finance|Sales|Procurement|Legal|Marketing)\s+findings?\s+(?:from|in)\s+(\d{4})|(\d{4})\s+(IT|HR|Finance|Sales|Procurement|Legal|Marketing)\s+findings?/i,
    parameterExtractors: [
      { name: 'department', type: 'string', captureGroup: 1, normalizer: 'capitalize' },
      { name: 'year', type: 'number', captureGroup: 2 }
    ],
    filterBuilder: (params) => [
      { field: 'department', operator: '==', value: params.department },
      { field: 'year', operator: '==', value: params.year }
    ],
    sortBuilder: () => [
      { field: 'nilai', direction: 'desc' }
    ]
  }
];
```

### 2. SimpleQueryExecutor

**Purpose**: Executes Firebase queries and formats results.

**Interface**:
```typescript
interface FirestoreFilters {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in';
  value: any;
}

interface FirestoreSort {
  field: string;
  direction: 'asc' | 'desc';
}

interface SimpleQueryResult {
  type: 'simple_query';
  answer: string;
  findings: AuditResult[];
  metadata: {
    queryType: 'simple_query';
    patternMatched: string;
    executionTimeMs: number;
    resultsCount: number;
    filtersApplied: FirestoreFilters[];
  };
}

class SimpleQueryExecutor {
  constructor(private auditResultService: AuditResultService);
  
  async execute(
    pattern: QueryPattern,
    params: ExtractedParams
  ): Promise<SimpleQueryResult>;
  
  private buildQuery(
    filters: FirestoreFilters[],
    sorts: FirestoreSort[]
  ): QueryOptions;
  
  private formatResults(
    results: AuditResult[],
    pattern: QueryPattern
  ): string;
}
```

### 3. SimpleQueryService

**Purpose**: Main service that coordinates pattern matching and execution.

**Interface**:
```typescript
class SimpleQueryService {
  constructor(
    private matcher: SimpleQueryMatcher,
    private executor: SimpleQueryExecutor
  );
  
  async processQuery(
    query: string,
    userId: string,
    sessionId?: string
  ): Promise<SimpleQueryResult | null>;
  
  getAvailablePatterns(): QueryPattern[];
  addCustomPattern(pattern: QueryPattern): void;
}
```

### 4. Integration with DocAIService

**Modified DocAIService Flow**:
```typescript
export const sendDocQuery = async (
  message: string,
  userId: string,
  thinkingMode: ThinkingMode = 'low',
  sessionId?: string
): Promise<string> => {
  const startTime = Date.now();
  
  try {
    // Get or create session
    const activeSessionId = sessionId || await docSessionService.getOrCreateSession(userId);
    
    // Add user message
    await docChatService.addUserMessage(activeSessionId, userId, message);
    
    // TRY SIMPLE QUERY FIRST
    const simpleResult = await simpleQueryService.processQuery(
      message,
      userId,
      activeSessionId
    );
    
    if (simpleResult) {
      // Simple query matched - use fast path
      const executionTime = Date.now() - startTime;
      
      await docChatService.addAssistantResponse(
        activeSessionId,
        userId,
        simpleResult.answer,
        {
          thinkingMode: 'none', // No LLM used
          responseTime: executionTime,
          queryType: 'simple_query',
          success: true,
          metadata: simpleResult.metadata,
        }
      );
      
      await docSessionService.incrementMessageCount(activeSessionId);
      return simpleResult.answer;
    }
    
    // FALLBACK TO EXISTING LLM-POWERED FLOW
    const conversationHistory = await docChatService.getFormattedHistory(activeSessionId, 10);
    const response = await sendMessageToGemini(
      message,
      thinkingMode,
      activeSessionId,
      conversationHistory
    );
    
    const executionTime = Date.now() - startTime;
    
    await docChatService.addAssistantResponse(
      activeSessionId,
      userId,
      response,
      {
        thinkingMode,
        responseTime: executionTime,
        modelVersion: 'gemini-2.0-flash-thinking-exp',
        queryType: 'general',
        success: true,
      }
    );
    
    await docSessionService.incrementMessageCount(activeSessionId);
    return response;
  } catch (error) {
    // Error handling...
  }
};
```

## Data Models

### QueryPattern Configuration

```typescript
interface QueryPatternConfig {
  patterns: QueryPattern[];
  defaultSort: FirestoreSort[];
  maxResults: number;
  cacheEnabled: boolean;
  cacheTTL: number; // milliseconds
}
```

### Extended DocChat Metadata

```typescript
interface DocChat {
  // ... existing fields ...
  
  // Extended metadata for simple queries
  queryType?: 'simple_query' | 'general' | 'search' | 'analysis';
  patternMatched?: string;
  filtersApplied?: FirestoreFilters[];
  resultsCount?: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Pattern Matching Bypasses LLM

*For any* query that matches a defined pattern, the system should execute without calling the LLM API, as evidenced by metadata showing queryType as "simple_query" and no thinkingMode value.

**Validates: Requirements 1.1**

### Property 2: Simple Query Performance

*For any* simple query execution, the response time should be less than 500 milliseconds from query submission to result return.

**Validates: Requirements 1.2**

### Property 3: Metadata Logging Consistency

*For any* simple query, the chat metadata should contain queryType="simple_query", patternMatched field, executionTimeMs, and resultsCount.

**Validates: Requirements 1.3, 9.1, 9.3, 9.4, 9.5**

### Property 4: Result Format Consistency

*For any* simple query that returns results, the formatted output should follow a consistent structure with summary statistics, result list, and metadata section.

**Validates: Requirements 1.4**

### Property 5: Fallback Behavior

*For any* query that does not match any pattern, the system should fall back to LLM processing, as evidenced by metadata showing a thinkingMode value and modelVersion.

**Validates: Requirements 1.5**

### Property 6: Year Pattern Extraction

*For any* query containing a 4-digit year in patterns like "findings from [year]", "[year] findings", or "show me [year] audit results", the system should extract the year and construct a filter WHERE year == [year].

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 7: Temporal Query Sorting

*For any* temporal query (containing year filter), the results should be sorted by nilai in descending order.

**Validates: Requirements 2.4**

### Property 8: Department Pattern Extraction

*For any* query containing a department name in patterns like "[department] findings", "show me [department] department", or "findings from [department]", the system should extract the department and construct a filter WHERE department == [department].

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 9: Department Query Sorting

*For any* department query, the results should be sorted by year in descending order.

**Validates: Requirements 3.4**

### Property 10: Case-Insensitive Department Matching

*For any* department name provided in any case variation (lowercase, uppercase, mixed), the system should normalize it to match the database format (typically title case).

**Validates: Requirements 3.5**

### Property 11: Top N Limit Application

*For any* query matching "top [N] findings" pattern, the system should limit results to exactly N items and sort by nilai in descending order.

**Validates: Requirements 4.5**

### Property 12: Project Name Pattern Extraction

*For any* query containing a project name in patterns like "findings for [projectName]", "[projectName] findings", or "show me [projectName] audit results", the system should extract the complete project name (including spaces) and construct a filter WHERE projectName == [projectName].

**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 13: Project Query Sorting

*For any* project query, the results should be sorted by year in descending order.

**Validates: Requirements 5.4**

### Property 14: Composite Filter Application

*For any* query that matches a composite pattern (e.g., department + year), the system should apply all extracted filters to the Firebase query.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 15: Inequality Sort Order

*For any* query with an inequality filter (>, >=, <, <=), the system should order results by the inequality field first, as required by Firestore constraints.

**Validates: Requirements 6.5**

### Property 16: Finding Type Filter Preservation

*For any* query that includes finding type keywords ("only findings", "actual findings", "exclude non-findings") combined with other filters, all filters should be preserved and applied to the query.

**Validates: Requirements 7.5**

### Property 17: Subholding Pattern Extraction

*For any* query containing a subholding code in patterns like "findings for SH [code]", "[code] subholding findings", or "show me [code] audit results", the system should extract the code and construct a filter WHERE sh == [code].

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 18: Subholding Query Sorting

*For any* subholding query, the results should be sorted by year in descending order.

**Validates: Requirements 8.4**

### Property 19: Subholding Code Normalization

*For any* subholding code provided in any case, the system should normalize it to uppercase to match the database format.

**Validates: Requirements 8.5**

### Property 20: Pattern Conflict Detection

*For any* new pattern being added to the system, if it conflicts with an existing pattern (same regex or overlapping match space), the validation should reject it.

**Validates: Requirements 10.1**

### Property 21: Pattern Priority Ordering

*For any* query that could match multiple patterns, the system should select the pattern with the highest priority value.

**Validates: Requirements 10.3**

### Property 22: Parameter Extraction Accuracy

*For any* matched pattern, all parameter values extracted from the query should exactly match the corresponding segments of the input query.

**Validates: Requirements 10.4**

## Error Handling

### Pattern Matching Errors

1. **No Pattern Match**: Fall back to existing LLM processing
2. **Multiple Pattern Matches**: Use highest priority pattern
3. **Parameter Extraction Failure**: Fall back to LLM processing

### Query Execution Errors

1. **Firebase Query Error**: Return error message with suggestion to rephrase
2. **Empty Results**: Return formatted "no results" message with suggestions
3. **Timeout**: Fall back to LLM processing if query takes > 500ms

### Fallback Strategy

```typescript
async function processQueryWithFallback(query: string): Promise<string> {
  try {
    // Try simple query
    const result = await simpleQueryService.processQuery(query);
    if (result) return result.answer;
  } catch (error) {
    console.warn('Simple query failed, falling back to LLM:', error);
  }
  
  // Fallback to LLM
  return await smartQueryRouter.processQuery(query);
}
```

## Testing Strategy

### Unit Testing

Unit tests will cover:

1. **Pattern Matching Logic**
   - Test each pattern regex against valid and invalid inputs
   - Test parameter extraction for each pattern
   - Test pattern priority ordering

2. **Query Building**
   - Test filter construction from extracted parameters
   - Test sort order construction
   - Test composite filter combinations

3. **Result Formatting**
   - Test output format consistency
   - Test empty result handling
   - Test large result set formatting

### Property-Based Testing

Property-based tests will use **fast-check** library for TypeScript to verify universal properties across random inputs.

**Configuration**: Each property test should run a minimum of 100 iterations.

**Test Tagging**: Each property-based test must include a comment with the format:
```typescript
// Feature: docai-simple-query, Property 1: Pattern Matching Bypasses LLM
```

**Property Test Examples**:

1. **Pattern Matching Bypasses LLM** (Property 1)
   - Generate random queries matching patterns
   - Execute queries
   - Assert metadata.queryType === 'simple_query'
   - Assert no LLM API calls made

2. **Simple Query Performance** (Property 2)
   - Generate random simple queries
   - Measure execution time
   - Assert time < 500ms

3. **Year Pattern Extraction** (Property 6)
   - Generate random years (2000-2099)
   - Generate queries with year patterns
   - Assert extracted year matches input
   - Assert filter constructed correctly

4. **Department Case Normalization** (Property 10)
   - Generate random case variations of department names
   - Execute queries
   - Assert all variations produce same filter

5. **Composite Filter Application** (Property 14)
   - Generate random department + year combinations
   - Execute queries
   - Assert both filters present in query

### Integration Testing

Integration tests will verify:

1. **End-to-End Flow**
   - Submit query through DocAIService
   - Verify simple query path taken
   - Verify results stored in doc_chats
   - Verify metadata correct

2. **Fallback Behavior**
   - Submit non-matching query
   - Verify LLM path taken
   - Verify correct metadata

3. **Performance Benchmarks**
   - Compare simple query vs LLM query execution time
   - Verify simple queries consistently faster

## Performance Optimization

### Caching Strategy

```typescript
interface QueryCache {
  key: string; // Hash of query + filters
  result: SimpleQueryResult;
  timestamp: number;
  ttl: number;
}

class SimpleQueryCache {
  private cache: Map<string, QueryCache>;
  
  get(query: string): SimpleQueryResult | null;
  set(query: string, result: SimpleQueryResult, ttl: number): void;
  clear(): void;
}
```

### Pattern Matching Optimization

1. **Pattern Ordering**: Evaluate patterns by priority (highest first)
2. **Early Exit**: Stop matching after first successful match
3. **Regex Compilation**: Pre-compile all regex patterns at initialization

### Query Optimization

1. **Index Usage**: Ensure Firebase composite indexes exist for common filter combinations
2. **Result Limiting**: Default to 50 results, allow pagination
3. **Field Selection**: Only fetch required fields from Firebase

## Deployment Considerations

### Configuration

```typescript
// config/simpleQuery.config.ts
export const simpleQueryConfig = {
  enabled: true,
  maxExecutionTime: 500, // ms
  maxResults: 50,
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  fallbackToLLM: true,
  patterns: [...] // Pattern definitions
};
```

### Feature Flag

```typescript
// Allow gradual rollout
if (featureFlags.simpleQueryEnabled) {
  const simpleResult = await simpleQueryService.processQuery(query);
  if (simpleResult) return simpleResult;
}

// Fallback to existing flow
return await smartQueryRouter.processQuery(query);
```

### Monitoring

Track metrics:
- Simple query match rate
- Average execution time
- Fallback rate
- User satisfaction (implicit: query refinement rate)

## Future Enhancements

1. **Machine Learning Pattern Discovery**: Analyze query logs to discover new common patterns
2. **User-Defined Patterns**: Allow users to create custom query shortcuts
3. **Multi-Language Support**: Add pattern matching for Indonesian queries
4. **Voice Query Optimization**: Optimize patterns for voice input variations
5. **Query Suggestions**: Suggest simple query patterns to users based on context

## Dependencies

- **Existing Services**: DocAIService, AuditResultService, DocChatService, DocSessionService
- **Libraries**: None (uses built-in RegExp)
- **Firebase**: Firestore for query execution
- **Testing**: fast-check for property-based testing

## Migration Path

1. **Phase 1**: Implement SimpleQueryMatcher and SimpleQueryExecutor
2. **Phase 2**: Integrate with DocAIService behind feature flag
3. **Phase 3**: Add initial pattern set (temporal, department, risk)
4. **Phase 4**: Monitor and tune patterns based on usage
5. **Phase 5**: Add composite patterns and advanced features
6. **Phase 6**: Enable by default after validation

## Success Metrics

- **Performance**: 90% of simple queries execute in < 500ms
- **Accuracy**: 95% of pattern matches produce correct results
- **Coverage**: 40% of queries match simple patterns
- **Cost Reduction**: 40% reduction in LLM API calls
- **User Satisfaction**: No increase in query refinement rate
