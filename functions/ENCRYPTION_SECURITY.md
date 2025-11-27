# Encryption and Security for Pseudonymization Mappings

## Overview

The FIRST-AID system implements privacy-protected AI processing through pseudonymization. This document describes the encryption and security measures implemented for protecting sensitive data mappings.

## Security Requirements

This implementation satisfies the following requirements:
- **Requirement 5.2**: Secure mapping table with encrypted original values
- **Requirement 5.4**: Automatic mapping expiry and cleanup
- **Requirement 10.3**: Data encryption at rest using AES-256

## Encryption Implementation

### Algorithm: AES-256-GCM

We use AES-256-GCM (Galois/Counter Mode) for encrypting original values before storage:

- **Key Size**: 256 bits (32 bytes)
- **IV Length**: 16 bytes (randomly generated for each encryption)
- **Authentication**: Built-in authentication tag prevents tampering
- **Format**: `iv:authTag:ciphertext` (all hex-encoded)

### Key Derivation

The encryption key is derived from an environment variable using PBKDF2:

```typescript
const secret = process.env.ENCRYPTION_SECRET;
const salt = Buffer.from('first-aid-pseudonymization-salt');
const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
```

**Important**: In production, set a strong `ENCRYPTION_SECRET` environment variable.

### Setting the Encryption Secret

#### Local Development (Firebase Emulator)
```bash
# Add to functions/.env file
ENCRYPTION_SECRET=your-strong-secret-key-here
```

#### Production (Firebase Functions)
```bash
# Set using Firebase CLI
firebase functions:config:set encryption.secret="your-strong-secret-key-here"

# Deploy functions to apply the configuration
firebase deploy --only functions
```

#### Generating a Strong Secret
```bash
# Generate a random 32-byte secret (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Mapping Expiry

### Automatic Deletion After 30 Days

All pseudonymization mappings are automatically deleted 30 days after creation:

```typescript
const expiresAt = admin.firestore.Timestamp.fromMillis(
  now.toMillis() + 30 * 24 * 60 * 60 * 1000 // 30 days
);
```

### Scheduled Cleanup Function

A Cloud Function runs daily at midnight (UTC) to delete expired mappings:

```typescript
export const cleanupExpiredMappings = functions.pubsub
  .schedule('0 0 * * *') // Daily at midnight
  .timeZone('UTC')
  .onRun(async (context) => {
    // Delete mappings where expiresAt <= now
  });
```

## Usage Tracking

### Audit Fields

Each mapping includes audit tracking fields:

```typescript
interface PseudonymMapping {
  usageCount: number;              // Incremented on each access
  lastAccessedAt: Timestamp;       // Updated on each access
  createdBy: string;               // User ID who created the mapping
  createdAt: Timestamp;            // Creation timestamp
}
```

### Audit Logging

All mapping operations are logged to the `auditLogs` collection:

- **mapping_create**: When a new mapping is created
- **mapping_access**: When a mapping is accessed for depseudonymization
- **mapping_cleanup**: When expired mappings are deleted
- **mapping_decryption_error**: When decryption fails (security alert)

Example audit log entry:
```typescript
{
  userId: "user123",
  action: "mapping_access",
  resourceType: "mapping",
  resourceId: "batch_1234567890_abc123",
  details: {
    mappingType: "names",
    pseudonymValue: "Person_A",
    mappingId: "mapping_xyz789"
  },
  timestamp: Timestamp
}
```

## Access Control

### Firestore Security Rules

The `mappings` collection is completely inaccessible from client applications:

```javascript
match /mappings/{mappingId} {
  allow read, write: if false; // Server-side only
}
```

Only Cloud Functions can read or write to this collection.

### Authentication Requirements

All pseudonymization Cloud Functions require authentication:

```typescript
if (!context.auth) {
  throw new functions.https.HttpsError(
    'unauthenticated',
    'User must be authenticated'
  );
}
```

## Data Flow

### Pseudonymization Flow

1. User calls `pseudonymizeFindings` Cloud Function
2. Function extracts sensitive data (names, IDs, amounts)
3. For each sensitive value:
   - Encrypt using AES-256-GCM
   - Generate pseudonym (Person_A, ID_001, etc.)
   - Store mapping with expiry date and audit fields
   - Log creation to audit logs
4. Replace sensitive values with pseudonyms
5. Return pseudonymized data to client

### Depseudonymization Flow

1. User calls `depseudonymizeResults` Cloud Function
2. Function retrieves mappings for the batch ID
3. For each mapping:
   - Decrypt original value using AES-256-GCM
   - Update usage count and last accessed timestamp
   - Log access to audit logs
4. Replace pseudonyms with original values
5. Return depseudonymized data to client

## Security Best Practices

### ✅ Implemented

- [x] AES-256-GCM encryption for all original values
- [x] Automatic 30-day expiry for all mappings
- [x] Usage tracking (count and last accessed timestamp)
- [x] Comprehensive audit logging
- [x] Firestore security rules prevent client access
- [x] Authentication required for all operations
- [x] Scheduled cleanup of expired mappings
- [x] Error logging for decryption failures

### 🔒 Production Checklist

Before deploying to production:

1. **Set Strong Encryption Secret**
   ```bash
   firebase functions:config:set encryption.secret="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
   ```

2. **Verify Security Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Test Scheduled Cleanup**
   ```bash
   # Manually trigger the cleanup function
   firebase functions:shell
   > cleanupExpiredMappings()
   ```

4. **Monitor Audit Logs**
   - Set up alerts for `mapping_decryption_error` events
   - Review audit logs regularly for suspicious activity

5. **Backup Encryption Secret**
   - Store the encryption secret in a secure password manager
   - Document the recovery process

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Mapping Creation Rate**: Track `mapping_create` events
2. **Decryption Errors**: Alert on `mapping_decryption_error` events
3. **Cleanup Success**: Monitor daily cleanup function execution
4. **Usage Patterns**: Analyze `usageCount` and `lastAccessedAt` fields

### Setting Up Alerts

```bash
# Example: Alert on decryption errors
# Set up in Firebase Console > Functions > Logs
# Filter: textPayload:"mapping_decryption_error"
```

## Troubleshooting

### Decryption Errors

If you see decryption errors in logs:

1. **Check Encryption Secret**: Ensure it hasn't changed
2. **Verify Format**: Encrypted data should be `iv:authTag:ciphertext`
3. **Check Logs**: Look for `mapping_decryption_error` audit logs
4. **Rotate Secret**: If compromised, rotate the secret and re-encrypt

### Expired Mappings Not Cleaning Up

1. **Check Scheduled Function**: Verify it's enabled in Firebase Console
2. **Check Logs**: Look for cleanup function execution logs
3. **Manual Cleanup**: Run the function manually if needed

### Performance Issues

If mapping operations are slow:

1. **Check Batch Size**: Limit findings to reasonable batch sizes
2. **Index Firestore**: Ensure `batchId` and `mappingType` are indexed
3. **Monitor Usage**: Check if cleanup is running efficiently

## References

- [AES-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Firebase Functions Configuration](https://firebase.google.com/docs/functions/config-env)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [PBKDF2 Key Derivation](https://en.wikipedia.org/wiki/PBKDF2)
