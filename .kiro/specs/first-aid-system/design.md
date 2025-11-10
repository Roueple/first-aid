# Design Document

## Overview

FIRST-AID Phase 1 is a desktop application built with Electron and React/TypeScript, backed by Firebase services. The system architecture follows a privacy-first approach with pseudonymization for AI processing, implements RAG for intelligent chat, and provides comprehensive audit findings management capabilities.

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIRST-AID DESKTOP APP                        │
│                    (Electron + React/TypeScript)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─── Authentication
                              ├─── Data Operations
                              ├─── File Upload
                              └─── Real-time Updates
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                      FIREBASE BACKEND                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Firestore  │  │  Cloud       │  │  Firebase    │       │
│  │   Database   │  │  Functions   │  │  Auth        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Privacy Pseudonymization Layer               │   │
│  │  (Runs in Cloud Functions - Server Side Only)       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ├─── Pseudonymized Data
                             └─── AI Queries
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                      AI SERVICES                               │
│  ┌──────────────┐              ┌──────────────┐              │
│  │   OpenAI     │              │   Google     │              │
│  │   GPT-4o     │  (Fallback)  │   Gemini     │              │
│  │   mini       │◄────────────►│   Flash      │              │
│  └──────────────┘              └──────────────┘              │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Vector Database (Embeddings)                 │   │
│  │         (Firebase Extensions or Pinecone)            │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User Action (Desktop App)
   ↓
2. Electron Main Process → Firebase SDK
   ↓
3. Firebase Authentication (if needed)
   ↓
4. Firestore Database (CRUD operations)
   ↓
5. Cloud Functions (for AI/Privacy operations)
   ↓
6. Pseudonymization Layer (if AI involved)
   ↓
7. AI Service (OpenAI/Gemini)
   ↓
8. Depseudonymization (reverse mapping)
   ↓
9. Response to Desktop App
   ↓
10. UI Update (React components)
```

---

## Components and Interfaces

### Desktop Application Components

#### 1. Main Application Structure

**Electron Main Process**
- Window management
- IPC communication with renderer
- Firebase SDK initialization
- File system operations for Excel import
- Auto-update handling

**Electron Renderer Process (React)**
- UI components and routing
- State management (React Query + Context)
- Firebase client SDK
- Real-time data subscriptions

#### 2. Core UI Components

**Authentication Module**
- LoginForm: Email/password authentication
- AuthGuard: Route protection wrapper
- SessionManager: Token refresh and expiry handling

**Dashboard Module**
- StatisticsCards: Total, Open, High-Risk, Overdue findings
- TrendCharts: Risk distribution, location summary
- RecentActivity: Latest finding updates
- QuickActions: Import, New Finding, Generate Report

**Findings Management Module**
- FindingsTable: Paginated data table with sorting/filtering
- FindingDetailsPanel: Full finding information display
- FindingEditDialog: Create/edit finding form
- FilterPanel: Multi-select filters for severity, status, location, category
- SearchBar: Text search with debouncing

**AI Chat Module**
- ChatInterface: Message list and input
- ChatMessage: Individual message component with role styling
- ChatSuggestions: Follow-up question chips
- SourceReferences: Clickable finding references
- SessionList: Previous chat sessions sidebar

**Reports Module**
- ReportGenerator: Form for report criteria selection
- ReportPreview: Generated report preview
- ReportHistory: List of generated reports
- ExportOptions: Format selection (PDF, Excel, PowerPoint)

**Import Module**
- FileUploader: Drag-and-drop Excel file upload
- ColumnMapper: Map Excel columns to finding fields
- ImportPreview: Preview parsed data before import
- ImportResults: Success/failure/duplicate summary

#### 3. Service Layer

**AuthService**
```typescript
interface AuthService {
  signIn(email: string, password: string): Promise<User>
  signOut(): Promise<void>
  getCurrentUser(): User | null
  onAuthStateChange(callback: (user: User | null) => void): () => void
}
```

**FindingsService**
```typescript
interface FindingsService {
  getFindings(filters: FindingFilters, pagination: Pagination): Promise<FindingsResult>
  getFindingById(id: string): Promise<Finding>
  createFinding(data: CreateFindingInput): Promise<string>
  updateFinding(id: string, data: UpdateFindingInput): Promise<void>
  deleteFinding(id: string): Promise<void>
  searchFindings(query: string): Promise<Finding[]>
}
```

**ChatService**
```typescript
interface ChatService {
  sendMessage(message: string, sessionId?: string): Promise<ChatResponse>
  getSessions(): Promise<ChatSession[]>
  getSession(sessionId: string): Promise<ChatSession>
  createSession(title: string): Promise<string>
}
```

**ImportService**
```typescript
interface ImportService {
  parseExcelFile(file: File): Promise<ParsedData>
  validateData(data: ParsedData, mapping: ColumnMapping): Promise<ValidationResult>
  importFindings(findings: Finding[]): Promise<ImportResult>
}
```

**ReportService**
```typescript
interface ReportService {
  generateReport(criteria: ReportCriteria): Promise<string> // returns reportId
  getReportStatus(reportId: string): Promise<ReportStatus>
  downloadReport(reportId: string): Promise<Blob>
  getReportHistory(): Promise<Report[]>
}
```

### Backend Components (Firebase Cloud Functions)

#### 1. Privacy Pseudonymization Service

**Purpose**: Protect sensitive data before sending to AI services

**Functions**:
```typescript
// Pseudonymize findings data
exports.pseudonymizeFindings = functions.https.onCall(async (data, context) => {
  // 1. Extract sensitive fields (names, IDs, amounts)
  // 2. Generate or retrieve pseudonym mappings
  // 3. Replace sensitive data with pseudonyms
  // 4. Store mappings in secure Firestore collection
  // 5. Return pseudonymized data
})

