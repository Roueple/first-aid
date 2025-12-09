/**
 * Test script for CategoryService
 * Tests AI-powered categorization of audit findings
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
config();

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  await import('fs').then(fs => fs.promises.readFile('./serviceaccountKey.json', 'utf8'))
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Category definitions (same as in CategoryService)
const CATEGORY_DEFINITIONS = [
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'NPV & koridor discount' },
  { tipe: 'Housing', departemen: 'Marketing', kategori: 'Kelengkapan data konsumen' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'SPPJB' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'PBB' },
  { tipe: 'Housing', departemen: 'Legal', kategori: 'IMB' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Kualitas Bangunan' },
  { tipe: 'Housing', departemen: 'Konstruksi', kategori: 'Spesifikasi bangunan' },
  { tipe: 'Mall', departemen: 'Leasing', kategori: 'Surat konfirmasi sewa' },
  { tipe: 'Mall', departemen: 'Engineering', kategori: 'Tagihan utilities' },
  { tipe: 'Mall', departemen: 'Keuangan', kategori: 'Cash Opname' },
  // Add more as needed for testing
];

/**
 * Build categorization prompt
 */
function buildPrompt(riskArea, description) {
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
 * Categorize a single finding
 */
async function categorize(riskArea, description) {
  try {
    const prompt = buildPrompt(riskArea, description);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error categorizing:', error);
    return { categories: [], confidence: 0, reasoning: error.message };
  }
}

/**
 * Test with sample findings
 */
async function testCategorization() {
  console.log('🧪 Testing CategoryService\n');

  // Test cases
  const testCases = [
    {
      riskArea: 'Marketing',
      description: 'Discount yang diberikan melebihi koridor yang telah ditetapkan',
    },
    {
      riskArea: 'Legal',
      description: 'SPPJB belum ditandatangani oleh konsumen',
    },
    {
      riskArea: 'Konstruksi',
      description: 'Kualitas bangunan tidak sesuai spesifikasi',
    },
    {
      riskArea: 'Keuangan',
      description: 'Cash opname tidak dilakukan secara rutin',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test Case:`);
    console.log(`   Risk Area: ${testCase.riskArea}`);
    console.log(`   Description: ${testCase.description}`);
    
    const result = await categorize(testCase.riskArea, testCase.description);
    
    console.log(`\n✅ Result:`);
    console.log(`   Categories: ${result.categories.join(', ')}`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Reasoning: ${result.reasoning}`);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Test with real audit results from Firestore
 */
async function testWithRealData() {
  console.log('\n\n🔍 Testing with real audit results from Firestore\n');

  const snapshot = await db.collection('audit-results').limit(3).get();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`\n📋 Audit Result: ${doc.id}`);
    console.log(`   Risk Area: ${data.riskArea}`);
    console.log(`   Description: ${data.description?.substring(0, 100)}...`);
    
    const result = await categorize(data.riskArea, data.description);
    
    console.log(`\n✅ Result:`);
    console.log(`   Categories: ${result.categories.join(', ')}`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Reasoning: ${result.reasoning}`);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run tests
try {
  await testCategorization();
  await testWithRealData();
  console.log('\n\n✅ All tests completed!');
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
