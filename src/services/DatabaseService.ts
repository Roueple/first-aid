import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Query,
  DocumentData,
  QueryConstraint,
  Timestamp,
  WhereFilterOp,
  OrderByDirection,
  DocumentSnapshot,
  CollectionReference,
  Firestore,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { connectionMonitor, ConnectionStatus } from '../utils/connectionMonitor';
import { Pagination, PaginatedResult, createPaginatedResult } from '../types/filter.types';

/**
 * Error types for database operations
 */
export enum DatabaseErrorType {
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
}

/**
 * Custom database error class
 */
export class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Query filter interface for building Firestore queries
 */
export interface QueryFilter {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

/**
 * Query sort interface
 */
export interface QuerySort {
  field: string;
  direction: OrderByDirection;
}

/**
 * Query options for building complex queries
 */
export interface QueryOptions {
  filters?: QueryFilter[];
  sorts?: QuerySort[];
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration with exponential backoff
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Generic DatabaseService class providing CRUD operations and query building
 * Implements error handling, retry logic, and connection status checking
 * 
 * @template T - The type of documents in the collection
 */
export class DatabaseService<T extends DocumentData> {
  protected collectionName: string;
  protected db: Firestore;
  protected retryConfig: RetryConfig;
  private collectionRef: CollectionReference<DocumentData>;

  constructor(
    collectionName: string,
    retryConfig: Partial<RetryConfig> = {}
  ) {
    this.collectionName = collectionName;
    this.db = db;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.collectionRef = collection(this.db, this.collectionName);
  }

  /**
   * Check if the database connection is available
   * @throws DatabaseError if connection is not available
   */
  protected async checkConnection(): Promise<void> {
    const status = connectionMonitor.getStatus();
    if (status === 'disconnected') {
      throw new DatabaseError(
        DatabaseErrorType.CONNECTION_ERROR,
        'No database connection available. Please check your network connection.'
      );
    }
  }

  /**
   * Execute an operation with retry logic and exponential backoff
   * @param operation - The async operation to execute
   * @param operationName - Name of the operation for error messages
   * @returns Promise resolving to the operation result
   */
  protected async executeWithRetry<R>(
    operation: () => Promise<R>,
    operationName: string
  ): Promise<R> {
    let lastError: any;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Check connection before attempting operation
        await this.checkConnection();
        
        // Execute the operation
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain error types
        if (this.shouldNotRetry(error)) {
          throw this.mapError(error, operationName);
        }

        // If this was the last attempt, throw the error
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        await this.sleep(delay);
        delay = Math.min(
          delay * this.retryConfig.backoffMultiplier,
          this.retryConfig.maxDelayMs
        );

        console.warn(
          `Retrying ${operationName} (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`
        );
      }
    }

    // All retries exhausted, throw the last error
    throw this.mapError(lastError, operationName);
  }

