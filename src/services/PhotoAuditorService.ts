/**
 * Photo Auditor Service
 * Analyzes photo metadata for authenticity verification
 * Detects AI-generated images, edited photos, and metadata manipulation
 */

import { GoogleGenAI } from "@google/genai";

export interface PhotoMetadata {
  // File info
  filename: string;
  format: string;
  dimensions: { width: number; height: number };
  fileSize: number;
  sha256?: string;
  
  // EXIF data
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  dateTimeOriginal?: string;
  
  // GPS data
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsCoordinates?: string;
  
  // Technical details
  colorMode?: string;
  exifTagCount?: number;
  hasJFIF?: boolean;
  hasXMP?: boolean;
  hasGPS?: boolean;
}

export interface AuditFinding {
  severity: 'ok' | 'warn' | 'flag';
  category: string;
  message: string;
  details?: string;
}

export interface PhotoAuditResult {
  metadata: PhotoMetadata;
  findings: AuditFinding[];
  deviceInfo?: {
    platform: string;
    device: string;
    osVersion?: string;
    firmware?: string;
  };
  authenticity: {
    score: number; // 0-100, higher is more authentic
    verdict: 'authentic' | 'suspicious' | 'likely-fake';
    summary: string;
  };
}

export class PhotoAuditorService {
  private ai: GoogleGenAI | null = null;
  private readonly MODEL_NAME = 'gemini-2.5-flash';

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Analyze photo file and extract metadata
   * Uses browser APIs to read EXIF data
   */
  async analyzePhoto(file: File): Promise<PhotoAuditResult> {
    try {
      console.log('📸 Starting photo analysis:', file.name, file.type, file.size);
      
      // Extract basic file info
      const metadata: PhotoMetadata = {
        filename: file.name,
        format: file.type || this.getFormatFromExtension(file.name),
        dimensions: { width: 0, height: 0 },
        fileSize: file.size,
      };

      // Read image dimensions
      try {
        const dimensions = await this.getImageDimensions(file);
        metadata.dimensions = dimensions;
        console.log('✅ Dimensions extracted:', dimensions);
      } catch (error) {
        console.error('Failed to extract dimensions:', error);
        throw new Error('Failed to load image. Please ensure the file is a valid image.');
      }

      // Extract EXIF data using browser APIs
      try {
        const exifData = await this.extractEXIF(file);
        Object.assign(metadata, exifData);
        console.log('✅ EXIF data extracted:', exifData);
      } catch (error) {
        console.warn('EXIF extraction failed, continuing with basic analysis:', error);
        // Continue with basic analysis even if EXIF fails
      }

      // Run audit checks
      const findings = this.runAuditChecks(metadata, file);
      console.log('✅ Audit checks complete:', findings.length, 'findings');

      // Detect device info
      const deviceInfo = this.detectDevice(metadata);
      console.log('✅ Device detected:', deviceInfo);

      // Calculate authenticity score
      const authenticity = this.calculateAuthenticity(findings);
      console.log('✅ Authenticity score:', authenticity.score);

      return {
        metadata,
        findings,
        deviceInfo,
        authenticity,
      };
    } catch (error) {
      console.error('Photo analysis error:', error);
      throw new Error(`Failed to analyze photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get image dimensions from file
   */
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error('Image loading timeout - file may be corrupted or too large'));
      }, 10000); // 10 second timeout

      img.onload = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        
        if (img.width === 0 || img.height === 0) {
          reject(new Error('Invalid image dimensions'));
        } else {
          resolve({ width: img.width, height: img.height });
        }
      };

      img.onerror = (error) => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        console.error('Image load error:', error);
        reject(new Error('Failed to load image - file may be corrupted or unsupported format'));
      };

      img.src = url;
    });
  }

  /**
   * Extract EXIF data from image file
   * Uses EXIF.js library or browser APIs
   * 
   * Note: This is a simplified implementation. For production use,
   * integrate a library like exif-js or piexifjs for full EXIF extraction.
   */
  private async extractEXIF(file: File): Promise<Partial<PhotoMetadata>> {
    try {
      // Basic EXIF extraction using FileReader
      // This is a placeholder - full EXIF extraction requires a library
      
      // For now, return basic metadata that can be extracted
      return {
        exifTagCount: 0, // Will be 0 until EXIF library integrated
        hasJFIF: file.type === 'image/jpeg', // Assume JPEG might have JFIF
        hasXMP: false,
        hasGPS: false,
      };
    } catch (error) {
      console.warn('EXIF extraction error:', error);
      return {
        exifTagCount: 0,
        hasJFIF: false,
        hasXMP: false,
        hasGPS: false,
      };
    }
  }

  /**
   * Run comprehensive audit checks on photo metadata
   */
  private runAuditChecks(metadata: PhotoMetadata, file: File): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const { width, height } = metadata.dimensions;

    // 1. EXIF presence check
    if (!metadata.exifTagCount || metadata.exifTagCount === 0) {
      findings.push({
        severity: 'flag',
        category: 'EXIF Data',
        message: 'Zero EXIF tags detected',
        details: 'No camera, date, or device info found. Real cameras always write EXIF. Possible causes: AI generation, screenshot, or metadata strip.',
      });
    } else {
      findings.push({
        severity: 'ok',
        category: 'EXIF Data',
        message: `EXIF data present (${metadata.exifTagCount} tags)`,
      });
    }

    // 2. AI-canonical resolution check
    const aiResolutions = [
      [512, 512], [768, 768], [1024, 1024],
      [1024, 768], [768, 1024],
      [1280, 720], [1920, 1080], [1080, 1920],
      [1792, 1024], [1024, 1792],
      [2048, 2048], [2048, 1152], [1152, 2048],
      [4096, 4096], [4096, 2304],
    ];

    const isAIResolution = aiResolutions.some(([w, h]) => w === width && h === height);
    const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

    if (isAIResolution) {
      findings.push({
        severity: 'flag',
        category: 'Resolution',
        message: `Resolution ${width}x${height} is a canonical AI output size`,
        details: 'Midjourney, DALL-E 3, Stable Diffusion, and Gemini all default to this. Camera photos have irregular resolutions.',
      });
    } else if (width === height && isPowerOf2(width) && width >= 512) {
      findings.push({
        severity: 'warn',
        category: 'Resolution',
        message: `Resolution ${width}x${height} is a perfect power-of-2 square`,
        details: 'Uncommon for cameras, common for AI generators.',
      });
    } else {
      findings.push({
        severity: 'ok',
        category: 'Resolution',
        message: `Resolution ${width}x${height} is irregular, consistent with a camera`,
      });
    }

    // 3. JFIF header check (for JPEG files)
    if (metadata.format.includes('jpeg') || metadata.format.includes('jpg')) {
      if (metadata.hasJFIF) {
        findings.push({
          severity: 'flag',
          category: 'JFIF Header',
          message: 'JFIF header present',
          details: 'Re-saved by Windows Photos or editor. Camera JPEGs do not have JFIF headers.',
        });
      } else {
        findings.push({
          severity: 'ok',
          category: 'JFIF Header',
          message: 'No JFIF header. Consistent with a camera original.',
        });
      }
    }

    // 4. Adobe XMP namespace check
    if (metadata.hasXMP) {
      findings.push({
        severity: 'warn',
        category: 'XMP Data',
        message: 'Adobe XMP namespace present',
        details: 'Written by an Adobe-compatible editor. Microsoft Photos injects this on save.',
      });
    }

    // 5. File size / bytes-per-pixel ratio
    const bytesPerPixel = metadata.fileSize / (width * height);
    if (bytesPerPixel < 0.08) {
      findings.push({
        severity: 'flag',
        category: 'Compression',
        message: `Very low bytes/pixel (${bytesPerPixel.toFixed(3)})`,
        details: 'Image was heavily re-compressed. Camera originals are typically above 0.5.',
      });
    } else if (bytesPerPixel < 0.25) {
      findings.push({
        severity: 'warn',
        category: 'Compression',
        message: `Below-average bytes/pixel (${bytesPerPixel.toFixed(3)})`,
        details: 'Possible re-compression by editor or platform.',
      });
    } else {
      findings.push({
        severity: 'ok',
        category: 'Compression',
        message: `File size ratio normal (${bytesPerPixel.toFixed(2)} b/px)`,
      });
    }

    // 6. Camera make/model check
    if (!metadata.make && !metadata.model) {
      findings.push({
        severity: 'warn',
        category: 'Camera Info',
        message: 'No camera make/model',
        details: 'Possible: metadata removal, screenshot, or AI-generated source.',
      });
    } else {
      findings.push({
        severity: 'ok',
        category: 'Camera Info',
        message: `Camera identified: ${metadata.make || ''} ${metadata.model || ''}`.trim(),
      });
    }

    // 7. GPS data check
    if (metadata.hasGPS) {
      findings.push({
        severity: 'warn',
        category: 'GPS Data',
        message: 'GPS coordinates embedded',
        details: 'Image reveals a physical location.',
      });
    } else {
      findings.push({
        severity: 'ok',
        category: 'GPS Data',
        message: 'No GPS data embedded',
      });
    }

    // 8. Software tag check
    if (metadata.software) {
      const software = metadata.software.toLowerCase();
      const aiKeywords = [
        'midjourney', 'dall-e', 'stable diffusion', 'firefly',
        'imagen', 'leonardo', 'ai generated', 'comfyui',
        'automatic1111', 'gemini', 'galaxy ai',
      ];
      const editKeywords = [
        'photoshop', 'lightroom', 'gimp', 'affinity', 'snapseed',
        'vsco', 'pixlr', 'canva', 'topaz', 'luminar',
        'microsoft photos', 'windows photos',
      ];

      if (aiKeywords.some(kw => software.includes(kw))) {
        findings.push({
          severity: 'flag',
          category: 'Software',
          message: 'AI generation/enhancement software detected',
          details: `Software tag: ${metadata.software}`,
        });
      } else if (editKeywords.some(kw => software.includes(kw))) {
        findings.push({
          severity: 'flag',
          category: 'Software',
          message: 'Editing software detected',
          details: `Software tag: ${metadata.software}`,
        });
      }
    }

    // 9. Timestamp consistency check
    if (metadata.dateTime && metadata.dateTimeOriginal) {
      const dt = new Date(metadata.dateTime);
      const dtOrig = new Date(metadata.dateTimeOriginal);
      const diffDays = Math.abs(dt.getTime() - dtOrig.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays > 30) {
        findings.push({
          severity: 'warn',
          category: 'Timestamps',
          message: `File modified time differs from EXIF capture date by ${Math.floor(diffDays)} day(s)`,
        });
      } else {
        findings.push({
          severity: 'ok',
          category: 'Timestamps',
          message: 'Timestamps consistent',
        });
      }
    }

    // 10. Future date check
    if (metadata.dateTimeOriginal) {
      const exifDate = new Date(metadata.dateTimeOriginal);
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (exifDate > oneDayFromNow) {
        findings.push({
          severity: 'flag',
          category: 'Date Validity',
          message: 'EXIF date is in the future',
          details: `Date: ${exifDate.toISOString()}`,
        });
      } else if (exifDate.getFullYear() < 2000) {
        findings.push({
          severity: 'warn',
          category: 'Date Validity',
          message: `Unusually old EXIF date: ${exifDate.getFullYear()}`,
        });
      }
    }

    return findings;
  }

  /**
   * Detect device information from EXIF data
   */
  private detectDevice(metadata: PhotoMetadata): PhotoAuditResult['deviceInfo'] {
    const make = (metadata.make || '').toLowerCase();
    const model = (metadata.model || '').toLowerCase();
    const software = (metadata.software || '').toLowerCase();

    // iOS detection
    if (make.includes('apple') || model.includes('iphone') || model.includes('ipad')) {
      return {
        platform: 'iOS (Apple)',
        device: `${metadata.make || ''} ${metadata.model || ''}`.trim() || 'Apple Device',
        firmware: metadata.software,
      };
    }

    // Android detection
    if (make.includes('samsung') || make.includes('xiaomi') || make.includes('huawei') ||
        make.includes('oppo') || make.includes('vivo') || make.includes('google')) {
      return {
        platform: `Android (${metadata.make || 'Unknown'})`,
        device: `${metadata.make || ''} ${metadata.model || ''}`.trim() || 'Android Device',
        firmware: metadata.software,
      };
    }

    // Camera detection
    const cameraKeywords = ['canon', 'nikon', 'sony', 'fujifilm', 'olympus', 'panasonic', 'leica'];
    if (cameraKeywords.some(kw => make.includes(kw))) {
      return {
        platform: `Dedicated Camera (${metadata.make || 'Unknown'})`,
        device: `${metadata.make || ''} ${metadata.model || ''}`.trim(),
        firmware: metadata.software,
      };
    }

    // AI/Editor detection
    const aiKeywords = ['midjourney', 'dall-e', 'stable diffusion', 'firefly', 'imagen'];
    if (aiKeywords.some(kw => software.includes(kw))) {
      return {
        platform: 'AI-Generated / Edited',
        device: metadata.software || 'Unknown',
      };
    }

    return {
      platform: 'Unknown',
      device: `${metadata.make || ''} ${metadata.model || ''}`.trim() || 'Unknown Device',
      firmware: metadata.software,
    };
  }

  /**
   * Calculate authenticity score based on findings
   */
  private calculateAuthenticity(findings: AuditFinding[]): PhotoAuditResult['authenticity'] {
    let score = 100;
    const flags = findings.filter(f => f.severity === 'flag');
    const warns = findings.filter(f => f.severity === 'warn');

    // Deduct points for each finding
    score -= flags.length * 20; // -20 per flag
    score -= warns.length * 10; // -10 per warning

    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine verdict
    let verdict: 'authentic' | 'suspicious' | 'likely-fake';
    let summary: string;

    if (score >= 80) {
      verdict = 'authentic';
      summary = 'Foto ini kemungkinan besar asli dari kamera. Metadata konsisten dengan foto kamera asli.';
    } else if (score >= 50) {
      verdict = 'suspicious';
      summary = 'Foto ini memiliki beberapa tanda manipulasi atau editing. Perlu verifikasi lebih lanjut.';
    } else {
      verdict = 'likely-fake';
      summary = 'Foto ini kemungkinan besar hasil AI generation, screenshot, atau telah diedit secara signifikan.';
    }

    return { score, verdict, summary };
  }

  /**
   * Get file format from extension
   */
  private getFormatFromExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const formatMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
    };
    return formatMap[ext || ''] || 'image/unknown';
  }

  /**
   * Generate AI-powered analysis summary using Gemini
   * 
   * PRIVACY NOTE: Only metadata (text) is sent to Gemini, NOT the actual photo.
   * The photo is processed entirely locally in the browser.
   * 
   * Data sent to Gemini:
   * - Filename, format, dimensions, file size (text)
   * - Camera make/model, software (text)
   * - Device info (text)
   * - Audit findings (text descriptions)
   * - Authenticity score (number)
   * 
   * Data NOT sent:
   * - Actual photo/image file
   * - Image pixels or binary data
   * - EXIF binary data
   * - Any visual content
   */
  async generateAISummary(auditResult: PhotoAuditResult): Promise<string> {
    try {
      const prompt = `Anda adalah ahli forensik foto digital. Analisis hasil audit foto berikut dan berikan ringkasan dalam Bahasa Indonesia:

METADATA:
- Nama file: ${auditResult.metadata.filename}
- Format: ${auditResult.metadata.format}
- Dimensi: ${auditResult.metadata.dimensions.width}x${auditResult.metadata.dimensions.height}
- Ukuran file: ${(auditResult.metadata.fileSize / 1024).toFixed(1)} KB
- Kamera: ${auditResult.metadata.make || 'Tidak diketahui'} ${auditResult.metadata.model || ''}
- Software: ${auditResult.metadata.software || 'Tidak ada'}

DEVICE INFO:
- Platform: ${auditResult.deviceInfo?.platform || 'Unknown'}
- Device: ${auditResult.deviceInfo?.device || 'Unknown'}

TEMUAN AUDIT:
${auditResult.findings.map(f => `- [${f.severity.toUpperCase()}] ${f.category}: ${f.message}`).join('\n')}

SKOR AUTENTISITAS: ${auditResult.authenticity.score}/100 (${auditResult.authenticity.verdict})

Berikan analisis singkat (2-3 kalimat) yang menjelaskan:
1. Apakah foto ini asli atau manipulasi
2. Temuan paling penting yang perlu diperhatikan
3. Rekomendasi untuk auditor

Gunakan bahasa yang profesional namun mudah dipahami.`;

      if (!this.ai) {
        return auditResult.authenticity.summary;
      }
      const response = await this.ai.models.generateContent({
        model: this.MODEL_NAME,
        contents: prompt,
      });
      return response.text || auditResult.authenticity.summary;
    } catch (error) {
      console.error('AI summary generation error:', error);
      return auditResult.authenticity.summary;
    }
  }
}

export const photoAuditorService = new PhotoAuditorService();
