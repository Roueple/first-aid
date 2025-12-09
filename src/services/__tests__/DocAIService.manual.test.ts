/**
 * Manual test for Doc AI Service
 * Run this to verify the API connection works
 * 
 * Usage: npm test -- DocAIService.manual.test.ts
 */

import { describe, it, expect } from 'vitest';
import { initializeDocAI, sendDocQuery, isDocAIReady } from '../DocAIService';

describe('DocAIService - Manual API Test', () => {
  it('should initialize successfully', () => {
    const result = initializeDocAI();
    expect(result).toBe(true);
    expect(isDocAIReady()).toBe(true);
  });

  it('should send a simple query and get response', async () => {
    const response = await sendDocQuery('Say hello in one sentence');
    expect(response).toBeTruthy();
    expect(typeof response).toBe('string');
    console.log('Response:', response);
  }, 10000); // 10 second timeout for API call
});
