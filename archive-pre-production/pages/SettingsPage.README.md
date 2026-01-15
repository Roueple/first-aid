# SettingsPage Component

## Overview

The SettingsPage component provides a comprehensive user settings interface with three main sections: Profile, Preferences, and Security. It allows users to manage their account information, customize their experience, and change their password.

## Features

### 1. Profile Section
- **Email Display**: Shows the user's email address (read-only)
- **Name Management**: Allows users to update their display name
- **Department**: Users can specify their department

### 2. Preferences Section
- **Language Selection**: Choose between English and Indonesian
- **Theme Selection**: Toggle between light and dark themes
- **Notifications**: Enable or disable notifications with a toggle switch

### 3. Security Section
- **Password Change**: Secure password update functionality
  - Requires current password for verification
  - Validates new password (minimum 6 characters)
  - Confirms password match
  - Uses Firebase reauthentication for security

## Usage

```tsx
import SettingsPage from './pages/SettingsPage';

// In your router
<Route path="/settings" element={
  <AuthGuard>
    <SettingsPage />
  </AuthGuard>
} />
```

## Component Structure

```
SettingsPage
├── Header (with back button)
├── Tab Navigation
│   ├── Profile Tab
│   ├── Preferences Tab
│   └── Security Tab
└── Tab Content
    ├── Profile Form
    ├── Preferences Form
    └── Password Change Form
```

## State Management

### Profile State
```typescript
interface UserProfile {
  email: string;
  name: string;
  department: string;
}
```

### Preferences State
```typescript
interface UserPreferences {
  language: 'en' | 'id';
  theme: 'light' | 'dark';
  notifications: boolean;
}
```

### Password Form State
```typescript
interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

## Data Persistence

- **Profile**: Currently shows success message (Firestore integration pending)
- **Preferences**: Saved to localStorage and applied immediately
- **Password**: Updated via Firebase Authentication

## Security Features

1. **Reauthentication**: Users must provide their current password before changing it
2. **Password Validation**: 
   - Minimum 6 characters
   - Passwords must match
3. **Error Handling**: User-friendly error messages for common scenarios:
   - Wrong current password
   - Weak password
   - Requires recent login

## Theme Application

When the theme preference is changed and saved:
```typescript
if (preferences.theme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
```

## Error Messages

The component displays contextual error messages:

### Profile Errors
- Generic: "Failed to update profile"

### Preferences Errors
- Generic: "Failed to save preferences"

### Password Errors
- "New passwords do not match"
- "Password must be at least 6 characters"
- "Current password is incorrect"
- "Password is too weak"
- "Please log out and log in again before changing password"

## Success Messages

- Profile: "Profile updated successfully!"
- Preferences: "Preferences saved successfully!"
- Password: "Password changed successfully!"

## Navigation

- **Back Button**: Returns to the home page (`/home`)
- **Tab Navigation**: Switch between Profile, Preferences, and Security sections

## Styling

The component uses Tailwind CSS with the following design patterns:
- Clean, modern interface
- Responsive layout
- Clear visual feedback for active tabs
- Consistent form styling
- Color-coded messages (green for success, red for errors)

## Dependencies

- `react-router-dom`: Navigation
- `firebase/auth`: Password management
- `authService`: User authentication state
- `localStorage`: Preferences persistence

## Future Enhancements

1. **Firestore Integration**: Save profile changes to Firestore user document
2. **Email Verification**: Allow users to update and verify email addresses
3. **Profile Picture**: Add avatar upload functionality
4. **Two-Factor Authentication**: Add 2FA setup
5. **Session Management**: View and manage active sessions
6. **Notification Preferences**: Granular notification settings
7. **Export Data**: Allow users to export their data
8. **Account Deletion**: Provide account deletion option

## Testing

The component includes comprehensive tests covering:
- Tab navigation
- Form input handling
- Validation logic
- Success/error message display
- localStorage persistence
- Password change flow

Run tests with:
```bash
npm test SettingsPage
```

## Accessibility

- Proper label associations for all form inputs
- Keyboard navigation support
- Clear focus indicators
- Descriptive button text
- Error messages associated with form fields

## Related Components

- `AuthGuard`: Protects the settings route
- `HomePage`: Contains navigation to settings
- `AuthService`: Provides user authentication state

## Requirements Validation

This component satisfies **Requirement 1.1** from the requirements document:
- User authentication and session management
- Secure password change functionality
- User profile management
