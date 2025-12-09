# DocAI Architecture Diagram

Visual representation of the DocAI system architecture and data flow.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DocPage (UI)                             │
│  - User input                                                    │
│  - Message display                                               │
│  - Session management                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DocAIService (Orchestrator)                   │
│  - Coordinates all services                                      │
│  - Manages data flow                                             │
│  - Handles errors                                                │
└──┬──────────────┬──────────────┬──────────────┬─────────────────┘
   │              │              │              │
   ▼              ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ Session  │ │  Chat    │ │  Query   │ │  Gemini API      │
│ Service  │ │ History  │ │   Log    │ │  Service         │
│          │ │ Service  │ │ Service  │ │                  │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────────────┘
     │            │            │            │
     ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Firestore Database                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │doc_sessions  │  │doc_chat_     │  │doc_query_    │          │
│  │              │  │history       │  │logs          │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         doc_sessions                             │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                        │
│ • userId                                                         │
│ • createdAt                                                      │
│ • updatedAt                                                      │
│ • lastActivityAt                                                 │
│ • anonymizationMap: { real → anonymized }                       │
│ • sessionMetadata: { deviceInfo, ipAddress, userAgent }         │
│ • isActive: boolean                                              │
│ • messageCount: number                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ 1:N
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│  doc_chat_history    │  │   doc_query_logs     │
├──────────────────────┤  ├──────────────────────┤
│ • id (PK)            │  │ • id (PK)            │
│ • sessionId (FK)     │  │ • sessionId (FK)     │
│ • userId             │  │ • userId             │
│ • role               │  │ • chatHistoryId (FK) │◄─┐
│ • message            │  │ • timestamp          │  │
│ • response           │  │ • intent             │  │
│ • timestamp          │  │ • filtersUsed        │  │
│ • thinkingMode       │  │ • queryType          │  │
│ • metadata           │  │ • resultsCount       │  │
└──────────────────────┘  │ • dataSourcesQueried │  │
         │                │ • executionTimeMs    │  │
         │                │ • success            │  │
         │                │ • errorMessage       │  │
         │                │ • contextUsed        │  │
         │                └──────────────────────┘  │
         │                                           │
         └───────────────────────────────────────────┘
                    Optional Link
```

## Data Flow: User Sends Message

```
┌──────────┐
│   User   │
│  Types   │
│ Message  │
└────┬─────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: DocPage.handleSend()                                     │
│ - Validate input                                                 │
│ - Add user message to UI                                         │
│ - Set loading state                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: DocAIService.sendDocQuery()                              │
│ - Get/Create session                                             │
│ - Load conversation history                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: DocSessionService                                        │
│ ✓ getOrCreateSession(userId)                                     │
│   - Check for active session                                     │
│   - Create new if needed                                         │
│   - Return sessionId                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: DocChatHistoryService                                    │
│ ✓ getFormattedHistory(sessionId, 10)                             │
│   - Retrieve last 10 messages                                    │
│   - Format for Gemini API                                        │
│ ✓ addUserMessage(sessionId, userId, message)                     │
│   - Store user message                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: GeminiService                                            │
│ ✓ sendMessageToGemini(message, mode, sessionId, history)         │
│   - Send to Gemini API with context                              │
│   - Get AI response                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: DocChatHistoryService                                    │
│ ✓ addAssistantResponse(sessionId, userId, message, response)     │
│   - Store AI response                                            │
│   - Include metadata (responseTime, tokens, etc)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: DocQueryLogService                                       │
│ ✓ logSuccess(sessionId, userId, queryData)                       │
│   - Log query execution                                          │
│   - Record performance metrics                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 8: DocSessionService                                        │
│ ✓ incrementMessageCount(sessionId)                               │
│   - Update message count                                         │
│   - Update lastActivityAt                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 9: Return to DocPage                                        │
│ - Add AI response to UI                                          │
│ - Clear loading state                                            │
│ - Auto-scroll to bottom                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                    ┌────────┐
                    │  User  │
                    │  Sees  │
                    │Response│
                    └────────┘
```

## Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      New User Opens DocPage                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Has Active   │
                  │  Session?    │
                  └──┬────────┬──┘
                     │        │
                 NO  │        │  YES
                     │        │
        ┌────────────┘        └────────────┐
        │                                  │
        ▼                                  ▼
┌──────────────────┐            ┌──────────────────┐
│ Create Session   │            │  Load Session    │
│ - isActive: true │            │  - Load history  │
│ - messageCount:0 │            │  - Display msgs  │
└────────┬─────────┘            └────────┬─────────┘
         │                               │
         └───────────┬───────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   User Sends Message  │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Update lastActivityAt │
         │ Increment messageCount│
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   More Messages...    │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ User Closes / Timeout │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Session Stays Active  │
         │ (for next visit)      │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ User Starts New Chat  │
         │ (optional)            │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Deactivate Old Session│
         │ isActive: false       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  After 30+ Days       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Cleanup Job Runs     │
         │  Delete Old Sessions  │
         │  + History + Logs     │
         └───────────────────────┘
```

