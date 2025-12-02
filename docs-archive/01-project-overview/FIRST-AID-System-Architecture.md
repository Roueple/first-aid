# FIRST-AID System Architecture Design

## Overview
FIRST-AID is an intelligent audit findings management system that transforms scattered Excel files into a searchable knowledge base with AI-powered chat capabilities and privacy-protected data processing.

## Architecture Principles

### 🎯 **Core Principles**
- **Privacy-First**: Real data never exposed to external AI services
- **AI-Powered Intelligence**: Natural language search and conversational insights
- **Scalable & Cost-Effective**: Firebase serverless architecture
- **Simple Access Model**: Unified permissions for all users
- **Multi-Platform Ready**: Desktop-first, mobile-ready architecture

### 🔒 **Security & Privacy Architecture**
- **Pseudonymization Layer**: Real names/IDs/amounts mapped to anonymous tokens
- **Data Isolation**: Clear separation between raw data and AI processing
- **Audit Trail**: Complete logging of data access and transformations
- **Encryption**: End-to-end encryption for data at rest and in transit

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FIRST-AID SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │  Privacy Layer  │    │   Firebase      │
│                 │    │                 │    │   Backend       │
│ • Desktop (Qt)  │◄──►│ • Pseudonymizer │◄──►│                 │
│ • Web (React)   │    │ • Token Mapper  │    │ • Firestore     │
│ • Mobile (RN)   │    │ • Data Sanitizer│    │ • Functions     │
└─────────────────┘    └─────────────────┘    │ • Auth          │
                                              └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │   AI Services   │◄───────────┘
                       │                 │
                       │ • OpenAI GPT-4o │
                       │ • Google Gemini │
                       │ • Vector Store  │
                       └─────────────────┘
```

### **Data Flow Architecture**

```
Raw Data (Excel) → Privacy Mapping → Firestore → AI Processing → Results Mapping → User Interface
     ↓                   ↓              ↓            ↓              ↓              ↓
   173 Files        Anonymous IDs    Secure Store   Safe AI      Real Names    Dashboard
```

---

## Core Components

### 1. **Privacy Protection Layer**

#### **Pseudonymization Engine**
```typescript
interface PseudonymizerService {
  // Core mapping functions
  createMapping(realData: RealEntity[]): MappingTable
  pseudonymize(data: any): PseudonymizedData
  depseudonymize(results: any): RealResults
  
  // Security functions
  encryptMapping(mapping: MappingTable): EncryptedMapping
  validateIntegrity(data: any): boolean
}

interface MappingTable {
  names: Map<string, string>      // "Budi Santoso" → "Person_A"
  ids: Map<string, string>        // "EMP-12345" → "ID_001"
  amounts: Map<number, string>    // 1500000 → "Amount_001"
  locations: Map<string, string>  // "Jakarta" → "Location_A"
}
```

#### **Data Sanitization Pipeline**
```typescript
interface DataSanitizer {
  sanitizeForAI(findings: Finding[]): SanitizedFinding[]
  preserveStructure(data: any): StructuredData
  validateSafety(data: any): SafetyReport
}
```

### 2. **AI Chat & RAG System**

#### **Retrieval Augmented Generation (RAG)**
```typescript
interface RAGService {
  // Vector operations
  createEmbeddings(documents: Document[]): VectorEmbedding[]
  performSimilaritySearch(query: string): RelevantDocument[]
  
  // Chat operations
  processQuery(query: string, context: Document[]): AIResponse
  generateInsights(findings: Finding[]): Insight[]
  detectPatterns(findings: Finding[]): Pattern[]
}

