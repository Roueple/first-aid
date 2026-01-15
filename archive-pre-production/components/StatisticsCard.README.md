# StatisticsCard Component

## Overview

The `StatisticsCard` component is a reusable card component that displays a metric with an optional trend indicator. It's designed for dashboard statistics and supports click interactions for navigation to filtered views.

## Features

- Displays a title, value, and icon
- Shows trend indicators with percentage changes
- Supports loading states with skeleton animation
- Clickable cards for navigation (optional)
- Keyboard accessible (Enter and Space keys)
- Responsive design with hover effects

## Props

```typescript
interface StatisticsCardProps {
  title: string;              // Card title (e.g., "Total Findings")
  value: number;              // Numeric value to display
  trend?: {                   // Optional trend indicator
    value: number;            // Percentage change (absolute value)
    isPositive: boolean;      // Whether trend is positive or negative
  };
  icon: ReactNode;            // Icon to display (SVG or component)
  iconBgColor: string;        // Tailwind class for icon background (e.g., "bg-blue-100")
  iconColor: string;          // Tailwind class for icon color (e.g., "text-blue-600")
  onClick?: () => void;       // Optional click handler for navigation
  loading?: boolean;          // Show loading skeleton state
}
```

## Usage Examples

### Basic Card

```tsx
import { StatisticsCard } from '@/components/StatisticsCard';

<StatisticsCard
  title="Total Findings"
  value={150}
  icon={<TotalIcon />}
  iconBgColor="bg-blue-100"
  iconColor="text-blue-600"
/>
```

### Card with Trend

```tsx
<StatisticsCard
  title="Open Findings"
  value={45}
  trend={{ value: 10, isPositive: false }}
  icon={<OpenIcon />}
  iconBgColor="bg-yellow-100"
  iconColor="text-yellow-600"
/>
```

### Clickable Card

```tsx
<StatisticsCard
  title="High-Risk"
  value={12}
  trend={{ value: 5, isPositive: true }}
  icon={<HighRiskIcon />}
  iconBgColor="bg-red-100"
  iconColor="text-red-600"
  onClick={() => navigate('/findings?severity=Critical,High')}
/>
```

### Loading State

```tsx
<StatisticsCard
  title="Overdue"
  value={0}
  icon={<OverdueIcon />}
  iconBgColor="bg-orange-100"
  iconColor="text-orange-600"
  loading={true}
/>
```

## Accessibility

- Cards with `onClick` handlers are rendered as buttons with proper ARIA attributes
- Keyboard navigation is supported (Enter and Space keys)
- Screen reader friendly with descriptive labels
- Proper focus states for keyboard users

## Styling

The component uses Tailwind CSS classes and supports:
- Responsive design (works on all screen sizes)
- Hover effects (shadow elevation on hover for clickable cards)
- Loading animations (pulse effect for skeleton state)
- Color customization through props

## Requirements

Implements Requirements 4.1 and 4.2 from the FIRST-AID specification:
- 4.1: Display total findings count, open findings count, high-risk findings count, and overdue findings count
- 4.2: Calculate and display trend indicators showing percentage change from previous month
