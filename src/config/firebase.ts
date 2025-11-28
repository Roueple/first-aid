import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { Firestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const validateConfig = () => {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingKeys = requiredKeys.filter(
    (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missingKeys.join(', ')}.\n\n` +
      `Please check:\n` +
      `1. .env file exists in project root\n` +
      `2. All VITE_FIREBASE_* variables are set\n` +
      `3. Restart the dev server after changing .env\n\n` +
      `See FIREBASE_SETUP.md for configuration instructions.`
    );
  }
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

try {
  validateConfig();

  // Initialize Firebase app
  app = initializeApp(firebaseConfig);

  // Initialize services
  auth = getAuth(app);

  // Initialize Firestore with long polling to prevent QUIC timeout errors
  // This is more reliable in Electron environments
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });

  functions = getFunctions(app);

  // Connect to emulators in development
  if (import.meta.env.DEV) {
    const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

    if (useEmulators) {
      console.log('🔧 Connecting to Firebase Emulators...');
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('✅ Connected to Firebase Emulators');
    }
  }

  if (import.meta.env.DEV) {
    console.log('✅ Firebase initialized successfully');
    console.log('📍 Project ID:', firebaseConfig.projectId);
    console.log('🌍 Auth Domain:', firebaseConfig.authDomain);
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  if (import.meta.env.DEV) {
    console.error('💡 Tip: Make sure .env file exists and all VITE_FIREBASE_* variables are set');
    console.error('💡 Tip: Restart the dev server after changing .env');
  }
  throw error;
}

export { app, auth, db, functions };
