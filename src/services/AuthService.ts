import {
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
  UserCredential,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { auditService } from './AuditService';

/**
 * User interface representing authenticated user data
 */
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

/**
 * Authentication state change callback type
 */
export type AuthStateChangeCallback = (user: User | null) => void;

/**
 * AuthService class handles all authentication operations
 * Implements sign-in, sign-out, and session management with Firebase Auth
 */
class AuthService {
  private auth: Auth;
  private currentUser: User | null = null;
  private authStateListeners: Set<AuthStateChangeCallback> = new Set();

  constructor(authInstance: Auth) {
    this.auth = authInstance;
    this.initializeAuthStateListener();
  }

  /**
   * Initialize the auth state listener to track authentication changes
   * This runs once when the service is instantiated
   */
  private initializeAuthStateListener(): void {
    onAuthStateChanged(this.auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        this.currentUser = this.mapFirebaseUser(firebaseUser);
      } else {
        this.currentUser = null;
      }

      // Notify all registered listeners
      this.notifyAuthStateListeners(this.currentUser);
    });
  }

  /**
   * Map Firebase User to our User interface
   */
  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
    };
  }

  /**
   * Notify all registered auth state listeners
   */
  private notifyAuthStateListeners(user: User | null): void {
    this.authStateListeners.forEach((callback) => {
      try {
        callback(user);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Sign in with email and password
   * @param email - User's email address
   * @param password - User's password
   * @param rememberMe - Whether to persist the session (default: false)
   * @returns Promise resolving to User object
   * @throws Error if authentication fails
   */
  async signIn(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<User> {
    try {
      // Set persistence based on rememberMe option
      // browserLocalPersistence: persists even after browser close
      // browserSessionPersistence: clears when tab/window closes
      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;

      await setPersistence(this.auth, persistence);

      // Authenticate with Firebase
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      const user = this.mapFirebaseUser(userCredential.user);
      this.currentUser = user;

      // Log successful login
      await auditService.logLogin(user.uid, 'email');

      return user;
    } catch (error: any) {
      // Map Firebase error codes to user-friendly messages
      const errorMessage = this.getAuthErrorMessage(error.code);
      throw new Error(errorMessage);
    }
  }

  /**
   * Sign out the current user
   * Clears session tokens and authentication state
   * @returns Promise that resolves when sign out is complete
   */
  async signOut(): Promise<void> {
    try {
      const userId = this.currentUser?.uid;
      
      await firebaseSignOut(this.auth);
      this.currentUser = null;

      // Log logout event
      if (userId) {
        await auditService.logLogout(userId);
      }
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  /**
   * Get the current authenticated user
   * @returns Current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if a user is currently authenticated
   * @returns true if user is authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Register a callback to be notified of auth state changes
   * @param callback - Function to call when auth state changes
   * @returns Unsubscribe function to remove the listener
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    this.authStateListeners.add(callback);

    // Immediately call the callback with current state
    callback(this.currentUser);

    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  /**
   * Get the current Firebase ID token for the authenticated user
   * Token is automatically refreshed by Firebase when needed
   * @param forceRefresh - Force token refresh (default: false)
   * @returns Promise resolving to the ID token or null if not authenticated
   */
  async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    try {
      const firebaseUser = this.auth.currentUser;
      if (!firebaseUser) {
        return null;
      }

      return await firebaseUser.getIdToken(forceRefresh);
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  /**
   * Refresh the current user's ID token
   * Useful for ensuring token is up-to-date before critical operations
   * @returns Promise resolving to the new token or null if not authenticated
   */
  async refreshToken(): Promise<string | null> {
    return this.getIdToken(true);
  }

  /**
   * Map Firebase error codes to user-friendly messages
   */
  private getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/operation-not-allowed':
        return 'Email/password authentication is not enabled.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }
}

// Create and export singleton instance
const authService = new AuthService(auth);

export default authService;
