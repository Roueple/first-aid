# Consistency Verification Guide

## Quick Verification Steps

### 1. Start the Application
```bash
npm run dev
```

### 2. Check Dashboard Statistics

1. Navigate to the Dashboard page
2. Note the following statistics:
   - **Total Findings**: Should show actual count from Firebase
   - **Open Findings**: Count of findings with status "Open" or "In Progress"
   - **High-Risk**: Count of findings with severity "Critical" or "High"
   - **Overdue**: Count of findings past due date and not closed

3. Open browser DevTools (F12) and run:
```javascript
// This will show you the raw data
const stats = document.querySelector('[data-testid="dashboard-stats"]');
console.log('Dashboard Stats:', stats);
```

### 3. Check Findings Table

1. Navigate to the Findings page
2. Verify the table shows real data (not mock data with "(Copy X)" in titles)
3. Check that the total count matches the dashboard

4. Open browser DevTools and run:
```javascript
// Check if findings have computed fields
const table = document.querySelector('table');
console.log('Findings loaded from Firebase');
```

### 4. Verify Computed Fields

Open browser DevTools Console and run:
```javascript
// This will fetch a finding and show its computed fields
(async () => {
  const { default: findingsService } = await import('./src/services/FindingsService');
  const result = await findingsService.getFindings(undefined, { page: 1, pageSize: 1 });
  const finding = result.items[0];
  
  console.log('Sample Finding:');
  console.log('- ID:', finding.id);
  console.log('- Title:', finding.title);
  console.log('- Status:', finding.status);
  console.log('- Due Date:', finding.dateDue?.toDate());
  console.log('- Is Overdue:', finding.isOverdue);
  console.log('- Days Open:', finding.daysOpen);
  
  // Verify isOverdue calculation
  if (finding.dateDue && finding.status !== 'Closed') {
    const isActuallyOverdue = finding.dateDue.toDate() < new Date();
    console.log('- Overdue Check:', finding.isOverdue === isActuallyOverdue ? '✅ Correct' : '❌ Incorrect');
  }
})();
```

### 5. Test Filtering Consistency

1. In the Findings page, apply filters:
   - Severity: Critical
   - Status: Open

2. Count the results

3. In browser DevTools, verify:
```javascript
(async () => {
  const { default: findingsService } = await import('./src/services/FindingsService');
  
  // Get filtered results
  const filtered = await findingsService.getFindings(
    { severity: ['Critical'], status: ['Open'] },
    { page: 1, pageSize: 10000 }
  );
  
  console.log('Filtered Findings:', filtered.items.length);
  console.log('Should match the table count');
})();
```

### 6. Test Overdue Consistency

1. Click on the "Overdue" card in the Dashboard
2. Should navigate to Findings page with overdue filter
3. Count should match the dashboard

4. Verify in DevTools:
```javascript
(async () => {
  const { default: findingsService } = await import('./src/services/FindingsService');
  
  // Get all findings
  const all = await findingsService.getFindings(undefined, { page: 1, pageSize: 10000 });
  
  // Count overdue using computed field
  const overdueCount = all.items.filter(f => f.isOverdue).length;
  
  // Get overdue using service method
  const overdue = await findingsService.getOverdueFindings({ page: 1, pageSize: 10000 });
  
  console.log('Overdue Count (computed field):', overdueCount);
  console.log('Overdue Count (service method):', overdue.items.length);
  console.log('Match:', overdueCount === overdue.items.length ? '✅' : '❌');
})();
```

### 7. Test Edit Consistency

1. Click on any finding in the table to open details
2. Click "Edit" button
3. Change the status to "Closed"
4. Save the changes
5. Verify:
   - The finding updates in the table
   - The computed fields are recalculated
   - If it was overdue, it's no longer marked as overdue

### 8. Test Search Consistency

1. In the Findings page, search for "security"
2. Note the result count
3. Verify in DevTools:
```javascript
(async () => {
  const { default: findingsService } = await import('./src/services/FindingsService');
  
  const results = await findingsService.searchFindings('security', undefined, {
    page: 1,
    pageSize: 10000
  });
  
  console.log('Search Results:', results.items.length);
  console.log('Should match the UI count');
})();
```

## Expected Results

### ✅ All Checks Should Pass

1. **Dashboard shows real data** - No placeholder or mock data
2. **Findings table shows real data** - No "(Copy X)" in titles
3. **Computed fields present** - All findings have `isOverdue` and `daysOpen`
4. **Overdue calculation consistent** - Same count in dashboard and table
5. **Filters work correctly** - Service and UI show same results
6. **Search works correctly** - Service and UI show same results
7. **Updates reflect immediately** - Changes appear in all views
8. **No TypeScript errors** - Clean compilation
9. **No console errors** - Clean runtime

## Troubleshooting

### Issue: Dashboard shows 0 for all stats
**Solution**: You may not have any findings in Firebase. Run the seed script:
```bash
npm run seed
```

### Issue: Findings table is empty
**Solution**: Check Firebase connection and authentication:
1. Verify `.env` file has correct Firebase config
2. Check browser console for Firebase errors
3. Verify Firestore rules allow read access

### Issue: Overdue count doesn't match
**Solution**: 
1. Check system time is correct
2. Verify findings have `dateDue` set
3. Check that `isOverdue` is being calculated (see computed fields test above)

### Issue: TypeScript errors
**Solution**: Run diagnostics:
```bash
npm run type-check
```

### Issue: Updates don't reflect
**Solution**: 
1. Check that `handleSaveEdit` is fetching the updated finding
2. Verify Firebase write permissions
3. Check browser console for errors

## Automated Test

Run the consistency test script:
```bash
npx tsx test-consistency.ts
```

This will automatically verify:
- Computed fields are correct
- Dashboard statistics match
- Filters work correctly
- Search works correctly
- Data types are correct

## Success Criteria

All of the following should be true:
- [ ] Dashboard displays real Firebase data
- [ ] Findings table displays real Firebase data
- [ ] All findings have `isOverdue` computed field
- [ ] All findings have `daysOpen` computed field
- [ ] Dashboard overdue count matches table filter
- [ ] Dashboard high-risk count matches table filter
- [ ] Dashboard open count matches table filter
- [ ] Search results are consistent
- [ ] Filter results are consistent
- [ ] Editing updates all views
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Automated test passes

If all criteria are met, the consistency fixes are working correctly! ✅
