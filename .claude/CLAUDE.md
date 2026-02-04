# FIRST-AID Project Configuration

**FIRST-AID** - Intelligent Audit Findings Management System
Enterprise Electron desktop application for managing internal audit findings with AI-assisted analysis.

---

## 1. Project Identity & Quick Reference

### Application Overview
- **Name**: FIRST-AID (Intelligent Audit Findings Management System)
- **Purpose**: Streamline audit findings management, track remediation, enable AI analysis
- **Target**: Internal audit teams, compliance officers
- **Platform**: Cross-platform desktop (Windows/Mac/Linux via Electron)

### Technology Stack
- **Frontend**: React 18.2.0 + TypeScript 5.7.2 + Vite 7.2.2
- **Desktop**: Electron 39.1.1 + Electron Builder 25.1.8
- **Backend**: Firebase 12.5.0 (Firestore, Auth, Cloud Functions)
- **AI**: Google Gemini API (@google/generative-ai 0.24.1)
- **State**: TanStack React Query 5.90.10
- **UI**: TailwindCSS 3.4.17 + React Table 8.21.3 + Recharts 3.5.0
- **Validation**: Zod 4.1.12

### Development Commands
```bash
# Development
npm run dev                    # Start dev server (renderer + electron)
npm run dev:renderer           # Vite dev server only
npm run dev:electron           # Electron only
npm run dev:emulators          # Firebase emulators
npm run dev:with-emulators     # Dev + emulators together

# Build & Package
npm run build                  # Build renderer + electron
npm run build:renderer         # Vite build
npm run build:electron         # TypeScript compilation
npm run package                # Create distributable

# Quality & Testing
npm run lint                   # ESLint
npm run format                 # Prettier
npm test                       # Run tests (Vitest)
npm run test:watch             # Watch mode
npm run test:ui                # Vitest UI
npm run test:rules             # Test Firestore rules

# Firebase
npm run deploy:rules           # Deploy Firestore rules
```

### SuperClaude Command Shortcuts
```bash
/implement [feature]           # Add new feature with AI guidance
/analyze --focus security      # Security analysis
/improve --quality             # Code quality improvements
/build                         # Build with error handling
/test                          # Run tests and generate reports
/document [target]             # Generate documentation
/troubleshoot [issue]          # Debug issues
```

---

## 2. Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────┐
│   Electron Main Process (main.ts)       │
│   - Window management                   │
│   - CSP policy                          │
│   - Preload bridge                      │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│      React Frontend (Vite)              │
│  ┌──────────────────────────────────┐  │
│  │  Pages (Routes)                   │  │
│  │  - Login, Dashboard, Findings     │  │
│  │  - Chat, AuditLogs, Settings      │  │
│  └──────────┬───────────────────────┘  │
│             │                            │
│  ┌──────────▼───────────────────────┐  │
│  │  Service Layer                    │  │
│  │  - DatabaseService (generic CRUD)│  │
│  │  - FindingsService (specialized) │  │
│  │  - GeminiService (AI)            │  │
│  │  - AuditService (logging)        │  │
│  │  - ChatSessionService            │  │
│  └──────────┬───────────────────────┘  │
│             │                            │
│  ┌──────────▼───────────────────────┐  │
│  │  External Services                │  │
│  │  - Firebase (Firestore, Auth)    │  │
│  │  - Google Gemini API             │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Key Design Patterns
1. **Service Layer Pattern**: All database/API calls go through service classes
2. **Generic Base Class**: `DatabaseService<T>` provides reusable CRUD operations
3. **Specialized Services**: Extend base class for domain-specific logic
4. **Custom Hooks**: `useFindings()`, `useChatSession()`, `useDashboardStats()`
5. **React Query**: Automatic caching, optimistic updates, stale-while-revalidate
6. **Context API**: `AuthContext` for global authentication state
7. **Error Handling**: Custom `DatabaseError` with typed error codes
8. **Connection Resilience**: Exponential backoff retry logic (1s → 2s → 4s, max 10s)

