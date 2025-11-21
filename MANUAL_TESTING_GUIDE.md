# Manual Testing Guide for Task 3.1 - Authentication Service

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the app** (it should launch automatically)

3. **Open Browser DevTools:**
   - Press `F12` or right-click → "Inspect"
   - Go to the **Console** tab

## Prerequisites: Create a Test User

You have two options:

### Option A: Use Firebase Console (Production)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Click **"Add user"**
5. Create user:
   - Email: `test@example.com`
   - Password: `password123`

### Option B: Use Firebase Emulator (Local Testing - Recommended)
1. Start emulators in a separate terminal:
   ```bash
   npm run dev:emulators
   ```
2. Open Emulator UI: http://localhost:4000
3. Go to **Authentication** tab
4. Users will be auto-created on first sign-in

## Testing via Browser Console

All tests are performed in the browser console (F12).

### Import the Service

First, make the service available in the console:

```javascript
// In the console, the service is already loaded
// You can access it via the window object if needed
import('../../services/AuthService').then(m => window.authService = m.default);
```

Or simply use it directly in your code/console:

```javascript
// The service is a singleton, so you can import and use it
const authService = (await import('/src/services/AuthService.ts')).default;
```

---

### ✅ Test 1: Sign In

```javascript
// Sign in with email and password
const user = await authService.signIn('test@example.com', 'password123');
console.log('Signed in:', user);
```

**Expected Output:**
```javascript
{
  uid: "abc123...",
  email: "test@example.com",
  displayName: null,
  emailVerified: false
}
```

**Performance Check:**
- ⏱️ Should complete in < 3 seconds (Requirement 1.1)

---

### ✅ Test 2: Sign In with Remember Me

```javascript
// Sign in with "Remember Me" enabled
const user = await authService.signIn('test@example.com', 'password123', true);
console.log('Signed in with Remember Me:', user);
```

**To verify persistence:**
1. Close the browser tab
2. Reopen the app
3. Check if still logged in:
```javascript
const currentUser = authService.getCurrentUser();
console.log('Still logged in?', currentUser);
```

---

### ✅ Test 3: Get Current User

```javascript
// Get the currently authenticated user
const user = authService.getCurrentUser();
console.log('Current user:', user);
```

**Expected Output (when logged in):**
```javascript
{
  uid: "abc123...",
  email: "test@example.com",
  displayName: null,
  emailVerified: false
}
```

**Expected Output (when logged out):**
```javascript
null
```

---

### ✅ Test 4: Check Authentication Status

```javascript
// Check if user is authenticated
const isAuth = authService.isAuthenticated();
console.log('Is authenticated?', isAuth);
```

**Expected Output:**
- `true` if logged in
- `false` if logged out

---

### ✅ Test 5: Get ID Token

```javascript
// Get the current ID token
const token = await authService.getIdToken();
console.log('ID Token:', token);
```

**Expected Output:**
```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5ZjE3... (long JWT string)
```

**Verify Token Format:**
- Should start with `eyJ`
- Should be a long string (JWT format)

---

### ✅ Test 6: Refresh Token

```javascript
// Force refresh the token
const newToken = await authService.refreshToken();
console.log('Refreshed token:', newToken);
```

**Expected Output:**
- New JWT token (may be same if not expired)

---

### ✅ Test 7: Auth State Change Listener

```javascript
// Subscribe to auth state changes
const unsubscribe = authService.onAuthStateChange((user) => {
  if (user) {
    console.log('🟢 User logged in:', user.email);
  } else {
    console.log('🔴 User logged out');
  }
});

// Later, to unsubscribe:
// unsubscribe();
```

**Test the listener:**
1. Run the above code
2. Sign in: `await authService.signIn('test@example.com', 'password123')`
3. Check console for: `🟢 User logged in: test@example.com`
4. Sign out: `await authService.signOut()`
5. Check console for: `🔴 User logged out`

---

### ✅ Test 8: Sign Out

```javascript
// Sign out the current user
await authService.signOut();
console.log('Signed out successfully');
```

**Verify sign out:**
```javascript
const user = authService.getCurrentUser();
console.log('Current user after sign out:', user); // Should be null
```

**Performance Check:**
- ⏱️ Should complete in < 1 second (Requirement 1.3)

---

### ✅ Test 9: Error Handling - Invalid Credentials

```javascript
// Try to sign in with wrong credentials
try {
  await authService.signIn('wrong@example.com', 'wrongpassword');
} catch (error) {
  console.error('Expected error:', error.message);
}
```

**Expected Output:**
```
Expected error: Invalid email or password.
```

---

### ✅ Test 10: Error Handling - Invalid Email Format

```javascript
// Try to sign in with invalid email
try {
  await authService.signIn('notanemail', 'password123');
} catch (error) {
  console.error('Expected error:', error.message);
}
```

**Expected Output:**
```
Expected error: Invalid email address format.
```

---

### ✅ Test 11: Multiple Auth State Listeners

```javascript
// Add first listener
const unsubscribe1 = authService.onAuthStateChange((user) => {
  console.log('Listener 1:', user ? `Logged in as ${user.email}` : 'Logged out');
});

// Add second listener
const unsubscribe2 = authService.onAuthStateChange((user) => {
  console.log('Listener 2:', user ? `User ID: ${user.uid}` : 'No user');
});

// Test by signing in/out
await authService.signIn('test@example.com', 'password123');
// Both listeners should fire

await authService.signOut();
// Both listeners should fire again

// Cleanup
unsubscribe1();
unsubscribe2();
```

