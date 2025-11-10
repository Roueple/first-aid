# Firebase Setup Guide

This guide will help you set up Firebase for the FIRST-AID system.

## Prerequisites

- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- A Firebase project created at [Firebase Console](https://console.firebase.google.com)

## Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: `first-aid-101112` (or your preferred name)
4. Follow the setup wizard

### 2. Enable Firebase Services

#### Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method

#### Enable Firestore Database
1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (we'll deploy security rules later)
4. Select your preferred location

#### Enable Cloud Functions
1. Go to **Functions**
2. Click "Get started"
3. Upgrade to Blaze plan (pay-as-you-go) if needed for Cloud Functions

### 3. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register app with nickname: "FIRST-AID Desktop"
5. Copy the configuration values
6. Update your `.env` file with these values

### 4. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 5. Login to Firebase

```bash
firebase login
```

### 6. Initialize Firebase in Project

```bash
firebase init
```

Select:
- ✅ Firestore
- ✅ Functions
- ✅ Emulators

Follow the prompts and use the existing configuration files.

## Firebase Emulator Suite Setup

The Firebase Emulator Suite allows you to develop and test locally without using production resources.

### Install Emulators

```bash
firebase init emulators
```

Select:
- ✅ Authentication Emulator
- ✅ Firestore Emulator
- ✅ Functions Emulator

Use the default ports:
- Authentication: 9099
- Firestore: 8080
- Functions: 5001
- Emulator UI: 4000

### Running Emulators

#### Option 1: Run emulators only
```bash
npm run dev:emulators
```

#### Option 2: Run app with emulators
```bash
npm run dev:with-emulators
```

Then update `.env`:
```
VITE_USE_FIREBASE_EMULATORS=true
```

### Emulator UI

Access the Emulator UI at: http://localhost:4000

Here you can:
- View and manage Firestore data
- See authentication users
- Monitor Cloud Functions logs
- Test security rules

## Deploy to Production

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

### Deploy Cloud Functions

```bash
firebase deploy --only functions
```

### Deploy Everything

```bash
firebase deploy
```

## Environment Variables

Make sure your `.env` file contains:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Firebase Emulator (set to 'true' to use local emulators)
VITE_USE_FIREBASE_EMULATORS=false

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key

# Gemini Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Firestore Security Rules

Security rules are defined in `firestore.rules`. Key points:

- All collections require authentication
- Users can only access their own data
- Privacy mappings are server-side only (Cloud Functions)
- Patterns and audit logs are read-only for clients

## Firestore Indexes

Composite indexes are defined in `firestore.indexes.json` for:
- Findings queries with filters and sorting
- Chat sessions by user and date
- Reports by user and date
- Audit logs by user and timestamp

## Connection Monitoring

The app includes automatic connection monitoring:

- **Connected**: Normal operation
- **Connecting**: Attempting to establish connection
- **Disconnected**: No connection (shows warning banner)

Connection status is checked:
- On browser online/offline events
- Every 30 seconds automatically
- Can be manually triggered

## Troubleshooting

### Emulators won't start
- Check if ports are already in use
- Try `firebase emulators:start --only firestore,auth,functions`

### Connection issues
- Verify Firebase configuration in `.env`
- Check browser console for errors
- Ensure Firebase project is active

### Security rules errors
- Test rules in Emulator UI
- Check authentication status
- Verify user permissions

### Functions deployment fails
- Ensure Blaze plan is active
- Check Node.js version compatibility
- Review function logs in Firebase Console

## Next Steps

After Firebase setup:
1. ✅ Test connection with emulators
2. ✅ Create test user in Authentication
3. ✅ Test Firestore read/write operations
4. ✅ Deploy security rules to production
5. ✅ Set up Cloud Functions (Task 8+)

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Cloud Functions](https://firebase.google.com/docs/functions)
