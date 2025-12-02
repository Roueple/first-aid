# Transparent Logging Guide - Smart Query Router V2

## Overview

The Smart Query Router V2 now includes **transparent logging** that shows the complete process flow in your browser's DevTools console. This makes it easy to see exactly what's happening at each step.

## How to Use

### 1. Start the Application

```bash
npm run dev
```

### 2. Open DevTools Console

**Windows/Linux**: Press `F12` or `Ctrl + Shift + I`
**Mac**: Press `Cmd + Option + I`

Or right-click anywhere on the page and select "Inspect" → "Console" tab

### 3. Send a Query

Type any query in the chat interface, for example:
- "show me critical findings 2024"
- "analyze patterns in high severity issues"
- "list open findings and recommend priorities"

### 4. Watch the Console

You'll see a beautiful, color-coded flow showing every step:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  SMART QUERY ROUTER V2 - TRANSPARENT FLOW                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

📝 User Query: show me critical findings 2024
🔑 Session ID: session_abc123
⏱️  Started at: 2:30:45 PM

════════════════════════════════════════════════════════════════════════════════
▶ STEP 1: LOCAL MASKING
════════════════════════════════════════════════════════════════════════════════
Input: { query: "show me critical findings 2024" }
  → Masking sensitive data...
  → No sensitive data detected
Output: { maskedQuery: "show me critical findings 2024", tokensCreated: 0 }
✓ Completed in 2ms

════════════════════════════════════════════════════════════════════════════════
▶ STEP 2: INTENT RECOGNITION
════════════════════════════════════════════════════════════════════════════════
Input: { maskedQuery: "show me critical findings 2024" }
  → Recognizing intent from masked query...
  → Intent recognized
     Intent: Find Critical severity findings from 2024
     Confidence: 92%
     Requires Analysis: No
     Extracted Filters: { severity: ["Critical"], year: 2024 }
Output: { intent: "Find Critical severity findings from 2024", ... }
✓ Completed in 523ms

════════════════════════════════════════════════════════════════════════════════
▶ STEP 3: ROUTE DECISION
════════════════════════════════════════════════════════════════════════════════
  → Routing to: SIMPLE
     Reason: Simple data retrieval
     Has Filters: Yes
Output: { queryType: "simple", reason: "Simple data retrieval", ... }
✓ Completed in 1ms

════════════════════════════════════════════════════════════════════════════════
▶ STEP 4: EXECUTE SIMPLE QUERY
════════════════════════════════════════════════════════════════════════════════
  → Querying database...
  → Database query complete
     Filters: { priorityLevel: ["Critical"], auditYear: [2024] }
     Results: 15 findings
     Duration: 234ms
✓ Found 15 findings
Output: { type: "simple", findingsCount: 15 }
✓ Completed in 245ms

════════════════════════════════════════════════════════════════════════════════
▶ STEP 5: LOCAL UNMASKING
════════════════════════════════════════════════════════════════════════════════
  → Unmasking sensitive data...
  → No tokens to restore
✓ Completed in 1ms

╔═══════════════════════════════════════════════════════════════════════════════╗
║  FLOW COMPLETE                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

✓ Total Execution Time: 772ms
📊 Query Type: simple
🎯 Recognized Intent: Find Critical severity findings from 2024
📈 Confidence: 92%
⏱️  Completed at: 2:30:46 PM
```

## What You'll See

### Color Coding

- **Purple** 🟣: Major steps (STEP 1, STEP 2, etc.)
- **Blue** 🔵: Information and data
- **Green** 🟢: Success messages
- **Orange** 🟠: Warnings
- **Red** 🔴: Errors
- **Gray** ⚪: Data details

### Complete Flow Steps

#### STEP 1: LOCAL MASKING
- Shows original query
- Detects sensitive data (emails, phones, IDs)
- Creates masked tokens
- Shows masked query

#### STEP 2: INTENT RECOGNITION
- Sends masked query to LLM
- Recognizes user intent
- Extracts filters (year, severity, status, etc.)
- Determines if analysis needed
- Shows confidence score

#### STEP 3: ROUTE DECISION
- Decides query type (Simple/Complex/Hybrid)
- Shows routing reason
- Indicates if filters present

#### STEP 4: QUERY EXECUTION

**For Simple Queries:**
- Database query with filters
- Results count
- Execution time

**For Complex Queries:**
- Database query for context
- Server pseudonymization (if sessionId)
- AI processing (Gemini)
- Server depseudonymization
- Token usage

**For Hybrid Queries:**
- Database query for data
- Server pseudonymization
- AI analysis
- Server depseudonymization
- Combined results

#### STEP 5: LOCAL UNMASKING
- Restores original values
- Replaces masked tokens
- Shows final response

### Performance Metrics

Each step shows:
- ⏱️ **Duration**: How long each step took
- 📊 **Data counts**: Number of findings, tokens, etc.
- 🎯 **Confidence**: Intent recognition confidence
- 📈 **Tokens**: AI token usage (if applicable)

## Advanced Features

### Global Logger Access

The logger is available globally in the console:

```javascript
// Access the logger
window.queryRouterLogger

