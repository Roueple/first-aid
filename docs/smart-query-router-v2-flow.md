# Smart Query Router V2 - Intent-Based Flow

## Overview

The new Smart Query Router uses an intent-based approach with LLM-powered understanding to handle variations in user queries that express the same intent.

## The Problem

Previously, these queries would be treated differently:
- "show me critical findings 2024"
- "show me severity critical 2024"
- "show me highest risk findings 2024"

But they all mean the same thing: **Find Critical severity findings from 2024**

## The Solution: 4-Step Flow

### 1. Mask Sensitive Data (Local)

Before sending anything to the LLM, we mask sensitive/personal information:

```typescript
// Input: "Show findings for john.doe@company.com"
// Output: "Show findings for [EMAIL_1]"
```

**Masked data types:**
- Email addresses
- Phone numbers
- ID numbers
- Names (in specific contexts)
- Custom patterns

**Why local?** Privacy and security - sensitive data never leaves your system.

### 2. Recognize Intent (LLM API)

The LLM analyzes the masked query to understand:
- **Core intent**: What does the user really want?
- **Normalized filters**: Extract and standardize parameters
- **Analysis requirement**: Do they need reasoning or just data?

```typescript
// Input: "show me highest risk findings 2024"
// Output:
{
  intent: "Find Critical severity findings from 2024",
  filters: {
    severity: ["Critical"],
    year: 2024
  },
  requiresAnalysis: false,
  confidence: 0.95
}
```

**Key benefit:** Handles synonyms and variations automatically:
- "critical" = "urgent" = "severe" = "highest risk" → `Critical` severity
- "open" = "pending" = "new" → `Open` status
- "closed" = "resolved" = "completed" → `Closed` status

### 3. Route Intelligently

Based on the recognized intent, route to the optimal execution path:

#### Simple Query (SQL)
- **When**: User wants filtered data, no analysis needed
- **Examples**: 
  - "show me critical findings 2024"
  - "list open issues from hospitals"
  - "how many findings in 2023"
- **Execution**: Direct Firestore query with filters

#### Complex Query (RAG)
- **When**: User needs analysis, insights, or reasoning
- **Examples**:
  - "why are there so many critical findings?"
  - "what patterns do you see in 2024 findings?"
  - "recommend which findings to prioritize"
- **Execution**: 
  1. Retrieve relevant findings for context
  2. Build RAG context (top 20 most relevant)
  3. Send to LLM with context
  4. Return AI analysis

#### Hybrid Query (SQL + RAG)
- **When**: User wants specific data AND analysis
- **Examples**:
  - "show me critical findings 2024 and explain the trends"
  - "list hospital findings and recommend priorities"
  - "get open issues and suggest which to close first"
- **Execution**:
  1. Query database with filters
  2. Pass results to AI for analysis
  3. Return both data and insights

### 4. Unmask & Return

Before returning results to the user, unmask any sensitive data:

```typescript
// AI Response: "Found 5 findings for [EMAIL_1]"
// Unmasked: "Found 5 findings for john.doe@company.com"
```

**Result**: Complete, accurate data with original sensitive information restored.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Query                               │
│  "show me highest risk findings 2024"                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: DataMaskingService (Local)                         │
│  • Detect sensitive data (email, phone, names, IDs)         │
│  • Replace with tokens: [EMAIL_1], [PHONE_1], etc.          │
│  • Store mapping for later unmasking                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: IntentRecognitionService (LLM API)                 │
│  • Send masked query to LLM                                  │
│  • LLM understands intent and normalizes filters             │
│  • Returns: intent, filters, requiresAnalysis, confidence    │
│                                                              │
│  Example output:                                             │
│  {                                                           │
│    intent: "Find Critical severity findings from 2024",     │
│    filters: { severity: ["Critical"], year: 2024 },         │
│    requiresAnalysis: false,                                  │
│    confidence: 0.95                                          │
│  }                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: SmartQueryRouter - Route Decision                  │
│  • Analyze intent.requiresAnalysis                           │
│  • Check if filters are specific                             │
│  • Decide: Simple, Complex, or Hybrid                        │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │ Simple │  │Complex │  │ Hybrid │
    │  (SQL) │  │  (RAG) │  │SQL+RAG │
    └────┬───┘  └────┬───┘  └────┬───┘
         │           │           │
         └───────────┼───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Unmask Results                                      │
