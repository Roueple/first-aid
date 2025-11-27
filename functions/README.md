# FIRST-AID Cloud Functions

This directory contains Firebase Cloud Functions for the FIRST-AID system, including privacy-protected AI processing through pseudonymization.

## Functions

### 1. pseudonymizeFindings

**Purpose**: Pseudonymize sensitive data in findings before sending to AI services.

**Type**: Callable HTTPS function

**Requirements**: 5.1, 5.2, 5.5

**Input**:
```typescript
{
  findings: Finding[],  // Array of findings to pseudonymize
  batchId?: string      // Optional batch ID (generated if not provided)
}
```

**Output**:
```typescript
{
  pseudonymizedFindings: Finding[],  // Findings with sensitive data replaced
  batchId: string,                   // Batch ID for this operation
  mappingsCreated: number            // Number of mappings created
}
```

**Process**:
1. Extracts sensitive data (names, IDs, amounts) from findings
2. Generates pseudonym mappings (Person_A, ID_001, Amount_001)
3. Stores encrypted mappings in Firestore `mappings` collection
4. Returns pseudonymized findings data

### 2. depseudonymizeResults

**Purpose**: Restore original values in AI results by reversing pseudonymization.

**Type**: Callable HTTPS function

**Requirements**: 5.3

**Input**:
```typescript
{
  data: any,        // Data containing pseudonyms to reverse
  batchId: string   // Batch ID to retrieve mappings
}
```

**Output**:
```typescript
{
  depseudonymizedData: any  // Data with original values restored
}
```

**Process**:
1. Retrieves mappings from secure Firestore collection using batchId
2. Decrypts original values
3. Replaces pseudonyms with real values
4. Updates usage count for audit purposes

### 3. cleanupExpiredMappings

**Purpose**: Automatically delete expired mappings (older than 30 days).

**Type**: Scheduled function (runs daily at midnight UTC)

**Requirements**: 5.4

**Process**:
1. Queries mappings with `expiresAt` <= current time
2. Deletes expired mappings in batch
3. Logs cleanup operation to audit logs

## Security

### Encryption

- All original values in mappings are encrypted using AES-256-GCM
- Encryption key is derived from `ENCRYPTION_SECRET` environment variable
- Each encrypted value includes IV and authentication tag

### Access Control

- All callable functions require authentication
- Mappings collection is restricted to server-side access only (see firestore.rules)
- All operations are logged to audit logs

### Data Retention

- Mappings automatically expire after 30 days
- Daily cleanup job removes expired mappings
- Usage count tracks how many times each mapping is used

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Set Environment Variables

```bash
firebase functions:config:set encryption.secret="your-secure-random-secret-key"
```

For local development, create `.env` file:
```
ENCRYPTION_SECRET=your-secure-random-secret-key
```

### 3. Build Functions

```bash
npm run build
```

### 4. Deploy Functions

```bash
npm run deploy
```

Or deploy from root:
```bash
firebase deploy --only functions
```

## Local Development

### Start Emulators

From project root:
```bash
npm run dev:emulators
```

Or from functions directory:
```bash
npm run serve
```

### Test Functions

Use Firebase Functions Shell:
```bash
npm run shell
```

Then call functions:
```javascript
pseudonymizeFindings({
  findings: [
    {
      title: "Test Finding",
      responsiblePerson: "John Doe",
      description: "Found issue with ID12345 involving $5,000"
    }
  ]
})
```

## Pseudonymization Patterns

### Names
- Pattern: `Person_A`, `Person_B`, ..., `Person_Z`, `Person_A1`, etc.
- Extracted from: `responsiblePerson`, `reviewerPerson` fields

### IDs
- Pattern: `ID_001`, `ID_002`, `ID_003`, etc.
- Extracted from: Text matching patterns like `ABC123`, `123456` in descriptions

### Amounts
- Pattern: `Amount_001`, `Amount_002`, `Amount_003`, etc.
- Extracted from: Currency patterns like `$1,000`, `5000 USD`, `rupiah` in text

## Error Handling

All functions include comprehensive error handling:

- **Authentication errors**: Returns `unauthenticated` error
- **Validation errors**: Returns `invalid-argument` error
- **Missing mappings**: Returns `not-found` error
- **Internal errors**: Returns `internal` error with details

All errors are logged to Cloud Functions logs for debugging.

## Monitoring

### View Logs

```bash
npm run logs
```

Or in Firebase Console:
- Functions > Logs

### Audit Trail

All operations are logged to `auditLogs` collection:
- User ID
- Action (pseudonymize, depseudonymize, cleanup_mappings)
- Resource type
- Details (batch ID, counts, etc.)
- Timestamp

## Testing

### Unit Tests

(To be implemented in future tasks)

```bash
npm test
```

### Integration Tests

Test with Firebase Emulators:
```bash
firebase emulators:exec --only functions,firestore "npm test"
```

## Troubleshooting

### Function not deploying

- Check Node.js version (must be 18)
- Ensure all dependencies are installed
- Check for TypeScript compilation errors

### Encryption errors

- Verify `ENCRYPTION_SECRET` is set
- Check that secret is at least 32 characters
- Ensure consistent secret across deployments

### Mapping not found errors

- Verify batchId is correct
- Check that mappings haven't expired (30 days)
- Ensure pseudonymizeFindings was called first

## Performance Considerations

- Batch operations are used for creating/deleting mappings
- Mappings are cached during pseudonymization
- Regex patterns are optimized for performance
- Large finding sets are processed efficiently

## Future Enhancements

- Support for additional sensitive data types
- Configurable expiry periods
- Mapping export for compliance
- Enhanced pattern detection for IDs and amounts
- Support for multiple languages
