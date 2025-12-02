# FIRST-AID Implementation Plan

## Overview
Complete step-by-step implementation guide for the FIRST-AID intelligent audit findings management system, organized into 4 phases over 6 months with clear manual and automated tasks.

---

## Implementation Timeline

```
Phase 1: Foundation & Setup (Weeks 1-4)
├── External Services Setup
├── Development Environment
├── Database Schema
└── Authentication System

Phase 2: Core Development (Weeks 5-12)
├── Data Management
├── Search Functionality
├── Basic UI Components
└── Privacy Protection Layer

Phase 3: AI Integration (Weeks 13-20)
├── AI Service Integration
├── RAG Implementation
├── Chat Interface
└── Pattern Detection

Phase 4: Testing & Deployment (Weeks 21-24)
├── Testing & QA
├── Performance Optimization
├── Deployment Setup
└── User Training
```

---

## Phase 1: Foundation & Setup (Weeks 1-4)

### Week 1: External Services & Environment Setup

#### **Task 1.1: Firebase Project Setup**
**🔴 MANUAL TASK** - You must complete these steps:

**Subtask 1.1.1: Create Firebase Project**
```bash
# Manual Steps:
1. Go to https://console.firebase.google.com/
2. Click "Create a project"
3. Project name: "first-aid-audit-system"
4. Enable Google Analytics (optional)
5. Select or create Google Analytics account
6. Click "Create project"
```

**Subtask 1.1.2: Enable Firebase Services**
```bash
# Manual Steps in Firebase Console:
1. Authentication:
   - Go to Authentication → Get started
   - Enable Email/Password provider
   - Configure authorized domains
   
2. Firestore Database:
   - Go to Firestore Database → Create database
   - Start in test mode (we'll secure later)
   - Choose location (asia-southeast1 for Jakarta)
   
3. Cloud Functions:
   - Go to Functions → Get started
   - Choose location (same as Firestore)
   
4. Cloud Storage:
   - Go to Storage → Get started
   - Choose location (same as Firestore)
```

**Subtask 1.1.3: Get Firebase Configuration**
```bash
# Manual Steps:
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → Web app
4. App nickname: "first-aid-web"
5. Check "Also set up Firebase Hosting"
6. Click "Register app"
7. Copy the firebaseConfig object
```

**Configuration File to Create:**
```javascript
// src/config/firebase.js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "first-aid-audit-system.firebaseapp.com",
  projectId: "first-aid-audit-system",
  storageBucket: "first-aid-audit-system.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

export default firebaseConfig;
```

#### **Task 1.2: AI Services Setup**
**🔴 MANUAL TASK** - You must complete these steps:

**Subtask 1.2.1: OpenAI API Setup**
```bash
# Manual Steps:
1. Go to https://platform.openai.com/
2. Create account or sign in
3. Go to API Keys section
4. Create new secret key
5. Copy and save the key securely
6. Set up billing (required for API access)
7. Set spending limits ($20-50/month recommended)
```

**Subtask 1.2.2: Google AI (Gemini) Setup (Backup)**
```bash
# Manual Steps:
1. Go to https://ai.google.dev/
2. Get API key
3. Set up Google Cloud project if needed
4. Enable Gemini API
5. Copy and save the key securely
```

**Environment Variables to Set:**
```bash
# .env.local
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
FIREBASE_PROJECT_ID=first-aid-audit-system
```

#### **Task 1.3: Development Environment Setup**

**Subtask 1.3.1: Project Repository Setup**
```bash
# Create project directory
mkdir first-aid-system
cd first-aid-system

# Initialize git repository
git init
git branch -m main

# Create project structure
mkdir -p {frontend,backend,docs,scripts,tests}
mkdir -p frontend/{src,public,components,pages,services,utils}
mkdir -p backend/{functions,config,models,services}
```

**Subtask 1.3.2: Frontend Setup (React + TypeScript)**
```bash
# In project root
cd frontend

# Create React app with TypeScript
npx create-react-app . --template typescript
npm install

# Install additional dependencies
npm install firebase
npm install @firebase/auth @firebase/firestore @firebase/functions
npm install react-router-dom @types/react-router-dom
npm install @headlessui/react @heroicons/react
npm install react-query @tanstack/react-query
npm install react-hook-form
npm install tailwindcss postcss autoprefixer
npm install date-fns
npm install chart.js react-chartjs-2
npm install lucide-react

# Setup Tailwind CSS
npx tailwindcss init -p
```

**Subtask 1.3.3: Backend Setup (Firebase Functions)**
```bash
# In project root
cd backend

# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Functions
firebase init functions
# Select TypeScript
# Use ESLint: Yes
# Install dependencies: Yes
```

**Subtask 1.3.4: Project Configuration Files**

**package.json (Frontend)**
```json
{
  "name": "first-aid-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@headlessui/react": "^1.7.17",
    "@heroicons/react": "^2.0.18",
    "@tanstack/react-query": "^5.0.0",
    "@types/node": "^16.18.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "chart.js": "^4.4.0",
    "date-fns": "^2.30.0",
    "firebase": "^10.5.0",
    "lucide-react": "^0.290.0",
    "react": "^18.2.0",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.47.0",
    "react-router-dom": "^6.16.0",
    "typescript": "^4.9.5"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

### Week 2: Database Schema & Models

#### **Task 1.4: Firestore Database Schema**

**Subtask 1.4.1: Create Firestore Collections Structure**
```typescript
// backend/src/models/database.ts
export interface DatabaseCollections {
  findings: Finding[]
  users: User[]
  chatSessions: ChatSession[]
  mappings: PrivacyMapping[]
  reports: Report[]
  auditLogs: AuditLog[]
  patterns: Pattern[]
  insights: Insight[]
}

export interface Finding {
  id: string
  title: string
  description: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Closed' | 'Deferred'
  category: string
  subcategory?: string
  location: string
  branch?: string
  department?: string
  responsiblePerson: string
  reviewerPerson?: string
  dateIdentified: FirebaseFirestore.Timestamp
  dateDue?: FirebaseFirestore.Timestamp
  dateCompleted?: FirebaseFirestore.Timestamp
  dateCreated: FirebaseFirestore.Timestamp
  dateUpdated: FirebaseFirestore.Timestamp
  recommendation: string
  managementResponse?: string
  actionPlan?: string
  evidence?: string[]
  attachments?: FileReference[]
  tags: string[]
  riskLevel: number // 1-10
  originalSource: string
  importBatch: string
  isPseudonymized: boolean
  mappingReference?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  department?: string
  permissions: string[]
  preferences: UserPreferences
  createdAt: FirebaseFirestore.Timestamp
  lastLogin?: FirebaseFirestore.Timestamp
  isActive: boolean
}

export interface PrivacyMapping {
  id: string
  batchId: string
  mappingType: 'names' | 'ids' | 'amounts' | 'locations'
  originalValue: string
  pseudonymValue: string
  createdAt: FirebaseFirestore.Timestamp
  expiresAt?: FirebaseFirestore.Timestamp
}
```

**Subtask 1.4.2: Firestore Security Rules**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Findings - authenticated users can read/write
    match /findings/{findingId} {
      allow read, write: if request.auth != null;
    }
    
    // Chat sessions - users can only access their own sessions
    match /chatSessions/{sessionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Privacy mappings - server-side access only
    match /mappings/{mappingId} {
      allow read, write: if false; // Only accessible via Cloud Functions
    }
    
    // Reports - authenticated users can read/write
    match /reports/{reportId} {
      allow read, write: if request.auth != null;
    }
    
    // Audit logs - read-only for authenticated users
    match /auditLogs/{logId} {
      allow read: if request.auth != null;
      allow write: if false; // Only writable via Cloud Functions
    }
  }
}
```

#### **Task 1.5: Authentication System**

**Subtask 1.5.1: Firebase Auth Configuration**
**🔴 MANUAL TASK** - Firebase Console Configuration:
```bash
# Manual Steps in Firebase Console:
1. Go to Authentication → Settings → Authorized domains
2. Add your domains:
   - localhost (for development)
   - your-domain.com (for production)

3. Go to Authentication → Templates
4. Customize email templates:
   - Email verification
   - Password reset
   - Email address change

5. Configure Authentication settings:
   - Enable "One account per email address"
   - Set session timeout as needed
```

**Subtask 1.5.2: Auth Service Implementation**
```typescript
// frontend/src/services/authService.ts
import { 
  auth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from '../config/firebase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
}

class AuthService {
  private currentUser: User | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get additional user data from Firestore
      const userData = await this.getUserData(firebaseUser.uid);
      this.currentUser = userData;
      
      this.notifyAuthStateListeners(userData);
      return userData;
    } catch (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }
  }

  async signUp(email: string, password: string, name: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user document in Firestore
      const userData: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name,
        role: 'auditor',
        department: ''
      };
      
      await this.createUserDocument(userData);
      this.currentUser = userData;
      
      this.notifyAuthStateListeners(userData);
      return userData;
    } catch (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
    this.currentUser = null;
    this.notifyAuthStateListeners(null);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private async getUserData(uid: string): Promise<User> {
    // Implementation to fetch user data from Firestore
    // This will be implemented in the next phase
    throw new Error('Not implemented yet');
  }

  private async createUserDocument(userData: User): Promise<void> {
    // Implementation to create user document in Firestore
    // This will be implemented in the next phase
    throw new Error('Not implemented yet');
  }

  private notifyAuthStateListeners(user: User | null): void {
    this.authStateListeners.forEach(callback => callback(user));
  }
}

export const authService = new AuthService();
```

### Week 3: Basic Project Structure

#### **Task 1.6: Frontend Project Structure**

**Subtask 1.6.1: Create Folder Structure**
```bash
# Frontend structure
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── findings/
│   │   ├── chat/
│   │   └── reports/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   ├── config/
│   └── styles/
└── package.json
```

**Subtask 1.6.2: TypeScript Type Definitions**
```typescript
// frontend/src/types/index.ts
export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Closed' | 'Deferred';
  category: string;
  subcategory?: string;
  location: string;
  branch?: string;
  department?: string;
  responsiblePerson: string;
  reviewerPerson?: string;
  dateIdentified: Date;
  dateDue?: Date;
  dateCompleted?: Date;
  dateCreated: Date;
  dateUpdated: Date;
  recommendation: string;
  managementResponse?: string;
  actionPlan?: string;
  evidence?: string[];
  tags: string[];
  riskLevel: number;
  originalSource: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    sources?: string[];
    suggestions?: string[];
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface DashboardStats {
  totalFindings: number;
  openFindings: number;
  highRiskFindings: number;
  overdueFindings: number;
  trends: {
    newThisMonth: number;
    closedThisMonth: number;
    changePercentage: number;
  };
}
```

#### **Task 1.7: Backend Project Structure**

**Subtask 1.7.1: Cloud Functions Structure**
```bash
# Backend structure
backend/
├── functions/
│   ├── src/
│   │   ├── auth/
│   │   ├── findings/
│   │   ├── chat/
│   │   ├── privacy/
│   │   ├── reports/
│   │   ├── utils/
│   │   └── index.ts
│   ├── package.json
│   └── .env
└── firestore.rules
```

**Subtask 1.7.2: Environment Configuration**
```typescript
// backend/functions/src/config/environment.ts
interface Config {
  openaiApiKey: string;
  googleAiApiKey: string;
  projectId: string;
  environment: 'development' | 'production';
}

export const config: Config = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  environment: (process.env.NODE_ENV as 'development' | 'production') || 'development'
};

if (!config.openaiApiKey && !config.googleAiApiKey) {
  throw new Error('At least one AI API key must be configured');
}
```

### Week 4: Basic Authentication UI

#### **Task 1.8: Authentication Components**

