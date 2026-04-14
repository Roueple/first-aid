import { useState, useEffect } from 'react';
import { X, User, Save, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/AuthService';

interface UserSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartTutorial?: () => void;
}

export function UserSettingsDialog({ isOpen, onClose, onRestartTutorial }: UserSettingsDialogProps) {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setDisplayName(currentUser.displayName || '');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, currentUser]);

  const handleSave = async () => {
    if (!currentUser?.email || !displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await authService.updateDisplayName(currentUser.email, displayName.trim());
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update display name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bernard-modal-overlay" onClick={onClose}>
      <div className="bernard-modal bernard-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bernard-modal-header">
          <div className="bernard-modal-header-left">
            <User size={20} />
            <h2 className="bernard-modal-title">User Settings</h2>
          </div>
          <button className="bernard-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="bernard-modal-content">
          <div className="bernard-settings-section">
            <label className="bernard-settings-label">
              Email
            </label>
            <input
              type="text"
              className="bernard-settings-input"
              value={currentUser?.email || ''}
              disabled
            />
          </div>

          <div className="bernard-settings-section">
            <label className="bernard-settings-label">
              Display Name
            </label>
            <input
              type="text"
              className="bernard-settings-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your display name"
              disabled={isSaving}
              autoFocus
            />
            <p className="bernard-settings-hint">
              This name will be used in greetings and throughout the app
            </p>
          </div>

          <div className="bernard-settings-section">
            <label className="bernard-settings-label">
              Tutorial
            </label>
            <button
              className="bernard-btn bernard-btn-secondary"
              onClick={onRestartTutorial}
              disabled={isSaving}
            >
              <PlayCircle size={16} />
              Restart Tutorial
            </button>
            <p className="bernard-settings-hint">
              Replay the onboarding tutorial to refresh your knowledge of Bernard features
            </p>
          </div>

          {error && (
            <div className="bernard-settings-error">
              {error}
            </div>
          )}

          {success && (
            <div className="bernard-settings-success">
              Display name updated successfully!
            </div>
          )}
        </div>

        <div className="bernard-modal-footer">
          <button
            className="bernard-btn bernard-btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="bernard-btn bernard-btn-primary"
            onClick={handleSave}
            disabled={isSaving || !displayName.trim()}
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
