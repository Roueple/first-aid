# Error Handler Visual Guide

## Notification System Appearance

The NotificationSystem displays toast notifications in the top-right corner of the application. Each notification type has a distinct color scheme and icon.

### Success Notification (Green)
```
┌─────────────────────────────────────────┐
│ ✓  Changes saved successfully!       ✕ │
└─────────────────────────────────────────┘
```
- **Background**: Light green (#F0FDF4)
- **Border**: Green (#BBF7D0)
- **Text**: Dark green (#166534)
- **Icon**: Checkmark (✓)
- **Use**: Successful operations, confirmations

### Info Notification (Blue)
```
┌─────────────────────────────────────────┐
│ ℹ  Processing your request...        ✕ │
└─────────────────────────────────────────┘
```
- **Background**: Light blue (#EFF6FF)
- **Border**: Blue (#BFDBFE)
- **Text**: Dark blue (#1E40AF)
- **Icon**: Information (ℹ)
- **Use**: Informational messages, status updates

### Warning Notification (Yellow)
```
┌─────────────────────────────────────────┐
│ ⚠  This action cannot be undone       ✕ │
└─────────────────────────────────────────┘
```
- **Background**: Light yellow (#FEFCE8)
- **Border**: Yellow (#FEF08A)
- **Text**: Dark yellow (#854D0E)
- **Icon**: Warning triangle (⚠)
- **Use**: Warnings, cautions, important notices

### Error Notification (Red)
```
┌─────────────────────────────────────────┐
│ ✕  Failed to save changes             ✕ │
└─────────────────────────────────────────┘
```
- **Background**: Light red (#FEF2F2)
- **Border**: Red (#FECACA)
- **Text**: Dark red (#991B1B)
- **Icon**: X mark (✕)
- **Use**: Errors, failures, critical issues

## Notification Behavior

### Auto-Dismiss
- Default duration: 5 seconds
- Can be customized per notification
- Smooth fade-out animation

### Manual Dismiss
- Click the X button on the right
- Immediately removes the notification

### Multiple Notifications
- Stack vertically with 8px gap
- Maximum width: 28rem (448px)
- Newest notifications appear at the bottom

### Animation
- Slide in from right with fade
- Duration: 300ms
- Easing: ease-out

## Error Message Examples

### Authentication Errors
```
┌─────────────────────────────────────────┐
│ ✕  Invalid email or password          ✕ │
└─────────────────────────────────────────┘
```

### Network Errors
```
┌─────────────────────────────────────────────────────────┐
│ ⚠  Network connection issue. Please check your       ✕ │
│    internet connection and try again.                   │
└─────────────────────────────────────────────────────────┘
```

### AI Service Errors
```
┌─────────────────────────────────────────────────────────┐
│ ⚠  AI service is temporarily unavailable. Basic      ✕ │
│    search functionality is still available.             │
└─────────────────────────────────────────────────────────┘
```

### Validation Errors
```
┌─────────────────────────────────────────┐
│ ℹ  Please fill in all required fields ✕ │
└─────────────────────────────────────────┘
```

### Import Errors
```
┌─────────────────────────────────────────────────────────┐
│ ✕  Invalid file format. Please upload a valid        ✕ │
│    Excel file (.xlsx or .xls).                          │
└─────────────────────────────────────────────────────────┘
```

### Success Messages
```
┌─────────────────────────────────────────┐
│ ✓  Successfully imported 150 findings ✕ │
└─────────────────────────────────────────┘
```

## Position and Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                    ┌──────────────────┐ │
│                                    │ Notification 1  ✕│ │
│                                    └──────────────────┘ │
│                                    ┌──────────────────┐ │
│                                    │ Notification 2  ✕│ │
│                                    └──────────────────┘ │
│                                    ┌──────────────────┐ │
│                                    │ Notification 3  ✕│ │
│                                    └──────────────────┘ │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Position**: Fixed, top-right corner
- **Top offset**: 1rem (16px)
- **Right offset**: 1rem (16px)
- **Z-index**: 50 (above most content)
- **Gap between notifications**: 0.5rem (8px)

## Accessibility

### ARIA Labels
- Each notification has `role="alert"`
- Close button has `aria-label="Close notification"`

### Keyboard Navigation
- Close button is focusable
- Can be dismissed with Enter or Space key

### Screen Reader Support
- Notifications are announced when they appear
- Type and message are read aloud

## Responsive Behavior

### Desktop (>768px)
- Full width up to 28rem (448px)
- Positioned in top-right corner

### Mobile (<768px)
- Full width with 1rem margin on sides
- Still positioned at top
- Text wraps appropriately

## Integration with Error Handler

The NotificationSystem automatically displays messages from the ErrorHandler:

1. **Error occurs** → ErrorHandler categorizes it
2. **User message generated** → Based on error category
3. **Notification displayed** → Appropriate color and icon
4. **Auto-dismiss** → After 5 seconds (or custom duration)

## Customization

### Duration
```typescript
showSuccess('Message', 3000); // 3 seconds
showError('Message', 10000);  // 10 seconds
```

### Direct Usage
```typescript
const { showSuccess, showInfo, showWarning, showError } = useErrorHandler();

// Show notifications directly
showSuccess('Operation completed!');
showInfo('Processing...');
showWarning('Be careful!');
showError('Something went wrong');
```

## Best Practices

1. **Keep messages concise**: Aim for 1-2 lines
2. **Be specific**: Tell users what happened and what to do
3. **Use appropriate severity**: Match the notification type to the situation
4. **Provide context**: Include relevant details when helpful
5. **Avoid technical jargon**: Use plain language
6. **Test on mobile**: Ensure messages are readable on small screens

## Examples in Context

### Login Page
```typescript
try {
  await authService.signIn(email, password);
  showSuccess('Welcome back!');
  navigate('/dashboard');
} catch (error) {
  // Shows: "Invalid email or password"
  await handleError(error, { operation: 'login' });
}
```

### Findings Page
```typescript
try {
  await findingsService.updateFinding(id, data);
  showSuccess('Finding updated successfully');
} catch (error) {
  // Shows appropriate error based on failure type
  await handleError(error, { operation: 'updateFinding', resourceId: id });
}
```

### Import Page
```typescript
try {
  const result = await importService.importFindings(file);
  showSuccess(`Successfully imported ${result.successCount} findings`);
} catch (error) {
  // Shows: "Invalid file format. Please upload a valid Excel file..."
  await handleError(error, { operation: 'importFindings' });
}
```

## Testing the Notification System

### Manual Testing
1. Trigger various errors (network, validation, etc.)
2. Verify correct color and icon appear
3. Check message is user-friendly
4. Confirm auto-dismiss works
5. Test manual dismiss button
6. Verify multiple notifications stack correctly

### Visual Regression Testing
- Take screenshots of each notification type
- Compare against baseline
- Verify colors, spacing, and layout

## Troubleshooting

### Notifications Not Appearing
- Check that NotificationSystem is rendered in App.tsx
- Verify useErrorHandler is called in App component
- Check browser console for errors

### Wrong Colors/Styling
- Verify Tailwind CSS is properly configured
- Check that index.css includes animation styles
- Ensure no CSS conflicts

### Messages Not User-Friendly
- Review ErrorHandler categorization logic
- Update user message mappings
- Test with real error scenarios
