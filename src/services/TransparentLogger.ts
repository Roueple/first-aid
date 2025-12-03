/**
 * TransparentLogger
 * 
 * Provides detailed, transparent logging of the Smart Query Router process
 * Visible in browser console (F12 / Ctrl+Shift+I)
 * 
 * Shows complete flow:
 * 1. Input query
 * 2. Local masking
 * 3. Intent recognition
 * 4. Route decision
 * 5. Query execution
 * 6. Server pseudonymization
 * 7. AI processing
 * 8. Server depseudonymization
 * 9. Local unmasking
 * 10. Final output
 */

export type LogLevel = 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' | 'STEP' | 'SUBSTEP' | 'DATA';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  step?: string;
  message: string;
  data?: any;
  duration?: number;
}

class TransparentLogger {
  private logs: LogEntry[] = [];
  private stepStartTimes: Map<string, number> = new Map();
  private enabled: boolean = true;
  private currentSessionId?: string;

  // Console styling
  private styles = {
    INFO: 'color: #3b82f6; font-weight: bold',      // Blue
    SUCCESS: 'color: #10b981; font-weight: bold',   // Green
    ERROR: 'color: #ef4444; font-weight: bold',     // Red
    WARN: 'color: #f59e0b; font-weight: bold',      // Orange
    STEP: 'color: #8b5cf6; font-weight: bold; font-size: 14px', // Purple
    SUBSTEP: 'color: #6366f1; font-weight: normal', // Indigo
    DATA: 'color: #6b7280; font-style: italic',     // Gray
  };

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Set current session ID for context
   */
  setSessionId(sessionId: string) {
    this.currentSessionId = sessionId;
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.stepStartTimes.clear();
    console.clear();
  }

  /**
   * Start a major step
   */
  startStep(stepNumber: number, stepName: string, data?: any) {
    if (!this.enabled) return;

    const stepKey = `step_${stepNumber}`;
    this.stepStartTimes.set(stepKey, Date.now());

    const separator = '═'.repeat(80);
    console.log(`\n%c${separator}`, 'color: #8b5cf6');
    console.log(`%c▶ STEP ${stepNumber}: ${stepName}`, this.styles.STEP);
    console.log(`%c${separator}`, 'color: #8b5cf6');

    if (data) {
      console.log('%cInput:', this.styles.DATA, data);
    }

    this.log('STEP', `STEP ${stepNumber}: ${stepName}`, data);
  }

  /**
   * End a major step
   */
  endStep(stepNumber: number, stepName: string, result?: any) {
    if (!this.enabled) return;

    const stepKey = `step_${stepNumber}`;
    const startTime = this.stepStartTimes.get(stepKey);
    const duration = startTime ? Date.now() - startTime : undefined;

    if (result) {
      console.log('%cOutput:', this.styles.DATA, result);
    }

    if (duration !== undefined) {
      console.log(`%c✓ Completed in ${duration}ms`, this.styles.SUCCESS);
    }

    this.log('SUCCESS', `${stepName} completed`, result, duration);
  }

  /**
   * Log a substep
   */
  substep(message: string, data?: any) {
    if (!this.enabled) return;

    console.log(`%c  → ${message}`, this.styles.SUBSTEP);
    if (data) {
      console.log('     ', data);
    }

    this.log('SUBSTEP', message, data);
  }

  /**
   * Log general information
   */
  info(message: string, data?: any) {
    if (!this.enabled) return;

    console.log(`%c[INFO] ${message}`, this.styles.INFO);
    if (data) {
      console.log(data);
    }

    this.log('INFO', message, data);
  }

  /**
   * Log success
   */
  success(message: string, data?: any) {
    if (!this.enabled) return;

    console.log(`%c✓ ${message}`, this.styles.SUCCESS);
    if (data) {
      console.log(data);
    }

    this.log('SUCCESS', message, data);
  }

