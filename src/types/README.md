# FIRST-AID Type Definitions

This directory contains all TypeScript interfaces and Zod validation schemas for the FIRST-AID system.

## Overview

The type system is organized into separate files by domain:

- **finding.types.ts** - Audit finding data models
- **user.types.ts** - User and authentication models
- **chat.types.ts** - AI chat session and message models
- **pattern.types.ts** - Pattern detection models
- **report.types.ts** - Report generation models
- **filter.types.ts** - Filtering and pagination utilities
- **audit.types.ts** - Audit logging models

## Usage

Import types from the central index file:

```typescript
import { 
  Finding, 
  CreateFindingInput, 
  FindingFilters,
  Pagination,
  User,
  ChatSession,
  Pattern,
  Report
} from '@/types';
```

## Validation

All types include corresponding Zod schemas for runtime validation:

```typescript
import { CreateFindingSchema } from '@/types';

// Validate input data
const result = CreateFindingSchema.safeParse(inputData);

if (result.success) {
  // Data is valid
  const validatedData = result.data;
} else {
  // Handle validation errors
  console.error(result.error.errors);
}
```

## Type Categories

### Core Data Models

- **Finding** - Main audit finding record
- **User** - System user with preferences
- **ChatSession** - AI chat conversation
- **Pattern** - Detected recurring issue
- **Report** - Generated report metadata

### Input Types

Each core model has corresponding input types:

- **CreateXInput** - For creating new records
- **UpdateXInput** - For updating existing records (all fields optional)

### Filter and Pagination

- **FindingFilters** - Multi-field filtering options
- **Pagination** - Page, size, and sorting parameters
- **PaginatedResult<T>** - Generic paginated response wrapper

### Validation Schemas

Each interface has a corresponding Zod schema:

- **XSchema** - Full validation schema
- **CreateXSchema** - Validation for creation
- **UpdateXSchema** - Validation for updates

## Requirements Coverage

This implementation satisfies the following requirements:

- **3.1** - Finding data structure with all required fields
- **3.2** - Filter types for severity, status, location, category
- **3.3** - Search functionality types
- **3.4** - Finding edit and validation types
- **3.5** - Sorting and pagination types

## Best Practices

1. **Always validate user input** using Zod schemas before processing
2. **Use TypeScript interfaces** for type checking at compile time
3. **Import from index.ts** for cleaner imports
4. **Leverage type inference** where possible to reduce duplication
5. **Use Partial<T>** for optional update operations

## Examples

### Creating a Finding

```typescript
import { CreateFindingInput, CreateFindingSchema } from '@/types';

const input: CreateFindingInput = {
  title: 'Security vulnerability found',
  description: 'SQL injection risk in login form',
  severity: 'Critical',
  status: 'Open',
  category: 'Security',
  location: 'Main Office',
  responsiblePerson: 'John Doe',
  dateIdentified: new Date(),
  recommendation: 'Implement parameterized queries',
  riskLevel: 9,
  originalSource: 'Manual audit',
};

// Validate before saving
const result = CreateFindingSchema.safeParse(input);
if (result.success) {
  await findingsService.createFinding(result.data);
}
```

### Filtering Findings

```typescript
import { FindingFilters, Pagination } from '@/types';

const filters: FindingFilters = {
  severity: ['Critical', 'High'],
  status: ['Open'],
  location: ['Main Office', 'Branch A'],
  dateIdentified: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
};

const pagination: Pagination = {
  page: 1,
  pageSize: 20,
  sortBy: 'dateIdentified',
  sortDirection: 'desc',
};

const results = await findingsService.getFindings(filters, pagination);
```

### Chat Session

```typescript
import { AddMessageInput, ChatResponse } from '@/types';

const message: AddMessageInput = {
  sessionId: 'session-123',
  role: 'user',
  content: 'What are the most critical findings?',
};

const response: ChatResponse = await chatService.sendMessage(
  message.content,
  message.sessionId
);
```

## Type Safety

All types are designed to provide maximum type safety:

- Enums for fixed value sets (severity, status, etc.)
- Required vs optional fields clearly defined
- Timestamp types for date/time values
- Generic types for reusable patterns (PaginatedResult<T>)
- Strict validation rules in Zod schemas

## Future Enhancements

As the system evolves, new types may be added for:

- Import/export operations
- Notification preferences
- Advanced analytics
- Mobile-specific models
- API response wrappers
