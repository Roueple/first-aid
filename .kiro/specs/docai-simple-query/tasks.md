# Implementation Plan

- [x] 1. Set up core pattern matching infrastructure




  - Create SimpleQueryMatcher class with pattern registration and matching logic
  - Implement pattern validation to detect conflicts
  - Implement priority-based pattern selection
  - _Requirements: 10.1, 10.3, 10.4_

- [x] 1.1 Write property test for pattern matching


  - **Property 1: Pattern Matching Bypasses LLM**
  - **Validates: Requirements 1.1**

- [x] 1.2 Write property test for pattern priority


  - **Property 21: Pattern Priority Ordering**
  - **Validates: Requirements 10.3**

- [x] 1.3 Write property test for parameter extraction


  - **Property 22: Parameter Extraction Accuracy**
  - **Validates: Requirements 10.4**

- [x] 2. Implement query pattern definitions





  - Define temporal query patterns (year-based)
  - Define department query patterns
  - Define risk-level query patterns (critical, high, medium)
  - Define project query patterns
  - Define subholding query patterns
  - Define finding type patterns (only findings, non-findings)
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3_

- [x] 2.1 Write property test for year extraction


  - **Property 6: Year Pattern Extraction**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2.2 Write property test for department extraction

  - **Property 8: Department Pattern Extraction**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 2.3 Write property test for project name extraction

  - **Property 12: Project Name Pattern Extraction**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**

- [x] 2.4 Write property test for subholding extraction

  - **Property 17: Subholding Pattern Extraction**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 3. Implement composite query patterns




  - Define department + year composite patterns
  - Define department + risk level composite patterns
  - Implement multi-filter query building
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3.1 Write property test for composite filters


  - **Property 14: Composite Filter Application**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 3.2 Write property test for inequality sort order

  - **Property 15: Inequality Sort Order**
  - **Validates: Requirements 6.5**

- [x] 4. Implement SimpleQueryExecutor





  - Create query builder that converts patterns to Firebase queries
  - Implement filter construction from extracted parameters
  - Implement sort order construction based on query type
  - Add support for Firestore inequality constraints
  - _Requirements: 2.4, 3.4, 4.4, 5.4, 6.5, 8.4_

- [x] 4.1 Write property test for temporal query sorting





  - **Property 7: Temporal Query Sorting**
  - **Validates: Requirements 2.4**

- [x] 4.2 Write property test for department query sorting

  - **Property 9: Department Query Sorting**
  - **Validates: Requirements 3.4**

- [x] 4.3 Write property test for project query sorting

  - **Property 13: Project Query Sorting**
  - **Validates: Requirements 5.4**

- [x] 4.4 Write property test for subholding query sorting

  - **Property 18: Subholding Query Sorting**
  - **Validates: Requirements 8.4**

- [x] 5. Implement parameter normalization





  - Add case-insensitive department name matching
  - Add uppercase normalization for subholding codes
  - Add multi-word project name handling
  - _Requirements: 3.5, 5.5, 8.5_

- [x] 5.1 Write property test for department case normalization


  - **Property 10: Case-Insensitive Department Matching**
  - **Validates: Requirements 3.5**

- [x] 5.2 Write property test for subholding code normalization


  - **Property 19: Subholding Code Normalization**
  - **Validates: Requirements 8.5**

- [x] 6. Implement query execution and result formatting





  - Execute Firebase queries through AuditResultService
  - Format results in consistent, readable format
  - Handle empty results with helpful suggestions
  - Implement top N result limiting
  - _Requirements: 1.4, 4.5_

- [x] 6.1 Write property test for result format consistency


  - **Property 4: Result Format Consistency**
  - **Validates: Requirements 1.4**

- [x] 6.2 Write property test for top N limiting


  - **Property 11: Top N Limit Application**
  - **Validates: Requirements 4.5**

- [x] 7. Implement SimpleQueryService





  - Create main service coordinating matcher and executor
  - Add query processing with pattern matching
  - Implement metadata collection (execution time, pattern matched, results count)
  - Add pattern management methods (add, validate, list)
  - _Requirements: 1.3, 9.1, 9.3, 9.4, 9.5_

- [x] 7.1 Write property test for metadata logging


  - **Property 3: Metadata Logging Consistency**
  - **Validates: Requirements 1.3, 9.1, 9.3, 9.4, 9.5**

- [x] 8. Integrate with DocAIService








  - Modify sendDocQuery to try simple query first
  - Implement fallback to existing LLM flow when no pattern matches
  - Store simple query metadata in DocChatService
  - Ensure session management works correctly
  - _Requirements: 1.1, 1.5_

- [x] 8.1 Write property test for fallback behavior



  - **Property 5: Fallback Behavior**
  - **Validates: Requirements 1.5**

- [x] 8.2 Write property test for finding type filter preservation


  - **Property 16: Finding Type Filter Preservation**
  - **Validates: Requirements 7.5**

- [x] 9. Implement performance optimizations




  - Add query result caching with TTL
  - Optimize pattern matching order by priority
  - Implement early exit on first match
  - Pre-compile regex patterns at initialization
  - _Requirements: 1.2_

- [x] 9.1 Write property test for query performance


  - **Property 2: Simple Query Performance**
  - **Validates: Requirements 1.2**

- [x] 10. Add configuration and feature flag













  - Create configuration file for pattern definitions
  - Add feature flag for gradual rollout
  - Implement configuration validation
  - Add monitoring hooks for metrics collection
  - _Requirements: 10.2_

- [ ] 11. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Create pattern conflict detection
  - Implement pattern validation logic
  - Add conflict detection for overlapping patterns
  - Create error messages for pattern conflicts
  - _Requirements: 10.1_

- [ ] 12.1 Write property test for pattern conflict detection
  - **Property 20: Pattern Conflict Detection**
  - **Validates: Requirements 10.1**

- [ ] 13. Add comprehensive error handling
  - Handle pattern matching failures gracefully
  - Handle Firebase query errors with user-friendly messages
  - Implement timeout handling with fallback
  - Add logging for debugging
  - _Requirements: 1.5_

- [ ] 14. Create documentation and examples
  - Document available query patterns
  - Create usage examples for each pattern type
  - Document how to add custom patterns
  - Create troubleshooting guide
  - _Requirements: 10.2_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
