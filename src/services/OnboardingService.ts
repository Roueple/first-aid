import { Timestamp, doc, setDoc } from 'firebase/firestore';
import { DatabaseService } from './DatabaseService';
import type { TutorialState } from '../types/tutorial.types';

/**
 * Service for managing onboarding tutorial state persistence
 * Handles tutorial progress tracking, completion status, and manual restarts
 */
export class OnboardingService extends DatabaseService<TutorialState> {
  private static instance: OnboardingService;

  constructor() {
    super('onboarding_tutorials');
  }

  /**
   * Get singleton instance of OnboardingService
   */
  static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService();
    }
    return OnboardingService.instance;
  }

  /**
   * Get tutorial state for a user
   * @param userId - User ID to query
   * @returns Tutorial state or null if not found
   */
  async getTutorialState(userId: string): Promise<TutorialState | null> {
    try {
      // Don't check connection here - it may not be ready yet
      // The getById method will handle connection issues
      const state = await this.getById(userId);
      return state || null;
    } catch (error) {
      // Silently return null on permission errors during initial load
      // This allows the tutorial to work with local state
      if (error instanceof Error && error.message.includes('permission')) {
        return null;
      }
      console.error('Failed to get tutorial state:', error);
      return null;
    }
  }

  /**
   * Check if user has completed the tutorial
   * @param userId - User ID to check
   * @returns True if tutorial is completed
   */
  async hasCompletedTutorial(userId: string): Promise<boolean> {
    try {
      const state = await this.getTutorialState(userId);
      return state?.completedAt !== null && state?.completedAt !== undefined;
    } catch (error) {
      console.error('Failed to check tutorial completion:', error);
      return false;
    }
  }

  /**
   * Update current step for a user
   * @param userId - User ID
   * @param step - Current step number
   */
  async updateCurrentStep(userId: string, step: number): Promise<void> {
    try {
      await this.checkConnection();
      
      const existingState = await this.getTutorialState(userId);
      
      if (existingState) {
        // Update existing state
        await this.update(userId, {
          currentStep: step,
          lastUpdatedAt: Timestamp.now(),
        });
      } else {
        // Create new state with userId as document ID
        const docRef = doc(this.db, this.collectionName, userId);
        await setDoc(docRef, {
          userId,
          currentStep: step,
          completedAt: null,
          startedAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
          isManualRestart: false,
        });
      }
    } catch (error) {
      // Silently fail on permission errors - tutorial works with local state
      if (!(error instanceof Error && error.message.includes('permission'))) {
        console.error('Failed to update tutorial step:', error);
      }
      // Don't throw - allow tutorial to continue with local state
    }
  }

  /**
   * Mark tutorial as completed for a user
   * @param userId - User ID
   */
  async completeTutorial(userId: string): Promise<void> {
    try {
      await this.checkConnection();
      
      const existingState = await this.getTutorialState(userId);
      
      if (existingState) {
        await this.update(userId, {
          completedAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
        });
      } else {
        // Create completed state if none exists
        const docRef = doc(this.db, this.collectionName, userId);
        await setDoc(docRef, {
          userId,
          currentStep: 9, // Final step
          completedAt: Timestamp.now(),
          startedAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
          isManualRestart: false,
        });
      }
    } catch (error) {
      console.error('Failed to complete tutorial:', error);
      // Don't throw - tutorial completion is not critical
    }
  }

  /**
   * Reset tutorial state for manual restart
   * @param userId - User ID
   */
  async resetTutorial(userId: string): Promise<void> {
    try {
      await this.checkConnection();
      
      const existingState = await this.getTutorialState(userId);
      
      if (existingState) {
        await this.update(userId, {
          currentStep: 1,
          completedAt: null,
          lastUpdatedAt: Timestamp.now(),
          isManualRestart: true,
        });
      } else {
        // Create new state for manual restart
        const docRef = doc(this.db, this.collectionName, userId);
        await setDoc(docRef, {
          userId,
          currentStep: 1,
          completedAt: null,
          startedAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
          isManualRestart: true,
        });
      }
    } catch (error) {
      console.error('Failed to reset tutorial:', error);
      throw error; // Throw here since manual restart should notify user of failure
    }
  }

  /**
   * Determine if tutorial should be shown to user
   * @param userId - User ID
   * @returns True if tutorial should be shown
   */
  async shouldShowTutorial(userId: string): Promise<boolean> {
    try {
      const state = await this.getTutorialState(userId);
      
      // Show if no state exists (first time user)
      if (!state) {
        return true;
      }
      
      // Show if tutorial is incomplete
      if (!state.completedAt && state.currentStep < 9) {
        return true;
      }
      
      // Don't show if completed
      return false;
    } catch (error) {
      console.error('Failed to check if tutorial should show:', error);
      // Default to not showing on error
      return false;
    }
  }
}

// Export singleton instance
export default OnboardingService.getInstance();
