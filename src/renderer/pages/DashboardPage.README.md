# DashboardPage Component

## Overview

The DashboardPage component provides the main overview interface for the FIRST-AID audit findings management system. It displays key metrics, charts, and recent activity in a responsive grid layout.

## Features

### 1. Grid Layout
- **Statistics Cards**: 4-column grid on large screens, responsive to 2 columns on medium and 1 column on small screens
- **Charts Section**: 2-column grid for risk distribution and location summary charts
- **Recent Activity**: Full-width table showing latest finding updates

### 2. Loading Skeleton States
The component includes comprehensive loading states:
- `DashboardLoading`: Full page skeleton with animated pulse effects
- `SkeletonCard`: Loading state for statistics cards
- `SkeletonChart`: Loading state for chart sections
- `SkeletonTable`: Loading state for the activity table

Usage:
```tsx
<DashboardPage loading={true} />
// or
<DashboardLoading />
```

### 3. Error Boundary
Built-in error boundary for graceful failure handling:
- Catches React component errors
- Displays user-friendly error message
- Provides refresh button to recover
- Supports custom fallback UI

Usage:
```tsx
<ErrorBoundary fallback={<CustomError />}>
  <YourComponent />
</ErrorBoundary>
```

## Component Structure

```
DashboardPage
├── ErrorBoundary (wrapper)
├── Header
│   ├── Title & Description
│   └── New Finding Button
├── Main Content
│   ├── Statistics Cards Grid (4 cards)
│   │   ├── Total Findings
│   │   ├── Open Findings
│   │   ├── High-Risk Findings
│   │   └── Overdue Findings
│   ├── Charts Grid (2 charts)
│   │   ├── Risk Distribution
│   │   └── Location Summary
│   └── Recent Activity Table
```

## Requirements Validation

This component satisfies the following requirements from the design document:

- **Requirement 4.1**: Displays total findings count, open findings count, high-risk findings count, and overdue findings count
- **Requirement 4.2**: Calculates and displays trend indicators (placeholder for percentage change)
- **Requirement 4.3**: Renders a risk distribution chart (placeholder ready for chart library)
- **Requirement 4.4**: Displays a location summary chart (placeholder ready for chart library)
- **Requirement 4.5**: Supports automatic refresh of dashboard data (infrastructure ready)

## Styling

- Uses Tailwind CSS for responsive design
- Primary color scheme: Blue (primary-600)
- Card-based layout with shadows and hover effects
- Icons from Heroicons (inline SVG)

## Future Enhancements

The following features will be added in subsequent tasks:

1. **Task 5.2**: Implement actual statistics cards with real data
2. **Task 5.3**: Add data visualization charts (Chart.js or Recharts)
3. **Task 5.4**: Implement dashboard data fetching and caching with React Query

## Testing

Comprehensive test suite included in `__tests__/DashboardPage.test.tsx`:

- ✅ Renders dashboard with all sections
- ✅ Displays loading skeleton states
- ✅ Error boundary catches and displays errors
- ✅ Shows empty state when no findings exist
- ✅ Displays initial zero values in statistics

Run tests:
```bash
npm test -- src/renderer/pages/__tests__/DashboardPage.test.tsx
```

## Usage Example

```tsx
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';

// Basic usage
<DashboardPage />

// With loading state
<DashboardPage loading={true} />

// In router
<Route 
  path="/dashboard" 
  element={
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  } 
/>
```

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy (h1, h2, h3)
- SVG icons with proper viewBox and stroke attributes
- Keyboard-accessible buttons
- Screen reader friendly error messages

## Performance

- Minimal initial render
- Skeleton states prevent layout shift
- Responsive grid uses CSS Grid for optimal performance
- No external dependencies for basic layout
