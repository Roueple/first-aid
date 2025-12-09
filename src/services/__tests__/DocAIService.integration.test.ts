import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase before any imports
vi.mock('../../config/firebase', () => ({
  db: {},
  auth: {},
}));

// Mock DatabaseService
vi.mock('../DatabaseService', () => ({
  default: class MockDatabaseService {
    constructor() {}
    getAll = vi.fn().mockResolvedValue([]);
    create = vi.fn().mockResolvedValue('mock-id');
    update = vi.fn().mockResolvedValue(undefined);
    delete = vi.fn().mockResolvedValue(undefined);
    getById = vi.fn().mockResolvedValue(null);
    count = vi.fn().mockResolvedValue(0);
  },
}));

// Mock dependencies
vi.mock('../GeminiService', () => ({
  sendMessageToGemini: vi.fn().mockResolvedValue('LLM response'),
  generateSessionTitle: vi.fn().mockResolvedValue('Generated Title'),
}));

vi.mock('../DocSessionService');
vi.mock('../DocChatService');

// Create hoisted mock for AuditResultService
const { mockGetAll, MockAuditResultService } = vi.hoisted(() => {
  const mockGetAll = vi.fn().mockResolvedValue([]);
  
  class MockAuditResultService {
    getAll = mockGetAll;
  }
  
  return {
    mockGetAll,
    MockAuditResultService,
  };
});

// Mock AuditResultService class
vi.mock('../AuditResultService', () => ({
  AuditResultService: MockAuditResultService,
}));

import { sendDocQuery, initializeDocAI, resetDocAI } from '../DocAIService';
import { AuditResult } from '../AuditResultService';
import { QueryFilter } from '../DatabaseService';
import docChatService from '../DocChatService';
import docSessionService from '../DocSessionService';

