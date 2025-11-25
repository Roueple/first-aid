# FindingsTable Testing Guide

## Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

This will start both the Vite dev server and Electron app.

### 2. Login

1. The app will open to the login page
2. Use your test credentials to log in (e.g., `test@example.com` / `password123`)
3. You'll be redirected to the HomePage

### 3. Navigate to FindingsTable

From the HomePage, you have three ways to access the FindingsTable:

**Option A: Direct Navigation from HomePage**
- Click the **"📋 View Findings Table"** button (purple button)

**Option B: Via Dashboard**
- Click **"📊 Go to Dashboard"** first
- Then click **"View All Findings"** button in the dashboard header

**Option C: Direct URL**
- Navigate to `http://localhost:5173/findings` in the Electron window

## What You'll See

### FindingsPage Layout

The page includes:

1. **Header Section**
   - Back button (top-left)
   - Page title: "Audit Findings"
   - Description text

2. **Action Bar** (appears when rows are selected)
   - Shows count of selected findings
   - "Export Selected" button
   - "Bulk Update" button

3. **FindingsTable Component**
   - 10 columns with sortable headers
   - Checkboxes for row selection
   - Color-coded severity and status badges
   - 5 sample findings with realistic data

4. **Info Box** (bottom)
   - Lists component features
   - Shows what's coming in future tasks

## Testing the FindingsTable

### Test 1: View Data
✅ **Expected**: Table displays 5 sample findings with all columns visible

**Columns to verify:**
- Select (checkbox)
- Title
- Severity (color-coded badge)
- Status (color-coded badge)
- Location
- Category
- Responsible Person
- Date Identified
- Date Due
- Risk Level (X/10 format)

### Test 2: Sorting
✅ **Expected**: Clicking column headers sorts the data

**Steps:**
1. Click "Title" header → sorts alphabetically A-Z
2. Click "Title" again → sorts Z-A
3. Click "Title" third time → removes sorting
4. Try sorting by "Severity", "Status", "Date Identified"
5. Look for sort indicators (↑ ↓ ↕) next to column names

### Test 3: Row Selection
✅ **Expected**: Can select individual rows or all rows

**Steps:**
1. Click checkbox on first row → row highlights in blue
2. Action bar appears showing "1 row(s) selected"
3. Click checkbox on second row → "2 row(s) selected"
4. Click header checkbox → all 5 rows selected
5. Click header checkbox again → all rows deselected

### Test 4: Visual Indicators

**Severity Colors:**
- 🔴 Critical → Red badge
- 🟠 High → Orange badge
- 🟡 Medium → Yellow badge
- 🟢 Low → Green badge

**Status Colors:**
- 🔵 Open → Blue badge
- 🟣 In Progress → Purple badge
- ⚪ Closed → Gray badge
- 🟡 Deferred → Yellow badge

### Test 5: Hover Effects
✅ **Expected**: Visual feedback on interaction

**Steps:**
1. Hover over table rows → background changes to light gray
2. Hover over column headers → cursor changes to pointer
3. Selected rows → blue background

### Test 6: Text Truncation
✅ **Expected**: Long text is truncated with tooltip

**Steps:**
1. Look at the "Title" column
2. Long titles should be truncated with "..."
3. Hover over truncated text → full text appears in tooltip

### Test 7: Date Formatting
✅ **Expected**: Dates display in readable format

**Format**: "Jan 15, 2024" (Month Day, Year)

### Test 8: Risk Level Display
✅ **Expected**: Risk level shows as "X/10"

Example: "7/10", "9/10", etc.

## Sample Data Overview

The FindingsPage includes 5 mock findings:

1. **Critical** - Inadequate Access Controls (Risk: 9/10)
2. **High** - Missing Backup Procedures (Risk: 7/10)
3. **Medium** - Outdated Software Versions (Risk: 5/10)
4. **Low** - Incomplete Training Records (Risk: 3/10, Closed)
5. **High** - Insufficient Segregation of Duties (Risk: 8/10, Deferred)

## Navigation Flow

```
LoginPage
    ↓
HomePage
    ↓ (Click "View Findings Table")
FindingsPage
    ↓ (Click back button)
HomePage
```

Or:

```
HomePage
    ↓ (Click "Go to Dashboard")
DashboardPage
    ↓ (Click "View All Findings")
FindingsPage
```

## Console Testing

Open DevTools (F12) and check:

1. **No errors in console** ✅
2. **Component renders without warnings** ✅
3. **Selection changes logged** (if you added console.log)

## Known Behavior

### Current Implementation
- ✅ Displays all findings (no pagination yet)
- ✅ Sorting works on all columns
- ✅ Row selection with callbacks
- ✅ Color-coded badges
- ✅ Responsive design

### Coming Soon (Future Tasks)
- ⏳ Pagination controls (Task 6.2)
- ⏳ Filter panel (Task 6.3)
- ⏳ Search functionality (Task 6.4)
- ⏳ Details panel (Task 6.5)
- ⏳ Edit dialog (Task 6.6)

## Troubleshooting

### Issue: Table not showing
**Solution**: Check that you're logged in and navigated to `/findings`

### Issue: No data displayed
**Solution**: The page uses mock data, so it should always show 5 findings. Check console for errors.

### Issue: Sorting not working
**Solution**: Make sure you're clicking the column header text, not just the cell

### Issue: Selection not working
**Solution**: Click directly on the checkbox, not the row

### Issue: Styles look broken
**Solution**: Make sure Tailwind CSS is properly configured and the dev server is running

## Next Steps

After testing the FindingsTable:

1. **Task 6.2**: Test pagination controls (when implemented)
2. **Task 6.3**: Test filter panel (when implemented)
3. **Task 6.4**: Test search functionality (when implemented)
4. **Task 6.5**: Test details panel (when implemented)
5. **Task 6.6**: Test edit dialog (when implemented)

## Feedback

If you encounter any issues or have suggestions:
1. Check the console for errors
2. Verify you're on the latest code
3. Try refreshing the page
4. Check the completion report: `docs/task-6.1-completion-report.md`

---

**Happy Testing! 🎉**
