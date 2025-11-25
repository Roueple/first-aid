# Firestore Security Rules Deployment Guide

## Overview

This guide covers testing and deploying Firestore security rules for the FIRST-AID system. The security rules enforce access control for all collections and protect sensitive data.

**Requirements:** 10.5 - Security rules for all collections

---

## Prerequisites

1. **Firebase CLI Installation**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project Setup**
   - Ensure you have a Firebase project created
   - Have project credentials configured

3. **Authentication**
   ```bash
   firebase login
   ```

---

## Security Rules Overview

The FIRST-AID system implements security rules for the following collections:

### 1. Users Collection (`/users/{userId}`)
- **Read:** Any authenticated user
- **Write:** Owner only (user can only modify their own document)
- **Purpose:** User profile and preferences

### 2. Findings Collection (`/findings/{findingId}`)
- **Read:** Any authenticated user
- **Create:** Any authenticated user
- **Update:** Any authenticated user
- **Delete:** Any authenticated user
- **Purpose:** Audit findings data

### 3. Chat Sessions Collection (`/chatSessions/{sessionId}`)
- **Read:** Owner only (userId matches)
- **Write:** Owner only (userId matches)
- **Purpose:** AI chat conversation history

### 4. Privacy Mappings Collection (`/mappings/{mappingId}`)
- **Read:** Denied (server-side only)
- **Write:** Denied (server-side only)
- **Purpose:** Pseudonymization mappings for AI privacy protection

### 5. Reports Collection (`/reports/{reportId}`)
- **Read:** Owner only (userId matches)
- **Create:** Any authenticated user
- **Update:** Owner only (userId matches)
- **Purpose:** Generated reports

### 6. Patterns Collection (`/patterns/{patternId}`)
- **Read:** Any authenticated user
- **Write:** Denied (Cloud Functions only)
- **Purpose:** Detected patterns from findings

### 7. Audit Logs Collection (`/auditLogs/{logId}`)
- **Read:** Any authenticated user
- **Write:** Denied (Cloud Functions only)
- **Purpose:** System audit trail

### 8. Connection Test Collection (`/_connection_test_/{document}`)
- **Read:** Any authenticated user
- **Write:** Denied
- **Purpose:** Connection monitoring

---

## Testing with Firebase Emulator

### Step 1: Start the Emulator

```bash
# Start all emulators (Auth, Firestore, Functions, UI)
firebase emulators:start
```

The emulator UI will be available at: `http://localhost:4000`

### Step 2: Access Emulator UI

1. Open browser to `http://localhost:4000`
2. Navigate to the Firestore tab
3. Navigate to the Authentication tab to create test users

### Step 3: Create Test Users

In the Authentication emulator:
1. Click "Add User"
2. Create test users:
   - user1@test.com (password: test123)
   - user2@test.com (password: test123)
   - admin@test.com (password: admin123)

### Step 4: Manual Testing Scenarios

#### Test 1: Users Collection
```javascript
// Authenticated user reads any user document - SHOULD SUCCEED
// User: user1@test.com
// Action: Read /users/user2
// Expected: Success

// Authenticated user writes own document - SHOULD SUCCEED
// User: user1@test.com
// Action: Write /users/user1
// Expected: Success

// Authenticated user writes other user document - SHOULD FAIL
// User: user1@test.com
// Action: Write /users/user2
// Expected: Permission denied

// Unauthenticated read - SHOULD FAIL
// User: None
// Action: Read /users/user1
// Expected: Permission denied
```

#### Test 2: Findings Collection
```javascript
// Authenticated user CRUD operations - SHOULD SUCCEED
// User: user1@test.com
// Actions: Create, Read, Update, Delete /findings/finding1
// Expected: All succeed

// Unauthenticated access - SHOULD FAIL
// User: None
// Action: Read /findings/finding1
// Expected: Permission denied
```

#### Test 3: Chat Sessions Collection
```javascript
// User reads own session - SHOULD SUCCEED
// User: user1@test.com
// Action: Read /chatSessions/session1 (where userId='user1')
// Expected: Success

// User reads other user's session - SHOULD FAIL
// User: user1@test.com
// Action: Read /chatSessions/session2 (where userId='user2')
// Expected: Permission denied
```

#### Test 4: Privacy Mappings Collection
```javascript
// Any user access - SHOULD FAIL
// User: user1@test.com (or any user)
// Action: Read or Write /mappings/mapping1
// Expected: Permission denied

// This collection is server-side only
```

#### Test 5: Reports Collection
```javascript
// User reads own report - SHOULD SUCCEED
// User: user1@test.com
// Action: Read /reports/report1 (where userId='user1')
// Expected: Success

// User reads other user's report - SHOULD FAIL
// User: user1@test.com
// Action: Read /reports/report2 (where userId='user2')
// Expected: Permission denied
```

