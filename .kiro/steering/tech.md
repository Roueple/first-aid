# Technology Stack

## Core Technologies

- **Runtime**: Node.js 18+
- **Desktop Framework**: Electron 28
- **Frontend**: React 18 + TypeScript (strict mode)
- **Build Tool**: Vite 7
- **Styling**: TailwindCSS 3 + PostCSS
- **Routing**: React Router v6

## Backend & Services

- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (email/password)
- **Cloud Functions**: Firebase Cloud Functions (Node.js)
- **AI/ML**: Google Gemini AI (@google/generative-ai)
- **State Management**: React Context + TanStack Query

## Key Libraries

- **UI Components**: @chatscope/chat-ui-kit-react, framer-motion, recharts
- **Data Tables**: @tanstack/react-table
- **Excel**: exceljs, xlsx
- **Validation**: zod
- **Utilities**: clsx, tailwind-merge

## Development Tools

- **Linting**: ESLint 9 + TypeScript ESLint
- **Formatting**: Prettier
- **Testing**: Vitest + @testing-library/react
- **Type Checking**: TypeScript 5.7 (strict mode)

## Common Commands

### Development
```bash
npm run dev                    # Start dev server (Vite + Electron)
npm run dev:renderer           # Vite dev server only
npm run dev:electron           # Electron only
npm run dev:emulators          # Firebase emulators
```

### Building
```bash
npm run build                  # Build for production
npm run build:renderer         # Build React app
npm run build:electron         # Build Electron main process
npm run package                # Package app for distribution
```

### Code Quality
```bash
npm run lint                   # Run ESLint
npm run format                 # Format with Prettier
npm test                       # Run tests (single run)
npm run test:watch             # Run tests in watch mode
npm run test:ui                # Run tests with UI
```

### Data Management
```bash
npm run import:projects        # Import projects from Excel
npm run import:audit-results   # Import audit results from Excel
npm run recalc:projects        # Recalculate project statistics
npm run migrate:projects       # Migrate project data structure
```

### Firebase
```bash
npm run deploy:rules           # Deploy Firestore security rules
npm run test:rules             # Test Firestore rules with emulator
firebase deploy --only firestore:indexes  # Deploy indexes
```

### Testing Scripts (Windows batch files)
```bash
run-all-tests.bat              # Run all integration tests
run-simple-query-tests.bat     # Test simple query system
test-it-findings-2024.bat      # Test IT findings queries
check-audit-results.bat        # Verify audit results data
```

## TypeScript Configuration

- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **Strict Mode**: Enabled (all strict checks on)
- **JSX**: react-jsx
- **No Unused**: Locals and parameters checked
- **Isolated Modules**: Required for Vite

## Build Output

- **Development**: `http://localhost:5173` (Vite dev server)
- **Production**: `dist/` directory
  - `dist/main/` - Electron main process
  - `dist/renderer/` - React application
