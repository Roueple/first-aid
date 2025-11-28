# Smart Query Router - Real Testing Guide

## The Problem

The automated tests fail because:
- ❌ Firestore requires authentication (`isAuthenticated()` in rules)
- ❌ Tests run without a logged-in user
- ❌ AI (Gemini) may not be configured

## Real Testing Steps

### Prerequisites

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Login to the app:**
   - Open the app in your browser
   - Login with your credentials
   - This creates an authenticated session

### Test Scenario 1: Simple Query

**Query to test:**
```
Show me all critical findings from 2024
```

**Expected behavior:**
- Should classify as: `simple`
- Should extract filters: year=2024, severity=Critical
- Should query Firestore directly
- Should return a list of findings (or "no results" message)

**How to test:**
1. Go to Chat page in the app
2. Type the query above
3. Send the message
4. Check the response

**What to verify:**
- ✓ Response is fast (< 1 second)
- ✓ Shows list of findings or "no results" message
- ✓ No AI analysis in the response
- ✓ Filters are applied correctly

---

### Test Scenario 2: Complex Query

**Query to test:**
```
What are the main patterns in our hospital audit findings and what should we prioritize?
```

**Expected behavior:**
- Should classify as: `complex`
- Should extract filters: projectType=Hospital
- Should use AI analysis with RAG context
- Should return analytical insights

**How to test:**
1. Go to Chat page in the app
2. Type the query above
3. Send the message
4. Check the response

**What to verify:**
- ✓ Response takes longer (AI processing)
- ✓ Response contains analysis and insights
- ✓ Response references specific findings
- ✓ Response answers "what patterns" and "what to prioritize"

**If AI not configured:**
- Will show error: "AI service is not configured"
- This is expected - you need to add `VITE_GEMINI_API_KEY` to `.env`

---

### Test Scenario 3: Hybrid Query

**Query to test:**
```
List all open findings in hotels and explain what trends you see
```

**Expected behavior:**
- Should classify as: `hybrid`
- Should extract filters: projectType=Hotel, status=Open
- Should query database first, then analyze with AI
- Should return both list of findings AND analysis

**How to test:**
1. Go to Chat page in the app
2. Type the query above
3. Send the message
4. Check the response

**What to verify:**
- ✓ Response shows list of findings
- ✓ Response includes AI analysis of trends
- ✓ Both database results and AI insights are present
- ✓ Filters are applied correctly

---

## Alternative: Test with Browser Console

If you want to test the logic directly:

1. **Open the app and login**

2. **Open browser DevTools (F12)**

3. **Run in console:**

```javascript
// Test classification only
const { queryRouterService } = await import('./src/services/QueryRouterService');

// Test 1: Simple query
const intent1 = await queryRouterService.classifyQuery('Show me all critical findings from 2024');
console.log('Simple query:', intent1);

// Test 2: Complex query
const intent2 = await queryRouterService.classifyQuery('What are the main patterns in our hospital audit findings?');
console.log('Complex query:', intent2);

// Test 3: Hybrid query
const intent3 = await queryRouterService.classifyQuery('List all open findings in hotels and explain trends');
console.log('Hybrid query:', intent3);
```

4. **Test full execution:**

```javascript
// This will work because you're authenticated in the browser
const response = await queryRouterService.routeQuery('Show me all critical findings from 2024');
console.log('Response:', response);
```

---

## Quick Classification Test (No Auth Needed)

You can test JUST the classification logic without database/AI:

```bash
npm test -- QueryClassifier.test.ts
```

This tests:
- ✓ Pattern matching
- ✓ Filter extraction
- ✓ Confidence scoring
- ✓ Query type detection

---

## Summary

**What works in automated tests:**
- ✅ Query classification (simple/complex/hybrid)
- ✅ Filter extraction
- ✅ Confidence scoring
- ✅ Pattern matching

**What needs manual testing:**
- 🔐 Database queries (requires authentication)
- 🤖 AI analysis (requires Gemini API key)
- 🔄 End-to-end flow (requires running app)

**To test properly:**
1. Start the app: `npm run dev`
2. Login to create authenticated session
3. Use the Chat page to test the 3 queries above
4. Verify the responses match expected behavior

---

## Expected Results

| Query Type | Classification | Execution | Response Time |
|------------|---------------|-----------|---------------|
| Simple | ✅ Works | ✅ Works (if auth) | < 1s |
| Complex | ✅ Works | ⚠️ Needs Gemini API | 2-5s |
| Hybrid | ✅ Works | ⚠️ Needs auth + API | 2-5s |

