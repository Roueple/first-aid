# Unified Data Masking & Pseudonymization

## Overview

The system now uses a **unified approach** that combines:
1. **Local masking** (fast, client-side) for user queries
2. **Server pseudonymization** (session-based, persistent) for findings data

This leverages the best of both existing services:
- `DataMaskingService` - Local regex-based masking
- `PseudonymizationService` - Firebase Cloud Functions pseudonymization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Query                                │
│  "show findings for john.doe@company.com in 2024"           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  LOCAL MASKING (DataMaskingService)                         │
│  • Fast regex-based pattern matching                         │
│  • Masks: emails, phones, IDs, names                         │
│  • Stores temporary token mappings                           │
│  • Query: "show findings for [EMAIL_1] in 2024"             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Intent Recognition (LLM)                                    │
│  • Processes masked query                                    │
│  • Extracts filters and intent                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Query Execution                                             │
│  • Retrieves findings from database                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVER PSEUDONYMIZATION (PseudonymizationService)          │
│  • Session-based (isolated per chat session)                 │
│  • Pseudonymizes findings before sending to AI               │
│  • Persistent mappings (can restore later)                   │
│  • Findings: Person_A, ID_001, Amount_001                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  AI Analysis (Gemini)                                        │
│  • Processes pseudonymized findings                          │
│  • Generates insights/analysis                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVER DEPSEUDONYMIZATION                                   │
│  • Restores original values in AI response                   │
│  • Person_A → John Doe                                       │
│  • ID_001 → ID12345                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  LOCAL UNMASKING                                             │
│  • Restores query-level masked values                        │
│  • [EMAIL_1] → john.doe@company.com                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Final Response to User                                      │
│  • Complete, accurate data                                   │
│  • All sensitive information restored                        │
└─────────────────────────────────────────────────────────────┘
```

## Two Modes of Operation

### Mode 1: Local Masking (Fast)

**Use for**: User queries before sending to LLM

**Characteristics**:
- ✅ Fast (< 1ms)
- ✅ Client-side only
- ✅ No network calls
- ✅ Temporary mappings
- ❌ Not persistent
- ❌ Simple regex patterns

**Example**:
```typescript
// Mask query
const masked = dataMaskingService.maskSensitiveData(
  "show findings for john.doe@company.com"
);
// Result: "show findings for [EMAIL_1]"

// Send masked query to LLM
const response = await sendToLLM(masked.maskedText);

// Unmask response
const unmasked = dataMaskingService.unmaskSensitiveData(
  response,
  masked.tokens
);
// Result: Original email restored
```

### Mode 2: Server Pseudonymization (Session-based)

**Use for**: Findings data sent to AI with context

**Characteristics**:
- ✅ Session-based isolation
- ✅ Persistent mappings (30 days)
- ✅ Sophisticated pattern detection
- ✅ Consistent within session
- ❌ Requires network call
- ❌ Slower (~100-200ms)

**Example**:
```typescript
// Pseudonymize findings
const pseudo = await dataMaskingService.pseudonymizeFindings(
  findings,
  sessionId
);
// Result: Person_A, ID_001, Amount_001

// Send to AI
const aiResponse = await sendToAI(pseudo.pseudonymizedFindings);

// Depseudonymize response
const depseudo = await dataMaskingService.depseudonymizeText(
  aiResponse,
  sessionId
);
// Result: John Doe, ID12345, $5,000
```

## When to Use Which Mode

### Use Local Masking When:
- ✅ Processing user queries
- ✅ Need fast response
- ✅ Temporary protection needed
- ✅ No session context required

### Use Server Pseudonymization When:
- ✅ Sending findings to AI
- ✅ Need session-based consistency
- ✅ Want persistent mappings
- ✅ Have session ID available

## Unified DataMaskingService API

### Local Mode Methods

```typescript
// Mask text (local, fast)
maskSensitiveData(text: string): MaskingResult

// Unmask text (local, fast)
unmaskSensitiveData(maskedText: string, tokens: MaskingToken[]): string

// Check if text has sensitive data
containsSensitiveData(text: string): boolean
```

### Server Mode Methods

```typescript
// Pseudonymize findings (server, session-based)
async pseudonymizeFindings(
  findings: Finding[],
  sessionId: string
): Promise<{
  pseudonymizedFindings: Finding[];
  sessionId: string;
  mappingsCreated: number;
}>

// Depseudonymize data (server, session-based)
async depseudonymizeData(data: any, sessionId: string): Promise<any>

// Pseudonymize text (server, session-based)
async pseudonymizeText(text: string, sessionId: string): Promise<string>