// Depseudonymize AI results
exports.depseudonymizeResults = functions.https.onCall(async (data, context) => {
  // 1. Receive AI response with pseudonyms
  // 2. Retrieve mapping from secure collection
  // 3. Replace pseudonyms with real values
  // 4. Return depseudonymized results
})
```

**Mapping Storage**:
```typescript
interface PseudonymMapping {
  id: string
  batchId: string
  mappingType: 'names' | 'ids' | 'amounts' | 'locations'
  originalValue: string // encrypted
  pseudonymValue: string
  createdAt: Timestamp
  expiresAt: Timestamp // auto-delete after 30 days
}
```

#### 2. AI Chat Service

**Purpose**: Handle RAG-based chat queries with privacy protection

**Functions**:
```typescript
exports.processChatQuery = functions.https.onCall(async (data, context) => {
  // 1. Authenticate user
  // 2. Retrieve relevant findings from Firestore
  // 3. Pseudonymize findings data
  // 4. Create embeddings for query
  // 5. Perform similarity search in vector database
  // 6. Send context + query to AI service
  // 7. Depseudonymize AI response
  // 8. Save chat message to session
  // 9. Return response with sources
})
```

**RAG Implementation**:
- Use OpenAI text-embedding-3-small for embeddings
- Store embeddings in Firestore or Pinecone
- Chunk findings into 500-token segments with 50-token overlap
- Retrieve top 5 most relevant chunks for context
- Include metadata (finding ID, title, severity) with chunks

#### 3. Pattern Detection Service

**Purpose**: Identify recurring issues automatically

**Functions**:
```typescript
exports.detectPatterns = functions.pubsub.schedule('every sunday 00:00').onRun(async (context) => {
  // 1. Fetch all findings from last 90 days
  // 2. Group by location, category, responsible person
  // 3. Identify groups with 3+ occurrences
  // 4. Calculate confidence scores
  // 5. Generate pattern records
  // 6. Store in patterns collection
  // 7. Send notifications for high-confidence patterns
})
```

**Pattern Detection Algorithm**:
- Location-based: Same location + similar category
- Personnel-based: Same responsible person + similar issues
- Temporal-based: Similar issues in same time period
- Category-based: Same category + similar descriptions (using embeddings)

#### 4. Report Generation Service

**Purpose**: Generate formatted reports asynchronously

**Functions**:
```typescript
exports.generateReport = functions.https.onCall(async (data, context) => {
  // 1. Validate report criteria
  // 2. Fetch findings matching criteria
  // 3. Generate statistics and charts
  // 4. Render report template (PDF/Excel/PowerPoint)
  // 5. Upload to Cloud Storage
  // 6. Create report record in Firestore
  // 7. Return report ID and download URL
})
```

**Report Templates**:
- Executive Summary: High-level statistics and trends
- Detailed Findings: Full finding list with all fields
- Pattern Analysis: Detected patterns with recommendations
- Location Summary: Findings grouped by location

#### 5. Import Processing Service

**Purpose**: Handle bulk Excel imports with validation

**Functions**:
```typescript
exports.processImport = functions.https.onCall(async (data, context) => {
  // 1. Receive parsed Excel data
  // 2. Validate each finding record
  // 3. Check for duplicates
  // 4. Create findings in batches (500 at a time)
  // 5. Generate import summary
  // 6. Log import to audit logs
  // 7. Return results with success/failure counts
})
```

---

## Data Models

### Firestore Collections

#### findings
```typescript
interface Finding {
  id: string
  title: string
  description: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Closed' | 'Deferred'
  category: string
  subcategory?: string
  location: string
  branch?: string
  department?: string
  responsiblePerson: string
  reviewerPerson?: string
  dateIdentified: Timestamp
  dateDue?: Timestamp
  dateCompleted?: Timestamp
  dateCreated: Timestamp
  dateUpdated: Timestamp
  recommendation: string
  managementResponse?: string
  actionPlan?: string
  evidence?: string[]
  attachments?: FileReference[]
  tags: string[]
  riskLevel: number // 1-10
  originalSource: string
  importBatch: string
  
