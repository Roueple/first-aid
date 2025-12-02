# FIRST-AID API Specification

## Overview
Comprehensive API specification for the FIRST-AID intelligent audit findings management system, including RESTful endpoints, WebSocket events, and integration patterns for privacy-protected AI operations.

---

## Authentication & Authorization

### Authentication Endpoints

#### **POST** `/auth/login`
User authentication with email/password or SSO.

**Request:**
```json
{
  "email": "user@company.com",
  "password": "securePassword123",
  "rememberMe": true
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "user@company.com",
    "name": "John Doe",
    "role": "auditor",
    "lastLogin": "2024-01-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600
  }
}
```

#### **POST** `/auth/logout`
Invalidate user session and tokens.

**Headers:** `Authorization: Bearer {accessToken}`

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

#### **POST** `/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### **GET** `/auth/profile`
Get current user profile.

**Headers:** `Authorization: Bearer {accessToken}`

**Response (200):**
```json
{
  "id": "user123",
  "email": "user@company.com",
  "name": "John Doe",
  "role": "auditor",
  "department": "Internal Audit",
  "preferences": {
    "language": "en",
    "timezone": "Asia/Jakarta",
    "notifications": true
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLogin": "2024-01-15T10:30:00Z"
}
```

---

## Findings Management

### Findings Endpoints

#### **GET** `/api/findings`
Retrieve audit findings with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `severity` (string): Filter by severity (Critical|High|Medium|Low)
- `status` (string): Filter by status (Open|In Progress|Closed|Deferred)
- `location` (string): Filter by location
- `category` (string): Filter by category
- `dateFrom` (ISO date): Filter from date
- `dateTo` (ISO date): Filter to date
- `search` (string): Text search in title/description
- `sort` (string): Sort field (dateCreated|severity|status)
- `order` (string): Sort order (asc|desc)

**Example Request:**
```
GET /api/findings?page=1&limit=20&severity=High&status=Open&sort=dateCreated&order=desc
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "findings": [
      {
        "id": "finding_001",
        "title": "Inventory Management Process Gap",
        "description": "Significant gaps identified in inventory tracking...",
        "severity": "High",
        "status": "Open",
        "category": "Operations",
        "subcategory": "Inventory Management",
        "location": "Jakarta",
        "branch": "Jakarta Central",
        "department": "Warehouse",
        "responsiblePerson": "Budi Santoso",
        "reviewerPerson": "Ahmad Rahman",
        "dateIdentified": "2024-01-10T00:00:00Z",
        "dateDue": "2024-02-10T00:00:00Z",
        "dateCreated": "2024-01-15T10:30:00Z",
        "dateUpdated": "2024-01-15T14:20:00Z",
        "recommendation": "Implement automated inventory tracking system...",
        "managementResponse": "Management agrees with the finding...",
        "actionPlan": "1. Evaluate current system...",
        "evidence": [
          "screenshot_001.png",
          "document_001.pdf"
        ],
        "tags": ["inventory", "automation", "high-priority"],
        "riskLevel": 8,
        "originalSource": "Audit_Report_2024_Q1.xlsx"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 15,
      "totalItems": 287,
      "itemsPerPage": 20,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "applied": {
        "severity": "High",
        "status": "Open"
      },
      "available": {
        "severities": ["Critical", "High", "Medium", "Low"],
        "statuses": ["Open", "In Progress", "Closed", "Deferred"],
        "locations": ["Jakarta", "Bandung", "Surabaya"],
        "categories": ["Operations", "Financial", "IT", "Compliance"]
      }
    }
  }
}
```