interface AIResponse {
  answer: string
  confidence: number
  sources: DocumentReference[]
  suggestions: string[]
}
```

#### **Pattern Detection Engine**
```typescript
interface PatternDetector {
  findRecurringIssues(findings: Finding[]): RecurrentPattern[]
  analyzeGeographicTrends(findings: Finding[]): GeographicInsight[]
  identifyRiskFactors(findings: Finding[]): RiskAnalysis
  trackTemporalPatterns(findings: Finding[]): TimeBasedPattern[]
}
```

### 3. **Data Management Layer**

#### **Firestore Schema Design**
```typescript
// Collections structure
interface DatabaseSchema {
  findings: Collection<Finding>
  mappings: Collection<MappingRecord>
  users: Collection<User>
  chatSessions: Collection<ChatSession>
  reports: Collection<Report>
  auditLogs: Collection<AuditLog>
}

interface Finding {
  id: string
  title: string
  description: string
  severity: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Closed'
  location: string
  responsiblePerson: string
  dateCreated: Timestamp
  dateUpdated: Timestamp
  category: string
  tags: string[]
  originalFileSource: string
  
  // Pseudonymized versions for AI processing
  pseudonymizedData?: PseudonymizedData
}
```

#### **Cloud Functions Architecture**
```typescript
// Core function endpoints
interface CloudFunctions {
  // Data processing
  importExcelData(files: ExcelFile[]): Promise<ImportResult>
  pseudonymizeData(findings: Finding[]): Promise<PseudonymizedFinding[]>
  
  // AI operations
  processChatQuery(query: ChatQuery): Promise<ChatResponse>
  generateInsights(findingIds: string[]): Promise<Insight[]>
  detectPatterns(): Promise<Pattern[]>
  
  // Reporting
  generateReport(criteria: ReportCriteria): Promise<Report>
  exportData(format: ExportFormat): Promise<ExportedData>
  
  // Search
  searchFindings(query: SearchQuery): Promise<SearchResult[]>
  performRAGSearch(nlQuery: string): Promise<RAGResult>
}
```

### 4. **User Interface Layer**

#### **Desktop Application (Qt/C++)**
```cpp
class MainWindow : public QMainWindow {
private:
    DashboardWidget* dashboard;
    ChatWidget* aiChat;
    SearchWidget* search;
    ReportWidget* reports;
    SettingsWidget* settings;
    
    FirebaseConnector* firebase;
    AuthManager* auth;
    
public slots:
    void onChatQuery(const QString& query);
    void onSearchRequest(const SearchCriteria& criteria);
    void onReportGeneration(const ReportType& type);
};
```

#### **Web Application (React/TypeScript)**
```typescript
interface AppComponents {
  Dashboard: React.FC<DashboardProps>
  ChatInterface: React.FC<ChatProps>
  SearchPanel: React.FC<SearchProps>
  ReportGenerator: React.FC<ReportProps>
  FindingsTable: React.FC<TableProps>
  
