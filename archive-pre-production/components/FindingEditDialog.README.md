# FindingEditDialog Component

## Overview

The `FindingEditDialog` component is a modal dialog for editing audit finding properties with comprehensive form validation and error handling. It provides a user-friendly interface for modifying all finding fields with real-time validation feedback.

## Requirements

- **Requirement 3.4**: WHEN a User edits a finding, THE System SHALL validate required fields and save changes to Firestore with updated timestamp
- **Requirement 12.3**: THE System SHALL display user-friendly error messages without exposing technical details or stack traces

## Features

### Form Fields

The dialog includes form fields for all finding properties:

**Required Fields:**
- Title (max 500 characters)
- Description
- Severity (Critical, High, Medium, Low)
- Status (Open, In Progress, Closed, Deferred)
- Category
- Location
- Responsible Person
- Date Identified
- Recommendation

**Optional Fields:**
- Subcategory
- Branch
- Department
- Reviewer Person
- Due Date
- Date Completed
- Management Response
- Action Plan
- Evidence (one per line)
- Tags (comma-separated)
- Risk Level (1-10 slider)

### Validation

The component implements comprehensive validation:

1. **Required Field Validation**: Ensures all required fields are filled
2. **Length Validation**: Title must be 500 characters or less
3. **Date Logic Validation**: 
   - Due date cannot be before date identified
   - Completion date cannot be before date identified
4. **Risk Level Validation**: Must be between 1 and 10
5. **Real-time Error Clearing**: Errors are cleared when user starts typing

### User Experience Features

1. **Unsaved Changes Warning**: Shows confirmation dialog when closing with unsaved changes
2. **Loading State**: Displays "Saving..." indicator during save operation
3. **Error Messages**: Shows user-friendly error messages for validation and save failures
4. **Form State Management**: Tracks changes to enable/disable warnings
5. **Responsive Design**: Works on all screen sizes with scrollable content

## Usage

```tsx
import { FindingEditDialog } from '../components/FindingEditDialog';
import { Finding, UpdateFindingInput } from '../types/finding.types';

function MyComponent() {
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleSaveEdit = async (id: string, data: UpdateFindingInput) => {
    try {
      await findingsService.updateFinding(id, data);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating finding:', error);
      throw error; // Re-throw to let dialog handle error display
    }
  };

  return (
    <FindingEditDialog
      finding={editingFinding}
      isOpen={isEditDialogOpen}
      onClose={() => setIsEditDialogOpen(false)}
      onSave={handleSaveEdit}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `finding` | `Finding \| null` | Yes | The finding to edit |
| `isOpen` | `boolean` | Yes | Controls dialog visibility |
| `onClose` | `() => void` | Yes | Called when dialog should close |
| `onSave` | `(id: string, data: UpdateFindingInput) => Promise<void>` | Yes | Called when user saves changes |

## Data Transformation

The component handles several data transformations:

1. **Dates**: Converts between Firestore Timestamps and HTML date inputs (YYYY-MM-DD)
2. **Evidence**: Converts between array and newline-separated text
3. **Tags**: Converts between array and comma-separated text
4. **Optional Fields**: Converts empty strings to undefined for optional fields

## Validation Rules

### Required Fields
- Title: 1-500 characters
- Description: At least 1 character
- Category: At least 1 character
- Location: At least 1 character
- Responsible Person: At least 1 character
- Date Identified: Valid date
- Recommendation: At least 1 character

### Date Validation
- Due date must be on or after date identified
- Completion date must be on or after date identified

### Risk Level
- Must be between 1 and 10 (inclusive)

## Error Handling

The component handles errors at multiple levels:

1. **Validation Errors**: Displayed inline below each field
2. **Save Errors**: Displayed at the top of the form
3. **Network Errors**: Caught and displayed as user-friendly messages

## Accessibility

- All form fields have proper labels
- Required fields are marked with asterisks
- Error messages are associated with their fields
- Keyboard navigation is fully supported
- Focus management for modal dialogs

## Testing

The component includes comprehensive unit tests covering:

- Dialog rendering and visibility
- Form field population
- Required field validation
- Length validation
- Date logic validation
- Save functionality
- Unsaved changes confirmation
- Error handling
- Loading states
- Data transformation (evidence, tags)

Run tests with:
```bash
npm test src/components/__tests__/FindingEditDialog.test.tsx
```

## Integration

The `FindingEditDialog` is integrated into the `FindingsPage` component:

1. User clicks "Edit" button in `FindingDetailsPanel`
2. `FindingsPage` opens the edit dialog with the selected finding
3. User modifies fields and clicks "Save Changes"
4. Dialog validates input and calls `onSave` callback
5. `FindingsPage` updates the finding via `FindingsService`
6. Local state is updated to reflect changes
7. Dialog closes on successful save

## Future Enhancements

Potential improvements for future iterations:

1. **Auto-save**: Save changes automatically as user types
2. **Field History**: Show previous values for each field
3. **Bulk Edit**: Edit multiple findings at once
4. **Templates**: Save and apply field templates
5. **Attachments**: Upload and manage file attachments
6. **Rich Text**: Support formatted text in description fields
7. **Validation Profiles**: Different validation rules based on finding type
8. **Audit Trail**: Show who made what changes and when

## Related Components

- `FindingDetailsPanel`: Displays finding details and triggers edit dialog
- `FindingsTable`: Lists findings with edit actions
- `FindingsPage`: Main page that orchestrates finding management
- `FindingsService`: Service layer for finding CRUD operations
