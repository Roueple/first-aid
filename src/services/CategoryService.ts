/**
 * CategoryService
 * 
 * AI-powered categorization service for audit findings.
 * Uses Gemini AI to analyze risk area and description, then assigns relevant category tags.
 */

import { sendMessageToGemini, isGeminiConfigured } from './GeminiService';
import type { CategoryDefinition, CategorizationResult, CachedCategorization } from '../types/category.types';

// Category reference data - comprehensive list of all possible categories
const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'NPV & koridor discount' },
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'Kelengkapan data konsumen' },
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'Barang Promosi' },
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'Souvenir' },
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'Rumah Contoh' },
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'Perhitungan komisi' },
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'Digital Marketing' },
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'Lain-lain' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'PPATK' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'SPPJB' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'PBB' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'PBG' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'Ganti nama' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'Alih hak' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'Tertib input data' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'Proses AJB' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'Lain-lain' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'SHGB' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'IMB' },
  { tipe: 'Housing', departemen: 'QS', kategori: 'Klasifikasi jenis pekerjaan' },
  { tipe: 'Housing', departemen: 'QS', kategori: 'Proses tender' },
  { tipe: 'Housing', departemen: 'QS', kategori: 'Koridor approval' },
  { tipe: 'Housing', departemen: 'QS', kategori: 'Pekerjaan Tambah' },
  { tipe: 'Housing', departemen: 'QS', kategori: 'Potongan PPH-SBU' },
  { tipe: 'Housing', departemen: 'QS', kategori: 'Termin pembayaran' },
  { tipe: 'Housing', departemen: 'QS', kategori: 'Lain-lain' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Kualitas Bangunan' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Spesifikasi bangunan' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Ketidaksesuaian spesifikasi' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Volume Pekerjaan tidak sesuai' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Update progress lapangan' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Penilaian bobot' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Pekerjaan Tambah' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Lain-lain' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'Tunggakan air' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'Tarif air' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'Observasi kawasan' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'Ubah design dan renovasi' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'Tagihan tenant pasar' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'Serah Terima' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'Perijinan' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'Lain-lain' },
  { tipe: 'Housing', departemen: 'Estate', kategori: 'ST' },
  { tipe: 'Housing', departemen: 'Waterpark', kategori: 'Perjanjian kerja sama tenant' },
  { tipe: 'Housing', departemen: 'Club house', kategori: 'Penerimaan bagi hasil dan sewa' },
  { tipe: 'Housing', departemen: 'Club house', kategori: 'kualitas air kolam renang' },
  { tipe: 'Housing', departemen: 'Club house', kategori: 'observasi kawasan' },
  { tipe: 'Housing', departemen: 'Club house', kategori: 'Lain-Lain' },
  { tipe: 'Housing', departemen: 'Keuangan', kategori: 'Cash Opname' },
  { tipe: 'Housing', departemen: 'Keuangan', kategori: 'Penerbitan Cheque' },
  { tipe: 'Housing', departemen: 'Keuangan', kategori: 'Time Deposit' },
  { tipe: 'Housing', departemen: 'Keuangan', kategori: 'Escrow KPR' },
  { tipe: 'Housing', departemen: 'Keuangan', kategori: 'Long outstanding akun titipan' },
  { tipe: 'Housing', departemen: 'Keuangan', kategori: 'Recalculate Biaya Penyusutan' },
  { tipe: 'Housing', departemen: 'Keuangan', kategori: 'Aging schedule' },
  { tipe: 'Housing', departemen: 'Keuangan', kategori: 'Lain-lain' },
  { tipe: 'Housing', departemen: 'HCM', kategori: 'Kontrak kerja karyawan' },
  { tipe: 'Housing', departemen: 'HCM', kategori: 'Tanda kasih' },
  { tipe: 'Housing', departemen: 'HCM', kategori: 'BPJS dan Asuransi' },
  { tipe: 'Housing', departemen: 'HCM', kategori: 'Medical non asuransi' },
  { tipe: 'Housing', departemen: 'HCM', kategori: 'Clearance sheet dan parklaring' },
  { tipe: 'Housing', departemen: 'HCM', kategori: 'Opname asset' },
  { tipe: 'Housing', departemen: 'HCM', kategori: 'Lain-lain' },
  { tipe: 'Mall', departemen: 'Leasing', kategori: 'Surat konfirmasi sewa' },
  { tipe: 'Mall', departemen: 'Legal', kategori: 'Surat perjanjian' },
  { tipe: 'Mall', departemen: 'Legal', kategori: 'Discount rate & Grace period' },
  { tipe: 'Mall', departemen: 'TDC', kategori: 'fit out dan deposit' },
  { tipe: 'Mall', departemen: 'TDC', kategori: 'Observasi tenant' },
  { tipe: 'Mall', departemen: 'TDC', kategori: 'Lain-Lain' },
  { tipe: 'Mall', departemen: 'Promosi', kategori: 'Surat konfirmasi pameran' },
  { tipe: 'Mall', departemen: 'Promosi', kategori: 'Barang promosi' },
  { tipe: 'Mall', departemen: 'Promosi', kategori: 'member loyalti program' },
  { tipe: 'Mall', departemen: 'Promosi', kategori: 'Pembayaran deposit' },
  { tipe: 'Mall', departemen: 'Promosi', kategori: 'Barter pameran' },
  { tipe: 'Mall', departemen: 'Promosi', kategori: 'Lain-Lain' },
  { tipe: 'Mall', departemen: 'Food Court', kategori: 'Surat konfirmasi sewa' },
  { tipe: 'Mall', departemen: 'Food Court', kategori: 'Perhitungan sewa & Bg hasil' },
  { tipe: 'Mall', departemen: 'Food Court', kategori: 'Lain-Lain' },
  { tipe: 'Mall', departemen: 'House keeping', kategori: 'Observasi kebersihan' },
  { tipe: 'Mall', departemen: 'House keeping', kategori: 'Kontrak dengan pihak 3' },
  { tipe: 'Mall', departemen: 'House keeping', kategori: 'Lanscape' },
  { tipe: 'Mall', departemen: 'House keeping', kategori: 'Lain-Lain' },
  { tipe: 'Mall', departemen: 'Building Operation', kategori: 'Perhitungan hasil parkir' },
  { tipe: 'Mall', departemen: 'Building Operation', kategori: 'APAR' },
  { tipe: 'Mall', departemen: 'Building Operation', kategori: 'Heat detector' },
  { tipe: 'Mall', departemen: 'Building Operation', kategori: 'Hydrant' },
  { tipe: 'Mall', departemen: 'Building Operation', kategori: 'Security' },
  { tipe: 'Mall', departemen: 'Building Operation', kategori: 'Lain-Lain' },
  { tipe: 'Mall', departemen: 'Engineering', kategori: 'Tagihan utilities' },
  { tipe: 'Mall', departemen: 'Engineering', kategori: 'Terra meteran air, listrik, gas' },
  { tipe: 'Mall', departemen: 'Engineering', kategori: 'Lift dan escalator' },
  { tipe: 'Mall', departemen: 'Engineering', kategori: 'opname gudang engineering' },
  { tipe: 'Mall', departemen: 'Engineering', kategori: 'CCTV' },
  { tipe: 'Mall', departemen: 'Engineering', kategori: 'Lain-Lain' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Cash Opname' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Penerbitan Cheque' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Time Deposit' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Early termination' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Proses pembelian PR, tender PO, GR' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Long outstanding akun titipan' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Recalculate Biaya Penyusutan' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Lain-lain' },
  { tipe: 'Mall', departemen: 'HCM', kategori: 'Kontrak kerja karyawan' },
  { tipe: 'Mall', departemen: 'HCM', kategori: 'Tanda kasih' },
  { tipe: 'Mall', departemen: 'HCM', kategori: 'BPJS dan Asuransi' },
  { tipe: 'Mall', departemen: 'HCM', kategori: 'Medical non asuransi' },
  { tipe: 'Mall', departemen: 'HCM', kategori: 'Clearance sheet dan parklaring' },
  { tipe: 'Mall', departemen: 'HCM', kategori: 'Ijazah Traning' },
  { tipe: 'Mall', departemen: 'HCM', kategori: 'Opname asset' },
  { tipe: 'Mall', departemen: 'HCM', kategori: 'Lain-lain' },
  { tipe: 'Hotel', departemen: 'HCM', kategori: 'Kontrak kerja' },
  { tipe: 'Hotel', departemen: 'HCM', kategori: 'Ijazah Training' },
  { tipe: 'Hotel', departemen: 'HCM', kategori: 'Observasi' },
  { tipe: 'Hotel', departemen: 'HCM', kategori: 'Lain-lain' },
  { tipe: 'Hotel', departemen: 'Keuangan', kategori: 'Time Depo' },
  { tipe: 'Hotel', departemen: 'Keuangan', kategori: 'Cash Opname' },
  { tipe: 'Hotel', departemen: 'Keuangan', kategori: 'Long outstanding' },
  { tipe: 'Hotel', departemen: 'Keuangan', kategori: 'Lain-lain' },
];

