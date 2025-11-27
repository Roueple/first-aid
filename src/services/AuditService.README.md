# Audit Service

## Overview

The Audit Service provides comprehensive logging capabilities for tracking user actions and system operations throughout the FIRST-AID application. It ensures security compliance and provides an audit trail for all critical operations.

## Requirements

- **Requirement 10.1**: Log all user authentication events including login, logout, and failed attempts with timestamps and IP addresses
- **Requirement 10.2**: Record all CRUD operations on findings with user identifier and changed fields

## Architecture

### Components

1. **Cloud Function** (`functions/src/index.ts`):
   - `logAuditEvent`: Callable function that stores audit logs in Firestore
   - Captures user ID, action, resource type, details, IP address, and timestamp
   - Validates authentication and input parameters

2. **Client Service** (`src/services/AuditService.ts`):
   - Provides convenient methods for logging different types of events
   - Handles errors gracefully without breaking the application
   - Automatically includes timestamps and relevant details

3. **Firestore Collection** (`auditLogs`):
   - Stores all audit log entries
   - Read access: Any authenticated user
   - Write access: Cloud Functions only (enforced by security rules)

## Usage

### Basic Usage

```typescript
import { auditService } from '@/services';

// Log a login event
await auditService.logLogin('user-123', 'email');

// Log a finding creation
await auditService.logFindingCreate('finding-123', {
  severity: 'High',
  category: 'Security'
});

// Log a finding update
await auditService.logFindingUpdate('finding-123', ['status', 'severity']);

// Log an AI query
await auditService.logAIQuery('session-123', 'What are the high-risk findings?', 1500);
```

### Available Methods

#### Authentication Events

```typescript
// Log user login
await auditService.logLogin(userId: string, method?: string);

// Log user logout
await auditService.logLogout(userId: string);
```

#### Finding Operations

```typescript
// Log finding creation
await auditService.logFindingCreate(findingId: string, details?: Record<string, any>);

// Log finding update
await auditService.logFindingUpdate(findingId: string, changedFields?: string[]);

// Log finding deletion
await auditService.logFindingDelete(findingId: string);
```

#### AI Operations

```typescript
// Log AI query
await auditService.logAIQuery(
  sessionId: string,
  query: string,
  responseTime?: number
);
```

#### Report Operations

```typescript
// Log report generation
await auditService.logReportGenerate(
  reportId: string,
  format: string,
  criteria?: Record<string, any>
);

// Log report download
await auditService.logReportDownload(reportId: string);
```

#### Import/Export Operations

```typescript
// Log data import
await auditService.logImport(
  batchId: string,
  findingsCount: number,
  successCount: number,
  failureCount: number
);

// Log data export
await auditService.logExport(
  resourceType: ResourceType,
  format: string,
  recordCount: number
);
```

#### Generic Event Logging

```typescript
// Log any custom event
await auditService.logEvent(
  action: AuditAction,
  resourceType: ResourceType,
  resourceId?: string,
  details?: Record<string, any>
);
```

## Data Structure

### Audit Log Document

```typescript
interface AuditLog {
  id: string;                    // Auto-generated document ID
  userId: string;                // Firebase Auth UID
  action: AuditAction;           // Type of action performed
  resourceType: ResourceType;    // Type of resource affected
  resourceId?: string;           // ID of specific resource
  details: Record<string, any>;  // Additional context
  ipAddress?: string;            // User's IP address
  timestamp: Timestamp;          // Server timestamp
}
```

### Action Types

```typescript
type AuditAction = 
  | 'login'              // User authentication
  | 'logout'             // User sign out
  | 'create'             // Resource creation
  | 'update'             // Resource modification
  | 'delete'             // Resource deletion
  | 'export'             // Data export
  | 'ai_query'           // AI chat query
  | 'import'             // Data import
  | 'report_generate'    // Report generation
  | 'report_download';   // Report download
```

### Resource Types

```typescript
type ResourceType = 
  | 'finding'    // Audit finding
  | 'report'     // Generated report
  | 'chat'       // Chat session
  | 'user'       // User account
  | 'pattern'    // Detected pattern
  | 'session';   // User session
```

## Integration Examples

### In Authentication Flow

```typescript
// AuthService.ts
async signIn(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(
    this.auth,
    email,
    password
  );
  
  // Log successful login
  await auditService.logLogin(userCredential.user.uid, 'email');
  
  return userCredential.user;
}

async signOut(): Promise<void> {
  const userId = this.getCurrentUser()?.uid;
  await signOut(this.auth);
  
  // Log logout
  if (userId) {
    await auditService.logLogout(userId);
  }
}
```

### In Finding Management

