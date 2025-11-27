# AuditLogViewer Component

## Overview

The `AuditLogViewer` component provides a comprehensive interface for administrators to view, filter, and export audit logs. It displays system audit logs in a filterable table format with support for date range filtering and CSV export functionality.

## Requirements

- **Requirement 10.5**: Allow administrators to export audit logs in CSV format for compliance reporting

## Features

### 1. Audit Log Display
- Displays audit logs in a paginated table format
- Shows key information: timestamp, user ID, action, resource type, resource ID, IP address, and details
- Supports up to 500 logs per query
- Real-time loading states with spinner

### 2. Filtering Capabilities

#### Action Filters
- Filter by specific actions: login, logout, create, update, delete, export, ai_query, import, report_generate, report_download
- Multi-select support (can select multiple actions)
- Visual indication of selected filters (blue background)

#### Resource Type Filters
- Filter by resource types: finding, report, chat, user, pattern, session
- Multi-select support
- Visual indication of selected filters (green background)

#### Date Range Filter
- Select start and end dates
- Apply button to execute date range filter
- Filters logs within the specified date range

### 3. Export Functionality
- Export all displayed logs to CSV format
- Automatic download with timestamp in filename
- Logs the export action for audit purposes
- Disabled when no logs are available

### 4. User Interface
- Clean, modern design with Tailwind CSS
- Responsive layout
- Loading states with spinner
- Error handling with user-friendly messages
- Empty state when no logs match filters
- Collapsible details section for each log entry

## Usage

### Basic Usage

```tsx
import { AuditLogViewer } from '../components/AuditLogViewer';

function AuditLogsPage() {
  return (
    <div>
      <AuditLogViewer />
    </div>
  );
}
```

### Integration with Routing

The component is integrated into the application routing at `/audit-logs`:

```tsx
<Route 
  path="/audit-logs" 
  element={
    <AuthGuard>
      <AuditLogsPage />
    </AuthGuard>
  } 
/>
```

## Component Structure

### State Management
- `logs`: Array of audit log entries
- `loading`: Loading state indicator
- `error`: Error message state
- `filters`: Current filter configuration
- `dateRange`: Date range filter values

### Key Functions

#### `loadLogs()`
Fetches audit logs from the service with current filters applied.

#### `handleActionFilterChange(action)`
Toggles action filter selection.

#### `handleResourceTypeFilterChange(resourceType)`
Toggles resource type filter selection.

#### `handleDateRangeApply()`
Applies the selected date range filter.

#### `handleClearFilters()`
Clears all active filters and resets to default view.

#### `handleExport()`
Exports current logs to CSV and logs the export action.

#### `formatTimestamp(timestamp)`
Formats Firestore timestamps to readable date strings.

#### `formatDetails(details)`
Formats the details object as JSON for display.

## Service Integration

The component uses the `AuditService` for:
- `getAuditLogs(filters, maxResults)`: Retrieve filtered audit logs
- `downloadCSV(logs)`: Export logs to CSV file
- `logExport(resourceType, format, recordCount)`: Log the export action

## Data Flow

1. Component mounts → Load initial logs
2. User applies filters → Update filter state → Reload logs
3. User clicks export → Generate CSV → Download file → Log export action
4. User clicks refresh → Reload logs with current filters

## Styling

The component uses Tailwind CSS classes for styling:
- Table: Responsive table with hover effects
- Filters: Pill-style buttons with color coding
- Actions: Primary buttons with hover states
- Loading: Centered spinner with animation
- Error: Red-themed error messages

## Testing

Unit tests are provided in `src/components/__tests__/AuditLogViewer.test.tsx`:
- Component rendering
- Log loading and display
- Filter functionality (action, resource type, date range)
- Export functionality
- Error handling
- Loading states
- Empty states

## Accessibility

- Semantic HTML structure
- Proper button labels
- Keyboard navigation support
- Screen reader friendly table structure
- Clear visual feedback for interactions

## Performance Considerations

- Limits queries to 500 logs maximum
- Debounced filter updates
- Efficient re-rendering with React hooks
- Lazy loading of log details (collapsible sections)

## Future Enhancements

Potential improvements for future iterations:
- Pagination for large result sets
- Advanced search functionality
- Real-time log updates
- Custom column visibility
- Saved filter presets
- Export to other formats (Excel, JSON)
- User-specific filtering
- Bulk operations on logs

## Related Components

- `AuditLogsPage`: Page wrapper for the viewer
- `AuthGuard`: Ensures only authenticated users can access
- `AuditService`: Backend service for log operations

## Security Considerations

- Only authenticated users can access audit logs
- Firestore security rules restrict log access
- Sensitive data is truncated in display (user IDs, resource IDs)
- Export actions are logged for accountability
- IP addresses are captured for security tracking
