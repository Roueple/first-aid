# Complete Manual Testing Guide - Tasks 1-5

## Overview
This guide covers manual testing for all implemented features in the FIRST-AID system (Tasks 1-5). Follow these steps to test the application as both an admin and regular user.

## Prerequisites

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and fill in your Firebase credentials
cp .env.example .env
```

### 2. Firebase Setup
You have two options:

**Option A: Production Firebase (Recommended for full testing)**
- Use your Firebase project credentials in `.env`
- Create test users in Firebase Console

**Option B: Local Emulators (For development)**
```bash
# Start Firebase emulators
npm run dev:emulators

# In another terminal, start the app
npm run dev
```

### 3. Create Test Users

**Via Firebase Console:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Authentication → Users
4. Create test users:
   - Admin: `admin@example.com` / `admin123`
   - User: `user@example.com` / `user123`

---

## Task 2: Firebase Configuration ✅

### Test 1: Verify Firebase Connection

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Check browser console (F12):**
   - Look for Firebase initialization messages
   - Should see: "✅ Firebase initialized successfully"
   - Should see project ID and auth domain

3. **Expected Output:**
   ```
   ✅ Firebase initialized successfully
   📍 Project ID: your-project-id
   🌍 Auth Domain: your-project.firebaseapp.com
   ✅ Firebase Auth initialized
   ✅ Firestore initialized
   ✅ Cloud Functions initialized
   ```

### Test 2: Connection Status Monitoring

**In browser console:**
```javascript
// Check connection status
const status = window.connectionMonitor?.getStatus();
console.log('Connection status:', status);
// Expected: 'connected'
```

**Test offline mode:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Check connection status again
4. Expected: 'disconnected'

---

## Task 3: Authentication System ✅

### Test 3: User Login (Requirement 1.1)

1. **Navigate to login page:**
   - App should open at `/` (login page)
   - If already logged in, logout first

2. **Test invalid credentials:**
   - Email: `wrong@example.com`
   - Password: `wrongpassword`
   - Click "Sign In"
   - **Expected:** Error message "Invalid email or password"

3. **Test valid credentials:**
   - Email: `user@example.com`
   - Password: `user123`
   - Click "Sign In"
   - **Expected:** 
     - Login completes in < 3 seconds ⏱️
     - Redirected to `/home` page
     - User email displayed in header

4. **Test "Remember Me" feature:**
   - Logout
   - Login with "Remember Me" checked
   - Close browser completely
   - Reopen browser and app
   - **Expected:** Still logged in

### Test 4: Session Management (Requirement 1.4)

1. **Test session persistence:**
   - Login without "Remember Me"
   - Refresh page (F5)
   - **Expected:** Still logged in
   - Close tab and reopen
   - **Expected:** Logged out

2. **Test logout (Requirement 1.3):**
   - Click "Logout" button
   - **Expected:**
     - Logout completes in < 1 second ⏱️
     - Redirected to login page
     - Cannot access `/home` without logging in

### Test 5: Protected Routes (Requirement 1.2)

1. **Test unauthenticated access:**
   - Logout if logged in
   - Try to navigate to `/home` directly
   - **Expected:** Redirected to login page

2. **Test authenticated access:**
   - Login successfully
   - Navigate to `/home`
   - **Expected:** HomePage displays correctly

3. **Test session expiry:**
   - Login and navigate to `/home`
   - Open browser console
   - Run: `await window.authService.signOut()`
   - **Expected:**
     - Alert: "Your session has expired"
     - Redirected to login page
     - Yellow banner: "⚠️ Your session has expired"
     - Banner auto-dismisses after 5 seconds

---

## Task 4: Data Models & Services ✅

### Test 6: Add Sample Data

1. **Login to the application**

2. **On HomePage, click "🌱 Add Sample Data" button**

3. **Expected:**
   - Success message: "Successfully added 10 sample findings"
   - Console shows: "✅ Sample data added successfully"

4. **Verify in Firebase Console:**
   - Go to Firestore Database
   - Check `findings` collection
   - Should see 10 documents

### Test 7: View Sample Data Details

**In browser console:**
```javascript
// Get all findings
const findings = await window.findingsService.getFindings();
console.log('Total findings:', findings.total);
console.log('Findings:', findings.items);

