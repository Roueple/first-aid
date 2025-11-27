# Audit Log Viewer User Guide

## Overview

The Audit Log Viewer is a powerful tool for administrators to monitor and track all user actions and system events within the FIRST-AID system. This guide will help you understand how to use the viewer effectively.

## Accessing the Audit Log Viewer

1. Log in to the FIRST-AID system
2. From the home page, click the **🔍 Audit Logs** button
3. The audit log viewer will load automatically

## Understanding the Interface

### Main Components

#### 1. Header Section
- **Title**: "Audit Log Viewer"
- **Description**: Brief explanation of the viewer's purpose
- **Back to Home**: Button to return to the home page

#### 2. Filters Section
Located in a gray box at the top of the viewer:

**Action Filters**
- Click on action buttons to filter by specific actions
- Available actions:
  - `login` - User login events
  - `logout` - User logout events
  - `create` - Resource creation events
  - `update` - Resource update events
  - `delete` - Resource deletion events
  - `export` - Data export events
  - `ai_query` - AI chat queries
  - `import` - Data import events
  - `report_generate` - Report generation events
  - `report_download` - Report download events
- Selected filters appear with a blue background
- Click again to deselect

**Resource Type Filters**
- Click on resource type buttons to filter by resource
- Available types:
  - `finding` - Audit findings
  - `report` - Generated reports
  - `chat` - Chat sessions
  - `user` - User accounts
  - `pattern` - Detected patterns
  - `session` - User sessions
- Selected filters appear with a green background
- Click again to deselect

**Date Range Filter**
- Select a start date using the first date picker
- Select an end date using the second date picker
- Click the **Apply** button to filter logs within the date range
- The Apply button is disabled until both dates are selected

**Filter Actions**
- **Clear All Filters**: Removes all active filters and shows all logs
- **Refresh**: Reloads logs with current filters applied

#### 3. Export Section
- Shows the count of currently displayed logs
- **Export to CSV** button: Downloads all displayed logs as a CSV file
- Button is disabled when no logs are available
- CSV filename includes timestamp: `audit-logs-{timestamp}.csv`

#### 4. Logs Table
Displays audit logs in a structured table format:

**Columns:**
1. **Timestamp**: When the action occurred (formatted as local date/time)
2. **User ID**: Truncated user identifier (first 8 characters)
3. **Action**: Type of action performed (color-coded badge)
4. **Resource Type**: Type of resource affected (color-coded badge)
5. **Resource ID**: Truncated resource identifier (first 8 characters)
6. **IP Address**: IP address from which the action was performed
7. **Details**: Expandable section with additional information

**Details Section:**
- Click "View Details" to expand
- Shows JSON-formatted additional information
- Includes action-specific metadata
- Click again to collapse

## Common Use Cases

### 1. Viewing Recent Activity
**Goal**: See what's been happening in the system recently

**Steps:**
1. Open the Audit Log Viewer
2. Logs are automatically sorted by most recent first
3. Scroll through the table to review recent actions

### 2. Tracking User Login Activity
**Goal**: Monitor user authentication events

**Steps:**
1. Click the `login` action filter button (turns blue)
2. Review the filtered list of login events
3. Check timestamps and IP addresses for suspicious activity
4. Click `logout` filter to also see logout events

### 3. Monitoring Data Changes
**Goal**: Track who created, updated, or deleted findings

**Steps:**
1. Click the `finding` resource type filter (turns green)
2. Click the `create`, `update`, or `delete` action filters
3. Review the list of changes
4. Expand details to see what was changed

### 4. Auditing AI Usage
**Goal**: Track AI chat queries for compliance

**Steps:**
1. Click the `ai_query` action filter
2. Review the list of AI queries
3. Check details for query length and response time
4. Export to CSV for reporting

### 5. Generating Compliance Reports
**Goal**: Export audit logs for compliance documentation

**Steps:**
1. Apply desired filters (date range, actions, resource types)
2. Review the filtered logs
3. Click **Export to CSV**
4. Save the downloaded file
5. Open in Excel or other spreadsheet software

### 6. Investigating Specific Time Periods
**Goal**: Review activity during a specific date range

**Steps:**
1. Select start date in the first date picker
2. Select end date in the second date picker
3. Click **Apply**
4. Review logs from that time period
5. Combine with other filters as needed

