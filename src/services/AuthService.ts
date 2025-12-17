import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
  UserCredential,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  ActionCodeSettings,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
 * Device session interface for tracking 90-day sessions
 */
export interface DeviceSession {
  deviceId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
}

/**
 * Whitelist entry interface
 */
export interface WhitelistEntry {
  email: string;
  displayName?: string;
  addedAt: number;
  addedBy: string;
  active: boolean;
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
  private deviceId: string;
  private readonly SESSION_DURATION_DAYS = 90;
  private readonly DEVICE_ID_KEY = 'firstaid_device_id';
  private readonly PENDING_EMAIL_KEY = 'firstaid_pending_email';

  constructor(authInstance: Auth) {
    this.auth = authInstance;
    this.deviceId = this.getOrCreateDeviceId();
    this.initializeAuthStateListener();
  }

  /**
   * Generate or retrieve device ID for session tracking
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
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
   * Check if email is whitelisted
   */
  async isEmailWhitelisted(email: string): Promise<boolean> {
    try {
      const whitelistRef = doc(db, 'emailWhitelist', email.toLowerCase());
      const whitelistDoc = await getDoc(whitelistRef);
      
      if (!whitelistDoc.exists()) {
        return false;
      }

      const data = whitelistDoc.data() as WhitelistEntry;
      return data.active === true;
    } catch (error) {
      console.error('Error checking whitelist:', error);
      return false;
    }
  }

  /**
   * Add email to whitelist (admin function)
   */
  async addToWhitelist(email: string, addedBy: string, displayName?: string): Promise<void> {
    try {
      const whitelistRef = doc(db, 'emailWhitelist', email.toLowerCase());
      const entry: WhitelistEntry = {
        email: email.toLowerCase(),
        displayName,
        addedAt: Date.now(),
        addedBy,
        active: true,
      };
      await setDoc(whitelistRef, entry);
    } catch (error) {
      console.error('Error adding to whitelist:', error);
      throw new Error('Failed to add email to whitelist');
    }
  }

  /**
   * Check if device has valid session
   */
  async hasValidDeviceSession(email: string): Promise<boolean> {
    try {
      const sessionRef = doc(db, 'deviceSessions', `${this.deviceId}_${email.toLowerCase()}`);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        return false;
      }

      const session = sessionDoc.data() as DeviceSession;
      const now = Date.now();

      // Check if session is still valid
      if (session.expiresAt > now) {
        // Update last accessed time
        await setDoc(sessionRef, { ...session, lastAccessedAt: now }, { merge: true });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking device session:', error);
      return false;
    }
  }

