#!/bin/bash

# Firestore Security Rules Testing Script
# This script helps test Firestore security rules using the Firebase Emulator

set -e

echo "=========================================="
echo "FIRST-AID Firestore Rules Testing"
echo "=========================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI is not installed"
    echo ""
    echo "To install Firebase CLI, run:"
    echo "  npm install -g firebase-tools"
    echo ""
    exit 1
fi

echo "✅ Firebase CLI is installed"
echo ""

# Check if logged in
if ! firebase projects:list &> /dev/null
then
    echo "❌ Not logged in to Firebase"
    echo ""
    echo "To login, run:"
    echo "  firebase login"
    echo ""
    exit 1
fi

echo "✅ Logged in to Firebase"
echo ""

# Check if firestore.rules exists
if [ ! -f "firestore.rules" ]; then
    echo "❌ firestore.rules file not found"
    exit 1
fi

echo "✅ firestore.rules file found"
echo ""

# Start emulator
echo "Starting Firebase Emulator..."
echo ""
echo "The emulator UI will be available at: http://localhost:4000"
echo ""
echo "To test the rules:"
echo "1. Open http://localhost:4000 in your browser"
echo "2. Go to Authentication tab and create test users"
echo "3. Go to Firestore tab and test read/write operations"
echo "4. Verify rules are enforced correctly"
echo ""
echo "Press Ctrl+C to stop the emulator"
echo ""

firebase emulators:start