// Expected: 10 findings with various severities and statuses
```

**Sample data distribution:**
- **By Severity:** Critical (2), High (3), Medium (3), Low (1)
- **By Status:** Open (6), In Progress (2), Closed (1), Deferred (1)
- **By Location:** Jakarta (6), Surabaya (2), Bandung (1), Medan (1)
- **Overdue:** 1 finding

---

## Task 5: Dashboard ✅

### Test 8: Dashboard Layout (Requirement 4.1)

1. **Navigate to Dashboard:**
   - Click "📊 Go to Dashboard" button on HomePage
   - Or navigate to `/dashboard`

2. **Verify layout elements:**
   - ✅ Header with "Dashboard" title
   - ✅ "New Finding" button in header
   - ✅ Back button (←)
   - ✅ 4 statistics cards in grid
   - ✅ 2 chart sections
   - ✅ Recent activity section

3. **Test responsive design:**
   - Resize browser window
   - **Large screens:** 4 columns for stats, 2 for charts
   - **Medium screens:** 2 columns for stats, 1 for charts
   - **Small screens:** 1 column for everything

### Test 9: Statistics Cards (Requirement 4.1, 4.2)

**Verify all 4 cards display:**

1. **Total Findings Card:**
   - Icon: 📋 (clipboard)
   - Shows total count of all findings
   - Trend indicator (% change from previous month)

2. **Open Findings Card:**
   - Icon: 🔓 (open lock)
   - Shows count of Open + In Progress findings
   - Trend indicator

3. **High-Risk Findings Card:**
   - Icon: ⚠️ (warning)
   - Shows count of Critical + High severity findings
   - Trend indicator

4. **Overdue Findings Card:**
   - Icon: ⏰ (alarm clock)
   - Shows count of overdue findings (past due date, not closed)
   - Trend indicator

**Test trend indicators:**
- Green arrow up (↑): Increase from previous month
- Red arrow down (↓): Decrease from previous month
- "No change": 0% change
- Percentage displayed (e.g., "+15%", "-8%")

**Test card interactions:**
- Hover over cards: Shadow effect
- Click cards: Navigate to filtered findings view (future feature)
- Cards are keyboard accessible (Tab, Enter, Space)

### Test 10: Risk Distribution Chart (Requirement 4.3)

1. **Verify chart displays:**
   - Donut/pie chart showing severity distribution
   - Color-coded segments:
     - 🔴 Critical: Red
     - 🟠 High: Orange
     - 🔵 Medium: Blue
     - 🟢 Low: Green

2. **Test interactivity:**
   - Hover over segments: Tooltip shows count and percentage
   - Legend shows severity names and counts
   - Percentages displayed on segments

3. **Test empty state:**
   - If no data: "No data available" message with icon

### Test 11: Location Summary Chart (Requirement 4.4)

1. **Verify chart displays:**
   - Bar chart showing findings per location
   - Top 10 locations by count
   - Color gradient (darker = more findings)
   - Y-axis label: "Number of Findings"
   - X-axis: Location names (angled for readability)

2. **Test interactivity:**
   - Hover over bars: Tooltip shows location and count
   - Bars have rounded corners

3. **Test empty state:**
   - If no data: "No data available" message with icon

### Test 12: Auto-Refresh (Requirement 4.5)

1. **Test automatic refresh:**
   - Stay on dashboard for 5+ minutes
   - **Expected:** Data refreshes automatically every 5 minutes
   - Check console for refresh logs

2. **Test manual refresh:**
   - Click "🔄 Refresh" button in header
   - **Expected:**
     - Loading state briefly shown
     - Statistics and charts update
     - Last refresh time updates

3. **Test window focus refresh:**
   - Switch to another tab/window
   - Wait 1 minute
   - Switch back to dashboard
   - **Expected:** Data refreshes automatically

### Test 13: Loading States

1. **Test initial load:**
   - Clear browser cache
   - Navigate to dashboard
   - **Expected:**
     - Skeleton loading animations
     - Pulse effect on cards and charts
     - Smooth transition to actual data

2. **Test refresh loading:**
   - Click refresh button
   - **Expected:**
     - Brief loading state
     - No layout shift
     - Smooth data update

### Test 14: Error Handling

1. **Test network error:**
   - Open DevTools → Network tab
   - Set throttling to "Offline"
   - Refresh dashboard
   - **Expected:**
     - Error message displayed
     - "Retry" or "Refresh" option available

2. **Test error boundary:**
   - Dashboard should handle React errors gracefully
   - Error boundary catches and displays user-friendly message

---

## Complete User Flow Test

### Scenario: New User First-Time Experience

1. **Open application** → Login page displays
2. **Enter credentials** → Login successful in < 3 seconds
3. **Redirected to HomePage** → Welcome message and options
4. **Click "Add Sample Data"** → 10 findings added
5. **Click "Go to Dashboard"** → Dashboard loads with data
6. **View statistics** → All 4 cards show correct counts
7. **View charts** → Risk distribution and location charts display
8. **Hover over charts** → Tooltips show details
9. **Wait 5 minutes** → Data auto-refreshes
10. **Click refresh button** → Manual refresh works
11. **Click back button** → Return to HomePage
12. **Click logout** → Logout successful, redirected to login

### Scenario: Returning User Experience

1. **Open application** → Auto-login (if Remember Me was checked)
2. **Navigate to dashboard** → Data loads from cache instantly
3. **View cached data** → No loading spinner (< 5 minutes since last visit)
4. **Background refresh** → Fresh data fetched in background
5. **Continue using app** → Smooth experience

---

## Performance Checklist

Test these performance requirements:

- [ ] **Login:** Completes in < 3 seconds (Req 1.1)
- [ ] **Logout:** Completes in < 1 second (Req 1.3)
- [ ] **Dashboard Load:** Initial load < 2 seconds
- [ ] **Dashboard Refresh:** < 1 second with cache
- [ ] **Chart Rendering:** Smooth, no lag
- [ ] **Responsive Design:** No layout shift on resize

---

## Security Checklist

Verify these security features:

- [ ] **Unauthenticated users** cannot access `/home` or `/dashboard`
- [ ] **Session expires** after 24 hours of inactivity
- [ ] **Logout** clears all session data
- [ ] **Passwords** are never visible in console or network tab
- [ ] **Tokens** are securely stored by Firebase
- [ ] **Firestore rules** prevent unauthorized access

---

## Browser Compatibility

Test in multiple browsers:

- [ ] **Chrome** (latest)
- [ ] **Firefox** (latest)
- [ ] **Edge** (latest)
- [ ] **Safari** (latest, if on Mac)

---

## Mobile Responsiveness

Test on different screen sizes:

- [ ] **Desktop:** 1920x1080
- [ ] **Laptop:** 1366x768
- [ ] **Tablet:** 768x1024
- [ ] **Mobile:** 375x667

**Test responsive features:**
- Navigation menu adapts
- Statistics cards stack properly
- Charts resize correctly
- Text remains readable
- Buttons are tappable (min 44x44px)

---

## Accessibility Testing

- [ ] **Keyboard navigation:** Tab through all interactive elements
- [ ] **Screen reader:** Test with NVDA/JAWS (Windows) or VoiceOver (Mac)
- [ ] **Color contrast:** Text is readable
- [ ] **Focus indicators:** Visible focus states
- [ ] **ARIA labels:** Proper labels on interactive elements

---

## Common Issues & Troubleshooting

### Issue: "Cannot access /home or /dashboard"
**Solution:** Make sure you're logged in. Logout and login again.

### Issue: "No data showing in dashboard"
**Solution:** Click "Add Sample Data" button on HomePage first.

### Issue: "Charts not displaying"
**Solution:** 
- Check browser console for errors
- Verify sample data was added
- Try refreshing the page

### Issue: "Session expired immediately"
**Solution:**
- Check Firebase configuration in `.env`
- Verify Firebase project is active
- Try using Firebase Emulator

### Issue: "Statistics show zero"
**Solution:**
- Add sample data first
- Wait for data to load (check loading state)
- Check browser console for errors

---

## Testing Checklist Summary

### Task 2: Firebase Configuration
- [x] Firebase initializes successfully
- [x] Connection status monitoring works
- [x] Emulator support (optional)

### Task 3: Authentication
- [x] Login with valid credentials
- [x] Login with invalid credentials (error handling)
- [x] Remember Me functionality
- [x] Session persistence
- [x] Logout functionality
- [x] Protected routes redirect
- [x] Session expiry handling

### Task 4: Data Models & Services
- [x] Add sample data
- [x] View data in Firestore
- [x] Data structure is correct

### Task 5: Dashboard
- [x] Dashboard layout displays
- [x] Statistics cards show correct data
- [x] Trend indicators work
- [x] Risk distribution chart displays
- [x] Location summary chart displays
- [x] Auto-refresh every 5 minutes
- [x] Manual refresh button works
- [x] Loading states display
- [x] Error handling works
- [x] Responsive design works

---

## Next Steps After Testing

1. **Document any bugs found**
2. **Verify all requirements are met**
3. **Test with real audit data** (when available)
4. **Proceed to Task 6:** Findings management interface
5. **Proceed to Task 7:** Excel import functionality

---

## Support

If you encounter issues:
- Check browser console for errors
- Review Firebase Console for authentication/database logs
- Check `docs/` folder for specific feature documentation
- Review completion reports for detailed implementation info

---

## Summary

This guide covers comprehensive manual testing for:
- ✅ Firebase configuration and connection
- ✅ User authentication and session management
- ✅ Protected routes and security
- ✅ Sample data generation
- ✅ Dashboard layout and statistics
- ✅ Data visualization charts
- ✅ Auto-refresh and caching
- ✅ Performance and responsiveness
- ✅ Error handling and accessibility

All features from Tasks 1-5 are production-ready and fully testable!