  /**
   * Create device session (90 days)
   */
  private async createDeviceSession(email: string): Promise<void> {
    try {
      const now = Date.now();
      const expiresAt = now + (this.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

      const session: DeviceSession = {
        deviceId: this.deviceId,
        email: email.toLowerCase(),
        createdAt: now,
        expiresAt,
        lastAccessedAt: now,
      };

      const sessionRef = doc(db, 'deviceSessions', `${this.deviceId}_${email.toLowerCase()}`);
      await setDoc(sessionRef, session);
    } catch (error) {
      console.error('Error creating device session:', error);
      throw new Error('Failed to create device session');
    }
  }

  /**
   * Send passwordless sign-in link to email
   */
  async sendSignInLink(email: string): Promise<void> {
    try {
      // Check if email is whitelisted
      const isWhitelisted = await this.isEmailWhitelisted(email);
      if (!isWhitelisted) {
        throw new Error('Email not authorized. Please contact administrator.');
      }

      // Check if device already has valid session
      const hasSession = await this.hasValidDeviceSession(email);
      if (hasSession) {
        throw new Error('You already have an active session on this device.');
      }

      // Configure action code settings
      const actionCodeSettings: ActionCodeSettings = {
        url: 'https://first-aid-101112.firebaseapp.com/auth/verify',
        handleCodeInApp: true,
      };

      // Send sign-in link
      await sendSignInLinkToEmail(this.auth, email, actionCodeSettings);

      // Store email locally for verification
      localStorage.setItem(this.PENDING_EMAIL_KEY, email);
    } catch (error: any) {
      console.error('Error sending sign-in link:', error);
      if (error.message.includes('not authorized')) {
        throw error;
      }
      throw new Error('Failed to send sign-in link. Please try again.');
    }
  }

  /**
   * Get display name from whitelist
   */
  async getDisplayNameFromWhitelist(email: string): Promise<string | null> {
    try {
      const whitelistRef = doc(db, 'emailWhitelist', email.toLowerCase());
      const whitelistDoc = await getDoc(whitelistRef);
      
      if (!whitelistDoc.exists()) {
        return null;
      }

      const data = whitelistDoc.data() as WhitelistEntry;
      return data.displayName || null;
    } catch (error) {
      console.error('Error getting display name:', error);
      return null;
    }
  }

  /**
   * Complete sign-in with email link
   */
  async completeSignInWithEmailLink(emailLink?: string): Promise<User> {
    try {
      // Handle both regular URL and HashRouter URL formats
      // HashRouter format: file:///path/index.html#/auth/verify?apiKey=...&oobCode=...
      // Regular format: https://domain.com/auth/verify?apiKey=...&oobCode=...
      let url = emailLink || window.location.href;
      
      // If using HashRouter, extract params from hash and construct a valid Firebase URL
      const hash = window.location.hash;
      if (hash.includes('apiKey') && hash.includes('oobCode')) {
        // Extract query string from hash: #/auth/verify?apiKey=...
        const hashQueryIndex = hash.indexOf('?');
        if (hashQueryIndex !== -1) {
          const queryString = hash.substring(hashQueryIndex);
          // Construct a URL that Firebase can validate
          url = window.location.origin + '/auth/verify' + queryString;
          console.log('🔧 Constructed Firebase URL from hash:', url);
        }
      }

      // Verify this is a sign-in link
      if (!isSignInWithEmailLink(this.auth, url)) {
        throw new Error('Invalid sign-in link');
      }

      // Get email from local storage
      let email = localStorage.getItem(this.PENDING_EMAIL_KEY);
      if (!email) {
        // Prompt user for email if not found
        email = window.prompt('Please provide your email for confirmation');
        if (!email) {
          throw new Error('Email is required to complete sign-in');
        }
      }

      // Check whitelist again
      const isWhitelisted = await this.isEmailWhitelisted(email);
      if (!isWhitelisted) {
        throw new Error('Email not authorized');
      }

      // Set persistence to local (stays logged in)
      await setPersistence(this.auth, browserLocalPersistence);

      // Sign in with email link
      const userCredential = await signInWithEmailLink(this.auth, email, url);
      
      // Get display name from whitelist
      const displayName = await this.getDisplayNameFromWhitelist(email);
      
      // Update Firebase user profile with display name if available
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      const user = this.mapFirebaseUser(userCredential.user);

      // Create 90-day device session
      await this.createDeviceSession(email);

      // Clean up pending email
      localStorage.removeItem(this.PENDING_EMAIL_KEY);

      // Log successful login
      await auditService.logLogin(user.uid, 'email-link');

      this.currentUser = user;
      return user;
    } catch (error: any) {
      console.error('Error completing sign-in:', error);
      const errorMessage = this.getAuthErrorMessage(error.code);
      throw new Error(errorMessage);
    }
  }

  /**
   * Sign in with email and password (legacy method - kept for backward compatibility)
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
      
      // Clear device session
      await this.clearDeviceSession();
      
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
   * Get pending email from local storage
   */
  getPendingEmail(): string | null {
    return localStorage.getItem(this.PENDING_EMAIL_KEY);
  }

  /**
   * Clear device session (for sign out)
   */
  private async clearDeviceSession(): Promise<void> {
    try {
      if (!this.currentUser?.email) return;

      const sessionRef = doc(db, 'deviceSessions', `${this.deviceId}_${this.currentUser.email.toLowerCase()}`);
      await setDoc(sessionRef, { expiresAt: 0 }, { merge: true });
    } catch (error) {
      console.error('Error clearing device session:', error);
    }
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
      case 'auth/invalid-action-code':
        return 'Sign-in link is invalid or has expired. Please request a new one.';
      case 'auth/expired-action-code':
        return 'Sign-in link has expired. Please request a new one.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }
}

// Create and export singleton instance
const authService = new AuthService(auth);

export default authService;
