#!/usr/bin/env node

/**
 * Test AI-powered department category matching
 * Tests the new Gemini-based category matching logic
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load credentials
const serviceAccount = JSON.parse(readFileSync('./serviceaccountKey.json', 'utf8'));
const envContent = readFileSync('./.env', 'utf8');
const apiKey = envContent.match(/VITE_GEMINI_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error('❌ VITE_GEMINI_API_KEY not found in .env');
  process.exit(1);
}

// Initialize Firebase
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Test department category matching with Gemini
 */
async function testDepartmentMatching(userQuery) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: "${userQuery}"`);
  console.log('='.repeat(80));

  try {
    // Available categories (from DepartmentService)
    const CATEGORIES = [
      'IT',
      'Finance',
      'HR',
      'Marketing & Sales',
      'Property Management',
      'Engineering & Construction',
      'Legal & Compliance',
      'Audit & Risk',
      'Planning & Development',
      'Healthcare',
      'Insurance & Actuarial',
      'CSR & Community',
      'Security',
      'Corporate',
      'Supply Chain & Procurement',
      'Academic & Administration',
      'Operations',
      'Hospitality & F&B',
      'Outsourcing & Third Party',
      'Other'
    ];

    console.log(`📋 Using ${CATEGORIES.length} predefined categories`);

    // Ask Gemini to match user query to categories
    const prompt = `You are a department category matcher for an Indonesian audit system.

USER QUERY: "${userQuery}"

AVAILABLE CATEGORIES:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

CATEGORY DESCRIPTIONS:
- IT: Information Technology, ICT, Teknologi Informasi
- Finance: Keuangan, Accounting, FAD, Treasury, Investment
- HR: Human Capital, HRD, HCM, SDM, Sumber Daya Manusia, People Management
- Marketing & Sales: Marketing, Sales, HBD, Promotion, Commercial
- Property Management: Estate, Building Management, Tenant, Leasing
- Engineering & Construction: Teknik, Konstruksi, QS, Maintenance
- Legal & Compliance: Hukum, Legal, Regulatory
- Audit & Risk: Audit Internal, Risk Management, APU, PPT
- Planning & Development: Perencanaan, FSD, FDD
- Healthcare: Medis, Medical, Health, Kesehatan, Nursing
- Insurance & Actuarial: Actuarial, Underwriting, Asuransi
- CSR & Community: Corporate Social Responsibility, Community, Education
- Security: Keamanan, Security
- Corporate: Executive, Board, Direksi
- Supply Chain & Procurement: Procurement, Purchasing, Logistics, Warehouse
- Academic & Administration: Akademik, Student Affairs, Alumni
- Operations: Operasi, General Affairs, Housekeeping, Customer Service
- Hospitality & F&B: Food & Beverage, Restaurant, Hotel, Golf, Club
- Outsourcing & Third Party: Vendor, Pihak Ketiga
- Other: Miscellaneous departments

Analyze the user's query and determine which category(ies) match their intent.

MATCHING RULES:
- Match based on keywords, abbreviations, and Indonesian terms
- "HC" or "Human Capital" → HR
- "IT" → IT
- "Finance" or "Keuangan" → Finance
- Be flexible with variations
- Return empty array if no clear match

Return a JSON object:
{
  "matchedCategories": ["Category 1", "Category 2", ...],
  "reasoning": "brief explanation"
}

EXAMPLES:
Query: "HC" → {"matchedCategories": ["HR"], "reasoning": "HC is Human Capital"}
Query: "IT" → {"matchedCategories": ["IT"], "reasoning": "IT department"}
Query: "Finance" → {"matchedCategories": ["Finance"], "reasoning": "Finance department"}

Return ONLY the JSON object.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Parse response
    let jsonText = responseText;
    if (responseText.includes('```')) {
      const match = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (match) jsonText = match[1];
    }

    const parsed = JSON.parse(jsonText);
    const matchedCategories = parsed.matchedCategories || [];

    console.log(`\n🎯 Gemini matched ${matchedCategories.length} categories:`);
    matchedCategories.forEach(cat => console.log(`   - ${cat}`));
    console.log(`\n💡 Reasoning: ${parsed.reasoning}`);

    // Fetch departments by matched categories
    const allMatchedNames = [];
    for (const category of matchedCategories) {
      const deptSnapshot = await db.collection('departments')
        .where('category', '==', category)
        .get();
      
      console.log(`   📂 Category "${category}": ${deptSnapshot.size} departments`);
      
      deptSnapshot.docs.forEach(doc => {
        const originalNames = doc.data().originalNames || [];
        allMatchedNames.push(...originalNames);
      });
    }

    const uniqueNames = [...new Set(allMatchedNames)];
    console.log(`\n📋 Final department names for filtering (${uniqueNames.length}):`);
    uniqueNames.slice(0, 10).forEach(name => console.log(`   - ${name}`));
    if (uniqueNames.length > 10) {
      console.log(`   ... and ${uniqueNames.length - 10} more`);
    }

    // Test query with these departments
    console.log(`\n🔍 Testing query with matched departments...`);
    
    let query = db.collection('audit-results')
      .where('year', '==', 2024);
    
    if (uniqueNames.length === 1) {
      query = query.where('department', '==', uniqueNames[0]);
    } else if (uniqueNames.length > 1) {
      query = query.where('department', 'in', uniqueNames.slice(0, 10));
    }

    const snapshot = await query.get();
    console.log(`✅ Found ${snapshot.size} audit results for 2024 with matched departments`);

    if (snapshot.size > 0) {
      const deptCounts = {};
      snapshot.docs.forEach(doc => {
        const dept = doc.data().department;
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      console.log(`\n📊 Results by department:`);
      Object.entries(deptCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([dept, count]) => {
          console.log(`   ${dept}: ${count} results`);
        });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting AI-powered category matching tests\n');

  // Test cases
  await testDepartmentMatching('HC');
  await testDepartmentMatching('Human Capital');
  await testDepartmentMatching('IT');
  await testDepartmentMatching('Finance');
  await testDepartmentMatching('Marketing');
  await testDepartmentMatching('show all findings 2024 only HC department related');

  console.log('\n✅ All tests completed!\n');
  process.exit(0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
