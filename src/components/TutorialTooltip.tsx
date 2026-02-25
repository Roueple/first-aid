/**
 * TutorialTooltip Component
 * 
 * Displays step content and navigation controls for the interactive onboarding tutorial.
 * Implements intelligent positioning based on viewport location, boundary detection,
 * and theme-aware styling.
 * 
 * Features:
 * - Auto-positioning (above/below based on viewport half)
 * - Viewport boundary detection and adjustment
 * - Arrow pointing to target element
 * - Theme-aware styling (light/dark)
 * - Responsive design (mobile/desktop)
 * - Navigation controls (Skip, Back, Next, Finish)
 */

import React, { useEffect, useState, useRef, memo } from 'react';
import { TutorialStep } from '../types/tutorial.types';

interface TutorialTooltipProps {
  /** Current tutorial step configuration */
  step: TutorialStep;
  /** Current step number (1-based) */
  currentStepNumber: number;
  /** Total number of steps in tutorial */
  totalSteps: number;
  /** Bounding rectangle of the target element */
  targetRect: DOMRect | null;
  /** Whether to show skip button (manual restart only) */
  showSkip: boolean;
  /** Whether to show back button */
  showBack: boolean;
  /** Whether to show next button (hidden on gated steps) */
  showNext: boolean;
  /** Callback when Next button is clicked */
  onNext: () => void;
  /** Callback when Back button is clicked */
  onBack: () => void;
  /** Callback when Skip button is clicked */
  onSkip: () => void;
  /** Callback when Finish button is clicked (final step) */
  onFinish: () => void;
  /** Current theme (light or dark) */
  theme: 'light' | 'dark';
}

interface TooltipPosition {
  top: number;
  left: number;
  arrowDirection: 'top' | 'bottom' | 'left' | 'right';
}

const TOOLTIP_PADDING = 16; // Minimum distance from viewport edges
const ARROW_SIZE = 8; // Arrow height/width in pixels