  // Computed fields (not stored, calculated on read)
  isOverdue?: boolean
  daysOpen?: number
}
```

#### users
```typescript
interface User {
  id: string // Firebase Auth UID
  email: string
  name: string
  role: 'auditor' | 'admin'
  department?: string
  preferences: {
    language: 'en' | 'id'
    timezone: string
    notifications: boolean
    theme: 'light' | 'dark'
  }
  createdAt: Timestamp
  lastLogin?: Timestamp
  isActive: boolean
}
```

#### chatSessions
```typescript
interface ChatSession {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: Timestamp
  updatedAt: Timestamp
  isActive: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Timestamp
  metadata?: {
    confidence?: number
    sources?: string[] // finding IDs
    suggestions?: string[]
    processingTime?: number
  }
}
```

#### mappings (server-side only)
```typescript
interface PrivacyMapping {
  id: string
  batchId: string
  mappingType: 'names' | 'ids' | 'amounts' | 'locations'
  originalValue: string // AES-256 encrypted
  pseudonymValue: string // e.g., "Person_A", "ID_001"
  createdAt: Timestamp
  expiresAt: Timestamp
  usageCount: number
}
```

#### patterns
```typescript
interface Pattern {
  id: string
  type: 'geographic' | 'temporal' | 'categorical' | 'personnel'
  title: string
  description: string
  confidence: number // 0-1
  occurrences: number
  affectedFindings: string[] // finding IDs
  detectedAt: Timestamp
  severity: 'High' | 'Medium' | 'Low'
  recommendations: string[]
  isDismissed: boolean
}
```

#### reports
```typescript
interface Report {
  id: string
  userId: string
  title: string
  type: 'summary' | 'detailed' | 'pattern' | 'location'
  format: 'pdf' | 'excel' | 'powerpoint'
  criteria: ReportCriteria
  status: 'generating' | 'completed' | 'failed'
  downloadUrl?: string
  fileSize?: number
  generatedAt: Timestamp
  expiresAt: Timestamp // 7 days after generation
  downloadCount: number
}
```

#### auditLogs
```typescript
interface AuditLog {
  id: string
  userId: string
  action: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'export' | 'ai_query'
  resourceType: 'finding' | 'report' | 'chat' | 'user'
  resourceId?: string
  details: Record<string, any>
  ipAddress?: string
  timestamp: Timestamp
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
    
