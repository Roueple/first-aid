/**
 * Type definitions for the Interactive Onboarding Tutorial system
 * 
 * This module defines the core types for the 12-step guided tutorial that introduces
 * first-time users to the Felix chat interface. The tutorial uses spotlight highlighting,
 * tooltips, and gated interactions to ensure hands-on learning.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Gate condition types for tutorial steps that require user interaction
 */
export interface GateCondition {
  /** Type of interaction required to complete the gated step */
  type: 'click' | 'input' | 'state-change';
  /** Optional selector or state key to monitor */
  target?: string;
  /** Optional custom validation function for complex conditions */
  validator?: (event: any) => boolean;
}

/**
 * Individual tutorial step configuration
 */
export interface TutorialStep {
  /** Unique step identifier (1-9) */
  id: number;
  /** Step title displayed in tooltip header */
  title: string;
  /** Detailed instruction text for the step */
  description: string;
  /** data-tutorial attribute value to locate the target element */
  targetSelector: string;
  /** Whether this step requires user interaction before advancing */
  isGated: boolean;
  /** Gate condition configuration (required if isGated is true) */
  gateCondition?: GateCondition;
  /** Preferred tooltip position relative to target (auto-calculated if not specified) */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

/**
 * Tutorial state stored in Firebase for persistence and resume capability
 */
export interface TutorialState {
  /** User ID this tutorial state belongs to */
  userId: string;
  /** Current step number (1-12) */
  currentStep: number;
  /** Timestamp when tutorial was completed (null if incomplete) */
  completedAt: Timestamp | null;
  /** Timestamp when tutorial was first started */
  startedAt: Timestamp;
  /** Timestamp of last state update */
  lastUpdatedAt: Timestamp;
  /** Whether this is a manual restart from settings (affects skip button visibility) */
  isManualRestart: boolean;
}

/**
 * Tutorial configuration and metadata
 */
export interface TutorialConfig {
  /** Total number of steps in the tutorial */
  totalSteps: number;
  /** All tutorial steps in sequence */
  steps: TutorialStep[];
  /** Whether to show skip button (depends on isManualRestart) */
  showSkip: boolean;
  /** Debounce delay for resize events (milliseconds) */
  resizeDebounceMs: number;
  /** Debounce delay for Firebase updates (milliseconds) */
  firebaseDebounceMs: number;
}

/**
 * Tutorial steps configuration - all 12 steps in the onboarding sequence
 * 
 * Steps 3, 4, 7, 9, 10, 11, and 12 are gated and require user interaction before advancing.
 * Other steps allow manual progression via Next button.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to Felix!",
    description: "Let's take a quick tour of Felix's key features. This will only take a minute.",
    targetSelector: "welcome-screen",
    isGated: false,
  },
  {
    id: 2,
    title: "Ask Felix Anything",
    description: "Type your questions in natural language. Felix understands Indonesian real estate terminology and can search through thousands of audit findings.",
    targetSelector: "input-field",
    isGated: false,
  },
  {
    id: 3,
    title: "Try It Out",
    description: "Let's try a sample query. Click the send button or press Enter to search for IT findings in 2024.",
    targetSelector: "input-field",
    isGated: true,
    gateCondition: {
      type: 'click',
      target: 'send-button',
    },
  },
  {
    id: 4,
    title: "Felix is Thinking",
    description: "Watch Felix process your query and search through thousands of audit findings. This usually takes just a few seconds.",
    targetSelector: "chat-area",
    isGated: true,
    gateCondition: {
      type: 'state-change',
      target: 'results-loaded',
    },
  },
  {
    id: 5,
    title: "View Results",
    description: "Felix displays results in an easy-to-read table format. You can see key information at a glance.",
    targetSelector: "results-table",
    isGated: false,
  },
  {
    id: 6,
    title: "Visual Insights",
    description: "Felix automatically generates charts to help you visualize patterns in the data.",
    targetSelector: "aggregation-chart",
    isGated: false,
  },
  {
    id: 7,
    title: "Explore Details",
    description: "Click any row to expand and see the full details of a finding.",
    targetSelector: "table-row-first",
    isGated: true,
    gateCondition: {
      type: 'click',
      target: 'table-row',
    },
  },
  {
    id: 8,
    title: "Copy and Export",
    description: "Use the copy button to copy results to your clipboard, or download as Excel for further analysis.",
    targetSelector: "copy-button",
    isGated: false,
  },
  {
    id: 9,
    title: "Access Your History",
    description: "Click the menu button to view your chat history and access previous searches.",
    targetSelector: "hamburger-menu",
    isGated: true,
    gateCondition: {
      type: 'state-change',
      target: 'sidebar-open',
    },
  },
  {
    id: 10,
    title: "Start a New Chat",
    description: "Click the 'New chat' button to start a fresh conversation with Felix.",
    targetSelector: "new-chat-btn",
    isGated: true,
    gateCondition: {
      type: 'click',
      target: 'new-chat-btn',
    },
  },
  {
    id: 11,
    title: "Close the Sidebar",
    description: "Click the close button to hide the sidebar and get more screen space.",
    targetSelector: "sidebar-close-btn",
    isGated: true,
    gateCondition: {
      type: 'state-change',
      target: 'sidebar-closed',
    },
  },
  {
    id: 12,
    title: "Customize Your Experience",
    description: "Toggle between light and dark themes to match your preference. Click the theme switcher to try it out. You're all set!",
    targetSelector: "theme-switcher",
    isGated: true,
    gateCondition: {
      type: 'state-change',
      target: 'theme',
    },
  },
];
