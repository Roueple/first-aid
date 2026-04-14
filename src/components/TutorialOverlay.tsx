import React, { useEffect, useState, memo } from 'react';
import '../renderer/styles/tutorial.css';

interface TutorialOverlayProps {
  targetRect: DOMRect | null;
  theme: 'light' | 'dark';
}

const TutorialOverlayComponent: React.FC<TutorialOverlayProps> = ({
  targetRect,
  theme,
}) => {
  const [adjustedRect, setAdjustedRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetRect) {
      setAdjustedRect(null);
      return;
    }

    // Edge detection: adjust spotlight if target is near viewport edges
    const padding = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const adjusted = {
      top: Math.max(padding, Math.min(targetRect.top, viewportHeight - targetRect.height - padding)),
      left: Math.max(padding, Math.min(targetRect.left, viewportWidth - targetRect.width - padding)),
      width: targetRect.width,
      height: targetRect.height,
      right: targetRect.right,
      bottom: targetRect.bottom,
      x: targetRect.x,
      y: targetRect.y,
    } as DOMRect;

    setAdjustedRect(adjusted);
  }, [targetRect]);

  if (!adjustedRect) {
    return null;
  }

  // Add padding around the spotlight for better visual effect
  const spotlightPadding = 8;
  const spotlightX = adjustedRect.left - spotlightPadding;
  const spotlightY = adjustedRect.top - spotlightPadding;
  const spotlightWidth = adjustedRect.width + spotlightPadding * 2;
  const spotlightHeight = adjustedRect.height + spotlightPadding * 2;

  const overlayColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)';

  return (
    <div
      className={`tutorial-overlay tutorial-overlay-${theme}`}
      style={{ zIndex: 9998 }}
      role="presentation"
      aria-hidden="true"
    >
      {/* Top overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${spotlightY}px`,
          background: overlayColor,
          pointerEvents: 'none',
        }}
      />
      
      {/* Left overlay */}
      <div
        style={{
          position: 'absolute',
          top: `${spotlightY}px`,
          left: 0,
          width: `${spotlightX}px`,
          height: `${spotlightHeight}px`,
          background: overlayColor,
          pointerEvents: 'none',
        }}
      />
      
      {/* Right overlay */}
      <div
        style={{
          position: 'absolute',
          top: `${spotlightY}px`,
          left: `${spotlightX + spotlightWidth}px`,
          right: 0,
          height: `${spotlightHeight}px`,
          background: overlayColor,
          pointerEvents: 'none',
        }}
      />
      
      {/* Bottom overlay */}
      <div
        style={{
          position: 'absolute',
          top: `${spotlightY + spotlightHeight}px`,
          left: 0,
          right: 0,
          bottom: 0,
          background: overlayColor,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
// Only re-render when targetRect or theme changes
export const TutorialOverlay = memo(TutorialOverlayComponent, (prevProps, nextProps) => {
  // Custom comparison for DOMRect (object comparison)
  const rectEqual = 
    prevProps.targetRect === nextProps.targetRect ||
    (!!prevProps.targetRect && !!nextProps.targetRect &&
     prevProps.targetRect.top === nextProps.targetRect.top &&
     prevProps.targetRect.left === nextProps.targetRect.left &&
     prevProps.targetRect.width === nextProps.targetRect.width &&
     prevProps.targetRect.height === nextProps.targetRect.height);
  
  return rectEqual && prevProps.theme === nextProps.theme;
});

TutorialOverlay.displayName = 'TutorialOverlay';
