import { auth, db, functions } from '../config/firebase';

/**
 * Test Firebase initialization
 * This utility helps verify that Firebase services are properly initialized
 */
export const testFirebaseConnection = async (): Promise<{
  success: boolean;
  services: {
    auth: boolean;
    firestore: boolean;
    functions: boolean;
  };
  errors: string[];
}> => {
  const errors: string[] = [];
  const services = {
    auth: false,
    firestore: false,
    functions: false,
  };

  try {
    // Test Auth
    if (auth) {
      services.auth = true;
      console.log('✅ Firebase Auth initialized');
    } else {
      errors.push('Firebase Auth not initialized');
    }
  } catch (error) {
    errors.push(`Firebase Auth error: ${error}`);
  }

  try {
    // Test Firestore
    if (db) {
      services.firestore = true;
      console.log('✅ Firestore initialized');
    } else {
      errors.push('Firestore not initialized');
    }
  } catch (error) {
    errors.push(`Firestore error: ${error}`);
  }

  try {
    // Test Functions
    if (functions) {
      services.functions = true;
      console.log('✅ Cloud Functions initialized');
    } else {
      errors.push('Cloud Functions not initialized');
    }
  } catch (error) {
    errors.push(`Cloud Functions error: ${error}`);
  }

  const success = services.auth && services.firestore && services.functions;

  if (success) {
    console.log('🎉 All Firebase services initialized successfully!');
  } else {
    console.error('❌ Some Firebase services failed to initialize:', errors);
  }

  return {
    success,
    services,
    errors,
  };
};

// Auto-run test in development
if (import.meta.env.DEV) {
  testFirebaseConnection();
}
