# Query Router Test - Setup Guide

## Quick Start

1. **Add your test credentials** to `.test-credentials.json`:
   ```json
   {
     "email": "your-test-email@example.com",
     "password": "your-test-password"
   }
   ```

2. **Run the test**:
   ```bash
   node test-query-router-prod-v2.mjs
   ```

3. **Check the results**:
   - Terminal output shows live progress
   - `QUERY-ROUTER-PROD-TEST-RESULTS.md` contains full results

## What This Tests

The script tests 3 scenarios against your production database:

### Scenario 1: Simple Query
- **Query:** "Show me all critical findings from 2024"
- **Expected:** Direct database lookup
- **Tests:** Filter extraction (year, severity)

### Scenario 2: Complex Query
- **Query:** "What are the main patterns in our hospital audit findings and what should we prioritize?"
- **Expected:** AI analysis with RAG
- **Tests:** Pattern detection, AI integration

### Scenario 3: Hybrid Query
- **Query:** "List all open findings in hotels and explain what trends you see"
- **Expected:** Database + AI analysis
- **Tests:** Combined database and AI workflow

## What Gets Tested

✅ Query classification (simple/complex/hybrid)
✅ Filter extraction from natural language
✅ Database querying with extracted filters
✅ AI analysis with Gemini
✅ End-to-end execution time
✅ Real data retrieval from production

## Output

The script will:
1. Show progress in terminal
2. Display classification results
3. Show retrieved findings
4. Run AI analysis (for complex/hybrid queries)
5. Export everything to markdown file

## Notes

- Uses production Firebase database
- Requires valid user credentials
- Tests with real data
- AI analysis uses Gemini API
- Results exported to `QUERY-ROUTER-PROD-TEST-RESULTS.md`
