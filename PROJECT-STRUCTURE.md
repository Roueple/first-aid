# FIRST-AID Project Structure

**Last Updated**: November 28, 2025  
**Status**: ✅ Organized and Clean

---

## 📁 Root Directory (Clean!)

The root directory now contains only essential files:

### Configuration Files
```
.env                    # Environment variables (not in git)
.env.example            # Environment template
.firebaserc             # Firebase project config
.gitignore              # Git ignore rules
.prettierrc             # Code formatting
.test-credentials.json  # Test credentials
electron-builder.json   # Electron packaging
eslint.config.js        # Linting rules
firebase.json           # Firebase config
firestore.indexes.json  # Firestore indexes
firestore.rules         # Security rules
package.json            # Dependencies
postcss.config.js       # PostCSS config
tailwind.config.js      # TailwindCSS config
tsconfig.json           # TypeScript config
tsconfig.main.json      # Main process TS config
tsconfig.node.json      # Node TS config
vite.config.ts          # Vite build config
vitest.config.ts        # Vitest test config
```

### Documentation (Root Level)
```
README.md               # Project overview (KEEP IN ROOT)
DOCUMENTATION-INDEX.md  # Documentation index (KEEP IN ROOT)
PROJECT-STRUCTURE.md    # This file (KEEP IN ROOT)
```

### Test Scripts (Root Level)
```
test-consistency.ts                    # Consistency testing
test-query-router.ts                   # Query router tests
test-query-all-findings.mjs            # Findings query tests
test-query-router-prod.mjs             # Production tests
test-query-router-prod-v2.mjs          # Production tests V2
test-query-router-prod-auto.mjs        # Automated production tests
test-smart-query-router-unified.mjs    # Unified router tests
firestore.rules.test.ts                # Firestore rules tests
```

### Build Output
```
dist/                   # Build output (not in git)
node_modules/           # Dependencies (not in git)
firestore-debug.log     # Debug log (not in git)
```

---

## 📚 Documentation Structure

### `/docs-archive/` - All Documentation (50+ files)

```
docs-archive/
│
├── README.md                          # Archive index
│
├── 01-project-overview/               # 7 files
│   ├── PROJECT-STATUS.md              # ⭐ Current status
│   ├── FIRST-AID-Executive-Summary.md # ⭐ For stakeholders
│   ├── FIRST-AID-System-Architecture.md
│   ├── FIRST-AID-Component-Design.md
│   ├── FIRST-AID-Implementation-Plan.md
│   ├── developer-comment.md
│   └── developer-comment-2.md
│
├── 02-setup-guides/                   # 7 files
│   ├── SETUP.md                       # ⭐ Initial setup
│   ├── FIREBASE_SETUP.md              # ⭐ Firebase config
│   ├── FIRESTORE_RULES_QUICK_START.md
│   ├── RESEED-DATABASE-GUIDE.md
│   ├── GEMINI-API-CONFIGURATION-SUMMARY.md
│   ├── gemini.md
│   └── findings-table-structure.md
│
├── 03-testing-guides/                 # 9 files
│   ├── COMPLETE_MANUAL_TESTING_GUIDE.md # ⭐ Full testing
│   ├── MANUAL_TESTING_CHECKLIST_TASKS_1-6.md
│   ├── MANUAL_TESTING_GUIDE.md
│   ├── TEST-RESULTS-SUMMARY.md        # ⭐ Latest results
│   ├── test-results-unified-2025-11-28T07-07-36-180Z.md
│   ├── QUERY-ROUTER-TEST-RESULTS.md
│   ├── QUERY-ROUTER-PROD-TEST-RESULTS.md
│   ├── TEST-QUERY-ROUTER-README.md
│   └── test-query-router-real.md
│
├── 04-implementation-summaries/       # 4 files
│   ├── CACHING-IMPLEMENTATION-SUMMARY.md
│   ├── SMART-QUERY-ROUTER-V2-SUMMARY.md # ⭐ Query router
│   ├── INTEGRATION-COMPLETE-SUMMARY.md
│   └── FUSION-COMPLETE.md
│
├── 05-chat-history/                   # 6 files
│   ├── CHAT-HISTORY-COMPLETE.md       # ⭐ Feature overview
│   ├── CHAT-HISTORY-IMPLEMENTATION.md
│   ├── CHAT-HISTORY-SETUP-GUIDE.md
│   ├── CHAT-HISTORY-QUICK-REFERENCE.md
│   ├── CHAT-HISTORY-ALL-FIXES.md
│   └── CHAT-HISTORY-FIRESTORE-FIX.md
│
├── 06-query-router/                   # 2 files
│   ├── TRANSPARENT-LOGGING-COMPLETE.md
│   └── TRANSPARENT-LOGGING-GUIDE.md
│
├── 07-data-masking/                   # 2 files
│   ├── UNIFIED-MASKING-INTEGRATION.md
│   └── QUICK-REFERENCE-UNIFIED-MASKING.md
│
├── 08-consistency-fixes/              # 6 files
│   ├── CONSISTENCY-CHECK-SUMMARY.md
│   ├── CONSISTENCY-FIXES.md
│   ├── QUICK-CONSISTENCY-CHECK.md
│   ├── verify-consistency.md
│   ├── DATA-FLOW-DIAGRAM.md
│   └── FINAL-VERIFICATION-CHECKLIST.md
│
├── 09-reviews-cleanup/                # 5 files
│   ├── IMPLEMENTATION_REVIEW.md       # ⭐ Comprehensive review
│   ├── REVIEW_SUMMARY.md
│   ├── TASKS-1-4-FINAL-REVIEW.md
│   ├── CLEANUP-COMPLETE.md
│   └── CLEANUP_CHECKLIST.md
│
└── 10-api-architecture/               # 1 file
    └── FIRST-AID-API-Specification.md # ⭐ Complete API docs
```

