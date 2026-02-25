/**
 * OnboardingTutorial Component
 * 
 * Main orchestrator for the interactive onboarding tutorial system.
 * Manages tutorial state, step progression, target element lookup, gated step monitoring,
 * and coordinates the TutorialOverlay and TutorialTooltip child components.
 * 
 * Features:
 * - Tutorial state management with Firebase persistence
 * - Target element lookup using data-tutorial attributes
 * - Step progression (next, back, skip, auto-advance)
 * - Gated step condition monitoring (Steps 3, 6, 8, 9)
 * - Viewport resize handling with debouncing
 * - Scroll-into-view for off-screen targets
 * - Error handling for missing elements and Firebase failures
 * - Theme-aware rendering
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialTooltip } from './TutorialTooltip';
import { TUTORIAL_STEPS, TutorialStep } from '../types/tutorial.types';
import OnboardingService from '../services/OnboardingService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Announce message to screen readers
 */
const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

interface OnboardingTutorialProps {
  /** Whether the tutorial is currently active */
  isActive: boolean;
  /** Callback when tutorial is completed or skipped */
  onComplete: () => void;
  /** Whether this is a manual restart from settings (affects skip button visibility) */
  isManualRestart?: boolean;
  /** Callback to set demo query for Step 3 */
  onSetDemoQuery?: (query: string) => void;
  /** Function to check if sidebar is open for Step 8 */
  isSidebarOpen?: boolean;
  /** Function to check if results are available for Step 6 */
  hasResults?: boolean;
}

interface TutorialLocalState {
  currentStep: number;
  targetElement: HTMLElement | null;
  targetRect: DOMRect | null;
  isGatedStep: boolean;
  gateConditionMet: boolean;
  theme: 'light' | 'dark';
  error: string | null;
}