### Security Features
- **Firestore Rules**: Row-level security, authenticated access only
- **Electron Sandbox**: Context isolation, no Node integration in renderer
- **Content Security Policy**: Configured CSP headers
- **Server-Side Logging**: Audit logs via Cloud Functions (tamper-proof)
- **User-Specific Data**: Chat sessions and reports isolated by userId

### Project Structure
```
FIRST-AID/
├── src/
│   ├── components/       # Reusable React components
│   ├── config/          # Firebase configuration
│   ├── contexts/        # React Context (AuthContext)
│   ├── hooks/           # Custom React hooks
│   ├── main/            # Electron main process
│   ├── renderer/        # React frontend
│   │   ├── pages/       # Page components (routes)
│   │   ├── App.tsx      # Root component with routing
│   │   └── main.tsx     # React DOM mount
│   ├── services/        # Business logic layer
│   ├── types/           # TypeScript + Zod schemas
│   └── utils/           # Utility functions
├── firestore.rules      # Database security rules
├── firestore.indexes.json  # Database indexes
└── package.json         # Dependencies & scripts
```

---

## 3. Database Schema (Firestore Collections)

### Collection: `findings`
**Purpose**: Core audit findings records

**Complete Interface**:
```typescript
interface Finding {
  // Core Identification
  id: string;                          // FND-2024-001
  auditYear: number;                   // 2024

  // Organizational Structure
  subholding: string;                  // Business unit
  projectType: ProjectType;            // Hotel | Apartment | School | etc.
  projectName: string;                 // Project name
  findingDepartment: string;           // Affected department

  // Audit Team
  executor: string;                    // Auditor who executed
  reviewer: string;                    // Auditor who reviewed
  manager: string;                     // Manager who approved

  // Finding Classification
  controlCategory: ControlCategory;    // Preventive | Detective | Corrective
  processArea: string;                 // Sales, Finance, HR, IT, etc.

  // Finding Details
  findingTitle: string;                // 50-100 chars
  findingDescription: string;          // Detailed description
  rootCause: string;                   // Root cause analysis
  impactDescription: string;           // Actual/potential impact
  recommendation: string;              // Audit recommendation

  // Severity Scoring
  findingBobot: number;                // 1-4 (Weight)
  findingKadar: number;                // 1-5 (Intensity)
  findingTotal: number;                // 1-20 (Bobot × Kadar)
  priorityLevel: FindingSeverity;      // Critical | High | Medium | Low

  // Tags & Classification
  primaryTag: string;                  // Main category
  secondaryTags: string[];             // Additional tags

  // Timestamps & Metadata
  creationTimestamp: Timestamp;        // Auto-generated
  lastModifiedDate: Timestamp;         // Auto-updated
  modifiedBy: string;                  // User who modified
  notes?: string;                      // Additional comments

  // Status Tracking
  status: FindingStatus;               // Open | In Progress | Closed | Deferred
  dateIdentified: Timestamp;
  dateDue?: Timestamp;
  dateCompleted?: Timestamp;

  // Management Response
  managementResponse?: string;
  actionPlan?: string;

  // Evidence
  evidence?: string[];
  attachments?: FileReference[];

  // Import Tracking
  originalSource: string;
  importBatch: string;

  // Computed Fields (not stored)
  isOverdue?: boolean;
  daysOpen?: number;
}
```

**Priority Level Calculation**:
```
findingTotal = findingBobot × findingKadar

Critical: 16-20
High: 11-15
Medium: 6-10
Low: 1-5
```

**Access Rules**: Authenticated users (read/write)

---

### Collection: `chatSessions`
**Purpose**: AI conversation sessions for findings analysis

```typescript
interface ChatSession {
  userId: string;                      // Session owner
  title: string;                       // Session name
  messages: ChatMessage[];             // Message history
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  metadata?: {
    confidence?: number;               // 0-1 confidence score
    sources?: string[];                // Finding IDs referenced
    suggestions?: string[];            // Follow-up suggestions
    processingTime?: number;           // Response time (ms)
    isError?: boolean;                 // Error flag
  };
}
```