---

### ✅ Test 12: Session Persistence

**Test Session Mode (default):**
```javascript
// Sign in without Remember Me
await authService.signIn('test@example.com', 'password123', false);

// Refresh the page (F5)
// User should still be logged in

// Close the tab and reopen
// User should be logged out
```

**Test Local Mode (Remember Me):**
```javascript
// Sign in with Remember Me
await authService.signIn('test@example.com', 'password123', true);

// Close browser completely
// Reopen browser and app
// User should still be logged in
```

---

## Complete Test Sequence

Run this complete sequence to test all functionality:

```javascript
// 1. Check initial state
console.log('=== Initial State ===');
console.log('Is authenticated?', authService.isAuthenticated());
console.log('Current user:', authService.getCurrentUser());

// 2. Set up listener
console.log('\n=== Setting up listener ===');
const unsubscribe = authService.onAuthStateChange((user) => {
  console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'Logged out');
});

// 3. Sign in
console.log('\n=== Signing in ===');
const user = await authService.signIn('test@example.com', 'password123');
console.log('Signed in:', user);

// 4. Check state after sign in
console.log('\n=== State after sign in ===');
console.log('Is authenticated?', authService.isAuthenticated());
console.log('Current user:', authService.getCurrentUser());

// 5. Get token
console.log('\n=== Getting token ===');
const token = await authService.getIdToken();
console.log('Token (first 50 chars):', token?.substring(0, 50) + '...');

// 6. Refresh token
console.log('\n=== Refreshing token ===');
const newToken = await authService.refreshToken();
console.log('New token (first 50 chars):', newToken?.substring(0, 50) + '...');

// 7. Sign out
console.log('\n=== Signing out ===');
await authService.signOut();

// 8. Check state after sign out
console.log('\n=== State after sign out ===');
console.log('Is authenticated?', authService.isAuthenticated());
console.log('Current user:', authService.getCurrentUser());

// 9. Cleanup
unsubscribe();
console.log('\n=== Test complete ===');
```

---

## Requirements Verification Checklist

Use this checklist to verify all requirements are met:

- [ ] **Req 1.1**: Sign in completes in < 3 seconds
- [ ] **Req 1.2**: Unauthenticated state is detectable (use `isAuthenticated()`)
- [ ] **Req 1.3**: Sign out completes in < 1 second
- [ ] **Req 1.4**: Session expires after 24 hours (Firebase default)
- [ ] **Req 10.1**: Passwords are hashed (handled by Firebase)

---

## Common Issues & Solutions

### Issue: "Cannot read property 'signIn' of undefined"
**Solution:** 
- Make sure you've imported the service correctly
- Try: `const authService = (await import('/src/services/AuthService.ts')).default;`

### Issue: "Invalid email or password"
**Solution:**
- Verify test user exists in Firebase Console
- Check email/password are correct
- Try creating a new test user

### Issue: "Network error"
**Solution:**
- Check internet connection
- Verify Firebase project is active
- Try using Firebase Emulator instead

### Issue: Token is null
**Solution:**
- Make sure you're signed in first
- Check browser console for errors
- Try refreshing the page

---

## Alternative: Create a Simple Test Component

If you prefer a UI for testing, you can create a simple test component:

1. Create `src/renderer/pages/AuthTest.tsx`:

```typescript
import { useState } from 'react';
import authService from '../../services/AuthService';

export default function AuthTest() {
  const [result, setResult] = useState('');

  const testSignIn = async () => {
    try {
      const user = await authService.signIn('test@example.com', 'password123');
      setResult(`✅ Signed in: ${user.email}`);
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    }
  };

  const testSignOut = async () => {
    try {
      await authService.signOut();
      setResult('✅ Signed out');
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Service Test</h1>
      <div className="space-y-2">
        <button onClick={testSignIn} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
          Test Sign In
        </button>
        <button onClick={testSignOut} className="bg-red-500 text-white px-4 py-2 rounded">
          Test Sign Out
        </button>
      </div>
      {result && <div className="mt-4 p-4 bg-gray-100 rounded">{result}</div>}
    </div>
  );
}
```

2. Add route in `App.tsx`:
```typescript
import AuthTest from './pages/AuthTest';
// ...
<Route path="/auth-test" element={<AuthTest />} />
```

3. Navigate to: `http://localhost:5173/auth-test`

---

## Success Criteria

All tests pass if:
- ✅ Sign in works with valid credentials
- ✅ Sign out clears session properly
- ✅ Remember Me persists across browser restarts
- ✅ Tokens are retrieved and refreshed
- ✅ Auth state changes are detected
- ✅ Error messages are user-friendly
- ✅ Performance meets requirements
- ✅ No console errors

---

## Next Steps After Testing

Once manual testing is complete:
1. Document any issues found
2. Verify all requirements are met
3. Proceed to Task 3.2 (Login UI)
4. Integrate AuthService with UI components

---

## Need Help?

- Check `src/services/README.md` for API documentation
- Review `src/services/AuthService.example.tsx` for code examples
- Check Firebase Console for authentication logs
- Review browser console for detailed error messages
