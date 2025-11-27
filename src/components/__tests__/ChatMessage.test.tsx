import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ChatMessage } from '../ChatMessage';
import { ChatMessage as ChatMessageType } from '../../types/chat.types';
import { Timestamp } from 'firebase/firestore';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ChatMessage Component', () => {
  const mockTimestamp = {
    toDate: () => new Date('2024-01-15T10:30:00'),
  } as Timestamp;

  describe('User Messages', () => {
    it('should render user message with correct styling', () => {
      const message: ChatMessageType = {
        id: 'msg-1',
        role: 'user',
        content: 'What are the critical findings?',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText('What are the critical findings?')).toBeInTheDocument();
      const messageContainer = screen.getByText('What are the critical findings?').closest('div');
      expect(messageContainer).toHaveClass('bg-blue-600');
    });

    it('should display timestamp for user message', () => {
      const message: ChatMessageType = {
        id: 'msg-1',
        role: 'user',
        content: 'Test message',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });

    it('should not display metadata for user messages', () => {
      const message: ChatMessageType = {
        id: 'msg-1',
        role: 'user',
        content: 'Test message',
        timestamp: mockTimestamp,
        metadata: {
          confidence: 0.95,
          sources: ['FND-001'],
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.queryByText(/Confidence/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sources/)).not.toBeInTheDocument();
    });
  });

  describe('Assistant Messages', () => {
    it('should render assistant message with correct styling', () => {
      const message: ChatMessageType = {
        id: 'msg-2',
        role: 'assistant',
        content: 'I found 3 critical findings in the Finance department.',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/I found 3 critical findings/)).toBeInTheDocument();
      const messageContainer = screen.getByText(/I found 3 critical findings/).closest('div');
      expect(messageContainer).toHaveClass('bg-gray-100');
    });

    it('should display confidence score when provided', () => {
      const message: ChatMessageType = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Test response',
        timestamp: mockTimestamp,
        metadata: {
          confidence: 0.87,
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Confidence: 87%/)).toBeInTheDocument();
    });

    it('should display processing time when provided', () => {
      const message: ChatMessageType = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Test response',
        timestamp: mockTimestamp,
        metadata: {
          processingTime: 2.34,
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Processed in 2.34s/)).toBeInTheDocument();
    });

    it('should display source finding references', () => {
      const message: ChatMessageType = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Test response',
        timestamp: mockTimestamp,
        metadata: {
          sources: ['FND-2024-001', 'FND-2024-015'],
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Sources \(2\)/)).toBeInTheDocument();
      expect(screen.getByText('FND-2024-001')).toBeInTheDocument();
      expect(screen.getByText('FND-2024-015')).toBeInTheDocument();
    });

    it('should navigate to finding when source is clicked', () => {
      const message: ChatMessageType = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Test response',
        timestamp: mockTimestamp,
        metadata: {
          sources: ['FND-2024-001'],
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      const sourceButton = screen.getByText('FND-2024-001');
      fireEvent.click(sourceButton);

      expect(mockNavigate).toHaveBeenCalledWith('/findings?id=FND-2024-001');
    });

    it('should display follow-up suggestions', () => {
      const message: ChatMessageType = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Test response',
        timestamp: mockTimestamp,
        metadata: {
          suggestions: [
            'What are the root causes?',
            'Show me similar findings',
            'Generate a report',
          ],
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Follow-up questions/)).toBeInTheDocument();
      expect(screen.getByText(/What are the root causes\?/)).toBeInTheDocument();
      expect(screen.getByText(/Show me similar findings/)).toBeInTheDocument();
      expect(screen.getByText(/Generate a report/)).toBeInTheDocument();
    });

    it('should display all metadata when provided', () => {
      const message: ChatMessageType = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Comprehensive response',
        timestamp: mockTimestamp,
        metadata: {
          confidence: 0.92,
          processingTime: 1.5,
          sources: ['FND-001', 'FND-002'],
          suggestions: ['Follow-up question 1', 'Follow-up question 2'],
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Confidence: 92%/)).toBeInTheDocument();
      expect(screen.getByText(/Processed in 1.50s/)).toBeInTheDocument();
      expect(screen.getByText(/Sources \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Follow-up questions/)).toBeInTheDocument();
    });
  });

  describe('Markdown Rendering', () => {
    it('should render bold text', () => {
      const message: ChatMessageType = {
        id: 'msg-3',
        role: 'assistant',
        content: 'This is **bold text** in the message.',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      const container = screen.getByText(/This is/).closest('div');
      expect(container?.innerHTML).toContain('<strong>bold text</strong>');
    });

    it('should render italic text', () => {
      const message: ChatMessageType = {
        id: 'msg-3',
        role: 'assistant',
        content: 'This is *italic text* in the message.',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      const container = screen.getByText(/This is/).closest('div');
      expect(container?.innerHTML).toContain('<em>italic text</em>');
    });

    it('should render inline code', () => {
      const message: ChatMessageType = {
        id: 'msg-3',
        role: 'assistant',
        content: 'Use the `findById` method to retrieve data.',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText('findById')).toBeInTheDocument();
      const codeElement = screen.getByText('findById');
      expect(codeElement.tagName).toBe('CODE');
    });

    it('should render code blocks', () => {
      const message: ChatMessageType = {
        id: 'msg-3',
        role: 'assistant',
        content: 'Here is some code:\n```javascript\nconst x = 10;\n```',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/const x = 10/)).toBeInTheDocument();
      const codeBlock = screen.getByText(/const x = 10/).closest('pre');
      expect(codeBlock).toBeInTheDocument();
    });

    it('should render bullet lists', () => {
      const message: ChatMessageType = {
        id: 'msg-3',
        role: 'assistant',
        content: 'Key points:\n- Point 1\n- Point 2\n- Point 3',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText('Point 1')).toBeInTheDocument();
      expect(screen.getByText('Point 2')).toBeInTheDocument();
      expect(screen.getByText('Point 3')).toBeInTheDocument();
    });

    it('should render headers', () => {
      const message: ChatMessageType = {
        id: 'msg-3',
        role: 'assistant',
        content: '## Important Section\nContent here',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      const header = screen.getByText('Important Section');
      expect(header.tagName).toBe('H2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle message without metadata', () => {
      const message: ChatMessageType = {
        id: 'msg-4',
        role: 'assistant',
        content: 'Simple response',
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText('Simple response')).toBeInTheDocument();
      expect(screen.queryByText(/Confidence/)).not.toBeInTheDocument();
    });

    it('should handle empty sources array', () => {
      const message: ChatMessageType = {
        id: 'msg-4',
        role: 'assistant',
        content: 'Response',
        timestamp: mockTimestamp,
        metadata: {
          sources: [],
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.queryByText(/Sources/)).not.toBeInTheDocument();
    });

    it('should handle empty suggestions array', () => {
      const message: ChatMessageType = {
        id: 'msg-4',
        role: 'assistant',
        content: 'Response',
        timestamp: mockTimestamp,
        metadata: {
          suggestions: [],
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.queryByText(/Follow-up questions/)).not.toBeInTheDocument();
    });

    it('should handle timestamp without toDate method', () => {
      const message: ChatMessageType = {
        id: 'msg-4',
        role: 'assistant',
        content: 'Response',
        timestamp: {} as Timestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(1000);
      const message: ChatMessageType = {
        id: 'msg-4',
        role: 'assistant',
        content: longContent,
        timestamp: mockTimestamp,
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle confidence score of 0', () => {
      const message: ChatMessageType = {
        id: 'msg-4',
        role: 'assistant',
        content: 'Response',
        timestamp: mockTimestamp,
        metadata: {
          confidence: 0,
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Confidence: 0%/)).toBeInTheDocument();
    });

    it('should handle confidence score of 1', () => {
      const message: ChatMessageType = {
        id: 'msg-4',
        role: 'assistant',
        content: 'Response',
        timestamp: mockTimestamp,
        metadata: {
          confidence: 1,
        },
      };

      render(
        <BrowserRouter>
          <ChatMessage message={message} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Confidence: 100%/)).toBeInTheDocument();
    });
  });
});
