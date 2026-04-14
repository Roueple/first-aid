import { useState } from 'react';
import { Check } from 'lucide-react';

interface ProjectSuggestion {
  name: string;
  score: number;
}

interface ProjectSelectionDialogProps {
  suggestions: ProjectSuggestion[];
  originalQuery: string;
  onConfirm: (selectedProjects: string[], originalQuery: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ProjectSelectionDialog({
  suggestions,
  originalQuery,
  onConfirm,
  onCancel,
  disabled = false
}: ProjectSelectionDialogProps) {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  const handleToggle = (projectName: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectName)) {
      newSelected.delete(projectName);
    } else {
      newSelected.add(projectName);
    }
    setSelectedProjects(newSelected);
  };

  const handleConfirm = () => {
    if (selectedProjects.size > 0) {
      onConfirm(Array.from(selectedProjects), originalQuery);
    }
  };

  return (
    <div className="bernard-project-selection">
      <div className="bernard-selection-header">
        <span className="bernard-selection-title">
          Pilih proyek yang Anda maksud:
        </span>
        <span className="bernard-selection-count">
          {selectedProjects.size} dipilih
        </span>
      </div>

      <div className="bernard-selection-list">
        {suggestions.map((suggestion, idx) => {
          const isSelected = selectedProjects.has(suggestion.name);
          return (
            <label
              key={idx}
              className={`bernard-selection-item ${isSelected ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(suggestion.name)}
                disabled={disabled}
                className="bernard-selection-checkbox"
              />
              <div className="bernard-selection-checkbox-custom">
                {isSelected && <Check size={14} />}
              </div>
              <div className="bernard-selection-info">
                <span className="bernard-selection-name">{suggestion.name}</span>
                <span className="bernard-selection-score">
                  {Math.round(suggestion.score * 100)}% match
                </span>
              </div>
            </label>
          );
        })}
      </div>

      <div className="bernard-selection-actions">
        <button
          className="bernard-selection-btn bernard-selection-btn-cancel"
          onClick={onCancel}
          disabled={disabled}
        >
          Batal
        </button>
        <button
          className="bernard-selection-btn bernard-selection-btn-confirm"
          onClick={handleConfirm}
          disabled={disabled || selectedProjects.size === 0}
        >
          Konfirmasi ({selectedProjects.size})
        </button>
      </div>
    </div>
  );
}
