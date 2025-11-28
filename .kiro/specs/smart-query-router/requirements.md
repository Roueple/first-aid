# Requirements Document

## Introduction

The Smart Query Router is an intelligent query classification and routing system for the FIRST-AID findings search application. It optimizes the balance between AI-powered analysis and direct database queries to maximize accuracy, minimize response time, and control API costs. The system differentiates between simple lookup queries (which can be handled by direct Firestore queries) and complex analytical queries (which require AI reasoning with RAG context).

## Glossary

- **Query Router**: The component that classifies user queries and routes them to the appropriate execution path
- **Simple Query**: A query that can be answered by direct database lookup using structured filters (e.g., "Show APAR findings in 2024")
- **Complex Query**: A query requiring AI reasoning, pattern analysis, or recommendations (e.g., "What should a new hotel prioritize based on 2024 findings?")
- **Hybrid Query**: A query that requires both database retrieval and AI analysis of the results
- **Query Intent**: The classified type and extracted parameters from a user's natural language query
- **Structured Filters**: Database query parameters extracted from natural language (year, severity, project type, etc.)
- **RAG (Retrieval-Augmented Generation)**: A technique where relevant findings are retrieved and provided as context to the AI for analysis
- **Function Calling**: Gemini's capability to extract structured parameters from natural language queries
- **Finding**: An audit finding record stored in Firestore with fields like severity, year, project type, etc.

## Requirements

### Requirement 1: Query Classification

**User Story:** As a user, I want the system to automatically determine the best way to answer my question, so that I get fast and accurate results without unnecessary AI costs.

#### Acceptance Criteria

1. WHEN a user submits a query containing only filterable fields (year, severity, project type, status, department) THEN the Query Router SHALL classify the query as "simple" type
2. WHEN a user submits a query containing analytical keywords (recommend, analyze, compare, why, what should, patterns, trends) THEN the Query Router SHALL classify the query as "complex" type
3. WHEN a user submits a query that requires data retrieval followed by analysis THEN the Query Router SHALL classify the query as "hybrid" type
4. WHEN the Query Router classifies a query THEN the Query Router SHALL return a confidence score between 0 and 1 indicating classification certainty
5. IF the Query Router cannot determine query type with confidence above 0.6 THEN the Query Router SHALL default to "complex" type to ensure comprehensive response

### Requirement 2: Filter Extraction

**User Story:** As a user, I want to ask questions in natural language and have the system understand what filters to apply, so that I don't need to manually configure search parameters.

#### Acceptance Criteria

1. WHEN a user mentions a year (e.g., "2024", "last year") THEN the Query Router SHALL extract the year as a filter parameter
2. WHEN a user mentions a project type (e.g., "hotel", "apartment", "hospital") THEN the Query Router SHALL extract the project type as a filter parameter
3. WHEN a user mentions severity terms (e.g., "critical", "high priority", "urgent") THEN the Query Router SHALL map the terms to valid severity levels
4. WHEN a user mentions keywords related to finding content (e.g., "APAR", "fire", "safety") THEN the Query Router SHALL extract the keywords for text search
5. WHEN a user mentions status terms (e.g., "open", "closed", "pending") THEN the Query Router SHALL map the terms to valid status values
6. WHEN the Query Router extracts filters THEN the Query Router SHALL validate all extracted values against the Finding schema

### Requirement 3: Simple Query Execution

**User Story:** As a user, I want simple lookup queries to return results quickly, so that I can efficiently find specific findings without waiting for AI processing.

#### Acceptance Criteria

1. WHEN a query is classified as "simple" THEN the Query Router SHALL execute a direct Firestore query using extracted filters
2. WHEN executing a simple query THEN the Query Router SHALL return results within 500 milliseconds for typical queries
3. WHEN a simple query returns results THEN the Query Router SHALL format the results with finding title, severity, status, and date
4. WHEN a simple query returns zero results THEN the Query Router SHALL suggest broadening the search criteria
5. WHEN a simple query would return more than 50 results THEN the Query Router SHALL paginate the results and indicate total count

