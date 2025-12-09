# Simple Query Configuration Guide

## Overview

The Simple Query feature includes a comprehensive configuration system that allows you to:
- Enable/disable the feature with a feature flag
- Configure performance settings
- Control caching behavior
- Monitor query metrics
- Validate configuration changes

## Configuration File

The configuration is managed through `src/config/simpleQuery.config.ts`.

## Default Configuration

```typescript
{
  // Feature flag - can be toggled for gradual rollout
  enabled: true,
  
  // Performance settings
  maxExecutionTime: 500, // 500ms target
  maxResults: 50,
  
  // Caching configuration
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  
  // Fallback behavior
  fallbackToLLM: true,
  
  // Pattern configuration
  patterns: allPatterns, // All predefined patterns
  
  // Monitoring hooks
  monitoring: {
    enabled: true,
    logMatches: true,
    logExecutionTime: true,
    logFallbacks: true,
  },
}
```

## Usage

### Getting Configuration

```typescript
import { getConfig } from '../config/simpleQuery.config';

const config = getConfig();
console.log('Max execution time:', config.maxExecutionTime);
```

### Updating Configuration

```typescript
import { updateConfig } from '../config/simpleQuery.config';

// Update specific settings
updateConfig({
  maxExecutionTime: 1000,
  cacheEnabled: false,
});
```

### Feature Flag Control

```typescript
import { setEnabled, isEnabled } from '../config/simpleQuery.config';

// Disable the feature
setEnabled(false);

// Check if enabled
if (isEnabled()) {
  // Process simple query
}

// Enable the feature
setEnabled(true);
```

### Resetting Configuration

```typescript
import { resetConfig } from '../config/simpleQuery.config';

// Reset to defaults
resetConfig();
```

## Configuration Validation

The configuration system includes automatic validation:

```typescript
import { validateConfig } from '../config/simpleQuery.config';

const config = {
  enabled: true,
  maxExecutionTime: -1, // Invalid!
  maxResults: 50,
  // ... other settings
};

const result = validateConfig(config);
if (!result.valid) {
  console.error('Configuration errors:', result.errors);
  // Output: ["maxExecutionTime must be greater than 0"]
}
```

### Validation Rules

- `maxExecutionTime` must be greater than 0
- `maxResults` must be greater than 0
- `cacheTTL` must be non-negative
- `patterns` must be a non-empty array
- Each pattern must have valid structure:
  - `id`: non-empty string
  - `name`: non-empty string
  - `priority`: number
  - `regex`: RegExp instance
  - `filterBuilder`: function
  - `sortBuilder`: function

## Monitoring and Metrics

### Recording Metrics

Metrics are automatically recorded when queries are processed:

```typescript
import { recordMatch, recordFallback } from '../config/simpleQuery.config';

// Record a successful match
recordMatch('temporal-year', 150, false); // patternId, executionTime, cacheHit

// Record a cache hit
recordMatch('department-basic', 50, true);

// Record a fallback to LLM
recordFallback('complex query that needs LLM');
```

### Getting Metrics

```typescript
import { getMetrics, getMatchRate, getCacheHitRate } from '../config/simpleQuery.config';

// Get all metrics
const metrics = getMetrics();
console.log('Total queries:', metrics.totalQueries);
console.log('Matched queries:', metrics.matchedQueries);
console.log('Fallback queries:', metrics.fallbackQueries);
console.log('Average execution time:', metrics.averageExecutionTime);
console.log('Cache hits:', metrics.cacheHits);
console.log('Cache misses:', metrics.cacheMisses);

// Get calculated rates
const matchRate = getMatchRate(); // Percentage of queries that matched
const cacheHitRate = getCacheHitRate(); // Percentage of cache hits
```

### Resetting Metrics

```typescript
import { resetMetrics } from '../config/simpleQuery.config';

// Reset all metrics to zero
resetMetrics();
```

## Monitoring Configuration

Control what gets logged:

```typescript
updateConfig({
  monitoring: {
    enabled: true,        // Enable/disable all monitoring
    logMatches: true,     // Log when patterns match
    logExecutionTime: true, // Log execution times
    logFallbacks: true,   // Log when falling back to LLM
  },
});
```

### Console Output Examples

When monitoring is enabled, you'll see logs like:

```
⚡ Simple Query matched: temporal-year (150ms)
⚡ Simple Query matched: department-basic (50ms) [CACHE HIT]
🤖 Simple Query fallback to LLM: "complex analytical query..."
✅ Simple Query configuration updated: { maxExecutionTime: 1000 }
❌ Simple Query feature disabled
```

## Gradual Rollout Strategy

### Phase 1: Testing (Feature Disabled)

```typescript
// Disable for initial testing
setEnabled(false);

// Test with specific users or sessions
if (isTestUser(userId)) {
  setEnabled(true);
  // Process query
  setEnabled(false);
}
```

### Phase 2: Canary Deployment (10% of users)