#### **GET** `/api/findings/{id}`
Get specific finding by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "finding": {
      "id": "finding_001",
      "title": "Inventory Management Process Gap",
      // ... full finding object with all fields
      "auditTrail": [
        {
          "action": "created",
          "user": "system",
          "timestamp": "2024-01-15T10:30:00Z",
          "details": "Finding imported from Excel"
        },
        {
          "action": "updated",
          "user": "john.doe@company.com",
          "timestamp": "2024-01-15T14:20:00Z",
          "details": "Added management response"
        }
      ],
      "relatedFindings": [
        {
          "id": "finding_045",
          "title": "Similar inventory issue in Bandung",
          "similarity": 0.85
        }
      ]
    }
  }
}
```

#### **POST** `/api/findings`
Create new audit finding.

**Request:**
```json
{
  "title": "New Audit Finding",
  "description": "Detailed description of the finding...",
  "severity": "Medium",
  "category": "Operations",
  "subcategory": "Process Management",
  "location": "Surabaya",
  "branch": "Surabaya East",
  "department": "Operations",
  "responsiblePerson": "Siti Nurhaliza",
  "dateIdentified": "2024-01-20T00:00:00Z",
  "dateDue": "2024-03-20T00:00:00Z",
  "recommendation": "Implement process improvements...",
  "tags": ["process", "improvement"],
  "riskLevel": 6
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "finding": {
      "id": "finding_new_001",
      "title": "New Audit Finding",
      // ... complete finding object
      "dateCreated": "2024-01-20T15:30:00Z",
      "dateUpdated": "2024-01-20T15:30:00Z"
    }
  }
}
```

#### **PUT** `/api/findings/{id}`
Update existing finding.

**Request:**
```json
{
  "status": "In Progress",
  "managementResponse": "Management acknowledges the finding and will implement corrective actions...",
  "actionPlan": "1. Form a task force...\n2. Conduct detailed analysis...",
  "dateUpdated": "2024-01-20T16:00:00Z"
}
```

#### **DELETE** `/api/findings/{id}`
Soft delete finding (marks as deleted, doesn't remove from database).

**Response (200):**
```json
{
  "success": true,
  "message": "Finding marked as deleted"
}
```

#### **POST** `/api/findings/import`
Bulk import findings from Excel files.

**Request (multipart/form-data):**
- `files`: Array of Excel files
- `mapping`: JSON mapping configuration
- `options`: Import options

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "import_job_001",
    "status": "processing",
    "estimatedTime": "2-3 minutes",
    "filesCount": 5
  }
}
```

#### **GET** `/api/findings/import/{jobId}`
Check import job status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "import_job_001",
    "status": "completed",
    "progress": 100,
    "results": {
      "totalProcessed": 287,
      "successful": 285,
      "failed": 2,
      "duplicates": 12
    },
    "errors": [
      {
        "row": 45,
        "file": "audit_report_2024.xlsx",
        "error": "Invalid date format",
        "details": "Date field 'dateIdentified' contains invalid value"
      }
    ]
  }
}
```

---

## Search & AI Operations

### Search Endpoints

#### **POST** `/api/search`
Structured search with filters and sorting.

**Request:**
```json
{
  "query": "inventory management",
  "filters": {
    "severity": ["High", "Critical"],
    "location": ["Jakarta", "Bandung"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  },
  "sort": {
    "field": "relevance",
    "order": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "finding": {
          "id": "finding_001",
          "title": "Inventory Management Process Gap",
          // ... finding object
        },
        "relevance": 0.95,
        "highlights": {
          "title": "**Inventory Management** Process Gap",
          "description": "...gaps in **inventory** tracking system..."
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 47
    },
    "searchMetadata": {
      "query": "inventory management",
      "processingTime": "0.15s",
      "totalMatches": 47
    }
  }
}
```

#### **POST** `/api/search/natural`
Natural language search using AI.

**Request:**
```json
{
  "query": "Show me all high-risk inventory issues in Jakarta from 2024",
  "includeInsights": true,
  "maxResults": 50
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "interpretation": {
      "intent": "search_findings",
      "entities": {
        "risk_level": "high",
        "category": "inventory",
        "location": "Jakarta",
        "time_period": "2024"
      },
      "confidence": 0.92
    },
    "results": [
      // ... array of matching findings
    ],
    "insights": [
      {
        "type": "pattern",
        "title": "Recurring Inventory Issues",
        "description": "5 inventory-related findings identified in Jakarta, suggesting systemic issues",
        "confidence": 0.88
      }
    ],
    "suggestions": [
      "Would you like to see recommendations for addressing these inventory issues?",
      "Should I analyze patterns across other locations?"
    ]
  }
}
```

### AI Chat Endpoints

#### **POST** `/api/chat`
AI-powered conversational interface for audit insights.

**Request:**
```json
{
  "message": "What are the most common audit findings in our Jakarta office?",
  "sessionId": "chat_session_001",
  "context": {
    "includePatterns": true,
    "includeTrends": true,
    "timeRange": "last_12_months"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "response": {
      "message": "Based on the audit data, I've identified the most common findings in your Jakarta office:\n\n**Top 3 Common Issues:**\n\n1. **Inventory Management** (5 occurrences)\n   - Responsible: Budi Santoso, Ahmad Rahman, Siti Nur\n   - Risk Level: High\n   - Pattern: Recurring quarterly\n\n2. **Procurement Documentation** (4 occurrences)\n   - Common in branch offices\n   - Risk Level: Medium\n   - Trend: Increasing in Q4\n\n3. **Financial Reporting Delays** (3 occurrences)\n   - Cross-departmental issue\n   - Risk Level: High\n   - Impact: Regulatory compliance\n\n**Recommendations:**\n- Prioritize inventory management system upgrade\n- Implement procurement documentation checklist\n- Establish financial reporting automation",
      "confidence": 0.94,
      "processingTime": "2.3s"
    },
    "sources": [
      {
        "findingId": "finding_001",
        "relevance": 0.95,
        "excerpt": "Inventory Management Process Gap"
      },
      {
        "findingId": "finding_023",
        "relevance": 0.89,
        "excerpt": "Procurement Documentation Missing"
      }
    ],
    "visualizations": [
      {
        "type": "bar_chart",
        "title": "Common Issues by Category",
        "data": {
          "labels": ["Inventory", "Procurement", "Financial"],
          "values": [5, 4, 3]
        }
      }
    ],
    "followUpSuggestions": [
      "Would you like me to analyze the root causes of these inventory issues?",
      "Should I compare Jakarta's patterns with other offices?",
      "Do you want specific recommendations for each issue?"
    ],
    "metadata": {
      "sessionId": "chat_session_001",
      "messageId": "msg_001",
      "timestamp": "2024-01-20T16:30:00Z",
      "privacyProtected": true
    }
  }
}
```

#### **GET** `/api/chat/sessions`
List user's chat sessions.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "chat_session_001",
        "title": "Jakarta Office Analysis",
        "lastMessage": "What are the most common audit findings...",
        "messageCount": 8,
        "createdAt": "2024-01-20T15:00:00Z",
        "updatedAt": "2024-01-20T16:30:00Z",
        "isActive": true
      }
    ]
  }
}
```

