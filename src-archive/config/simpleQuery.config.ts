/**
 * Simple Query Configuration
 * 
 * Configuration for the Simple Query feature including:
 * - Feature flag for gradual rollout
 * - Performance settings
 * - Caching configuration
 * - Monitoring hooks
 * 
 * Requirements: 10.2
 */

import { QueryPattern } from '../services/SimpleQueryMatcher';
import { allPatterns } from '../services/queryPatterns';

/**
 * Simple Query Configuration Interface
 */
export interface SimpleQueryConfig {
  // Feature flag
  enabled: boolean;
  
  // Performance settings
  maxExecutionTime: number; // milliseconds
  maxResults: number;
  
  // Caching configuration
  cacheEnabled: boolean;
  cacheTTL: number; // milliseconds
  
  // Fallback behavior
  fallbackToLLM: boolean;
  
  // Pattern configuration
  patterns: QueryPattern[];
  
  // Monitoring hooks
  monitoring: {
    enabled: boolean;
    logMatches: boolean;
    logExecutionTime: boolean;
    logFallbacks: boolean;
  };
}

/**
 * Default configuration
 */
export const defaultConfig: SimpleQueryConfig = {
  // Feature flag - can be toggled for gradual rollout
  enabled: false, // DISABLED - Using DocAI:2 Filter Mode instead
  
  // Performance settings
  maxExecutionTime: 500, // 500ms target
  maxResults: 50,
  
  // Caching configuration
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  
  // Fallback behavior
  fallbackToLLM: true,
  
  // Pattern configuration
  patterns: allPatterns,
  
  // Monitoring hooks
  monitoring: {
    enabled: true,
    logMatches: true,
    logExecutionTime: true,
    logFallbacks: true,
  },
};

/**
 * Current active configuration
 * Can be modified at runtime for testing or feature flag changes
 */
let activeConfig: SimpleQueryConfig = { ...defaultConfig };

/**
 * Get current configuration
 */
export function getConfig(): SimpleQueryConfig {
  return { ...activeConfig };
}

/**
 * Update configuration
 * Validates configuration before applying
 */
export function updateConfig(updates: Partial<SimpleQueryConfig>): void {
  const newConfig = { ...activeConfig, ...updates };
  
  // Validate configuration
  const validation = validateConfig(newConfig);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }
  
  activeConfig = newConfig;
  
  if (activeConfig.monitoring.enabled) {
    console.log('✅ Simple Query configuration updated:', updates);
  }
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  activeConfig = { ...defaultConfig };
  
  if (activeConfig.monitoring.enabled) {
    console.log('🔄 Simple Query configuration reset to defaults');
  }
}

/**
 * Enable or disable the feature
 */
export function setEnabled(enabled: boolean): void {
  updateConfig({ enabled });
  
  if (activeConfig.monitoring.enabled) {
    console.log(`${enabled ? '✅' : '❌'} Simple Query feature ${enabled ? 'enabled' : 'disabled'}`);
  }
}

/**
 * Check if feature is enabled
 */
export function isEnabled(): boolean {
  return activeConfig.enabled;
}

/**
 * Validate configuration
 */
export function validateConfig(config: SimpleQueryConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate maxExecutionTime
  if (config.maxExecutionTime <= 0) {
    errors.push('maxExecutionTime must be greater than 0');
  }
  
  // Validate maxResults
  if (config.maxResults <= 0) {
    errors.push('maxResults must be greater than 0');
  }
  
  // Validate cacheTTL
  if (config.cacheTTL < 0) {
    errors.push('cacheTTL must be non-negative');
  }
  
  // Validate patterns
  if (!Array.isArray(config.patterns)) {
    errors.push('patterns must be an array');
  } else if (config.patterns.length === 0) {
    errors.push('patterns array cannot be empty');
  }
  
  // Validate pattern structure
  for (const pattern of config.patterns) {
    if (!pattern.id || typeof pattern.id !== 'string') {
      errors.push(`Pattern missing valid id: ${JSON.stringify(pattern)}`);
    }
    if (!pattern.name || typeof pattern.name !== 'string') {
      errors.push(`Pattern ${pattern.id} missing valid name`);
    }
    if (typeof pattern.priority !== 'number') {
      errors.push(`Pattern ${pattern.id} missing valid priority`);
    }
    if (!(pattern.regex instanceof RegExp)) {
      errors.push(`Pattern ${pattern.id} missing valid regex`);
    }
    if (typeof pattern.filterBuilder !== 'function') {
      errors.push(`Pattern ${pattern.id} missing valid filterBuilder`);
    }
    if (typeof pattern.sortBuilder !== 'function') {
      errors.push(`Pattern ${pattern.id} missing valid sortBuilder`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Monitoring hooks
 */
export interface MonitoringMetrics {
  totalQueries: number;
  matchedQueries: number;
  fallbackQueries: number;
  averageExecutionTime: number;
  cacheHits: number;
  cacheMisses: number;
}

let metrics: MonitoringMetrics = {
  totalQueries: 0,
  matchedQueries: 0,
  fallbackQueries: 0,
  averageExecutionTime: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

/**
 * Record a query match
 */
export function recordMatch(patternId: string, executionTime: number, cacheHit: boolean): void {
  if (!activeConfig.monitoring.enabled) return;
  
  metrics.totalQueries++;
  metrics.matchedQueries++;
  
  if (cacheHit) {
    metrics.cacheHits++;
  } else {
    metrics.cacheMisses++;
  }
  
  // Update average execution time
  const totalTime = metrics.averageExecutionTime * (metrics.totalQueries - 1) + executionTime;
  metrics.averageExecutionTime = totalTime / metrics.totalQueries;
  
  if (activeConfig.monitoring.logMatches) {
    console.log(`⚡ Simple Query matched: ${patternId} (${executionTime}ms)${cacheHit ? ' [CACHE HIT]' : ''}`);
  }
}

/**
 * Record a fallback to LLM
 */
export function recordFallback(query: string): void {
  if (!activeConfig.monitoring.enabled) return;
  
  metrics.totalQueries++;
  metrics.fallbackQueries++;
  
  if (activeConfig.monitoring.logFallbacks) {
    console.log(`🤖 Simple Query fallback to LLM: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
  }
}

/**
 * Get current metrics
 */
export function getMetrics(): MonitoringMetrics {
  return { ...metrics };
}

/**
 * Reset metrics
 */
export function resetMetrics(): void {
  metrics = {
    totalQueries: 0,
    matchedQueries: 0,
    fallbackQueries: 0,
    averageExecutionTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  
  if (activeConfig.monitoring.enabled) {
    console.log('🔄 Simple Query metrics reset');
  }
}

/**
 * Get match rate (percentage of queries that matched patterns)
 */
export function getMatchRate(): number {
  if (metrics.totalQueries === 0) return 0;
  return (metrics.matchedQueries / metrics.totalQueries) * 100;
}

/**
 * Get cache hit rate
 */
export function getCacheHitRate(): number {
  const totalCacheAttempts = metrics.cacheHits + metrics.cacheMisses;
  if (totalCacheAttempts === 0) return 0;
  return (metrics.cacheHits / totalCacheAttempts) * 100;
}

/**
 * Export configuration utilities
 */
export default {
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
};