// In-memory cache for categorization results
const categorizationCache = new Map<string, CachedCategorization>();

class CategoryService {
  /**
   * Get all available category definitions
   */
  getCategoryDefinitions(): CategoryDefinition[] {
    return CATEGORY_DEFINITIONS;
  }

  /**
   * Get unique tipe values
   */
  getTypes(): string[] {
    return [...new Set(CATEGORY_DEFINITIONS.map(c => c.tipe))];
  }

  /**
   * Get unique departemen values for a given tipe
   */
  getDepartments(tipe?: string): string[] {
    const filtered = tipe 
      ? CATEGORY_DEFINITIONS.filter(c => c.tipe === tipe)
      : CATEGORY_DEFINITIONS;
    return [...new Set(filtered.map(c => c.departemen))];
  }

  /**
   * Get unique kategori values for a given tipe and/or departemen
   */
  getCategories(tipe?: string, departemen?: string): string[] {
    let filtered = CATEGORY_DEFINITIONS;
    if (tipe) filtered = filtered.filter(c => c.tipe === tipe);
    if (departemen) filtered = filtered.filter(c => c.departemen === departemen);
    return [...new Set(filtered.map(c => c.kategori))];
  }

  /**
   * Generate cache key for a risk area and description
   */
  private getCacheKey(riskArea: string, description: string): string {
    return `${riskArea}::${description}`.toLowerCase().trim();
  }

