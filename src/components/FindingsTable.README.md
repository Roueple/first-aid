# FindingsTable Component

## Overview

The `FindingsTable` component is a comprehensive, feature-rich table for displaying audit findings. Built with TanStack Table (React Table v8), it provides sorting, row selection, and a clean, accessible interface for managing findings data.

## Features

- **Sortable Columns**: Click column headers to sort data in ascending or descending order
- **Row Selection**: Select individual rows or all rows with checkboxes
- **Responsive Design**: Horizontal scrolling for smaller screens
- **Visual Indicators**: Color-coded badges for severity and status
- **Empty States**: Helpful messages when loading or no data available
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## Requirements

Implements requirements:
- **3.1**: Display findings in a paginated table with sortable columns
- **3.5**: Allow Users to sort findings by date, severity, status, or location

## Usage

### Basic Usage

```tsx
import { FindingsTable } from '../components/FindingsTable';
import { Finding } from '../types/finding.types';

function MyComponent() {
  const [findings, setFindings] = useState<Finding[]>([]);

  return <FindingsTable findings={findings} />;
}
```

### With Row Selection

```tsx
import { FindingsTable } from '../components/FindingsTable';

function MyComponent() {
  const [findings, setFindings] = useState<Finding[]>([]);
  
  const handleRowSelection = (selectedRows: Finding[]) => {
    console.log('Selected findings:', selectedRows);
    // Perform actions with selected rows
  };

  return (
    <FindingsTable 
      findings={findings} 
      onRowSelectionChange={handleRowSelection}
    />
  );
}
```

### With Loading State

```tsx
import { FindingsTable } from '../components/FindingsTable';

function MyComponent() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFindings().then(data => {
      setFindings(data);
      setIsLoading(false);
    });
  }, []);

  return <FindingsTable findings={findings} isLoading={isLoading} />;
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `findings` | `Finding[]` | Yes | - | Array of finding objects to display |
| `onRowSelectionChange` | `(selectedRows: Finding[]) => void` | No | - | Callback fired when row selection changes |
| `isLoading` | `boolean` | No | `false` | Shows loading state when true |

## Columns

The table displays the following columns:

1. **Select** - Checkbox for row selection (not sortable)
2. **Title** - Finding title (sortable, truncated with tooltip)
3. **Severity** - Color-coded badge (sortable)
   - Critical: Red
   - High: Orange
   - Medium: Yellow
   - Low: Green
4. **Status** - Color-coded badge (sortable)
   - Open: Blue
   - In Progress: Purple
   - Closed: Gray
   - Deferred: Yellow
5. **Location** - Finding location (sortable)
6. **Category** - Finding category (sortable, truncated with tooltip)
7. **Responsible Person** - Person responsible (sortable)
8. **Date Identified** - Date finding was identified (sortable, formatted)
9. **Date Due** - Due date (sortable, formatted)
10. **Risk Level** - Risk score out of 10 (sortable)

## Sorting

- Click any column header (except Select) to sort
- First click: Ascending order
- Second click: Descending order
- Third click: Remove sorting
- Visual indicators show current sort direction (↑ ↓ ↕)

## Row Selection

- Click individual checkboxes to select specific rows
- Click header checkbox to select/deselect all rows
- Selected rows are highlighted with blue background
- Selection count displayed at bottom of table
- `onRowSelectionChange` callback provides array of selected Finding objects

## States

### Loading State
Shows "Loading findings..." message when `isLoading` is true.

### Empty State
Shows "No findings found" message with helpful text when findings array is empty.

### Normal State
Displays full table with all features enabled.

## Styling

The component uses Tailwind CSS for styling with:
- Gray color scheme for neutral elements
- Blue for interactive elements and selection
- Color-coded badges for severity and status
- Hover effects for better UX
- Responsive design with horizontal scrolling

## Accessibility

- Proper ARIA labels on checkboxes
- Semantic HTML table structure
- Keyboard navigation support
- Screen reader friendly
- Color contrast meets WCAG standards

## Performance Considerations

- Uses React.useMemo for column definitions to prevent unnecessary re-renders
- TanStack Table provides efficient rendering for large datasets
- Truncation prevents layout issues with long text
- Consider implementing virtualization for 1000+ rows

## Testing

Comprehensive test suite covers:
- Rendering with data
- Column headers display
- Row selection (individual and all)
- Sorting functionality
- Badge styling
- Date formatting
- Loading and empty states
- Accessibility features

Run tests:
```bash
npm test FindingsTable.test.tsx
```

## Future Enhancements

Potential improvements for future iterations:
- Column visibility toggle
- Column resizing
- Column reordering
- Export to CSV/Excel
- Inline editing
- Expandable rows for details
- Virtual scrolling for large datasets
- Custom column configurations
- Saved view preferences

## Dependencies

- `@tanstack/react-table`: ^8.x - Table functionality
- `react`: ^18.x - UI framework
- `firebase/firestore`: For Timestamp handling
- `tailwindcss`: For styling

## Related Components

- `FilterPanel` - For filtering findings (Task 6.3)
- `SearchBar` - For searching findings (Task 6.4)
- `FindingDetailsPanel` - For viewing full finding details (Task 6.5)
- `PaginationControls` - For pagination (Task 6.2)

## Notes

- This component handles display and selection only
- Pagination should be handled by parent component
- Filtering and searching should be done before passing data to this component
- The component is controlled - parent manages the findings data