```typescript
// Enable for 10% of users
const shouldUseSimpleQuery = Math.random() < 0.1;
if (shouldUseSimpleQuery) {
  setEnabled(true);
}
```

### Phase 3: Gradual Increase (50% of users)

```typescript
const shouldUseSimpleQuery = Math.random() < 0.5;
if (shouldUseSimpleQuery) {
  setEnabled(true);
}
```

### Phase 4: Full Rollout (100% of users)

```typescript
// Enable for all users
setEnabled(true);
```

## Performance Tuning

### Adjusting Execution Time Target

```typescript
// Increase target for complex patterns
updateConfig({ maxExecutionTime: 1000 });

// Decrease for faster response
updateConfig({ maxExecutionTime: 300 });
```

### Adjusting Result Limits

```typescript
// Increase for more comprehensive results
updateConfig({ maxResults: 100 });

// Decrease for faster queries
updateConfig({ maxResults: 25 });
```

### Cache Configuration

```typescript
// Disable caching for testing
updateConfig({ cacheEnabled: false });

// Increase cache TTL for stable data
updateConfig({ cacheTTL: 600000 }); // 10 minutes

// Decrease cache TTL for frequently changing data
updateConfig({ cacheTTL: 60000 }); // 1 minute
```

## Integration with DocAIService

The configuration is automatically integrated with DocAIService:

```typescript
// In DocAIService.ts
import { isEnabled as isSimpleQueryEnabled } from '../config/simpleQuery.config';

// Simple query only runs if feature is enabled
if (simpleQueryService && isSimpleQueryEnabled()) {
  const simpleResult = await simpleQueryService.processQuery(message, userId, activeSessionId);
  if (simpleResult) {
    // Use simple query result
  }
}
// Otherwise fall back to LLM
```

## Monitoring Dashboard Example

You can create a monitoring dashboard using the metrics:

```typescript
import { getMetrics, getMatchRate, getCacheHitRate } from '../config/simpleQuery.config';

function displayMetrics() {
  const metrics = getMetrics();
  const matchRate = getMatchRate();
  const cacheHitRate = getCacheHitRate();
  
  console.log('=== Simple Query Metrics ===');
  console.log(`Total Queries: ${metrics.totalQueries}`);
  console.log(`Match Rate: ${matchRate.toFixed(2)}%`);
  console.log(`Fallback Rate: ${(100 - matchRate).toFixed(2)}%`);
  console.log(`Average Execution Time: ${metrics.averageExecutionTime.toFixed(2)}ms`);
  console.log(`Cache Hit Rate: ${cacheHitRate.toFixed(2)}%`);
  console.log('===========================');
}

// Display metrics every minute
setInterval(displayMetrics, 60000);
```

## Best Practices

1. **Start with Feature Disabled**: Test thoroughly before enabling
2. **Monitor Metrics**: Track match rate and execution time
3. **Gradual Rollout**: Use feature flag for phased deployment
4. **Validate Configuration**: Always validate before applying changes
5. **Cache Appropriately**: Balance freshness vs performance
6. **Log Strategically**: Enable logging during testing, reduce in production
7. **Reset Metrics Periodically**: Clear metrics for fresh analysis

## Troubleshooting

### Feature Not Working

```typescript
// Check if feature is enabled
if (!isEnabled()) {
  console.log('Simple Query feature is disabled');
  setEnabled(true);
}
```

### Poor Match Rate

```typescript
const matchRate = getMatchRate();
if (matchRate < 40) {
  console.log('Match rate is low, consider adding more patterns');
}
```

### Slow Execution

```typescript
const metrics = getMetrics();
if (metrics.averageExecutionTime > 500) {
  console.log('Execution time exceeds target, consider optimizing patterns');
}
```

### Cache Issues

```typescript
const cacheHitRate = getCacheHitRate();
if (cacheHitRate < 20) {
  console.log('Low cache hit rate, consider increasing TTL');
  updateConfig({ cacheTTL: 600000 }); // Increase to 10 minutes
}
```

## API Reference

### Configuration Functions

- `getConfig()`: Get current configuration
- `updateConfig(updates)`: Update configuration (validates first)
- `resetConfig()`: Reset to default configuration
- `setEnabled(enabled)`: Enable/disable feature
- `isEnabled()`: Check if feature is enabled
- `validateConfig(config)`: Validate configuration

### Monitoring Functions

- `recordMatch(patternId, executionTime, cacheHit)`: Record a match
- `recordFallback(query)`: Record a fallback
- `getMetrics()`: Get all metrics
- `resetMetrics()`: Reset all metrics
- `getMatchRate()`: Get match rate percentage
- `getCacheHitRate()`: Get cache hit rate percentage

## Related Documentation

- [Simple Query Design](../.kiro/specs/docai-simple-query/design.md)
- [Simple Query Requirements](../.kiro/specs/docai-simple-query/requirements.md)
- [Query Patterns](../src/services/queryPatterns.ts)
