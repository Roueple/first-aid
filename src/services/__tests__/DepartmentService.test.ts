import { describe, it, expect } from 'vitest';
import { DepartmentService } from '../DepartmentService';

describe('DepartmentService', () => {
  describe('normalizeName', () => {
    it('should remove department prefixes', () => {
      expect(DepartmentService.normalizeName('Departemen IT')).toBe('IT');
      expect(DepartmentService.normalizeName('Department Finance')).toBe('Finance');
      expect(DepartmentService.normalizeName('Departement HR')).toBe('HR');
    });

    it('should handle special characters', () => {
      expect(DepartmentService.normalizeName('Finance & Accounting')).toBe('Finance Accounting');
      expect(DepartmentService.normalizeName('IT - General Control')).toBe('IT General Control');
      expect(DepartmentService.normalizeName('Sales/Marketing')).toBe('Sales Marketing');
    });

    it('should collapse multiple spaces', () => {
      expect(DepartmentService.normalizeName('Finance   &   Accounting')).toBe('Finance Accounting');
    });

    it('should trim whitespace', () => {
      expect(DepartmentService.normalizeName('  IT  ')).toBe('IT');
    });

    it('should handle complex cases', () => {
      expect(
        DepartmentService.normalizeName('Departemen Finance & Accounting (FAD)')
      ).toBe('Finance Accounting FAD');
    });
  });

  describe('generateKeywords', () => {
    it('should extract meaningful keywords', () => {
      const keywords = DepartmentService.generateKeywords('IT General Control');
      expect(keywords).toContain('general');
      expect(keywords).toContain('control');
    });

    it('should filter out stopwords', () => {
      const keywords = DepartmentService.generateKeywords('Departemen IT dan Teknologi');
      expect(keywords).not.toContain('departemen');
      expect(keywords).not.toContain('dan');
    });

    it('should filter out short words', () => {
      const keywords = DepartmentService.generateKeywords('IT & HR');
      expect(keywords).not.toContain('&');
    });

    it('should include full normalized name', () => {
      const keywords = DepartmentService.generateKeywords('Finance Accounting');
      expect(keywords).toContain('finance_accounting');
    });

    it('should remove duplicates', () => {
      const keywords = DepartmentService.generateKeywords('Finance Finance Accounting');
      const financeCount = keywords.filter(k => k === 'finance').length;
      expect(financeCount).toBe(1);
    });

    it('should handle Indonesian words', () => {
      const keywords = DepartmentService.generateKeywords('Teknologi Informasi');
      expect(keywords).toContain('teknologi');
      expect(keywords).toContain('informasi');
    });
  });

  describe('categorize', () => {
    const service = new DepartmentService();

    it('should categorize IT departments', () => {
      expect(service['categorize']('IT')).toBe('IT');
      expect(service['categorize']('Teknologi Informasi')).toBe('IT');
      expect(service['categorize']('Information Technology')).toBe('IT');
      expect(service['categorize']('ICT')).toBe('IT');
    });

    it('should categorize Finance departments', () => {
      expect(service['categorize']('Finance')).toBe('Finance');
      expect(service['categorize']('Keuangan')).toBe('Finance');
      expect(service['categorize']('Accounting')).toBe('Finance');
      expect(service['categorize']('FAD')).toBe('Finance');
      expect(service['categorize']('Investasi')).toBe('Finance');
    });

    it('should categorize HR departments', () => {
      expect(service['categorize']('HR')).toBe('HR');
      expect(service['categorize']('HRD')).toBe('HR');
      expect(service['categorize']('HCM')).toBe('HR');
      expect(service['categorize']('Sumber Daya Manusia')).toBe('HR');
    });

    it('should categorize Marketing & Sales departments', () => {
      expect(service['categorize']('Marketing')).toBe('Marketing & Sales');
      expect(service['categorize']('Sales')).toBe('Marketing & Sales');
      expect(service['categorize']('HBD')).toBe('Marketing & Sales');
      expect(service['categorize']('Commercial')).toBe('Marketing & Sales');
    });

    it('should categorize Property Management departments', () => {
      expect(service['categorize']('Estate')).toBe('Property Management');
      expect(service['categorize']('Property Management')).toBe('Property Management');
      expect(service['categorize']('Building Management')).toBe('Property Management');
      expect(service['categorize']('Tenant Leasing')).toBe('Property Management');
      expect(service['categorize']('Tanah')).toBe('Property Management');
    });

    it('should categorize Engineering & Construction departments', () => {
      expect(service['categorize']('Engineering')).toBe('Engineering & Construction');
      expect(service['categorize']('Teknik')).toBe('Engineering & Construction');
      expect(service['categorize']('QS')).toBe('Engineering & Construction');
      expect(service['categorize']('Konstruksi')).toBe('Engineering & Construction');
      expect(service['categorize']('GCM')).toBe('Engineering & Construction');
    });

    it('should categorize Legal & Compliance departments', () => {
      expect(service['categorize']('Legal')).toBe('Legal & Compliance');
      expect(service['categorize']('Hukum')).toBe('Legal & Compliance');
    });

    it('should categorize Audit & Risk departments', () => {
      expect(service['categorize']('Audit')).toBe('Audit & Risk');
      expect(service['categorize']('APU PPT')).toBe('Audit & Risk');
      expect(service['categorize']('Risk Management')).toBe('Audit & Risk');
    });

    it('should categorize Operations departments', () => {
      expect(service['categorize']('Operations')).toBe('Operations');
      expect(service['categorize']('Umum')).toBe('Operations');
      expect(service['categorize']('Housekeeping')).toBe('Operations');
      expect(service['categorize']('Front Office')).toBe('Operations');
    });

    it('should categorize Hospitality & F&B departments', () => {
      expect(service['categorize']('Food & Beverage')).toBe('Hospitality & F&B');
      expect(service['categorize']('Golf Operation')).toBe('Hospitality & F&B');
      expect(service['categorize']('Villa')).toBe('Hospitality & F&B');
      expect(service['categorize']('Food Court')).toBe('Hospitality & F&B');
    });

    it('should categorize Healthcare departments', () => {
      expect(service['categorize']('Medis')).toBe('Healthcare');
      expect(service['categorize']('Keperawatan')).toBe('Healthcare');
      expect(service['categorize']('ICD')).toBe('Healthcare');
    });

    it('should categorize Insurance & Actuarial departments', () => {
      expect(service['categorize']('Actuary')).toBe('Insurance & Actuarial');
      expect(service['categorize']('Underwriting')).toBe('Insurance & Actuarial');
    });

    it('should categorize CSR & Community departments', () => {
      expect(service['categorize']('CSR')).toBe('CSR & Community');
      expect(service['categorize']('Pendidikan')).toBe('CSR & Community');
    });

    it('should categorize Security departments', () => {
      expect(service['categorize']('Security')).toBe('Security');
      expect(service['categorize']('Keamanan')).toBe('Security');
    });

    it('should categorize Corporate departments', () => {
      expect(service['categorize']('Corporate')).toBe('Corporate');
    });

    it('should categorize Supply Chain departments', () => {
      expect(service['categorize']('FFB Supplies')).toBe('Supply Chain & Procurement');
      expect(service['categorize']('TBS dan Sortasi')).toBe('Supply Chain & Procurement');
    });

    it('should categorize Academic departments', () => {
      expect(service['categorize']('Akademik')).toBe('Academic & Administration');
      expect(service['categorize']('Mahasiswa')).toBe('Academic & Administration');
    });

    it('should categorize Outsourcing departments', () => {
      expect(service['categorize']('Outsource')).toBe('Outsourcing & Third Party');
      expect(service['categorize']('Pihak Ketiga')).toBe('Outsourcing & Third Party');
    });

    it('should categorize Planning & Development departments', () => {
      expect(service['categorize']('Perencanaan')).toBe('Planning & Development');
      expect(service['categorize']('FSD')).toBe('Planning & Development');
      expect(service['categorize']('FDD')).toBe('Planning & Development');
    });

    it('should default to Other', () => {
      expect(service['categorize']('Unknown Department')).toBe('Other');
      expect(service['categorize']('FEH')).toBe('Other');
    });
  });
});
