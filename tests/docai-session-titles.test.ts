import { describe, it, expect, beforeAll } from 'vitest';
import { generateSessionTitle } from '../src/services/GeminiService';
import { initializeGemini } from '../src/services/GeminiService';

describe('DocAI Session Title Generation', () => {
  beforeAll(() => {
    initializeGemini();
  });

  it('should generate a concise title from a user message', async () => {
    const message = 'Show me all high priority findings from Jakarta projects';
    const title = await generateSessionTitle(message);
    
    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).not.toBe('New Chat'); // Should generate something meaningful
    
    console.log(`Generated title: "${title}"`);
  }, 10000); // 10 second timeout for API call

  it('should handle short messages', async () => {
    const message = 'Help me';
    const title = await generateSessionTitle(message);
    
    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);
    
    console.log(`Generated title for short message: "${title}"`);
  }, 10000);

  it('should handle complex queries', async () => {
    const message = 'Can you analyze the audit results for all projects in Surabaya from 2023 and identify the most common compliance issues?';
    const title = await generateSessionTitle(message);
    
    expect(title).toBeDefined();
    expect(title.length).toBeLessThanOrEqual(60);
    
    console.log(`Generated title for complex query: "${title}"`);
  }, 10000);

  it('should return fallback on error', async () => {
    // Test with empty message
    const title = await generateSessionTitle('');
    
    expect(title).toBe('New Chat');
  }, 10000);
});
