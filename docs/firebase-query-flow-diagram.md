# Firebase Query Flow Diagram

## Overview

This document provides visual diagrams showing how Firebase queries flow through the FIRST-AID system, from user input to database results.

---

## 1. Basic Query Flow

```mermaid
graph TD
    A[User Query] --> B[Query Options]
    B --> C{Query Type}
    C -->|Simple Filter| D[Single WHERE Clause]
    C -->|Composite| E[Multiple WHERE Clauses]
    C -->|Inequality| F[WHERE + OrderBy]
    
    D --> G[Firestore Query]
    E --> G
    F --> G
    
    G --> H{Index Available?}
    H -->|Yes| I[Execute Query]
    H -->|No| J[Index Error]
    
    I --> K[Results]
    J --> L[Deploy Index]
    L --> I
    
    K --> M[Format Response]
    M --> N[Return to User]
```

---

## 2. DocAI Query Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant DocAI
    participant LLM as Gemini LLM
    participant QueryBuilder
    participant Firestore
    participant Formatter
    
    User->>DocAI: "Show me IT findings from 2025"
    
    Note over DocAI,LLM: Step 1: Intent Recognition
    DocAI->>LLM: Extract intent and filters
    LLM-->>DocAI: {department: "IT", year: 2025}
    
    Note over DocAI,QueryBuilder: Step 2: Query Building
    DocAI->>QueryBuilder: Build Firestore query
    QueryBuilder-->>DocAI: {filters: [...], sorts: [...]}
    
    Note over DocAI,Firestore: Step 3: Query Execution
    DocAI->>Firestore: Execute query
    Firestore-->>DocAI: 47 results
    
    Note over DocAI,Formatter: Step 4: Response Formatting
    DocAI->>Formatter: Format results
    Formatter->>LLM: Generate analysis (if needed)
    LLM-->>Formatter: AI-powered response
    Formatter-->>DocAI: Formatted response
    
    DocAI-->>User: "Found 47 IT findings from 2025..."
```

---

## 3. Query Type Decision Tree

```mermaid
graph TD
    A[User Query] --> B{Contains Analysis Keywords?}
    
    B -->|Yes| C{Has Specific Filters?}
    B -->|No| D{Has Filters?}
    
    C -->|Yes| E[Hybrid Query]
    C -->|No| F[Complex Query]
    
    D -->|Yes| G[Simple Query]
    D -->|No| F
    
    E --> H[Filter Data + AI Analysis]
    F --> I[AI Analysis Only]
    G --> J[Direct Database Lookup]
    
    H --> K[Return Results]
    I --> K
    J --> K
```

**Analysis Keywords**: recommend, suggest, analyze, compare, pattern, trend, predict, prioritize, insight, improve, summary, explain, why, how should

---

## 4. Composite Index Resolution

```mermaid
graph LR
    A[Query with Multiple Filters] --> B{Index Exists?}
    
    B -->|Yes| C[Use Existing Index]
    B -->|No| D[Check firestore.indexes.json]
    
    D --> E{Index Defined?}
    E -->|Yes| F[Deploy Index]
    E -->|No| G[Add Index Definition]
    
    G --> H[Update firestore.indexes.json]
    H --> F
    
    F --> I[firebase deploy --only firestore:indexes]
    I --> J[Wait for Index Build]
    J --> C
    
    C --> K[Execute Query]
    K --> L[Return Results]
```

---

## 5. Query Optimization Flow

```mermaid
graph TD
    A[Query Request] --> B{Cached?}
    
    B -->|Yes| C[Return Cached Results]
    B -->|No| D{Result Count Estimate}
    
    D -->|< 50| E[Direct Query]
    D -->|50-500| F[Paginated Query]
    D -->|> 500| G[Add More Filters]
    
    E --> H[Execute]
    F --> I[Execute with Pagination]
    G --> J[Suggest Filter Refinement]
    
    H --> K[Cache Results]
    I --> K
    
    K --> L[Return Results]
    J --> L
```

---

## 6. Error Handling Flow

```mermaid
graph TD
    A[Execute Query] --> B{Success?}
    
    B -->|Yes| C[Return Results]
    B -->|No| D{Error Type}
    
    D -->|Missing Index| E[Log Index URL]
    D -->|Permission Denied| F[Check Firestore Rules]
    D -->|Network Error| G[Retry with Backoff]
    D -->|Invalid Argument| H[Validate Query]
    
    E --> I[Deploy Index]
    F --> J[Update Rules]
    G --> K{Retry Count < 3?}
    H --> L[Fix Query]
    
    K -->|Yes| M[Wait & Retry]
    K -->|No| N[Return Error]
    
    I --> A
    J --> A
    M --> A
    L --> A
    
    N --> O[User Error Message]