### Requirement 4: Complex Query Execution

**User Story:** As a user, I want to ask analytical questions about findings and receive AI-powered insights, so that I can make informed decisions based on historical data.

#### Acceptance Criteria

1. WHEN a query is classified as "complex" THEN the Query Router SHALL retrieve relevant findings as context for AI analysis
2. WHEN executing a complex query THEN the Query Router SHALL limit context injection to a maximum of 20 findings to control token usage
3. WHEN executing a complex query THEN the Query Router SHALL use the existing GeminiService with appropriate thinking mode
4. WHEN a complex query is executed THEN the Query Router SHALL return the AI response within 5 seconds for typical queries
5. WHEN executing a complex query THEN the Query Router SHALL include source finding references in the response

### Requirement 5: Hybrid Query Execution

**User Story:** As a user, I want to combine data retrieval with AI analysis in a single query, so that I can ask questions like "Show me critical findings and explain the patterns."

#### Acceptance Criteria

1. WHEN a query is classified as "hybrid" THEN the Query Router SHALL first execute the database query portion
2. WHEN executing a hybrid query THEN the Query Router SHALL pass the retrieved findings as context to the AI for analysis
3. WHEN executing a hybrid query THEN the Query Router SHALL clearly separate the data results from the AI analysis in the response
4. WHEN a hybrid query retrieves zero findings THEN the Query Router SHALL inform the user and skip the AI analysis portion

### Requirement 6: Response Metadata

**User Story:** As a user, I want to understand how my query was processed, so that I can refine my questions and understand the system's behavior.

#### Acceptance Criteria

1. WHEN the Query Router returns a response THEN the Query Router SHALL include the query type classification in metadata
2. WHEN the Query Router returns a response THEN the Query Router SHALL include the execution time in metadata
3. WHEN the Query Router returns a response THEN the Query Router SHALL include the number of findings analyzed in metadata
4. WHEN a complex or hybrid query is executed THEN the Query Router SHALL include estimated token usage in metadata

### Requirement 7: Cost Control

**User Story:** As a system administrator, I want to control AI API costs, so that the system remains economically sustainable.

#### Acceptance Criteria

1. WHEN injecting findings context for AI analysis THEN the Query Router SHALL limit total context to 10,000 tokens
2. WHEN a user exceeds 50 AI queries per day THEN the Query Router SHALL notify the user and suggest using simple queries
3. WHEN the Query Router processes queries THEN the Query Router SHALL log query type and estimated cost for analytics
4. WHEN selecting findings for context injection THEN the Query Router SHALL prioritize most relevant findings based on extracted filters

### Requirement 8: Error Handling and Fallbacks

**User Story:** As a user, I want the system to handle errors gracefully, so that I always receive a useful response even when something goes wrong.

#### Acceptance Criteria

1. IF query classification fails THEN the Query Router SHALL fall back to complex query type
2. IF Firestore query fails THEN the Query Router SHALL return an error message and suggest retrying
3. IF Gemini API fails THEN the Query Router SHALL fall back to returning raw database results with an explanation
4. IF Gemini API quota is exceeded THEN the Query Router SHALL fall back to simple keyword search and notify the user
5. WHEN any error occurs THEN the Query Router SHALL log the error details for debugging

### Requirement 9: Query Router Serialization

**User Story:** As a developer, I want to serialize and deserialize query intents, so that query classifications can be cached and logged.

#### Acceptance Criteria

1. WHEN a QueryIntent object is created THEN the Query Router SHALL support serialization to JSON format
2. WHEN a JSON string representing a QueryIntent is provided THEN the Query Router SHALL support deserialization back to a QueryIntent object
3. WHEN serializing a QueryIntent THEN the Query Router SHALL preserve all fields including type, confidence, and extracted filters
4. WHEN deserializing a QueryIntent THEN the Query Router SHALL validate the JSON structure against the QueryIntent schema
