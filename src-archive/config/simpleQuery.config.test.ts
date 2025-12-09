/**
 * Tests for Simple Query Configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getConfig,
  updateConfig,
  resetConfig,
  setEnabled,
  isEnabled,
  validateConfig,
  recordMatch,
  recordFallback,
  getMetrics,
  resetMetrics,
  getMatchRate,
  getCacheHitRate,
  defaultConfig,
  SimpleQueryConfig,
} from '../simpleQuery.config';

describe('SimpleQueryConfig', () => {
  beforeEach(() => {
    // Reset to defaults before each test
    resetConfig();
    resetMetrics();
  });

  describe('Configuration Management', () => {
    it('should return default configuration', () => {
      const config = getConfig();
      expect(config.enabled).toBe(true);
      expect(config.maxExecutionTime).toBe(500);
      expect(config.maxResults).toBe(50);
      expect(config.cacheEnabled).toBe(true);
      expect(config.cacheTTL).toBe(300000);
      expect(config.fallbackToLLM).toBe(true);
    });

    it('should update configuration', () => {
      updateConfig({ maxExecutionTime: 1000 });
      const config = getConfig();
      expect(config.maxExecutionTime).toBe(1000);
    });

    it('should reset configuration to defaults', () => {
      updateConfig({ maxExecutionTime: 1000 });
      resetConfig();
      const config = getConfig();
      expect(config.maxExecutionTime).toBe(500);
    });

    it('should enable/disable feature', () => {
      setEnabled(false);
      expect(isEnabled()).toBe(false);
      
      setEnabled(true);
      expect(isEnabled()).toBe(true);
    });

    it('should throw error for invalid configuration', () => {
      expect(() => {
        updateConfig({ maxExecutionTime: -1 });
      }).toThrow('Invalid configuration');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const result = validateConfig(defaultConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative maxExecutionTime', () => {
      const config = { ...defaultConfig, maxExecutionTime: -1 };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxExecutionTime must be greater than 0');
    });

    it('should reject zero maxResults', () => {
      const config = { ...defaultConfig, maxResults: 0 };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxResults must be greater than 0');
    });

    it('should reject negative cacheTTL', () => {
      const config = { ...defaultConfig, cacheTTL: -1 };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cacheTTL must be non-negative');
    });

    it('should reject empty patterns array', () => {
      const config = { ...defaultConfig, patterns: [] };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('patterns array cannot be empty');
    });

    it('should reject invalid pattern structure', () => {
      const config = {
        ...defaultConfig,
        patterns: [
          {
            id: '',
            name: 'Test',
            priority: 10,
            regex: /test/,
            parameterExtractors: [],
            filterBuilder: () => [],
            sortBuilder: () => [],
          },
        ],
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
    });
  });

  describe('Monitoring Metrics', () => {
    it('should record match metrics', () => {
      recordMatch('test-pattern', 100, false);
      
      const metrics = getMetrics();
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.matchedQueries).toBe(1);
      expect(metrics.fallbackQueries).toBe(0);
      expect(metrics.averageExecutionTime).toBe(100);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.cacheHits).toBe(0);
    });

    it('should record cache hit', () => {
      recordMatch('test-pattern', 50, true);
      
      const metrics = getMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(0);
    });

    it('should record fallback metrics', () => {
      recordFallback('test query');
      
      const metrics = getMetrics();
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.matchedQueries).toBe(0);
      expect(metrics.fallbackQueries).toBe(1);
    });

    it('should calculate average execution time', () => {
      recordMatch('pattern1', 100, false);
      recordMatch('pattern2', 200, false);
      recordMatch('pattern3', 300, false);
      
      const metrics = getMetrics();
      expect(metrics.averageExecutionTime).toBe(200);
    });

    it('should calculate match rate', () => {
      recordMatch('pattern1', 100, false);
      recordMatch('pattern2', 100, false);
      recordFallback('query1');
      recordFallback('query2');
      
      const matchRate = getMatchRate();
      expect(matchRate).toBe(50); // 2 matches out of 4 total = 50%
    });

    it('should calculate cache hit rate', () => {
      recordMatch('pattern1', 100, true);  // cache hit
      recordMatch('pattern2', 100, false); // cache miss
      recordMatch('pattern3', 100, false); // cache miss
      
      const hitRate = getCacheHitRate();
      expect(hitRate).toBeCloseTo(33.33, 1); // 1 hit out of 3 = 33.33%
    });

    it('should reset metrics', () => {
      recordMatch('pattern1', 100, false);
      recordFallback('query1');
      
      resetMetrics();
      
      const metrics = getMetrics();
      expect(metrics.totalQueries).toBe(0);
      expect(metrics.matchedQueries).toBe(0);
      expect(metrics.fallbackQueries).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });

    it('should handle zero queries for match rate', () => {
      const matchRate = getMatchRate();
      expect(matchRate).toBe(0);
    });

    it('should handle zero cache attempts for cache hit rate', () => {
      const hitRate = getCacheHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('Monitoring Configuration', () => {
    it('should respect monitoring enabled flag', () => {
      updateConfig({
        monitoring: {
          enabled: false,
          logMatches: false,
          logExecutionTime: false,
          logFallbacks: false,
        },
      });
      
      // Should not throw even with monitoring disabled
      recordMatch('test', 100, false);
      recordFallback('test');
      
      const metrics = getMetrics();
      expect(metrics.totalQueries).toBe(0); // Metrics not recorded when disabled
    });
  });

  describe('Partial Configuration Updates', () => {
    it('should allow partial updates', () => {
      const originalConfig = getConfig();
      
      updateConfig({ maxExecutionTime: 1000 });
      
      const updatedConfig = getConfig();
      expect(updatedConfig.maxExecutionTime).toBe(1000);
      expect(updatedConfig.maxResults).toBe(originalConfig.maxResults);
      expect(updatedConfig.cacheEnabled).toBe(originalConfig.cacheEnabled);
    });

    it('should allow nested monitoring updates', () => {
      updateConfig({
        monitoring: {
          enabled: true,
          logMatches: false,
          logExecutionTime: true,
          logFallbacks: false,
        },
      });
      
      const config = getConfig();
      expect(config.monitoring.enabled).toBe(true);
      expect(config.monitoring.logMatches).toBe(false);
      expect(config.monitoring.logExecutionTime).toBe(true);
      expect(config.monitoring.logFallbacks).toBe(false);
    });
  });
});
