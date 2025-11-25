import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DatabaseService, DatabaseError, DatabaseErrorType } from '../DatabaseService';
import { Timestamp } from 'firebase/firestore';
import { connectionMonitor } from '../../utils/connectionMonitor';

// Mock Firebase Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({ _type: 'collection' })),
    doc: vi.fn(() => ({ _type: 'doc' })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn((collectionRef, ...constraints) => ({
      _type: 'query',
      collectionRef,
      constraints,
    })),
    where: vi.fn((field, op, value) => ({ _type: 'where', field, op, value })),
    orderBy: vi.fn((field, direction) => ({ _type: 'orderBy', field, direction })),
    limit: vi.fn((count) => ({ _type: 'limit', count })),
    startAfter: vi.fn((doc) => ({ _type: 'startAfter', doc })),
    Timestamp: {
      now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    },
  };
});

// Mock connection monitor
vi.mock('../../utils/connectionMonitor', () => ({
  connectionMonitor: {
    getStatus: vi.fn(() => 'connected'),
    subscribe: vi.fn(() => vi.fn()),
    isConnected: vi.fn(() => true),
  },
}));

// Mock Firebase config
vi.mock('../../config/firebase', () => ({
  db: { _type: 'firestore' },
}));

describe('DatabaseService', () => {
  let service: DatabaseService<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure connection is always "connected" by default
    vi.mocked(connectionMonitor.getStatus).mockReturnValue('connected');
    service = new DatabaseService('test_collection', {
      maxRetries: 0, // Disable retries for faster tests
      initialDelayMs: 10,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Status', () => {
    it('should check connection status', () => {
      const status = service.getConnectionStatus();
      expect(status).toBe('connected');
      expect(connectionMonitor.getStatus).toHaveBeenCalled();
    });

    it('should check if connected', () => {
      const isConnected = service.isConnected();
      expect(isConnected).toBe(true);
      expect(connectionMonitor.isConnected).toHaveBeenCalled();
    });

    it('should subscribe to connection status changes', () => {
      const callback = vi.fn();
      const unsubscribe = service.onConnectionStatusChange(callback);
      
      expect(connectionMonitor.subscribe).toHaveBeenCalledWith(callback);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should throw connection error when disconnected', async () => {
      vi.mocked(connectionMonitor.getStatus).mockReturnValue('disconnected');

      await expect(service.getById('test-id')).rejects.toThrow(DatabaseError);
      await expect(service.getById('test-id')).rejects.toThrow(
        'No database connection available'
      );
    });

    it('should handle permission denied errors without retry', async () => {
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockRejectedValue({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      try {
        await service.getById('test-id');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).type).toBe(DatabaseErrorType.PERMISSION_DENIED);
      }
      
      // Should only be called once (no retries for permission errors)
      expect(getDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should create a document with timestamps', async () => {
        const { addDoc, Timestamp } = await import('firebase/firestore');
        const mockId = 'new-doc-id';
        vi.mocked(addDoc).mockResolvedValue({ id: mockId } as any);

        const data = { title: 'Test', description: 'Test description' };
        const id = await service.create(data);

        expect(id).toBe(mockId);
        expect(addDoc).toHaveBeenCalled();
        expect(Timestamp.now).toHaveBeenCalled();
      });
    });

    describe('getById', () => {
      it('should return document when it exists', async () => {
        const { getDoc } = await import('firebase/firestore');
        const mockData = { title: 'Test', description: 'Test description' };
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          id: 'test-id',
          data: () => mockData,
        } as any);

        const result = await service.getById('test-id');

        expect(result).toEqual({ id: 'test-id', ...mockData });
      });

      it('should return null when document does not exist', async () => {
        const { getDoc } = await import('firebase/firestore');
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => false,
        } as any);

        const result = await service.getById('non-existent-id');

        expect(result).toBeNull();
      });
    });

    describe('update', () => {
      it('should update document with new timestamp', async () => {
        const { updateDoc, Timestamp } = await import('firebase/firestore');
        vi.mocked(updateDoc).mockResolvedValue(undefined);

        const data = { title: 'Updated Title' };
        await service.update('test-id', data);

        expect(updateDoc).toHaveBeenCalled();
        expect(Timestamp.now).toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('should delete document', async () => {
        const { deleteDoc } = await import('firebase/firestore');
        vi.mocked(deleteDoc).mockResolvedValue(undefined);

        await service.delete('test-id');

        expect(deleteDoc).toHaveBeenCalled();
      });
    });

    describe('exists', () => {
      it('should return true when document exists', async () => {
        const { getDoc } = await import('firebase/firestore');
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
        } as any);

        const result = await service.exists('test-id');

        expect(result).toBe(true);
      });

      it('should return false when document does not exist', async () => {
        const { getDoc } = await import('firebase/firestore');
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => false,
        } as any);

        const result = await service.exists('test-id');

        expect(result).toBe(false);
      });
    });
  });

  describe('Query Building', () => {
    describe('getAll', () => {
      it('should get all documents without filters', async () => {
        const { getDocs } = await import('firebase/firestore');
        const mockDocs = [
          { id: '1', data: () => ({ title: 'Doc 1' }) },
          { id: '2', data: () => ({ title: 'Doc 2' }) },
        ];
        vi.mocked(getDocs).mockResolvedValue({
          docs: mockDocs,
          size: 2,
        } as any);

        const results = await service.getAll();

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({ id: '1', title: 'Doc 1' });
        expect(results[1]).toEqual({ id: '2', title: 'Doc 2' });
      });

      it('should apply filters when provided', async () => {
        const { getDocs, query, where } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValue({
          docs: [],
          size: 0,
        } as any);

        await service.getAll({
          filters: [{ field: 'status', operator: '==', value: 'active' }],
        });

        expect(query).toHaveBeenCalled();
        expect(where).toHaveBeenCalledWith('status', '==', 'active');
      });

      it('should apply sorting when provided', async () => {
        const { getDocs, query, orderBy } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValue({
          docs: [],
          size: 0,
        } as any);

        await service.getAll({
          sorts: [{ field: 'dateCreated', direction: 'desc' }],
        });

        expect(query).toHaveBeenCalled();
        expect(orderBy).toHaveBeenCalledWith('dateCreated', 'desc');
      });

      it('should apply limit when provided', async () => {
        const { getDocs, query, limit: limitFn } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValue({
          docs: [],
          size: 0,
        } as any);

        await service.getAll({
          limit: 10,
        });

        expect(query).toHaveBeenCalled();
        expect(limitFn).toHaveBeenCalledWith(10);
      });
    });

    describe('count', () => {
      it('should count documents', async () => {
        const { getDocs } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValue({
          size: 42,
        } as any);

        const count = await service.count();

        expect(count).toBe(42);
      });
    });

    describe('getPaginated', () => {
      it('should return paginated results', async () => {
        const { getDocs } = await import('firebase/firestore');
        const mockDocs = [
          { id: '1', data: () => ({ title: 'Doc 1' }) },
          { id: '2', data: () => ({ title: 'Doc 2' }) },
        ];
        
        // First call for count, second call for paginated data
        vi.mocked(getDocs)
          .mockResolvedValueOnce({ size: 10, docs: [] } as any)
          .mockResolvedValueOnce({ docs: mockDocs, size: 2 } as any);

        const result = await service.getPaginated({
          page: 1,
          pageSize: 2,
          sortBy: 'dateCreated',
          sortDirection: 'desc',
        });

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(10);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(2);
        expect(result.totalPages).toBe(5);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPreviousPage).toBe(false);
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      // Create service with retries enabled
      const retryService = new DatabaseService('test_collection', {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2,
      });

      const { getDoc } = await import('firebase/firestore');
      
      // Fail twice, then succeed
      vi.mocked(getDoc)
        .mockRejectedValueOnce({ code: 'unavailable', message: 'Network error' })
        .mockRejectedValueOnce({ code: 'unavailable', message: 'Network error' })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'test-id',
          data: () => ({ title: 'Test' }),
        } as any);

      const result = await retryService.getById('test-id');

      expect(result).toEqual({ id: 'test-id', title: 'Test' });
      expect(getDoc).toHaveBeenCalledTimes(3);
    });

    it('should not retry on permission denied errors', async () => {
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockRejectedValue({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      await expect(service.getById('test-id')).rejects.toThrow(DatabaseError);
      
      // Should only be called once (no retries)
      expect(getDoc).toHaveBeenCalledTimes(1);
    });
  });
});