const TutorialTooltipComponent: React.FC<TutorialTooltipProps> = ({
  step,
  currentStepNumber,
  totalSteps,
  targetRect,
  showSkip,
  showBack,
  showNext,
  onNext,
  onBack,
  onSkip,
  onFinish,
  theme,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  const isFinalStep = currentStepNumber === totalSteps;

  /**
   * Focus first button when tooltip appears
   * Implements accessibility requirement for focus management
   */
  useEffect(() => {
    if (position && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [position, currentStepNumber]);

  /**
   * Calculate optimal tooltip position based on target element and viewport
   * Implements Property 11: Tooltip positioning based on viewport half
   * Implements Property 12: Tooltip boundary detection
   * Implements Property 22: Responsive positioning
   * 
   * Uses requestAnimationFrame for efficient measurement after initial render
   */
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) {
      return;
    }

    // Use requestAnimationFrame to measure after paint
    const measureAndPosition = () => {
      if (!tooltipRef.current) return;

      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Determine if target is in top or bottom half of viewport
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const isTopHalf = targetCenterY < viewportHeight / 2;

      let calculatedPosition: TooltipPosition;

      // Default positioning: below if in top half, above if in bottom half
      if (isTopHalf) {
        // Position below target
        calculatedPosition = {
          top: targetRect.bottom + ARROW_SIZE + 8,
          left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
          arrowDirection: 'top',
        };
      } else {
        // Position above target
        calculatedPosition = {
          top: targetRect.top - tooltipRect.height - ARROW_SIZE - 8,
          left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
          arrowDirection: 'bottom',
        };
      }

      // Boundary detection and adjustment - horizontal
      if (calculatedPosition.left < TOOLTIP_PADDING) {
        calculatedPosition.left = TOOLTIP_PADDING;
      } else if (calculatedPosition.left + tooltipRect.width > viewportWidth - TOOLTIP_PADDING) {
        calculatedPosition.left = viewportWidth - tooltipRect.width - TOOLTIP_PADDING;
      }

      // Boundary detection and adjustment - vertical
      if (calculatedPosition.top < TOOLTIP_PADDING) {
        // Not enough space above, try positioning to the side
        if (targetRect.right + tooltipRect.width + ARROW_SIZE + 8 < viewportWidth - TOOLTIP_PADDING) {
          // Position to the right
          calculatedPosition = {
            top: targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
            left: targetRect.right + ARROW_SIZE + 8,
            arrowDirection: 'left',
          };
        } else if (targetRect.left - tooltipRect.width - ARROW_SIZE - 8 > TOOLTIP_PADDING) {
          // Position to the left
          calculatedPosition = {
            top: targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
            left: targetRect.left - tooltipRect.width - ARROW_SIZE - 8,
            arrowDirection: 'right',
          };
        } else {
          // Force below with adjusted top
          calculatedPosition.top = TOOLTIP_PADDING;
        }
      } else if (calculatedPosition.top + tooltipRect.height > viewportHeight - TOOLTIP_PADDING) {
        // Not enough space below, force above with adjusted top
        calculatedPosition.top = viewportHeight - tooltipRect.height - TOOLTIP_PADDING;
      }

      setPosition(calculatedPosition);
      setIsInitialRender(false);
    };

    // Measure after initial render
    if (isInitialRender) {
      requestAnimationFrame(measureAndPosition);
    } else {
      // For subsequent updates, measure immediately
      measureAndPosition();
    }
  }, [targetRect, isInitialRender]);

  /**
   * Reset initial render flag when step changes
   */
  useEffect(() => {
    setIsInitialRender(true);
    setPosition(null);
  }, [currentStepNumber]);

  /**
   * Handle viewport resize for responsive design
   * Implements Property 23: Dynamic repositioning on resize
   */
  useEffect(() => {
    const handleResize = () => {
      // Position will be recalculated by the position effect when targetRect changes
      setPosition(null);
      setIsInitialRender(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!position) {
    // Render with opacity 0 for initial measurement (avoids double render)
    return (
      <div
        ref={tooltipRef}
        className={`tutorial-tooltip tutorial-tooltip-${theme}`}
        style={{ 
          opacity: 0,
          pointerEvents: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
        aria-hidden="true"
      >
        <div className="tutorial-tooltip-header">
          <div className="tutorial-tooltip-step-number">
            {currentStepNumber}
          </div>
          <h3 className="tutorial-tooltip-title">{step.title}</h3>
        </div>
        <p className="tutorial-tooltip-description">{step.description}</p>
        <div className="tutorial-tooltip-controls">
          {showSkip && (
            <button className="tutorial-tooltip-btn tutorial-tooltip-btn-secondary tutorial-tooltip-btn-skip">
              Skip Tutorial
            </button>
          )}
          {showBack && (
            <button className="tutorial-tooltip-btn tutorial-tooltip-btn-secondary">
              Back
            </button>
          )}
          {showNext && !isFinalStep && (
            <button className="tutorial-tooltip-btn tutorial-tooltip-btn-primary">
              Next
            </button>
          )}
          {isFinalStep && (
            <button className="tutorial-tooltip-btn tutorial-tooltip-btn-primary">
              Finish
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={tooltipRef}
      className={`tutorial-tooltip tutorial-tooltip-${theme}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="dialog"
      aria-labelledby="tutorial-tooltip-title"
      aria-describedby="tutorial-tooltip-description"
    >
      {/* Arrow pointing to target element */}
      <div className={`tutorial-tooltip-arrow tutorial-tooltip-arrow-${position.arrowDirection}`} />

      {/* Step header with number and title */}
      <div className="tutorial-tooltip-header">
        <div 
          className="tutorial-step-number"
          aria-label={`Step ${currentStepNumber} of ${totalSteps}`}
        >
          {currentStepNumber}
        </div>
        <h3 
          id="tutorial-tooltip-title" 
          className="tutorial-step-title"
        >
          {step.title}
        </h3>
      </div>

      {/* Step description */}
      <p 
        id="tutorial-tooltip-description" 
        className="tutorial-step-description"
      >
        {step.description}
      </p>

      {/* Navigation controls */}
      <div className="tutorial-nav-controls">
        {showSkip && (
          <button
            ref={!showBack ? firstButtonRef : undefined}
            className="tutorial-btn tutorial-btn-secondary tutorial-btn-skip"
            onClick={onSkip}
            aria-label="Skip tutorial and close"
            tabIndex={0}
          >
            Skip Tutorial
          </button>
        )}
        {showBack && (
          <button
            ref={firstButtonRef}
            className="tutorial-btn tutorial-btn-secondary"
            onClick={onBack}
            aria-label={`Go to previous step (${currentStepNumber - 1} of ${totalSteps})`}
            tabIndex={0}
          >
            Back
          </button>
        )}
        {showNext && !isFinalStep && (
          <button
            ref={!showBack && !showSkip ? firstButtonRef : undefined}
            className="tutorial-btn tutorial-btn-primary"
            onClick={onNext}
            aria-label={`Go to next step (${currentStepNumber + 1} of ${totalSteps})`}
            tabIndex={0}
          >
            Next
          </button>
        )}
        {isFinalStep && (
          <button
            ref={!showBack && !showSkip ? firstButtonRef : undefined}
            className="tutorial-btn tutorial-btn-primary"
            onClick={onFinish}
            aria-label="Complete tutorial and close"
            tabIndex={0}
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
// Only re-render when props actually change
export const TutorialTooltip = memo(TutorialTooltipComponent, (prevProps, nextProps) => {
  // Custom comparison for DOMRect and step object
  const rectEqual = 
    prevProps.targetRect === nextProps.targetRect ||
    (!!prevProps.targetRect && !!nextProps.targetRect &&
     prevProps.targetRect.top === nextProps.targetRect.top &&
     prevProps.targetRect.left === nextProps.targetRect.left &&
     prevProps.targetRect.width === nextProps.targetRect.width &&
     prevProps.targetRect.height === nextProps.targetRect.height);
  
  const stepEqual = prevProps.step.id === nextProps.step.id;
  
  return (
    rectEqual &&
    stepEqual &&
    prevProps.currentStepNumber === nextProps.currentStepNumber &&
    prevProps.totalSteps === nextProps.totalSteps &&
    prevProps.showSkip === nextProps.showSkip &&
    prevProps.showBack === nextProps.showBack &&
    prevProps.showNext === nextProps.showNext &&
    prevProps.theme === nextProps.theme
  );
});

TutorialTooltip.displayName = 'TutorialTooltip';
