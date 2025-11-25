# Data Flow Diagram

## Before Fixes (Inconsistent) ❌

```
┌─────────────────────────────────────────────────────────────┐
│                         Firebase                             │
│                    (Real Findings Data)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Not used!)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    FindingsService                           │
│  • getFindings()                                             │
│  • addComputedFields() → isOverdue, daysOpen                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Only Dashboard uses this)
                              ↓
                    ┌─────────────────┐
                    │   Dashboard     │
                    │  (Real Data)    │
                    │                 │
                    │  Manual calc:   │
                    │  if (dateDue <  │
                    │     now) {...}  │
                    └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      FindingsPage                            │
│                                                              │
│  const mockFindings = [                                      │
│    { id: '1', title: 'Finding (Copy 1)' },                  │
│    { id: '2', title: 'Finding (Copy 2)' },                  │
│    ...                                                       │
│  ]                                                           │
│                                                              │
│  ❌ Shows FAKE data                                          │
│  ❌ Manual overdue calculation                               │
│  ❌ Type errors on update                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │ FindingsTable   │
                    │  (Mock Data)    │
                    └─────────────────┘

PROBLEMS:
• Dashboard and Table show different data
• Duplicate overdue calculation logic
• Type inconsistencies
• Mock data doesn't reflect Firebase changes
```

## After Fixes (Consistent) ✅

```
┌─────────────────────────────────────────────────────────────┐
│                         Firebase                             │
│                    (Real Findings Data)                      │
│                                                              │
│  • findings collection                                       │
│  • Firestore Timestamps                                      │
│  • Indexed fields                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Single source of truth)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    FindingsService                           │
│                                                              │
│  getFindings(filters, pagination)                            │
│    ↓                                                         │
│  addComputedFields(finding)                                  │
│    • isOverdue = dateDue < now && status !== 'Closed'        │
│    • daysOpen = (endDate - startDate) / 86400000             │
│    ↓                                                         │
│  Returns: Finding[] with computed fields                     │
│                                                              │
│  ✅ Single calculation point                                 │
│  ✅ Type-safe Timestamps                                     │
│  ✅ Consistent logic                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Both use same service)
                              ↓
                    ┌─────────────────────┐
                    │                     │
        ┌───────────┴──────────┐  ┌──────┴──────────┐
        │                      │  │                  │
        ↓                      ↓  ↓                  ↓
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Dashboard   │      │ FindingsPage │      │ Other Pages  │
│              │      │              │      │              │
│ useDashboard │      │ useEffect(() │      │ (Future)     │
│ Stats()      │      │ => {         │      │              │
│   ↓          │      │   loadFind   │      │              │
│ findings     │      │   ings()     │      │              │
│ Service      │      │ })           │      │              │
│ .getFindings │      │   ↓          │      │              │
│ ()           │      │ findings     │      │              │
│              │      │ Service      │      │              │
│ Uses:        │      │ .getFindings │      │              │
│ • f.isOver   │      │ ()           │      │              │
│   due ✅     │      │              │      │              │
│              │      │ Uses:        │      │              │
│ Stats:       │      │ • f.isOver   │      │              │
│ • Total      │      │   due ✅     │      │              │
│ • Open       │      │ • f.daysOpen │      │              │
│ • High-Risk  │      │   ✅         │      │              │
│ • Overdue    │      │              │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
        │                      │
        │                      │
        ↓                      ↓
┌──────────────┐      ┌──────────────┐
│ Statistics   │      │ FindingsTable│
│ Cards        │      │              │
│              │      │ • Sortable   │
│ ✅ Real data │      │ • Filterable │
│ ✅ Consistent│      │ • Searchable │
└──────────────┘      │              │
                      │ ✅ Real data │
                      │ ✅ Consistent│
                      └──────────────┘

BENEFITS:
✅ Single source of truth (Firebase)
✅ Consistent computed fields
✅ Type-safe throughout
✅ No code duplication
✅ Real-time accuracy
```

## Data Flow for Updates

### Before (Type Errors) ❌

```
User edits finding
       ↓
FindingEditDialog
       ↓
handleSaveEdit(id, data: UpdateFindingInput)
       ↓
findingsService.updateFinding(id, data)
       ↓
Manual merge: { ...finding, ...data, dateUpdated: Timestamp.now() }
       ↓
❌ TYPE ERROR: UpdateFindingInput has Date | Timestamp
❌ Finding requires Timestamp
❌ Computed fields not recalculated
```

### After (Type Safe) ✅

```
User edits finding
       ↓
FindingEditDialog
       ↓
handleSaveEdit(id, data: UpdateFindingInput)
       ↓
findingsService.updateFinding(id, data)
  • Converts Date → Timestamp
  • Updates Firebase
       ↓
findingsService.getFindingById(id)
  • Fetches updated finding
  • Adds computed fields
  • Returns Finding with Timestamp
       ↓
setState(updatedFinding)
       ↓
✅ Type-safe
✅ Computed fields correct
✅ Consistent with Firebase
```

## Computed Fields Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FindingsService                           │
│                                                              │
│  addComputedFields(finding: Finding): Finding {              │
│                                                              │
│    const now = new Date();                                   │
│                                                              │
│    // Calculate isOverdue                                    │
│    if (finding.dateDue && finding.status !== 'Closed') {     │
│      const dueDate = finding.dateDue.toDate();               │
│      finding.isOverdue = dueDate < now;                      │
│    } else {                                                  │
│      finding.isOverdue = false;                              │
│    }                                                         │
│                                                              │
│    // Calculate daysOpen                                     │
│    if (finding.dateIdentified) {                             │
│      const identifiedDate = finding.dateIdentified.toDate(); │
│      const endDate = finding.dateCompleted                   │
│        ? finding.dateCompleted.toDate()                      │
│        : now;                                                │
│      finding.daysOpen = Math.floor(                          │
│        (endDate.getTime() - identifiedDate.getTime())        │
│        / (1000 * 60 * 60 * 24)                               │
│      );                                                      │
│    }                                                         │
│                                                              │
│    return finding;                                           │
│  }                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Called by all read methods)
                              ↓
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ↓                     ↓                     ↓
  getFindings()      getFindingById()      getOverdueFindings()
        │                     │                     │
        ↓                     ↓                     ↓
  Returns Finding[]   Returns Finding      Returns Finding[]
  with computed       with computed        with computed
  fields ✅           fields ✅            fields ✅
```

## Filter Flow

```
User applies filters
       ↓
FilterPanel → onFiltersChange(filters)
       ↓
FindingsPage → setFilters(filters)
       ↓
useMemo(() => {
  return allFindings.filter(finding => {
    // Severity filter
    if (filters.severity && !filters.severity.includes(finding.severity))
      return false;
    
    // Status filter
    if (filters.status && !filters.status.includes(finding.status))
      return false;
    
    // ... other filters
    
    return true;
  });
}, [allFindings, filters])
       ↓
FindingsTable receives filtered findings
       ↓
✅ Consistent with Firebase data
✅ Uses computed fields
✅ Type-safe
```

## Summary

### Key Improvements
1. **Single Source**: All data from Firebase via FindingsService
2. **Computed Once**: Fields calculated in one place
3. **Type Safe**: Proper Timestamp handling throughout
4. **Consistent**: Same data in Dashboard and Table
5. **Maintainable**: No code duplication

### Data Guarantees
- ✅ All findings have `isOverdue` field
- ✅ All findings have `daysOpen` field
- ✅ All dates are Firestore Timestamps
- ✅ All computed fields use same logic
- ✅ Updates refresh computed fields