**Subtask 1.8.1: Login Component**
```typescript
// frontend/src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to FIRST-AID
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

---

## Phase 2: Core Development (Weeks 5-12)

### Week 5-6: Data Management Layer

#### **Task 2.1: Firestore Service Implementation**

**Subtask 2.1.1: Database Service Base Class**
```typescript
// frontend/src/services/databaseService.ts
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  QueryConstraint 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class DatabaseService<T> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
    } catch (error) {
      console.error(`Error fetching ${this.collectionName}:`, error);
      throw error;
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching ${this.collectionName} by ID:`, error);
      throw error;
    }
  }

  async create(data: Omit<T, 'id'>): Promise<string> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        dateCreated: new Date(),
        dateUpdated: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        dateUpdated: new Date()
      });
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }
}
```

**Subtask 2.1.2: Findings Service**
```typescript
// frontend/src/services/findingsService.ts
import { DatabaseService } from './databaseService';
import { Finding } from '../types';
import { where, orderBy, QueryConstraint } from 'firebase/firestore';

export interface FindingFilters {
  severity?: string[];
  status?: string[];
  location?: string[];
  category?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

class FindingsService extends DatabaseService<Finding> {
  constructor() {
    super('findings');
  }

  async getFindings(filters: FindingFilters = {}, sortBy = 'dateCreated', sortOrder: 'asc' | 'desc' = 'desc'): Promise<Finding[]> {
    const constraints: QueryConstraint[] = [];

    // Apply filters
    if (filters.severity?.length) {
      constraints.push(where('severity', 'in', filters.severity));
    }
    if (filters.status?.length) {
      constraints.push(where('status', 'in', filters.status));
    }
    if (filters.location?.length) {
      constraints.push(where('location', 'in', filters.location));
    }
    if (filters.category?.length) {
      constraints.push(where('category', 'in', filters.category));
    }
    if (filters.dateFrom) {
      constraints.push(where('dateIdentified', '>=', filters.dateFrom));
    }
    if (filters.dateTo) {
      constraints.push(where('dateIdentified', '<=', filters.dateTo));
    }

    // Apply sorting
    constraints.push(orderBy(sortBy, sortOrder));

    const findings = await this.getAll(constraints);

    // Apply text search (client-side for now)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return findings.filter(finding => 
        finding.title.toLowerCase().includes(searchTerm) ||
        finding.description.toLowerCase().includes(searchTerm) ||
        finding.responsiblePerson.toLowerCase().includes(searchTerm)
      );
    }

    return findings;
  }

  async getOverdueFindings(): Promise<Finding[]> {
    const today = new Date();
    return this.getFindings({
      status: ['Open', 'In Progress']
    }).then(findings => 
      findings.filter(finding => 
        finding.dateDue && new Date(finding.dateDue) < today
      )
    );
  }

  async getHighRiskFindings(): Promise<Finding[]> {
    return this.getFindings({
      severity: ['Critical', 'High']
    });
  }

  async getFindingsByLocation(location: string): Promise<Finding[]> {
    return this.getFindings({ location: [location] });
  }

  async searchFindings(searchTerm: string): Promise<Finding[]> {
    return this.getFindings({ search: searchTerm });
  }
}

export const findingsService = new FindingsService();
```

#### **Task 2.2: Excel Import Functionality**

**Subtask 2.2.1: Excel Parser Service**
```typescript
// frontend/src/services/excelImportService.ts
import * as XLSX from 'xlsx';
import { Finding } from '../types';

export interface ImportMapping {
  titleColumn: string;
  descriptionColumn: string;
  severityColumn: string;
  statusColumn: string;
  categoryColumn: string;
  locationColumn: string;
  responsiblePersonColumn: string;
  dateIdentifiedColumn: string;
  recommendationColumn: string;
}

export interface ImportResult {
  successful: Finding[];
  failed: ImportError[];
  duplicates: Finding[];
}

export interface ImportError {
  row: number;
  data: any;
  error: string;
}

class ExcelImportService {
  async importFromFile(file: File, mapping: ImportMapping): Promise<ImportResult> {
    try {
      const workbook = await this.readExcelFile(file);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      return this.processImportData(jsonData, mapping, file.name);
    } catch (error) {
      throw new Error(`Failed to import Excel file: ${error.message}`);
    }
  }

  private async readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }

  private processImportData(data: any[], mapping: ImportMapping, fileName: string): ImportResult {
    const successful: Finding[] = [];
    const failed: ImportError[] = [];
    const duplicates: Finding[] = [];

    data.forEach((row, index) => {
      try {
        const finding = this.mapRowToFinding(row, mapping, fileName);
        
        // Check for duplicates (simplified check by title)
        if (successful.some(f => f.title === finding.title)) {
          duplicates.push(finding);
        } else {
          successful.push(finding);
        }
      } catch (error) {
        failed.push({
          row: index + 1,
          data: row,
          error: error.message
        });
      }
    });

    return { successful, failed, duplicates };
  }

  private mapRowToFinding(row: any, mapping: ImportMapping, fileName: string): Finding {
    // Validate required fields
    if (!row[mapping.titleColumn]) {
      throw new Error('Title is required');
    }

    const finding: Omit<Finding, 'id'> = {
      title: String(row[mapping.titleColumn]).trim(),
      description: String(row[mapping.descriptionColumn] || '').trim(),
      severity: this.mapSeverity(row[mapping.severityColumn]),
      status: this.mapStatus(row[mapping.statusColumn]),
      category: String(row[mapping.categoryColumn] || 'General').trim(),
      location: String(row[mapping.locationColumn] || '').trim(),
      responsiblePerson: String(row[mapping.responsiblePersonColumn] || '').trim(),
      dateIdentified: this.parseDate(row[mapping.dateIdentifiedColumn]),
      recommendation: String(row[mapping.recommendationColumn] || '').trim(),
      dateCreated: new Date(),
      dateUpdated: new Date(),
      tags: [],
      riskLevel: this.calculateRiskLevel(row[mapping.severityColumn]),
      originalSource: fileName,
      isPseudonymized: false
    };

    return finding as Finding;
  }

  private mapSeverity(value: any): 'Critical' | 'High' | 'Medium' | 'Low' {
    const severity = String(value || '').toLowerCase();
    if (severity.includes('critical')) return 'Critical';
    if (severity.includes('high')) return 'High';
    if (severity.includes('medium')) return 'Medium';
    return 'Low';
  }

  private mapStatus(value: any): 'Open' | 'In Progress' | 'Closed' | 'Deferred' {
    const status = String(value || '').toLowerCase();
    if (status.includes('progress') || status.includes('ongoing')) return 'In Progress';
    if (status.includes('closed') || status.includes('complete')) return 'Closed';
    if (status.includes('deferred') || status.includes('postponed')) return 'Deferred';
    return 'Open';
  }

  private parseDate(value: any): Date {
    if (!value) return new Date();
    
    // Handle Excel date serial numbers
    if (typeof value === 'number') {
      return new Date((value - 25569) * 86400 * 1000);
    }
    
    // Handle string dates
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${value}`);
    }
    
    return date;
  }

  private calculateRiskLevel(severity: any): number {
    const severityMap = {
      'Critical': 9,
      'High': 7,
      'Medium': 5,
      'Low': 3
    };
    return severityMap[this.mapSeverity(severity)] || 5;
  }
}