```typescript
// FindingsService.ts
async createFinding(data: CreateFindingInput): Promise<string> {
  const docRef = await addDoc(collection(this.db, 'findings'), {
    ...data,
    dateCreated: serverTimestamp(),
  });
  
  // Log finding creation
  await auditService.logFindingCreate(docRef.id, {
    severity: data.severity,
    category: data.category,
  });
  
  return docRef.id;
}

async updateFinding(id: string, data: UpdateFindingInput): Promise<void> {
  await updateDoc(doc(this.db, 'findings', id), {
    ...data,
    dateUpdated: serverTimestamp(),
  });
  
  // Log finding update with changed fields
  const changedFields = Object.keys(data);
  await auditService.logFindingUpdate(id, changedFields);
}
```

### In Chat Interface

```typescript
// ChatService.ts
async sendMessage(message: string, sessionId: string): Promise<ChatResponse> {
  const startTime = Date.now();
  
  // Process chat query
  const response = await this.processQuery(message, sessionId);
  
  const responseTime = Date.now() - startTime;
  
  // Log AI query
  await auditService.logAIQuery(sessionId, message, responseTime);
  
  return response;
}
```

## Error Handling

The Audit Service is designed to fail gracefully:

```typescript
async logEvent(...): Promise<LogAuditEventResponse> {
  try {
    // Attempt to log event
    const result = await logAuditEvent({ ... });
    return result.data;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Return failure response but don't throw
    // Audit logging failures shouldn't break the app
    return {
      success: false,
      logId: '',
      timestamp: new Date().toISOString()
    };
  }
}
```

This ensures that:
- Audit logging failures don't disrupt user workflows
- Errors are logged to the console for debugging
- The application continues to function normally

## Security

### Access Control

- **Read Access**: Any authenticated user can read audit logs
- **Write Access**: Only Cloud Functions can write audit logs
- **IP Address**: Automatically captured from request context
- **User ID**: Automatically extracted from authentication token

### Firestore Security Rules

```javascript
match /auditLogs/{logId} {
  allow read: if isAuthenticated();
  allow write: if false; // Only Cloud Functions can write
}
```

### Data Privacy

- Sensitive details should not be logged in plain text
- Use pseudonymization for personal data when necessary
- IP addresses are stored for security purposes only
- Logs are retained according to compliance requirements

## Querying Audit Logs

### By User

```typescript
const userLogs = await getDocs(
  query(
    collection(db, 'auditLogs'),
    where('userId', '==', 'user-123'),
    orderBy('timestamp', 'desc'),
    limit(50)
  )
);
```

### By Action Type

```typescript
const loginLogs = await getDocs(
  query(
    collection(db, 'auditLogs'),
    where('action', '==', 'login'),
    orderBy('timestamp', 'desc')
  )
);
```

### By Date Range

```typescript
const recentLogs = await getDocs(
  query(
    collection(db, 'auditLogs'),
    where('timestamp', '>=', startDate),
    where('timestamp', '<=', endDate),
    orderBy('timestamp', 'desc')
  )
);
```

### By Resource

```typescript
const findingLogs = await getDocs(
  query(
    collection(db, 'auditLogs'),
    where('resourceType', '==', 'finding'),
    where('resourceId', '==', 'finding-123'),
    orderBy('timestamp', 'desc')
  )
);
```

## Testing

### Unit Tests

Run the unit tests:

```bash
npm test -- src/services/__tests__/AuditService.test.ts
```

### Integration Tests

Test the Cloud Function:

```bash
cd functions
npx ts-node src/test-audit-logging.ts
```

### Manual Testing

1. Start Firebase Emulator:
   ```bash
   firebase emulators:start
   ```

2. Perform actions in the application

3. Check audit logs in Firestore:
   ```
   http://localhost:4000/firestore/data/auditLogs
   ```

## Best Practices

1. **Log Important Actions**: Always log authentication, CRUD operations, and sensitive actions
2. **Include Context**: Provide relevant details in the `details` field
3. **Don't Block User Flow**: Audit logging should never prevent user actions
4. **Protect Sensitive Data**: Don't log passwords, tokens, or unencrypted personal data
5. **Use Specific Methods**: Use dedicated methods (logLogin, logFindingCreate) instead of generic logEvent
6. **Monitor Failures**: Check console logs for audit logging failures
7. **Regular Review**: Periodically review audit logs for security analysis

## Compliance

The Audit Service helps meet compliance requirements:

- **SOX**: Tracks all financial data modifications
- **GDPR**: Records data access and processing activities
- **ISO 27001**: Provides security event logging
- **Internal Audit**: Supports audit trail requirements

## Future Enhancements

Potential improvements:

- [ ] Audit log viewer UI for administrators
- [ ] Export audit logs to CSV/Excel
- [ ] Real-time alerts for suspicious activities
- [ ] Audit log retention policies
- [ ] Advanced filtering and search
- [ ] Audit log analytics dashboard
- [ ] Integration with SIEM systems

## Related Documentation

- [Requirements Document](.kiro/specs/first-aid-system/requirements.md)
- [Design Document](.kiro/specs/first-aid-system/design.md)
- [Firestore Security Rules](firestore.rules)
- [Cloud Functions](functions/README.md)
