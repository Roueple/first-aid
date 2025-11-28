# Quick Reference: Unified Data Masking

## When to Use What

### Local Masking (Fast, < 1ms)
```typescript
// ✅ Use for: User queries
const masked = dataMaskingService.maskSensitiveData(query);
const unmasked = dataMaskingService.unmaskSensitiveData(text, tokens);
```

### Server Pseudonymization (Session-based, ~100-200ms)
```typescript
// ✅ Use for: Findings data sent to AI
const pseudo = await dataMaskingService.pseudonymizeFindings(findings, sessionId);
const depseudo = await dataMaskingService.depseudonymizeText(text, sessionId);
```

## Complete Flow in SmartQueryRouter

```typescript
// User query: "show findings for john.doe@company.com"

// 1. LOCAL MASK (automatic)
// → "show findings for [EMAIL_1]"

// 2. Intent Recognition
// → Understands: Find findings

// 3. Database Query
// → Retrieves findings

// 4. SERVER PSEUDONYMIZE (if sessionId provided)
// → John Doe → Person_A
// → ID12345 → ID_001

// 5. Send to AI
// → AI sees: Person_A, ID_001

// 6. AI Response
// → "Person_A should fix ID_001"

// 7. SERVER DEPSEUDONYMIZE
// → "John Doe should fix ID12345"

// 8. LOCAL UNMASK
// → "John Doe should fix ID12345 for john.doe@company.com"
```

## API Quick Reference

### DataMaskingService

#### Local Mode (Client-side)
```typescript
// Mask text
maskSensitiveData(text: string): MaskingResult
// Returns: { maskedText, tokens }

// Unmask text
unmaskSensitiveData(maskedText: string, tokens: MaskingToken[]): string

// Check for sensitive data
containsSensitiveData(text: string): boolean
```

#### Server Mode (Session-based)
```typescript
// Pseudonymize findings
async pseudonymizeFindings(
  findings: Finding[], 
  sessionId: string
): Promise<{
  pseudonymizedFindings: Finding[];
  sessionId: string;
  mappingsCreated: number;
}>

// Depseudonymize data
async depseudonymizeData(data: any, sessionId: string): Promise<any>

// Pseudonymize text
async pseudonymizeText(text: string, sessionId: string): Promise<string>

// Depseudonymize text
async depseudonymizeText(text: string, sessionId: string): Promise<string>
```

## Usage Patterns

### Pattern 1: Simple Query (No AI)
```typescript
const result = await smartQueryRouter.processQuery(
  "show me critical findings 2024"
);
// Uses: Local masking only
// Speed: Fast (~100-300ms)
```

### Pattern 2: Complex Query with AI
```typescript
const result = await smartQueryRouter.processQuery(
  "analyze findings for John Doe",
  { sessionId: "chat_123" }
);
// Uses: Local masking + Server pseudonymization
// Speed: ~2-4s (includes AI processing)
```

### Pattern 3: Direct Local Masking
```typescript
// Quick masking for queries
const masked = dataMaskingService.maskSensitiveData(
  "Contact john.doe@company.com"
);
console.log(masked.maskedText); // "Contact [EMAIL_1]"

// Later unmask
const unmasked = dataMaskingService.unmaskSensitiveData(
  response,
  masked.tokens
);
```

### Pattern 4: Direct Server Pseudonymization
```typescript
// Pseudonymize findings for AI
const pseudo = await dataMaskingService.pseudonymizeFindings(
  findings,
  sessionId
);

// Send to AI
const aiResponse = await sendToAI(pseudo.pseudonymizedFindings);

// Depseudonymize response
const final = await dataMaskingService.depseudonymizeText(
  aiResponse,
  sessionId
);
```

## Comparison Table

| Feature | Local Masking | Server Pseudonymization |
|---------|--------------|------------------------|
| **Speed** | < 1ms | ~100-200ms |
| **Network** | No | Yes |
| **Persistence** | Temporary | 30 days |
| **Session-based** | No | Yes |
| **Use for** | Queries | Findings |
| **Fallback** | N/A | → Local masking |

## Error Handling

### Automatic Fallbacks
```typescript
// Server pseudonymization fails → Uses local masking
// Depseudonymization fails → Returns data as-is
// No sessionId provided → Skips server pseudonymization
```

### Manual Error Handling
```typescript
try {
  const pseudo = await dataMaskingService.pseudonymizeFindings(
    findings,
    sessionId
  );
} catch (error) {
  console.error('Pseudonymization failed:', error);
  // Handle error or use fallback
}
```

## Integration Checklist

- [ ] Import `dataMaskingService` from `./services/DataMaskingService`
- [ ] Use `smartQueryRouter.processQuery()` with `sessionId` for AI queries
- [ ] Local masking: Use for quick query protection
- [ ] Server pseudonymization: Use when `sessionId` available
- [ ] Test both modes work correctly
- [ ] Verify fallback behavior

## Common Patterns

### ChatPage Integration
```typescript
import { smartQueryRouter } from '../services/SmartQueryRouter';

const handleSendMessage = async (message: string) => {
  const result = await smartQueryRouter.processQuery(message, {
    sessionId: currentSessionId, // Enables server pseudonymization
    thinkingMode: 'low',
  });
  
  // Result automatically has all data unmasked/depseudonymized
  displayResults(result);
};
```

### Testing
```typescript
// Test local masking
const masked = dataMaskingService.maskSensitiveData(
  "test@example.com"
);
expect(masked.maskedText).toBe("[EMAIL_1]");

// Test server pseudonymization
const pseudo = await dataMaskingService.pseudonymizeFindings(
  testFindings,
  "test_session"
);
expect(pseudo.mappingsCreated).toBeGreaterThan(0);
```

## Performance Tips

1. **Use local masking** for queries (fast, no network)
2. **Use server pseudonymization** only when needed (AI context)
3. **Provide sessionId** to enable server mode
4. **Cache results** when possible
5. **Monitor fallback usage** to detect server issues

## Troubleshooting

### Issue: Pseudonymization not working
- ✅ Check if `sessionId` is provided
- ✅ Verify Firebase Functions are deployed
- ✅ Check network connectivity
- ✅ Look for fallback warnings in console

### Issue: Data not restored
- ✅ Verify tokens are passed to unmask function
- ✅ Check sessionId matches pseudonymization
- ✅ Ensure depseudonymization is called
- ✅ Check for errors in console

### Issue: Slow performance
- ✅ Use local masking for queries (not server)
- ✅ Only pseudonymize findings when sending to AI
- ✅ Check network latency to Firebase
- ✅ Consider caching pseudonymized data

## Resources

- **Full Guide**: `docs/data-masking-unified.md`
- **Integration**: `UNIFIED-MASKING-INTEGRATION.md`
- **Flow Diagram**: `docs/smart-query-router-v2-flow.md`
- **API Docs**: See service files for detailed JSDoc