  /**
   * Log error
   */
  error(message: string, error?: any) {
    if (!this.enabled) return;

    console.error(`%c✗ ${message}`, this.styles.ERROR);
    if (error) {
      console.error(error);
    }

    this.log('ERROR', message, error);
  }

  /**
   * Log warning
   */
  warn(message: string, data?: any) {
    if (!this.enabled) return;

    console.warn(`%c⚠ ${message}`, this.styles.WARN);
    if (data) {
      console.warn(data);
    }

    this.log('WARN', message, data);
  }

  /**
   * Log data details
   */
  data(label: string, data: any) {
    if (!this.enabled) return;

    console.log(`%c${label}:`, this.styles.DATA, data);
    this.log('DATA', label, data);
  }

  /**
   * Log the complete query flow header
   */
  logFlowStart(query: string, sessionId?: string) {
    if (!this.enabled) return;

    console.log('\n\n');
    console.log('%c╔═══════════════════════════════════════════════════════════════════════════════╗', 'color: #8b5cf6; font-weight: bold');
    console.log('%c║  SMART QUERY ROUTER V2 - TRANSPARENT FLOW                                    ║', 'color: #8b5cf6; font-weight: bold');
    console.log('%c╚═══════════════════════════════════════════════════════════════════════════════╝', 'color: #8b5cf6; font-weight: bold');
    console.log('\n');
    console.log('%c📝 User Query:', this.styles.INFO, query);
    if (sessionId) {
      console.log('%c🔑 Session ID:', this.styles.INFO, sessionId);
    }
    console.log('%c⏱️  Started at:', this.styles.INFO, new Date().toLocaleTimeString());
    console.log('\n');

    this.log('INFO', 'Query flow started', { query, sessionId });
  }

  /**
   * Log the complete query flow summary
   */
  logFlowEnd(result: any, totalDuration: number) {
    if (!this.enabled) return;

    console.log('\n\n');
    console.log('%c╔═══════════════════════════════════════════════════════════════════════════════╗', 'color: #10b981; font-weight: bold');
    console.log('%c║  FLOW COMPLETE                                                                ║', 'color: #10b981; font-weight: bold');
    console.log('%c╚═══════════════════════════════════════════════════════════════════════════════╝', 'color: #10b981; font-weight: bold');
    console.log('\n');
    console.log('%c✓ Total Execution Time:', this.styles.SUCCESS, `${totalDuration}ms`);
    console.log('%c📊 Query Type:', this.styles.INFO, result.type);
    if (result.recognizedIntent) {
      console.log('%c🎯 Recognized Intent:', this.styles.INFO, result.recognizedIntent.intent);
      console.log('%c📈 Confidence:', this.styles.INFO, `${Math.round(result.recognizedIntent.confidence * 100)}%`);
    }
    console.log('%c⏱️  Completed at:', this.styles.INFO, new Date().toLocaleTimeString());
    console.log('\n');

    this.log('SUCCESS', 'Query flow completed', { result, totalDuration });
  }

  /**
   * Log masking details
   */
  logMasking(original: string, masked: string, tokens: any[]) {
    if (!this.enabled) return;

    this.substep('Masking sensitive data...');
    
    if (tokens.length > 0) {
      console.log('     %cOriginal:', this.styles.DATA, original);
      console.log('     %cMasked:', this.styles.DATA, masked);
      console.log('     %cTokens created:', this.styles.DATA, tokens.length);
      
      tokens.forEach((token, index) => {
        console.log(`     %c  [${index + 1}] ${token.type}:`, this.styles.DATA, 
          `${token.originalValue} → ${token.token}`);
      });
    } else {
      console.log('     %cNo sensitive data detected', this.styles.DATA);
    }
  }

  /**
   * Log unmasking details
   */
  logUnmasking(masked: string, unmasked: string, tokens: any[]) {
    if (!this.enabled) return;

    this.substep('Unmasking sensitive data...');
    
    if (tokens.length > 0) {
      console.log('     %cMasked:', this.styles.DATA, masked);
      console.log('     %cUnmasked:', this.styles.DATA, unmasked);
      console.log('     %cTokens restored:', this.styles.DATA, tokens.length);
    } else {
      console.log('     %cNo tokens to restore', this.styles.DATA);
    }
  }