#### Test 6: Patterns Collection
```javascript
// Authenticated user reads patterns - SHOULD SUCCEED
// User: user1@test.com
// Action: Read /patterns/pattern1
// Expected: Success

// Any user writes patterns - SHOULD FAIL
// User: user1@test.com
// Action: Write /patterns/pattern1
// Expected: Permission denied
```

#### Test 7: Audit Logs Collection
```javascript
// Authenticated user reads logs - SHOULD SUCCEED
// User: user1@test.com
// Action: Read /auditLogs/log1
// Expected: Success

// Any user writes logs - SHOULD FAIL
// User: user1@test.com
// Action: Write /auditLogs/log1
// Expected: Permission denied
```

### Step 5: Automated Testing (Future Enhancement)

To implement automated testing, install the testing package:

```bash
npm install --save-dev @firebase/rules-unit-testing
```

Then run the test suite:

```bash
npm run test:rules
```

---

## Deploying to Production

### Step 1: Verify Rules File

Ensure `firestore.rules` is complete and tested:

```bash
# View current rules
cat firestore.rules
```

### Step 2: Initialize Firebase Project (if not done)

```bash
# Initialize Firebase in the project
firebase init firestore

# Select:
# - Use existing project
# - firestore.rules as rules file
# - firestore.indexes.json as indexes file
```

### Step 3: Deploy Rules

```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Or deploy rules and indexes together
firebase deploy --only firestore
```

### Step 4: Verify Deployment

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Navigate to Firestore Database > Rules
4. Verify the rules are updated with the latest timestamp
5. Review the deployed rules match your local file

### Step 5: Test in Production

**IMPORTANT:** Test with a non-production account first!

1. Create a test user in Firebase Authentication
2. Use the Firebase Console or your application to test:
   - Authenticated access to findings
   - User can only modify their own user document
   - Privacy mappings are inaccessible
   - Patterns and audit logs are read-only

---

## Rollback Procedure

If issues are discovered after deployment:

### Option 1: Redeploy Previous Version

```bash
# If you have the previous rules file
firebase deploy --only firestore:rules
```

### Option 2: Use Firebase Console

1. Go to Firebase Console > Firestore > Rules
2. Click on the "Rules History" tab
3. Select a previous version
4. Click "Publish" to restore

---

## Security Checklist

Before deploying to production, verify:

- [ ] All collections have appropriate rules defined
- [ ] Unauthenticated users cannot access protected data
- [ ] Users can only access their own private data (chatSessions, reports)
- [ ] Server-only collections (mappings, patterns, auditLogs) deny client writes
- [ ] Helper functions (isAuthenticated, isOwner) work correctly
- [ ] Rules have been tested in emulator
- [ ] No overly permissive rules (e.g., `allow read, write: if true`)
- [ ] Rules align with requirements 10.5

---

## Monitoring and Maintenance

### Monitor Rule Violations

1. Go to Firebase Console > Firestore > Usage
2. Check for "Permission Denied" errors
3. Review patterns of denied requests

### Update Rules

When adding new collections or modifying access patterns:

1. Update `firestore.rules` file
2. Test in emulator
3. Deploy to production
4. Monitor for issues

### Best Practices

- Always test rules in emulator before production deployment
- Keep rules file in version control
- Document any rule changes in commit messages
- Review rules during security audits
- Use least privilege principle (grant minimum necessary access)

---

## Troubleshooting

### Issue: "Permission Denied" in Application

**Cause:** User doesn't have required permissions

**Solution:**
1. Check if user is authenticated
2. Verify the rule for that collection
3. Check if userId matches for owner-only collections
4. Review Firestore logs in Firebase Console

### Issue: Rules Not Updating

**Cause:** Deployment didn't complete or caching

**Solution:**
1. Redeploy: `firebase deploy --only firestore:rules`
2. Check Firebase Console to verify rules timestamp
3. Clear browser cache and retry
4. Wait a few minutes for propagation

### Issue: Emulator Not Starting

**Cause:** Port conflicts or configuration issues

**Solution:**
1. Check if ports are available (4000, 8080, 9099, 5001)
2. Kill processes using those ports
3. Verify `firebase.json` configuration
4. Restart emulator

---

## Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Security Rules Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Best Practices for Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure)

---

## Completion Checklist

Task 4.4: Deploy Firestore security rules

- [x] Write security rules for all collections
- [x] Document testing procedures with Firebase Emulator
- [x] Create deployment guide
- [ ] Test rules using Firebase Emulator (requires Firebase CLI installation)
- [ ] Deploy rules to production Firebase project (requires Firebase project setup)

**Status:** Rules written and documented. Deployment requires Firebase CLI installation and project configuration.
