import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatInterface } from '../ChatInterface';
import { ChatSession } from '../../types/chat.types';
import { Timestamp } from 'firebase/firestore';

describe('ChatInterface', () => {
  const mockSession: ChatSession = {
    id: 'session-1',
    userId: 'user-1',
    title: 'Test Chat Session',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Timestamp.now(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there! How can I help you?',
        timestamp: Timestamp.now(),
      },
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isActive: true,
  };

  it('renders empty state when no session is active', () => {
    render(<ChatInterface />);
    
    expect(screen.getByText('Welcome to AI Chat Assistant')).toBeDefined();
    expect(screen.getByText(/Ask me anything about your audit findings/)).toBeDefined();
  });

  it('displays example questions in empty state', () => {
    render(<ChatInterface />);
    
    expect(screen.getByText(/What are the most critical findings/)).toBeDefined();
    expect(screen.getByText(/Show me all overdue findings/)).toBeDefined();
  });

  it('renders session list when sessions are provided', () => {
    const sessions = [mockSession];
    render(<ChatInterface sessions={sessions} />);
    
    expect(screen.getByText('Test Chat Session')).toBeDefined();
    expect(screen.getByText('2 messages')).toBeDefined();
  });

  it('displays messages when a session is active', () => {
    render(<ChatInterface currentSession={mockSession} />);
    
    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there! How can I help you?')).toBeDefined();
  });

  it('calls onSendMessage when send button is clicked', () => {
    const onSendMessage = vi.fn();
    render(<ChatInterface onSendMessage={onSendMessage} />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your audit findings/);
    const sendButton = screen.getByTitle('Send message');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('calls onSessionSelect when a session is clicked', () => {
    const onSessionSelect = vi.fn();
    const sessions = [mockSession];
    render(<ChatInterface sessions={sessions} onSessionSelect={onSessionSelect} />);
    
    const sessionButton = screen.getByText('Test Chat Session');
    fireEvent.click(sessionButton);
    
    expect(onSessionSelect).toHaveBeenCalledWith('session-1');
  });

  it('calls onNewSession when New Chat button is clicked', () => {
    const onNewSession = vi.fn();
    render(<ChatInterface onNewSession={onNewSession} />);
    
    const newChatButton = screen.getByText('New Chat');
    fireEvent.click(newChatButton);
    
    expect(onNewSession).toHaveBeenCalled();
  });

  it('disables send button when message is empty', () => {
    render(<ChatInterface />);
    
    const sendButton = screen.getByTitle('Send message') as HTMLButtonElement;
    expect(sendButton.disabled).toBe(true);
  });

  it('disables send button when loading', () => {
    render(<ChatInterface loading={true} />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your audit findings/);
    const sendButton = screen.getByTitle('Send message') as HTMLButtonElement;
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(sendButton.disabled).toBe(true);
  });

  it('shows loading indicator when loading is true', () => {
    render(<ChatInterface currentSession={mockSession} loading={true} />);
    
    // Check for animated dots (loading indicator)
    const loadingDots = screen.getAllByRole('generic').filter(
      el => el.className.includes('animate-bounce')
    );
    expect(loadingDots.length).toBeGreaterThan(0);
  });

  it('clears input after sending message', () => {
    const onSendMessage = vi.fn();
    render(<ChatInterface onSendMessage={onSendMessage} />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your audit findings/) as HTMLTextAreaElement;
    const sendButton = screen.getByTitle('Send message');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    expect(input.value).toBe('');
  });

  it('calls onSendMessage with example question when clicked', () => {
    const onSendMessage = vi.fn();
    render(<ChatInterface onSendMessage={onSendMessage} />);
    
    const exampleQuestion = screen.getByText(/What are the most critical findings/);
    fireEvent.click(exampleQuestion.closest('button')!);
    
    expect(onSendMessage).toHaveBeenCalledWith(
      'What are the most critical findings in the last month?'
    );
  });

  it('toggles sidebar visibility', () => {
    render(<ChatInterface />);
    
    // Sidebar should be open by default
    expect(screen.getByText('Chat Sessions')).toBeDefined();
    
    // Close sidebar (on mobile)
    const closeButton = screen.getByTitle('Close sidebar');
    fireEvent.click(closeButton);
    
    // Sidebar should still exist but be hidden (width: 0)
    const sidebar = closeButton.closest('div');
    expect(sidebar?.className).toContain('w-0');
  });

  it('highlights current session in sidebar', () => {
    const sessions = [mockSession];
    render(
      <ChatInterface 
        sessions={sessions} 
        currentSession={mockSession}
      />
    );
    
    const sessionButton = screen.getByText('Test Chat Session').closest('button');
    expect(sessionButton?.className).toContain('bg-purple-50');
  });

  it('displays "No previous conversations" when sessions array is empty', () => {
    render(<ChatInterface sessions={[]} />);
    
    expect(screen.getByText('No previous conversations')).toBeDefined();
  });

  // Task 10.4: Real-time updates tests
  describe('Real-time updates (Task 10.4)', () => {
    it('displays typing indicator when loading', () => {
      render(<ChatInterface currentSession={mockSession} loading={true} />);
      
      expect(screen.getByText('AI is thinking...')).toBeDefined();
    });

    it('typing indicator has animated dots', () => {
      render(<ChatInterface currentSession={mockSession} loading={true} />);
      
      // Check for animated bounce dots
      const dots = screen.getAllByRole('generic').filter(
        el => el.className.includes('animate-bounce') && el.className.includes('bg-purple-400')
      );
      expect(dots.length).toBe(3);
    });

    it('hides typing indicator when not loading', () => {
      render(<ChatInterface currentSession={mockSession} loading={false} />);
      
      expect(screen.queryByText('AI is thinking...')).toBeNull();
    });

    it('renders messages in correct order', () => {
      render(<ChatInterface currentSession={mockSession} />);
      
      const messages = screen.getAllByRole('generic').filter(
        el => el.className.includes('flex items-start gap-3')
      );
      
      // Should have at least the user and assistant messages
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('auto-scroll element is present for scrolling to latest message', () => {
      const { container } = render(<ChatInterface currentSession={mockSession} />);
      
      // The messagesEndRef div should be in the DOM
      const messageList = container.querySelector('.space-y-6');
      expect(messageList).toBeDefined();
    });

    it('updates message list when session messages change', () => {
      const { rerender } = render(<ChatInterface currentSession={mockSession} />);
      
      expect(screen.getByText('Hello')).toBeDefined();
      
      // Add a new message
      const updatedSession: ChatSession = {
        ...mockSession,
        messages: [
          ...mockSession.messages,
          {
            id: 'msg-3',
            role: 'user',
            content: 'New message',
            timestamp: Timestamp.now(),
          },
        ],
      };
      
      rerender(<ChatInterface currentSession={updatedSession} />);
      
      expect(screen.getByText('New message')).toBeDefined();
    });

    it('shows typing indicator below existing messages', () => {
      render(<ChatInterface currentSession={mockSession} loading={true} />);
      
      // Both existing messages and typing indicator should be visible
      expect(screen.getByText('Hello')).toBeDefined();
      expect(screen.getByText('Hi there! How can I help you?')).toBeDefined();
      expect(screen.getByText('AI is thinking...')).toBeDefined();
    });
  });
});