// Get all logs
window.queryRouterLogger.getLogs()

// Export logs as JSON
window.queryRouterLogger.exportLogs()

// Download logs as file
window.queryRouterLogger.downloadLogs()

// Clear logs
window.queryRouterLogger.clear()

// Enable/disable logging
window.queryRouterLogger.setEnabled(true)
window.queryRouterLogger.setEnabled(false)
```

### Example Queries to Test

#### 1. Synonym Recognition
Try these variations (all should be recognized as the same intent):
```
show me critical findings 2024
show me severity critical 2024
show me highest risk findings 2024
display urgent issues from 2024
```

#### 2. Sensitive Data Masking
Try queries with sensitive data:
```
show findings for john.doe@company.com
list issues assigned to +1-555-0123
find problems for ID12345
```

Watch the console to see masking/unmasking in action!

#### 3. Complex Analytical Queries
```
why are there so many critical findings?
analyze patterns in high severity issues
what trends do you see in hospital findings?
```

#### 4. Hybrid Queries
```
show me open findings from 2024 and recommend priorities
list critical issues and explain which to fix first
get hospital findings and suggest improvements
```

## Debugging Tips

### 1. Check Each Step

If something goes wrong, the console will show exactly which step failed:
- ❌ Red error messages
- ⚠️ Orange warnings
- Stack traces for errors

### 2. Verify Data Flow

Watch the data transformation:
- Input → Masked → Intent → Routed → Executed → Unmasked → Output

### 3. Performance Analysis

Check execution times:
- Local masking: < 1ms
- Intent recognition: ~500ms
- Database query: ~100-300ms
- AI processing: ~1-3s
- Total: Varies by query type

### 4. Export Logs

For detailed analysis:
```javascript
// In console
window.queryRouterLogger.downloadLogs()
```

This downloads a JSON file with all log entries, timestamps, and data.

## Production Considerations

### Disable Logging in Production

In production, you may want to disable detailed logging:

```typescript
// In ChatPage.tsx or app initialization
if (import.meta.env.PROD) {
  transparentLogger.setEnabled(false);
}
```

### Selective Logging

Enable logging only for specific users (e.g., admins):

```typescript
if (currentUser?.role === 'admin') {
  transparentLogger.setEnabled(true);
} else {
  transparentLogger.setEnabled(false);
}
```

## Troubleshooting

### Console Not Showing Logs

1. **Check if DevTools is open**: Press F12
2. **Check Console tab**: Make sure you're on the Console tab, not Elements or Network
3. **Check if logging is enabled**:
   ```javascript
   window.queryRouterLogger.setEnabled(true)
   ```
4. **Clear console and try again**: Click the 🚫 icon or press Ctrl+L

### Logs Too Verbose

If logs are too detailed:
```javascript
// Disable substep logging (keep only major steps)
// This would require modifying TransparentLogger
```

### Performance Impact

Logging has minimal performance impact:
- Console.log operations: < 1ms each
- Total overhead: ~5-10ms per query
- Negligible compared to network/AI operations

## Summary

The transparent logging system provides:

✅ **Complete visibility** into every step
✅ **Color-coded output** for easy reading
✅ **Performance metrics** for each operation
✅ **Data transformation tracking** (masking/unmasking)
✅ **Error details** when things go wrong
✅ **Export capability** for detailed analysis

**Open DevTools (F12) and start chatting to see it in action!** 🚀