  /**
   * Check if categorization is cached
   */
  private getCachedResult(riskArea: string, description: string): CategorizationResult | null {
    const key = this.getCacheKey(riskArea, description);
    const cached = categorizationCache.get(key);
    
    if (cached) {
      // Cache is valid for 30 days
      const age = Date.now() - cached.timestamp.getTime();
      if (age < 30 * 24 * 60 * 60 * 1000) {
        console.log('✅ Using cached categorization');
        return cached.result;
      } else {
        categorizationCache.delete(key);
      }
    }
    
    return null;
  }

  /**
   * Cache categorization result
   */
  private cacheResult(riskArea: string, description: string, result: CategorizationResult): void {
    const key = this.getCacheKey(riskArea, description);
    categorizationCache.set(key, {
      riskArea,
      description,
      result,
      timestamp: new Date(),
    });
  }

  /**
   * Categorize an audit finding using AI
   * 
   * @param riskArea - The risk area field from audit result
   * @param description - The description field from audit result
   * @returns Categorization result with tags and confidence score
   */
  async categorize(riskArea: string, description: string): Promise<CategorizationResult> {
    // Check cache first
    const cached = this.getCachedResult(riskArea, description);
    if (cached) {
      return cached;
    }

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      console.warn('⚠️ Gemini not configured, returning empty categorization');
      return {
        categories: [],
        confidence: 0,
        reasoning: 'Gemini AI not configured',
      };
    }

    try {
      const prompt = this.buildCategorizationPrompt(riskArea, description);
      const response = await sendMessageToGemini(prompt, 'high');
      const result = this.parseCategorizationResponse(response);
      
      // Cache the result
      this.cacheResult(riskArea, description, result);
      
      return result;
    } catch (error) {
      console.error('Error categorizing finding:', error);
      return {
        categories: [],
        confidence: 0,
        reasoning: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build the AI prompt for categorization
   */
  private buildCategorizationPrompt(riskArea: string, description: string): string {
    // Format category definitions for the prompt
    const categoryList = CATEGORY_DEFINITIONS
      .map(c => `${c.tipe} > ${c.departemen} > ${c.kategori}`)
      .join('\n');

    return `You are an expert in Indonesian real estate audit categorization. Analyze the following audit finding and assign the most relevant category tags.

**Available Categories:**
${categoryList}

**Audit Finding:**
- Risk Area: ${riskArea}
- Description: ${description}

**Instructions:**
1. Analyze the risk area and description carefully
2. Select 1-3 most relevant categories from the list above
3. Categories should be in format: "Tipe > Departemen > Kategori"
4. Provide a confidence score (0-100)
5. Briefly explain your reasoning

**Response Format (JSON):**
{
  "categories": ["Housing > Marketing > NPV & koridor discount"],
  "confidence": 85,
  "reasoning": "Brief explanation of why these categories were chosen"
}

Respond ONLY with valid JSON, no additional text.`;
  }

  /**
   * Parse AI response into categorization result
   */
  private parseCategorizationResponse(response: string): CategorizationResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        reasoning: parsed.reasoning || undefined,
      };
    } catch (error) {
      console.error('Error parsing categorization response:', error);
      console.error('Response was:', response);
      return {
        categories: [],
        confidence: 0,
        reasoning: 'Failed to parse AI response',
      };
    }
  }

  /**
   * Batch categorize multiple findings
   * Processes in batches to avoid rate limits
   */
  async batchCategorize(
    findings: Array<{ riskArea: string; description: string }>,
    batchSize: number = 10,
    delayMs: number = 1000
  ): Promise<CategorizationResult[]> {
    const results: CategorizationResult[] = [];
    
    for (let i = 0; i < findings.length; i += batchSize) {
      const batch = findings.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(findings.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(f => this.categorize(f.riskArea, f.description))
      );
      
      results.push(...batchResults);
      
      // Delay between batches to avoid rate limits
      if (i + batchSize < findings.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return results;
  }

  /**
   * Clear categorization cache
   */
  clearCache(): void {
    categorizationCache.clear();
    console.log('🗑️ Categorization cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ riskArea: string; categories: string[] }> } {
    const entries = Array.from(categorizationCache.values()).map(c => ({
      riskArea: c.riskArea,
      categories: c.result.categories,
    }));
    
    return {
      size: categorizationCache.size,
      entries,
    };
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
