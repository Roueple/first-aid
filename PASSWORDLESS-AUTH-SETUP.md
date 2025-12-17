# Passwordless Email Authentication Setup

## Overview

FIRST-AID now supports passwordless authentication via email links. Users receive a magic link in their email, click it, and get a 90-day session on their device.

## Features

- **Email Whitelist**: Only authorized emails can access the app
- **Magic Links**: No passwords needed - sign in via email link
- **90-Day Sessions**: Once authenticated, users stay logged in for 90 days on the same device
- **Device Tracking**: Sessions are tied to specific devices for security

## Firebase Console Setup

### 1. Enable Email Link Authentication

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Email/Password** provider
5. Enable **Email link (passwordless sign-in)**
6. Click **Save**

### 2. Configure Authorized Domains

1. In Authentication settings, go to **Authorized domains** tab
2. Add your application domain (for Electron apps, `localhost` is usually sufficient)
3. For production, add your actual domain

### 3. Customize Email Templates (Optional)

1. Go to **Authentication** → **Templates**
2. Select **Email link sign-in**
3. Customize the email template with your branding
4. The default template works fine for most cases

## Managing Email Whitelist

### Add User to Whitelist

```bash
# Windows
manage-whitelist.bat add user@example.com admin

# Or directly with Node
node scripts/manage-email-whitelist.mjs add user@example.com admin
```

### Remove User from Whitelist

```bash
manage-whitelist.bat remove user@example.com
```

### List All Whitelisted Emails

```bash
manage-whitelist.bat list
```

### Check if Email is Whitelisted

```bash
manage-whitelist.bat check user@example.com
```

## User Flow

### First Time Sign-In

1. User opens the app and sees the passwordless login page
2. User enters their email address
3. System checks if email is whitelisted
4. If whitelisted, sends a magic link to their email
5. User clicks the link in their email
6. User is signed in and gets a 90-day session on that device

### Returning User (Within 90 Days)

1. User opens the app
2. System checks for valid device session
3. If session is valid, user is automatically signed in
4. No email link needed

### After 90 Days

1. Session expires
2. User needs to request a new magic link
3. Process repeats from step 1

## Security Features

### Email Whitelist
- Stored in Firestore `emailWhitelist` collection
- Only admin scripts can modify
- Users can read to check their status

### Device Sessions
- Stored in Firestore `deviceSessions` collection
- Tied to specific device ID (stored in localStorage)
- 90-day expiration
- Users can only access their own sessions

### Firestore Security Rules
- Whitelist is read-only for users
- Device sessions are protected per-user
- All operations require authentication

## Integration with Existing Code

### AuthContext Updates

The `AuthContext` now includes:
- `sendSignInLink(email)` - Send magic link
- `completeSignInWithEmailLink(emailLink?)` - Complete sign-in
- `isEmailWhitelisted(email)` - Check whitelist status
- `hasValidDeviceSession(email)` - Check device session

### Backward Compatibility

The old `signIn(email, password)` method still works for existing users with passwords. This allows gradual migration to passwordless auth.

## Routing Setup

Update your router to include the passwordless login page:

```typescript
import PasswordlessLoginPage from './renderer/pages/PasswordlessLoginPage';

// In your router configuration
<Route path="/login" element={<PasswordlessLoginPage />} />
<Route path="/auth/verify" element={<PasswordlessLoginPage />} />
```

## Environment Variables

No new environment variables needed. Uses existing Firebase configuration from `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

## Testing

### Test Email Whitelist

```bash
# Add test email
manage-whitelist.bat add test@example.com admin

# Verify it was added
manage-whitelist.bat check test@example.com

# List all emails
manage-whitelist.bat list
```

### Test Sign-In Flow

1. Add your email to whitelist
2. Open the app and go to login page
3. Enter your email
4. Check your email for the magic link
5. Click the link
6. Verify you're signed in
7. Close and reopen the app
8. Verify you're still signed in (90-day session)

## Troubleshooting

### "Email not authorized" Error
- Check if email is in whitelist: `manage-whitelist.bat check email@example.com`
- Add email if missing: `manage-whitelist.bat add email@example.com admin`

### "Invalid sign-in link" Error
- Link may have expired (1 hour expiration)
- Request a new link
- Make sure you're opening the link in the same browser/device

### "Already have active session" Error
- Device already has a valid 90-day session
- Sign out first if you want to test the flow again

### Email Not Received
- Check spam folder
- Verify Firebase email templates are configured
- Check Firebase Console → Authentication → Templates
- Ensure sender email is verified in Firebase

## Database Collections

### emailWhitelist
```typescript
{
  email: string;           // Normalized lowercase email
  addedAt: number;         // Timestamp
  addedBy: string;         // Admin who added
  active: boolean;         // Active status
}
```

### deviceSessions
```typescript
{
  deviceId: string;        // Unique device identifier
  email: string;           // User email
  createdAt: number;       // Session creation timestamp
  expiresAt: number;       // Expiration timestamp (90 days)
  lastAccessedAt: number;  // Last access timestamp
}
```

## Migration from Password Auth

If you have existing users with passwords:

1. Keep the old login page as an option
2. Add a "Sign in with email link" button
3. Gradually migrate users to passwordless
4. Eventually deprecate password auth

The `AuthService` supports both methods simultaneously.
