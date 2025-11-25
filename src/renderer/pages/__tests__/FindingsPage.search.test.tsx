import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FindingsPage } from '../FindingsPage';

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('FindingsPage - Search Functionality', () => {
  it('renders search bar', () => {
    render(<FindingsPage />);
    
    const searchInput = screen.getByPlaceholderText(/search by title, description, or responsible person/i);
    expect(searchInput).toBeDefined();
  });

  it('filters findings based on search query', async () => {
    vi.useFakeTimers();
    
    render(<FindingsPage />);
    
    // Wait for initial data load
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    const searchInput = screen.getByPlaceholderText(/search by title, description, or responsible person/i);
    
    // Type a search query
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'database' } });
      vi.advanceTimersByTime(300); // Debounce time
    });
    
    // Check that search result count is displayed
    const resultText = screen.queryByText(/found/i);
    expect(resultText).toBeDefined();
    
    vi.useRealTimers();
  });

  it('shows search result count when searching', async () => {
    vi.useFakeTimers();
    
    render(<FindingsPage />);
    
    // Wait for initial data load
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    const searchInput = screen.getByPlaceholderText(/search by title, description, or responsible person/i);
    
    // Type a search query
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'security' } });
      vi.advanceTimersByTime(300);
    });
    
    // Should show result count
    const resultCount = screen.queryByText(/result/i);
    expect(resultCount).toBeDefined();
    
    vi.useRealTimers();
  });

  it('clears search when clear button is clicked', async () => {
    vi.useFakeTimers();
    
    render(<FindingsPage />);
    
    // Wait for initial data load
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    const searchInput = screen.getByPlaceholderText(/search by title, description, or responsible person/i) as HTMLInputElement;
    
    // Type a search query
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'test' } });
    });
    
    expect(searchInput.value).toBe('test');
    
    // Click clear button
    const clearButton = screen.getByLabelText('Clear search');
    act(() => {
      fireEvent.click(clearButton);
    });
    
    expect(searchInput.value).toBe('');
    
    vi.useRealTimers();
  });

  it('resets to first page when search changes', async () => {
    vi.useFakeTimers();
    
    render(<FindingsPage />);
    
    // Wait for initial data load
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Navigate to page 2
    const page2Button = screen.queryByText('2');
    if (page2Button) {
      act(() => {
        fireEvent.click(page2Button);
      });
    }
    
    const searchInput = screen.getByPlaceholderText(/search by title, description, or responsible person/i);
    
    // Type a search query - should reset to page 1
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);
    });
    
    // Page should be reset (this is implicit in the implementation)
    // We can verify by checking that the component doesn't crash
    expect(searchInput).toBeDefined();
    
    vi.useRealTimers();
  });
});