#### **GET** `/api/chat/sessions/{sessionId}`
Get chat session history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "chat_session_001",
      "title": "Jakarta Office Analysis",
      "messages": [
        {
          "id": "msg_001",
          "role": "user",
          "content": "What are the most common audit findings in our Jakarta office?",
          "timestamp": "2024-01-20T16:30:00Z"
        },
        {
          "id": "msg_002",
          "role": "assistant",
          "content": "Based on the audit data, I've identified...",
          "timestamp": "2024-01-20T16:30:15Z",
          "metadata": {
            "confidence": 0.94,
            "sources": ["finding_001", "finding_023"],
            "processingTime": "2.3s"
          }
        }
      ],
      "createdAt": "2024-01-20T15:00:00Z",
      "updatedAt": "2024-01-20T16:30:00Z"
    }
  }
}
```

### Insights & Patterns

#### **GET** `/api/insights`
Get AI-generated insights from audit data.

**Query Parameters:**
- `type` (string): insight type (trends|patterns|anomalies|predictions)
- `timeRange` (string): time period (last_30_days|last_quarter|last_year)
- `location` (string): filter by location
- `category` (string): filter by category

**Response (200):**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "insight_001",
        "type": "trend",
        "title": "Increasing Financial Compliance Issues",
        "summary": "Financial compliance findings have increased 40% compared to last quarter",
        "confidence": 0.89,
        "impact": "High",
        "generatedAt": "2024-01-20T12:00:00Z",
        "details": {
          "currentPeriod": {
            "count": 14,
            "period": "Q1 2024"
          },
          "previousPeriod": {
            "count": 10,
            "period": "Q4 2023"
          },
          "changePercentage": 40
        },
        "recommendations": [
          "Review financial compliance training program",
          "Implement additional controls in high-risk areas"
        ],
        "supportingFindings": ["finding_089", "finding_095", "finding_101"]
      }
    ],
    "summary": {
      "totalInsights": 12,
      "highImpact": 3,
      "mediumImpact": 6,
      "lowImpact": 3
    }
  }
}
```

