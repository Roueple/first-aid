# FindingsService

## Overview

`FindingsService` extends `DatabaseService` to provide specialized queries and operations for managing audit findings. It implements filtering, pagination, search functionality, and specialized queries for overdue and high-risk findings.

## Features

- **CRUD Operations**: Create, read, update, and delete findings with validation
- **Advanced Filtering**: Filter by severity, status, location, category, department, responsible person, date ranges, risk level, and tags
- **Text Search**: Client-side search across title, description, and responsible person fields
- **Specialized Queries**: Get overdue findings and high-risk findings
- **Computed Fields**: Automatically calculate `isOverdue` and `daysOpen` fields
- **Pagination**: Support for paginated results with sorting
- **Validation**: Input validation using Zod schemas

## Usage

### Import

```typescript
import { findingsService } from './services';
// or
import findingsService from './services/FindingsService';
```

### Get Findings with Filters

```typescript
import { FindingFilters, Pagination } from './types/filter.types';

// Define filters
const filters: FindingFilters = {
  severity: ['Critical', 'High'],
  status: ['Open', 'In Progress'],
  location: ['Building A', 'Building B'],
  dateIdentified: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
  riskLevel: {
    min: 5,
    max: 10,
  },
};

// Define pagination
const pagination: Pagination = {
  page: 1,
  pageSize: 20,
  sortBy: 'dateIdentified',
  sortDirection: 'desc',
};

// Get findings
const result = await findingsService.getFindings(filters, pagination);

console.log(result.items); // Array of findings
console.log(result.total); // Total count
console.log(result.hasNextPage); // Boolean
```

### Search Findings

```typescript
// Search with text
const searchResults = await findingsService.searchFindings('security');

// Search with text and filters
const filteredSearchResults = await findingsService.searchFindings(
  'security',
  { severity: ['High', 'Critical'] },
  { page: 1, pageSize: 20 }
);
```

### Get Overdue Findings

```typescript
const overdueFindings = await findingsService.getOverdueFindings({
  page: 1,
  pageSize: 20,
});

console.log(overdueFindings.items); // Only overdue findings
```

### Get High-Risk Findings

```typescript
const highRiskFindings = await findingsService.getHighRiskFindings({
  page: 1,
  pageSize: 20,
});

console.log(highRiskFindings.items); // Only Critical and High severity findings
```

### Create a Finding

```typescript
import { CreateFindingInput } from './types/finding.types';

const newFinding: CreateFindingInput = {
  title: 'Security Vulnerability',
  description: 'SQL injection vulnerability found in login form',
  severity: 'Critical',
  status: 'Open',
  category: 'Security',
  location: 'Building A',
  responsiblePerson: 'John Doe',
  dateIdentified: new Date(),
  dateDue: new Date('2024-12-31'),
  recommendation: 'Implement parameterized queries',
  riskLevel: 9,
  originalSource: 'Security Audit 2024',
  tags: ['security', 'sql-injection'],
};

const findingId = await findingsService.createFinding(newFinding);
console.log('Created finding:', findingId);
```

### Update a Finding

```typescript
import { UpdateFindingInput } from './types/finding.types';

const updates: UpdateFindingInput = {
  status: 'In Progress',
  managementResponse: 'Working on fix',
  actionPlan: 'Implement parameterized queries by end of month',
};

await findingsService.updateFinding('finding-id', updates);
```

### Get Finding by ID

```typescript
const finding = await findingsService.getFindingById('finding-id');

if (finding) {
  console.log(finding.title);
  console.log(finding.isOverdue); // Computed field
  console.log(finding.daysOpen); // Computed field
}
```

### Delete a Finding

```typescript
await findingsService.deleteFinding('finding-id');
```

## Computed Fields

The service automatically calculates the following fields:

### `isOverdue`

- `true` if the finding has a `dateDue` in the past and status is not 'Closed'
- `false` otherwise

### `daysOpen`

- Number of days between `dateIdentified` and `dateCompleted` (if closed)
- Number of days between `dateIdentified` and current date (if open)

## Filtering Options

### Available Filters

| Filter | Type | Description |
|--------|------|-------------|
| `severity` | `FindingSeverity[]` | Filter by severity levels |
| `status` | `FindingStatus[]` | Filter by status values |
| `location` | `string[]` | Filter by locations |
| `category` | `string[]` | Filter by categories |
| `department` | `string[]` | Filter by departments |
| `responsiblePerson` | `string[]` | Filter by responsible persons |
| `dateIdentified` | `DateRangeFilter` | Filter by date identified range |
| `dateDue` | `DateRangeFilter` | Filter by due date range |
| `riskLevel` | `{ min?: number, max?: number }` | Filter by risk level (1-10) |
| `tags` | `string[]` | Filter by tags |
| `searchText` | `string` | Search in title, description, responsible person |
| `isOverdue` | `boolean` | Filter for overdue findings only |

## Pagination

Default pagination values:

```typescript
{
  page: 1,
  pageSize: 20,
  sortBy: 'dateCreated',
  sortDirection: 'desc'
}
```

### Sort Fields

- `dateIdentified`
- `dateDue`
- `dateCreated`
- `dateUpdated`
- `severity`
- `status`
- `location`
- `title`
- `riskLevel`

## Error Handling

The service inherits error handling from `DatabaseService`:

```typescript
try {
  const findings = await findingsService.getFindings();
} catch (error) {
  if (error instanceof DatabaseError) {
    switch (error.type) {
      case DatabaseErrorType.CONNECTION_ERROR:
        console.error('No connection to database');
        break;
      case DatabaseErrorType.PERMISSION_DENIED:
        console.error('Permission denied');
        break;
      case DatabaseErrorType.NETWORK_ERROR:
        console.error('Network error, retrying...');
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

## Requirements Mapping

This service implements the following requirements:

- **Requirement 3.1**: Display findings in paginated table with sorting
- **Requirement 3.2**: Filter findings by severity, status, location, category
- **Requirement 3.3**: Search findings with text input
- **Requirement 3.4**: Edit findings with validation
- **Requirement 3.5**: Sort findings by various fields

## Testing

Comprehensive tests are available in `src/services/__tests__/FindingsService.test.ts`:

```bash
npm test src/services/__tests__/FindingsService.test.ts
```

Test coverage includes:
- Filtering by all filter types
- Text search functionality
- Overdue findings query
- High-risk findings query
- CRUD operations with validation
- Computed fields calculation
- Pagination
- Error handling

## Performance Considerations

- **Client-side filtering**: `searchText` and `isOverdue` filters are applied client-side after fetching from Firestore
- **Firestore limitations**: Firestore has limitations on compound queries, so some complex filters may require client-side processing
- **Pagination**: For best performance, use server-side filters (severity, status, location, etc.) to reduce the dataset before client-side filtering

## Future Enhancements

- Implement full-text search using Firestore extensions or external search service
- Add caching for frequently accessed findings
- Implement batch operations for bulk updates
- Add support for custom sort functions
