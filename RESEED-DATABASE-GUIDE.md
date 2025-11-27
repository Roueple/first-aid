# Database Reseed Guide

## Problem
Your code has been updated to use the new findings schema, but your Firebase database still contains old data with the old structure.

## Solution

Follow these steps to clear old data and seed new data with the updated schema:

### Step 1: Start Your Application
```bash
npm run dev
```

### Step 2: Login to Your Application
- Open the application in your browser
- Login with your credentials

### Step 3: Open Browser Console
- Press `F12` or right-click and select "Inspect"
- Go to the "Console" tab

### Step 4: Run the Reseed Command

In the console, type:
```javascript
await clearAndReseed()
```

This will:
1. ✅ Delete all old findings from Firebase
2. ✅ Seed 8 new findings with the updated schema
3. ✅ Show progress in the console

### Step 5: Refresh the Page
After the process completes, refresh your browser to see the new data.

## Alternative: Manual Steps

If you prefer to do it step by step:

### Clear Old Data Only
```javascript
await clearAllFindings()
```

### Seed New Data Only
```javascript
await seedNewFindings()
```

## What's New in the Schema?

The new findings now include:
- ✅ `auditYear` - Year tracking
- ✅ `subholding` - Business unit (replaces location)
- ✅ `projectType` - Hotel, Office Building, Apartment, etc.
- ✅ `projectName` - Specific project name
- ✅ `findingDepartment` - Department where finding was identified
- ✅ `executor`, `reviewer`, `manager` - Audit team
- ✅ `controlCategory` - Preventive, Detective, Corrective
- ✅ `processArea` - Sales, Procurement, Finance, HR, IT, etc.
- ✅ `rootCause` - Root cause analysis
- ✅ `impactDescription` - Impact details
- ✅ `findingBobot` (1-4) - Weight/Severity
- ✅ `findingKadar` (1-5) - Degree/Intensity
- ✅ `findingTotal` (1-20) - Auto-calculated (Bobot × Kadar)
- ✅ `priorityLevel` - Auto-calculated (Critical/High/Medium/Low)
- ✅ `primaryTag` - Main category
- ✅ `secondaryTags` - Additional tags (array)
- ✅ Complete tag library with 123 tags across 15 categories

## Verify the Update

After reseeding, check:
1. Go to Findings page
2. You should see 8 findings with new fields
3. Check Firebase Console - findings collection should show new structure
4. Try filtering and searching - should work with new fields

## Troubleshooting

### Error: "Permission denied"
- Make sure you're logged in
- Check your Firestore rules allow delete/write operations

### Error: "Collection not found"
- Make sure Firebase is properly initialized
- Check your `.env` file has correct Firebase credentials

### Data still looks old
- Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check browser console for errors

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Firebase connection
3. Make sure you're logged in with proper permissions
