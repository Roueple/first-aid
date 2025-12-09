# Requirements Document

## Introduction

The DocAI Simple Query feature enables users to query audit findings using natural language patterns that are translated directly into Firebase queries without requiring LLM API calls. This feature provides instant, cost-free responses for common query patterns while maintaining the option to use AI-powered analysis for complex queries.

## Glossary

- **Simple Query**: A query that matches predefined patterns and can be translated directly to Firebase queries without LLM processing
- **Pattern Matcher**: A component that identifies query patterns using regex or keyword matching
- **Query Builder**: A component that constructs Firebase query parameters from extracted pattern data
- **DocAI Service**: The existing document assistant service that integrates with Gemini API
- **Audit Result**: A finding or non-finding record in the audit-results Firestore collection
- **Firebase Query**: A Firestore database query with filters, sorts, and limits
- **Fallback Mode**: When a query doesn't match simple patterns, it falls back to LLM processing

## Requirements

### Requirement 1

**User Story:** As a user, I want to query audit findings using simple natural language without waiting for AI processing, so that I can get instant results for common queries.

#### Acceptance Criteria

1. WHEN a user submits a query that matches a simple pattern THEN the system SHALL translate it directly to a Firebase query without calling the LLM API
2. WHEN a simple query is executed THEN the system SHALL return results within 500 milliseconds
3. WHEN a simple query is processed THEN the system SHALL log the query type as "simple_query" in the chat metadata
4. WHEN a simple query returns results THEN the system SHALL format them in a consistent, readable format
5. WHEN a simple query pattern is not matched THEN the system SHALL fall back to the existing LLM-powered query processing

### Requirement 2

**User Story:** As a user, I want to query findings by year, so that I can see audit results from specific time periods.

#### Acceptance Criteria

1. WHEN a user queries "findings from [year]" THEN the system SHALL filter results WHERE year == [year]
2. WHEN a user queries "show me [year] findings" THEN the system SHALL filter results WHERE year == [year]
3. WHEN a user queries "[year] audit results" THEN the system SHALL filter results WHERE year == [year]
4. WHEN temporal queries are executed THEN the system SHALL sort results by nilai in descending order
5. WHEN a year is not explicitly provided THEN the system SHALL use the current year as default

### Requirement 3

**User Story:** As a user, I want to query findings by department, so that I can see audit results for specific business units.

#### Acceptance Criteria

1. WHEN a user queries "[department] findings" THEN the system SHALL filter results WHERE department == [department]
2. WHEN a user queries "show me [department] department" THEN the system SHALL filter results WHERE department == [department]
3. WHEN a user queries "findings from [department]" THEN the system SHALL filter results WHERE department == [department]
4. WHEN department queries are executed THEN the system SHALL sort results by year in descending order
5. WHEN a department name is case-insensitive THEN the system SHALL normalize it to match database values

### Requirement 4

**User Story:** As a user, I want to query high-risk findings, so that I can prioritize critical audit issues.

#### Acceptance Criteria

1. WHEN a user queries "critical findings" THEN the system SHALL filter results WHERE nilai >= 15
2. WHEN a user queries "high risk findings" THEN the system SHALL filter results WHERE nilai >= 10
3. WHEN a user queries "medium risk findings" THEN the system SHALL filter results WHERE nilai >= 5 AND nilai < 10
4. WHEN risk-based queries are executed THEN the system SHALL sort results by nilai in descending order
5. WHEN a user queries "top [N] findings" THEN the system SHALL limit results to N items ordered by nilai descending

### Requirement 5

**User Story:** As a user, I want to query findings by project, so that I can see audit results for specific projects.

#### Acceptance Criteria

1. WHEN a user queries "findings for [projectName]" THEN the system SHALL filter results WHERE projectName == [projectName]
2. WHEN a user queries "[projectName] findings" THEN the system SHALL filter results WHERE projectName == [projectName]
3. WHEN a user queries "show me [projectName] audit results" THEN the system SHALL filter results WHERE projectName == [projectName]
4. WHEN project queries are executed THEN the system SHALL sort results by year in descending order
5. WHEN a project name contains multiple words THEN the system SHALL match the complete project name

### Requirement 6

**User Story:** As a user, I want to combine multiple filters in a single query, so that I can get more specific results.

#### Acceptance Criteria

1. WHEN a user queries "[department] findings from [year]" THEN the system SHALL filter results WHERE department == [department] AND year == [year]
2. WHEN a user queries "critical [department] findings" THEN the system SHALL filter results WHERE department == [department] AND nilai >= 15
3. WHEN a user queries "[department] findings in [year]" THEN the system SHALL filter results WHERE department == [department] AND year == [year]
4. WHEN composite queries are executed THEN the system SHALL apply all extracted filters
5. WHEN composite queries have inequality filters THEN the system SHALL order by the inequality field first

### Requirement 7

**User Story:** As a user, I want to distinguish between findings and non-findings, so that I can focus on actual audit issues.

#### Acceptance Criteria

1. WHEN a user queries "only findings" THEN the system SHALL filter results WHERE code != ''
2. WHEN a user queries "actual findings" THEN the system SHALL filter results WHERE code != ''
3. WHEN a user queries "exclude non-findings" THEN the system SHALL filter results WHERE code != ''
4. WHEN a user queries "non-findings" THEN the system SHALL filter results WHERE code == ''
5. WHEN finding type filters are applied THEN the system SHALL maintain other query filters

### Requirement 8

**User Story:** As a user, I want to query findings by subholding, so that I can see audit results for specific company groups.

#### Acceptance Criteria

1. WHEN a user queries "findings for SH [code]" THEN the system SHALL filter results WHERE sh == [code]
2. WHEN a user queries "[code] subholding findings" THEN the system SHALL filter results WHERE sh == [code]
3. WHEN a user queries "show me [code] audit results" THEN the system SHALL filter results WHERE sh == [code]
4. WHEN subholding queries are executed THEN the system SHALL sort results by year in descending order
5. WHEN a subholding code is provided THEN the system SHALL normalize it to uppercase

### Requirement 9

**User Story:** As a user, I want to see query execution metrics, so that I can understand the performance difference between simple and AI-powered queries.

#### Acceptance Criteria

1. WHEN a simple query is executed THEN the system SHALL record the execution time in milliseconds
2. WHEN a simple query is executed THEN the system SHALL record the query type as "simple_query"
3. WHEN a simple query is executed THEN the system SHALL record the pattern matched
4. WHEN a simple query is executed THEN the system SHALL record the number of results returned
5. WHEN query metrics are stored THEN the system SHALL include them in the chat metadata

### Requirement 10

**User Story:** As a developer, I want to easily add new query patterns, so that the system can support more query types over time.

#### Acceptance Criteria

1. WHEN a new pattern is defined THEN the system SHALL validate it against existing patterns for conflicts
2. WHEN patterns are defined THEN the system SHALL use a declarative configuration format
3. WHEN patterns are processed THEN the system SHALL evaluate them in priority order
4. WHEN a pattern is matched THEN the system SHALL extract all parameter values correctly
5. WHEN patterns are added THEN the system SHALL not require changes to the core query execution logic
