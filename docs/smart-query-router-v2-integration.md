# Smart Query Router V2 - Integration Guide

## Quick Start

### 1. Import the New Router

```typescript
import { smartQueryRouter } from '../services/SmartQueryRouter';
```

### 2. Replace Old Router Calls

```typescript
// OLD
import { queryRouterService } from '../services/QueryRouterService';
const result = await queryRouterService.routeQuery(userQuery, options);

// NEW
import { smartQueryRouter } from '../services/SmartQueryRouter';
const result = await smartQueryRouter.processQuery(userQuery, options);
```

### 3. Handle Results

The response format is the same, with an additional `recognizedIntent` field:

```typescript
const result = await smartQueryRouter.processQuery(userQuery);

if ('success' in result && !result.success) {
  // Error handling
  console.error(result.error.message);
  showError(result.error.suggestion);
} else {
  // Success - display results
  console.log('Intent:', result.recognizedIntent?.intent);
  console.log('Answer:', result.answer);
  console.log('Findings:', result.findings);
}
```

## Integration in ChatPage

### Before (Old System)

```typescript
// In ChatPage.tsx
import { queryRouterService } from '../services/QueryRouterService';

const handleSendMessage = async (message: string) => {
  try {
    const result = await queryRouterService.routeQuery(message, {
      sessionId: currentSessionId,
      thinkingMode: 'low',
    });
    
    if ('success' in result && !result.success) {
      // Handle error
      displayError(result.error.message);
    } else {
      // Display results
      displayResults(result);
    }
  } catch (error) {
    console.error('Query error:', error);
  }
};
```

### After (New System)

```typescript
// In ChatPage.tsx
import { smartQueryRouter } from '../services/SmartQueryRouter';

const handleSendMessage = async (message: string) => {
  try {
    const result = await smartQueryRouter.processQuery(message, {
      sessionId: currentSessionId,
      thinkingMode: 'low',
    });
    
    if ('success' in result && !result.success) {
      // Handle error
      displayError(result.error.message);
    } else {
      // Display results
      displayResults(result);
      
      // Optional: Show recognized intent for transparency
      if (result.recognizedIntent) {
        console.log('Understood as:', result.recognizedIntent.intent);
      }
    }
  } catch (error) {
    console.error('Query error:', error);
  }
};
```

## Showing Intent to Users (Optional)

You can display the recognized intent to users for transparency:

```typescript
// Add to your UI
{result.recognizedIntent && (
  <div className="intent-display">
    <span className="label">Understood as:</span>
    <span className="intent">{result.recognizedIntent.intent}</span>
    <span className="confidence">
      ({Math.round(result.recognizedIntent.confidence * 100)}% confident)
    </span>
  </div>
)}
```

## Testing the New System

### Test Case 1: Synonym Recognition

```typescript
const testQueries = [
  "show me critical findings 2024",
  "show me severity critical 2024",
  "show me highest risk findings 2024",
  "display urgent issues from 2024"
];

for (const query of testQueries) {
  const result = await smartQueryRouter.processQuery(query);
  console.log('Query:', query);
  console.log('Intent:', result.recognizedIntent?.intent);
  console.log('Filters:', result.recognizedIntent?.filters);
  console.log('---');
}

// Expected: All should recognize Critical severity + 2024 year
```

### Test Case 2: Sensitive Data Masking

```typescript
const query = "show findings for john.doe@company.com";
const result = await smartQueryRouter.processQuery(query);

// The email should be masked during processing
// but appear correctly in the final result
console.log('Result:', result.answer);
// Should contain: "john.doe@company.com" (unmasked)
```

### Test Case 3: Analysis Detection

```typescript
const queries = [
  { query: "show me critical findings", expectAnalysis: false },
  { query: "why are there critical findings?", expectAnalysis: true },
  { query: "list findings and recommend priorities", expectAnalysis: true }
];

for (const test of queries) {
  const result = await smartQueryRouter.processQuery(test.query);
  const requiresAnalysis = result.recognizedIntent?.requiresAnalysis;
  
  console.log('Query:', test.query);
  console.log('Requires Analysis:', requiresAnalysis);
  console.log('Expected:', test.expectAnalysis);
  console.log('Match:', requiresAnalysis === test.expectAnalysis ? '✓' : '✗');
  console.log('---');
}
```

