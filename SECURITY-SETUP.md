# Security Setup

## Required Credentials

This application requires the following credentials that are NOT included in the repository:

### 1. Firebase Configuration (.env)
Copy `.env.template` to `.env` and fill in:
- Firebase Web API Key
- Firebase Project ID
- Firebase Auth Domain
- Gemini API Key

### 2. Service Account Key (serviceaccountKey.json)
Download from Firebase Console:
- Go to Project Settings → Service Accounts
- Click "Generate New Private Key"
- Save as `serviceaccountKey.json` in project root

### 3. Test Credentials (.test-credentials.json)
For testing only - create manually if needed.

## NEVER Commit These Files
- .env
- serviceaccountKey.json
- .test-credentials.json

These are already in .gitignore but double-check before committing.