  /**
   * Determine if an error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    const code = error?.code || '';
    
    // Don't retry on permission denied, not found, or validation errors
    return (
      code === 'permission-denied' ||
      code === 'not-found' ||
      code === 'invalid-argument' ||
      code === 'failed-precondition'
    );
  }

  /**
   * Map Firebase errors to DatabaseError
   */
  protected mapError(error: any, operation: string): DatabaseError {
    const code = error?.code || '';
    const message = error?.message || 'Unknown error occurred';

    switch (code) {
      case 'not-found':
        return new DatabaseError(
          DatabaseErrorType.NOT_FOUND,
          `Document not found during ${operation}`,
          error
        );
      case 'permission-denied':
        return new DatabaseError(
          DatabaseErrorType.PERMISSION_DENIED,
          `Permission denied during ${operation}`,
          error
        );
      case 'unavailable':
      case 'deadline-exceeded':
        return new DatabaseError(
          DatabaseErrorType.NETWORK_ERROR,
          `Network error during ${operation}. Please try again.`,
          error
        );
      case 'invalid-argument':
      case 'failed-precondition':
        return new DatabaseError(
          DatabaseErrorType.VALIDATION_ERROR,
          `Validation error during ${operation}: ${message}`,
          error
        );
      default:
        return new DatabaseError(
          DatabaseErrorType.UNKNOWN_ERROR,
          `Error during ${operation}: ${message}`,
          error
        );
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build a Firestore query from query options
   */
  protected buildQuery(options: QueryOptions = {}): Query<DocumentData> {
    const constraints: QueryConstraint[] = [];

    // Add filters
    if (options.filters && options.filters.length > 0) {
      options.filters.forEach((filter) => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
    }

    // Add sorts
    if (options.sorts && options.sorts.length > 0) {
      options.sorts.forEach((sort) => {
        constraints.push(orderBy(sort.field, sort.direction));
      });
    }

    // Add pagination
    if (options.startAfterDoc) {
      constraints.push(startAfter(options.startAfterDoc));
    }

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    return query(this.collectionRef, ...constraints);
  }

  /**
   * Create a new document in the collection
   * @param data - Document data to create
   * @returns Promise resolving to the new document ID
   */
  async create(data: Partial<T>): Promise<string> {
    return this.executeWithRetry(async () => {
      const now = Timestamp.now();
      const docData = this.removeUndefined({
        ...data,
        dateCreated: now,
        dateUpdated: now,
      });

      const docRef = await addDoc(this.collectionRef, docData);
      return docRef.id;
    }, 'create');
  }

  /**
   * Get a document by ID
   * @param id - Document ID
   * @returns Promise resolving to the document data or null if not found
   */
  async getById(id: string): Promise<(T & { id: string }) | null> {
    return this.executeWithRetry(async () => {
      const docRef = doc(this.db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as T & { id: string };
    }, 'getById');
  }

  /**
   * Remove undefined values from an object (recursively)
   * Firestore doesn't accept undefined values
   */
  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = this.removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Update a document by ID
   * @param id - Document ID
   * @param data - Partial document data to update
   * @returns Promise that resolves when update is complete
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    return this.executeWithRetry(async () => {
      const docRef = doc(this.db, this.collectionName, id);
      const updateData = this.removeUndefined({
        ...data,
        dateUpdated: Timestamp.now(),
      });

      await updateDoc(docRef, updateData);
    }, 'update');
  }

  /**
   * Delete a document by ID
   * @param id - Document ID
   * @returns Promise that resolves when deletion is complete
   */
  async delete(id: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const docRef = doc(this.db, this.collectionName, id);
      await deleteDoc(docRef);
    }, 'delete');
  }

  /**
   * Get all documents matching the query options
   * @param options - Query options for filtering and sorting
   * @returns Promise resolving to array of documents
   */
  async getAll(options: QueryOptions = {}): Promise<(T & { id: string })[]> {
    return this.executeWithRetry(async () => {
      const q = this.buildQuery(options);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (T & { id: string })[];
    }, 'getAll');
  }

  /**
   * Get paginated documents
   * @param pagination - Pagination parameters
   * @param options - Additional query options
   * @returns Promise resolving to paginated result
   */
  async getPaginated(
    pagination: Pagination,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T & { id: string }>> {
    return this.executeWithRetry(async () => {
      // Build query with pagination
      const queryOptions: QueryOptions = {
        ...options,
        limit: pagination.pageSize,
      };

      // Add sorting from pagination
      if (pagination.sortBy) {
        queryOptions.sorts = [
          {
            field: pagination.sortBy,
            direction: pagination.sortDirection || 'asc',
          },
          ...(options.sorts || []),
        ];
      }

      // Get total count (without pagination)
      const countQuery = this.buildQuery(options);
      const countSnapshot = await getDocs(countQuery);
      const total = countSnapshot.size;

      // Get paginated documents
      // For pages after the first, we need to get the last document from previous page
      let startAfterDoc: DocumentSnapshot | undefined;
      if (pagination.page > 1) {
        const skipCount = (pagination.page - 1) * pagination.pageSize;
        const skipQuery = this.buildQuery({
          ...queryOptions,
          limit: skipCount,
        });
        const skipSnapshot = await getDocs(skipQuery);
        startAfterDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        queryOptions.startAfterDoc = startAfterDoc;
      }

      const items = await this.getAll(queryOptions);

      return createPaginatedResult(items, total, pagination);
    }, 'getPaginated');
  }

  /**
   * Count documents matching the query options
   * @param options - Query options for filtering
   * @returns Promise resolving to the count
   */
  async count(options: QueryOptions = {}): Promise<number> {
    return this.executeWithRetry(async () => {
      const q = this.buildQuery(options);
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    }, 'count');
  }

  /**
   * Check if a document exists
   * @param id - Document ID
   * @returns Promise resolving to true if document exists
   */
  async exists(id: string): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const docRef = doc(this.db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    }, 'exists');
  }

  /**
   * Get the current connection status
   * @returns Current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return connectionMonitor.getStatus();
  }

  /**
   * Subscribe to connection status changes
   * @param callback - Function to call when connection status changes
   * @returns Unsubscribe function
   */
  onConnectionStatusChange(
    callback: (status: ConnectionStatus) => void
  ): () => void {
    return connectionMonitor.subscribe(callback);
  }

  /**
   * Check if currently connected to the database
   * @returns true if connected
   */
  isConnected(): boolean {
    return connectionMonitor.isConnected();
  }
}

export default DatabaseService;