describe('DocAIService Integration Tests', () => {
  let mockDocSessionService: typeof docSessionService;
  let mockDocChatService: typeof docChatService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockGetAll.mockClear();
    mockGetAll.mockResolvedValue([]);

    // Mock DocSessionService
    mockDocSessionService = docSessionService as any;
    (mockDocSessionService.getOrCreateSession as any) = vi.fn().mockResolvedValue('test-session-id');
    (mockDocSessionService.incrementMessageCount as any) = vi.fn().mockResolvedValue(undefined);
    (mockDocSessionService.updateTitle as any) = vi.fn().mockResolvedValue(undefined);

    // Mock DocChatService
    mockDocChatService = docChatService as any;
    (mockDocChatService.getFormattedHistory as any) = vi.fn().mockResolvedValue([]);
    (mockDocChatService.addUserMessage as any) = vi.fn().mockResolvedValue('user-msg-id');
    (mockDocChatService.addAssistantResponse as any) = vi.fn().mockResolvedValue('assistant-msg-id');

    // Reset and initialize DocAI
    resetDocAI();
    initializeDocAI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // **Feature: docai-simple-query, Property 16: Finding Type Filter Preservation**
  describe('Property 16: Finding Type Filter Preservation', () => {
    it('should preserve finding type filters when combined with other filters', async () => {
      // Mock audit results with both findings (code != '') and non-findings (code == '')
      const mockResults: AuditResult[] = [
        {
          id: '1',
          auditResultId: 'AR001',
          projectId: 'P001',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001', // Finding (has code)
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          id: '2',
          auditResultId: 'AR002',
          projectId: 'P001',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 12,
          bobot: 3,
          kadar: 4,
          code: '', // Non-finding (no code)
          descriptions: 'Test non-finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      mockGetAll.mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            findingType: fc.constantFrom('only findings', 'actual findings'),
            otherFilter: fc.constantFrom(
              { type: 'year', value: 2023, text: 'from 2023' },
              { type: 'department', value: 'IT', text: 'IT' },
              { type: 'risk', value: 'critical', text: 'critical' }
            )
          }),
          async ({ findingType, otherFilter }) => {
            // Construct composite query
            const query = `${findingType} ${otherFilter.text}`;

            // Reset mock
            mockGetAll.mockClear();

            await sendDocQuery(query, 'test-user', 'low');

            // Property: getAll should be called with QueryOptions
            expect(mockGetAll).toHaveBeenCalled();

            const callArgs = mockGetAll.mock.calls[0];
            const queryOptions = callArgs[0];
            const filters = queryOptions.filters;

            // Property: Should have finding type filter (code != '')
            const codeFilter = filters.find((f: QueryFilter) => f.field === 'code');
            expect(codeFilter).toBeDefined();
            expect(codeFilter.operator).toBe('!=');
            expect(codeFilter.value).toBe('');

            // Property: Should also have the other filter
            if (otherFilter.type === 'year') {
              const yearFilter = filters.find((f: QueryFilter) => f.field === 'year');
              expect(yearFilter).toBeDefined();
              expect(yearFilter.value).toBe(otherFilter.value);
            } else if (otherFilter.type === 'department') {
              const deptFilter = filters.find((f: QueryFilter) => f.field === 'department');
              expect(deptFilter).toBeDefined();
              // Department values are normalized to uppercase
              expect(deptFilter.value.toUpperCase()).toBe(otherFilter.value.toUpperCase());
            } else if (otherFilter.type === 'risk') {
              const nilaiFilter = filters.find((f: QueryFilter) => f.field === 'nilai');
              expect(nilaiFilter).toBeDefined();
              expect(nilaiFilter.operator).toBe('>=');
            }

            // Property: Both filters should be preserved
            expect(filters.length).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle non-findings filter combined with other filters', async () => {
      const mockResults: AuditResult[] = [
        {
          id: '2',
          auditResultId: 'AR002',
          projectId: 'P001',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 12,
          bobot: 3,
          kadar: 4,
          code: '', // Non-finding
          descriptions: 'Test non-finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      mockGetAll.mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2020, max: 2025 }),
          async (year) => {
            const query = `non-findings from ${year}`;

            // Reset mock
            mockGetAll.mockClear();

            await sendDocQuery(query, 'test-user', 'low');

            // Property: getAll should be called with QueryOptions
            expect(mockGetAll).toHaveBeenCalled();

            const callArgs = mockGetAll.mock.calls[0];
            const queryOptions = callArgs[0];
            const filters = queryOptions.filters;

            // Property: Should have non-finding filter (code == '')
            const codeFilter = filters.find((f: QueryFilter) => f.field === 'code');
            expect(codeFilter).toBeDefined();
            expect(codeFilter.operator).toBe('==');
            expect(codeFilter.value).toBe('');

            // Property: Should also have year filter
            const yearFilter = filters.find((f: QueryFilter) => f.field === 'year');
            expect(yearFilter).toBeDefined();
            expect(yearFilter.value).toBe(year);

            // Property: Both filters should be preserved
            expect(filters.length).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain finding type filter in complex composite queries', async () => {
      const mockResults: AuditResult[] = [
        {
          id: '1',
          auditResultId: 'AR001',
          projectId: 'P001',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      mockGetAll.mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            department: fc.constantFrom('IT', 'Finance', 'HR', 'Sales'),
            year: fc.integer({ min: 2020, max: 2025 }),
            findingKeyword: fc.constantFrom('only findings', 'actual findings')
          }),
          async ({ department, year, findingKeyword }) => {
            const query = `${findingKeyword} ${department} from ${year}`;

            // Reset mock
            mockGetAll.mockClear();

            await sendDocQuery(query, 'test-user', 'low');

            // Property: getAll should be called with QueryOptions
            expect(mockGetAll).toHaveBeenCalled();

            const callArgs = mockGetAll.mock.calls[0];
            const queryOptions = callArgs[0];
            const filters = queryOptions.filters;

            // Property: Should have all three filters
            const codeFilter = filters.find((f: QueryFilter) => f.field === 'code');
            const deptFilter = filters.find((f: QueryFilter) => f.field === 'department');
            const yearFilter = filters.find((f: QueryFilter) => f.field === 'year');

            expect(codeFilter).toBeDefined();
            expect(codeFilter.operator).toBe('!=');
            expect(codeFilter.value).toBe('');

            expect(deptFilter).toBeDefined();
            // Department values are normalized to uppercase
            expect(deptFilter.value.toUpperCase()).toBe(department.toUpperCase());

            expect(yearFilter).toBeDefined();
            expect(yearFilter.value).toBe(year);

            // Property: All filters should be preserved
            expect(filters.length).toBeGreaterThanOrEqual(3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: docai-simple-query, Property 5: Fallback Behavior**
  describe('Property 5: Fallback Behavior', () => {
    it('should fall back to LLM processing for non-matching queries', async () => {
      const { sendMessageToGemini } = await import('../GeminiService');

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }).filter(s => {
            // Generate strings that won't match simple query patterns
            const nonMatchingPatterns = [
              /\d{4}/, // No years
              /IT|HR|Finance|Sales|Legal|Marketing|Procurement/i, // No departments
              /critical|high|medium|low/i, // No risk levels
              /findings?|audit/i, // No finding keywords
            ];
            return !nonMatchingPatterns.some(pattern => pattern.test(s));
          }),
          async (query) => {
            // Reset mock
            (sendMessageToGemini as any).mockClear();
            (sendMessageToGemini as any).mockResolvedValue('LLM response for: ' + query);

            const result = await sendDocQuery(query, 'test-user', 'low');

            // Property: Non-matching queries should call LLM
            expect(sendMessageToGemini).toHaveBeenCalled();

            // Property: Result should be from LLM
            expect(result).toContain('LLM response');

            // Property: Assistant response should have LLM metadata
            const addAssistantCalls = (mockDocChatService.addAssistantResponse as any).mock.calls;
            expect(addAssistantCalls.length).toBeGreaterThan(0);

            const lastCall = addAssistantCalls[addAssistantCalls.length - 1];
            const options = lastCall[3]; // Fourth parameter is options

            // Property: Should have thinkingMode (not 'none')
            expect(options.thinkingMode).toBeDefined();
            expect(options.thinkingMode).not.toBe('none');

            // Property: Should have modelVersion
            expect(options.modelVersion).toBeDefined();
            expect(typeof options.modelVersion).toBe('string');

            // Property: queryType should be 'general' (not 'simple_query')
            expect(options.queryType).toBe('general');

            // Property: Should not have simple query metadata
            expect(options.metadata).toBeUndefined();
          }
        ),
        { numRuns: 50 } // Fewer runs since we're filtering strings
      );
    });

    it('should use simple query path for matching queries and skip LLM', async () => {
      const { sendMessageToGemini } = await import('../GeminiService');

      // Mock audit results
      const mockResults: AuditResult[] = [
        {
          id: '1',
          auditResultId: 'AR001',
          projectId: 'P001',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      mockGetAll.mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'findings from 2023',
            'IT findings',
            'critical findings',
            'top 10 findings',
            'Finance findings from 2022'
          ),
          async (query) => {
            // Reset mock
            (sendMessageToGemini as any).mockClear();

            const result = await sendDocQuery(query, 'test-user', 'low');

            // Property: Matching queries should NOT call LLM
            expect(sendMessageToGemini).not.toHaveBeenCalled();

            // Property: Result should be from simple query (contains "Query Results" or similar)
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');

            // Property: Assistant response should have simple query metadata
            const addAssistantCalls = (mockDocChatService.addAssistantResponse as any).mock.calls;
            expect(addAssistantCalls.length).toBeGreaterThan(0);

            const lastCall = addAssistantCalls[addAssistantCalls.length - 1];
            const options = lastCall[3]; // Fourth parameter is options

            // Property: Should have thinkingMode 'none'
            expect(options.thinkingMode).toBe('none');

            // Property: queryType should be 'simple_query'
            expect(options.queryType).toBe('simple_query');

            // Property: Should have simple query metadata
            expect(options.metadata).toBeDefined();
            expect(options.metadata.queryType).toBe('simple_query');
            expect(options.metadata.patternMatched).toBeDefined();
            expect(options.metadata.executionTimeMs).toBeDefined();
            expect(options.metadata.resultsCount).toBeDefined();

            // Property: Should NOT have modelVersion (no LLM used)
            expect(options.modelVersion).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error result when simple query execution fails', async () => {
      const { sendMessageToGemini } = await import('../GeminiService');

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2000, max: 2099 }),
          async (year) => {
            // Mock SimpleQueryService to match but fail execution
            const query = `findings from ${year}`;

            // Mock getAll to throw error (simulating query failure)
            mockGetAll.mockRejectedValue(new Error('Database error'));

            // Reset mock
            (sendMessageToGemini as any).mockClear();

            const result = await sendDocQuery(query, 'test-user', 'low');

            // Property: Should NOT fall back to LLM when simple query matches but fails
            // The simple query service handles errors gracefully
            expect(sendMessageToGemini).not.toHaveBeenCalled();

            // Property: Result should contain error message
            expect(result).toContain('Query Error');

            // Property: Assistant response should have simple query metadata
            const addAssistantCalls = (mockDocChatService.addAssistantResponse as any).mock.calls;
            expect(addAssistantCalls.length).toBeGreaterThan(0);

            const lastCall = addAssistantCalls[addAssistantCalls.length - 1];
            const options = lastCall[3];

            // Property: Should have thinkingMode 'none' (simple query path)
            expect(options.thinkingMode).toBe('none');

            // Property: queryType should be 'simple_query'
            expect(options.queryType).toBe('simple_query');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve conversation history when falling back to LLM', async () => {
      const { sendMessageToGemini } = await import('../GeminiService');

      // Mock conversation history
      const mockHistory = [
        { role: 'user' as const, content: 'Previous question' },
        { role: 'assistant' as const, content: 'Previous answer' },
      ];

      (mockDocChatService.getFormattedHistory as any).mockResolvedValue(mockHistory);

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => {
            // Non-matching query
            return !/\d{4}|IT|HR|Finance|critical|findings/i.test(s);
          }),
          async (query) => {
            // Reset mock
            (sendMessageToGemini as any).mockClear();

            await sendDocQuery(query, 'test-user', 'low');

            // Property: LLM should be called with conversation history
            expect(sendMessageToGemini).toHaveBeenCalled();

            const callArgs = (sendMessageToGemini as any).mock.calls[0];
            const conversationHistory = callArgs[3]; // Fourth parameter

            // Property: History should be passed to LLM
            expect(conversationHistory).toBeDefined();
            expect(Array.isArray(conversationHistory)).toBe(true);
            expect(conversationHistory).toEqual(mockHistory);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain consistent session management for both simple and LLM queries', async () => {
      const { sendMessageToGemini } = await import('../GeminiService');

      // Mock audit results for simple queries
      const mockResults: AuditResult[] = [
        {
          id: '1',
          auditResultId: 'AR001',
          projectId: 'P001',
          projectName: 'Test Project',
          year: 2023,
          department: 'IT',
          riskArea: 'Security',
          nilai: 15,
          bobot: 3,
          kadar: 5,
          code: 'T001',
          descriptions: 'Test finding',
          sh: 'SH01',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      mockGetAll.mockResolvedValue(mockResults);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { query: 'findings from 2023', isSimple: true },
            { query: 'what is the meaning of life?', isSimple: false }
          ),
          async (testCase) => {
            // Reset mocks
            (mockDocSessionService.getOrCreateSession as any).mockClear();
            (mockDocSessionService.incrementMessageCount as any).mockClear();
            (mockDocChatService.addUserMessage as any).mockClear();
            (mockDocChatService.addAssistantResponse as any).mockClear();

            await sendDocQuery(testCase.query, 'test-user', 'low');

            // Property: Session should be created/retrieved for both query types
            expect(mockDocSessionService.getOrCreateSession).toHaveBeenCalledWith('test-user');

            // Property: User message should be added for both query types
            expect(mockDocChatService.addUserMessage).toHaveBeenCalledWith(
              'test-session-id',
              'test-user',
              testCase.query
            );

            // Property: Assistant response should be added for both query types
            expect(mockDocChatService.addAssistantResponse).toHaveBeenCalled();

            // Property: Message count should be incremented for both query types
            expect(mockDocSessionService.incrementMessageCount).toHaveBeenCalledWith('test-session-id');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