const RESIZE_DEBOUNCE_MS = 250;
const FIREBASE_DEBOUNCE_MS = 500;

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isActive,
  onComplete,
  isManualRestart = false,
  onSetDemoQuery,
  isSidebarOpen = false,
  hasResults = false,
}) => {
  const { currentUser } = useAuth();
  
  // Local state management
  const [state, setState] = useState<TutorialLocalState>({
    currentStep: 1,
    targetElement: null,
    targetRect: null,
    isGatedStep: false,
    gateConditionMet: false,
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    error: null,
  });

  // Refs for debouncing and cleanup
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firebaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gateListenersRef = useRef<(() => void)[]>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const tutorialContainerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Initialize tutorial from Firebase state
   * Implements Property 15: Resume from saved step
   */
  useEffect(() => {
    if (!isActive || !currentUser) return;

    const initializeTutorial = async () => {
      try {
        const tutorialState = await OnboardingService.getTutorialState(currentUser.uid);
        
        if (tutorialState && !tutorialState.completedAt) {
          // Resume from saved step
          setState(prev => ({ ...prev, currentStep: tutorialState.currentStep }));
          announceToScreenReader(`Resuming tutorial at step ${tutorialState.currentStep}`);
        } else {
          // Start from step 1
          setState(prev => ({ ...prev, currentStep: 1 }));
          announceToScreenReader('Starting interactive tutorial');
        }
      } catch (error) {
        console.error('Failed to initialize tutorial:', error);
        // Continue with step 1 on error (Property 27: Graceful Firebase failure)
        setState(prev => ({ ...prev, currentStep: 1 }));
      }
    };

    initializeTutorial();
  }, [isActive, currentUser]);

  /**
   * Trap focus within tutorial when active
   * Implements accessibility requirement for focus management
   */
  useEffect(() => {
    if (!isActive) return;

    // Save current focus to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus trap handler
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = tutorialContainerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleFocusTrap);

    return () => {
      document.removeEventListener('keydown', handleFocusTrap);
      
      // Restore focus when tutorial closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  /**
   * Locate target element and calculate position
   * Implements Property 17: Target element registration
   * Implements Property 18: Element lookup mechanism
   * Implements Property 19: Skip step on missing element
   * Implements Property 20: Position calculation method
   * Implements Property 21: First match for duplicate selectors
   * 
   * Performance: Caches elements after first lookup to avoid repeated DOM queries
   * Cache is cleared on step change to avoid stale references
   */
  const locateTargetElement = useCallback((step: TutorialStep): HTMLElement | null => {
    try {
      const selector = `[data-tutorial="${step.targetSelector}"]`;
      
      // Always query DOM fresh (don't use cache) to avoid stale references
      // Elements may be dynamically added/removed between steps
      const element = document.querySelector(selector) as HTMLElement;
      
      if (!element) {
        console.warn(`Tutorial target not found: ${step.targetSelector}`);
        return null;
      }

      return element;
    } catch (error) {
      console.error('Error finding tutorial target:', error);
      return null;
    }
  }, []);

  /**
   * Calculate target element position and update state
   * Implements Property 24: Scroll into view
   */
  const updateTargetPosition = useCallback((element: HTMLElement | null, stepId?: number) => {
    if (!element) {
      setState(prev => ({ ...prev, targetElement: null, targetRect: null }));
      return;
    }

    try {
      // Check if element is in viewport
      const rect = element.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
      );

      // For steps 9 and 12 (hamburger menu and theme switcher), they're fixed position
      // so just update rect without scrolling
      if (stepId === 9 || stepId === 12) {
        setState(prev => ({
          ...prev,
          targetElement: element,
          targetRect: rect,
        }));
      } else if (!isInViewport) {
        // Scroll into view if not visible - with more aggressive settings
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
        
        // Wait for scroll to complete before updating position
        setTimeout(() => {
          const updatedRect = element.getBoundingClientRect();
          setState(prev => ({
            ...prev,
            targetElement: element,
            targetRect: updatedRect,
          }));
        }, 500); // Increased timeout for smoother scroll
      } else {
        setState(prev => ({
          ...prev,
          targetElement: element,
          targetRect: rect,
        }));
      }

      // Ensure target element has higher z-index (Property 8: Z-Index hierarchy)
      // Use CSS class instead of inline styles for cleaner management
      // Check if element is fixed position and add appropriate class
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.position === 'fixed') {
        element.classList.add('tutorial-spotlight-target', 'tutorial-spotlight-target-fixed');
      } else {
        element.classList.add('tutorial-spotlight-target');
      }
    } catch (error) {
      console.error('Failed to calculate element position:', error);
      setState(prev => ({ ...prev, targetElement: null, targetRect: null }));
    }
  }, []);

  /**
   * Cleanup gate monitoring listeners
   */
  const cleanupGateListeners = useCallback(() => {
    gateListenersRef.current.forEach(cleanup => cleanup());
    gateListenersRef.current = [];
  }, []);

  /**
   * Complete tutorial and mark as finished
   */
  const completeTutorial = useCallback(() => {
    announceToScreenReader('Tutorial completed');
    
    // Clean up CSS class from current target element
    if (state.targetElement) {
      state.targetElement.classList.remove('tutorial-spotlight-target');
    }
    
    // Clean up CSS class from all elements with tutorial attributes
    document.querySelectorAll('.tutorial-spotlight-target').forEach((element) => {
      element.classList.remove('tutorial-spotlight-target');
    });
    
    if (currentUser) {
      OnboardingService.completeTutorial(currentUser.uid).catch(error => {
        console.error('Failed to complete tutorial:', error);
      });
    }
    
    cleanupGateListeners();
    onComplete();
  }, [currentUser, onComplete, cleanupGateListeners, state.targetElement]);

  /**
   * Advance to next step
   * Implements Property 2: Step progression
   */
  const advanceToNextStep = useCallback(() => {
    setState(prev => {
      const nextStep = prev.currentStep + 1;
      
      if (nextStep > TUTORIAL_STEPS.length) {
        // Trigger completion in a separate effect
        return { ...prev, currentStep: TUTORIAL_STEPS.length + 1 };
      }

      // Announce step change to screen readers
      const stepConfig = TUTORIAL_STEPS[nextStep - 1];
      if (stepConfig) {
        announceToScreenReader(`Step ${nextStep} of ${TUTORIAL_STEPS.length}: ${stepConfig.title}`);
      }
      
      // Debounced Firebase update (Property 14: Step persistence)
      if (currentUser) {
        if (firebaseTimeoutRef.current) {
          clearTimeout(firebaseTimeoutRef.current);
        }
        
        firebaseTimeoutRef.current = setTimeout(() => {
          OnboardingService.updateCurrentStep(currentUser.uid, nextStep).catch(error => {
            console.error('Failed to save tutorial progress:', error);
            // Continue with local state (Property 27: Graceful Firebase failure)
          });
        }, FIREBASE_DEBOUNCE_MS);
      }

      return { ...prev, currentStep: nextStep };
    });
  }, [currentUser]);

  /**
   * Setup monitoring for gated step conditions
   * Implements gated step logic for Steps 3, 6, 8, 9
   */
  const setupGateMonitoring = useCallback((step: TutorialStep) => {
    if (!step.gateCondition) return;

    cleanupGateListeners();

    const { type, target } = step.gateCondition;

    // Step 3: Demo query submission (send button click)
    if (step.id === 3 && type === 'click' && target === 'send-button') {
      // Pre-fill input with demo query
      if (onSetDemoQuery) {
        onSetDemoQuery("Show me IT findings in 2024");
      }
      
      // Store cleanup function for demo query
      const clearDemoQuery = () => {
        if (onSetDemoQuery) {
          onSetDemoQuery("");
        }
      };
      
      let hasAdvanced = false;
      const sendButton = document.querySelector('[data-tutorial="send-button"]');
      if (sendButton) {
        const handleClick = () => {
          if (!hasAdvanced) {
            hasAdvanced = true;
            setState(prev => ({ ...prev, gateConditionMet: true }));
            clearDemoQuery();
            advanceToNextStep();
          }
        };
        sendButton.addEventListener('click', handleClick);
        gateListenersRef.current.push(() => {
          sendButton.removeEventListener('click', handleClick);
          clearDemoQuery(); // Clear on cleanup too
        });
      }
      
      // Also listen for Enter key on input field
      const inputField = document.querySelector('[data-tutorial="input-field"] input');
      if (inputField) {
        const handleKeyPress = (e: Event) => {
          if (!hasAdvanced) {
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Enter') {
              hasAdvanced = true;
              setState(prev => ({ ...prev, gateConditionMet: true }));
              clearDemoQuery();
              advanceToNextStep();
            }
          }
        };
        inputField.addEventListener('keypress', handleKeyPress);
        gateListenersRef.current.push(() => {
          inputField.removeEventListener('keypress', handleKeyPress);
        });
      }
    }

    // Step 4: Wait for results to load (results-loaded state change)
    if (step.id === 4 && type === 'state-change' && target === 'results-loaded') {
      // Use MutationObserver to detect when results appear (more efficient than polling)
      const checkForResults = () => {
        const resultsTable = document.querySelector('[data-tutorial="results-table"]');
        const aggregationChart = document.querySelector('[data-tutorial="aggregation-chart"]');
        return !!(resultsTable || aggregationChart);
      };

      // Check immediately
      if (checkForResults()) {
        setState(prev => ({ ...prev, gateConditionMet: true }));
        advanceToNextStep();
        return;
      }

      // Set up MutationObserver to watch for results appearing
      let hasAdvanced = false;
      const observer = new MutationObserver(() => {
        if (!hasAdvanced && checkForResults()) {
          hasAdvanced = true;
          setState(prev => ({ ...prev, gateConditionMet: true }));
          observer.disconnect();
          advanceToNextStep();
        }
      });

      // Observe the chat area for child additions
      const chatArea = document.querySelector('[data-tutorial="chat-area"]');
      if (chatArea) {
        observer.observe(chatArea, {
          childList: true,
          subtree: true,
        });

        // Timeout after 30 seconds
        const timeout = setTimeout(() => {
          if (!hasAdvanced) {
            hasAdvanced = true;
            observer.disconnect();
            console.warn('Results loading timeout - advancing tutorial');
            advanceToNextStep();
          }
        }, 30000);

        gateListenersRef.current.push(() => {
          observer.disconnect();
          clearTimeout(timeout);
        });
      } else {
        // If chat area not found, skip to next step
        console.warn('Chat area not found - advancing tutorial');
        advanceToNextStep();
      }
    }

    // Step 7: Table row expansion (any row click)
    if (step.id === 7 && type === 'click' && target === 'table-row') {
      // Skip if no results available
      if (!hasResults) {
        console.warn('Skipping step 7 - no results available');
        advanceToNextStep();
        return;
      }
      
      let hasAdvanced = false;
      const handleRowClick = (e: Event) => {
        if (!hasAdvanced) {
          const target = e.target as HTMLElement;
          if (target.closest('tr')) {
            hasAdvanced = true;
            setState(prev => ({ ...prev, gateConditionMet: true }));
            advanceToNextStep();
          }
        }
      };
      document.addEventListener('click', handleRowClick);
      gateListenersRef.current.push(() => document.removeEventListener('click', handleRowClick));
    }

    // Step 9: Hamburger menu opening (sidebar open state change)
    if (step.id === 9 && type === 'state-change' && target === 'sidebar-open') {
      // Check if sidebar is already open
      if (isSidebarOpen) {
        console.log('Sidebar already open - advancing tutorial');
        setState(prev => ({ ...prev, gateConditionMet: true }));
        advanceToNextStep();
        return;
      }
      
      // Monitor for sidebar to open
      let hasAdvanced = false;
      const checkInterval = setInterval(() => {
        if (!hasAdvanced && isSidebarOpen) {
          hasAdvanced = true;
          clearInterval(checkInterval);
          setState(prev => ({ ...prev, gateConditionMet: true }));
          advanceToNextStep();
        }
      }, 100);
      
      // Timeout after 60 seconds
      const timeout = setTimeout(() => {
        if (!hasAdvanced) {
          hasAdvanced = true;
          clearInterval(checkInterval);
          console.warn('Sidebar open timeout - advancing tutorial');
          advanceToNextStep();
        }
      }, 60000);
      
      gateListenersRef.current.push(() => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      });
    }

    // Step 10: New chat button click
    if (step.id === 10 && type === 'click' && target === 'new-chat-btn') {
      let hasAdvanced = false;
      const newChatBtn = document.querySelector('[data-tutorial="new-chat-btn"]');
      
      if (newChatBtn) {
        const handleClick = () => {
          if (!hasAdvanced) {
            hasAdvanced = true;
            setState(prev => ({ ...prev, gateConditionMet: true }));
            advanceToNextStep();
          }
        };
        newChatBtn.addEventListener('click', handleClick);
        gateListenersRef.current.push(() => newChatBtn.removeEventListener('click', handleClick));
      }
    }

    // Step 11: Sidebar closing (sidebar closed state change)
    if (step.id === 11 && type === 'state-change' && target === 'sidebar-closed') {
      // Check if sidebar is already closed
      if (!isSidebarOpen) {
        console.log('Sidebar already closed - advancing tutorial');
        setState(prev => ({ ...prev, gateConditionMet: true }));
        advanceToNextStep();
        return;
      }
      
      // Monitor for sidebar to close
      let hasAdvanced = false;
      const checkInterval = setInterval(() => {
        if (!hasAdvanced && !isSidebarOpen) {
          hasAdvanced = true;
          clearInterval(checkInterval);
          setState(prev => ({ ...prev, gateConditionMet: true }));
          advanceToNextStep();
        }
      }, 100);
      
      // Timeout after 60 seconds
      const timeout = setTimeout(() => {
        if (!hasAdvanced) {
          hasAdvanced = true;
          clearInterval(checkInterval);
          console.warn('Sidebar close timeout - advancing tutorial');
          advanceToNextStep();
        }
      }, 60000);
      
      gateListenersRef.current.push(() => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      });
    }

    // Step 12: Theme toggle (theme change) - Final step
    if (step.id === 12 && type === 'state-change' && target === 'theme') {
      const initialTheme = state.theme;
      let hasAdvanced = false;
      const themeSwitcher = document.querySelector('[data-tutorial="theme-switcher"]');
      
      if (themeSwitcher) {
        const handleClick = () => {
          if (!hasAdvanced) {
            // Wait a bit for theme to change
            setTimeout(() => {
              const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
              if (!hasAdvanced && currentTheme !== initialTheme) {
                hasAdvanced = true;
                setState(prev => ({ ...prev, gateConditionMet: true, theme: currentTheme }));
                // Complete tutorial after theme change
                setTimeout(() => {
                  completeTutorial();
                }, 500);
              }
            }, 100);
          }
        };
        themeSwitcher.addEventListener('click', handleClick);
        gateListenersRef.current.push(() => themeSwitcher.removeEventListener('click', handleClick));
      }
    }
  }, [state.theme, onSetDemoQuery, isSidebarOpen, hasResults, cleanupGateListeners, advanceToNextStep, completeTutorial, updateTargetPosition]);

  /**
   * Update current step and locate target element
   */
  useEffect(() => {
    if (!isActive) return;

    const step = TUTORIAL_STEPS[state.currentStep - 1];
    if (!step) return;

    // Locate target element
    const element = locateTargetElement(step);
    
    if (!element) {
      // Skip step if target not found (Property 19)
      console.warn(`Skipping step ${state.currentStep} - target not found`);
      advanceToNextStep();
      return;
    }

    // Update target position
    updateTargetPosition(element, step.id);

    // Update gated step status
    setState(prev => ({
      ...prev,
      isGatedStep: step.isGated,
      gateConditionMet: false,
    }));

    // Setup gated step monitoring if needed
    if (step.isGated && step.gateCondition) {
      setupGateMonitoring(step);
    }

    // Cleanup function
    return () => {
      // Remove CSS class from element
      if (element) {
        element.classList.remove('tutorial-spotlight-target');
      }
      
      // Cleanup gate listeners
      cleanupGateListeners();
    };
  }, [state.currentStep, isActive, locateTargetElement, updateTargetPosition, setupGateMonitoring, cleanupGateListeners, advanceToNextStep]);

  /**
   * Auto-complete tutorial when reaching beyond last step
   */
  useEffect(() => {
    if (state.currentStep > TUTORIAL_STEPS.length) {
      completeTutorial();
    }
  }, [state.currentStep, completeTutorial]);

  /**
   * Go back to previous step
   */
  const goToPreviousStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStep <= 1) return prev;
      
      const prevStep = prev.currentStep - 1;
      
      // Update Firebase
      if (currentUser) {
        OnboardingService.updateCurrentStep(currentUser.uid, prevStep).catch(error => {
          console.error('Failed to save tutorial progress:', error);
        });
      }

      return { ...prev, currentStep: prevStep };
    });
  }, [currentUser]);

  /**
   * Skip tutorial (manual restart only)
   * Implements Property 1: Skip button visibility
   */
  const skipTutorial = useCallback(() => {
    announceToScreenReader('Tutorial skipped');
    completeTutorial();
  }, [completeTutorial]);

  /**
   * Handle viewport resize with debouncing
   * Implements Property 23: Dynamic repositioning on resize
   */
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        if (state.targetElement) {
          updateTargetPosition(state.targetElement, state.currentStep);
        }
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isActive, state.targetElement, updateTargetPosition]);

  /**
   * Monitor theme changes
   * Implements Property 26: Dynamic theme updates
   */
  useEffect(() => {
    if (!isActive) return;

    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      if (currentTheme !== state.theme) {
        setState(prev => ({ ...prev, theme: currentTheme }));
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [isActive, state.theme]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clean up CSS class from all elements
      document.querySelectorAll('.tutorial-spotlight-target').forEach((element) => {
        element.classList.remove('tutorial-spotlight-target');
      });
      
      cleanupGateListeners();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (firebaseTimeoutRef.current) {
        clearTimeout(firebaseTimeoutRef.current);
      }
    };
  }, [cleanupGateListeners]);

  /**
   * Handle keyboard navigation
   * Implements accessibility requirement for keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentStepConfig = TUTORIAL_STEPS[state.currentStep - 1];
    if (!currentStepConfig) return;

    const isFinalStep = state.currentStep === TUTORIAL_STEPS.length;
    const showNextButton = !state.isGatedStep || state.gateConditionMet;

    switch (e.key) {
      case 'Escape':
        if (isManualRestart) {
          skipTutorial();
        }
        break;
      case 'ArrowRight':
      case 'Enter':
        if (showNextButton && !isFinalStep) {
          e.preventDefault();
          advanceToNextStep();
        } else if (isFinalStep) {
          e.preventDefault();
          completeTutorial();
        }
        break;
      case 'ArrowLeft':
        if (state.currentStep > 1) {
          e.preventDefault();
          goToPreviousStep();
        }
        break;
    }
  }, [isManualRestart, state.currentStep, state.isGatedStep, state.gateConditionMet, advanceToNextStep, completeTutorial, goToPreviousStep, skipTutorial]);

  // Error state UI (Property 28: Error handling UI)
  if (state.error) {
    return (
      <div 
        className="tutorial-error-overlay"
        role="alertdialog"
        aria-labelledby="tutorial-error-title"
        aria-describedby="tutorial-error-message"
      >
        <div className="tutorial-error-dialog">
          <h3 id="tutorial-error-title">Tutorial Error</h3>
          <p id="tutorial-error-message">{state.error}</p>
          <button
            className="tutorial-tooltip-btn tutorial-tooltip-btn-primary"
            onClick={completeTutorial}
            aria-label="Close tutorial"
          >
            Close Tutorial
          </button>
        </div>
      </div>
    );
  }

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  const currentStepConfig = TUTORIAL_STEPS[state.currentStep - 1];
  if (!currentStepConfig) {
    return null;
  }

  const showBackButton = state.currentStep > 1;
  const showNextButton = !state.isGatedStep || state.gateConditionMet;

  return (
    <div 
      ref={tutorialContainerRef}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Interactive tutorial"
      aria-describedby="tutorial-instructions"
    >
      {/* Screen reader instructions */}
      <div id="tutorial-instructions" className="sr-only">
        Use Tab to navigate between buttons. Press Enter to activate buttons. 
        Press Escape to skip the tutorial. Use Arrow keys to navigate between steps.
      </div>

      {/* Overlay with spotlight effect */}
      <TutorialOverlay
        targetRect={state.targetRect}
        theme={state.theme}
      />

      {/* Tooltip with step content and navigation */}
      <TutorialTooltip
        step={currentStepConfig}
        currentStepNumber={state.currentStep}
        totalSteps={TUTORIAL_STEPS.length}
        targetRect={state.targetRect}
        showSkip={isManualRestart}
        showBack={showBackButton}
        showNext={showNextButton}
        onNext={advanceToNextStep}
        onBack={goToPreviousStep}
        onSkip={skipTutorial}
        onFinish={completeTutorial}
        theme={state.theme}
      />
    </div>
  );
};
