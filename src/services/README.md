# Authentication Service

## Overview

The `AuthService` provides a comprehensive authentication solution for the FIRST-AID application, built on top of Firebase Authentication. It handles user sign-in, sign-out, session management, and token refresh operations.

## Features

- ✅ Email/password authentication
- ✅ Session persistence (Remember Me functionality)
- ✅ Automatic token refresh
- ✅ Auth state change listeners
- ✅ Session expiry handling (24-hour timeout)
- ✅ User-friendly error messages
- ✅ Singleton pattern for consistent state

## Requirements Satisfied

This implementation satisfies the following requirements from the FIRST-AID specification:

- **Requirement 1.1**: User authentication with email and password within 3 seconds
- **Requirement 1.2**: Redirect unauthenticated users to login page
- **Requirement 1.3**: Session termination and token clearing within 1 second
- **Requirement 1.4**: Automatic session expiry after 24 hours of inactivity
- **Requirement 10.1**: Secure credential storage with password hashing

## Usage

### Basic Sign In

```typescript
import authService from './services/AuthService';

// Sign in with email and password
try {
  const user = await authService.signIn('user@example.com', 'password123');
  console.log('Logged in:', user);
} catch (error) {
  console.error('Login failed:', error.message);
}

// Sign in with "Remember Me" enabled
const user = await authService.signIn('user@example.com', 'password123', true);
```

### Sign Out

```typescript
// Sign out the current user
await authService.signOut();
```

### Get Current User

```typescript
// Get the currently authenticated user
const user = authService.getCurrentUser();

if (user) {
  console.log('User email:', user.email);
  console.log('User ID:', user.uid);
}

// Check if user is authenticated
const isAuthenticated = authService.isAuthenticated();
```

### Listen to Auth State Changes

```typescript
// Subscribe to authentication state changes
const unsubscribe = authService.onAuthStateChange((user) => {
  if (user) {
    console.log('User logged in:', user.email);
  } else {
    console.log('User logged out');
  }
});

// Later, unsubscribe when no longer needed
unsubscribe();
```

### Token Management

```typescript
// Get the current ID token
const token = await authService.getIdToken();

// Force refresh the token
const newToken = await authService.refreshToken();

// Use token in API requests
const response = await fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

## API Reference

### Methods

#### `signIn(email: string, password: string, rememberMe?: boolean): Promise<User>`

Authenticates a user with email and password.

- **Parameters:**
  - `email`: User's email address
  - `password`: User's password
  - `rememberMe`: Optional. If true, persists session across browser restarts (default: false)
- **Returns:** Promise resolving to User object
- **Throws:** Error with user-friendly message if authentication fails

#### `signOut(): Promise<void>`

Signs out the current user and clears session tokens.

- **Returns:** Promise that resolves when sign out is complete
- **Throws:** Error if sign out fails

#### `getCurrentUser(): User | null`

Gets the current authenticated user.

- **Returns:** User object if authenticated, null otherwise

#### `isAuthenticated(): boolean`

Checks if a user is currently authenticated.

- **Returns:** true if user is authenticated, false otherwise

#### `onAuthStateChange(callback: AuthStateChangeCallback): () => void`

Registers a callback to be notified of authentication state changes.

- **Parameters:**
  - `callback`: Function called when auth state changes, receives User or null
- **Returns:** Unsubscribe function to remove the listener

#### `getIdToken(forceRefresh?: boolean): Promise<string | null>`

Gets the current Firebase ID token for the authenticated user.

- **Parameters:**
  - `forceRefresh`: Optional. Force token refresh (default: false)
- **Returns:** Promise resolving to ID token or null if not authenticated

#### `refreshToken(): Promise<string | null>`

Refreshes the current user's ID token.

- **Returns:** Promise resolving to new token or null if not authenticated

## Types

### User

```typescript
interface User {
  uid: string;              // Unique user identifier
  email: string | null;     // User's email address
  displayName: string | null; // User's display name
  emailVerified: boolean;   // Whether email is verified
}
```

### AuthStateChangeCallback

```typescript
type AuthStateChangeCallback = (user: User | null) => void;
```

## Error Handling

The service maps Firebase error codes to user-friendly messages:

| Firebase Error Code | User-Friendly Message |
|---------------------|----------------------|
| `auth/invalid-email` | Invalid email address format. |
| `auth/user-disabled` | This account has been disabled. |
| `auth/user-not-found` | Invalid email or password. |
| `auth/wrong-password` | Invalid email or password. |
| `auth/invalid-credential` | Invalid email or password. |
| `auth/too-many-requests` | Too many failed login attempts. Please try again later. |
| `auth/network-request-failed` | Network error. Please check your connection and try again. |
| `auth/operation-not-allowed` | Email/password authentication is not enabled. |
| Other errors | Authentication failed. Please try again. |

## Session Management

### Persistence Modes

The service supports two persistence modes:

1. **Session Persistence** (default): Session clears when browser tab/window closes
   - Uses `browserSessionPersistence`
   - Suitable for shared computers

2. **Local Persistence** (Remember Me): Session persists across browser restarts
   - Uses `browserLocalPersistence`
   - Suitable for personal devices

### Automatic Token Refresh

Firebase automatically refreshes ID tokens when they expire (typically after 1 hour). The service provides methods to manually refresh tokens when needed.

### Session Expiry

Firebase Auth sessions expire after 24 hours of inactivity (configurable in Firebase Console). The application should implement periodic checks to detect expired sessions and redirect users to login.

## React Integration

See `AuthService.example.tsx` for comprehensive React integration examples, including:

- Login forms
- Protected routes
- Auth state hooks
- Logout buttons
- Token management
- Session expiry handling

## Security Considerations

- ✅ Passwords are never stored locally - handled by Firebase
- ✅ Tokens are automatically encrypted by Firebase
- ✅ Session tokens expire after 24 hours
- ✅ All communication uses HTTPS
- ✅ Error messages don't expose sensitive information

## Testing

To test the authentication service:

1. Ensure Firebase is configured (see `FIREBASE_SETUP.md`)
2. Create a test user in Firebase Console or use Firebase Emulator
3. Use the service in your components or test files

Example test user creation (Firebase Emulator):

```bash
# Start Firebase Emulator
npm run dev:emulators

# Create test user via Firebase Console or programmatically
```

## Troubleshooting

### "Missing Firebase configuration" Error

- Ensure `.env` file exists with all `VITE_FIREBASE_*` variables
- Restart the dev server after changing `.env`

### "Network error" on Sign In

- Check internet connection
- Verify Firebase project is active
- Check if using emulators (set `VITE_USE_FIREBASE_EMULATORS=true`)

### Session Not Persisting

- Ensure `rememberMe` parameter is set to `true` in `signIn()`
- Check browser settings allow local storage

### Token Refresh Fails

- User may need to re-authenticate
- Check Firebase project configuration
- Verify network connectivity

## Future Enhancements

Potential improvements for future versions:

- Multi-factor authentication (MFA)
- Social login providers (Google, Microsoft)
- Password reset functionality
- Email verification flow
- Account creation/registration
- Profile management

## Related Files

- `src/config/firebase.ts` - Firebase initialization
- `src/services/AuthService.example.tsx` - Usage examples
- `.kiro/specs/first-aid-system/requirements.md` - Requirements specification
- `.kiro/specs/first-aid-system/design.md` - Design documentation
