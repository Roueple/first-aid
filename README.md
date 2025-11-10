# FIRST-AID - Intelligent Audit Findings Management System

An Electron-based desktop application for managing audit findings with AI-powered chat capabilities, pattern detection, and privacy-protected processing.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop Framework**: Electron 28
- **Styling**: TailwindCSS
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Build Tool**: Vite
- **Routing**: React Router v6

## Prerequisites

- Node.js 18+ and npm
- Firebase project with configuration keys
- Git

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd first-aid-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Copy your Firebase configuration
5. Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

6. Update `.env` with your Firebase configuration keys

### 4. Run the development server

```bash
npm run dev
```

This will start:
- Vite dev server on http://localhost:5173
- Electron application window

## Available Scripts

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build for production
- `npm run package` - Package the app for distribution
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
first-aid-system/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # Main entry point
│   │   └── preload.ts     # Preload script
│   └── renderer/          # React application
│       ├── config/        # Configuration files
│       ├── pages/         # Page components
│       ├── App.tsx        # Root component
│       ├── main.tsx       # React entry point
│       └── index.html     # HTML template
├── dist/                  # Build output
├── package.json
├── tsconfig.json          # TypeScript config (renderer)
├── tsconfig.main.json     # TypeScript config (main)
├── vite.config.ts         # Vite configuration
└── tailwind.config.js     # TailwindCSS configuration
```

## Development Guidelines

- Follow TypeScript strict mode
- Use ESLint and Prettier for code quality
- Write meaningful commit messages
- Test features before committing

## Firebase Configuration

The application requires the following Firebase services:
- **Authentication**: Email/Password provider
- **Firestore**: NoSQL database for findings, users, chat sessions
- **Cloud Functions**: Server-side processing for AI and privacy features

## License

MIT