#### **GET** `/api/patterns`
Get detected patterns in audit findings.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "id": "pattern_001",
        "type": "geographic",
        "title": "Regional Inventory Management Issues",
        "description": "Inventory management issues consistently appear in branch offices",
        "confidence": 0.92,
        "occurrences": 8,
        "affectedFindings": [
          "finding_001", "finding_045", "finding_078"
        ],
        "detectedAt": "2024-01-20T10:00:00Z",
        "severity": "High",
        "analysis": {
          "locations": ["Jakarta", "Bandung", "Surabaya"],
          "timePattern": "Quarterly cycles",
          "commonFactors": ["Manual processes", "Limited training"]
        },
        "recommendations": [
          "Standardize inventory procedures across branches",
          "Implement centralized training program"
        ]
      }
    ]
  }
}
```

---

## Report Generation

#### **POST** `/api/reports/generate`
Generate custom reports from audit findings.

**Request:**
```json
{
  "type": "summary_report",
  "title": "Q1 2024 Audit Summary",
  "criteria": {
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-03-31"
    },
    "locations": ["Jakarta", "Bandung"],
    "severities": ["High", "Critical"],
    "includePatterns": true,
    "includeRecommendations": true
  },
  "format": "pdf",
  "template": "executive_summary",
  "options": {
    "includeCharts": true,
    "includeRawData": false,
    "language": "en"
  }
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "reportId": "report_001",
    "status": "generating",
    "estimatedTime": "30-60 seconds",
    "progress": 0
  }
}
```

#### **GET** `/api/reports/{reportId}/status`
Check report generation status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reportId": "report_001",
    "status": "completed",
    "progress": 100,
    "downloadUrl": "/api/reports/report_001/download",
    "metadata": {
      "title": "Q1 2024 Audit Summary",
      "format": "pdf",
      "fileSize": "2.4 MB",
      "pageCount": 15,
      "generatedAt": "2024-01-20T17:00:00Z",
      "expiresAt": "2024-01-27T17:00:00Z"
    }
  }
}
```

#### **GET** `/api/reports/{reportId}/download`
Download generated report.

**Response (200):**
- Content-Type: application/pdf (or appropriate MIME type)
- Content-Disposition: attachment; filename="Q1_2024_Audit_Summary.pdf"
- Binary file content

#### **GET** `/api/reports`
List available reports for user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "report_001",
        "title": "Q1 2024 Audit Summary",
        "type": "summary_report",
        "format": "pdf",
        "status": "completed",
        "fileSize": "2.4 MB",
        "generatedAt": "2024-01-20T17:00:00Z",
        "expiresAt": "2024-01-27T17:00:00Z",
        "downloadCount": 3
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

---

## Data Export

#### **POST** `/api/export`
Export findings data in various formats.

**Request:**
```json
{
  "format": "excel",
  "criteria": {
    "findingIds": ["finding_001", "finding_002"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    },
    "includeMetadata": true,
    "includeAuditTrail": false
  },
  "options": {
    "fileName": "audit_findings_2024",
    "includeCharts": false,
    "sheetStructure": "by_category"
  }
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "exportId": "export_001",
    "status": "processing",
    "estimatedTime": "1-2 minutes"
  }
}
```

#### **GET** `/api/export/{exportId}/download`
Download exported data file.

---

## System & Metadata

#### **GET** `/api/metadata/filters`
Get available filter options for findings.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "severities": [
      {"value": "Critical", "count": 12, "color": "#dc2626"},
      {"value": "High", "count": 45, "color": "#ea580c"},
      {"value": "Medium", "count": 128, "color": "#ca8a04"},
      {"value": "Low", "count": 89, "color": "#65a30d"}
    ],
    "statuses": [
      {"value": "Open", "count": 156},
      {"value": "In Progress", "count": 78},
      {"value": "Closed", "count": 89},
      {"value": "Deferred", "count": 12}
    ],
    "locations": [
      {"value": "Jakarta", "count": 125},
      {"value": "Bandung", "count": 67},
      {"value": "Surabaya", "count": 89}
    ],
    "categories": [
      {"value": "Operations", "count": 98},
      {"value": "Financial", "count": 76},
      {"value": "IT", "count": 45},
      {"value": "Compliance", "count": 56}
    ],
    "dateRanges": {
      "earliest": "2023-01-15T00:00:00Z",
      "latest": "2024-01-20T00:00:00Z"
    }
  }
}
```

#### **GET** `/api/stats/dashboard`
Get dashboard statistics and metrics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalFindings": 287,
      "openFindings": 156,
      "highRiskFindings": 57,
      "overdueFindings": 23
    },
    "trends": {
      "newThisMonth": 12,
      "closedThisMonth": 8,
      "trendDirection": "increasing",
      "changePercentage": 15
    },
    "riskDistribution": {
      "Critical": 12,
      "High": 45,
      "Medium": 128,
      "Low": 89
    },
    "locationSummary": [
      {"location": "Jakarta", "total": 125, "open": 67},
      {"location": "Bandung", "total": 67, "open": 34},
      {"location": "Surabaya", "total": 89, "open": 45}
    ],
    "recentActivity": [
      {
        "type": "finding_created",
        "title": "New procurement finding",
        "user": "John Doe",
        "timestamp": "2024-01-20T16:00:00Z"
      }
    ]
  }
}
```