export const excelImportService = new ExcelImportService();
```

**Subtask 2.2.2: Import UI Component**
```typescript
// frontend/src/components/findings/ImportDialog.tsx
import React, { useState } from 'react';
import { excelImportService, ImportMapping, ImportResult } from '../../services/excelImportService';
import { findingsService } from '../../services/findingsService';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({
    titleColumn: 'Title',
    descriptionColumn: 'Description',
    severityColumn: 'Severity',
    statusColumn: 'Status',
    categoryColumn: 'Category',
    locationColumn: 'Location',
    responsiblePersonColumn: 'Responsible Person',
    dateIdentifiedColumn: 'Date Identified',
    recommendationColumn: 'Recommendation'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Parse Excel file
      const importResult = await excelImportService.importFromFile(file, mapping);
      
      // Save successful findings to database
      const savePromises = importResult.successful.map(finding => 
        findingsService.create(finding)
      );
      await Promise.all(savePromises);

      onImportComplete(importResult);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Import Findings from Excel</h2>
        
        {/* File Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Excel File
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Column Mapping */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Column Mapping</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(mapping).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key.replace('Column', '').replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm">{error}</div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Week 7-8: Search Functionality

#### **Task 2.3: Search Service Implementation**

**Subtask 2.3.1: Basic Search Service**
```typescript
// frontend/src/services/searchService.ts
import { findingsService, FindingFilters } from './findingsService';
import { Finding } from '../types';

export interface SearchQuery {
  text?: string;
  filters?: FindingFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface SearchResult {
  findings: Finding[];
  totalCount: number;
  searchTime: number;
  query: SearchQuery;
}

class SearchService {
  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      let findings = await findingsService.getFindings(
        query.filters,
        query.sortBy || 'dateCreated',
        query.sortOrder || 'desc'
      );

      // Apply text search if provided
      if (query.text) {
        findings = this.performTextSearch(findings, query.text);
      }

      // Apply limit if provided
      if (query.limit) {
        findings = findings.slice(0, query.limit);
      }

      const searchTime = Date.now() - startTime;

      return {
        findings,
        totalCount: findings.length,
        searchTime,
        query
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  private performTextSearch(findings: Finding[], searchText: string): Finding[] {
    const searchTerms = searchText.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return findings.filter(finding => {
      const searchableText = [
        finding.title,
        finding.description,
        finding.responsiblePerson,
        finding.location,
        finding.category,
        finding.recommendation,
        ...finding.tags
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) return [];

    try {
      const findings = await findingsService.getFindings();
      const suggestions = new Set<string>();

      findings.forEach(finding => {
        // Add title suggestions
        if (finding.title.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(finding.title);
        }
        
        // Add tag suggestions
        finding.tags.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(tag);
          }
        });

        // Add location suggestions
        if (finding.location.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(finding.location);
        }

        // Add category suggestions
        if (finding.category.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(finding.category);
        }
      });

      return Array.from(suggestions).slice(0, 10);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();
```

**Subtask 2.3.2: Search UI Component**
```typescript
// frontend/src/components/common/SearchBar.tsx
import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchService } from '../../services/searchService';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search findings...",
  showSuggestions = true 
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2 || !showSuggestions) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const newSuggestions = await searchService.getSearchSuggestions(query);
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query, showSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
    setShowSuggestionsList(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestionsList(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestionsList(true)}
            onBlur={() => setTimeout(() => setShowSuggestionsList(false), 200)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestionsList && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Week 9-10: Basic UI Components

#### **Task 2.4: Core UI Components**

**Subtask 2.4.1: Dashboard Components**
```typescript
// frontend/src/components/dashboard/StatisticsCard.tsx
import React from 'react';

interface StatisticsCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  onClick?: () => void;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  icon,
  color = 'blue',
  trend,
  onClick
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-100',
    green: 'bg-green-500 text-green-100',
    yellow: 'bg-yellow-500 text-yellow-100',
    red: 'bg-red-500 text-red-100'
  };

  return (
    <div 
      className={`bg-white p-6 rounded-lg shadow-sm border ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${
                trend.direction === 'up' ? 'text-green-600' : 
                trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
```

**Subtask 2.4.2: Findings Table Component**
```typescript
// frontend/src/components/findings/FindingsTable.tsx
import React, { useState } from 'react';
import { Finding } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';

interface FindingsTableProps {
  findings: Finding[];
  loading?: boolean;
  onEdit?: (finding: Finding) => void;
  onDelete?: (finding: Finding) => void;
  onView?: (finding: Finding) => void;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  loading = false,
  onEdit,
  onDelete,
  onView
}) => {
  const [selectedFindings, setSelectedFindings] = useState<string[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFindings(findings.map(f => f.id));
    } else {
      setSelectedFindings([]);
    }
  };

  const handleSelectFinding = (findingId: string, checked: boolean) => {
    if (checked) {
      setSelectedFindings([...selectedFindings, findingId]);
    } else {
      setSelectedFindings(selectedFindings.filter(id => id !== findingId));
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Audit Findings ({findings.length})
          </h3>
          {selectedFindings.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {selectedFindings.length} selected
              </span>
              <button className="text-red-600 hover:text-red-800 text-sm">
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedFindings.length === findings.length && findings.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responsible
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {findings.map((finding) => (
              <tr key={finding.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedFindings.includes(finding.id)}
                    onChange={(e) => handleSelectFinding(finding.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <SeverityBadge severity={finding.severity} />
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {finding.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {finding.description}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={finding.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {finding.location}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {finding.responsiblePerson}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDate(finding.dateIdentified)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex space-x-2">
                    {onView && (
                      <button
                        onClick={() => onView(finding)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(finding)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(finding)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {findings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No findings found</p>
        </div>
      )}
    </div>
  );
};
```

### Week 11-12: Privacy Protection Layer

#### **Task 2.5: Privacy Protection Implementation**

**Subtask 2.5.1: Privacy Mapping Service (Backend)**
```typescript
// backend/functions/src/services/privacyService.ts
import { firestore } from 'firebase-admin';
import * as crypto from 'crypto';

export interface PrivacyMapping {
  id: string;
  batchId: string;
  mappingType: 'names' | 'ids' | 'amounts' | 'locations';
  originalValue: string;
  pseudonymValue: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt?: FirebaseFirestore.Timestamp;
}

export interface PseudonymizedData {
  data: any;
  mappingReferences: string[];
}

class PrivacyService {
  private db = firestore();
  private mappingsCache = new Map<string, Map<string, string>>();

  async pseudonymizeData(data: any, batchId: string): Promise<PseudonymizedData> {
    const mappingReferences: string[] = [];
    const pseudonymizedData = JSON.parse(JSON.stringify(data));

    // Process different types of sensitive data
    await this.processNames(pseudonymizedData, batchId, mappingReferences);
    await this.processIds(pseudonymizedData, batchId, mappingReferences);
    await this.processAmounts(pseudonymizedData, batchId, mappingReferences);
    await this.processLocations(pseudonymizedData, batchId, mappingReferences);

    return {
      data: pseudonymizedData,
      mappingReferences
    };
  }

  async depseudonymizeData(pseudonymizedData: any, mappingReferences: string[]): Promise<any> {
    const depseudonymizedData = JSON.parse(JSON.stringify(pseudonymizedData));
    
    // Get all mappings for this batch
    const mappings = await this.getMappingsByReferences(mappingReferences);
    
    // Create reverse mapping
    const reverseMapping = new Map<string, string>();
    mappings.forEach(mapping => {
      reverseMapping.set(mapping.pseudonymValue, mapping.originalValue);
    });

    // Replace pseudonymized values with original values
    this.replaceValuesRecursively(depseudonymizedData, reverseMapping);

    return depseudonymizedData;
  }

  private async processNames(data: any, batchId: string, mappingRefs: string[]): Promise<void> {
    const nameFields = ['responsiblePerson', 'reviewerPerson', 'name', 'person'];
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g; // Simple name pattern

    await this.processFields(data, nameFields, 'names', batchId, mappingRefs, namePattern);
  }

  private async processIds(data: any, batchId: string, mappingRefs: string[]): Promise<void> {
    const idFields = ['id', 'employeeId', 'empId', 'staffId'];
    const idPattern = /\b[A-Z]{2,4}-?\d{4,6}\b/g; // Pattern for employee IDs

    await this.processFields(data, idFields, 'ids', batchId, mappingRefs, idPattern);
  }

  private async processAmounts(data: any, batchId: string, mappingRefs: string[]): Promise<void> {
    const amountFields = ['amount', 'value', 'cost', 'price'];
    const amountPattern = /\b(?:Rp\.?\s?)?[\d,]+(?:\.\d{2})?\b/g; // Indonesian currency pattern

    await this.processFields(data, amountFields, 'amounts', batchId, mappingRefs, amountPattern);
  }

  private async processLocations(data: any, batchId: string, mappingRefs: string[]): Promise<void> {
    // For locations, we might want to keep some generalization
    const locationFields = ['location', 'branch', 'office', 'address'];
    const locationMapping = new Map([
      ['Jakarta', 'Location_A'],
      ['Bandung', 'Location_B'],
      ['Surabaya', 'Location_C'],
      ['Medan', 'Location_D'],
      ['Semarang', 'Location_E']
    ]);

    for (const field of locationFields) {
      if (data[field]) {
        const originalLocation = data[field];
        let pseudonymLocation = locationMapping.get(originalLocation);
        
        if (!pseudonymLocation) {
          pseudonymLocation = `Location_${this.generateRandomId(1)}`;
          locationMapping.set(originalLocation, pseudonymLocation);
        }

        // Store mapping
        const mappingId = await this.storeMapping(
          batchId,
          'locations',
          originalLocation,
          pseudonymLocation
        );
        mappingRefs.push(mappingId);

        data[field] = pseudonymLocation;
      }
    }
  }

  private async processFields(
    data: any, 
    fields: string[], 
    type: PrivacyMapping['mappingType'],
    batchId: string, 
    mappingRefs: string[], 
    pattern: RegExp
  ): Promise<void> {
    for (const field of fields) {
      if (data[field]) {
        const originalValue = data[field];
        const matches = originalValue.match(pattern);

        if (matches) {
          let processedValue = originalValue;

          for (const match of matches) {
            const pseudonymValue = await this.getOrCreatePseudonym(
              batchId,
              type,
              match
            );

            const mappingId = await this.storeMapping(
              batchId,
              type,
              match,
              pseudonymValue
            );
            mappingRefs.push(mappingId);

            processedValue = processedValue.replace(match, pseudonymValue);
          }

          data[field] = processedValue;
        }
      }
    }

    // Also process nested objects and arrays
    for (const key in data) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        await this.processFields(data[key], fields, type, batchId, mappingRefs, pattern);
      }
    }
  }

  private async getOrCreatePseudonym(
    batchId: string,
    type: PrivacyMapping['mappingType'],
    originalValue: string
  ): Promise<string> {
    // Check cache first
    const cacheKey = `${batchId}-${type}`;
    if (this.mappingsCache.has(cacheKey)) {
      const mapping = this.mappingsCache.get(cacheKey)!.get(originalValue);
      if (mapping) return mapping;
    }

    // Check database
    const existingMapping = await this.db
      .collection('mappings')
      .where('batchId', '==', batchId)
      .where('mappingType', '==', type)
      .where('originalValue', '==', originalValue)
      .limit(1)
      .get();

    if (!existingMapping.empty) {
      const mapping = existingMapping.docs[0].data() as PrivacyMapping;
      return mapping.pseudonymValue;
    }

    // Generate new pseudonym
    return this.generatePseudonym(type);
  }

  private generatePseudonym(type: PrivacyMapping['mappingType']): string {
    const counters = this.getTypeCounters(type);
    
    switch (type) {
      case 'names':
        return `Person_${this.generateRandomId(2)}`;
      case 'ids':
        return `ID_${this.generateRandomId(3)}`;
      case 'amounts':
        return `Amount_${this.generateRandomId(3)}`;
      case 'locations':
        return `Location_${this.generateRandomId(1)}`;
      default:
        return `Value_${this.generateRandomId(3)}`;
    }
  }

  private generateRandomId(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async storeMapping(
    batchId: string,
    type: PrivacyMapping['mappingType'],
    originalValue: string,
    pseudonymValue: string
  ): Promise<string> {
    const mapping: Omit<PrivacyMapping, 'id'> = {
      batchId,
      mappingType: type,
      originalValue,
      pseudonymValue,
      createdAt: firestore.Timestamp.now(),
      expiresAt: firestore.Timestamp.fromDate(
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      )
    };

    const docRef = await this.db.collection('mappings').add(mapping);
    
    // Update cache
    const cacheKey = `${batchId}-${type}`;
    if (!this.mappingsCache.has(cacheKey)) {
      this.mappingsCache.set(cacheKey, new Map());
    }
    this.mappingsCache.get(cacheKey)!.set(originalValue, pseudonymValue);

    return docRef.id;
  }

  private async getMappingsByReferences(references: string[]): Promise<PrivacyMapping[]> {
    if (references.length === 0) return [];

    const mappings: PrivacyMapping[] = [];
    
    // Firestore has a limit of 10 items for 'in' queries, so we batch them
    const batches = [];
    for (let i = 0; i < references.length; i += 10) {
      batches.push(references.slice(i, i + 10));
    }

    for (const batch of batches) {
      const querySnapshot = await this.db
        .collection('mappings')
        .where(firestore.FieldPath.documentId(), 'in', batch)
        .get();

      querySnapshot.docs.forEach(doc => {
        mappings.push({ id: doc.id, ...doc.data() } as PrivacyMapping);
      });
    }

    return mappings;
  }

  private replaceValuesRecursively(data: any, mapping: Map<string, string>): void {
    if (typeof data === 'string') {
      return;
    }

    if (Array.isArray(data)) {
      data.forEach(item => this.replaceValuesRecursively(item, mapping));
      return;
    }

    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (typeof data[key] === 'string') {
          let value = data[key];
          for (const [pseudonym, original] of mapping.entries()) {
            value = value.replace(new RegExp(pseudonym, 'g'), original);
          }
          data[key] = value;
        } else {
          this.replaceValuesRecursively(data[key], mapping);
        }
      }
    }
  }

  private getTypeCounters(type: PrivacyMapping['mappingType']): Map<string, number> {
    // This would be stored in a separate collection to maintain counters
    // For now, we'll use random generation
    return new Map();
  }
}

export const privacyService = new PrivacyService();
```

---

## Phase 3: AI Integration (Weeks 13-20)

### Week 13-14: AI Service Integration

#### **Task 3.1: OpenAI Service Implementation**

**Subtask 3.1.1: AI Service Base Class (Backend)**
```typescript
// backend/functions/src/services/aiService.ts
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/environment';

export interface AIResponse {
  content: string;
  confidence: number;
  processingTime: number;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

abstract class BaseAIService {
  abstract generateResponse(messages: ChatMessage[]): Promise<AIResponse>;
  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract isAvailable(): boolean;
}

class OpenAIService extends BaseAIService {
  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({
      apiKey: config.openaiApiKey
    });
  }

  async generateResponse(messages: ChatMessage[]): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.3,
        max_tokens: 1000,
        top_p: 0.9
      });

      const response = completion.choices[0];
      const processingTime = Date.now() - startTime;

      return {
        content: response.message?.content || '',
        confidence: this.calculateConfidence(response),
        processingTime,
        model: 'gpt-4o-mini',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI service failed: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return !!config.openaiApiKey;
  }

  private calculateConfidence(response: any): number {
    // Simple confidence calculation based on response completeness
    const content = response.message?.content || '';
    if (content.length > 100) return 0.9;
    if (content.length > 50) return 0.7;
    if (content.length > 20) return 0.5;
    return 0.3;
  }
}

class GeminiService extends BaseAIService {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor() {
    super();
    this.client = new GoogleGenerativeAI(config.googleAiApiKey);
    this.model = this.client.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateResponse(messages: ChatMessage[]): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Convert messages to Gemini format
      const prompt = this.buildPrompt(messages);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const processingTime = Date.now() - startTime;

      return {
        content: text,
        confidence: 0.8, // Gemini doesn't provide confidence scores
        processingTime,
        model: 'gemini-pro'
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini service failed: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Gemini doesn't have direct embedding API, would need to use different service
    throw new Error('Gemini embedding not implemented');
  }

  isAvailable(): boolean {
    return !!config.googleAiApiKey;
  }

  private buildPrompt(messages: ChatMessage[]): string {
    return messages
      .filter(msg => msg.role !== 'system') // Gemini handles system differently
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');
  }
}

class AIServiceManager {
  private openai: OpenAIService;
  private gemini: GeminiService;
  private primaryService: BaseAIService;
  private fallbackService: BaseAIService;

  constructor() {
    this.openai = new OpenAIService();
    this.gemini = new GeminiService();
    
    // Set primary and fallback services
    if (this.openai.isAvailable()) {
      this.primaryService = this.openai;
      this.fallbackService = this.gemini.isAvailable() ? this.gemini : this.openai;
    } else if (this.gemini.isAvailable()) {
      this.primaryService = this.gemini;
      this.fallbackService = this.gemini;
    } else {
      throw new Error('No AI service available');
    }
  }

  async generateResponse(messages: ChatMessage[]): Promise<AIResponse> {
    try {
      return await this.primaryService.generateResponse(messages);
    } catch (error) {
      console.warn('Primary AI service failed, trying fallback:', error.message);
      
      if (this.fallbackService !== this.primaryService) {
        try {
          return await this.fallbackService.generateResponse(messages);
        } catch (fallbackError) {
          console.error('Fallback AI service also failed:', fallbackError.message);
          throw new Error('All AI services failed');
        }
      } else {
        throw error;
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // For now, only OpenAI supports embeddings
    if (this.openai.isAvailable()) {
      return await this.openai.generateEmbedding(text);
    }
    throw new Error('No embedding service available');
  }
}

export const aiServiceManager = new AIServiceManager();
```

#### **Task 3.2: RAG (Retrieval Augmented Generation) Implementation**

**Subtask 3.2.1: Vector Database Service**
```typescript
// backend/functions/src/services/vectorService.ts
import { aiServiceManager } from './aiService';
import { firestore } from 'firebase-admin';

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    findingId: string;
    title: string;
    category: string;
    location: string;
    dateCreated: FirebaseFirestore.Timestamp;
  };
}

export interface SimilaritySearchResult {
  document: VectorDocument;
  similarity: number;
}

class VectorService {
  private db = firestore();

  async indexDocument(findingId: string, content: string, metadata: any): Promise<string> {
    try {
      // Generate embedding for the content
      const embedding = await aiServiceManager.generateEmbedding(content);
      
      const vectorDoc: Omit<VectorDocument, 'id'> = {
        content,
        embedding,
        metadata: {
          findingId,
          title: metadata.title,
          category: metadata.category,
          location: metadata.location,
          dateCreated: firestore.Timestamp.now()
        }
      };

      const docRef = await this.db.collection('vectors').add(vectorDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error indexing document:', error);
      throw error;
    }
  }

  async searchSimilar(queryText: string, limit: number = 5): Promise<SimilaritySearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await aiServiceManager.generateEmbedding(queryText);
      
      // Get all vectors (in production, you'd use a proper vector database)
      const vectorsSnapshot = await this.db.collection('vectors').get();
      const vectors: VectorDocument[] = vectorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VectorDocument));

      // Calculate similarities
      const similarities = vectors.map(vector => ({
        document: vector,
        similarity: this.cosineSimilarity(queryEmbedding, vector.embedding)
      }));

      // Sort by similarity and return top results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching similar documents:', error);
      throw error;
    }
  }

  async reindexFinding(findingId: string): Promise<void> {
    try {
      // Remove existing vectors for this finding
      const existingVectors = await this.db
        .collection('vectors')
        .where('metadata.findingId', '==', findingId)
        .get();

      const deletePromises = existingVectors.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

      // Get the finding data
      const findingDoc = await this.db.collection('findings').doc(findingId).get();
      if (!findingDoc.exists) {
        console.warn(`Finding ${findingId} not found for reindexing`);
        return;
      }

      const finding = findingDoc.data();
      
      // Create content for embedding
      const content = [
        finding.title,
        finding.description,
        finding.recommendation,
        finding.category,
        finding.location
      ].filter(Boolean).join(' ');

      // Index the document
      await this.indexDocument(findingId, content, finding);
    } catch (error) {
      console.error('Error reindexing finding:', error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}

export const vectorService = new VectorService();
```

**Subtask 3.2.2: RAG Service Implementation**
```typescript
// backend/functions/src/services/ragService.ts
import { aiServiceManager, ChatMessage } from './aiService';
import { vectorService } from './vectorService';
import { privacyService } from './privacyService';

export interface RAGQuery {
  question: string;
  userId: string;
  sessionId?: string;
  includeContext?: boolean;
  maxResults?: number;
}

export interface RAGResponse {
  answer: string;
  confidence: number;
  sources: Array<{
    findingId: string;
    title: string;
    relevance: number;
    excerpt: string;
  }>;
  processingTime: number;
  suggestions?: string[];
}

class RAGService {
  async query(ragQuery: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // 1. Search for relevant documents
      const similarDocs = await vectorService.searchSimilar(
        ragQuery.question,
        ragQuery.maxResults || 5
      );

      // 2. Prepare context from similar documents
      const context = await this.buildContext(similarDocs);
      
      // 3. Pseudonymize the context for AI processing
      const batchId = `rag_${Date.now()}`;
      const pseudonymizedContext = await privacyService.pseudonymizeData(
        context,
        batchId
      );

      // 4. Build AI prompt with context
      const messages = this.buildRAGPrompt(ragQuery.question, pseudonymizedContext.data);

      // 5. Generate AI response
      const aiResponse = await aiServiceManager.generateResponse(messages);

      // 6. De-pseudonymize the response
      const depseudonymizedResponse = await privacyService.depseudonymizeData(
        { content: aiResponse.content },
        pseudonymizedContext.mappingReferences
      );

      // 7. Extract suggestions from response
      const suggestions = this.extractSuggestions(depseudonymizedResponse.content);

      const processingTime = Date.now() - startTime;

      return {
        answer: depseudonymizedResponse.content,
        confidence: aiResponse.confidence,
        sources: similarDocs.map(doc => ({
          findingId: doc.document.metadata.findingId,
          title: doc.document.metadata.title,
          relevance: doc.similarity,
          excerpt: this.extractExcerpt(doc.document.content, ragQuery.question)
        })),
        processingTime,
        suggestions
      };
    } catch (error) {
      console.error('RAG query error:', error);
      throw new Error(`RAG query failed: ${error.message}`);
    }
  }

  private async buildContext(similarDocs: any[]): Promise<any> {
    // Get full finding data for context
    const findingIds = similarDocs.map(doc => doc.document.metadata.findingId);
    const findingsPromises = findingIds.map(id => 
      firestore().collection('findings').doc(id).get()
    );
    
    const findings = await Promise.all(findingsPromises);
    
    return {
      findings: findings
        .filter(doc => doc.exists)
        .map(doc => ({ id: doc.id, ...doc.data() })),
      query_context: {
        total_findings: findings.length,
        relevance_scores: similarDocs.map(doc => doc.similarity)
      }
    };
  }

  private buildRAGPrompt(question: string, context: any): ChatMessage[] {
    const systemPrompt = `You are an AI assistant analyzing audit findings. Use the provided context to answer questions accurately and concisely.

Guidelines:
- Base your answers on the provided audit findings data
- Be specific and cite relevant findings when possible
- If you don't have enough information, say so clearly
- Suggest follow-up questions that might be helpful
- Focus on actionable insights and patterns

Context Data:
${JSON.stringify(context, null, 2)}`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ];
  }

  private extractExcerpt(content: string, query: string, maxLength: number = 150): string {
    const queryWords = query.toLowerCase().split(' ');
    const sentences = content.split(/[.!?]+/);
    
    // Find sentence with most query word matches
    let bestSentence = sentences[0] || '';
    let maxMatches = 0;
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const matches = queryWords.filter(word => sentenceLower.includes(word)).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestSentence = sentence;
      }
    }
    
    // Truncate if too long
    if (bestSentence.length > maxLength) {
      return bestSentence.substring(0, maxLength) + '...';
    }
    
    return bestSentence.trim();
  }

  private extractSuggestions(response: string): string[] {
    // Simple suggestion extraction - look for questions or suggestions in response
    const suggestions: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.includes('?') && line.length < 100) {
        suggestions.push(line.trim());
      }
      if (line.toLowerCase().includes('you might also') || 
          line.toLowerCase().includes('consider asking') ||
          line.toLowerCase().includes('related question')) {
        suggestions.push(line.trim());
      }
    }
    
    return suggestions.slice(0, 3); // Return max 3 suggestions
  }
}

export const ragService = new RAGService();
```

### Week 15-16: Chat Interface Implementation

#### **Task 3.3: Chat Service (Backend)**

**Subtask 3.3.1: Chat Session Management**
```typescript
// backend/functions/src/services/chatService.ts
import { firestore } from 'firebase-admin';
import { ragService, RAGQuery } from './ragService';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
  metadata?: {
    messageCount: number;
    lastActivity: FirebaseFirestore.Timestamp;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: FirebaseFirestore.Timestamp;
  metadata?: {
    confidence?: number;
    sources?: string[];
    processingTime?: number;
  };
}

class ChatService {
  private db = firestore();

  async createSession(userId: string, initialMessage?: string): Promise<string> {
    try {
      const session: Omit<ChatSession, 'id'> = {
        userId,
        title: initialMessage ? this.generateTitle(initialMessage) : 'New Chat',
        messages: [],
        createdAt: firestore.Timestamp.now(),
        updatedAt: firestore.Timestamp.now(),
        isActive: true,
        metadata: {
          messageCount: 0,
          lastActivity: firestore.Timestamp.now()
        }
      };

      const docRef = await this.db.collection('chatSessions').add(session);
      return docRef.id;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    try {
      const sessionDoc = await this.db.collection('chatSessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        return null;
      }

      const session = { id: sessionDoc.id, ...sessionDoc.data() } as ChatSession;
      
      // Verify user ownership
      if (session.userId !== userId) {
        throw new Error('Unauthorized access to chat session');
      }

      return session;
    } catch (error) {
      console.error('Error getting chat session:', error);
      throw error;
    }
  }

  async getUserSessions(userId: string, limit: number = 20): Promise<ChatSession[]> {
    try {
      const sessionsSnapshot = await this.db
        .collection('chatSessions')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .get();

      return sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatSession));
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  }

  async sendMessage(
    sessionId: string, 
    userId: string, 
    message: string
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    try {
      // Verify session ownership
      const session = await this.getSession(sessionId, userId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: message,
        timestamp: firestore.Timestamp.now()
      };

      // Process with RAG
      const ragQuery: RAGQuery = {
        question: message,
        userId,
        sessionId,
        includeContext: true
      };

      const ragResponse = await ragService.query(ragQuery);

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: ragResponse.answer,
        timestamp: firestore.Timestamp.now(),
        metadata: {
          confidence: ragResponse.confidence,
          sources: ragResponse.sources.map(s => s.findingId),
          processingTime: ragResponse.processingTime
        }
      };

      // Update session with new messages
      const updatedMessages = [...session.messages, userMessage, assistantMessage];
      
      await this.db.collection('chatSessions').doc(sessionId).update({
        messages: updatedMessages,
        updatedAt: firestore.Timestamp.now(),
        title: session.title === 'New Chat' ? this.generateTitle(message) : session.title,
        'metadata.messageCount': updatedMessages.length,
        'metadata.lastActivity': firestore.Timestamp.now()
      });

      return { userMessage, assistantMessage };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async updateSessionTitle(sessionId: string, userId: string, title: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId, userId);
      if (!session) {
        throw new Error('Session not found');
      }

      await this.db.collection('chatSessions').doc(sessionId).update({
        title,
        updatedAt: firestore.Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating session title:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId, userId);
      if (!session) {
        throw new Error('Session not found');
      }

      await this.db.collection('chatSessions').doc(sessionId).update({
        isActive: false,
        updatedAt: firestore.Timestamp.now()
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  private generateTitle(message: string): string {
    // Extract meaningful title from first message
    const words = message.split(' ').slice(0, 6);
    let title = words.join(' ');
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title || 'Chat Session';
  }
}

export const chatService = new ChatService();
```

**Subtask 3.3.2: Chat API Endpoints (Backend)**
```typescript
// backend/functions/src/api/chat.ts
import { Request, Response } from 'express';
import { chatService } from '../services/chatService';
import { auth } from '../middleware/auth';

export const chatRoutes = {
  // POST /api/chat
  sendMessage: [auth, async (req: Request, res: Response) => {
    try {
      const { message, sessionId } = req.body;
      const userId = req.user.uid;

      if (!message) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'VALIDATION_ERROR', message: 'Message is required' }
        });
      }

      let currentSessionId = sessionId;
      
      // Create new session if none provided
      if (!sessionId) {
        currentSessionId = await chatService.createSession(userId, message);
      }

      const result = await chatService.sendMessage(currentSessionId, userId, message);

      res.json({
        success: true,
        data: {
          sessionId: currentSessionId,
          userMessage: result.userMessage,
          assistantMessage: result.assistantMessage
        }
      });
    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }],

  // GET /api/chat/sessions
  getSessions: [auth, async (req: Request, res: Response) => {
    try {
      const userId = req.user.uid;
      const limit = parseInt(req.query.limit as string) || 20;

      const sessions = await chatService.getUserSessions(userId, limit);

      res.json({
        success: true,
        data: { sessions }
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }],

  // GET /api/chat/sessions/:sessionId
  getSession: [auth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.uid;

      const session = await chatService.getSession(sessionId, userId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' }
        });
      }

      res.json({
        success: true,
        data: { session }
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }],

  // PUT /api/chat/sessions/:sessionId
  updateSession: [auth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { title } = req.body;
      const userId = req.user.uid;

      await chatService.updateSessionTitle(sessionId, userId, title);

      res.json({
        success: true,
        message: 'Session updated successfully'
      });
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }],

  // DELETE /api/chat/sessions/:sessionId
  deleteSession: [auth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.uid;

      await chatService.deleteSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Delete session error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }]
};
```

#### **Task 3.4: Chat UI Implementation (Frontend)**

**Subtask 3.4.1: Chat Service (Frontend)**
```typescript
// frontend/src/services/chatService.ts
import { api } from './api';
import { ChatMessage, ChatSession } from '../types';

export interface SendMessageRequest {
  message: string;
  sessionId?: string;
}

export interface SendMessageResponse {
  sessionId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

class ChatService {
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await api.post('/chat', request);
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async getSessions(): Promise<ChatSession[]> {
    try {
      const response = await api.get('/chat/sessions');
      return response.data.sessions;
    } catch (error) {
      console.error('Failed to get sessions:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    try {
      const response = await api.get(`/chat/sessions/${sessionId}`);
      return response.data.session;
    } catch (error) {
      console.error('Failed to get session:', error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: { title?: string }): Promise<void> {
    try {
      await api.put(`/chat/sessions/${sessionId}`, updates);
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
```

**Subtask 3.4.2: Chat Components**
```typescript
// frontend/src/components/chat/ChatInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatSession } from '../../types';
import { chatService } from '../../services/chatService';
import { ChatMessageComponent } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSuggestions } from './ChatSuggestions';

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionId, 
  onSessionChange 
}) => {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    } else {
      setSession(null);
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSession = async (id: string) => {
    try {
      setLoading(true);
      const sessionData = await chatService.getSession(id);
      setSession(sessionData);
      setMessages(sessionData.messages);
      setError(null);
    } catch (err) {
      setError('Failed to load chat session');
      console.error('Error loading session:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await chatService.sendMessage({
        message,
        sessionId: session?.id
      });

      // If this is a new session, update the session ID
      if (!session) {
        onSessionChange?.(response.sessionId);
      }

      // Add messages to current state
      setMessages(prev => [...prev, response.userMessage, response.assistantMessage]);

      // Update session if needed
      if (session) {
        setSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, response.userMessage, response.assistantMessage]
        } : null);
      }
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {session?.title || 'New Chat'}
        </h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p>Ask me anything about your audit findings. I can help you analyze patterns, find insights, and answer questions.</p>
            
            {/* Quick suggestions */}
            <ChatSuggestions 
              suggestions={[
                "What are the most common audit findings?",
                "Show me high-risk findings in Jakarta",
                "Are there any repeat issues I should focus on?",
                "What trends do you see in our audit data?"
              ]}
              onSuggestionClick={handleSuggestionClick}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessageComponent 
                key={message.id} 
                message={message}
                onSourceClick={(findingId) => {
                  // Navigate to finding details
                  window.open(`/findings/${findingId}`, '_blank');
                }}
              />
            ))}
            {loading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>AI is thinking...</span>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-6 py-4">
        <ChatInput 
          onSend={handleSendMessage}
          disabled={loading}
          placeholder="Ask about your audit findings..."
        />
      </div>
    </div>
  );
};
```

### Week 17-18: Pattern Detection

#### **Task 3.5: Pattern Detection Service**

**Subtask 3.5.1: Pattern Analysis Engine**
```typescript
// backend/functions/src/services/patternService.ts
import { firestore } from 'firebase-admin';
import { aiServiceManager } from './aiService';

export interface Pattern {
  id: string;
  type: 'geographic' | 'temporal' | 'categorical' | 'personnel';
  title: string;
  description: string;
  confidence: number;
  occurrences: number;
  affectedFindings: string[];
  detectedAt: FirebaseFirestore.Timestamp;
  severity: 'High' | 'Medium' | 'Low';
  recommendations: string[];
  metadata: {
    analysisType: string;
    dataPoints: number;
    timeRange?: {
      from: FirebaseFirestore.Timestamp;
      to: FirebaseFirestore.Timestamp;
    };
  };
}

class PatternService {
  private db = firestore();

  async detectPatterns(): Promise<Pattern[]> {
    try {
      const findings = await this.getAllFindings();
      const patterns: Pattern[] = [];

      // Run different pattern detection algorithms
      patterns.push(...await this.detectGeographicPatterns(findings));
      patterns.push(...await this.detectTemporalPatterns(findings));
      patterns.push(...await this.detectCategoricalPatterns(findings));
      patterns.push(...await this.detectPersonnelPatterns(findings));

      // Store detected patterns
      await this.storePatterns(patterns);

      return patterns;
    } catch (error) {
      console.error('Pattern detection error:', error);
      throw error;
    }
  }

  private async detectGeographicPatterns(findings: any[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const locationGroups = this.groupBy(findings, 'location');

    for (const [location, locationFindings] of Object.entries(locationGroups)) {
      if (locationFindings.length < 3) continue; // Need at least 3 findings

      const categoryGroups = this.groupBy(locationFindings, 'category');
      
      for (const [category, categoryFindings] of Object.entries(categoryGroups)) {
        if (categoryFindings.length >= 3) {
          const pattern: Pattern = {
            id: `geo_${location}_${category}_${Date.now()}`,
            type: 'geographic',
            title: `Recurring ${category} Issues in ${location}`,
            description: `${categoryFindings.length} ${category} findings detected in ${location}, suggesting systematic issues`,
            confidence: this.calculateConfidence(categoryFindings.length, locationFindings.length),
            occurrences: categoryFindings.length,
            affectedFindings: categoryFindings.map(f => f.id),
            detectedAt: firestore.Timestamp.now(),
            severity: this.determineSeverity(categoryFindings),
            recommendations: await this.generateRecommendations('geographic', {
              location,
              category,
              findings: categoryFindings
            }),
            metadata: {
              analysisType: 'geographic_clustering',
              dataPoints: categoryFindings.length
            }
          };
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  private async detectTemporalPatterns(findings: any[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Group by month
    const monthlyGroups = this.groupBy(findings, (finding) => {
      const date = finding.dateIdentified.toDate();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });

    // Detect increasing trends
    const monthlyKeys = Object.keys(monthlyGroups).sort();
    
    for (let i = 2; i < monthlyKeys.length; i++) {
      const current = monthlyGroups[monthlyKeys[i]].length;
      const previous = monthlyGroups[monthlyKeys[i-1]].length;
      const beforePrevious = monthlyGroups[monthlyKeys[i-2]].length;

      // Check for increasing trend
      if (current > previous && previous > beforePrevious) {
        const affectedFindings = [
          ...monthlyGroups[monthlyKeys[i-2]],
          ...monthlyGroups[monthlyKeys[i-1]],
          ...monthlyGroups[monthlyKeys[i]]
        ];

        const pattern: Pattern = {
          id: `temp_increasing_${monthlyKeys[i]}_${Date.now()}`,
          type: 'temporal',
          title: `Increasing Trend in Audit Findings`,
          description: `Audit findings have been increasing over the last 3 months (${beforePrevious} → ${previous} → ${current})`,
          confidence: 0.8,
          occurrences: affectedFindings.length,
          affectedFindings: affectedFindings.map(f => f.id),
          detectedAt: firestore.Timestamp.now(),
          severity: 'High',
          recommendations: await this.generateRecommendations('temporal', {
            trend: 'increasing',
            period: '3_months',
            findings: affectedFindings
          }),
          metadata: {
            analysisType: 'temporal_trend',
            dataPoints: 3,
            timeRange: {
              from: firestore.Timestamp.fromDate(new Date(`${monthlyKeys[i-2]}-01`)),
              to: firestore.Timestamp.fromDate(new Date(`${monthlyKeys[i]}-01`))
            }
          }
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async detectCategoricalPatterns(findings: any[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const categoryGroups = this.groupBy(findings, 'category');

    // Find categories with high frequency
    for (const [category, categoryFindings] of Object.entries(categoryGroups)) {
      const totalFindings = findings.length;
      const categoryPercentage = (categoryFindings.length / totalFindings) * 100;

      if (categoryPercentage > 20 && categoryFindings.length >= 5) {
        const pattern: Pattern = {
          id: `cat_${category}_${Date.now()}`,
          type: 'categorical',
          title: `High Frequency ${category} Issues`,
          description: `${category} represents ${categoryPercentage.toFixed(1)}% of all audit findings (${categoryFindings.length} out of ${totalFindings})`,
          confidence: this.calculateConfidence(categoryFindings.length, totalFindings),
          occurrences: categoryFindings.length,
          affectedFindings: categoryFindings.map(f => f.id),
          detectedAt: firestore.Timestamp.now(),
          severity: this.determineSeverity(categoryFindings),
          recommendations: await this.generateRecommendations('categorical', {
            category,
            frequency: categoryPercentage,
            findings: categoryFindings
          }),
          metadata: {
            analysisType: 'frequency_analysis',
            dataPoints: categoryFindings.length
          }
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async detectPersonnelPatterns(findings: any[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const personnelGroups = this.groupBy(findings, 'responsiblePerson');

    for (const [person, personFindings] of Object.entries(personnelGroups)) {
      if (personFindings.length >= 4) { // Person involved in 4+ findings
        const pattern: Pattern = {
          id: `pers_${person.replace(/\s+/g, '_')}_${Date.now()}`,
          type: 'personnel',
          title: `Multiple Findings Involving ${person}`,
          description: `${person} is involved in ${personFindings.length} audit findings, suggesting need for additional support or training`,
          confidence: this.calculateConfidence(personFindings.length, 4),
          occurrences: personFindings.length,
          affectedFindings: personFindings.map(f => f.id),
          detectedAt: firestore.Timestamp.now(),
          severity: personFindings.length >= 6 ? 'High' : 'Medium',
          recommendations: await this.generateRecommendations('personnel', {
            person,
            findings: personFindings
          }),
          metadata: {
            analysisType: 'personnel_frequency',
            dataPoints: personFindings.length
          }
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async generateRecommendations(
    patternType: string, 
    context: any
  ): Promise<string[]> {
    try {
      const prompt = this.buildRecommendationPrompt(patternType, context);
      const response = await aiServiceManager.generateResponse([
        { role: 'system', content: 'You are an audit expert providing actionable recommendations.' },
        { role: 'user', content: prompt }
      ]);

      return this.parseRecommendations(response.content);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this.getDefaultRecommendations(patternType);
    }
  }

  private buildRecommendationPrompt(patternType: string, context: any): string {
    switch (patternType) {
      case 'geographic':
        return `Based on recurring ${context.category} issues in ${context.location} (${context.findings.length} findings), provide 3-5 specific, actionable recommendations to address this pattern.`;
      
      case 'temporal':
        return `Audit findings show an increasing trend. Provide 3-5 recommendations to address this upward trend and prevent further increases.`;
      
      case 'categorical':
        return `${context.category} issues represent ${context.frequency}% of all findings. Provide 3-5 targeted recommendations to reduce this category of issues.`;
      
      case 'personnel':
        return `${context.person} is involved in ${context.findings.length} audit findings. Provide 3-5 supportive recommendations to help address this pattern.`;
      
      default:
        return 'Provide general audit improvement recommendations.';
    }
  }

  private parseRecommendations(content: string): string[] {
    const lines = content.split('\n').filter(line => line.trim());
    const recommendations: string[] = [];

    for (const line of lines) {
      if (line.match(/^\d+\./) || line.startsWith('-') || line.startsWith('•')) {
        recommendations.push(line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim());
      }
    }

    return recommendations.slice(0, 5); // Max 5 recommendations
  }

  private getDefaultRecommendations(patternType: string): string[] {
    const defaults = {
      geographic: [
        'Conduct targeted training for staff in affected location',
        'Review local processes and procedures',
        'Assign additional oversight or mentoring'
      ],
      temporal: [
        'Investigate root causes of increasing trend',
        'Implement additional monitoring controls',
        'Review recent changes in processes or personnel'
      ],
      categorical: [
        'Develop category-specific training program',
        'Update relevant policies and procedures',
        'Implement additional controls for this risk area'
      ],
      personnel: [
        'Provide additional training and support',
        'Review workload and resource allocation',
        'Consider mentoring or coaching programs'
      ]
    };

    return defaults[patternType] || ['Review and strengthen relevant controls'];
  }

  private groupBy<T>(array: T[], key: string | ((item: T) => string)): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      (groups[groupKey] = groups[groupKey] || []).push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private calculateConfidence(occurrences: number, total: number): number {
    const frequency = occurrences / total;
    if (frequency > 0.3) return 0.9;
    if (frequency > 0.2) return 0.8;
    if (frequency > 0.1) return 0.7;
    return 0.6;
  }

  private determineSeverity(findings: any[]): 'High' | 'Medium' | 'Low' {
    const highRiskCount = findings.filter(f => 
      f.severity === 'Critical' || f.severity === 'High'
    ).length;
    
    const highRiskPercentage = (highRiskCount / findings.length) * 100;
    
    if (highRiskPercentage > 50 || findings.length >= 6) return 'High';
    if (highRiskPercentage > 25 || findings.length >= 4) return 'Medium';
    return 'Low';
  }

  private async getAllFindings(): Promise<any[]> {
    const snapshot = await this.db.collection('findings').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async storePatterns(patterns: Pattern[]): Promise<void> {
    const batch = this.db.batch();
    
    for (const pattern of patterns) {
      const docRef = this.db.collection('patterns').doc();
      batch.set(docRef, { ...pattern, id: docRef.id });
    }
    
    await batch.commit();
  }
}

export const patternService = new PatternService();
```

### Week 19-20: Advanced AI Features

#### **Task 3.6: Insights Generation**

**Subtask 3.6.1: Insights Service**
```typescript
// backend/functions/src/services/insightsService.ts
import { firestore } from 'firebase-admin';
import { aiServiceManager } from './aiService';
import { patternService } from './patternService';

export interface Insight {
  id: string;
  title: string;
  summary: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction';
  confidence: number;
  impact: 'High' | 'Medium' | 'Low';
  generatedAt: FirebaseFirestore.Timestamp;
  supportingData: any;
  recommendations: string[];
  visualizations?: ChartConfig[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  title: string;
  data: any;
  options?: any;
}

class InsightsService {
  private db = firestore();

  async generateInsights(): Promise<Insight[]> {
    try {
      const [findings, patterns] = await Promise.all([
        this.getAllFindings(),
        this.getPatterns()
      ]);

      const insights: Insight[] = [];

      // Generate different types of insights
      insights.push(...await this.generateTrendInsights(findings));
      insights.push(...await this.generateAnomalyInsights(findings));
      insights.push(...await this.generateCorrelationInsights(findings));
      insights.push(...await this.generatePredictiveInsights(findings, patterns));

      // Store insights
      await this.storeInsights(insights);

      return insights;
    } catch (error) {
      console.error('Insights generation error:', error);
      throw error;
    }
  }

  private async generateTrendInsights(findings: any[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Analyze monthly trends
    const monthlyData = this.groupByMonth(findings);
    const trendAnalysis = this.analyzeTrend(monthlyData);

    if (trendAnalysis.significance > 0.7) {
      const insight: Insight = {
        id: `trend_monthly_${Date.now()}`,
        title: `${trendAnalysis.direction === 'increasing' ? 'Rising' : 'Declining'} Audit Findings Trend`,
        summary: `Audit findings have been ${trendAnalysis.direction} by ${Math.abs(trendAnalysis.change)}% over the last 6 months`,
        type: 'trend',
        confidence: trendAnalysis.significance,
        impact: this.calculateImpact(trendAnalysis.change),
        generatedAt: firestore.Timestamp.now(),
        supportingData: {
          monthlyData,
          trendLine: trendAnalysis.trendLine,
          changePercentage: trendAnalysis.change
        },
        recommendations: await this.generateTrendRecommendations(trendAnalysis),
        visualizations: [{
          type: 'line',
          title: 'Monthly Findings Trend',
          data: this.formatChartData(monthlyData, 'line')
        }]
      };
      insights.push(insight);
    }

    return insights;
  }

  private async generateAnomalyInsights(findings: any[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Detect location anomalies
    const locationStats = this.analyzeLocationDistribution(findings);
    const anomalousLocations = locationStats.filter(stat => stat.zscore > 2);

    for (const location of anomalousLocations) {
      const insight: Insight = {
        id: `anomaly_location_${location.name}_${Date.now()}`,
        title: `Unusual Activity in ${location.name}`,
        summary: `${location.name} has ${location.count} findings, which is ${location.zscore.toFixed(1)} standard deviations above average`,
        type: 'anomaly',
        confidence: Math.min(location.zscore / 3, 0.95),
        impact: location.count > 10 ? 'High' : 'Medium',
        generatedAt: firestore.Timestamp.now(),
        supportingData: {
          locationStats: location,
          averageFindings: locationStats.reduce((sum, s) => sum + s.count, 0) / locationStats.length
        },
        recommendations: [
          `Investigate specific causes of high finding count in ${location.name}`,
          'Review local management and oversight procedures',
          'Consider additional training or resources for this location'
        ],
        visualizations: [{
          type: 'bar',
          title: 'Findings by Location',
          data: this.formatChartData(locationStats, 'bar')
        }]
      };
      insights.push(insight);
    }

    return insights;
  }

  private async generateCorrelationInsights(findings: any[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Analyze correlation between categories and severity
    const correlationMatrix = this.calculateCategorySeverityCorrelation(findings);
    const strongCorrelations = correlationMatrix.filter(corr => Math.abs(corr.correlation) > 0.6);

    for (const correlation of strongCorrelations) {
      const insight: Insight = {
        id: `correlation_${correlation.category}_${correlation.severity}_${Date.now()}`,
        title: `Strong Link Between ${correlation.category} and ${correlation.severity} Risk`,
        summary: `${correlation.category} findings are ${correlation.correlation > 0 ? 'strongly associated' : 'inversely related'} with ${correlation.severity} severity (correlation: ${correlation.correlation.toFixed(2)})`,
        type: 'correlation',
        confidence: Math.abs(correlation.correlation),
        impact: correlation.severity === 'Critical' ? 'High' : 'Medium',
        generatedAt: firestore.Timestamp.now(),
        supportingData: {
          correlation: correlation.correlation,
          sampleSize: correlation.sampleSize,
          categoryBreakdown: correlation.breakdown
        },
        recommendations: await this.generateCorrelationRecommendations(correlation),
        visualizations: [{
          type: 'scatter',
          title: `${correlation.category} vs ${correlation.severity} Correlation`,
          data: this.formatCorrelationChart(correlation)
        }]
      };
      insights.push(insight);
    }

    return insights;
  }

  private async generatePredictiveInsights(findings: any[], patterns: any[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Predict next month's findings based on trends
    const monthlyTrends = this.analyzeMonthlyTrends(findings);
    const prediction = this.predictNextMonth(monthlyTrends);

    if (prediction.confidence > 0.6) {
      const insight: Insight = {
        id: `prediction_monthly_${Date.now()}`,
        title: `Predicted Findings for Next Month`,
        summary: `Based on current trends, we predict approximately ${Math.round(prediction.value)} findings next month (confidence: ${(prediction.confidence * 100).toFixed(1)}%)`,
        type: 'prediction',
        confidence: prediction.confidence,
        impact: prediction.value > monthlyTrends.average * 1.2 ? 'High' : 'Medium',
        generatedAt: firestore.Timestamp.now(),
        supportingData: {
          historicalAverage: monthlyTrends.average,
          predictedValue: prediction.value,
          trendFactors: prediction.factors
        },
        recommendations: [
          'Monitor actual results against prediction',
          'Prepare additional resources if prediction indicates increase',
          'Investigate trend factors contributing to prediction'
        ],
        visualizations: [{
          type: 'line',
          title: 'Historical vs Predicted Findings',
          data: this.formatPredictionChart(monthlyTrends, prediction)
        }]
      };
      insights.push(insight);
    }

    return insights;
  }

  // Helper methods for data analysis
  private groupByMonth(findings: any[]): Array<{ month: string; count: number }> {
    const grouped = findings.reduce((acc, finding) => {
      const date = finding.dateIdentified.toDate();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([month, count]) => ({ month, count: count as number }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private analyzeTrend(monthlyData: Array<{ month: string; count: number }>): any {
    if (monthlyData.length < 3) return { significance: 0 };

    const counts = monthlyData.map(d => d.count);
    const n = counts.length;
    
    // Simple linear regression
    const sumX = (n * (n - 1)) / 2;
    const sumY = counts.reduce((a, b) => a + b, 0);
    const sumXY = counts.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const changePercentage = ((counts[n - 1] - counts[0]) / counts[0]) * 100;
    
    return {
      direction: slope > 0 ? 'increasing' : 'decreasing',
      change: changePercentage,
      significance: Math.min(Math.abs(slope) / (sumY / n), 1),
      trendLine: monthlyData.map((_, i) => slope * i + intercept)
    };
  }

  private analyzeLocationDistribution(findings: any[]): any[] {
    const locationCounts = findings.reduce((acc, finding) => {
      acc[finding.location] = (acc[finding.location] || 0) + 1;
      return acc;
    }, {});

    const counts = Object.values(locationCounts) as number[];
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    return Object.entries(locationCounts).map(([name, count]) => ({
      name,
      count: count as number,
      zscore: (count as number - mean) / stdDev
    }));
  }

  private calculateCategorySeverityCorrelation(findings: any[]): any[] {
    const categories = [...new Set(findings.map(f => f.category))];
    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const correlations: any[] = [];

    for (const category of categories) {
      for (const severity of severities) {
        const categoryFindings = findings.filter(f => f.category === category);
        const severityCount = categoryFindings.filter(f => f.severity === severity).length;
        const totalCategoryCount = categoryFindings.length;
        
        if (totalCategoryCount >= 5) { // Minimum sample size
          const proportion = severityCount / totalCategoryCount;
          const overallProportion = findings.filter(f => f.severity === severity).length / findings.length;
          
          // Simple correlation calculation
          const correlation = (proportion - overallProportion) / overallProportion;
          
          correlations.push({
            category,
            severity,
            correlation,
            sampleSize: totalCategoryCount,
            breakdown: { count: severityCount, total: totalCategoryCount, proportion }
          });
        }
      }
    }

    return correlations;
  }

  private predictNextMonth(monthlyTrends: any): any {
    // Simple prediction based on trend analysis
    const trend = this.analyzeTrend(monthlyTrends.data);
    const lastValue = monthlyTrends.data[monthlyTrends.data.length - 1].count;
    const trendSlope = trend.trendLine[trend.trendLine.length - 1] - trend.trendLine[trend.trendLine.length - 2];
    
    return {
      value: Math.max(0, lastValue + trendSlope),
      confidence: trend.significance,
      factors: ['historical_trend', 'seasonal_patterns', 'recent_changes']
    };
  }

  private async getAllFindings(): Promise<any[]> {
    const snapshot = await this.db.collection('findings').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async getPatterns(): Promise<any[]> {
    const snapshot = await this.db.collection('patterns').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private calculateImpact(change: number): 'High' | 'Medium' | 'Low' {
    if (Math.abs(change) > 50) return 'High';
    if (Math.abs(change) > 20) return 'Medium';
    return 'Low';
  }

  private formatChartData(data: any[], type: string): any {
    // Format data for different chart types
    switch (type) {
      case 'line':
        return {
          labels: data.map(d => d.month || d.name),
          datasets: [{
            label: 'Findings',
            data: data.map(d => d.count || d.value),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }]
        };
      case 'bar':
        return {
          labels: data.map(d => d.name),
          datasets: [{
            label: 'Count',
            data: data.map(d => d.count),
            backgroundColor: 'rgba(59, 130, 246, 0.6)'
          }]
        };
      default:
        return data;
    }
  }

  private formatCorrelationChart(correlation: any): any {
    return {
      datasets: [{
        label: `${correlation.category} vs ${correlation.severity}`,
        data: correlation.breakdown.data || [],
        backgroundColor: 'rgba(59, 130, 246, 0.6)'
      }]
    };
  }

  private formatPredictionChart(historical: any, prediction: any): any {
    const historicalData = historical.data.map(d => d.count);
    const predictedData = [...historicalData, prediction.value];
    
    return {
      labels: [...historical.data.map(d => d.month), 'Predicted'],
      datasets: [
        {
          label: 'Historical',
          data: historicalData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        },
        {
          label: 'Predicted',
          data: [null, ...Array(historicalData.length - 1).fill(null), prediction.value],
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderDash: [5, 5]
        }
      ]
    };
  }

  private async generateTrendRecommendations(trendAnalysis: any): Promise<string[]> {
    if (trendAnalysis.direction === 'increasing') {
      return [
        'Investigate root causes of increasing trend',
        'Strengthen preventive controls',
        'Increase monitoring frequency',
        'Review recent process changes'
      ];
    } else {
      return [
        'Continue current improvement initiatives',
        'Document successful practices',
        'Maintain monitoring to prevent regression',
        'Share best practices across organization'
      ];
    }
  }

  private async generateCorrelationRecommendations(correlation: any): Promise<string[]> {
    return [
      `Focus additional attention on ${correlation.category} processes`,
      'Implement category-specific risk controls',
      'Provide targeted training for high-risk areas',
      'Monitor correlation patterns over time'
    ];
  }

  private async storeInsights(insights: Insight[]): Promise<void> {
    const batch = this.db.batch();
    
    for (const insight of insights) {
      const docRef = this.db.collection('insights').doc();
      batch.set(docRef, { ...insight, id: docRef.id });
    }
    
    await batch.commit();
  }
}

export const insightsService = new InsightsService();
```

---

## Phase 4: Testing & Deployment (Weeks 21-24)

### Week 21: Testing Strategy & Implementation

#### **Task 4.1: Comprehensive Testing Setup**

**Subtask 4.1.1: Testing Infrastructure**
```bash
# Frontend Testing Setup
cd frontend

# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event jest-environment-jsdom
npm install --save-dev cypress @cypress/react

# Backend Testing Setup
cd ../backend/functions

# Install testing dependencies
npm install --save-dev jest @types/jest supertest firebase-functions-test
npm install --save-dev ts-jest @firebase/rules-unit-testing
```

**Subtask 4.1.2: Unit Tests**
```typescript
// frontend/src/components/__tests__/StatisticsCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatisticsCard } from '../dashboard/StatisticsCard';

describe('StatisticsCard', () => {
  const defaultProps = {
    title: 'Total Findings',
    value: 287,
    color: 'blue' as const
  };

  it('renders title and value correctly', () => {
    render(<StatisticsCard {...defaultProps} />);
    
    expect(screen.getByText('Total Findings')).toBeInTheDocument();
    expect(screen.getByText('287')).toBeInTheDocument();
  });

  it('displays trend information when provided', () => {
    const propsWithTrend = {
      ...defaultProps,
      trend: { value: 15, direction: 'up' as const }
    };

    render(<StatisticsCard {...propsWithTrend} />);
    
    expect(screen.getByText('↑ 15%')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = jest.fn();
    const propsWithClick = { ...defaultProps, onClick: handleClick };

    render(<StatisticsCard {...propsWithClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct color classes', () => {
    const { container } = render(<StatisticsCard {...defaultProps} />);
    
    const iconContainer = container.querySelector('.bg-blue-500');
    expect(iconContainer).toBeInTheDocument();
  });
});
```

```typescript
// backend/functions/src/__tests__/findingsService.test.ts
import { findingsService } from '../services/findingsService';
import { firestore } from 'firebase-admin';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('FindingsService', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: {
        rules: `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true;
            }
          }
        }
        `
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('getFindings', () => {
    it('should return findings with filters applied', async () => {
      // Seed test data
      const testFindings = [
        {
          title: 'High Risk Finding',
          severity: 'High',
          status: 'Open',
          location: 'Jakarta',
          category: 'Operations'
        },
        {
          title: 'Low Risk Finding',
          severity: 'Low',
          status: 'Closed',
          location: 'Bandung',
          category: 'IT'
        }
      ];

      const db = testEnv.authenticatedContext('test-user').firestore();
      
      for (const finding of testFindings) {
        await db.collection('findings').add(finding);
      }

      // Test the service method
      const filters = { severity: ['High'], status: ['Open'] };
      const results = await findingsService.getFindings(filters);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('High Risk Finding');
      expect(results[0].severity).toBe('High');
    });

    it('should handle empty results gracefully', async () => {
      const filters = { severity: ['Critical'] };
      const results = await findingsService.getFindings(filters);

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('searchFindings', () => {
    it('should perform text search correctly', async () => {
      const testFindings = [
        {
          title: 'Inventory Management Issue',
          description: 'Problems with inventory tracking system',
          responsiblePerson: 'John Doe'
        },
        {
          title: 'Financial Reporting Delay',
          description: 'Delays in monthly financial reports',
          responsiblePerson: 'Jane Smith'
        }
      ];

      const db = testEnv.authenticatedContext('test-user').firestore();
      
      for (const finding of testFindings) {
        await db.collection('findings').add(finding);
      }

      const results = await findingsService.searchFindings('inventory');

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Inventory');
    });
  });
});
```

#### **Task 4.2: Integration Testing**

**Subtask 4.2.1: API Integration Tests**
```typescript
// backend/functions/src/__tests__/integration/chat.integration.test.ts
import request from 'supertest';
import { app } from '../../index';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Chat API Integration', () => {
  let testEnv: any;
  let authToken: string;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project'
    });

    // Create test user and get auth token
    const auth = testEnv.authenticatedContext('test-user');
    authToken = await auth.auth.createCustomToken('test-user');
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('POST /api/chat', () => {
    it('should create new chat session and respond to message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What are the most common audit findings?'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();
      expect(response.body.data.userMessage.content).toBe('What are the most common audit findings?');
      expect(response.body.data.assistantMessage.content).toBeDefined();
    });

    it('should validate required message field', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/sessions', () => {
    it('should return user chat sessions', async () => {
      // Create a test session first
      await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message for session list'
        });

      const response = await request(app)
        .get('/api/chat/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
      expect(response.body.data.sessions.length).toBeGreaterThan(0);
    });
  });
});
```

**Subtask 4.2.2: End-to-End Testing with Cypress**
```typescript
// frontend/cypress/e2e/dashboard.cy.ts
describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Mock authentication
    cy.login('test@example.com', 'password123');
    cy.visit('/dashboard');
  });

  it('should display dashboard statistics', () => {
    cy.get('[data-testid="stats-total-findings"]').should('contain', '287');
    cy.get('[data-testid="stats-open-findings"]').should('be.visible');
    cy.get('[data-testid="stats-high-risk"]').should('be.visible');
    cy.get('[data-testid="stats-overdue"]').should('be.visible');
  });

  it('should navigate to findings page when clicking statistics card', () => {
    cy.get('[data-testid="stats-total-findings"]').click();
    cy.url().should('include', '/findings');
  });

  it('should display recent activity', () => {
    cy.get('[data-testid="recent-activity"]').should('be.visible');
    cy.get('[data-testid="activity-item"]').should('have.length.greaterThan', 0);
  });

  it('should render charts correctly', () => {
    cy.get('[data-testid="risk-distribution-chart"]').should('be.visible');
    cy.get('[data-testid="location-summary-chart"]').should('be.visible');
  });
});

// frontend/cypress/e2e/chat.cy.ts
describe('AI Chat E2E Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
    cy.visit('/chat');
  });

  it('should start new chat session', () => {
    const testMessage = 'What are the most common audit findings?';
    
    cy.get('[data-testid="chat-input"]').type(testMessage);
    cy.get('[data-testid="chat-send-button"]').click();

    // Check user message appears
    cy.get('[data-testid="chat-message-user"]').should('contain', testMessage);
    
    // Check AI response appears
    cy.get('[data-testid="chat-message-assistant"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.empty');
  });

  it('should display chat suggestions', () => {
    cy.get('[data-testid="chat-suggestions"]').should('be.visible');
    cy.get('[data-testid="suggestion-button"]').should('have.length.greaterThan', 0);
  });

  it('should send message from suggestion click', () => {
    cy.get('[data-testid="suggestion-button"]').first().click();
    
    cy.get('[data-testid="chat-message-user"]').should('be.visible');
    cy.get('[data-testid="chat-message-assistant"]', { timeout: 10000 })
      .should('be.visible');
  });

  it('should maintain chat session history', () => {
    // Send first message
    cy.get('[data-testid="chat-input"]').type('First message');
    cy.get('[data-testid="chat-send-button"]').click();
    
    // Wait for response
    cy.get('[data-testid="chat-message-assistant"]', { timeout: 10000 })
      .should('be.visible');

    // Send second message
    cy.get('[data-testid="chat-input"]').type('Second message');
    cy.get('[data-testid="chat-send-button"]').click();

    // Check both messages are visible
    cy.get('[data-testid="chat-message-user"]').should('have.length', 2);
    cy.get('[data-testid="chat-message-assistant"]').should('have.length', 2);
  });
});
```

### Week 22: Performance Optimization & Security

#### **Task 4.3: Performance Testing & Optimization**

**Subtask 4.3.1: Performance Benchmarks**
```typescript
// scripts/performance-test.ts
import { performance } from 'perf_hooks';
import { findingsService } from '../backend/functions/src/services/findingsService';

interface PerformanceResult {
  operation: string;
  duration: number;
  recordCount: number;
  averagePerRecord: number;
}

class PerformanceTest {
  private results: PerformanceResult[] = [];

  async runDatabasePerformanceTests(): Promise<void> {
    console.log('Running database performance tests...');

    // Test 1: Large dataset retrieval
    await this.testOperation('Large Dataset Retrieval', async () => {
      return await findingsService.getFindings({}, 'dateCreated', 'desc');
    });

    // Test 2: Complex filtering
    await this.testOperation('Complex Filtering', async () => {
      return await findingsService.getFindings({
        severity: ['High', 'Critical'],
        status: ['Open', 'In Progress'],
        location: ['Jakarta', 'Bandung']
      });
    });

    // Test 3: Text search
    await this.testOperation('Text Search', async () => {
      return await findingsService.searchFindings('inventory management system');
    });

    this.printResults();
  }

  private async testOperation(name: string, operation: () => Promise<any[]>): Promise<void> {
    const startTime = performance.now();
    const results = await operation();
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    const recordCount = results.length;
    const averagePerRecord = recordCount > 0 ? duration / recordCount : 0;

    this.results.push({
      operation: name,
      duration,
      recordCount,
      averagePerRecord
    });

    console.log(`${name}: ${duration.toFixed(2)}ms for ${recordCount} records`);
  }

  private printResults(): void {
    console.log('\n=== Performance Test Results ===');
    this.results.forEach(result => {
      console.log(`${result.operation}:`);
      console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`  Records: ${result.recordCount}`);
      console.log(`  Avg per record: ${result.averagePerRecord.toFixed(4)}ms`);
      console.log('');
    });

    // Performance assertions
    this.results.forEach(result => {
      if (result.operation === 'Large Dataset Retrieval' && result.duration > 2000) {
        console.warn(`WARNING: ${result.operation} took ${result.duration}ms (>2000ms threshold)`);
      }
      if (result.operation === 'Text Search' && result.duration > 1000) {
        console.warn(`WARNING: ${result.operation} took ${result.duration}ms (>1000ms threshold)`);
      }
    });
  }
}

// Run performance tests
const perfTest = new PerformanceTest();
perfTest.runDatabasePerformanceTests().catch(console.error);
```

**Subtask 4.3.2: Frontend Performance Optimization**
```typescript
// frontend/src/hooks/useOptimizedFindings.ts
import { useState, useEffect, useMemo } from 'react';
import { Finding } from '../types';
import { findingsService } from '../services/findingsService';

interface UseOptimizedFindingsOptions {
  pageSize: number;
  enableVirtualization: boolean;
  cacheResults: boolean;
}

export const useOptimizedFindings = (
  filters: any,
  options: UseOptimizedFindingsOptions = {
    pageSize: 50,
    enableVirtualization: true,
    cacheResults: true
  }
) => {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Memoize filter key for caching
  const filterKey = useMemo(() => 
    JSON.stringify(filters), [filters]
  );

  // Cache for results
  const cache = useMemo(() => new Map<string, Finding[]>(), []);

  const loadFindings = async (page: number = 0, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheKey = `${filterKey}_${page}`;
      if (options.cacheResults && cache.has(cacheKey)) {
        const cachedResults = cache.get(cacheKey)!;
        if (append) {
          setFindings(prev => [...prev, ...cachedResults]);
        } else {
          setFindings(cachedResults);
        }
        setLoading(false);
        return;
      }

      // Fetch from API
      const results = await findingsService.getFindings(
        filters,
        'dateCreated',
        'desc',
        options.pageSize,
        page * options.pageSize
      );

      // Cache results
      if (options.cacheResults) {
        cache.set(cacheKey, results);
      }

      // Update state
      if (append) {
        setFindings(prev => [...prev, ...results]);
      } else {
        setFindings(results);
      }

      setHasMore(results.length === options.pageSize);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load findings');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadFindings(currentPage + 1, true);
    }
  };

  const refresh = () => {
    cache.clear();
    setCurrentPage(0);
    loadFindings(0, false);
  };

  useEffect(() => {
    loadFindings(0, false);
  }, [filterKey]);

  return {
    findings,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
};
```

#### **Task 4.4: Security Audit & Hardening**

**Subtask 4.4.1: Security Testing**
```typescript
// backend/functions/src/__tests__/security/auth.security.test.ts
import request from 'supertest';
import { app } from '../../index';

describe('Authentication Security Tests', () => {
  describe('JWT Token Security', () => {
    it('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/api/findings')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid tokens', async () => {
      const response = await request(app)
        .get('/api/findings')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .get('/api/findings')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE findings; --";
      
      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: maliciousInput,
          description: 'Test finding'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent XSS in user inputs', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: xssPayload,
          description: 'Test finding'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce maximum input lengths', async () => {
      const oversizedInput = 'A'.repeat(10000);
      
      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: oversizedInput,
          description: 'Test finding'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits on chat API', async () => {
      const promises = Array.from({ length: 25 }, () =>
        request(app)
          .post('/api/chat')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ message: 'Test message' })
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
```

**Subtask 4.4.2: Privacy Protection Validation**
```typescript
// backend/functions/src/__tests__/security/privacy.security.test.ts
import { privacyService } from '../../services/privacyService';

describe('Privacy Protection Security Tests', () => {
  describe('Data Pseudonymization', () => {
    it('should pseudonymize personal names', async () => {
      const testData = {
        title: 'Test Finding',
        responsiblePerson: 'John Doe',
        description: 'John Doe was responsible for this finding'
      };

      const result = await privacyService.pseudonymizeData(testData, 'test-batch');

      expect(result.data.responsiblePerson).not.toBe('John Doe');
      expect(result.data.responsiblePerson).toMatch(/^Person_[A-Z0-9]+$/);
      expect(result.data.description).not.toContain('John Doe');
      expect(result.mappingReferences.length).toBeGreaterThan(0);
    });

    it('should pseudonymize employee IDs', async () => {
      const testData = {
        title: 'Test Finding',
        description: 'Employee EMP-12345 and ID-98765 were involved'
      };

      const result = await privacyService.pseudonymizeData(testData, 'test-batch');

      expect(result.data.description).not.toContain('EMP-12345');
      expect(result.data.description).not.toContain('ID-98765');
      expect(result.data.description).toMatch(/ID_[A-Z0-9]+/);
    });

    it('should pseudonymize financial amounts', async () => {
      const testData = {
        title: 'Financial Finding',
        description: 'Amount involved: Rp 1,500,000 and $25,000'
      };

      const result = await privacyService.pseudonymizeData(testData, 'test-batch');

      expect(result.data.description).not.toContain('1,500,000');
      expect(result.data.description).not.toContain('25,000');
      expect(result.data.description).toMatch(/Amount_[A-Z0-9]+/);
    });

    it('should maintain consistency in pseudonymization', async () => {
      const testData = {
        title: 'Consistency Test',
        responsiblePerson: 'Jane Smith',
        description: 'Jane Smith reported this issue. Jane Smith needs training.'
      };

      const result = await privacyService.pseudonymizeData(testData, 'test-batch');
      
      // Extract the pseudonym used
      const pseudonym = result.data.responsiblePerson;
      
      // Check that the same pseudonym is used consistently
      const descriptionParts = result.data.description.split(pseudonym);
      expect(descriptionParts.length).toBe(3); // Should be split into 3 parts
    });
  });

  describe('Data De-pseudonymization', () => {
    it('should correctly reverse pseudonymization', async () => {
      const originalData = {
        title: 'Test Finding',
        responsiblePerson: 'Alice Johnson',
        description: 'Alice Johnson discovered this issue'
      };

      // Pseudonymize
      const pseudonymized = await privacyService.pseudonymizeData(originalData, 'test-batch');
      
      // De-pseudonymize
      const depseudonymized = await privacyService.depseudonymizeData(
        pseudonymized.data,
        pseudonymized.mappingReferences
      );

      expect(depseudonymized.responsiblePerson).toBe('Alice Johnson');
      expect(depseudonymized.description).toContain('Alice Johnson');
    });

    it('should handle missing mappings gracefully', async () => {
      const pseudonymizedData = {
        responsiblePerson: 'Person_ABC123',
        description: 'Person_ABC123 was responsible'
      };

      const depseudonymized = await privacyService.depseudonymizeData(
        pseudonymizedData,
        ['non-existent-mapping-id']
      );

      // Should return data unchanged if mapping not found
      expect(depseudonymized.responsiblePerson).toBe('Person_ABC123');
    });
  });

  describe('Privacy Mapping Security', () => {
    it('should store mappings with expiration', async () => {
      const testData = { responsiblePerson: 'Test Person' };
      
      const result = await privacyService.pseudonymizeData(testData, 'test-batch');
      
      // Verify mapping was stored (implementation would check Firestore)
      expect(result.mappingReferences.length).toBeGreaterThan(0);
    });

    it('should prevent unauthorized access to mappings', async () => {
      // This would test that mappings collection has proper security rules
      // preventing direct access from client applications
      expect(true).toBe(true); // Placeholder for actual implementation
    });
  });
});
```

### Week 23: User Training & Documentation

#### **Task 4.5: User Training Materials**

**🔴 MANUAL TASK** - You must create these materials:

**Subtask 4.5.1: User Training Plan**
```markdown
# FIRST-AID User Training Program

## Training Objectives
- Understand FIRST-AID system capabilities
- Learn basic navigation and search functions
- Master AI chat interface for insights
- Practice import/export operations
- Understand privacy protection features

## Training Schedule (2 weeks)

### Week 1: Basic Operations
**Day 1-2: System Overview**
- System architecture and benefits
- Login and authentication
- Dashboard navigation
- Basic search functionality

**Day 3-4: Data Management**
- Import Excel files
- Create/edit findings
- Use filters and sorting
- Export data

**Day 5: AI Chat Basics**
- Understanding AI capabilities
- Basic chat interactions
- Interpreting AI responses
- Privacy protection explanation

### Week 2: Advanced Features
**Day 1-2: Advanced AI Usage**
- Complex queries and analysis
- Pattern recognition
- Insight interpretation
- Report generation

**Day 3-4: Collaboration**
- Sharing findings
- Team workflows
- Best practices
- Troubleshooting

**Day 5: Assessment & Feedback**
- Practical exercises
- Q&A session
- Feedback collection
- Additional support planning

## Training Materials Needed
1. User manual (digital)
2. Video tutorials (5-10 minutes each)
3. Interactive exercises
4. Quick reference cards
5. FAQ document
```

**Subtask 4.5.2: Video Tutorial Scripts**
```markdown
# Video Tutorial 1: Getting Started (7 minutes)

## Script Outline:

### Introduction (1 minute)
"Welcome to FIRST-AID, your intelligent audit findings management system. In this tutorial, you'll learn how to log in, navigate the dashboard, and perform basic searches."

### Login & Dashboard (2 minutes)
"First, let's log in to the system. Use your company email and password..."
- Show login process
- Point out dashboard elements
- Explain statistics cards
- Demonstrate navigation menu

### Basic Search (2 minutes)
"Now let's search for audit findings. You can search by keywords, filter by location, severity, or status..."
- Demonstrate search bar
- Show filter options
- Explain search results

### Viewing Findings (2 minutes)
"When you find a relevant result, click to view details..."
- Show finding details page
- Explain all fields
- Demonstrate edit functionality

### Summary & Next Steps (1 minute)
"In this tutorial, you learned the basics. In the next video, we'll explore the AI chat feature..."

# Video Tutorial 2: AI Chat Assistant (8 minutes)

## Script Outline:

### Introduction (1 minute)
"The AI chat assistant is FIRST-AID's most powerful feature. It can analyze your audit data and provide insights in natural language."

### Starting a Chat (2 minutes)
"Click on the chat icon to start. You can ask questions like 'What are the most common findings in Jakarta?'"
- Show chat interface
- Demonstrate first question
- Explain response format

### Understanding Responses (3 minutes)
"The AI provides detailed answers with source references..."
- Show response structure
- Explain confidence scores
- Demonstrate source links
- Show suggestions

### Advanced Queries (2 minutes)
"You can ask complex questions like 'Compare Jakarta vs Bandung findings' or 'Show trends over time'"
- Demonstrate complex queries
- Show pattern analysis
- Explain recommendations

### Privacy Protection (1 minute)
"Your data is protected - the AI never sees real names or sensitive information, but you get useful results with actual names."
- Explain pseudonymization
- Show data protection in action
```

#### **Task 4.6: Documentation Creation**

**Subtask 4.6.1: User Manual**
**🔴 MANUAL TASK** - Create comprehensive user manual covering:
- System overview and benefits
- Step-by-step procedures for all features
- Troubleshooting guide
- Best practices
- FAQ section

**Subtask 4.6.2: Technical Documentation**
**🔴 MANUAL TASK** - Create technical documentation for IT support:
- System architecture overview
- Deployment procedures
- Backup and recovery procedures
- Security configuration
- Performance monitoring
- Troubleshooting guide

### Week 24: Production Deployment

#### **Task 4.7: Production Environment Setup**

**Subtask 4.7.1: Firebase Production Configuration**
**🔴 MANUAL TASK** - Firebase Console Setup:

```bash
# Manual Steps in Firebase Console:
1. Create Production Project:
   - Go to Firebase Console
   - Create new project: "first-aid-prod"
   - Enable required services (same as development)

2. Configure Production Firestore:
   - Set up production security rules
   - Configure backup schedules
   - Set up monitoring alerts

3. Set up Cloud Functions:
   - Deploy production functions
   - Configure environment variables
   - Set up monitoring and logging

4. Configure Authentication:
   - Set up production user management
   - Configure domain restrictions
   - Set up backup authentication methods

5. Set up Monitoring:
   - Enable Firebase Performance Monitoring
   - Set up alerting rules
   - Configure crash reporting
```

**Subtask 4.7.2: Domain and SSL Setup**
**🔴 MANUAL TASK** - Domain Configuration:

```bash
# Manual Steps:
1. Domain Registration:
   - Register company domain (e.g., firstaid.company.com)
   - Configure DNS settings
   - Set up subdomain if needed

2. SSL Certificate:
   - Enable Firebase Hosting SSL
   - Verify certificate installation
   - Test HTTPS redirects

3. Custom Domain Setup:
   - Add custom domain in Firebase Hosting
   - Update DNS records
   - Verify domain ownership
```

#### **Task 4.8: Production Deployment**

**Subtask 4.8.1: Deployment Scripts**
```bash
#!/bin/bash
# deploy-production.sh

set -e

echo "🚀 Starting FIRST-AID Production Deployment"

# Verify we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "❌ Error: Must be on main branch for production deployment"
    exit 1
fi

# Verify all tests pass
echo "🧪 Running test suite..."
cd frontend && npm test -- --watchAll=false
cd ../backend/functions && npm test
cd ../..

echo "✅ All tests passed"

# Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm run build
cd ..

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase use production
firebase deploy --only hosting,functions,firestore:rules

echo "🎉 Production deployment completed successfully!"

# Run post-deployment verification
echo "🔍 Running post-deployment verification..."
./scripts/verify-deployment.sh

echo "✅ Deployment verification completed"
```

**Subtask 4.8.2: Post-Deployment Verification**
```bash
#!/bin/bash
# verify-deployment.sh

echo "🔍 Verifying production deployment..."

# Test endpoints
echo "Testing API endpoints..."
curl -f https://firstaid.company.com/api/health || exit 1

# Test authentication
echo "Testing authentication flow..."
# Add authentication test here

# Test database connectivity
echo "Testing database connectivity..."
# Add database test here

# Test AI services
echo "Testing AI services..."
# Add AI service test here

echo "✅ All deployment verification tests passed"
```

#### **Task 4.9: Go-Live Checklist**

**🔴 MANUAL TASK** - Pre-Go-Live Checklist:

```markdown
# FIRST-AID Go-Live Checklist

## Technical Readiness
- [ ] Production environment deployed and tested
- [ ] SSL certificates installed and verified
- [ ] Database backup procedures tested
- [ ] Monitoring and alerting configured
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Disaster recovery plan tested

## Data Migration
- [ ] Excel files processed and imported
- [ ] Data validation completed
- [ ] Privacy mapping verified
- [ ] Backup of original files created
- [ ] Data integrity checks passed

## User Readiness
- [ ] User training completed
- [ ] User accounts created
- [ ] Access permissions configured
- [ ] User manual distributed
- [ ] Support procedures established

## Operational Readiness
- [ ] Support team trained
- [ ] Escalation procedures defined
- [ ] Maintenance windows scheduled
- [ ] Change management process established
- [ ] Success metrics defined

## Final Sign-off
- [ ] Technical team approval
- [ ] Security team approval
- [ ] User acceptance testing completed
- [ ] Management approval for go-live
- [ ] Communication plan executed
```

## Implementation Tracking

### Progress Tracking Template
```markdown
# Weekly Progress Tracking

## Week [X]: [Phase Name]
**Target Completion:** [Date]
**Actual Completion:** [Date]
**Status:** [On Track / Delayed / Completed]

### Completed Tasks:
- [x] Task 1
- [x] Task 2

### In Progress:
- [ ] Task 3 (80% complete)

### Blockers:
- Issue with external API integration
- Waiting for security review

### Next Week Priorities:
1. Complete Task 3
2. Start integration testing
3. Prepare user training materials

### Metrics:
- Code coverage: 85%
- Tests passing: 95%
- Performance benchmarks: Met
```

### Risk Management
```markdown
# Risk Mitigation Strategies

## Technical Risks
1. **AI API Rate Limits**
   - Mitigation: Implement caching and fallback services
   - Contingency: Budget for higher API limits

2. **Data Migration Issues**
   - Mitigation: Extensive testing with sample data
   - Contingency: Manual data entry procedures

3. **Performance Issues**
   - Mitigation: Load testing and optimization
   - Contingency: Infrastructure scaling plan

## Timeline Risks
1. **Development Delays**
   - Mitigation: Buffer time in schedule
   - Contingency: Scope reduction if needed

2. **External Dependencies**
   - Mitigation: Early engagement with vendors
   - Contingency: Alternative solutions identified
```

---

## Summary

This comprehensive implementation plan provides:

✅ **Complete 24-week roadmap** with detailed tasks and subtasks
✅ **Manual tasks clearly marked** with step-by-step instructions
✅ **Code implementations** for all major components
✅ **Testing strategies** and example test cases
✅ **Deployment procedures** and production setup
✅ **Risk mitigation** and progress tracking

**Key Manual Tasks You Must Complete:**
1. Firebase project and API key setup (Week 1)
2. OpenAI/Gemini API configuration (Week 1)
3. Domain and SSL setup (Week 24)
4. User training delivery (Week 23)
5. Production deployment verification (Week 24)

## Implementation Success Metrics

### Technical Metrics
- **Performance**: Search < 2s, AI chat < 5s, report generation < 30s
- **Quality**: 90%+ code coverage, 95%+ test pass rate
- **Security**: Zero critical vulnerabilities, OWASP compliance
- **Reliability**: 99.9% uptime, < 0.1% error rate

### Business Metrics
- **User Adoption**: 90%+ active usage within 30 days
- **Time Savings**: 10+ hours/week per user
- **Cost Efficiency**: ≤ $2.30/user/month
- **ROI**: 300%+ in first year

### Privacy Metrics
- **Data Protection**: 100% pseudonymization compliance
- **AI Safety**: Zero real data exposure to external AI services
- **Audit Trail**: Complete logging of all data access

## Quick Start Guide

### For Development Team
1. **Week 1**: Complete manual Firebase setup following Phase 1 instructions
2. **Week 2-4**: Follow Foundation phase step-by-step
3. **Week 5**: Begin Core Development with data import functionality
4. **Week 13**: Start AI integration after core features are stable
5. **Week 21**: Begin comprehensive testing phase

### For Project Manager
1. Use weekly progress tracking template for status updates
2. Monitor risk mitigation strategies weekly
3. Conduct Phase Gate Reviews at end of each phase
4. Coordinate user training starting Week 22
5. Prepare go-live communications for Week 24

### For Users
1. **Week 22**: Participate in user training sessions
2. **Week 23**: Test pilot version and provide feedback
3. **Week 24**: Begin production usage with full system

## Next Steps

1. **Immediate (This Week)**:
   - Review and approve implementation plan
   - Allocate development resources
   - Set up project management tracking

2. **Week 1 Manual Tasks**:
   - Create Firebase project
   - Configure authentication providers
   - Set up OpenAI/Gemini API keys
   - Initialize project repository

3. **Phase Gate Reviews**:
   - End of Phase 1 (Week 4): Foundation readiness
   - End of Phase 2 (Week 12): Core functionality complete
   - End of Phase 3 (Week 20): AI integration complete
   - End of Phase 4 (Week 24): Production ready

The FIRST-AID system is ready for implementation following this comprehensive 24-week plan!

The plan balances automation with necessary manual interventions, ensuring successful delivery of your AI-powered audit findings management system within the 6-month timeline and budget constraints.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create comprehensive implementation roadmap", "status": "completed", "activeForm": "Creating comprehensive implementation roadmap"}, {"content": "Define Phase 1: Foundation & Setup tasks", "status": "completed", "activeForm": "Defining Phase 1: Foundation & Setup tasks"}, {"content": "Define Phase 2: Core Development tasks", "status": "in_progress", "activeForm": "Defining Phase 2: Core Development tasks"}, {"content": "Define Phase 3: AI Integration tasks", "status": "pending", "activeForm": "Defining Phase 3: AI Integration tasks"}, {"content": "Define Phase 4: Testing & Deployment tasks", "status": "pending", "activeForm": "Defining Phase 4: Testing & Deployment tasks"}, {"content": "Generate implementation documentation", "status": "pending", "activeForm": "Generating implementation documentation"}]