  // Shared components
  AuthGuard: React.FC<AuthGuardProps>
  LoadingSpinner: React.FC
  ErrorBoundary: React.FC<ErrorBoundaryProps>
}
```

---

## Technical Specifications

### **Technology Stack**

#### **Backend (Firebase)**
- **Database**: Cloud Firestore (NoSQL)
- **Functions**: Cloud Functions (Node.js/TypeScript)
- **Authentication**: Firebase Auth
- **Storage**: Cloud Storage (for file uploads)
- **Hosting**: Firebase Hosting (web app)

#### **AI Services**
- **Primary**: OpenAI GPT-4o-mini
- **Fallback**: Google Gemini Flash
- **Vector Database**: Pinecone or Firebase Extensions
- **Embeddings**: OpenAI text-embedding-3-small

#### **Client Applications**
- **Desktop**: Qt 6+ (C++) or Electron (TypeScript)
- **Web**: React 18+ with TypeScript
- **Mobile**: React Native or Flutter

### **Performance Requirements**

#### **Response Times**
- **Search**: < 2 seconds
- **AI Chat**: < 5 seconds
- **Report Generation**: < 30 seconds
- **Data Import**: < 2 minutes per 100 findings

#### **Scalability Targets**
- **Users**: 26 (Phase 1) → 100 (Phase 2)
- **Findings**: 300+ (current) → 10,000+ (future)
- **Concurrent Sessions**: 10 (typical) → 50 (peak)

### **Security Specifications**

#### **Data Protection**
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Authentication**: Multi-factor authentication support
- **Authorization**: Role-based access (simplified model)
- **Audit**: Complete audit trail with immutable logs

#### **Privacy Protection**
- **Pseudonymization**: Real-time mapping with secure storage
- **Data Minimization**: Only necessary data sent to AI
- **Retention**: Configurable data retention policies
- **Compliance**: GDPR-ready with consent management

---

## API Design

### **REST API Endpoints**

#### **Authentication**
```typescript
POST /auth/login
POST /auth/logout
GET  /auth/profile
PUT  /auth/profile
```

#### **Findings Management**
```typescript
GET    /api/findings                 // List with pagination
GET    /api/findings/:id            // Get specific finding
POST   /api/findings                // Create new finding
PUT    /api/findings/:id            // Update finding
DELETE /api/findings/:id            // Delete finding
POST   /api/findings/import         // Bulk import from Excel
```

#### **Search & AI**
```typescript
POST   /api/search                  // Structured search
POST   /api/search/natural          // Natural language search
POST   /api/chat                    // AI chat endpoint
GET    /api/insights                // Generated insights
GET    /api/patterns                // Detected patterns
```

#### **Reports**
```typescript
GET    /api/reports                 // List available reports
POST   /api/reports/generate        // Generate new report
GET    /api/reports/:id            // Download report
DELETE /api/reports/:id            // Delete report
```

### **WebSocket Events**
```typescript
// Real-time updates
interface WebSocketEvents {
  'finding:created': Finding
  'finding:updated': Finding
  'report:generated': Report
  'chat:response': ChatMessage
  'system:notification': SystemNotification
}
```

---

## Data Models

### **Core Entities**

#### **Finding**
```typescript
interface Finding {
  id: string
  title: string
  description: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Closed' | 'Deferred'
  category: string
  subcategory?: string
  
  // Location & responsibility
  location: string
  branch?: string
  department?: string
  responsiblePerson: string
  reviewerPerson?: string
  
  // Timing
  dateIdentified: Date
  dateDue?: Date
  dateCompleted?: Date
  dateCreated: Date
  dateUpdated: Date
  
  // Content
  recommendation: string
  managementResponse?: string
  actionPlan?: string
  evidence?: string[]
  attachments?: FileReference[]
  
  // Metadata
  tags: string[]
  riskLevel: number // 1-10 scale
  originalSource: string // Excel file reference
  importBatch: string
  
  // Privacy
  isPseudonymized: boolean
  mappingReference?: string
}
```

#### **Chat Session**
```typescript
interface ChatSession {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    sources?: DocumentReference[]
    confidence?: number
    processingTime?: number
  }
}
```

#### **Pattern & Insight**
```typescript
interface Pattern {
  id: string
  type: 'geographic' | 'temporal' | 'categorical' | 'personnel'
  title: string
  description: string
  confidence: number
  occurrences: number
  affectedFindings: string[]
  detectedAt: Date
  severity: 'High' | 'Medium' | 'Low'
  recommendations: string[]
}

