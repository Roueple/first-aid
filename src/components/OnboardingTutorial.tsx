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

// Debug logging - disabled in production
const DEBUG_TUTORIAL = process.env.NODE_ENV === 'development';
const debugLog = DEBUG_TUTORIAL ? console.log.bind(console) : () => {};
const debugWarn = DEBUG_TUTORIAL ? console.warn.bind(console) : () => {};

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
  /** Callback to set demo query for Step 3 */
  onSetDemoQuery?: (query: string) => void;
  /** Callback to register query sent handler for Step 3 -> 4 transition */
  onQuerySent?: (callback: () => void) => void;
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
  hideOverlay: boolean; // Hide overlay but keep tooltip for final step
}

const RESIZE_DEBOUNCE_MS = 250;
const FIREBASE_DEBOUNCE_MS = 500;

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isActive,
  onComplete,
  onSetDemoQuery,
  onQuerySent,
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
    hideOverlay: false,
  });

  // Refs for debouncing and cleanup
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firebaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gateListenersRef = useRef<(() => void)[]>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const tutorialContainerRef = useRef<HTMLDivElement | null>(null);
  const step4AdvancedRef = useRef<boolean>(false); // Track if step 4 has already advanced
  const step4StartTimeRef = useRef<number>(0); // Track when step 4 started
  const step7GateMetRef = useRef<boolean>(false); // Track if step 7 gate condition is met

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
      // Special handling for step 4: prefer loading-indicator if it exists, otherwise use chat-area
      if (step.id === 4) {
        const loadingIndicator = document.querySelector('[data-tutorial="loading-indicator"]') as HTMLElement;
        if (loadingIndicator) {
          debugLog(`🎓 [Tutorial Step ${step.id}] Target found: loading-indicator (preferred)`);
          return loadingIndicator;
        }
        // Fall back to chat-area if loading indicator not found
        const chatArea = document.querySelector('[data-tutorial="chat-area"]') as HTMLElement;
        if (chatArea) {
          debugLog(`🎓 [Tutorial Step ${step.id}] Target found: chat-area (fallback)`);
          return chatArea;
        }
        debugWarn(`🎓 [Tutorial Step ${step.id}] Neither loading-indicator nor chat-area found`);
        return null;
      }
      
      const selector = `[data-tutorial="${step.targetSelector}"]`;
      
      // Always query DOM fresh (don't use cache) to avoid stale references
      // Elements may be dynamically added/removed between steps
      const element = document.querySelector(selector) as HTMLElement;
      
      if (!element) {
        debugWarn(`🎓 [Tutorial Step ${step.id}] Target not found: ${step.targetSelector}`);
        // For step 9, log additional debug info about sidebar state
        if (step.id === 9) {
          const sidebar = document.querySelector('.bernard-sidebar');
          const sidebarOpen = sidebar?.classList.contains('open');
          const hamburgerBtn = document.querySelector('.bernard-sidebar-open-btn');
          debugWarn(`🎓 [Tutorial Step 9] Debug - Sidebar exists: ${!!sidebar}, Sidebar open: ${sidebarOpen}, Hamburger button exists: ${!!hamburgerBtn}`);
          if (hamburgerBtn) {
            const rect = hamburgerBtn.getBoundingClientRect();
            debugWarn(`🎓 [Tutorial Step 9] Hamburger button position:`, { top: rect.top, left: rect.left, width: rect.width, height: rect.height });
          }
        }
        return null;
      }

      debugLog(`🎓 [Tutorial Step ${step.id}] Target found: ${step.targetSelector}`);
      
      // For step 9, verify we got the hamburger button and log its position
      if (step.id === 9) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        debugLog(`🎓 [Tutorial Step 9] Element details:`, {
          className: element.className,
          position: computedStyle.position,
          top: computedStyle.top,
          left: computedStyle.left,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        });
      }
      
      return element;
    } catch (error) {
      console.error(`🎓 [Tutorial Step ${step.id}] Error finding target:`, error);
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
      // Force immediate rect calculation without delay - fixed elements don't need animation wait
      if (stepId === 9 || stepId === 12) {
        // Get fresh rect immediately
        const freshRect = element.getBoundingClientRect();
        debugLog(`🎓 [Tutorial Step ${stepId}] Fixed element rect:`, {
          top: freshRect.top,
          left: freshRect.left,
          width: freshRect.width,
          height: freshRect.height
        });
        setState(prev => ({
          ...prev,
          targetElement: element,
          targetRect: freshRect,
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
      
      // For sidebar buttons (steps 10 and 11), also elevate the parent sidebar
      if (stepId === 10 || stepId === 11) {
        const sidebar = element.closest('.bernard-sidebar');
        if (sidebar) {
          sidebar.classList.add('tutorial-sidebar-elevated');
        }
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
      // Also remove sidebar elevation if it was added
      const sidebar = state.targetElement.closest('.bernard-sidebar');
      if (sidebar) {
        sidebar.classList.remove('tutorial-sidebar-elevated');
      }
    }
    
    // Clean up CSS class from all elements with tutorial attributes
    document.querySelectorAll('.tutorial-spotlight-target').forEach((element) => {
      element.classList.remove('tutorial-spotlight-target');
    });
    
    // Clean up all elevated sidebars
    document.querySelectorAll('.tutorial-sidebar-elevated').forEach((element) => {
      element.classList.remove('tutorial-sidebar-elevated');
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
      
      debugLog(`🎓 [Tutorial] Advancing from step ${prev.currentStep} to step ${nextStep}`);
      
      if (nextStep > TUTORIAL_STEPS.length) {
        // Trigger completion in a separate effect
        debugLog(`🎓 [Tutorial] Reached end of tutorial (step ${nextStep})`);
        return { ...prev, currentStep: TUTORIAL_STEPS.length + 1 };
      }

      // Announce step change to screen readers
      const stepConfig = TUTORIAL_STEPS[nextStep - 1];
      if (stepConfig) {
        debugLog(`🎓 [Tutorial Step ${nextStep}] "${stepConfig.title}" - Target: ${stepConfig.targetSelector}, Gated: ${stepConfig.isGated}`);
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
      debugLog(`🎓 [Tutorial Step 3] Setting up demo query submission monitor`);
      
      // Pre-fill input with demo query
      if (onSetDemoQuery) {
        onSetDemoQuery("Show me IT findings in 2024");
        debugLog(`🎓 [Tutorial Step 3] Demo query set`);
      }
      
      // Register callback with BernardPage to be notified when query is sent
      if (onQuerySent) {
        debugLog(`🎓 [Tutorial Step 3] Registering query sent callback`);
        onQuerySent(() => {
          debugLog(`🎓 [Tutorial Step 3] Query sent, advancing immediately to step 4`);
          setState(prev => ({ ...prev, gateConditionMet: true }));
          if (onSetDemoQuery) {
            onSetDemoQuery(""); // Clear demo query
          }
          advanceToNextStep();
        });
      }
    }

    // Step 4: Wait for results to load (results-loaded state change)
    if (step.id === 4 && type === 'state-change' && target === 'results-loaded') {
      debugLog(`🎓 [Tutorial Step 4] Setting up results loading monitor`);
      
      const MIN_DISPLAY_TIME = 2000; // Minimum 2 seconds to see loading state
      
      // Continuously monitor for loading indicator and update highlight
      const updateLoadingIndicatorHighlight = () => {
        const loadingIndicator = document.querySelector('[data-tutorial="loading-indicator"]') as HTMLElement;
        if (loadingIndicator) {
          const rect = loadingIndicator.getBoundingClientRect();
          setState(prev => ({
            ...prev,
            targetElement: loadingIndicator,
            targetRect: rect,
          }));
          // Ensure element has spotlight class
          loadingIndicator.classList.add('tutorial-spotlight-target');
        }
      };
      
      // Update highlight every 100ms to track loading indicator as it moves/changes
      const highlightInterval = setInterval(updateLoadingIndicatorHighlight, 100);
      
      // Use MutationObserver to detect when results appear (more efficient than polling)
      const checkForResults = () => {
        const resultsTable = document.querySelector('[data-tutorial="results-table"]');
        const aggregationChart = document.querySelector('[data-tutorial="aggregation-chart"]');
        const hasResults = !!(resultsTable || aggregationChart);
        
        if (hasResults) {
          debugLog(`🎓 [Tutorial Step 4] Results found - table: ${!!resultsTable}, chart: ${!!aggregationChart}`);
        }
        
        return hasResults;
      };
      
      const advanceWhenReady = () => {
        if (step4AdvancedRef.current) {
          debugLog(`🎓 [Tutorial Step 4] Already advanced, skipping`);
          return;
        }
        
        const elapsed = Date.now() - step4StartTimeRef.current;
        const remaining = MIN_DISPLAY_TIME - elapsed;
        
        if (remaining > 0) {
          debugLog(`🎓 [Tutorial Step 4] Results ready but waiting ${remaining}ms for minimum display time`);
          setTimeout(() => {
            if (!step4AdvancedRef.current) {
              step4AdvancedRef.current = true;
              clearInterval(highlightInterval);
              debugLog(`🎓 [Tutorial Step 4] Minimum display time met, advancing to step 5`);
              advanceToNextStep();
            }
          }, remaining);
        } else {
          step4AdvancedRef.current = true;
          clearInterval(highlightInterval);
          debugLog(`🎓 [Tutorial Step 4] Minimum display time already met, advancing to step 5`);
          advanceToNextStep();
        }
      };

      // Check immediately
      if (checkForResults()) {
        advanceWhenReady();
        return;
      }

      // Set up MutationObserver to watch for results appearing
      const observer = new MutationObserver(() => {
        if (!step4AdvancedRef.current && checkForResults()) {
          debugLog(`🎓 [Tutorial Step 4] Results detected via MutationObserver`);
          observer.disconnect();
          advanceWhenReady();
        }
      });

      // Observe the chat area for child additions
      const chatArea = document.querySelector('[data-tutorial="chat-area"]');
      if (chatArea) {
        debugLog(`🎓 [Tutorial Step 4] Observing chat area for results`);
        observer.observe(chatArea, {
          childList: true,
          subtree: true,
        });

        // Timeout after 30 seconds
        const timeout = setTimeout(() => {
          if (!step4AdvancedRef.current) {
            step4AdvancedRef.current = true;
            observer.disconnect();
            clearInterval(highlightInterval);
            debugWarn(`🎓 [Tutorial Step 4] Results loading timeout (30s) - advancing anyway`);
            advanceToNextStep();
          }
        }, 30000);

        gateListenersRef.current.push(() => {
          observer.disconnect();
          clearInterval(highlightInterval);
          clearTimeout(timeout);
        });
      } else {
        // If chat area not found, skip to next step
        if (!step4AdvancedRef.current) {
          step4AdvancedRef.current = true;
          clearInterval(highlightInterval);
          debugWarn(`🎓 [Tutorial Step 4] Chat area not found - advancing tutorial`);
          advanceToNextStep();
        }
      }
    }

    // Step 7: Table row expansion (any row click)
    if (step.id === 7 && type === 'click' && target === 'table-row') {
      debugLog(`🎓 [Tutorial Step 7] Setting up table row click monitor, hasResults: ${hasResults}, gateAlreadyMet: ${step7GateMetRef.current}`);
      
      // Skip if no results available
      if (!hasResults) {
        debugWarn(`🎓 [Tutorial Step 7] No results available - skipping step`);
        advanceToNextStep();
        return;
      }
      
      // If gate already met, just update state without setting up listener again
      if (step7GateMetRef.current) {
        debugLog(`🎓 [Tutorial Step 7] Gate already met, updating state only`);
        setState(prev => ({ ...prev, gateConditionMet: true }));
        return;
      }
      
      const handleRowClick = (e: Event) => {
        if (!step7GateMetRef.current) {
          const target = e.target as HTMLElement;
          const row = target.closest('tr');
          if (row) {
            step7GateMetRef.current = true;
            debugLog(`🎓 [Tutorial Step 7] Table row clicked, gate condition met`);
            
            // Wait for expansion, then update highlight to cover full table
            setTimeout(() => {
              const resultsTable = document.querySelector('[data-tutorial="results-table"]');
              if (resultsTable) {
                debugLog(`🎓 [Tutorial Step 7] Updating highlight to cover expanded table`);
                const rect = resultsTable.getBoundingClientRect();
                setState(prev => ({
                  ...prev,
                  gateConditionMet: true,
                  targetElement: resultsTable as HTMLElement,
                  targetRect: rect,
                }));
                resultsTable.classList.add('tutorial-spotlight-target');
              } else {
                setState(prev => ({ ...prev, gateConditionMet: true }));
              }
            }, 300);
          }
        }
      };
      document.addEventListener('click', handleRowClick);
      gateListenersRef.current.push(() => {
        document.removeEventListener('click', handleRowClick);
      });
    }

    // Step 9: Hamburger menu opening (sidebar open state change)
    if (step.id === 9 && type === 'state-change' && target === 'sidebar-open') {
      debugLog(`🎓 [Tutorial Step 9] Setting up hamburger menu monitor, isSidebarOpen: ${isSidebarOpen}`);
      
      // Check if sidebar is already open
      if (isSidebarOpen) {
        debugLog('🎓 [Tutorial Step 9] Sidebar already open - advancing tutorial');
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
          debugLog('🎓 [Tutorial Step 9] Sidebar opened - advancing to step 10');
          setState(prev => ({ ...prev, gateConditionMet: true }));
          advanceToNextStep();
        }
      }, 100);
      
      // Timeout after 60 seconds
      const timeout = setTimeout(() => {
        if (!hasAdvanced) {
          hasAdvanced = true;
          clearInterval(checkInterval);
          debugWarn('🎓 [Tutorial Step 9] Sidebar open timeout (60s) - advancing tutorial');
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
        debugLog('Sidebar already closed - advancing tutorial');
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
          debugWarn('Sidebar close timeout - advancing tutorial');
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
      let hasAdvanced = false;
      const themeSwitcher = document.querySelector('[data-tutorial="theme-switcher"]');
      
      if (themeSwitcher) {
        const handleClick = () => {
          if (!hasAdvanced) {
            hasAdvanced = true;
            debugLog('🎓 [Tutorial Step 12] Theme button clicked - hiding overlay, showing finish button');
            // Hide overlay and spotlight immediately so user can see theme change
            // But keep tooltip visible with Finish button
            setState(prev => ({ 
              ...prev, 
              gateConditionMet: true,
              hideOverlay: true,
              targetElement: null,
              targetRect: null
            }));
          }
        };
        themeSwitcher.addEventListener('click', handleClick);
        gateListenersRef.current.push(() => themeSwitcher.removeEventListener('click', handleClick));
      }
    }
  }, [state.theme, onSetDemoQuery, onQuerySent, isSidebarOpen, hasResults, cleanupGateListeners, advanceToNextStep, completeTutorial, updateTargetPosition]);

  /**
   * Update current step and locate target element
   */
  useEffect(() => {
    if (!isActive) return;

    const step = TUTORIAL_STEPS[state.currentStep - 1];
    if (!step) {
      debugWarn(`🎓 [Tutorial] Invalid step ${state.currentStep} - completing tutorial`);
      completeTutorial();
      return;
    }

    // Don't re-initialize if we're on step 12 and overlay is hidden (gate condition met)
    if (state.currentStep === 12 && state.hideOverlay) {
      debugLog(`🎓 [Tutorial Step 12] Skipping re-initialization - overlay hidden, gate met`);
      return;
    }

    debugLog(`🎓 [Tutorial Step ${state.currentStep}] Initializing step "${step.title}"`);

    // Reset step 4 advanced flag when leaving step 4
    if (state.currentStep !== 4) {
      step4AdvancedRef.current = false;
      step4StartTimeRef.current = 0;
    } else if (state.currentStep === 4 && step4StartTimeRef.current === 0) {
      // Record when step 4 starts
      step4StartTimeRef.current = Date.now();
      debugLog(`🎓 [Tutorial Step 4] Started at ${step4StartTimeRef.current}`);
    }
    
    // Reset step 7 gate flag when leaving step 7
    if (state.currentStep !== 7) {
      step7GateMetRef.current = false;
    }

    // Locate target element
    const element = locateTargetElement(step);
    
    if (!element) {
      // For step 9, if hamburger button not found, sidebar is likely already open
      // Skip retries and let gate monitoring handle advancement immediately
      if (step.id === 9) {
        debugLog(`🎓 [Tutorial Step 9] Hamburger button not found - sidebar likely already open, setting up gate monitoring`);
        
        setState(prev => ({
          ...prev,
          targetElement: null,
          targetRect: null,
          isGatedStep: step.isGated,
          gateConditionMet: false,
        }));
        
        if (step.isGated && step.gateCondition) {
          setupGateMonitoring(step);
        }
        
        return () => {
          cleanupGateListeners();
        };
      }
      
      // For gated steps, retry with longer timeout
      if (step.isGated) {
        debugWarn(`🎓 [Tutorial Step ${state.currentStep}] Target not found but step is gated - retrying`);
        
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = 500;
        
        const retryTimer = setInterval(() => {
          retryCount++;
          debugLog(`🎓 [Tutorial Step ${state.currentStep}] Gated retry ${retryCount}/${maxRetries}`);
          
          const retryElement = locateTargetElement(step);
          if (retryElement) {
            debugLog(`🎓 [Tutorial Step ${state.currentStep}] Target found on retry ${retryCount}`);
            clearInterval(retryTimer);
            updateTargetPosition(retryElement, step.id);
            
            setState(prev => ({
              ...prev,
              isGatedStep: step.isGated,
              gateConditionMet: false,
            }));
            
            if (step.isGated && step.gateCondition) {
              setupGateMonitoring(step);
            }
          } else if (retryCount >= maxRetries) {
            debugWarn(`🎓 [Tutorial Step ${state.currentStep}] Target not found after ${maxRetries} retries - skipping`);
            clearInterval(retryTimer);
            advanceToNextStep();
          }
        }, retryInterval);
        
        return () => {
          clearInterval(retryTimer);
          cleanupGateListeners();
        };
      } else {
        // Non-gated step - quick retry (steps 5 and 6 after results load)
        debugWarn(`🎓 [Tutorial Step ${state.currentStep}] Target not found for non-gated step - quick retry`);
        
        let retryCount = 0;
        const maxRetries = 3; // Only 3 retries = 600ms total
        const retryInterval = 200; // Check every 200ms
        
        const retryTimer = setInterval(() => {
          retryCount++;
          debugLog(`🎓 [Tutorial Step ${state.currentStep}] Non-gated retry ${retryCount}/${maxRetries}`);
          
          const retryElement = locateTargetElement(step);
          if (retryElement) {
            debugLog(`🎓 [Tutorial Step ${state.currentStep}] Target found on retry ${retryCount}`);
            clearInterval(retryTimer);
            updateTargetPosition(retryElement, step.id);
            
            setState(prev => ({
              ...prev,
              isGatedStep: false,
              gateConditionMet: false,
            }));
          } else if (retryCount >= maxRetries) {
            debugWarn(`🎓 [Tutorial Step ${state.currentStep}] Target not found after ${maxRetries} retries - skipping`);
            clearInterval(retryTimer);
            advanceToNextStep();
          }
        }, retryInterval);
        
        return () => {
          clearInterval(retryTimer);
        };
      }
    }

    debugLog(`🎓 [Tutorial Step ${state.currentStep}] Target element found immediately`);

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
      debugLog(`🎓 [Tutorial Step ${state.currentStep}] Setting up gate monitoring`);
      setupGateMonitoring(step);
    }

    // Cleanup function
    return () => {
      // Remove CSS class from element
      if (element) {
        element.classList.remove('tutorial-spotlight-target');
        // Also remove sidebar elevation if it was added
        const sidebar = element.closest('.bernard-sidebar');
        if (sidebar) {
          sidebar.classList.remove('tutorial-sidebar-elevated');
        }
      }
      
      // Cleanup gate listeners
      cleanupGateListeners();
    };
  }, [state.currentStep, isActive, locateTargetElement, updateTargetPosition, setupGateMonitoring, cleanupGateListeners, advanceToNextStep, completeTutorial]);

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
      
      // Clean up all elevated sidebars
      document.querySelectorAll('.tutorial-sidebar-elevated').forEach((element) => {
        element.classList.remove('tutorial-sidebar-elevated');
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
  }, [state.currentStep, state.isGatedStep, state.gateConditionMet, advanceToNextStep, completeTutorial, goToPreviousStep]);

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

      {/* Overlay with spotlight effect - hide on final step after theme change */}
      {!state.hideOverlay && (
        <TutorialOverlay
          targetRect={state.targetRect}
          theme={state.theme}
        />
      )}

      {/* Tooltip with step content and navigation */}
      <TutorialTooltip
        step={currentStepConfig}
        currentStepNumber={state.currentStep}
        totalSteps={TUTORIAL_STEPS.length}
        targetRect={state.hideOverlay ? null : state.targetRect}
        showSkip={false}
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
