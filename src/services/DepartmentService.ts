import DatabaseService from './DatabaseService';
import { Timestamp } from 'firebase/firestore';

/**
 * Normalized department with searchable keywords
 */
export interface Department {
  id?: string;
  name: string; // Normalized name
  originalNames: string[]; // All variations found in data
  keywords: string[]; // Searchable keywords
  category?: string; // Optional categorization (IT, Finance, etc.)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Service for managing normalized departments
 */
export class DepartmentService extends DatabaseService<Department> {
  private static readonly STOPWORDS = new Set([
    'departemen',
    'department',
    'departement',
    'dan',
    'dengan',
    'pihak',
    'ketiga',
    'unit',
    'biro',
  ]);

  constructor() {
    super('departments');
  }

  /**
   * Normalize a raw department name
   */
  static normalizeName(rawName: string): string {
    return rawName
      .trim()
      .replace(/[\/\-,\(\)&]/g, ' ') // Replace special chars with space
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/^(Departemen|Department|Departement)\s+/i, '') // Remove prefix
      .trim();
  }

  /**
   * Generate searchable keywords from department name
   */
  static generateKeywords(name: string): string[] {
    const normalized = name.toLowerCase();
    const words = normalized.match(/\w+/g) || [];
    
    // Filter out stopwords and short words
    const keywords = words.filter(
      (word) => word.length > 2 && !this.STOPWORDS.has(word)
    );

    // Add the full normalized name as a keyword too
    const fullKeyword = normalized.replace(/\s+/g, '_');
    if (fullKeyword.length > 2) {
      keywords.push(fullKeyword);
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Find department by any keyword
   */
  async findByKeyword(keyword: string): Promise<Department[]> {
    const normalizedKeyword = keyword.toLowerCase().trim();
    return await this.getAll({
      filters: [
        { field: 'keywords', operator: 'array-contains', value: normalizedKeyword },
      ],
    });
  }

  /**
   * Find or create department from raw name
   */
  async findOrCreate(rawName: string, userId?: string): Promise<Department> {
    const normalized = DepartmentService.normalizeName(rawName);
    const keywords = DepartmentService.generateKeywords(normalized);

    // Try to find existing department by keywords
    const existing = await this.getAll({
      filters: [
        { field: 'keywords', operator: 'array-contains', value: keywords[0] },
      ],
      limit: 1,
    });

    if (existing.length > 0) {
      const dept = existing[0];
      
      // Update if this raw name isn't already tracked
      if (!dept.originalNames.includes(rawName)) {
        dept.originalNames.push(rawName);
        dept.updatedAt = Timestamp.now();
        await this.update(dept.id!, dept, userId);
      }
      
      return dept;
    }

    // Create new department
    const newDept: Department = {
      name: normalized,
      originalNames: [rawName],
      keywords,
      category: this.categorize(normalized),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const id = await this.create(newDept, userId);
    return { ...newDept, id };
  }

  /**
   * Auto-categorize department based on keywords
   * Includes real estate and business domain knowledge
   * Order matters: more specific categories first
   */
  private categorize(name: string): string {
    const lower = name.toLowerCase();

    // Hospitality & F&B (check before Operations to catch "golf operation")
    if (
      lower.includes('food') ||
      lower.includes('beverage') ||
      lower.includes('f&b') ||
      lower.includes('fnb') ||
      lower.includes('restaurant') ||
      lower.includes('hotel') ||
      lower.includes('hospitality') ||
      lower.includes('golf') ||
      lower.includes('club') ||
      lower.includes('villa') ||
      lower.includes('food court') ||
      lower.includes('fc')
    ) {
      return 'Hospitality & F&B';
    }

    // Outsourcing & Third Party (check early)
    if (
      lower.includes('outsource') ||
      lower.includes('third party') ||
      lower.includes('pihak ketiga') ||
      lower.includes('vendor') ||
      lower.includes('suplemen')
    ) {
      return 'Outsourcing & Third Party';
    }

    // IT & Technology
    if (
      lower.match(/\bit\b/) ||
      lower.includes('teknologi') ||
      lower.includes('informasi') ||
      lower.includes('technology') ||
      lower.includes('ict') ||
      lower.includes('sistem informasi')
    ) {
      return 'IT';
    }

    // Finance & Accounting
    if (
      lower.includes('finance') ||
      lower.includes('keuangan') ||
      lower.includes('accounting') ||
      lower.includes('fad') ||
      lower.includes('treasury') ||
      lower.includes('investasi') ||
      lower.includes('investment')
    ) {
      return 'Finance';
    }

    // HR & People Management
    if (
      lower.includes('hr') ||
      lower.includes('hrd') ||
      lower.includes('hcm') ||
      lower.includes('sdm') ||
      lower.includes('sumber daya manusia') ||
      lower.includes('people') ||
      lower.includes('talent')
    ) {
      return 'HR';
    }

    // Marketing & Sales
    if (
      lower.includes('marketing') ||
      lower.includes('sales') ||
      lower.includes('hbd') ||
      lower.includes('promotion') ||
      lower.includes('admission') ||
      lower.includes('commercial')
    ) {
      return 'Marketing & Sales';
    }

    // Property & Estate Management
    if (
      lower.includes('estate') ||
      lower.includes('property') ||
      lower.includes('building management') ||
      lower.includes('building operation') ||
      lower.includes('tenant') ||
      lower.includes('leasing') ||
      lower.includes('tanah') ||
      lower.includes('land')
    ) {
      return 'Property Management';
    }

    // Engineering & Construction
    if (
      lower.includes('engineering') ||
      lower.includes('teknik') ||
      lower.includes('konstruksi') ||
      lower.includes('construction') ||
      lower.includes('qs') ||
      lower.includes('quantity surveyor') ||
      lower.includes('maintenance') ||
      lower.includes('gcm')
    ) {
      return 'Engineering & Construction';
    }

    // Legal & Compliance
    if (
      lower.includes('legal') ||
      lower.includes('hukum') ||
      lower.includes('compliance') ||
      lower.includes('regulatory')
    ) {
      return 'Legal & Compliance';
    }

    // Audit & Risk Management
    if (
      lower.includes('audit') ||
      lower.includes('risk') ||
      lower.includes('risiko') ||
      lower.includes('apu') ||
      lower.includes('ppt') ||
      lower.includes('internal control')
    ) {
      return 'Audit & Risk';
    }

    // Planning & Development
    if (
      lower.includes('perencanaan') ||
      lower.includes('planning') ||
      lower.includes('development') ||
      lower.includes('fsd') ||
      lower.includes('fdd')
    ) {
      return 'Planning & Development';
    }

    // Healthcare & Medical
    if (
      lower.includes('medis') ||
      lower.includes('medical') ||
      lower.includes('health') ||
      lower.includes('kesehatan') ||
      lower.includes('keperawatan') ||
      lower.includes('nursing') ||
      lower.includes('icd') ||
      lower.includes('penunjang medis')
    ) {
      return 'Healthcare';
    }

    // Insurance & Actuarial
    if (
      lower.includes('actuary') ||
      lower.includes('actuarial') ||
      lower.includes('underwriting') ||
      lower.includes('insurance') ||
      lower.includes('asuransi') ||
      lower.includes('klaim')
    ) {
      return 'Insurance & Actuarial';
    }

    // CSR & Community
    if (
      lower.includes('csr') ||
      lower.includes('community') ||
      lower.includes('social') ||
      lower.includes('responsibility') ||
      lower.includes('pendidikan') ||
      lower.includes('education')
    ) {
      return 'CSR & Community';
    }

    // Security
    if (lower.includes('security') || lower.includes('keamanan')) {
      return 'Security';
    }

    // Corporate/Executive
    if (
      lower.includes('corporate') ||
      lower.includes('executive') ||
      lower.includes('board') ||
      lower.includes('direksi')
    ) {
      return 'Corporate';
    }

    // Supply Chain & Procurement
    if (
      lower.includes('supply') ||
      lower.includes('procurement') ||
      lower.includes('purchasing') ||
      lower.includes('logistic') ||
      lower.includes('warehouse') ||
      lower.includes('ffb') ||
      lower.includes('tbs') ||
      lower.includes('sortasi')
    ) {
      return 'Supply Chain & Procurement';
    }

    // Academic & Administration
    if (
      lower.includes('akademik') ||
      lower.includes('academic') ||
      lower.includes('mahasiswa') ||
      lower.includes('student') ||
      lower.includes('alumni') ||
      lower.includes('biro administrasi')
    ) {
      return 'Academic & Administration';
    }

    // Operations & General Affairs (check last as it's most general)
    if (
      lower.includes('operation') ||
      lower.includes('operasi') ||
      lower.includes('umum') ||
      lower.includes('general affairs') ||
      lower.includes('ga') ||
      lower.includes('housekeeping') ||
      lower.includes('house keeping') ||
      lower.includes('front office') ||
      lower.includes('customer service') ||
      lower.includes('layanan pelanggan')
    ) {
      return 'Operations';
    }

    if (lower.includes('feh')) {
      return 'Other';
    }

    return 'Other';
  }

  /**
   * Get all unique department names (for dropdowns)
   */
  async getAllNames(): Promise<string[]> {
    const departments = await this.getAll({
      sorts: [{ field: 'name', direction: 'asc' }],
    });
    return departments.map((d) => d.name);
  }

  /**
   * Search departments by partial name match
   */
  async searchByName(query: string): Promise<Department[]> {
    const allDepts = await this.getAll();
    const lowerQuery = query.toLowerCase();
    
    return allDepts.filter((dept) =>
      dept.name.toLowerCase().includes(lowerQuery) ||
      dept.originalNames.some((name) => name.toLowerCase().includes(lowerQuery)) ||
      dept.keywords.some((kw) => kw.includes(lowerQuery))
    );
  }

  /**
   * Get departments by category
   */
  async getByCategory(category: string): Promise<Department[]> {
    return await this.getAll({
      filters: [{ field: 'category', operator: '==', value: category }],
      sorts: [{ field: 'name', direction: 'asc' }],
    });
  }

  /**
   * Merge duplicate departments
   */
  async mergeDepartments(
    keepId: string,
    mergeIds: string[],
    userId?: string
  ): Promise<void> {
    const keepDept = await this.getById(keepId);
    if (!keepDept) throw new Error('Department to keep not found');

    for (const mergeId of mergeIds) {
      const mergeDept = await this.getById(mergeId);
      if (!mergeDept) continue;

      // Merge original names and keywords
      keepDept.originalNames = [
        ...new Set([...keepDept.originalNames, ...mergeDept.originalNames]),
      ];
      keepDept.keywords = [
        ...new Set([...keepDept.keywords, ...mergeDept.keywords]),
      ];

      // Delete the merged department
      await this.delete(mergeId, userId);
    }

    // Update the kept department
    keepDept.updatedAt = Timestamp.now();
    await this.update(keepId, keepDept, userId);
  }
}

export default new DepartmentService();