**Access Rules**: User-specific (`resource.data.userId == request.auth.uid`)

---

### Collection: `auditLogs`
**Purpose**: Compliance audit trail for all system actions

```typescript
interface AuditLog {
  userId: string;
  action: AuditAction;                 // login, create, update, delete, etc.
  resourceType: ResourceType;          // finding, report, chat, user, etc.
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: Timestamp;
}
```

**Actions**: `login`, `logout`, `create`, `update`, `delete`, `export`, `ai_query`, `import`, `report_generate`, `report_download`, `error`

**Access Rules**: Server-side only (`allow read, write: if false`)

---

### Other Collections

**`reports`**: Generated audit reports (user-specific access)
**`patterns`**: System-identified patterns (Cloud Functions write only)
**`users`**: User profiles (authenticated access)
**`mappings`**: Privacy/pseudonymization mappings (server-side only)

---

## 4. Development Patterns

### Service Layer Pattern

**Base Service (Generic CRUD)**:
```typescript
class DatabaseService<T> {
  protected collectionName: string;
  protected retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  // Core CRUD operations with retry logic
  async create(data: Partial<T>): Promise<string> { ... }
  async getById(id: string): Promise<(T & { id: string }) | null> { ... }
  async update(id: string, data: Partial<T>): Promise<void> { ... }
  async delete(id: string): Promise<void> { ... }
  async getAll(options?: QueryOptions): Promise<(T & { id: string })[]> { ... }
  async getPaginated(pagination: Pagination): Promise<PaginatedResult<T>> { ... }

  // Utility methods
  async count(options?: QueryOptions): Promise<number> { ... }
  async exists(id: string): Promise<boolean> { ... }

  // Connection management
  isConnected(): boolean { ... }
  getConnectionStatus(): ConnectionStatus { ... }
}
```

**Specialized Service Example**:
```typescript
class FindingsService extends DatabaseService<Finding> {
  constructor() {
    super('findings');
  }

  // Specialized query methods
  async getFindingsBySeverity(severity: FindingSeverity): Promise<Finding[]> {
    return this.getAll({
      filters: [{ field: 'priorityLevel', operator: '==', value: severity }],
      sorts: [{ field: 'dateIdentified', direction: 'desc' }],
    });
  }

  async getOverdueFindings(): Promise<Finding[]> {
    const now = Timestamp.now();
    return this.getAll({
      filters: [
        { field: 'status', operator: '!=', value: 'Closed' },
        { field: 'dateDue', operator: '<', value: now },
      ],
    });
  }
}
```

---

### TypeScript + Zod Validation

```typescript
// Use interfaces for object shapes
interface Finding { ... }

// Use types for unions
type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
type FindingStatus = 'Open' | 'In Progress' | 'Closed' | 'Deferred';

// Zod schemas for runtime validation
const FindingSchema = z.object({
  id: z.string(),
  auditYear: z.number().int().min(2000).max(2100),
  findingBobot: z.number().int().min(1).max(4),
  findingKadar: z.number().int().min(1).max(5),
  // ... full schema
});

// Validate at runtime
const result = FindingSchema.safeParse(data);
if (!result.success) {
  console.error(result.error);
}
```

---

### React Query Patterns

**Query Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,           // 5 minutes
      gcTime: 10 * 60 * 1000,              // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});