```

---

## 7. Data Flow Architecture

```mermaid
graph TB
    subgraph "User Layer"
        A[User Input]
        B[Chat Interface]
    end
    
    subgraph "Service Layer"
        C[DocAIQueryService]
        D[AuditResultService]
        E[DatabaseService]
    end
    
    subgraph "AI Layer"
        F[Gemini LLM]
        G[Intent Recognition]
        H[Response Formatting]
    end
    
    subgraph "Data Layer"
        I[(Firestore)]
        J[Composite Indexes]
        K[Cache Layer]
    end
    
    A --> B
    B --> C
    C --> G
    G --> F
    F --> C
    C --> D
    D --> E
    E --> K
    K --> I
    I --> J
    J --> E
    E --> D
    D --> C
    C --> H
    H --> F
    F --> H
    H --> C
    C --> B
    B --> A
```

---

## 8. Query Template Matching

```mermaid
graph LR
    A[User Query] --> B[Normalize Text]
    B --> C{Match Template?}
    
    C -->|Temporal| D[Year Filter]
    C -->|Department| E[Department Filter]
    C -->|Risk| F[Nilai Filter]
    C -->|Project| G[Project Filter]
    C -->|Composite| H[Multiple Filters]
    C -->|No Match| I[LLM Extraction]
    
    D --> J[Build Query]
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    
    J --> K[Execute]
    K --> L[Results]
```

---

## 9. Real-Time Query Example

### Example: "Show me critical IT findings from 2025"

```mermaid
sequenceDiagram
    participant U as User
    participant D as DocAI
    participant L as LLM
    participant Q as QueryBuilder
    participant F as Firestore
    participant C as Cache
    
    U->>D: "Show me critical IT findings from 2025"
    
    Note over D: Parse Query
    D->>L: Extract intent
    L-->>D: {dept: "IT", year: 2025, minNilai: 15}
    
    Note over D: Check Cache
    D->>C: Check cache key: "IT-2025-15"
    C-->>D: Cache miss
    
    Note over D: Build Query
    D->>Q: Build Firestore query
    Q-->>D: WHERE dept=="IT" AND year==2025 AND nilai>=15
    
    Note over D: Execute
    D->>F: Execute query
    F-->>D: 12 results
    
    Note over D: Cache Results
    D->>C: Store results (5 min TTL)
    
    Note over D: Format
    D->>L: Format response
    L-->>D: "Found 12 critical IT findings..."
    
    D-->>U: Response with 12 findings
```

**Performance**:
- Cache check: 5ms
- LLM extraction: 800ms
- Query execution: 150ms
- Response formatting: 1200ms
- **Total**: ~2.2 seconds

---

## 10. Index Strategy Diagram

```mermaid
graph TD
    A[Query Pattern Analysis] --> B{Query Frequency}
    
    B -->|High| C[Create Composite Index]
    B -->|Medium| D[Monitor Performance]
    B -->|Low| E[Use Client-Side Filter]
    
    C --> F{Fields Involved}
    
    F -->|2 Fields| G[Simple Composite]
    F -->|3+ Fields| H[Complex Composite]
    
    G --> I[Add to firestore.indexes.json]
    H --> J[Evaluate Query Redesign]
    
    J --> K{Can Simplify?}
    K -->|Yes| L[Reduce Fields]
    K -->|No| I
    
    L --> I
    I --> M[Deploy Index]
    
    D --> N{Performance OK?}
    N -->|Yes| O[Keep Monitoring]
    N -->|No| C
    
    E --> P[Implement Client Filter]
```

---

## Query Performance Comparison

### Simple Query (1 Filter)
```
User Query → Intent (800ms) → Query (150ms) → Format (200ms)
Total: ~1.2s
```

### Composite Query (2 Filters)
```
User Query → Intent (800ms) → Query (200ms) → Format (200ms)
Total: ~1.2s
```

### Complex Query (AI Analysis)
```
User Query → Intent (800ms) → Query (150ms) → AI Analysis (2000ms) → Format (500ms)
Total: ~3.5s
```

### Hybrid Query (Filter + AI)
```
User Query → Intent (800ms) → Query (200ms) → AI Analysis (2000ms) → Format (500ms)
Total: ~3.5s
```

---

## Best Practices Summary

```mermaid
mindmap
  root((Query Best Practices))
    Indexing
      Create composite indexes
      Monitor index usage
      Remove unused indexes
    Performance
      Use pagination
      Enable caching
      Limit result sets
    Query Design
      Minimize filters
      Use equality before inequality
      Order by indexed fields
    Error Handling
      Retry with backoff
      Validate inputs
      Log errors
    LLM Integration
      Cache intent extraction
      Batch AI requests
      Use low thinking mode for extraction
```

---

## Related Documentation

- [Firebase Query Guide](./firebase-query-guide.md) - Complete query reference
- [Firebase Query Summary](./firebase-query-guide-summary.md) - Quick reference
- [DocAI Integration](./DOCAI-README-2-TABLE.md) - DocAI system overview
- [Smart Query Router](./smart-query-router-v2-integration.md) - Query routing logic

---

**Last Updated**: December 8, 2025  
**Version**: 1.0.0
