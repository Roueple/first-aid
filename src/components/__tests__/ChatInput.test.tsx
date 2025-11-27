import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
    expect(screen.getByTitle('Send message')).toBeInTheDocument();
  });

  it('sends message when send button is clicked', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('clears input after sending message', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);

    expect(textarea.value).toBe('');
  });

  it('sends message when Enter is pressed', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('does not send message when Shift+Enter is pressed', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    fireEvent.change(textarea, { target: { value: 'Line 1' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('disables send button when input is empty', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const sendButton = screen.getByTitle('Send message');
    expect(sendButton).toBeDisabled();
  });

  it('disables send button when loading', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} loading={true} />);

    const sendButton = screen.getByTitle('Send message');
    expect(sendButton).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} loading={true} />);

    const sendButton = screen.getByTitle('Send message');
    const spinner = sendButton.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders suggestion chips when provided', () => {
    const onSendMessage = vi.fn();
    const suggestions = ['Suggestion 1', 'Suggestion 2', 'Suggestion 3'];
    render(<ChatInput onSendMessage={onSendMessage} suggestions={suggestions} />);

    expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
    expect(screen.getByText('Suggestion 3')).toBeInTheDocument();
  });

  it('sends message when suggestion chip is clicked', () => {
    const onSendMessage = vi.fn();
    const suggestions = ['Suggestion 1', 'Suggestion 2'];
    render(<ChatInput onSendMessage={onSendMessage} suggestions={suggestions} />);

    const chip = screen.getByText('Suggestion 1');
    fireEvent.click(chip);

    expect(onSendMessage).toHaveBeenCalledWith('Suggestion 1');
  });

  it('does not render suggestions section when no suggestions provided', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} suggestions={[]} />);

    expect(screen.queryByText(/suggested follow-ups/i)).not.toBeInTheDocument();
  });

  it('trims whitespace from message before sending', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    fireEvent.change(textarea, { target: { value: '  Test message  ' } });
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('does not send empty or whitespace-only messages', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    
    const sendButton = screen.getByTitle('Send message');
    expect(sendButton).toBeDisabled();
  });

  it('uses custom placeholder when provided', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} placeholder="Custom placeholder" />);

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('disables textarea when loading', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} loading={true} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    expect(textarea).toBeDisabled();
  });

  it('disables suggestion chips when loading', () => {
    const onSendMessage = vi.fn();
    const suggestions = ['Suggestion 1'];
    render(<ChatInput onSendMessage={onSendMessage} suggestions={suggestions} loading={true} />);

    const chip = screen.getByText('Suggestion 1').closest('button');
    expect(chip).toBeDisabled();
  });

  it('displays keyboard shortcut hints', () => {
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    expect(screen.getByText(/press/i)).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Shift+Enter')).toBeInTheDocument();
  });
});