```

**Custom Hook Example**:
```typescript
function useFindings(filters?: FindingFilters) {
  return useQuery({
    queryKey: ['findings', filters],
    queryFn: () => findingsService.getFilteredFindings(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// Usage
const { data: findings, isLoading, error } = useFindings({
  severity: 'Critical',
  status: 'Open',
});
```

**Mutations with Optimistic Updates**:
```typescript
const createMutation = useMutation({
  mutationFn: (newFinding: Finding) => findingsService.create(newFinding),
  onMutate: async (newFinding) => {
    await queryClient.cancelQueries({ queryKey: ['findings'] });
    const previous = queryClient.getQueryData(['findings']);
    queryClient.setQueryData(['findings'], (old) => [...old, newFinding]);
    return { previous };
  },
  onError: (err, newFinding, context) => {
    queryClient.setQueryData(['findings'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['findings'] });
  },
});
```

---

### Error Handling

**Custom Error Types**:
```typescript
enum DatabaseErrorType {
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

**Error Handling in Components**:
```typescript
try {
  await findingsService.create(newFinding);
  showSuccessToast('Finding created successfully');
} catch (error) {
  if (error instanceof DatabaseError) {
    switch (error.type) {
      case DatabaseErrorType.PERMISSION_DENIED:
        showErrorToast('You do not have permission to perform this action');
        break;
      case DatabaseErrorType.NETWORK_ERROR:
        showErrorToast('Network error. Please check your connection.');
        break;
      default:
        showErrorToast('An error occurred. Please try again.');
    }
  }
}
```

---

### Connection Resilience

**Retry Logic with Exponential Backoff**:
```typescript
protected async executeWithRetry<R>(
  operation: () => Promise<R>,
  operationName: string
): Promise<R> {
  let delay = 1000; // 1 second

  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      await this.checkConnection();
      return await operation();
    } catch (error) {
      if (this.shouldNotRetry(error) || attempt === 3) {
        throw this.mapError(error, operationName);
      }

      await this.sleep(delay);
      delay = Math.min(delay * 2, 10000); // Max 10 seconds
    }
  }
}
```

**Don't Retry On**:
- `permission-denied`
- `not-found`
- `invalid-argument`
- `failed-precondition`

---

## 5. Key Features & Implementation

### Authentication
**Implementation**: Firebase Auth + React Context + AuthGuard component

```typescript
// Using auth context
const { user, login, logout } = useAuth();

// Login workflow
const handleLogin = async (email: string, password: string) => {
  await login(email, password);
  navigate('/dashboard');
};

// Protected route
<Route element={<AuthGuard><FindingsPage /></AuthGuard>} />
```

**Key Files**: `src/contexts/AuthContext.tsx`, `src/components/AuthGuard.tsx`

---

### Findings CRUD
**Implementation**: FindingsService + React Query + pagination

```typescript
// Get filtered findings
const { data: findings } = useFindings({
  severity: 'Critical',
  status: 'Open',
  subholding: 'Jakarta',
});

// Create finding
const createMutation = useMutation({
  mutationFn: findingsService.create,
  onSuccess: () => {
    queryClient.invalidateQueries(['findings']);
    showSuccessToast('Finding created');
  },
});

// Priority calculation (auto-calculated)
const priorityLevel = calculatePriorityLevel(
  finding.findingBobot,
  finding.findingKadar
);
```

**Key Files**: `src/services/FindingsService.ts`, `src/hooks/useFindings.ts`

---

### AI Chat
**Implementation**: GeminiService with thinking modes

```typescript
// Initialize Gemini
const geminiService = new GeminiService(apiKey);

// Send message with history
const response = await sendMessageToGemini(
  userMessage,
  'high',                    // thinking mode: 'low' | 'high'
  sessionId,
  conversationHistory
);

// Chat session management
const { messages, sendMessage, isLoading } = useChatSession(sessionId);
```

**Key Files**: `src/services/GeminiService.ts`, `src/services/ChatSessionService.ts`

---

### Dashboard & Analytics
**Implementation**: Real-time statistics + Recharts visualizations

```typescript
// Calculate statistics
const stats = useDashboardStats();
const criticalCount = stats.bySeverity.Critical;
const openCount = stats.byStatus.Open;

// Real-time updates
const { data } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: calculateDashboardStats,
  staleTime: 60 * 1000, // 1 minute
});
```

**Key Files**: `src/hooks/useDashboardStats.ts`, `src/renderer/pages/DashboardPage.tsx`

---

### Audit Logging
**Implementation**: Cloud Functions for tamper-proof logging

```typescript
// Log action (via service layer)
await auditService.logAction({
  action: 'create',
  resourceType: 'finding',
  resourceId: finding.id,
  details: { title: finding.findingTitle },
});

// Graceful failure (don't break app if logging fails)
try {
  await auditService.logAction(...);
} catch (error) {
  console.error('Audit logging failed:', error);
  // Continue with main operation
}
```

**Key Files**: `src/services/AuditService.ts`, Cloud Functions: `functions/src/auditLog.ts`

---

## 6. AI Integration (Gemini)

### Configuration
```typescript
// Model: gemini-3-pro-preview
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview'
});

// Generation config
const generationConfig = {
  thinkingConfig: {
    thinkingLevel: 'high',  // or 'low'
  },
};
```

### Thinking Modes
**Low Complexity** (default):
- Quick responses for simple queries
- Finding lookups and basic analysis
- Standard prompt without special instructions

**High Complexity** (`thinkingMode: 'high'`):
- Deep analysis of patterns and trends
- Complex multi-finding comparisons
- Root cause analysis across multiple findings
- Strategic recommendations

### Context Injection Pattern
```typescript
const findingContext = findings.map(f => ({
  id: f.id,
  title: f.findingTitle,
  severity: f.priorityLevel,
  status: f.status,
  description: f.findingDescription,
}));

const prompt = `
Context: You are analyzing audit findings for an internal audit team.

Findings Context:
${JSON.stringify(findingContext, null, 2)}

User Question: ${userMessage}

Provide detailed analysis with:
- Patterns identified
- Risk assessment
- Recommendations
`;
```

### Error Handling
```typescript
try {
  const response = await sendMessageToGemini(...);
  return response;
} catch (error) {
  if (error.message.includes('API key')) {
    return 'Please configure your Gemini API key in Settings.';
  } else if (error.message.includes('quota')) {
    return 'API quota exceeded. Please wait or upgrade quota.';
  } else {
    return 'An error occurred. Please try again.';
  }
}
```

### Chat Session Management
```typescript
// Create chat session with history
const chatSession = model.startChat({
  history: conversationHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  })),
  generationConfig,
});

// Send message
const result = await chatSession.sendMessage(message);
const response = await result.response;

// Clear session when done
clearChatSession(sessionId);
```

---

## 7. Common Workflows

### Adding a New Feature
1. **Create Types**: Add interfaces/types in `/src/types/[feature].types.ts`
2. **Create Service**: Extend `DatabaseService<T>` in `/src/services/[Feature]Service.ts`
3. **Create Hook**: Add custom hook in `/src/hooks/use[Feature].ts`
4. **Create Components**: Build UI components in `/src/components/`
5. **Create Page**: Add page component in `/src/renderer/pages/[Feature]Page.tsx`
6. **Add Route**: Register route in `src/renderer/App.tsx`
7. **Write Tests**: Add unit/integration tests
8. **Update Docs**: Update this CLAUDE.md file

### Modifying Database Schema
1. **Update Rules**: Modify `firestore.rules`
2. **Update Types**: Update TypeScript interfaces in `/src/types/`
3. **Update Schemas**: Update Zod validation schemas
4. **Update Service**: Modify service methods for new fields
5. **Add Indexes**: Update `firestore.indexes.json` if needed
6. **Test Locally**: Test with Firebase emulators (`npm run dev:emulators`)
7. **Deploy Rules**: `npm run deploy:rules`

### Adding a Service Method
1. Define method signature in service class
2. Implement with error handling and retry logic
3. Add connection check before operation
4. Create custom hook wrapper
5. Write unit tests
6. Document in this file

### Working with Gemini AI
1. Get API key from Google AI Studio
2. Add `VITE_GEMINI_API_KEY` to `.env` file
3. Initialize service: `initializeGemini()`
4. Choose thinking mode based on complexity
5. Inject finding context for better responses
6. Handle errors gracefully (quota, API key, network)

---

## 8. Quick Troubleshooting

### Firebase Connection Issues
**Problem**: "Failed to connect to Firestore"

**Solutions**:
1. Check internet connection: `connectionMonitor.isOnline()`
2. Verify `.env` file has correct Firebase config
3. Check Firestore rules allow authenticated access
4. Clear Electron cache and reload
5. Check Firebase project status at console.firebase.google.com

**Debug**:
```typescript
const status = connectionMonitor.getStatus();
console.log('Connection:', status); // 'connected' | 'disconnected'
```

---

### Gemini API Issues
**Problem**: "Invalid API key" or "Rate limit exceeded"

**Solutions**:
1. Verify `VITE_GEMINI_API_KEY` in `.env` file
2. Check API key permissions in Google Cloud Console
3. Wait if rate limited (implement backoff)
4. Upgrade API quota if needed
5. Ensure API key is enabled for Gemini API

**Debug**:
```typescript
const { configured, error } = getGeminiStatus();
console.log('Gemini configured:', configured, error);
```

---

### Build Issues
**Problem**: Build fails with TypeScript or Vite errors

**Solutions**:
1. `npm install` to ensure dependencies are current
2. Delete `node_modules` and `package-lock.json`, reinstall
3. Clear Vite cache: `rm -rf .vite`
4. Check TypeScript version: `npx tsc --version`
5. Verify `tsconfig.json` settings

---

### Performance Issues
**Problem**: App is slow or unresponsive

**Solutions**:
1. Check React Query cache config (staleTime, gcTime)
2. Implement pagination for large datasets
3. Add Firestore indexes for complex queries
4. Use React DevTools to check for unnecessary re-renders
5. Monitor memory usage in Electron DevTools

---

### Authentication Issues
**Problem**: User logged out unexpectedly

**Solutions**:
1. Check Firebase Auth token expiration
2. Verify `onAuthStateChanged` listener is active
3. Check browser/Electron storage for auth tokens
4. Re-login to refresh token
5. Check Firebase Auth settings in console

---

## 9. Critical File References

### Service Layer
- [src/services/DatabaseService.ts](src/services/DatabaseService.ts) - Base service with CRUD + retry logic
- [src/services/FindingsService.ts](src/services/FindingsService.ts) - Specialized finding queries
- [src/services/GeminiService.ts](src/services/GeminiService.ts) - AI integration
- [src/services/AuditService.ts](src/services/AuditService.ts) - Audit logging
- [src/services/ChatSessionService.ts](src/services/ChatSessionService.ts) - Chat session management

### Type Definitions
- [src/types/finding.types.ts](src/types/finding.types.ts) - Complete Finding interface + Zod schemas
- [src/types/audit.types.ts](src/types/audit.types.ts) - Audit log types
- [src/types/chat.types.ts](src/types/chat.types.ts) - Chat session types

### Custom Hooks
- [src/hooks/useFindings.ts](src/hooks/useFindings.ts) - React Query patterns for findings
- [src/hooks/useChatSession.ts](src/hooks/useChatSession.ts) - Chat session hook
- [src/hooks/useDashboardStats.ts](src/hooks/useDashboardStats.ts) - Statistics calculations

### Configuration
- [src/config/firebase.ts](src/config/firebase.ts) - Firebase initialization
- [firestore.rules](firestore.rules) - Security rules
- [firestore.indexes.json](firestore.indexes.json) - Database indexes
- [package.json](package.json) - Dependencies and scripts

### Main Application
- [src/renderer/App.tsx](src/renderer/App.tsx) - Root component with routing
- [src/main/main.ts](src/main/main.ts) - Electron main process
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) - Authentication context

---

## Additional Resources

- **Firebase Console**: https://console.firebase.google.com
- **Google AI Studio**: https://makersuite.google.com/app/apikey
- **Electron Docs**: https://www.electronjs.org/docs
- **React Query Docs**: https://tanstack.com/query/latest
- **Zod Docs**: https://zod.dev

---

**Last Updated**: 2025-01-27
**Version**: 1.0.0
