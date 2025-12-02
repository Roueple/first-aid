# Firestore Security Rules - Quick Start Guide

## Overview

This guide provides quick commands for testing and deploying Firestore security rules.

## Prerequisites

Install Firebase CLI (one-time setup):
```bash
npm install -g firebase-tools
```

Login to Firebase (one-time setup):
```bash
firebase login
```

## Testing Rules (Local Emulator)

### Option 1: Using NPM Script
```bash
npm run dev:emulators
```

### Option 2: Using Helper Scripts

**Windows:**
```bash
scripts\test-firestore-rules.bat
```

**Linux/Mac:**
```bash
./scripts/test-firestore-rules.sh
```

### Option 3: Direct Firebase Command
```bash
firebase emulators:start
```

Then open: http://localhost:4000

## Deploying Rules (Production)

### Option 1: Using NPM Script
```bash
npm run deploy:rules
```

### Option 2: Using Helper Scripts

**Windows:**
```bash
scripts\deploy-firestore-rules.bat
```

**Linux/Mac:**
```bash
./scripts/deploy-firestore-rules.sh
```

### Option 3: Direct Firebase Command
```bash
firebase deploy --only firestore:rules
```

## Testing Checklist

When testing in the emulator:

1. ✅ Create test users in Authentication tab
2. ✅ Test authenticated user can read findings
3. ✅ Test user can only modify their own user document
4. ✅ Test user can only access their own chat sessions
5. ✅ Test user can only access their own reports
6. ✅ Test privacy mappings are completely inaccessible
7. ✅ Test patterns are read-only for users
8. ✅ Test audit logs are read-only for users
9. ✅ Test unauthenticated access is denied

## Deployment Checklist

Before deploying to production:

1. ✅ All tests pass in emulator
2. ✅ Rules file reviewed and verified
3. ✅ Backup of current rules taken (if updating)
4. ✅ Team notified of deployment
5. ✅ Post-deployment testing plan ready

## Quick Reference

| Action | Command |
|--------|---------|
| Test locally | `npm run dev:emulators` |
| Deploy rules | `npm run deploy:rules` |
| View current project | `firebase use` |
| Switch project | `firebase use <project-id>` |
| View rules history | Firebase Console > Firestore > Rules > History |

## Troubleshooting

**Firebase CLI not found:**
```bash
npm install -g firebase-tools
```

**Not logged in:**
```bash
firebase login
```

**Port already in use:**
- Kill processes on ports 4000, 8080, 9099, 5001
- Or modify ports in `firebase.json`

**Rules not updating:**
- Redeploy: `npm run deploy:rules`
- Check Firebase Console for latest timestamp
- Clear browser cache

## Documentation

For detailed information, see:
- **Full Guide:** `docs/firestore-rules-deployment.md`
- **Test Cases:** `firestore.rules.test.ts`
- **Completion Report:** `docs/task-4.4-completion-report.md`

## Security Rules Summary

| Collection | Read | Write |
|------------|------|-------|
| users | Any auth user | Owner only |
| findings | Any auth user | Any auth user |
| chatSessions | Owner only | Owner only |
| mappings | ❌ Denied | ❌ Denied |
| reports | Owner only | Owner only (create: any) |
| patterns | Any auth user | ❌ Denied (Cloud Functions only) |
| auditLogs | Any auth user | ❌ Denied (Cloud Functions only) |
| _connection_test_ | Any auth user | ❌ Denied |

## Support

For issues or questions:
1. Check `docs/firestore-rules-deployment.md` troubleshooting section
2. Review Firebase Console logs
3. Check emulator logs at http://localhost:4000
