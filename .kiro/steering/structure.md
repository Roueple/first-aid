# Project Structure

## Root Organization

Keep root directory clean - only essential config files and 3 markdown docs (README.md, DOCUMENTATION-INDEX.md, PROJECT-STRUCTURE.md).

## Source Code (`/src`)

```
src/
├── main/                      # Electron main process
│   ├── main.ts               # Entry point
│   └── preload.ts            # Preload script
│
├── renderer/                  # React application
│   ├── pages/                # Page components (HomePage, ChatPage, etc.)
│   ├── styles/               # CSS files
│   ├── App.tsx               # Root component
│   ├── main.tsx              # React entry point
│   └── index.html            # HTML template
│
├── components/                # Reusable UI components
│   ├── *Table.tsx            # Table components (Projects, AuditResults, etc.)
│   ├── Chat*.tsx             # Chat-related components
│   ├── Finding*.tsx          # Finding-related components
│   └── __tests__/            # Component tests
│
├── services/                  # Business logic layer
│   ├── *Service.ts           # Service classes (Auth, Database, etc.)
│   ├── Smart*.ts             # AI/ML services (SmartQueryRouter, etc.)
│   ├── Query*.ts             # Query-related services
│   ├── README.md             # Service documentation
│   └── __tests__/            # Service tests
│
├── contexts/                  # React contexts
│   └── AuthContext.tsx       # Authentication context
│
├── hooks/                     # Custom React hooks
│   └── use*.ts               # Hook files (useFindings, useDashboardStats, etc.)
│
├── types/                     # TypeScript type definitions
│   ├── *.types.ts            # Type files by domain
│   ├── index.ts              # Type exports
│   └── __tests__/            # Type tests
│
├── config/                    # Configuration
│   └── firebase.ts           # Firebase initialization
│
└── utils/                     # Utility functions
    ├── *Handler.ts           # Error/Retry handlers
    ├── *Export.ts            # Export utilities
    └── __tests__/            # Utility tests
```

## Documentation (`/docs` and `/docs-archive`)

- `/docs/` - Active documentation (task reports, feature guides)
- `/docs-archive/` - Organized archive (10 categories: project overview, setup, testing, etc.)
- See `docs/README.md` for navigation guide

## Firebase (`/functions`)

```
functions/
├── src/                       # TypeScript source
│   ├── index.ts              # Cloud Functions entry
│   ├── services/             # Server-side services
│   ├── types/                # Type definitions
│   └── utils/                # Utilities
├── lib/                       # Compiled JavaScript
└── package.json              # Separate dependencies
```

## Scripts (`/scripts`)

Data management and deployment scripts (Node.js .mjs files):
- `import-*.mjs` - Data import scripts
- `check-*.mjs` - Data verification scripts
- `fix-*.mjs` - Data correction scripts
- `migrate-*.mjs` - Data migration scripts
- `deploy-*.bat/.sh` - Deployment scripts

## Tests (`/tests`)

Integration and unit tests:
- `/tests/integration/` - Integration tests (.test.ts, .test.mjs)
- `/tests/unit/` - Unit tests
- `/test-results/` - Test output files

## Key Conventions

### File Naming
- Components: PascalCase (e.g., `ChatInterface.tsx`)
- Services: PascalCase with Service suffix (e.g., `AuthService.ts`)
- Types: camelCase with .types.ts (e.g., `finding.types.ts`)
- Utils: camelCase (e.g., `connectionMonitor.ts`)
- Tests: Same name as source + `.test.ts` (e.g., `AuthService.test.ts`)

### Service Layer Pattern
- Each service is a singleton class or module
- Services handle business logic, not UI
- Services use dependency injection where needed
- Services have corresponding README.md for complex features

### Component Organization
- One component per file
- Co-locate component-specific README.md files
- Tests in `__tests__/` subdirectories
- Shared components in `/src/components`
- Page-specific components in `/src/renderer/pages`

### Type Definitions
- Domain-specific types in separate files (e.g., `finding.types.ts`)
- Export all types through `types/index.ts`
- Use TypeScript strict mode (no implicit any)
- Prefix unused parameters with underscore (`_param`)

### Import Conventions
- Use absolute imports from `src/`
- Group imports: React → Third-party → Local
- Use named exports (avoid default exports except for pages/components)

### Testing Strategy
- Unit tests for services and utilities
- Integration tests for complex workflows
- Component tests for UI logic
- Manual testing guides in `/docs-archive/03-testing-guides/`

### Documentation
- README.md files for complex features
- Inline JSDoc comments for public APIs
- Task completion reports in `/docs/`
- Comprehensive guides in `/docs-archive/`
