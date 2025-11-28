/**
 * QueryRouterService Tests
 * 
 * Basic integration tests for the QueryRouterService
 * Tests the main routing logic and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryRouterService } from '../QueryRouterService';
import { QueryType } from '../../types/queryRouter.types';

// Mock the dependencies
vi.mock('../FindingsService', () => ({
  default: {
    getFindings: vi.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    })),
  },
}));

vi.mock('../GeminiService', () => ({
  sendMessageToGemini: vi.fn(async () => 'AI response'),
  isGeminiConfigured: vi.fn(() => true),
}));

describe('QueryRouterService', () => {
  let service: QueryRouterService;

  beforeEach(() => {
    service = new QueryRouterService();
    vi.clearAllMocks();
  });

  describe('classifyQuery', () => {
    it('should classify a simple query correctly', async () => {
      const query = 'Show me all findings from 2024';
      const intent = await service.classifyQuery(query);
      
      expect(intent).toBeDefined();
      expect(intent.type).toBe('simple');
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.confidence).toBeLessThanOrEqual(1);
    });

    it('should classify a complex query correctly', async () => {
      const query = 'What patterns do you see in the findings?';
      const intent = await service.classifyQuery(query);
      
      expect(intent).toBeDefined();
      expect(intent.type).toBe('complex');
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.confidence).toBeLessThanOrEqual(1);
    });

    it('should extract filters from query', async () => {
      const query = 'Show me critical findings from hotels in 2024';
      const intent = await service.classifyQuery(query);
      
      expect(intent.extractedFilters).toBeDefined();
      expect(intent.extractedFilters.year).toBe(2024);
      expect(intent.extractedFilters.projectType).toBe('Hotel');
      expect(intent.extractedFilters.severity).toContain('Critical');
    });
  });

  describe('routeQuery', () => {
    it('should route simple query to database', async () => {
      const query = 'Show me all findings from 2024';
      const response = await service.routeQuery(query);
      
      expect(response).toBeDefined();
      expect('type' in response && response.type).toBe('simple');
      expect('metadata' in response && response.metadata).toBeDefined();
    });

    it('should handle zero results gracefully', async () => {
      const query = 'Show me findings from year 9999';
      const response = await service.routeQuery(query);
      
      expect(response).toBeDefined();
      expect('answer' in response && response.answer).toContain('No findings match');
    });

    it('should include metadata in response', async () => {
      const query = 'Show me all findings';
      const response = await service.routeQuery(query);
      
      expect('metadata' in response && response.metadata).toBeDefined();
      if ('metadata' in response) {
        expect(response.metadata.queryType).toBeDefined();
        expect(response.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(response.metadata.findingsAnalyzed).toBeGreaterThanOrEqual(0);
        expect(response.metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(response.metadata.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('executeAs', () => {
    it('should execute with forced query type', async () => {
      const query = 'Show me findings';
      const response = await service.executeAs(query, 'simple');
      
      expect(response).toBeDefined();
      expect('type' in response && response.type).toBe('simple');
    });

    it('should override classification when forced', async () => {
      const query = 'What patterns do you see?'; // Would normally be complex
      const response = await service.executeAs(query, 'simple');
      
      expect(response).toBeDefined();
      expect('type' in response && response.type).toBe('simple');
    });
  });

  describe('error handling', () => {
    it('should handle classification errors gracefully', async () => {
      // Create a service with a broken classifier
      const brokenService = new QueryRouterService();
      vi.spyOn(brokenService as any, 'classifyQuery').mockRejectedValue(
        new Error('Classification failed')
      );
      
      const response = await brokenService.routeQuery('test query');
      
      expect(response).toBeDefined();
      expect('success' in response && response.success).toBe(false);
      if ('error' in response) {
        expect(response.error.code).toBe('CLASSIFICATION_ERROR');
      }
    });

    it('should include error metadata', async () => {
      const brokenService = new QueryRouterService();
      vi.spyOn(brokenService as any, 'classifyQuery').mockRejectedValue(
        new Error('Test error')
      );
      
      const response = await brokenService.routeQuery('test query');
      
      expect('metadata' in response && response.metadata).toBeDefined();
      if ('metadata' in response) {
        expect(response.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