---

## WebSocket Events

### Real-time Updates

**Connection:** `wss://api.firstaid.com/ws`

**Authentication:** Send access token after connection:
```json
{
  "type": "auth",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Event Types

#### **finding:created**
New finding added to system.
```json
{
  "type": "finding:created",
  "data": {
    "finding": {
      "id": "finding_new_001",
      "title": "New Audit Finding",
      // ... complete finding object
    },
    "user": "john.doe@company.com",
    "timestamp": "2024-01-20T17:00:00Z"
  }
}
```

#### **finding:updated**
Existing finding modified.
```json
{
  "type": "finding:updated",
  "data": {
    "findingId": "finding_001",
    "changes": {
      "status": {"from": "Open", "to": "In Progress"},
      "managementResponse": {"from": null, "to": "Management response..."}
    },
    "finding": {
      // ... updated finding object
    },
    "user": "jane.smith@company.com",
    "timestamp": "2024-01-20T17:05:00Z"
  }
}
```

#### **chat:response**
AI chat response received.
```json
{
  "type": "chat:response",
  "data": {
    "sessionId": "chat_session_001",
    "messageId": "msg_002",
    "response": "Based on your data...",
    "confidence": 0.94,
    "processingTime": "2.3s",
    "timestamp": "2024-01-20T17:10:00Z"
  }
}
```

#### **report:generated**
Report generation completed.
```json
{
  "type": "report:generated",
  "data": {
    "reportId": "report_001",
    "title": "Q1 2024 Audit Summary",
    "status": "completed",
    "downloadUrl": "/api/reports/report_001/download",
    "user": "admin@company.com",
    "timestamp": "2024-01-20T17:15:00Z"
  }
}
```

#### **system:notification**
System-wide notifications.
```json
{
  "type": "system:notification",
  "data": {
    "level": "info",
    "title": "System Maintenance",
    "message": "Scheduled maintenance will occur tonight at 11 PM",
    "action": {
      "type": "url",
      "label": "Learn More",
      "url": "/maintenance-notice"
    },
    "timestamp": "2024-01-20T17:20:00Z",
    "expiresAt": "2024-01-21T06:00:00Z"
  }
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-01-20T17:25:00Z",
    "requestId": "req_abc123"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service issue |
| `AI_SERVICE_ERROR` | 502 | AI service unavailable |
| `PRIVACY_VIOLATION` | 400 | Privacy protection failed |

### Error Examples

#### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "severity": "Value must be one of: Critical, High, Medium, Low",
      "dateIdentified": "Date must be in ISO 8601 format"
    }
  }
}
```

#### AI Service Error
```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "AI service temporarily unavailable",
    "details": {
      "service": "openai",
      "fallback": "gemini",
      "retryAfter": 30
    }
  }
}
```

---

## Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Rate Limit | Window |
|---------------|------------|---------|
| Authentication | 10 requests | 1 minute |
| Search | 60 requests | 1 minute |
| AI Chat | 20 requests | 1 minute |
| Report Generation | 5 requests | 1 hour |
| File Upload | 10 requests | 1 hour |
| General API | 100 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642694400
X-RateLimit-Window: 60
```

---

## API Versioning

### Version Strategy
- Current version: `v1`
- Base URL: `https://api.firstaid.com/v1`
- Backwards compatibility maintained for 12 months
- Breaking changes introduced in new major versions

### Version Headers
```
API-Version: v1
Accept: application/json; version=1.0
```

---

## Privacy & Security

### Data Protection
- All sensitive data pseudonymized before AI processing
- Real names/IDs/amounts never sent to external AI services
- Complete audit trail of data access and transformations
- Automatic data anonymization for AI training opt-out

### Security Headers
```
Authorization: Bearer {accessToken}
X-CSRF-Token: {csrfToken}
X-Request-ID: {uniqueRequestId}
Content-Type: application/json
```

### HTTPS Requirements
- All API endpoints require HTTPS
- TLS 1.3 minimum version
- Certificate pinning recommended for mobile apps
- HSTS headers enforced

This API specification provides a comprehensive foundation for building secure, scalable, and privacy-protected audit findings management with AI-powered capabilities.