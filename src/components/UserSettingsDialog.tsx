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
    <div className="felix-modal-overlay" onClick={onClose}>
      <div className="felix-modal felix-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="felix-modal-header">
          <div className="felix-modal-header-left">
            <User size={20} />
            <h2 className="felix-modal-title">User Settings</h2>
          </div>
          <button className="felix-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="felix-modal-content">
          <div className="felix-settings-section">
            <label className="felix-settings-label">
              Email
            </label>
            <input
              type="text"
              className="felix-settings-input"
              value={currentUser?.email || ''}
              disabled
            />
          </div>

          <div className="felix-settings-section">
            <label className="felix-settings-label">
              Display Name
            </label>
            <input
              type="text"
              className="felix-settings-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your display name"
              disabled={isSaving}
              autoFocus
            />
            <p className="felix-settings-hint">
              This name will be used in greetings and throughout the app
            </p>
          </div>

          <div className="felix-settings-section">
            <label className="felix-settings-label">
              Tutorial
            </label>
            <button
              className="felix-btn felix-btn-secondary"
              onClick={onRestartTutorial}
              disabled={isSaving}
            >
              <PlayCircle size={16} />
              Restart Tutorial
            </button>
            <p className="felix-settings-hint">
              Replay the onboarding tutorial to refresh your knowledge of Felix features
            </p>
          </div>

          {error && (
            <div className="felix-settings-error">
              {error}
            </div>
          )}

          {success && (
            <div className="felix-settings-success">
              Display name updated successfully!
            </div>
          )}
        </div>

        <div className="felix-modal-footer">
          <button
            className="felix-btn felix-btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="felix-btn felix-btn-primary"
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
