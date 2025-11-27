/**
 * ErrorHandler - Global error handling system for FIRST-AID
 * 
 * Provides centralized error categorization, user-friendly messaging,
 * logging, and notification capabilities.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  AI_SERVICE = 'AI_SERVICE',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Notification type for UI display
 */
export enum NotificationType {
  SUCCESS = 'SUCCESS',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Error context information
 */
export interface ErrorContext {
  operation: string;
  userId?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Categorized error information
 */
export interface CategorizedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  isRecoverable: boolean;
  originalError?: Error;
  context?: ErrorContext;
  timestamp: Date;
}

/**
 * Notification callback type
 */
export type NotificationCallback = (
  message: string,
  type: NotificationType,
  duration?: number
) => void;

/**
 * Error log callback type for sending to Cloud Functions
 */
export type ErrorLogCallback = (
  error: CategorizedError,
  context: ErrorContext
) => Promise<void>;

/**
 * ErrorHandler class - Centralized error handling
 */
class ErrorHandler {
  private notificationCallback: NotificationCallback | null = null;
  private errorLogCallback: ErrorLogCallback | null = null;
  private isOnline: boolean = true;

  /**
   * Register a notification callback for displaying errors to users
   */
  setNotificationCallback(callback: NotificationCallback): void {
    this.notificationCallback = callback;
  }

  /**
   * Register an error logging callback for sending errors to Cloud Functions
   */
  setErrorLogCallback(callback: ErrorLogCallback): void {
    this.errorLogCallback = callback;
  }

  /**
   * Update online status for network-aware error handling
   */
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  /**
   * Main error handling method
   * @param error - The error to handle
   * @param context - Context information about where the error occurred
   */
  async handle(error: Error | any, context: ErrorContext): Promise<void> {
    try {
      // Categorize the error
      const categorizedError = this.categorizeError(error, context);

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error handled:', {
          category: categorizedError.category,
          message: categorizedError.technicalMessage,
          context,
          originalError: error,
        });
      }

      // Log to Cloud Functions (async, don't block on failure)
      this.logError(categorizedError, context).catch((logError) => {
        console.error('Failed to log error to Cloud Functions:', logError);
      });

      // Show user-friendly notification
      this.showNotification(
        categorizedError.userMessage,
        this.mapSeverityToNotificationType(categorizedError.severity)
      );

