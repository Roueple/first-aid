import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import SettingsPage from '../SettingsPage';
import authService from '../../../services/AuthService';

// Mock the auth service
vi.mock('../../../services/AuthService', () => ({
  default: {
    getCurrentUser: vi.fn(),
  },
}));

// Mock Firebase auth
vi.mock('../../../config/firebase', () => ({
  auth: {
    currentUser: {
      email: 'test@example.com',
    },
  },
}));

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
}));

const renderSettingsPage = () => {
  return render(
    <BrowserRouter>
      <SettingsPage />
    </BrowserRouter>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock getCurrentUser to return a test user
    vi.mocked(authService.getCurrentUser).mockReturnValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
    });
  });

  describe('Rendering', () => {
    it('should render the settings page with tabs', () => {
      renderSettingsPage();
      
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('👤 Profile')).toBeInTheDocument();
      expect(screen.getByText('⚙️ Preferences')).toBeInTheDocument();
      expect(screen.getByText('🔒 Security')).toBeInTheDocument();
    });

    it('should display profile tab by default', () => {
      renderSettingsPage();
      
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Department')).toBeInTheDocument();
    });

    it('should load current user email in profile', () => {
      renderSettingsPage();
      
      const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
      expect(emailInput).toBeDisabled();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to preferences tab when clicked', () => {
      renderSettingsPage();
      
      const preferencesTab = screen.getByText('⚙️ Preferences');
      fireEvent.click(preferencesTab);
      
      expect(screen.getByLabelText('Language')).toBeInTheDocument();
      expect(screen.getByLabelText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should switch to security tab when clicked', () => {
      renderSettingsPage();
      
      const securityTab = screen.getByText('🔒 Security');
      fireEvent.click(securityTab);
      
      expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    });
  });

  describe('Profile Section', () => {
    it('should allow updating name and department', () => {
      renderSettingsPage();
      
      const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
      const departmentInput = screen.getByLabelText('Department') as HTMLInputElement;
      
      fireEvent.change(nameInput, { target: { value: 'New Name' } });
      fireEvent.change(departmentInput, { target: { value: 'IT Department' } });
      
      expect(nameInput.value).toBe('New Name');
      expect(departmentInput.value).toBe('IT Department');
    });

    it('should show success message after saving profile', async () => {
      renderSettingsPage();
      
      const saveButton = screen.getByText('Save Profile');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Preferences Section', () => {
    it('should allow changing language', () => {
      renderSettingsPage();
      
      const preferencesTab = screen.getByText('⚙️ Preferences');
      fireEvent.click(preferencesTab);
      
      const languageSelect = screen.getByLabelText('Language') as HTMLSelectElement;
      fireEvent.change(languageSelect, { target: { value: 'id' } });
      
      expect(languageSelect.value).toBe('id');
    });

    it('should allow changing theme', () => {
      renderSettingsPage();
      
      const preferencesTab = screen.getByText('⚙️ Preferences');
      fireEvent.click(preferencesTab);
      
      const themeSelect = screen.getByLabelText('Theme') as HTMLSelectElement;
      fireEvent.change(themeSelect, { target: { value: 'dark' } });
      
      expect(themeSelect.value).toBe('dark');
    });

    it('should toggle notifications', () => {
      renderSettingsPage();
      
      const preferencesTab = screen.getByText('⚙️ Preferences');
      fireEvent.click(preferencesTab);
      
      const notificationToggle = screen.getByRole('button', { name: '' });
      const initialClass = notificationToggle.className;
      
      fireEvent.click(notificationToggle);
      
      expect(notificationToggle.className).not.toBe(initialClass);
    });

    it('should save preferences to localStorage', async () => {
      renderSettingsPage();
      
      const preferencesTab = screen.getByText('⚙️ Preferences');
      fireEvent.click(preferencesTab);
      
      const languageSelect = screen.getByLabelText('Language');
      fireEvent.change(languageSelect, { target: { value: 'id' } });
      
      const saveButton = screen.getByText('Save Preferences');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        const saved = localStorage.getItem('userPreferences');
        expect(saved).toBeTruthy();
        const preferences = JSON.parse(saved!);
        expect(preferences.language).toBe('id');
      });
    });
  });

  describe('Security Section', () => {
    it('should validate password match', async () => {
      renderSettingsPage();
      
      const securityTab = screen.getByText('🔒 Security');
      fireEvent.click(securityTab);
      
      const currentPassword = screen.getByLabelText('Current Password');
      const newPassword = screen.getByLabelText('New Password');
      const confirmPassword = screen.getByLabelText('Confirm New Password');
      
      fireEvent.change(currentPassword, { target: { value: 'oldpass123' } });
      fireEvent.change(newPassword, { target: { value: 'newpass123' } });
      fireEvent.change(confirmPassword, { target: { value: 'different123' } });
      
      const changeButton = screen.getByText('Change Password');
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
      });
    });

    it('should validate minimum password length', async () => {
      renderSettingsPage();
      
      const securityTab = screen.getByText('🔒 Security');
      fireEvent.click(securityTab);
      
      const currentPassword = screen.getByLabelText('Current Password');
      const newPassword = screen.getByLabelText('New Password');
      const confirmPassword = screen.getByLabelText('Confirm New Password');
      
      fireEvent.change(currentPassword, { target: { value: 'oldpass123' } });
      fireEvent.change(newPassword, { target: { value: '123' } });
      fireEvent.change(confirmPassword, { target: { value: '123' } });
      
      const changeButton = screen.getByText('Change Password');
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });

    it('should clear password fields after successful change', async () => {
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      
      vi.mocked(EmailAuthProvider.credential).mockReturnValue({} as any);
      vi.mocked(reauthenticateWithCredential).mockResolvedValue({} as any);
      vi.mocked(updatePassword).mockResolvedValue();
      
      renderSettingsPage();
      
      const securityTab = screen.getByText('🔒 Security');
      fireEvent.click(securityTab);
      
      const currentPassword = screen.getByLabelText('Current Password') as HTMLInputElement;
      const newPassword = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPassword = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
      
      fireEvent.change(currentPassword, { target: { value: 'oldpass123' } });
      fireEvent.change(newPassword, { target: { value: 'newpass123' } });
      fireEvent.change(confirmPassword, { target: { value: 'newpass123' } });
      
      const changeButton = screen.getByText('Change Password');
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
        expect(currentPassword.value).toBe('');
        expect(newPassword.value).toBe('');
        expect(confirmPassword.value).toBe('');
      });
    });
  });

  describe('Navigation', () => {
    it('should have a back button', () => {
      renderSettingsPage();
      
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });
  });
});
