# Settings Page User Guide

## Overview

The Settings page provides a centralized location for managing your account, preferences, and security settings in the FIRST-AID application.

## Accessing Settings

1. Log in to the application
2. From the Home page, click the **⚙️ Settings** button
3. The Settings page will open with three main sections

## Settings Sections

### 1. 👤 Profile

Manage your personal information and account details.

#### Fields:
- **Email Address**: Your registered email (cannot be changed)
- **Full Name**: Your display name in the application
- **Department**: Your organizational department

#### How to Update:
1. Click the **👤 Profile** tab (selected by default)
2. Enter or modify your name and department
3. Click **Save Profile**
4. You'll see a success message: "Profile updated successfully!"

### 2. ⚙️ Preferences

Customize your application experience.

#### Options:

**Language**
- English
- Indonesian (Bahasa Indonesia)

**Theme**
- Light: Traditional bright interface
- Dark: Easy on the eyes for low-light environments

**Notifications**
- Toggle switch to enable/disable notifications
- Green = Enabled, Gray = Disabled

#### How to Update:
1. Click the **⚙️ Preferences** tab
2. Select your preferred language from the dropdown
3. Choose your preferred theme
4. Toggle notifications on or off
5. Click **Save Preferences**
6. Theme changes apply immediately!

### 3. 🔒 Security

Change your password securely.

#### Password Requirements:
- Minimum 6 characters
- New password must match confirmation
- Current password required for verification

#### How to Change Password:
1. Click the **🔒 Security** tab
2. Enter your **Current Password**
3. Enter your **New Password**
4. Re-enter your new password in **Confirm New Password**
5. Click **Change Password**
6. If successful, all fields will clear and you'll see: "Password changed successfully!"

#### Common Errors:
- "New passwords do not match" - Make sure both new password fields are identical
- "Password must be at least 6 characters" - Choose a longer password
- "Current password is incorrect" - Verify your current password
- "Please log out and log in again before changing password" - Your session is too old, re-login required

## Navigation

### Back Button
- Click **← Back** in the top-left to return to the Home page

### Tab Navigation
- Click any tab name to switch between sections
- Active tab is highlighted in blue
- Inactive tabs are gray

## Visual Feedback

### Success Messages
- Green background with dark green text
- Appears at the top of the form
- Example: "Profile updated successfully!"

### Error Messages
- Red background with dark red text
- Appears at the top of the form
- Provides clear guidance on what went wrong

### Loading States
- Buttons show "Saving...", "Changing Password...", etc.
- Button is disabled during processing
- Prevents duplicate submissions

## Tips & Best Practices

### Profile
- Keep your name up-to-date for accurate audit logs
- Specify your department for better organization

### Preferences
- **Dark Theme**: Great for reducing eye strain during long sessions
- **Language**: Choose the language you're most comfortable with
- **Notifications**: Enable to stay informed about important updates

### Security
- **Change Password Regularly**: Update your password every 3-6 months
- **Use Strong Passwords**: Combine letters, numbers, and symbols
- **Don't Reuse Passwords**: Use a unique password for this application
- **Keep It Secret**: Never share your password with others

## Keyboard Shortcuts

- **Tab**: Navigate between form fields
- **Enter**: Submit the active form
- **Escape**: (Future) Close dialogs or cancel operations

## Troubleshooting

### "Failed to update profile"
- Check your internet connection
- Try refreshing the page
- Contact support if the issue persists

### "Failed to save preferences"
- Check browser localStorage is enabled
- Try clearing browser cache
- Refresh and try again

### Password Change Issues
- Ensure you're entering the correct current password
- Verify new passwords match exactly
- If you've forgotten your password, use the password reset option on the login page

### Theme Not Applying
- Click "Save Preferences" after selecting a theme
- Refresh the page if needed
- Check that your browser supports the dark mode feature

## Data Storage

### Profile Data
- Stored in Firebase Authentication
- Synced across all your sessions
- Backed up automatically

### Preferences
- Stored locally in your browser
- Persists between sessions
- Specific to each device/browser

### Password
- Securely hashed and stored in Firebase
- Never stored in plain text
- Cannot be recovered (only reset)

## Privacy & Security

### What We Store
- Your email address (for login)
- Your name and department (for identification)
- Your preferences (for customization)
- Your password (encrypted)

### What We Don't Store
- Your password in plain text
- Your browsing history
- Personal data beyond what you provide

### Security Measures
- All data transmitted over HTTPS
- Passwords are hashed with industry-standard algorithms
- Reauthentication required for sensitive changes
- Session timeout after 24 hours of inactivity

## Accessibility

The Settings page is designed to be accessible:
- Clear labels for all form fields
- Keyboard navigation support
- High contrast text
- Screen reader compatible
- Focus indicators for keyboard users

## Mobile Considerations

While FIRST-AID is primarily a desktop application, the Settings page is responsive:
- Adapts to different screen sizes
- Touch-friendly buttons and controls
- Readable text on smaller screens

## Future Features

Coming soon to the Settings page:
- Profile picture upload
- Two-factor authentication setup
- Session management (view/revoke active sessions)
- Email change with verification
- Granular notification preferences
- Data export functionality
- Account deletion option

## Support

If you encounter any issues with the Settings page:
1. Check this guide for troubleshooting tips
2. Contact your system administrator
3. Report bugs through the appropriate channels

---

**Last Updated**: 2024  
**Version**: 1.0  
**Component**: SettingsPage  
**Related Tasks**: Task 16.1