      // Attempt recovery if possible
      if (categorizedError.isRecoverable) {
        await this.attemptRecovery(categorizedError, context);
      }
    } catch (handlingError) {
      // Fallback if error handling itself fails
      console.error('Error in error handler:', handlingError);
      this.showNotification(
        'An unexpected error occurred. Please try again.',
        NotificationType.ERROR
      );
    }
  }

  /**
   * Categorize an error into a structured format
   */
  categorizeError(error: Error | any, context: ErrorContext): CategorizedError {
    const timestamp = new Date();
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || '';

    // Check for authentication errors
    if (this.isAuthenticationError(error, errorCode, errorMessage)) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.WARNING,
        userMessage: this.getAuthErrorMessage(errorCode, errorMessage),
        technicalMessage: errorMessage,
        isRecoverable: false,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for network errors
    if (this.isNetworkError(error, errorCode, errorMessage)) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.WARNING,
        userMessage: 'Network connection issue. Please check your internet connection and try again.',
        technicalMessage: errorMessage,
        isRecoverable: true,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for database errors
    if (this.isDatabaseError(error, errorCode, errorMessage)) {
      return {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.ERROR,
        userMessage: this.getDatabaseErrorMessage(errorCode, errorMessage),
        technicalMessage: errorMessage,
        isRecoverable: this.isDatabaseErrorRecoverable(errorCode),
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for AI service errors
    if (this.isAIServiceError(error, errorCode, errorMessage, context)) {
      return {
        category: ErrorCategory.AI_SERVICE,
        severity: ErrorSeverity.WARNING,
        userMessage: 'AI service is temporarily unavailable. Basic search functionality is still available.',
        technicalMessage: errorMessage,
        isRecoverable: true,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for validation errors
    if (this.isValidationError(error, errorCode, errorMessage)) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.INFO,
        userMessage: this.getValidationErrorMessage(errorMessage),
        technicalMessage: errorMessage,
        isRecoverable: false,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for permission errors
    if (this.isPermissionError(error, errorCode, errorMessage)) {
      return {
        category: ErrorCategory.PERMISSION,
        severity: ErrorSeverity.ERROR,
        userMessage: 'You do not have permission to perform this action.',
        technicalMessage: errorMessage,
        isRecoverable: false,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for not found errors
    if (this.isNotFoundError(error, errorCode, errorMessage)) {
      return {
        category: ErrorCategory.NOT_FOUND,
        severity: ErrorSeverity.WARNING,
        userMessage: 'The requested resource was not found.',
        technicalMessage: errorMessage,
        isRecoverable: false,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for timeout errors
    if (this.isTimeoutError(error, errorCode, errorMessage)) {
      return {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.WARNING,
        userMessage: 'The operation took too long. Please try again.',
        technicalMessage: errorMessage,
        isRecoverable: true,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for rate limit errors
    if (this.isRateLimitError(error, errorCode, errorMessage)) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.WARNING,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        technicalMessage: errorMessage,
        isRecoverable: true,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Check for import/export errors
    if (this.isImportExportError(context)) {
      return {
        category: context.operation.includes('import') ? ErrorCategory.IMPORT : ErrorCategory.EXPORT,
        severity: ErrorSeverity.ERROR,
        userMessage: this.getImportExportErrorMessage(errorMessage, context),
        technicalMessage: errorMessage,
        isRecoverable: false,
        originalError: error,
        context,
        timestamp,
      };
    }

    // Default to unknown error
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      technicalMessage: errorMessage,
      isRecoverable: false,
      originalError: error,
      context,
      timestamp,
    };
  }

  /**
   * Error type detection methods
   */
  private isAuthenticationError(error: any, code: string, message: string): boolean {
    return (
      code.startsWith('auth/') ||
      message.includes('authentication') ||
      message.includes('unauthenticated') ||
      message.includes('login') ||
      message.includes('credential')
    );
  }

  private isNetworkError(error: any, code: string, message: string): boolean {
    return (
      code === 'network-request-failed' ||
      code === 'unavailable' ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('offline') ||
      !this.isOnline
    );
  }

  private isDatabaseError(error: any, code: string, message: string): boolean {
    return (
      error?.name === 'DatabaseError' ||
      code.includes('firestore') ||
      code === 'permission-denied' ||
      code === 'not-found' ||
      code === 'deadline-exceeded' ||
      message.includes('Firestore') ||
      message.includes('database')
    );
  }

  private isAIServiceError(error: any, code: string, message: string, context: ErrorContext): boolean {
    return (
      context.operation.includes('chat') ||
      context.operation.includes('ai') ||
      context.operation.includes('embedding') ||
      message.includes('OpenAI') ||
      message.includes('Gemini') ||
      message.includes('AI service')
    );
  }

  private isValidationError(error: any, code: string, message: string): boolean {
    return (
      code === 'invalid-argument' ||
      code === 'failed-precondition' ||
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    );
  }

  private isPermissionError(error: any, code: string, message: string): boolean {
    return (
      code === 'permission-denied' ||
      message.includes('permission') ||
      message.includes('unauthorized')
    );
  }

  private isNotFoundError(error: any, code: string, message: string): boolean {
    return (
      code === 'not-found' ||
      message.includes('not found') ||
      message.includes('does not exist')
    );
  }

  private isTimeoutError(error: any, code: string, message: string): boolean {
    return (
      code === 'deadline-exceeded' ||
      code === 'timeout' ||
      message.includes('timeout') ||
      message.includes('timed out')
    );
  }

  private isRateLimitError(error: any, code: string, message: string): boolean {
    return (
      code === 'resource-exhausted' ||
      code === 'too-many-requests' ||
      message.includes('rate limit') ||
      message.includes('quota exceeded')
    );
  }

  private isImportExportError(context: ErrorContext): boolean {
    return (
      context.operation.includes('import') ||
      context.operation.includes('export') ||
      context.operation.includes('parse')
    );
  }

  /**
   * Get user-friendly messages for specific error types
   */
  private getAuthErrorMessage(code: string, message: string): string {
    if (code === 'auth/invalid-email') return 'Invalid email address format.';
    if (code === 'auth/user-disabled') return 'This account has been disabled.';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      return 'Invalid email or password.';
    }
    if (code === 'auth/invalid-credential') return 'Invalid email or password.';
    if (code === 'auth/too-many-requests') {
      return 'Too many failed login attempts. Please try again later.';
    }
    if (message.includes('session') || message.includes('expired')) {
      return 'Your session has expired. Please log in again.';
    }
    return 'Authentication failed. Please try again.';
  }

  private getDatabaseErrorMessage(code: string, message: string): string {
    if (code === 'permission-denied') {
      return 'You do not have permission to access this data.';
    }
    if (code === 'not-found') {
      return 'The requested data was not found.';
    }
    if (code === 'unavailable' || code === 'deadline-exceeded') {
      return 'Database is temporarily unavailable. Please try again.';
    }
    return 'A database error occurred. Please try again.';
  }

  private getValidationErrorMessage(message: string): string {
    // Try to extract meaningful validation message
    if (message.includes('required')) {
      return 'Please fill in all required fields.';
    }
    if (message.includes('invalid')) {
      return 'Please check your input and try again.';
    }
    return message.length < 100 ? message : 'Invalid input. Please check your data and try again.';
  }

  private getImportExportErrorMessage(message: string, context: ErrorContext): string {
    if (context.operation.includes('import')) {
      if (message.includes('format') || message.includes('parse')) {
        return 'Invalid file format. Please upload a valid Excel file (.xlsx or .xls).';
      }
      if (message.includes('duplicate')) {
        return 'Duplicate entries detected. Please review and try again.';
      }
      return 'Failed to import data. Please check the file format and try again.';
    }
    return 'Failed to export data. Please try again.';
  }

  /**
   * Determine if a database error is recoverable
   */
  private isDatabaseErrorRecoverable(code: string): boolean {
    return code === 'unavailable' || code === 'deadline-exceeded';
  }

  /**
   * Map error severity to notification type
   */
  private mapSeverityToNotificationType(severity: ErrorSeverity): NotificationType {
    switch (severity) {
      case ErrorSeverity.INFO:
        return NotificationType.INFO;
      case ErrorSeverity.WARNING:
        return NotificationType.WARNING;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return NotificationType.ERROR;
      default:
        return NotificationType.ERROR;
    }
  }

  /**
   * Show notification to user
   */
  private showNotification(message: string, type: NotificationType, duration?: number): void {
    if (this.notificationCallback) {
      this.notificationCallback(message, type, duration);
    } else {
      // Fallback to console if no notification system is registered
      console.warn('No notification callback registered. Message:', message);
    }
  }

  /**
   * Log error to Cloud Functions
   */
  private async logError(error: CategorizedError, context: ErrorContext): Promise<void> {
    if (this.errorLogCallback) {
      try {
        await this.errorLogCallback(error, context);
      } catch (logError) {
        // Don't throw - logging failures shouldn't break the app
        console.error('Failed to log error:', logError);
      }
    }
  }

  /**
   * Attempt to recover from recoverable errors
   */
  private async attemptRecovery(error: CategorizedError, context: ErrorContext): Promise<void> {
    // Recovery strategies based on error category
    switch (error.category) {
      case ErrorCategory.NETWORK:
        // Network errors: suggest retry
        this.showNotification(
          'Connection restored. You can try your action again.',
          NotificationType.INFO,
          3000
        );
        break;

      case ErrorCategory.TIMEOUT:
        // Timeout errors: suggest retry with longer wait
        this.showNotification(
          'Please wait a moment before trying again.',
          NotificationType.INFO,
          3000
        );
        break;

      case ErrorCategory.RATE_LIMIT:
        // Rate limit: suggest waiting
        this.showNotification(
          'Please wait 30 seconds before trying again.',
          NotificationType.INFO,
          5000
        );
        break;

      case ErrorCategory.AI_SERVICE:
        // AI service errors: inform about fallback
        this.showNotification(
          'Using basic search instead. AI features will return when service is restored.',
          NotificationType.INFO,
          5000
        );
        break;

      default:
        // No specific recovery action
        break;
    }
  }

  /**
   * Handle success notifications
   */
  success(message: string, duration?: number): void {
    this.showNotification(message, NotificationType.SUCCESS, duration);
  }

  /**
   * Handle info notifications
   */
  info(message: string, duration?: number): void {
    this.showNotification(message, NotificationType.INFO, duration);
  }

  /**
   * Handle warning notifications
   */
  warning(message: string, duration?: number): void {
    this.showNotification(message, NotificationType.WARNING, duration);
  }

  /**
   * Handle error notifications (without full error handling)
   */
  error(message: string, duration?: number): void {
    this.showNotification(message, NotificationType.ERROR, duration);
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

export default errorHandler;