  /**
   * Log intent recognition
   */
  logIntent(intent: any) {
    if (!this.enabled) return;

    this.substep('Intent recognized');
    console.log('     %cIntent:', this.styles.DATA, intent.intent);
    console.log('     %cConfidence:', this.styles.DATA, `${Math.round(intent.confidence * 100)}%`);
    console.log('     %cRequires Analysis:', this.styles.DATA, intent.requiresAnalysis ? 'Yes' : 'No');
    
    if (Object.keys(intent.filters).length > 0) {
      console.log('     %cExtracted Filters:', this.styles.DATA, intent.filters);
      
      // Highlight department filter specifically (uses Firestore query, not client-side)
      if (intent.filters.department) {
        console.log('     %c✅ Department Filter:', this.styles.SUCCESS, `"${intent.filters.department}" (Firestore native query)`);
      }
      
      // Warn about keywords (uses client-side filtering)
      if (intent.filters.keywords && intent.filters.keywords.length > 0) {
        console.warn('     ⚠️ Keywords Filter:', intent.filters.keywords, '(client-side search - less efficient)');
      }
    }
  }

  /**
   * Log routing decision
   */
  logRouting(queryType: string, reason: string, hasFilters: boolean) {
    if (!this.enabled) return;

    this.substep(`Routing to: ${queryType.toUpperCase()}`);
    console.log('     %cReason:', this.styles.DATA, reason);
    console.log('     %cHas Filters:', this.styles.DATA, hasFilters ? 'Yes' : 'No');
  }

  /**
   * Log database query
   */
  logDatabaseQuery(filters: any, resultCount: number, duration: number) {
    if (!this.enabled) return;

    this.substep('Database query executed');
    console.log('     %cFilters:', this.styles.DATA, filters);
    console.log('     %cResults:', this.styles.DATA, `${resultCount} findings`);
    console.log('     %cDuration:', this.styles.DATA, `${duration}ms`);
  }

  /**
   * Log pseudonymization
   */
  logPseudonymization(findingsCount: number, mappingsCreated: number, sessionId: string) {
    if (!this.enabled) return;

    this.substep('Server pseudonymization');
    console.log('     %cSession ID:', this.styles.DATA, sessionId);
    console.log('     %cFindings:', this.styles.DATA, findingsCount);
    console.log('     %cMappings Created:', this.styles.DATA, mappingsCreated);
    console.log('     %cExample:', this.styles.DATA, 'John Doe → Person_A, ID12345 → ID_001');
  }

  /**
   * Log depseudonymization
   */
  logDepseudonymization(sessionId: string) {
    if (!this.enabled) return;

    this.substep('Server depseudonymization');
    console.log('     %cSession ID:', this.styles.DATA, sessionId);
    console.log('     %cExample:', this.styles.DATA, 'Person_A → John Doe, ID_001 → ID12345');
  }

  /**
   * Log AI processing
   */
  logAIProcessing(tokensUsed?: number, thinkingMode?: string) {
    if (!this.enabled) return;

    this.substep('AI processing (Gemini)');
    if (thinkingMode) {
      console.log('     %cThinking Mode:', this.styles.DATA, thinkingMode);
    }
    if (tokensUsed) {
      console.log('     %cTokens Used:', this.styles.DATA, tokensUsed);
    }
  }

  /**
   * Internal log storage
   */
  private log(level: LogLevel, message: string, data?: any, duration?: number) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      duration,
    };

    this.logs.push(entry);
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as file
   */
  downloadLogs(filename?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = filename || `query-router-logs-${timestamp}.json`;
    
    const blob = new Blob([this.exportLogs()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const transparentLogger = new TransparentLogger();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).queryRouterLogger = transparentLogger;
}
