# ChatMessage Component Visual Guide

## Component Preview

### User Message
```
┌─────────────────────────────────────────────────────────────┐
│                                                    [👤]      │
│                                        ┌──────────────────┐  │
│                                        │ What are the     │  │
│                                        │ critical         │  │
│                                        │ findings?        │  │
│                                        └──────────────────┘  │
│                                              10:30 AM        │
└─────────────────────────────────────────────────────────────┘
```
- Blue background (#2563eb)
- Right-aligned
- User avatar icon
- Simple text display

### Assistant Message (Basic)
```
┌─────────────────────────────────────────────────────────────┐
│  [💡]                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ I found 3 critical findings in the Finance           │   │
│  │ department. Here are the details:                    │   │
│  │                                                       │   │
│  │ • Finding 1: Budget overrun                          │   │
│  │ • Finding 2: Missing approvals                       │   │
│  │ • Finding 3: Incomplete documentation                │   │
│  └──────────────────────────────────────────────────────┘   │
│  10:31 AM                                                    │
└─────────────────────────────────────────────────────────────┘
```
- Gray background (#f3f4f6)
- Left-aligned
- AI assistant icon
- Markdown formatting support

### Assistant Message (With Full Metadata)
```
┌─────────────────────────────────────────────────────────────┐
│  [💡]                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Based on the analysis, I found **3 critical issues** │   │
│  │ in the Finance department:                           │   │
│  │                                                       │   │
│  │ 1. Budget overrun in Q4                              │   │
│  │ 2. Missing approval signatures                       │   │
│  │ 3. Incomplete audit trail                            │   │
│  │                                                       │   │
│  │ ─────────────────────────────────────────────────    │   │
│  │ ✓ Confidence: 92%                                    │   │
│  │ ⏱ Processed in 2.34s                                 │   │
│  │ ℹ Sources (2):                                       │   │
│  │   [📄 FND-2024-001] [📄 FND-2024-015]               │   │
│  │                                                       │   │
│  │ Follow-up questions:                                 │   │
│  │ • What are the root causes of these issues?          │   │
│  │ • Show me similar findings from last year            │   │
│  │ • Generate a report for these findings               │   │
│  └──────────────────────────────────────────────────────┘   │
│  10:31 AM                                                    │
└─────────────────────────────────────────────────────────────┘
```

## Markdown Support Examples

### Bold and Italic
```
Input:  "This is **bold** and this is *italic*"
Output: "This is bold and this is italic"
        (with proper formatting)
```

### Code Blocks
```
Input:  "Here's some code:\n```javascript\nconst x = 10;\n```"
Output: 
┌──────────────────────┐
│ const x = 10;        │
└──────────────────────┘
(with monospace font and gray background)
```

### Inline Code
```
Input:  "Use the `findById` method"
Output: "Use the findById method"
        (with inline code styling)
```

### Lists
```
Input:  "Key points:\n- Point 1\n- Point 2\n- Point 3"
Output: 
Key points:
  • Point 1
  • Point 2
  • Point 3
```

### Headers
```
Input:  "## Important Section\nContent here"
Output: 
Important Section (larger, bold)
Content here
```

## Metadata Components

### Confidence Score
```
┌─────────────────────────┐
│ ✓ Confidence: 92%       │
└─────────────────────────┘
```
- Checkmark icon
- Percentage display (0-100%)
- Gray text color

### Processing Time
```
┌─────────────────────────┐
│ ⏱ Processed in 2.34s    │
└─────────────────────────┘
```
- Clock icon
- Time in seconds (2 decimals)
- Gray text color

### Source References
```
┌──────────────────────────────────────────┐
│ ℹ Sources (2):                           │
│ [📄 FND-2024-001] [📄 FND-2024-015]     │
└──────────────────────────────────────────┘
```
- Info icon with count
- Clickable badges
- Purple background on hover
- Document icon in each badge

### Follow-up Suggestions
```
┌──────────────────────────────────────────┐
│ Follow-up questions:                     │
│ • What are the root causes?              │
│ • Show me similar findings               │
│ • Generate a report                      │
└──────────────────────────────────────────┘
```
- Up to 3 suggestions shown
- Bullet point format
- Purple text color
- Clickable (future enhancement)

## Color Scheme

### User Messages
- Background: `bg-blue-600` (#2563eb)
- Text: `text-white` (#ffffff)
- Avatar: `bg-blue-100` (#dbeafe)
- Avatar Icon: `text-blue-600` (#2563eb)

### Assistant Messages
- Background: `bg-gray-100` (#f3f4f6)
- Text: `text-gray-900` (#111827)
- Avatar: `bg-purple-100` (#f3e8ff)
- Avatar Icon: `text-purple-600` (#9333ea)

### Metadata
- Text: `text-gray-600` (#4b5563)
- Source Badges: `bg-purple-50` (#faf5ff)
- Source Badge Text: `text-purple-700` (#7e22ce)
- Source Badge Border: `border-purple-200` (#e9d5ff)
- Source Badge Hover: `bg-purple-100` (#f3e8ff)

### Code Blocks
- User Message Code: `bg-blue-700` (#1d4ed8)
- Assistant Message Code: `bg-gray-200` (#e5e7eb)
- Font: `font-mono` (monospace)

## Responsive Behavior

### Desktop (> 1024px)
- Full width messages up to max-w-3xl (48rem)
- All metadata visible
- Source badges in single row

### Tablet (768px - 1024px)
- Slightly narrower messages
- Metadata stacks vertically
- Source badges may wrap

### Mobile (< 768px)
- Full width messages
- Compact metadata display
- Source badges wrap to multiple rows
- Smaller font sizes

## Interaction States

### Source Badge Hover
```
Normal:  [📄 FND-2024-001]  (purple-50 background)
Hover:   [📄 FND-2024-001]  (purple-100 background)
```

### Source Badge Click
- Navigates to: `/findings?id=FND-2024-001`
- Findings page highlights the specific finding
- Smooth scroll to finding location

## Accessibility Features

### Keyboard Navigation
- Source badges are focusable with Tab key
- Enter/Space activates source navigation
- Proper focus indicators

### Screen Readers
- Avatar icons have descriptive labels
- Metadata sections have clear labels
- Source badges announce as "View finding [ID]"
- Timestamps are properly formatted

### Color Contrast
- All text meets WCAG AA standards
- Minimum 4.5:1 contrast ratio
- Icons have sufficient contrast

## Usage in ChatInterface

The ChatMessage component is used within ChatInterface like this:

```tsx
<div className="max-w-3xl mx-auto space-y-6">
  {currentSession.messages.map((msg) => (
    <ChatMessage key={msg.id} message={msg} />
  ))}
</div>
```

Each message is rendered with proper spacing (space-y-6 = 1.5rem gap) and centered within a max-width container.

## Performance Notes

- Markdown parsing is done on render
- Typical message (< 500 chars) parses in < 1ms
- Source badges render efficiently
- No unnecessary re-renders
- Component is memoization-ready

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support
- IE11: Not supported (uses modern CSS)

## Future Enhancements

1. **Streaming Support**: Show messages as they're generated
2. **Copy Button**: Copy message content to clipboard
3. **Edit/Delete**: Allow message modification
4. **Reactions**: Add emoji reactions
5. **Threading**: Support message threads
6. **Rich Media**: Support images and videos
7. **Syntax Highlighting**: Color-coded code blocks
8. **Link Previews**: Show preview cards for URLs