### 7. Tracking Report Generation
**Goal**: Monitor who generated and downloaded reports

**Steps:**
1. Click `report_generate` and `report_download` action filters
2. Review the list of report activities
3. Check details for report format and criteria
4. Export for audit trail

## Tips and Best Practices

### Filtering Tips
1. **Combine Filters**: Use multiple filters together for precise results
   - Example: `login` action + specific date range
2. **Start Broad**: Begin with fewer filters and narrow down as needed
3. **Clear Regularly**: Use "Clear All Filters" to start fresh
4. **Refresh Often**: Click Refresh to see the latest logs

### Export Tips
1. **Filter First**: Apply filters before exporting to get relevant data
2. **Date Range**: Use date ranges to limit export size
3. **Regular Exports**: Export logs regularly for backup
4. **Naming Convention**: Rename downloaded files with descriptive names

### Performance Tips
1. **Use Date Ranges**: Limit queries to specific time periods
2. **Specific Filters**: Use action and resource type filters to reduce results
3. **Regular Cleanup**: Review and archive old logs periodically

### Security Tips
1. **Monitor Login Failures**: Watch for unusual login patterns
2. **Track Deletions**: Review delete actions regularly
3. **Check IP Addresses**: Look for unexpected IP addresses
4. **Export Regularly**: Maintain audit trail backups

## Understanding Log Details

### Common Detail Fields

**Login Events:**
```json
{
  "loginMethod": "email",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

**Finding Updates:**
```json
{
  "changedFields": ["status", "severity"]
}
```

**AI Queries:**
```json
{
  "queryLength": 150,
  "responseTime": 2500,
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

**Report Generation:**
```json
{
  "format": "pdf",
  "criteria": {
    "dateRange": "2024-01-01 to 2024-01-31",
    "severity": "High"
  }
}
```

**Import Events:**
```json
{
  "findingsCount": 100,
  "successCount": 95,
  "failureCount": 5,
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## CSV Export Format

The exported CSV file contains the following columns:

```csv
Timestamp,User ID,Action,Resource Type,Resource ID,IP Address,Details
2024-01-01T10:00:00.000Z,user123,login,user,user123,192.168.1.1,"{""loginMethod"":""email""}"
```

### Opening in Excel
1. Open Excel
2. Go to File > Open
3. Select the downloaded CSV file
4. Data will be automatically formatted into columns
5. Use Excel's filtering and sorting features for analysis

## Troubleshooting

### No Logs Displayed
**Problem**: Table shows "No audit logs found"

**Solutions:**
1. Check if filters are too restrictive
2. Click "Clear All Filters" to reset
3. Verify date range is correct
4. Click "Refresh" to reload

### Export Button Disabled
**Problem**: Cannot click Export to CSV button

**Solution:**
- The button is disabled when no logs are displayed
- Apply filters to show logs, then export

### Loading Takes Too Long
**Problem**: Logs take a long time to load

**Solutions:**
1. Use date range filters to limit results
2. Apply specific action or resource type filters
3. Check internet connection
4. Refresh the page

### Details Not Showing
**Problem**: Details section is empty

**Solution:**
- Some logs may not have additional details
- This is normal for simple actions like login/logout

## Keyboard Shortcuts

- **Tab**: Navigate between filter buttons and inputs
- **Enter**: Apply date range filter (when date inputs are focused)
- **Space**: Toggle filter buttons (when focused)
- **Escape**: Close expanded details sections

## Accessibility Features

- Screen reader support for all table content
- Keyboard navigation for all interactive elements
- High contrast color scheme for visibility
- Clear visual feedback for selected filters
- Descriptive button labels and ARIA attributes

## Related Documentation

- [Audit Service README](../src/services/AuditService.README.md)
- [AuditLogViewer Component README](../src/components/AuditLogViewer.README.md)
- [Task 14.3 Completion Report](./task-14.3-completion-report.md)

## Support

For issues or questions about the Audit Log Viewer:
1. Check this guide for common solutions
2. Review the technical documentation
3. Contact your system administrator
4. Report bugs to the development team

---

**Last Updated**: Task 14.3 Completion  
**Version**: 1.0.0  
**Requirements**: 10.5