## Query Analytics Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Every Query Execution                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────┐
         │   Start Timer             │
         │   startTime = Date.now()  │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │   Execute Query           │
         │   - Detect intent         │
         │   - Extract filters       │
         │   - Query data sources    │
         │   - Get results           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │   Calculate Metrics       │
         │   executionTime = now -   │
         │                 startTime │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │   Log to doc_query_logs   │
         │   - sessionId             │
         │   - userId                │
         │   - intent                │
         │   - filtersUsed           │
         │   - queryType             │
         │   - resultsCount          │
         │   - dataSourcesQueried    │
         │   - executionTimeMs       │
         │   - success               │
         │   - contextUsed           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │   Available for Analytics │
         │   - Session stats         │
         │   - User analytics        │
         │   - Performance monitoring│
         │   - Error debugging       │
         └───────────────────────────┘
```

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   DocPage    │  │  Analytics   │  │   Admin      │          │
│  │  Component   │  │  Dashboard   │  │   Panel      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                   Service Layer                                  │
│                            │                                      │
│              ┌─────────────▼─────────────┐                       │
│              │    DocAIService           │                       │
│              │  (Orchestrator)           │                       │
│              └─────────────┬─────────────┘                       │
│                            │                                      │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                  │
│    ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐           │
│    │ Session │      │    Chat     │    │   Query   │           │
│    │ Service │      │   History   │    │    Log    │           │
│    │         │      │   Service   │    │  Service  │           │
│    └────┬────┘      └──────┬──────┘    └─────┬─────┘           │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                 │
│                            │                                      │
│              ┌─────────────▼─────────────┐                       │
│              │   DatabaseService         │                       │
│              │   (Base Class)            │                       │
│              │   - CRUD operations       │                       │
│              │   - Query building        │                       │
│              │   - Error handling        │                       │
│              │   - Retry logic           │                       │
│              └─────────────┬─────────────┘                       │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                   Data Layer                                     │
│              ┌─────────────▼─────────────┐                       │
│              │   Firestore Database      │                       │
│              │   - doc_sessions          │                       │
│              │   - doc_chat_history      │                       │
│              │   - doc_query_logs        │                       │
│              └───────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                      DocAI Key Features                          │
└─────────────────────────────────────────────────────────────────┘

1. SESSION MANAGEMENT
   ┌──────────────────────────────────────┐
   │ • Auto-create/retrieve sessions      │
   │ • Track activity timestamps          │
   │ • Manage active/inactive states      │
   │ • Store anonymization mappings       │
   └──────────────────────────────────────┘

2. CONVERSATION HISTORY
   ┌──────────────────────────────────────┐
   │ • Store all messages & responses     │
   │ • Provide context to AI              │
   │ • Track thinking modes               │
   │ • Record performance metrics         │
   └──────────────────────────────────────┘

3. QUERY ANALYTICS
   ┌──────────────────────────────────────┐
   │ • Log every query execution          │
   │ • Track success/failure rates        │
   │ • Monitor performance                │
   │ • Analyze usage patterns             │
   └──────────────────────────────────────┘

4. ERROR HANDLING
   ┌──────────────────────────────────────┐
   │ • Retry logic with backoff           │
   │ • Detailed error logging             │
   │ • Graceful degradation               │
   │ • User-friendly error messages       │
   └──────────────────────────────────────┘

5. PRIVACY & SECURITY
   ┌──────────────────────────────────────┐
   │ • User-scoped data access            │
   │ • Anonymization support              │
   │ • Firestore security rules           │
   │ • Automatic cleanup of old data      │
   └──────────────────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Performance Strategies                        │
└─────────────────────────────────────────────────────────────────┘

1. INDEXED QUERIES
   • All common query patterns have composite indexes
   • Fast retrieval of session history
   • Efficient user analytics queries

2. DENORMALIZATION
   • userId stored in all tables for quick filtering
   • Reduces need for joins
   • Enables parallel queries

3. PAGINATION
   • Built-in pagination support
   • Limit query results
   • Cursor-based navigation

4. CACHING
   • Session data cached in memory
   • Conversation history cached
   • Reduces database reads

5. BATCH OPERATIONS
   • Cleanup operations use batching
   • Efficient bulk deletes
   • Reduced transaction costs

6. LAZY LOADING
   • Load history only when needed
   • Progressive message loading
   • On-demand analytics
```
