import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders with default placeholder', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('Search findings...');
    expect(input).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} placeholder="Custom placeholder" />);
    
    const input = screen.getByPlaceholderText('Custom placeholder');
    expect(input).toBeInTheDocument();
  });

  it('displays search icon', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    const searchIcon = screen.getByLabelText('Search findings');
    expect(searchIcon).toBeInTheDocument();
  });

  it('calls onSearch with debounced input', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} debounceMs={300} />);
    
    const input = screen.getByPlaceholderText('Search findings...');
    
    // Type in the input
    act(() => {
      fireEvent.change(input, { target: { value: 'test query' } });
    });
    
    // Should not call immediately
    expect(onSearch).not.toHaveBeenCalledWith('test query');
    
    // Fast-forward time by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should call after debounce
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('debounces multiple rapid inputs', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} debounceMs={300} />);
    
    const input = screen.getByPlaceholderText('Search findings...');
    
    // Type multiple times rapidly
    act(() => {
      fireEvent.change(input, { target: { value: 't' } });
      vi.advanceTimersByTime(100);
      
      fireEvent.change(input, { target: { value: 'te' } });
      vi.advanceTimersByTime(100);
      
      fireEvent.change(input, { target: { value: 'tes' } });
      vi.advanceTimersByTime(100);
      
      fireEvent.change(input, { target: { value: 'test' } });
      
      // Fast-forward past debounce time
      vi.advanceTimersByTime(300);
    });
    
    // Should only call once with final value
    expect(onSearch).toHaveBeenCalledTimes(2); // Initial empty + final value
    expect(onSearch).toHaveBeenLastCalledWith('test');
  });

  it('shows clear button when input has value', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('Search findings...');
    
    // Initially no clear button
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    
    // Type something
    fireEvent.change(input, { target: { value: 'test' } });
    
    // Clear button should appear
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} debounceMs={300} />);
    
    const input = screen.getByPlaceholderText('Search findings...') as HTMLInputElement;
    
    // Type something
    act(() => {
      fireEvent.change(input, { target: { value: 'test query' } });
    });
    expect(input.value).toBe('test query');
    
    // Click clear button
    const clearButton = screen.getByLabelText('Clear search');
    act(() => {
      fireEvent.click(clearButton);
    });
    
    // Input should be cleared
    expect(input.value).toBe('');
    
    // Fast-forward debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should call onSearch with empty string
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('clears input when Escape key is pressed', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} debounceMs={300} />);
    
    const input = screen.getByPlaceholderText('Search findings...') as HTMLInputElement;
    
    // Type something
    act(() => {
      fireEvent.change(input, { target: { value: 'test query' } });
    });
    expect(input.value).toBe('test query');
    
    // Press Escape
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    
    // Input should be cleared
    expect(input.value).toBe('');
    
    // Fast-forward debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should call onSearch with empty string
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('uses initial value if provided', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} initialValue="initial search" />);
    
    const input = screen.getByPlaceholderText('Search findings...') as HTMLInputElement;
    expect(input.value).toBe('initial search');
  });

  it('calls onSearch with initial value on mount', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} initialValue="initial" debounceMs={0} />);
    
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    expect(onSearch).toHaveBeenCalledWith('initial');
  });

  it('respects custom debounce time', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} debounceMs={500} />);
    
    const input = screen.getByPlaceholderText('Search findings...');
    
    act(() => {
      fireEvent.change(input, { target: { value: 'test' } });
      
      // Should not call after 300ms
      vi.advanceTimersByTime(300);
    });
    expect(onSearch).not.toHaveBeenCalledWith('test');
    
    // Should call after 500ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onSearch).toHaveBeenCalledWith('test');
  });
});
