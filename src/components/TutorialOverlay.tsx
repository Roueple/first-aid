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
  const spotlightRadius = 8;

  return (
    <div
      className={`tutorial-overlay tutorial-overlay-${theme}`}
      style={{ zIndex: 9998 }}
      role="presentation"
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        aria-hidden="true"
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White rectangle covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle creates the spotlight cutout */}
            <rect
              x={spotlightX}
              y={spotlightY}
              width={spotlightWidth}
              height={spotlightHeight}
              rx={spotlightRadius}
              ry={spotlightRadius}
              fill="black"
            />
          </mask>
        </defs>
        {/* Apply mask to create dimmed overlay with spotlight cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'}
          mask="url(#spotlight-mask)"
        />
      </svg>
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
