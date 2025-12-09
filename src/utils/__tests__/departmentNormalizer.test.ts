import { describe, it, expect } from 'vitest';
import {
  normalizeDepartmentName,
  generateDepartmentKeywords,
  areDepartmentsSimilar,
  categorizeDepartment,
  formatDepartmentName,
} from '../departmentNormalizer';

describe('departmentNormalizer', () => {
  describe('normalizeDepartmentName', () => {
    it('should normalize various department formats', () => {
      expect(normalizeDepartmentName('Departemen IT')).toBe('IT');
      expect(normalizeDepartmentName('Department Finance')).toBe('Finance');
      expect(normalizeDepartmentName('Finance & Accounting')).toBe('Finance Accounting');
    });
  });

  describe('generateDepartmentKeywords', () => {
    it('should generate searchable keywords', () => {
      const keywords = generateDepartmentKeywords('Finance Accounting');
      expect(keywords).toContain('finance');
      expect(keywords).toContain('accounting');
    });
  });

  describe('areDepartmentsSimilar', () => {
    it('should detect exact matches', () => {
      expect(areDepartmentsSimilar('Departemen IT', 'Department IT')).toBe(true);
    });

    it('should detect similar departments', () => {
      // After normalization, both become "Finance Accounting"
      expect(
        areDepartmentsSimilar('Finance & Accounting', 'Finance Accounting')
      ).toBe(true);
    });

    it('should detect different departments', () => {
      expect(areDepartmentsSimilar('IT', 'Finance')).toBe(false);
    });

    it('should not match departments with low overlap', () => {
      // Different departments with minimal overlap
      expect(
        areDepartmentsSimilar('Finance Accounting', 'Marketing Sales')
      ).toBe(false);
    });
  });

  describe('categorizeDepartment', () => {
    it('should categorize departments correctly', () => {
      expect(categorizeDepartment('IT')).toBe('IT');
      expect(categorizeDepartment('Finance')).toBe('Finance');
      expect(categorizeDepartment('HR')).toBe('HR');
      expect(categorizeDepartment('Marketing')).toBe('Marketing & Sales');
      expect(categorizeDepartment('Legal')).toBe('Legal & Compliance');
      expect(categorizeDepartment('Audit')).toBe('Audit & Risk');
      expect(categorizeDepartment('Engineering')).toBe('Engineering & Construction');
      expect(categorizeDepartment('Property Management')).toBe('Property Management');
      expect(categorizeDepartment('Hospitality')).toBe('Hospitality & F&B');
      expect(categorizeDepartment('Healthcare')).toBe('Healthcare');
      expect(categorizeDepartment('Security')).toBe('Security');
      expect(categorizeDepartment('Corporate')).toBe('Corporate');
      expect(categorizeDepartment('Unknown')).toBe('Other');
    });
  });

  describe('formatDepartmentName', () => {
    it('should format department names for display', () => {
      expect(formatDepartmentName('FINANCE ACCOUNTING')).toBe('Finance Accounting');
      expect(formatDepartmentName('it general control')).toBe('It General Control');
      expect(formatDepartmentName('Departemen HR')).toBe('Hr');
    });
  });
});