interface Insight {
  id: string
  title: string
  summary: string
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction'
  confidence: number
  impact: 'High' | 'Medium' | 'Low'
  generatedAt: Date
  supportingData: any
  visualizations?: ChartConfig[]
}
```

---

## Implementation Phases

### **Phase 1: Core System (Months 1-6)**

#### **Month 1-2: Foundation**
- ✅ Firebase project setup
- ✅ Authentication system
- ✅ Basic CRUD operations
- ✅ Excel import functionality
- ✅ Privacy mapping system

#### **Month 3-4: AI Integration**
- ✅ OpenAI/Gemini integration
- ✅ RAG system implementation
- ✅ Chat interface
- ✅ Pattern detection engine
- ✅ Search functionality

#### **Month 5-6: Polish & Launch**
- ✅ Desktop application
- ✅ Report generation
- ✅ Dashboard & analytics
- ✅ Testing & optimization
- ✅ Pilot user deployment

### **Phase 2: Multi-Platform (Months 7-10)**

#### **Month 7-8: Web Application**
- ✅ React web application
- ✅ Responsive design
- ✅ Feature parity with desktop

#### **Month 9-10: Mobile Applications**
- ✅ React Native apps
- ✅ Mobile-optimized UI
- ✅ Offline capabilities

---

## Cost Analysis

### **Development Costs (Free Tier)**
- **Firebase**: $0/month (Spark plan)
- **OpenAI**: $5-10/month (testing)
- **Development Tools**: $0 (free tiers)

### **Production Costs (26 Users)**
- **Firebase**: $25-40/month (Blaze plan)
  - Firestore: ~$15/month
  - Functions: ~$10/month
  - Auth: Free
  - Hosting: ~$5/month
- **AI Services**: $10-20/month
  - Chat queries: ~$0.10-0.50 per user
  - Embeddings: ~$5-10/month
- **Total**: $35-60/month ($1.35-2.30 per user)

### **Scaling Costs (100 Users)**
- **Firebase**: $80-120/month
- **AI Services**: $40-60/month
- **Total**: $120-180/month ($1.20-1.80 per user)

---

## Quality Attributes

### **Performance**
- **Availability**: 99.9% uptime (Firebase SLA)
- **Response Time**: < 2s for searches, < 5s for AI
- **Throughput**: 100 concurrent users
- **Scalability**: Auto-scaling with Firebase

### **Security**
- **Confidentiality**: End-to-end encryption + pseudonymization
- **Integrity**: Audit trails + data validation
- **Availability**: Redundant Firebase infrastructure
- **Privacy**: Zero real data exposure to AI

### **Usability**
- **Accessibility**: WCAG 2.1 AA compliance
- **Internationalization**: Multi-language support ready
- **Mobile Responsiveness**: Cross-platform consistency
- **User Experience**: < 3-click access to any feature

### **Maintainability**
- **Modularity**: Microservices architecture
- **Documentation**: Comprehensive API docs
- **Testing**: 90%+ code coverage
- **Monitoring**: Real-time health checks

---

## Risk Mitigation

### **Technical Risks**
- **AI Service Downtime**: Multi-provider fallback (OpenAI ↔ Gemini)
- **Firebase Limitations**: Monitor quotas, implement caching
- **Data Loss**: Automated backups, version control
- **Performance Degradation**: Load testing, optimization

### **Security Risks**
- **Data Breach**: Multi-layer encryption, access controls
- **Privacy Violation**: Pseudonymization validation, audit trails
- **Unauthorized Access**: MFA, session management
- **Data Corruption**: Input validation, checksums

### **Business Risks**
- **Cost Overrun**: Usage monitoring, budget alerts
- **User Adoption**: Training, feedback loops
- **Scope Creep**: Agile methodology, clear requirements
- **Vendor Lock-in**: Abstraction layers, export capabilities

---

## Success Metrics

### **Performance Metrics**
- **Search Speed**: Hours → Seconds (99.9% reduction)
- **Report Generation**: 2 hours → 5 minutes (96% reduction)
- **Question Response**: Manual → Instant (AI chat)
- **Pattern Detection**: Manual → Automated (100% automation)

### **Quality Metrics**
- **User Satisfaction**: > 4.5/5.0
- **System Uptime**: > 99.9%
- **Query Accuracy**: > 95% relevant results
- **Privacy Compliance**: 100% (zero real data exposure)

### **Business Metrics**
- **Time Savings**: 10+ hours/week per user
- **Cost Efficiency**: < $2.30/user/month
- **Adoption Rate**: > 90% active usage
- **ROI**: > 300% in first year

This architecture provides a solid foundation for building FIRST-AID as a secure, scalable, and intelligent audit findings management system with AI-powered capabilities and privacy protection.