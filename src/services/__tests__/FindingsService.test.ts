import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FindingsService } from '../FindingsService';
import { Timestamp } from 'firebase/firestore';
import { connectionMonitor } from '../../utils/connectionMonitor';
import { Finding, CreateFindingInput, UpdateFindingInput } from '../../types/finding.types';
import { Pagination } from '../../types/filter.types';

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
      now: vi.fn(() => ({ 
        seconds: Date.now() / 1000, 
        nanoseconds: 0,
        toDate: () => new Date(),
      })),
      fromDate: vi.fn((date: Date) => ({
        seconds: date.getTime() / 1000,
        nanoseconds: 0,
        toDate: () => date,
      })),
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

describe('FindingsService', () => {
  let service: FindingsService;

  // Helper to create mock timestamp
  const createMockTimestamp = (date: Date): Timestamp => ({
    seconds: date.getTime() / 1000,
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime(),
    isEqual: (other: Timestamp) => other.seconds === date.getTime() / 1000,
    valueOf: () => '',
  } as Timestamp);

  // Helper to create mock finding
  const createMockFinding = (overrides: Partial<Finding> = {}): Finding & { id: string } => {
    const now = new Date();
    return {
      id: 'test-finding-1',
      title: 'Test Finding',
      description: 'Test description',
      severity: 'High',
      status: 'Open',
      category: 'Security',
      location: 'Building A',
      responsiblePerson: 'John Doe',
      dateIdentified: createMockTimestamp(now),
      dateCreated: createMockTimestamp(now),
      dateUpdated: createMockTimestamp(now),
      recommendation: 'Fix this issue',
      tags: [],
      riskLevel: 7,
      originalSource: 'Manual Entry',
      importBatch: 'batch-1',
      ...overrides,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectionMonitor.getStatus).mockReturnValue('connected');
    service = new FindingsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFindings', () => {
    it('should get findings with default pagination', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockFindings = [
        createMockFinding({ id: '1', title: 'Finding 1' }),
        createMockFinding({ id: '2', title: 'Finding 2' }),
      ];

      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 2, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: mockFindings.map((f) => ({
            id: f.id,
            data: () => f,
          })),
          size: 2,
        } as any);

      const result = await service.getFindings();

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter findings by severity', async () => {
      const { getDocs, where } = await import('firebase/firestore');
      
      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 1, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: [
            {
              id: '1',
              data: () => createMockFinding({ severity: 'Critical' }),
            },
          ],
          size: 1,
        } as any);

      await service.getFindings({ severity: ['Critical', 'High'] });

      expect(where).toHaveBeenCalledWith('severity', 'in', ['Critical', 'High']);
    });

    it('should filter findings by status', async () => {
      const { getDocs, where } = await import('firebase/firestore');
      
      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 1, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: [
            {
              id: '1',
              data: () => createMockFinding({ status: 'Open' }),
            },
          ],
          size: 1,
        } as any);

      await service.getFindings({ status: ['Open'] });

      expect(where).toHaveBeenCalledWith('status', 'in', ['Open']);
    });

    it('should filter findings by location', async () => {
      const { getDocs, where } = await import('firebase/firestore');
      
      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 1, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: [
            {
              id: '1',
              data: () => createMockFinding({ location: 'Building A' }),
            },
          ],
          size: 1,
        } as any);

      await service.getFindings({ location: ['Building A'] });

      expect(where).toHaveBeenCalledWith('location', 'in', ['Building A']);
    });

    it('should perform client-side text search', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockFindings = [
        createMockFinding({ id: '1', title: 'Security Issue', description: 'Test' }),
        createMockFinding({ id: '2', title: 'Performance Issue', description: 'Test' }),
        createMockFinding({ id: '3', title: 'Other', description: 'Security problem' }),
      ];

      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 3, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: mockFindings.map((f) => ({
            id: f.id,
            data: () => f,
          })),
          size: 3,
        } as any);

      const result = await service.getFindings({ searchText: 'security' });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toContain('Security');
      expect(result.items[1].description).toContain('Security');
    });

    it('should search in responsible person field', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockFindings = [
        createMockFinding({ id: '1', responsiblePerson: 'John Doe' }),
        createMockFinding({ id: '2', responsiblePerson: 'Jane Smith' }),
      ];

      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 2, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: mockFindings.map((f) => ({
            id: f.id,
            data: () => f,
          })),
          size: 2,
        } as any);

      const result = await service.getFindings({ searchText: 'john' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].responsiblePerson).toBe('John Doe');
    });
  });

  describe('getOverdueFindings', () => {
    it('should return only overdue findings', async () => {
      const { getDocs } = await import('firebase/firestore');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockFindings = [
        createMockFinding({ 
          id: '1', 
          status: 'Open',
          dateDue: createMockTimestamp(yesterday),
        }),
        createMockFinding({ 
          id: '2', 
          status: 'Open',
          dateDue: createMockTimestamp(tomorrow),
        }),
        createMockFinding({ 
          id: '3', 
          status: 'In Progress',
          dateDue: createMockTimestamp(yesterday),
        }),
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockFindings.map((f) => ({
          id: f.id,
          data: () => f,
        })),
        size: 3,
      } as any);

      const result = await service.getOverdueFindings();

      expect(result.items).toHaveLength(2);
      expect(result.items.every((f) => f.isOverdue)).toBe(true);
    });

    it('should not include closed findings as overdue', async () => {
      const { getDocs } = await import('firebase/firestore');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockFindings = [
        createMockFinding({ 
          id: '1', 
          status: 'Closed',
          dateDue: createMockTimestamp(yesterday),
        }),
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockFindings.map((f) => ({
          id: f.id,
          data: () => f,
        })),
        size: 1,
      } as any);

      const result = await service.getOverdueFindings();

      expect(result.items).toHaveLength(0);
    });

    it('should paginate overdue findings', async () => {
      const { getDocs } = await import('firebase/firestore');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockFindings = Array.from({ length: 5 }, (_, i) =>
        createMockFinding({ 
          id: `${i + 1}`, 
          status: 'Open',
          dateDue: createMockTimestamp(yesterday),
        })
      );

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockFindings.map((f) => ({
          id: f.id,
          data: () => f,
        })),
        size: 5,
      } as any);

      const pagination: Pagination = { page: 1, pageSize: 2 };
      const result = await service.getOverdueFindings(pagination);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
    });
  });

  describe('getHighRiskFindings', () => {
    it('should return only Critical and High severity findings', async () => {
      const { getDocs, where } = await import('firebase/firestore');
      const mockFindings = [
        createMockFinding({ id: '1', severity: 'Critical' }),
        createMockFinding({ id: '2', severity: 'High' }),
      ];

      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 2, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: mockFindings.map((f) => ({
            id: f.id,
            data: () => f,
          })),
          size: 2,
        } as any);

      const result = await service.getHighRiskFindings();

      expect(where).toHaveBeenCalledWith('severity', 'in', ['Critical', 'High']);
      expect(result.items).toHaveLength(2);
    });
  });

  describe('searchFindings', () => {
    it('should search findings with text', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockFindings = [
        createMockFinding({ id: '1', title: 'Security vulnerability' }),
        createMockFinding({ id: '2', title: 'Performance issue' }),
      ];

      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 2, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: mockFindings.map((f) => ({
            id: f.id,
            data: () => f,
          })),
          size: 2,
        } as any);

      const result = await service.searchFindings('security');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toContain('Security');
    });

    it('should combine search with filters', async () => {
      const { getDocs, where } = await import('firebase/firestore');
      const mockFindings = [
        createMockFinding({ 
          id: '1', 
          title: 'Security issue',
          severity: 'High',
        }),
      ];

      vi.mocked(getDocs)
        .mockResolvedValueOnce({ size: 1, docs: [] } as any)
        .mockResolvedValueOnce({
          docs: mockFindings.map((f) => ({
            id: f.id,
            data: () => f,
          })),
          size: 1,
        } as any);

      const result = await service.searchFindings('security', { severity: ['High'] });

      expect(where).toHaveBeenCalledWith('severity', 'in', ['High']);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('createFinding', () => {
    it('should create a finding with valid input', async () => {
      const { addDoc, Timestamp } = await import('firebase/firestore');
      const mockId = 'new-finding-id';
      vi.mocked(addDoc).mockResolvedValue({ id: mockId } as any);

      const input: CreateFindingInput = {
        title: 'New Finding',
        description: 'Description',
        severity: 'High',
        status: 'Open',
        category: 'Security',
        location: 'Building A',
        responsiblePerson: 'John Doe',
        dateIdentified: new Date(),
        recommendation: 'Fix it',
        riskLevel: 7,
        originalSource: 'Manual',
      };

      const id = await service.createFinding(input);

      expect(id).toBe(mockId);
      expect(addDoc).toHaveBeenCalled();
      expect(Timestamp.fromDate).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidInput = {
        title: '',
        description: 'Description',
      } as CreateFindingInput;

      await expect(service.createFinding(invalidInput)).rejects.toThrow();
    });
  });

  describe('updateFinding', () => {
    it('should update a finding with valid input', async () => {
      const { updateDoc, Timestamp } = await import('firebase/firestore');
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const input: UpdateFindingInput = {
        title: 'Updated Title',
        status: 'In Progress',
      };

      await service.updateFinding('test-id', input);

      expect(updateDoc).toHaveBeenCalled();
      expect(Timestamp.now).toHaveBeenCalled();
    });

    it('should convert dates to timestamps', async () => {
      const { updateDoc, Timestamp } = await import('firebase/firestore');
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const input: UpdateFindingInput = {
        dateCompleted: new Date(),
      };

      await service.updateFinding('test-id', input);

      expect(Timestamp.fromDate).toHaveBeenCalled();
    });
  });

  describe('getFindingById', () => {
    it('should return finding with computed fields', async () => {
      const { getDoc } = await import('firebase/firestore');
      const mockFinding = createMockFinding();

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        id: mockFinding.id,
        data: () => mockFinding,
      } as any);

      const result = await service.getFindingById(mockFinding.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockFinding.id);
      expect(result).toHaveProperty('isOverdue');
      expect(result).toHaveProperty('daysOpen');
    });

    it('should return null for non-existent finding', async () => {
      const { getDoc } = await import('firebase/firestore');

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await service.getFindingById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteFinding', () => {
    it('should delete a finding', async () => {
      const { deleteDoc } = await import('firebase/firestore');
      vi.mocked(deleteDoc).mockResolvedValue(undefined);

      await service.deleteFinding('test-id');

      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('Computed Fields', () => {
    it('should calculate isOverdue correctly', async () => {
      const { getDoc } = await import('firebase/firestore');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockFinding = createMockFinding({
        status: 'Open',
        dateDue: createMockTimestamp(yesterday),
      });

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        id: mockFinding.id,
        data: () => mockFinding,
      } as any);

      const result = await service.getFindingById(mockFinding.id);

      expect(result?.isOverdue).toBe(true);
    });

    it('should not mark closed findings as overdue', async () => {
      const { getDoc } = await import('firebase/firestore');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockFinding = createMockFinding({
        status: 'Closed',
        dateDue: createMockTimestamp(yesterday),
      });

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        id: mockFinding.id,
        data: () => mockFinding,
      } as any);

      const result = await service.getFindingById(mockFinding.id);

      expect(result?.isOverdue).toBe(false);
    });

    it('should calculate daysOpen correctly', async () => {
      const { getDoc } = await import('firebase/firestore');
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const mockFinding = createMockFinding({
        dateIdentified: createMockTimestamp(tenDaysAgo),
      });

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        id: mockFinding.id,
        data: () => mockFinding,
      } as any);

      const result = await service.getFindingById(mockFinding.id);

      expect(result?.daysOpen).toBeGreaterThanOrEqual(9);
      expect(result?.daysOpen).toBeLessThanOrEqual(11);
    });
  });
});
