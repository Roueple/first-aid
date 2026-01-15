# FindingDetailsPanel Component

## Overview

The `FindingDetailsPanel` component displays comprehensive information about a selected audit finding in a slide-out side panel. It provides a detailed view with tabbed navigation for different aspects of the finding.

## Features

### Tabs

1. **Details Tab**
   - Complete finding information including title, description, severity, status
   - Key information grid (category, location, department, responsible person, etc.)
   - Date information (identified, due, completed, created, updated)
   - Recommendation, management response, and action plan
   - Evidence list and tags
   - Source information (original source, import batch)

2. **History Tab**
   - Audit trail of all changes made to the finding
   - Displays action type, timestamp, user, and change details
   - Shows field-level changes in a structured format
   - Empty state when no history is available

3. **Related Findings Tab**
   - Shows findings that are similar or related
   - Uses AI similarity analysis (to be implemented)
   - Clickable cards to navigate to related findings
   - Empty state with explanation when no related findings exist

### Actions

- **Edit Button**: Opens the edit dialog for the finding (Task 6.6)
- **Delete Button**: Shows confirmation modal before deleting
- **Close Button**: Closes the details panel

### UI Features

- Slide-in animation from the right side
- Responsive width (full width on mobile, 2/3 on tablet, 1/2 on desktop)
- Color-coded severity and status badges
- Formatted dates and timestamps
- Scrollable content area
- Delete confirmation modal

## Props

```typescript
interface FindingDetailsPanelProps {
  finding: Finding | null;           // The finding to display (null hides panel)
  onClose: () => void;                // Callback when panel is closed
  onEdit?: (finding: Finding) => void;   // Optional callback for edit action
  onDelete?: (finding: Finding) => void; // Optional callback for delete action
}
```

## Usage Example

```tsx
import { FindingDetailsPanel } from '../../components/FindingDetailsPanel';

function FindingsPage() {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const handleEdit = (finding: Finding) => {
    // Open edit dialog
    console.log('Edit:', finding);
  };

  const handleDelete = (finding: Finding) => {
    // Delete finding
    console.log('Delete:', finding);
  };

  return (
    <>
      {/* Your findings table */}
      
      {selectedFinding && (
        <FindingDetailsPanel
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
```

## Requirements Satisfied

- **Requirement 3.1**: Display findings with all details
- **Requirement 10.2**: Show audit trail of changes

## Implementation Notes

### Current Implementation

- Uses mock data for audit history (will be replaced with Firestore queries)
- Related findings tab shows empty state (will use AI similarity search)
- Delete action removes from local state (will call FindingsService in production)

### Future Enhancements

1. **Audit History** (Task 14.1-14.3)
   - Fetch real audit logs from Firestore
   - Filter and paginate history
   - Export audit logs

2. **Related Findings** (Task 9.3)
   - Implement vector similarity search
   - Use embeddings to find related findings
   - Show similarity scores

3. **Edit Integration** (Task 6.6)
   - Connect to FindingEditDialog component
   - Handle form submission and validation
   - Update finding in Firestore

4. **Attachments**
   - Display file attachments
   - Download and preview files
   - Upload new attachments

## Styling

The component uses Tailwind CSS with:
- Gray color scheme for neutral elements
- Blue for primary actions and selected states
- Red for delete actions
- Color-coded badges for severity and status
- Smooth transitions and hover effects

## Accessibility

- Keyboard navigation support
- ARIA labels for buttons
- Focus management
- Screen reader friendly
