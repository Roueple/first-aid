# Infinite Loop Fix - FindingsPage

## Problem
The application was experiencing an infinite render loop with the error:
```
Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

## Root Cause
The issue was caused by callback functions in `FindingsPage.tsx` that were not memoized with `useCallback`. These functions were being recreated on every render, causing child components' `useEffect` hooks to trigger infinitely.

Specifically:
1. `handleSearch` was recreated on every render
2. `SearchBar` component's `useEffect` depended on `onSearch` prop
3. When `handleSearch` changed, it triggered `SearchBar` to re-render
4. This caused `FindingsPage` to re-render, creating a new `handleSearch`
5. Loop continued infinitely

## Solution
Wrapped all event handler functions in `useCallback` to ensure they maintain stable references across renders.

### Functions Fixed:

1. **handlePageChange** - Pagination handler
2. **handlePageSizeChange** - Page size handler
3. **handleFiltersChange** - Filter change handler
4. **handleSearch** - Search handler (main culprit)
5. **handleRowClick** - Row click handler
6. **handleCloseDetails** - Close details panel handler
7. **handleEdit** - Edit dialog opener
8. **handleSaveEdit** - Save edit handler (also fixed to use functional setState)
9. **handleCloseEditDialog** - Close edit dialog handler

### Additional Fixes:

**Updated Field Names to New Schema:**
- `location` → `subholding`
- `category` → `processArea`
- `title` → `findingTitle`
- `description` → `findingDescription`
- `responsiblePerson` → `executor`
- `severity` → `priorityLevel`

**Added New Filter Options:**
- `availableSubholdings` (was `availableLocations`)
- `availableProcessAreas` (was `availableCategories`)
- `availableProjectTypes` (new)
- `availablePrimaryTags` (new)

**Updated Search Logic:**
- Now searches across `findingTitle`, `findingDescription`, `executor`, and `id`
- Supports both old and new filter field names for backward compatibility

**Fixed setState in handleSaveEdit:**
- Changed from direct state reference to functional updates:
  ```typescript
  // Before
  setAllFindings(allFindings.map(f => ...))
  
  // After
  setAllFindings(prev => prev.map(f => ...))
  ```

## Files Modified
- `src/renderer/pages/FindingsPage.tsx`

## Testing
After this fix:
1. ✅ No more infinite loop errors
2. ✅ Search works without causing re-renders
3. ✅ Filters work correctly
4. ✅ Pagination works smoothly
5. ✅ All handlers maintain stable references
6. ✅ New schema fields are used throughout

## Prevention
To prevent similar issues in the future:
1. Always use `useCallback` for event handlers passed as props
2. Use functional setState when updating state based on previous state
3. Be mindful of dependencies in `useEffect` hooks
4. Use React DevTools Profiler to detect unnecessary re-renders