### `/docs/` - Task Completion Reports

```
docs/
├── README.md
├── task-2-completion-report.md
├── task-3.1-completion-report.md
├── task-3.2-completion-report.md
├── task-3.3-completion-report.md
├── task-4.1-completion-report.md
├── task-4.2-completion-report.md
├── task-4.3-completion-report.md
├── task-4.4-completion-report.md
├── task-11.1-completion-report.md
├── smart-query-router-v2-integration.md
├── smart-query-router-v2-flow.md
└── data-masking-unified.md
```

---

## 💻 Source Code Structure

### `/src/` - Application Source

```
src/
├── main/                      # Electron main process
│   ├── main.ts
│   └── preload.ts
│
├── renderer/                  # React application
│   ├── pages/                 # Page components
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.html
│   └── index.css
│
├── components/                # Reusable components
│   ├── AuthGuard.tsx
│   ├── LoginForm.tsx
│   └── ConnectionStatus.tsx
│
├── services/                  # Business logic
│   ├── AuthService.ts
│   ├── DatabaseService.ts
│   ├── FindingsService.ts
│   ├── ChatSessionService.ts
│   ├── GeminiService.ts
│   ├── SmartQueryRouter.ts
│   ├── IntentRecognitionService.ts
│   ├── DataMaskingService.ts
│   ├── TransparentLogger.ts
│   ├── QueryRouterService.ts
│   ├── ResponseFormatter.ts
│   ├── ContextBuilder.ts
│   ├── FilterExtractor.ts
│   ├── QueryClassifier.ts
│   └── __tests__/
│
├── contexts/                  # React contexts
│   └── AuthContext.tsx
│
├── hooks/                     # Custom React hooks
│   ├── useDashboardStats.ts
│   └── useFindings.ts
│
├── types/                     # TypeScript types
│   ├── finding.types.ts
│   ├── user.types.ts
│   ├── chat.types.ts
│   ├── queryRouter.types.ts
│   └── index.ts
│
├── config/                    # Configuration
│   └── firebase.ts
│
└── utils/                     # Utility functions
    ├── connectionMonitor.ts
    └── cacheUtils.ts
```

---

## 🧪 Testing Structure

### `/test-results/` - Test Results

```
test-results/
└── query-router-test-results.md
```

### Root Level Test Scripts
- All test scripts remain in root for easy execution
- Run with: `npm test` or `npx tsx test-*.ts`

---

## 🔧 Configuration Structure

### `/.kiro/` - Kiro Specs

```
.kiro/
├── settings/
└── specs/
    ├── first-aid-system/
    │   ├── requirements.md
    │   ├── design.md
    │   └── tasks.md
    └── smart-query-router/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

### `/functions/` - Firebase Cloud Functions

```
functions/
├── src/
├── package.json
└── tsconfig.json
```

### `/scripts/` - Build Scripts

```
scripts/
├── deploy-firestore-rules.sh
├── deploy-firestore-rules.bat
├── test-firestore-rules.sh
└── test-firestore-rules.bat
```

---

## 🎯 Quick Access Guide

### "I want to start developing"
1. **README.md** (root) - Project overview
2. **docs-archive/02-setup-guides/SETUP.md** - Setup guide
3. **docs-archive/02-setup-guides/FIREBASE_SETUP.md** - Firebase config

### "I want to test the app"
1. **docs-archive/03-testing-guides/COMPLETE_MANUAL_TESTING_GUIDE.md**
2. Run: `npm test`

### "I want to understand a feature"
1. **DOCUMENTATION-INDEX.md** (root) - Find the right doc
2. Navigate to **docs-archive/** category folder

### "I want to see project status"
1. **docs-archive/01-project-overview/PROJECT-STATUS.md**

### "I want API documentation"
1. **docs-archive/10-api-architecture/FIRST-AID-API-Specification.md**

---

## 📊 File Count Summary

| Location | Count | Purpose |
|----------|-------|---------|
| Root config files | ~25 | Build, lint, test configs |
| Root docs | 3 | Essential documentation |
| Root test scripts | 7 | Test execution scripts |
| docs-archive/ | 50+ | All documentation |
| docs/ | 13 | Task completion reports |
| src/ | 100+ | Application source code |
| test-results/ | 1+ | Test output files |

**Total**: ~200 files (excluding node_modules, dist)

---

## ✅ Benefits of New Structure

### Before (Messy)
- ❌ 50+ .md files in root directory
- ❌ Hard to find specific documentation
- ❌ No clear organization
- ❌ Cluttered root folder

### After (Clean)
- ✅ Only 3 .md files in root (README, INDEX, STRUCTURE)
- ✅ All docs organized by category
- ✅ Easy to navigate with index
- ✅ Clean, professional structure
- ✅ Scalable for future growth

---

## 🔄 Maintenance

### Adding New Documentation
1. Determine category (01-10)
2. Place in appropriate `docs-archive/` folder
3. Update `docs-archive/README.md`
4. Update `DOCUMENTATION-INDEX.md`

### Adding New Features
1. Create feature documentation in appropriate category
2. Add task completion report to `docs/`
3. Update project status
4. Update this structure document if needed

---

## 📝 Notes

- **Keep root clean**: Only essential files in root
- **Use index**: Always use DOCUMENTATION-INDEX.md to find docs
- **Test scripts**: Keep in root for easy execution
- **Archive old docs**: Move outdated docs to archive subfolder

---

**Structure Status**: ✅ Clean and Organized  
**Last Reorganization**: November 28, 2025  
**Maintained By**: Development Team
