# ErrorHandler - Global Error Handling System

## Overview

The ErrorHandler provides centralized error handling for the FIRST-AID application. It categorizes errors, provides user-friendly messages, logs errors to Cloud Functions, and displays notifications to users.

## Requirements

- **12.1**: AI Service fallback with error message
- **12.2**: Network connectivity handling with queuing
- **12.3**: User-friendly error messages without technical details
- **12.4**: Full error logging to Cloud Functions

## Features

### Error Categorization

The ErrorHandler automatically categorizes errors into the following types:

- **AUTHENTICATION**: Login, logout, session expiry errors
- **NETWORK**: Connection issues, offline status
- **DATABASE**: Firestore errors, permission denied, not found
- **AI_SERVICE**: OpenAI/Gemini service failures
- **VALIDATION**: Invalid input, missing required fields
- **PERMISSION**: Unauthorized access attempts
- **NOT_FOUND**: Resource not found errors
- **TIMEOUT**: Operation timeout errors
- **RATE_LIMIT**: Too many requests errors
- **IMPORT/EXPORT**: File parsing and data import/export errors
- **UNKNOWN**: Uncategorized errors

### User-Friendly Messages

All errors are translated into user-friendly messages that:
- Don't expose technical details or stack traces
- Provide actionable guidance when possible
- Are appropriate for the error severity

### Error Logging

Errors are automatically logged to Cloud Functions via the AuditService, capturing:
- Error category and severity
- Technical error message
- User ID and operation context
- Timestamp and metadata

### Notification System

Errors are displayed to users via toast notifications with:
- Color-coded severity (success, info, warning, error)
- Auto-dismiss after configurable duration
- Manual dismiss option
- Slide-in animation

### Recovery Strategies

For recoverable errors, the ErrorHandler attempts automatic recovery:
- **Network errors**: Suggests retry when connection restored
- **Timeout errors**: Suggests waiting before retry
- **Rate limit errors**: Suggests waiting 30 seconds
- **AI service errors**: Informs about fallback to basic search

## Usage

### Basic Error Handling

```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const { handleError, showSuccess } = useErrorHandler();

  const handleAction = async () => {
    try {
      // Perform operation
      await someOperation();
      showSuccess('Operation completed successfully');
    } catch (error) {
      await handleError(error, {
        operation: 'someOperation',
        userId: currentUser?.uid,
        resourceId: 'resource-123',
        metadata: { additionalInfo: 'value' }
      });
    }
  };

  return <button onClick={handleAction}>Perform Action</button>;
}
```

### Direct Notifications

```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const { showSuccess, showInfo, showWarning, showError } = useErrorHandler();

  const handleSave = () => {
    showSuccess('Changes saved successfully');
  };

  const handleWarning = () => {
    showWarning('This action cannot be undone');
  };

  return (
    <>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleWarning}>Delete</button>
    </>
  );
}
```

### Integration in Services

```typescript
import { errorHandler } from '../utils/ErrorHandler';

class MyService {
  async performOperation() {
    try {
      // Operation logic
    } catch (error) {
      await errorHandler.handle(error, {
        operation: 'MyService.performOperation',
        metadata: { /* context */ }
      });
      throw error; // Re-throw if needed
    }
  }
}
```

## Architecture

### Components

1. **ErrorHandler** (`src/utils/ErrorHandler.ts`)
   - Core error handling logic
   - Error categorization
   - Message generation
   - Recovery strategies

2. **NotificationSystem** (`src/components/NotificationSystem.tsx`)
   - Toast notification UI component
   - Auto-dismiss functionality
   - Animation and styling

3. **useErrorHandler** (`src/hooks/useErrorHandler.ts`)
   - React hook for easy integration
   - Initializes callbacks
   - Provides convenience methods

4. **AuditService** (`src/services/AuditService.ts`)
   - Logs errors to Cloud Functions
   - Stores error details in Firestore

### Data Flow

```
1. Error occurs in component/service
   ↓
2. handleError() called with error and context
   ↓
3. ErrorHandler categorizes error
   ↓
4. User-friendly message generated
   ↓
5. Error logged to Cloud Functions (async)
   ↓
6. Notification displayed to user
   ↓
7. Recovery attempted if applicable
```

## Error Context

When handling errors, provide context information:

```typescript
interface ErrorContext {
  operation: string;        // Name of the operation that failed
  userId?: string;          // ID of the user (if available)
  resourceId?: string;      // ID of the resource being operated on
  metadata?: Record<string, any>; // Additional context
}
```

## Notification Types

```typescript
enum NotificationType {
  SUCCESS = 'SUCCESS',  // Green - successful operations
  INFO = 'INFO',        // Blue - informational messages
  WARNING = 'WARNING',  // Yellow - warnings
  ERROR = 'ERROR'       // Red - errors
}
```

## Error Severity

```typescript
enum ErrorSeverity {
  INFO = 'INFO',           // Informational, no action needed
  WARNING = 'WARNING',     // Warning, user should be aware
  ERROR = 'ERROR',         // Error, operation failed
  CRITICAL = 'CRITICAL'    // Critical error, system issue
}
```

## Best Practices

1. **Always provide context**: Include operation name and relevant IDs
2. **Don't expose sensitive data**: Error messages are shown to users
3. **Log before throwing**: Log errors even if you re-throw them
4. **Use appropriate severity**: Match severity to impact
5. **Provide actionable messages**: Tell users what they can do
6. **Test error paths**: Ensure error handling works correctly

## Testing

### Manual Testing

1. **Network errors**: Disconnect network and try operations
2. **Authentication errors**: Use invalid credentials
3. **Validation errors**: Submit forms with invalid data
4. **AI service errors**: Mock AI service failures
5. **Database errors**: Test with invalid Firestore queries

### Unit Testing

```typescript
import { errorHandler, ErrorCategory } from '../utils/ErrorHandler';

describe('ErrorHandler', () => {
  it('should categorize authentication errors', () => {
    const error = new Error('auth/invalid-credential');
    const categorized = errorHandler.categorizeError(error, {
      operation: 'login'
    });
    
    expect(categorized.category).toBe(ErrorCategory.AUTHENTICATION);
    expect(categorized.userMessage).toContain('Invalid email or password');
  });
});
```

## Future Enhancements

- [ ] Error rate monitoring and alerting
- [ ] Automatic error reporting to external service (e.g., Sentry)
- [ ] Error analytics dashboard
- [ ] Customizable notification positions
- [ ] Sound notifications for critical errors
- [ ] Offline error queue with sync on reconnect

## Related Files

- `src/utils/ErrorHandler.ts` - Core error handler
- `src/components/NotificationSystem.tsx` - Notification UI
- `src/hooks/useErrorHandler.ts` - React hook
- `src/services/AuditService.ts` - Error logging
- `src/types/audit.types.ts` - Audit types
- `functions/src/index.ts` - Cloud Functions for logging
