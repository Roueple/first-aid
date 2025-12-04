# Test Suite

This folder contains all test files for the FIRST-AID application, organized by test type.

## Structure

```
tests/
├── integration/          # Integration tests (database, services, end-to-end)
│   ├── audit-results-access.test.mjs
│   ├── data-consistency.test.ts
│   ├── hybrid-rag.test.mjs
│   ├── query-all-findings.test.mjs
│   ├── query-router.test.ts
│   ├── query-router-prod.test.mjs
│   └── smart-query-router-unified.test.mjs
└── unit/                 # Unit tests (individual functions, utilities)
    ├── department-extraction.test.mjs
    └── id-generation.test.mjs
```

## Integration Tests

### Query Router Tests
- **query-router.test.ts** - Main TypeScript test with 3 scenarios (simple/complex/hybrid)
- **query-router-prod.test.mjs** - Production database test with authentication
- **smart-query-router-unified.test.mjs** - Mock test demonstrating unified data masking flow

### Data Quality Tests
- **audit-results-access.test.mjs** - Verifies audit-results collection access
- **data-consistency.test.ts** - Tests data consistency across Firebase, tables, and dashboard
- **query-all-findings.test.mjs** - Queries all findings and exports raw data for debugging

### RAG System Tests
- **hybrid-rag.test.mjs** - Tests semantic search, context building, and hybrid RAG system

## Unit Tests

### Feature Tests
- **department-extraction.test.mjs** - Tests department name extraction from natural language
- **id-generation.test.mjs** - Tests 8-character patterned ID generation (YYSHNNNN format)

## Running Tests

### Prerequisites
1. Create `.test-credentials.json` in root:
```json
{
  "email": "your-test-user@example.com",
  "password": "your-password"
}
```

2. Ensure `.env` file has Firebase configuration

### Run Individual Tests

```bash
# TypeScript tests (requires ts-node or build)
npm run test:query-router

# JavaScript tests
node tests/integration/query-router-prod.test.mjs
node tests/integration/hybrid-rag.test.mjs
node tests/unit/id-generation.test.mjs
```

### Run All Tests
```bash
npm test
```

## Test Results

Test results are saved to `test-results/` folder in the root directory.

## Adding New Tests

1. **Integration tests**: Add to `tests/integration/`
   - Tests that involve multiple services
   - Database interactions
   - End-to-end workflows

2. **Unit tests**: Add to `tests/unit/`
   - Tests for individual functions
   - Utility functions
   - Pure logic without external dependencies

## Test Naming Convention

- Use `.test.ts` or `.test.mjs` extension
- Descriptive names: `feature-name.test.ext`
- Examples:
  - `query-router.test.ts`
  - `department-extraction.test.mjs`
  - `data-consistency.test.ts`

## Common Test Patterns

### Firebase Authentication
```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
const credentials = JSON.parse(fs.readFileSync('.test-credentials.json', 'utf8'));
await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
```

### Database Queries
```javascript
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const db = getFirestore(app);
const snapshot = await getDocs(collection(db, 'findings'));
```

### AI Testing
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
```

## Troubleshooting

### Authentication Errors
- Verify `.test-credentials.json` exists and has valid credentials
- Check Firebase Authentication is enabled for email/password

### Database Access Errors
- Verify Firestore rules allow authenticated access
- Check service account key is valid

### Module Import Errors
- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 18+)

## Documentation

For more details on specific features being tested:
- Query Router: `docs/smart-query-router-v2-integration.md`
- Hybrid RAG: `docs/hybrid-rag-implementation.md`
- Smart Filters: `docs/smart-filter-extraction.md`
