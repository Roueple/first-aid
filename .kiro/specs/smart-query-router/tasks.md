# Implementation Plan

- [ ] 1. Set up project structure and core interfaces
  - [x] 1.1 Create QueryRouter types and interfaces





    - Create `src/types/queryRouter.types.ts` with QueryIntent, ExtractedFilters, QueryResponse, QueryMetadata interfaces
    - Define QueryType enum ('simple' | 'complex' | 'hybrid')
    - Define error response types
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4_
  - [ ] 1.2 Write property test for QueryIntent serialization round-trip
    - **Property 19: QueryIntent serialization round-trip**
    - **Validates: Requirements 9.1, 9.2, 9.3**
  - [ ] 1.3 Write property test for QueryIntent deserialization validation
    - **Property 20: QueryIntent deserialization validation**
    - **Validates: Requirements 9.4**

- [ ] 2. Implement QueryClassifier component
  - [x] 2.1 Create QueryClassifier service with pattern matching





    - Create `src/services/QueryClassifier.ts`
    - Implement simple query pattern detection (SIMPLE_PATTERNS)
    - Implement complex query pattern detection (COMPLEX_PATTERNS)
    - Implement hybrid query pattern detection (HYBRID_PATTERNS)
    - Calculate confidence score based on pattern match strength
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 2.2 Write property test for simple query classification
    - **Property 1: Simple query classification for filterable-only queries**
    - **Validates: Requirements 1.1**
  - [ ] 2.3 Write property test for complex query classification
    - **Property 2: Complex query classification for analytical queries**
    - **Validates: Requirements 1.2**
  - [ ] 2.4 Write property test for confidence score bounds
    - **Property 3: Confidence score bounds invariant**
    - **Validates: Requirements 1.4**
  - [ ] 2.5 Write property test for low confidence fallback
    - **Property 4: Low confidence fallback to complex**
    - **Validates: Requirements 1.5**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement FilterExtractor component
  - [x] 4.1 Create FilterExtractor service with pattern-based extraction













    - Create `src/services/FilterExtractor.ts`
    - Implement year extraction (4-digit years, relative references)
    - Implement project type extraction with alias mapping
    - Implement severity extraction with alias mapping
    - Implement status extraction with alias mapping
    - Implement keyword extraction for text search
    - Implement filter validation against Finding schema
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ] 4.2 Write property test for year extraction
    - **Property 5: Year extraction from queries**
    - **Validates: Requirements 2.1**
  - [ ] 4.3 Write property test for project type extraction
    - **Property 6: Project type extraction and mapping**
    - **Validates: Requirements 2.2**
  - [ ] 4.4 Write property test for severity alias mapping
    - **Property 7: Severity alias mapping correctness**
    - **Validates: Requirements 2.3**
  - [ ] 4.5 Write property test for status alias mapping
    - **Property 8: Status alias mapping correctness**
    - **Validates: Requirements 2.5**
  - [ ] 4.6 Write property test for filter schema validity
    - **Property 9: Extracted filters schema validity**
    - **Validates: Requirements 2.6**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement ContextBuilder component
  - [x] 6.1 Create ContextBuilder service for AI context preparation




    - Create `src/services/ContextBuilder.ts`
    - Implement relevance scoring based on filter match
    - Implement finding selection with max count limit (20)
    - Implement context string building with token estimation
    - Implement token limit enforcement (10,000 tokens)
    - _Requirements: 4.2, 7.1, 7.4_
  - [ ] 6.2 Write property test for context finding count limit
    - **Property 12: Context finding count limit**
    - **Validates: Requirements 4.2**
  - [ ] 6.3 Write property test for context token limit
    - **Property 17: Context token limit enforcement**
    - **Validates: Requirements 7.1**
  - [ ] 6.4 Write property test for relevance-based selection
    - **Property 18: Relevance-based finding selection**
    - **Validates: Requirements 7.4**

- [ ] 7. Implement ResponseFormatter component
  - [x] 7.1 Create ResponseFormatter service




    - Create `src/services/ResponseFormatter.ts`
    - Implement simple query result formatting (title, severity, status, date)
    - Implement AI response formatting with finding references
    - Implement hybrid response formatting with separated sections
    - Implement metadata population (queryType, executionTime, findingsAnalyzed, tokensUsed)
    - Implement pagination for large result sets (>50 findings)
    - _Requirements: 3.3, 3.5, 4.5, 5.3, 6.1, 6.2, 6.3, 6.4_
  - [ ] 7.2 Write property test for simple response formatting
    - **Property 10: Simple query response formatting completeness**
    - **Validates: Requirements 3.3**
  - [ ] 7.3 Write property test for pagination
    - **Property 11: Pagination for large result sets**
    - **Validates: Requirements 3.5**
  - [ ] 7.4 Write property test for complex response finding references
    - **Property 13: Complex query response includes finding references**
    - **Validates: Requirements 4.5**
  - [ ] 7.5 Write property test for hybrid response structure
    - **Property 14: Hybrid query response structure separation**
    - **Validates: Requirements 5.3**
  - [ ] 7.6 Write property test for response metadata completeness
    - **Property 15: Response metadata completeness**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [ ] 7.7 Write property test for token usage metadata
    - **Property 16: Token usage metadata for AI queries**
    - **Validates: Requirements 6.4**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement QueryRouterService (main orchestrator)
  - [x] 9.1 Create QueryRouterService with routing logic





    - Create `src/services/QueryRouterService.ts`
    - Integrate QueryClassifier, FilterExtractor, ContextBuilder, ResponseFormatter
    - Implement routeQuery() main entry point
    - Implement simple query execution path (direct Firestore via FindingsService)
    - Implement complex query execution path (context + GeminiService)
    - Implement hybrid query execution path (Firestore then AI)
    - Implement error handling with fallbacks
    - _Requirements: 3.1, 4.1, 5.1, 5.2, 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ] 9.2 Write unit tests for QueryRouterService
    - Test simple query routing end-to-end
    - Test complex query routing with mocked GeminiService
    - Test hybrid query routing
    - Test error fallback scenarios
    - _Requirements: 3.1, 4.1, 5.1, 8.1, 8.2, 8.3, 8.4_

- [ ] 10. Implement edge cases and error handling
  - [x] 10.1 Implement zero results handling





    - Add suggestion logic for broadening search criteria
    - Skip AI analysis for hybrid queries with zero findings
    - _Requirements: 3.4, 5.4_
  - [ ] 10.2 Implement rate limiting for AI queries
    - Track daily AI query count per user
    - Return notification when limit (50) exceeded
    - Suggest using simple queries
    - _Requirements: 7.2_
  - [ ] 10.3 Implement query logging for analytics
    - Log query type, estimated cost, execution time
    - Log errors with details for debugging
    - _Requirements: 7.3, 8.5_
  - [ ] 10.4 Write unit tests for edge cases
    - Test zero results handling
    - Test rate limiting behavior
    - Test error logging
    - _Requirements: 3.4, 5.4, 7.2, 8.5_

- [ ] 11. Integrate with ChatInterface
  - [x] 11.1 Update ChatInterface to use QueryRouterService





    - Modify ChatInterface.tsx to route queries through QueryRouterService
    - Display query type indicator in UI (🔍 Database Search vs 🤖 AI Analysis)
    - Display response metadata (execution time, findings count)
    - Handle error responses gracefully
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ] 11.2 Add query type override UI
    - Add option for users to force query type ("Search as AI" / "Search as Query")
    - Pass override to QueryRouterService.executeAs()
    - _Requirements: 1.1, 1.2_

- [ ] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