## Backward Compatibility

The old `QueryRouterService` is still available. You can:

1. **Gradual migration**: Use new system for new features, keep old for existing
2. **A/B testing**: Test both systems side-by-side
3. **Fallback**: Use old system if new system has issues

```typescript
// Fallback pattern
try {
  const result = await smartQueryRouter.processQuery(query);
  return result;
} catch (error) {
  console.warn('New router failed, falling back to old:', error);
  return await queryRouterService.routeQuery(query);
}
```

## Performance Considerations

### Intent Recognition Caching

For frequently asked queries, consider caching intent recognition:

```typescript
const intentCache = new Map<string, RecognizedIntent>();

async function processQueryWithCache(query: string) {
  const cacheKey = query.toLowerCase().trim();
  
  if (intentCache.has(cacheKey)) {
    console.log('Using cached intent');
    // Still process with cached intent
  }
  
  const result = await smartQueryRouter.processQuery(query);
  
  if (result.recognizedIntent) {
    intentCache.set(cacheKey, result.recognizedIntent);
  }
  
  return result;
}
```

### Debouncing

For real-time query suggestions, debounce intent recognition:

```typescript
import { debounce } from 'lodash';

const debouncedIntentRecognition = debounce(async (query: string) => {
  const result = await smartQueryRouter.processQuery(query);
  showIntentPreview(result.recognizedIntent);
}, 500);

// In your input handler
const handleQueryChange = (query: string) => {
  setQuery(query);
  debouncedIntentRecognition(query);
};
```

## Error Handling

### Graceful Degradation

```typescript
const result = await smartQueryRouter.processQuery(query);

if ('success' in result && !result.success) {
  switch (result.error.code) {
    case 'AI_ERROR':
      // AI unavailable, but might have fallback data
      if (result.error.fallbackData) {
        displayFindings(result.error.fallbackData);
        showWarning('AI analysis unavailable, showing database results');
      } else {
        showError(result.error.suggestion);
      }
      break;
      
    case 'DATABASE_ERROR':
      showError('Unable to search findings. Please try again.');
      break;
      
    case 'CLASSIFICATION_ERROR':
      showError('Unable to understand query. Try rephrasing.');
      break;
      
    default:
      showError(result.error.message);
  }
}
```

## Monitoring & Logging

### Track Intent Recognition Accuracy

```typescript
const result = await smartQueryRouter.processQuery(query);

// Log for analytics
analytics.track('query_processed', {
  query: query,
  intent: result.recognizedIntent?.intent,
  confidence: result.recognizedIntent?.confidence,
  queryType: result.type,
  executionTime: result.metadata.executionTimeMs,
  findingsCount: result.metadata.findingsAnalyzed,
});
```

### User Feedback Loop

Allow users to confirm or correct intent recognition:

```typescript
// Show intent with feedback buttons
<div className="intent-feedback">
  <span>Understood as: {result.recognizedIntent?.intent}</span>
  <button onClick={() => confirmIntent(true)}>✓ Correct</button>
  <button onClick={() => confirmIntent(false)}>✗ Wrong</button>
</div>

// Track feedback
function confirmIntent(correct: boolean) {
  analytics.track('intent_feedback', {
    query: query,
    intent: result.recognizedIntent?.intent,
    correct: correct,
  });
  
  if (!correct) {
    // Allow user to rephrase or provide correct intent
    showIntentCorrectionDialog();
  }
}
```

## Next Steps

1. **Update ChatPage.tsx** to use `smartQueryRouter`
2. **Test with various query variations** to verify synonym recognition
3. **Monitor performance** and adjust caching if needed
4. **Collect user feedback** on intent recognition accuracy
5. **Iterate and improve** based on real usage patterns
