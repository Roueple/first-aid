# Doc AI Service

Simple, standalone AI service for the Doc assistant page.

## Overview

This service provides a direct API connection to Google's Gemini AI, completely separate from the main chat logic in the app.

## Features

- ✅ Simple API connection using Gemini 1.5 Flash
- ✅ Standalone - no dependencies on existing chat services
- ✅ Easy to test and extend
- ✅ Uses existing `VITE_GEMINI_API_KEY` from .env

## Usage

```typescript
import { initializeDocAI, sendDocQuery } from './services/DocAIService';

// Initialize (happens automatically on first query)
initializeDocAI();

// Send a query
const response = await sendDocQuery('Your question here');
console.log(response);
```

## API Reference

### `initializeDocAI()`
Initializes the AI service with the API key from environment variables.
Returns `true` if successful, `false` otherwise.

### `isDocAIReady()`
Checks if the service is initialized and ready to use.
Returns `boolean`.

### `sendDocQuery(query: string)`
Sends a query to the AI and returns the response.
- **Parameters**: `query` - The user's question/prompt
- **Returns**: `Promise<string>` - The AI's response
- **Throws**: Error if service is not configured or API call fails

## Testing

Run the manual test to verify the API connection:

```bash
npm test -- DocAIService.manual.test.ts
```

## Next Steps

This is a minimal setup. Future enhancements could include:
- Conversation history management
- Streaming responses
- Custom system prompts
- Context injection (audit results, projects, etc.)
- Rate limiting and error handling