// Depseudonymize text (server, session-based)
async depseudonymizeText(text: string, sessionId: string): Promise<string>
```

## Integration in SmartQueryRouter

The `SmartQueryRouter` automatically uses both modes:

```typescript
async processQuery(userQuery: string, options: QueryOptions) {
  // 1. LOCAL MASKING: Mask user query
  const masked = dataMaskingService.maskSensitiveData(userQuery);
  
  // 2. Intent recognition with masked query
  const intent = await recognizeIntent(masked.maskedText);
  
  // 3. Get findings from database
  const findings = await getFindings(intent.filters);
  
  // 4. SERVER PSEUDONYMIZATION: Pseudonymize findings for AI
  if (options.sessionId) {
    const pseudo = await dataMaskingService.pseudonymizeFindings(
      findings,
      options.sessionId
    );
    
    // 5. Send pseudonymized findings to AI
    const aiResponse = await sendToAI(pseudo.pseudonymizedFindings);
    
    // 6. SERVER DEPSEUDONYMIZATION: Restore findings data
    const depseudo = await dataMaskingService.depseudonymizeText(
      aiResponse,
      options.sessionId
    );
    
    // 7. LOCAL UNMASKING: Restore query data
    const final = dataMaskingService.unmaskSensitiveData(
      depseudo,
      masked.tokens
    );
    
    return final;
  }
}
```

## Benefits of Unified Approach

### 1. Best of Both Worlds
- Fast local masking for queries
- Robust server pseudonymization for findings
- Automatic fallback if server unavailable

### 2. Session Isolation
- Each chat session has separate mappings
- Same value = same pseudonym within session
- Different sessions = different pseudonyms

### 3. Privacy Protection
- Query data: masked locally, never sent raw
- Findings data: pseudonymized server-side
- AI never sees original sensitive data

### 4. Consistency
- Within a session, "John Doe" always becomes "Person_A"
- LLM can maintain context across messages
- User sees original names in final response

## Error Handling

Both modes have graceful fallbacks:

```typescript
// Server pseudonymization with fallback
try {
  const pseudo = await dataMaskingService.pseudonymizeFindings(
    findings,
    sessionId
  );
} catch (error) {
  console.warn('Server pseudonymization failed, using local masking');
  // Falls back to local masking
}

// Depseudonymization with fallback
try {
  const depseudo = await dataMaskingService.depseudonymizeText(
    text,
    sessionId
  );
} catch (error) {
  console.warn('Depseudonymization failed, returning as-is');
  // Returns text as-is
}
```

## Performance

| Operation | Mode | Time | Network |
|-----------|------|------|---------|
| Mask query | Local | < 1ms | No |
| Unmask query | Local | < 1ms | No |
| Pseudonymize findings | Server | ~100-200ms | Yes |
| Depseudonymize results | Server | ~100-200ms | Yes |

## Configuration

No additional configuration needed. The system:
- Uses local masking by default
- Automatically uses server pseudonymization when `sessionId` is provided
- Falls back gracefully if server unavailable

## Testing

### Test Local Masking
```typescript
const service = dataMaskingService;

// Test masking
const masked = service.maskSensitiveData(
  "Contact john.doe@company.com or call +1-555-0123"
);
console.log(masked.maskedText);
// "Contact [EMAIL_1] or call [PHONE_1]"

// Test unmasking
const unmasked = service.unmaskSensitiveData(
  masked.maskedText,
  masked.tokens
);
console.log(unmasked);
// "Contact john.doe@company.com or call +1-555-0123"
```

### Test Server Pseudonymization
```typescript
const service = dataMaskingService;
const sessionId = 'test_session_123';

// Test pseudonymization
const findings = [
  {
    findingTitle: 'Issue found',
    responsiblePerson: 'John Doe',
    findingDescription: 'Problem with ID12345'
  }
];

const pseudo = await service.pseudonymizeFindings(findings, sessionId);
console.log(pseudo.pseudonymizedFindings[0]);
// {
//   findingTitle: 'Issue found',
//   responsiblePerson: 'Person_A',
//   findingDescription: 'Problem with ID_001'
// }

// Test depseudonymization
const text = "Person_A should fix ID_001";
const depseudo = await service.depseudonymizeText(text, sessionId);
console.log(depseudo);
// "John Doe should fix ID12345"
```

## Migration Notes

### From Old PseudonymizationService

No changes needed! The unified service wraps the existing `PseudonymizationService`:

```typescript
// Old way (still works)
import { pseudonymizationService } from './PseudonymizationService';
const result = await pseudonymizationService.pseudonymizeFindings(findings, sessionId);

// New way (recommended)
import { dataMaskingService } from './DataMaskingService';
const result = await dataMaskingService.pseudonymizeFindings(findings, sessionId);
```

### From Old DataMaskingService

The API is the same, just enhanced with server methods:

```typescript
// Local masking (unchanged)
const masked = dataMaskingService.maskSensitiveData(text);
const unmasked = dataMaskingService.unmaskSensitiveData(text, tokens);

// New server methods (added)
const pseudo = await dataMaskingService.pseudonymizeFindings(findings, sessionId);
const depseudo = await dataMaskingService.depseudonymizeText(text, sessionId);
```

## Summary

The unified `DataMaskingService` provides:
- ✅ **Local masking** for fast query protection
- ✅ **Server pseudonymization** for session-based findings protection
- ✅ **Automatic fallbacks** if server unavailable
- ✅ **Consistent API** for both modes
- ✅ **Privacy protection** at all stages
- ✅ **Complete data restoration** in final results

Use it in `SmartQueryRouter` for the complete intent-based flow with full data protection!