│  • Replace tokens with original values                       │
│  • [EMAIL_1] → john.doe@company.com                          │
│  • Return complete, accurate results to user                 │
└─────────────────────────────────────────────────────────────┘
```

## Key Services

### DataMaskingService
- **Purpose**: Protect sensitive data before LLM processing
- **Methods**:
  - `maskSensitiveData(text)`: Mask and return tokens
  - `unmaskSensitiveData(text, tokens)`: Restore original values
  - `containsSensitiveData(text)`: Check if masking needed

### IntentRecognitionService
- **Purpose**: Understand user intent using LLM
- **Methods**:
  - `recognizeIntent(maskedQuery)`: Get normalized intent and filters
- **Features**:
  - Handles synonyms automatically
  - Normalizes filters to database schema
  - Determines if analysis is needed
  - Provides confidence score
  - Falls back to pattern matching if LLM unavailable

### SmartQueryRouter
- **Purpose**: Main orchestrator for the new flow
- **Methods**:
  - `processQuery(userQuery, options)`: Main entry point
- **Flow**:
  1. Mask sensitive data
  2. Recognize intent
  3. Route to appropriate handler
  4. Unmask results

## Benefits

### 1. Better Intent Understanding
- Handles variations in wording
- Recognizes synonyms automatically
- Normalizes to consistent filters

### 2. Privacy & Security
- Sensitive data masked before LLM
- Local masking/unmasking
- No PII sent to external APIs

### 3. Intelligent Routing
- Simple queries → Fast SQL
- Complex queries → AI reasoning
- Hybrid queries → Best of both

### 4. Accurate Results
- Unmasked data in final response
- Complete information returned
- No data loss in the process

## Usage Examples

### Example 1: Simple Query with Synonyms

```typescript
// All these queries produce the same result:
const queries = [
  "show me critical findings 2024",
  "show me severity critical 2024",
  "show me highest risk findings 2024",
  "display urgent issues from 2024"
];

// All recognized as:
{
  intent: "Find Critical severity findings from 2024",
  filters: { severity: ["Critical"], year: 2024 },
  requiresAnalysis: false
}

// Routed to: Simple Query (SQL)
// Result: Direct database lookup, fast response
```

### Example 2: Complex Query

```typescript
const query = "why are there so many critical findings in hospitals?";

// Recognized as:
{
  intent: "Analyze patterns in Critical findings for Hospital projects",
  filters: { severity: ["Critical"], projectType: "Hospital" },
  requiresAnalysis: true
}

// Routed to: Complex Query (RAG)
// Result: AI analysis with context from relevant findings
```

### Example 3: Hybrid Query

```typescript
const query = "show me open findings from 2024 and recommend priorities";

// Recognized as:
{
  intent: "Find Open findings from 2024 and provide prioritization recommendations",
  filters: { status: ["Open"], year: 2024 },
  requiresAnalysis: true
}

// Routed to: Hybrid Query (SQL + RAG)
// Result: Filtered findings + AI prioritization analysis
```

### Example 4: Query with Sensitive Data

```typescript
const query = "show findings for auditor john.doe@company.com";

// Step 1: Masked
"show findings for auditor [EMAIL_1]"

// Step 2: Intent recognized
{
  intent: "Find findings associated with specific auditor",
  filters: { keywords: ["auditor", "[EMAIL_1]"] },
  requiresAnalysis: false
}

// Step 3: Query executed with masked data
// Step 4: Results unmasked before return
"Found 12 findings for auditor john.doe@company.com"
```

## Migration from Old System

The old `QueryRouterService` is still available for backward compatibility. To use the new system:

```typescript
// Old way
import { queryRouterService } from './services/QueryRouterService';
const result = await queryRouterService.routeQuery(query);

// New way
import { smartQueryRouter } from './services/SmartQueryRouter';
const result = await smartQueryRouter.processQuery(query);
```

## Configuration

No additional configuration needed. The system uses existing:
- Gemini API configuration (for LLM)
- Firestore configuration (for database)

## Performance

- **Masking/Unmasking**: < 1ms (local regex operations)
- **Intent Recognition**: ~500-1000ms (LLM API call)
- **Simple Query**: ~100-300ms (database only)
- **Complex Query**: ~2-4s (database + LLM)
- **Hybrid Query**: ~2-4s (database + LLM)

## Error Handling

The system gracefully degrades:
1. If LLM unavailable → Falls back to pattern-based intent recognition
2. If database error → Returns error with suggestion
3. If AI error → Falls back to database results only

## Future Enhancements

1. **Caching**: Cache intent recognition for common queries
2. **Learning**: Track which intents work best, improve over time
3. **Multi-language**: Support queries in different languages
4. **Custom masking**: Allow users to define custom sensitive patterns
5. **Intent history**: Learn from user's past queries to improve recognition
