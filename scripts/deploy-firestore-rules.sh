#!/bin/bash

# Firestore Security Rules Deployment Script
# This script deploys Firestore security rules to production

set -e

echo "=========================================="
echo "FIRST-AID Firestore Rules Deployment"
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

# Show current project
echo "Current Firebase project:"
firebase use
echo ""

# Confirm deployment
read -p "⚠️  Are you sure you want to deploy rules to production? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Deploying Firestore security rules..."
echo ""

# Deploy rules
firebase deploy --only firestore:rules

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Go to Firebase Console: https://console.firebase.google.com"
echo "2. Navigate to Firestore Database > Rules"
echo "3. Verify the rules are updated"
echo "4. Test with a non-production account"
echo ""
