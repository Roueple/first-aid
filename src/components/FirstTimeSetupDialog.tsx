import { useState, useEffect } from 'react';
import { User as UserIcon, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/AuthService';

interface FirstTimeSetupDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function FirstTimeSetupDialog({ isOpen, onComplete }: FirstTimeSetupDialogProps) {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      // Pre-fill with current display name
      setDisplayName(currentUser.displayName || '');
      setError(null);
    }
  }, [isOpen, currentUser]);

  const handleSave = async () => {
    if (!currentUser?.email || !displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await authService.updateDisplayName(currentUser.email, displayName.trim());
      // Auth state will be updated automatically via listener
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update display name');
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleSkip();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="felix-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="felix-modal felix-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="felix-modal-header">
          <div className="felix-modal-header-left">
            <UserIcon size={20} />
            <h2 className="felix-modal-title">Welcome to FIRST-AID!</h2>
          </div>
        </div>
        
        <div className="felix-modal-content">
          <p className="felix-settings-hint" style={{ marginBottom: '1rem' }}>
            Before you start, would you like to set a custom display name? 
            This will be used in greetings and throughout the app.
          </p>

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
              Current: {currentUser?.displayName || 'Not set'}
            </p>
          </div>

          {error && (
            <div className="felix-settings-error">
              {error}
            </div>
          )}
        </div>

        <div className="felix-modal-footer">
          <button
            className="felix-btn felix-btn-secondary"
            onClick={handleSkip}
            disabled={isSaving}
          >
            <X size={16} />
            Skip for Now
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
                Save & Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