    // Findings collection
    match /findings/{findingId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Chat sessions
    match /chatSessions/{sessionId} {
      allow read, write: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // Privacy mappings - server-side only
    match /mappings/{mappingId} {
      allow read, write: if false;
    }
    
    // Reports
    match /reports/{reportId} {
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // Patterns
    match /patterns/{patternId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only Cloud Functions can write
    }
    
    // Audit logs
    match /auditLogs/{logId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

---

## Error Handling

### Error Categories

1. **Authentication Errors**
   - Invalid credentials → Display "Invalid email or password"
   - Session expired → Redirect to login with message
   - Network error → Display "Connection error, please try again"

2. **Data Validation Errors**
   - Missing required fields → Highlight fields with error messages
   - Invalid date format → Display "Please enter a valid date"
   - Duplicate finding → Prompt user to review or merge

3. **AI Service Errors**
   - OpenAI unavailable → Fallback to Gemini automatically
   - Both AI services down → Display "AI features temporarily unavailable, basic search still works"
   - Rate limit exceeded → Queue request and retry after delay

4. **Import Errors**
   - Invalid file format → Display "Please upload .xlsx or .xls file"
   - Parsing error → Show row number and error details
   - Partial import failure → Display summary with failed rows

5. **Network Errors**
   - Connection lost → Queue operations and show offline indicator
   - Timeout → Retry with exponential backoff (1s, 2s, 4s)
   - Firestore error → Log to console and show generic error message

### Error Handling Strategy

```typescript
class ErrorHandler {
  handle(error: Error, context: string): void {
    // 1. Log error details to Cloud Functions
    this.logError(error, context)
    
    // 2. Determine error type
    const errorType = this.categorizeError(error)
    
    // 3. Show user-friendly message
    const userMessage = this.getUserMessage(errorType)
    this.showNotification(userMessage, 'error')
    
    // 4. Attempt recovery if possible
    if (this.isRecoverable(errorType)) {
      this.attemptRecovery(error, context)
    }
  }
  
  private isRecoverable(errorType: ErrorType): boolean {
    return ['network', 'timeout', 'rate_limit'].includes(errorType)
  }
  
  private attemptRecovery(error: Error, context: string): void {
    // Implement retry logic with exponential backoff
  }
}
```

---

## Testing Strategy

### Unit Testing

**Frontend Components**
- Test each React component in isolation
- Mock Firebase services and API calls
- Verify component rendering and user interactions
- Tools: Jest, React Testing Library

**Services**
- Test service methods with mocked dependencies
- Verify error handling and edge cases
- Test data transformations and validations
- Tools: Jest, Firebase Emulator

**Cloud Functions**
- Test each function with sample inputs
- Mock Firestore and external API calls
- Verify pseudonymization logic
- Tools: Jest, Firebase Functions Test SDK

### Integration Testing

**End-to-End Flows**
- User authentication flow
- Finding creation and editing
- Excel import process
- AI chat interaction
- Report generation
- Tools: Playwright or Cypress

**Firebase Integration**
- Test Firestore queries and security rules
- Verify Cloud Functions triggers
- Test real-time data synchronization
- Tools: Firebase Emulator Suite

### Manual Testing

**Phase 4 Focus Areas**
- UI/UX testing on Windows and Mac
- Excel import with real 173 files
- AI chat quality and accuracy
- Report generation with various criteria
- Performance testing with 300+ findings
- Privacy verification (no real data to AI)

### Testing Checklist

- [ ] All components render without errors
- [ ] Authentication works correctly
- [ ] CRUD operations on findings work
- [ ] Excel import handles various file formats
- [ ] AI chat returns relevant responses
- [ ] Pseudonymization protects sensitive data
- [ ] Reports generate successfully
- [ ] Error messages are user-friendly
- [ ] Performance meets requirements (<2s dashboard load)
- [ ] Security rules prevent unauthorized access

---

## Performance Considerations

### Optimization Strategies

1. **Data Loading**
   - Implement pagination (20 items per page)
   - Use Firestore query limits
   - Cache frequently accessed data in memory
   - Lazy load images and attachments

2. **Search Performance**
   - Debounce search input (300ms delay)
   - Index Firestore fields for common queries
   - Use client-side filtering for small datasets
   - Implement search result caching

3. **AI Chat Performance**
   - Stream AI responses for better UX
   - Cache embeddings to avoid recomputation
   - Limit context to top 5 relevant findings
   - Implement request queuing for rate limits

4. **Report Generation**
   - Generate reports asynchronously
   - Use Cloud Functions with extended timeout (540s)
   - Cache report templates
   - Compress generated files

5. **Electron App Performance**
   - Code splitting for faster initial load
   - Lazy load routes and components
   - Minimize bundle size with tree shaking
   - Use production builds for deployment

### Performance Targets

- Dashboard load: < 2 seconds
- Search results: < 2 seconds
- AI chat response: < 5 seconds
- Report generation: < 60 seconds
- Excel import (100 findings): < 30 seconds
- Concurrent users: 50 without degradation

---

## Security Considerations

### Data Protection

1. **Encryption**
   - All data encrypted at rest (Firestore default)
   - TLS 1.3 for data in transit
   - AES-256 for privacy mapping values

2. **Authentication**
   - Firebase Authentication with email/password
   - Session tokens with 24-hour expiry
   - Automatic token refresh
   - Secure token storage in Electron

3. **Authorization**
   - Firestore security rules enforce access control
   - Server-side validation in Cloud Functions
   - Privacy mappings accessible only to Cloud Functions

4. **Privacy Protection**
   - Pseudonymization before AI processing
   - Mapping table isolated from client access
   - Audit logging for all data access
   - Automatic mapping expiry after 30 days

### Security Best Practices

- Never expose API keys in client code
- Use environment variables for secrets
- Implement rate limiting on Cloud Functions
- Validate all user inputs
- Sanitize data before display
- Regular security audits
- Keep dependencies updated

---

## Deployment Architecture

### Development Environment

- Local Electron app with hot reload
- Firebase Emulator Suite for backend
- Mock AI services for testing
- Sample data for development

### Production Environment

- Electron app packaged for Windows/Mac
- Firebase Production project
- OpenAI/Gemini production API keys
- Real audit findings data

### CI/CD Pipeline

1. **Build**
   - Run tests (unit + integration)
   - Build Electron app for Windows/Mac
   - Build Cloud Functions

2. **Deploy**
   - Deploy Cloud Functions to Firebase
   - Deploy Firestore security rules
   - Upload Electron installers to distribution server

3. **Monitor**
   - Firebase Performance Monitoring
   - Cloud Functions logs
   - Error tracking (Sentry or similar)
   - Usage analytics

This design provides a comprehensive foundation for implementing the FIRST-AID system with privacy-first AI capabilities, robust error handling, and scalable architecture.
