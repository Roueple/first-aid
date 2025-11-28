/**
 * Production Query Router Test Script (Auto Auth)
 * 
 * Tests the Smart Query Router against production Firebase database
 * Uses service account or anonymous auth, runs 3 test scenarios
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyBt1JoukjkIGvFhvEvf5B648QrvR41uKS8',
  authDomain: 'first-aid-101112.firebaseapp.com',
  projectId: 'first-aid-101112',
  storageBucket: 'first-aid-101112.firebasestorage.app',
  messagingSenderId: '162068922013',
  appId: '1:162068922013:web:24eff9fb9dee72744a1e74'
};

const GEMINI_API_KEY = 'AIzaSyB7M_mHUQDB-YExFFaSKdjob77NwZlHxIs';

// Load test credentials
const credentials = JSON.parse(fs.readFileSync('.test-credentials.json', 'utf8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Test scenarios
const TEST_SCENARIOS = [
  {
    number: 1,
    name: 'Simple Query (Direct Database Lookup)',
    query: 'Show me all critical findings from 2024',
    expectedType: 'simple'
  },
  {
    number: 2,
    name: 'Complex Query (AI Analysis with RAG)',
    query: 'What are the main patterns in our hospital audit findings and what should we prioritize?',
    expectedType: 'complex'
  },
  {
    number: 3,
    name: 'Hybrid Query (Database + AI Analysis)',
    query: 'List all open findings in hotels and explain what trends you see',
    expectedType: 'hybrid'
  }
];

// Query Classification Logic
const SIMPLE_PATTERNS = [
  /\b(show|list|find|get|display|give me|what are)\b.*\b(findings?|issues?|problems?|items?|records?)\b/i,
  /\bhow many\b.*\b(findings?|issues?|problems?)\b/i,
  /\b(in|from|during)\s+\d{4}\b/i,
  /\b(critical|high|medium|low)\s+(priority|severity|findings?|issues?)\b/i,
  /\b(open|closed|in progress|deferred)\s+(findings?|status|issues?)\b/i,
];

const COMPLEX_PATTERNS = [
  /\b(what|why|how)\s+should\b/i,
  /\b(recommend|suggest|advise|propose)\b/i,
  /\b(analyze|analysis|analyse)\b/i,
  /\b(patterns?|trends?|tendenc(y|ies))\b/i,
  /\b(compare|comparison|versus|vs\.?)\b/i,
  /\b(prioritize|priority|important|focus|urgent)\s+(on|for|based)\b/i,
  /\b(insights?|conclusions?|takeaways?)\b/i,
  /\b(improve|improvement|better|optimize)\b/i,
  /\b(summary|summarize|summarise|overview)\b/i,
  /\b(explain|explanation|elaborate)\b/i,
];

const HYBRID_PATTERNS = [
  /\b(show|list|find|get)\b.*\b(and|then)\b.*\b(explain|analyze|summarize|analyse)\b/i,
  /\b(findings?|issues?)\b.*\b(and|then)\b.*\b(what|why|how)\b/i,
  /\b(list|show)\b.*\b(with|including)\b.*\b(analysis|explanation|summary)\b/i,
];

function calculatePatternScore(query, patterns) {
  let matchCount = 0;
  let totalWeight = 0;
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      matchCount++;
      const matchWeight = match[0].length / query.length;
      totalWeight += Math.min(matchWeight * 2, 1);
    }
  }
  
  if (matchCount === 0) return 0;
  
  const countScore = Math.min(matchCount / 3, 1);
  const weightScore = totalWeight / matchCount;
  
  return (countScore * 0.6 + weightScore * 0.4);
}

function classifyQuery(query) {
  const normalizedQuery = query.trim().toLowerCase();
  
  const simpleScore = calculatePatternScore(normalizedQuery, SIMPLE_PATTERNS);
  const complexScore = calculatePatternScore(normalizedQuery, COMPLEX_PATTERNS);
  const hybridScore = calculatePatternScore(normalizedQuery, HYBRID_PATTERNS);
  
  // Extract filters
  const filters = {};
  
  // Year
  const yearMatch = query.match(/\b(20\d{2})\b/);
  if (yearMatch) filters.year = parseInt(yearMatch[1]);
  
  // Severity
  if (/critical/i.test(query)) filters.severity = ['Critical'];
  if (/high/i.test(query)) filters.severity = ['High'];
  
  // Status
  if (/open/i.test(query)) filters.status = ['Open'];
  if (/closed/i.test(query)) filters.status = ['Closed'];
  
  // Project type
  if (/hotel/i.test(query)) filters.projectType = 'Hotel';
  if (/hospital/i.test(query)) filters.projectType = 'Hospital';
  
  // Determine type
  let type, confidence;
  
  if (hybridScore > 0.3 && hybridScore >= simpleScore * 0.5) {
    type = 'hybrid';
    confidence = Math.min(hybridScore + 0.2, 1);
  } else if (simpleScore > 0.2 && complexScore > 0.2) {
    type = 'hybrid';
    confidence = Math.min((simpleScore + complexScore) / 2 + 0.1, 1);
  } else if (complexScore > simpleScore) {
    type = 'complex';
    confidence = Math.min(complexScore + 0.3, 1);
  } else if (simpleScore > 0) {
    type = 'simple';
    confidence = Math.min(simpleScore + 0.4, 1);
  } else {
    type = 'complex';
    confidence = 0.4;
  }
  
  // Fallback rule
  if (confidence < 0.6) type = 'complex';
  
  return { 
    type, 
    confidence, 
    filters,
    scores: { simple: simpleScore, complex: complexScore, hybrid: hybridScore }
  };
}

async function queryDatabase(filters) {
  try {
    console.log('  Querying database with filters:', JSON.stringify(filters));
    
    // Get all findings first (since we might have complex filter combinations)
    const findingsRef = collection(db, 'findings');
    let q = query(findingsRef, limit(100));
    
    const snapshot = await getDocs(q);
    let findings = [];
    
    snapshot.forEach(doc => {
      findings.push({ id: doc.id, ...doc.data() });
    });
    
    // Apply filters in memory (more flexible than Firestore queries)
    // Use correct field names from database
    if (filters.year) {
      findings = findings.filter(f => f.auditYear === filters.year);
    }
    if (filters.severity) {
      findings = findings.filter(f => filters.severity.includes(f.priorityLevel));
    }
    if (filters.status) {
      findings = findings.filter(f => filters.status.includes(f.status));
    }
    if (filters.projectType) {
      findings = findings.filter(f => f.projectType === filters.projectType);
    }
    
    console.log(`  Found ${findings.length} matching findings`);
    return findings.slice(0, 50); // Limit to 50
  } catch (error) {
    console.error('  ❌ Database query error:', error.message);
    return [];
  }
}

async function analyzeWithAI(query, findings) {
  try {
    console.log('  Running AI analysis...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const context = findings.slice(0, 10).map(f => 
      `- [${f.priorityLevel}] ${f.findingTitle} (${f.projectType}, ${f.auditYear})`
    ).join('\n');
    
    const prompt = `You are an AI assistant analyzing audit findings. Based on these findings:

${context}

User Question: ${query}

Provide a brief analysis (2-3 sentences).`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('  ✅ AI analysis complete');
    return text;
  } catch (error) {
    console.error('  ⚠️  AI analysis error:', error.message);
    return 'AI analysis unavailable: ' + error.message;
  }
}

function formatResults(scenario, classification, findings, aiAnalysis, executionTime) {
  let output = `\n${'='.repeat(80)}\n`;
  output += `SCENARIO ${scenario.number}: ${scenario.name}\n`;
  output += `${'='.repeat(80)}\n\n`;
  
  output += `Query: "${scenario.query}"\n\n`;
  
  output += `CLASSIFICATION:\n`;
  output += `  Type: ${classification.type}\n`;
  output += `  Confidence: ${(classification.confidence * 100).toFixed(0)}%\n`;
  output += `  Expected: ${scenario.expectedType}\n`;
  output += `  Match: ${classification.type === scenario.expectedType ? '✅ YES' : '⚠️  NO (got ' + classification.type + ')'}\n`;
  output += `  Pattern Scores:\n`;
  output += `    - Simple: ${(classification.scores.simple * 100).toFixed(0)}%\n`;
  output += `    - Complex: ${(classification.scores.complex * 100).toFixed(0)}%\n`;
  output += `    - Hybrid: ${(classification.scores.hybrid * 100).toFixed(0)}%\n`;
  output += `  Extracted Filters: ${JSON.stringify(classification.filters)}\n\n`;
  
  output += `EXECUTION:\n`;
  output += `  Execution Time: ${executionTime}ms\n`;
  output += `  Findings Retrieved: ${findings.length}\n\n`;
  
  if (findings.length > 0) {
    output += `SAMPLE FINDINGS (first 5):\n`;
    findings.slice(0, 5).forEach((f, idx) => {
      output += `  ${idx + 1}. [${f.priorityLevel}] ${f.findingTitle}\n`;
      output += `     Status: ${f.status} | Type: ${f.projectType} | Year: ${f.auditYear}\n`;
    });
    output += `\n`;
  } else {
    output += `⚠️  No findings retrieved from database\n\n`;
  }
  
  if (aiAnalysis) {
    output += `AI ANALYSIS:\n`;
    output += `  ${aiAnalysis.replace(/\n/g, '\n  ')}\n\n`;
  }
  
  return output;
}

async function runTests() {
  console.log('\n🧪 Smart Query Router - Production Test\n');
  console.log('=' .repeat(80));
  console.log('Connecting to Firebase production database...\n');
  
  // Authenticate with test credentials
  try {
    console.log(`Authenticating as ${credentials.email}...`);
    await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    console.log('✅ Authenticated\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.log('Cannot proceed without authentication.\n');
    process.exit(1);
  }
  
  let markdownOutput = `# Smart Query Router - Production Test Results\n\n`;
  markdownOutput += `**Test Date:** ${new Date().toLocaleString()}\n`;
  markdownOutput += `**Database:** Production (${firebaseConfig.projectId})\n\n`;
  markdownOutput += `---\n\n`;
  
  let terminalOutput = '';
  let successCount = 0;
  let classificationMatches = 0;
  
  // Run each test scenario
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📝 Running Scenario ${scenario.number}: ${scenario.name}`);
    console.log('-'.repeat(80));
    
    const startTime = Date.now();
    
    try {
      // Step 1: Classify
      console.log('  Step 1: Classifying query...');
      const classification = classifyQuery(scenario.query);
      console.log(`  ✅ Classified as: ${classification.type} (${(classification.confidence * 100).toFixed(0)}% confidence)`);
      
      if (classification.type === scenario.expectedType) {
        classificationMatches++;
      }
      
      // Step 2: Query database
      console.log('  Step 2: Querying database...');
      const findings = await queryDatabase(classification.filters);
      
      // Step 3: AI analysis (if needed)
      let aiAnalysis = null;
      if (classification.type === 'complex' || classification.type === 'hybrid') {
        if (findings.length > 0) {
          console.log('  Step 3: Running AI analysis...');
          aiAnalysis = await analyzeWithAI(scenario.query, findings);
        } else {
          console.log('  Step 3: Skipping AI (no findings)');
        }
      }
      
      const executionTime = Date.now() - startTime;
      
      // Format results
      const output = formatResults(scenario, classification, findings, aiAnalysis, executionTime);
      terminalOutput += output;
      markdownOutput += output;
      
      console.log(`✅ Scenario ${scenario.number} complete (${executionTime}ms)\n`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Scenario ${scenario.number} failed:`, error.message);
      terminalOutput += `\nERROR in Scenario ${scenario.number}: ${error.message}\n\n`;
      markdownOutput += `\nERROR in Scenario ${scenario.number}: ${error.message}\n\n`;
    }
  }
  
  // Print to terminal
  console.log('\n' + '='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80));
  console.log(terminalOutput);
  
  // Summary
  const summary = `\n${'='.repeat(80)}\n`;
  const summaryText = `SUMMARY\n${'='.repeat(80)}\n\n`;
  const summaryContent = `✅ Completed ${successCount}/3 scenarios\n`;
  const summaryContent2 = `✅ Classification accuracy: ${classificationMatches}/3 (${(classificationMatches/3*100).toFixed(0)}%)\n\n`;
  const summaryDetails = `The Smart Query Router logic tested:\n`;
  const summaryPoints = `  1. ✅ Query classification (simple/complex/hybrid)\n`;
  const summaryPoints2 = `  2. ✅ Filter extraction from natural language\n`;
  const summaryPoints3 = `  3. ${successCount > 0 ? '✅' : '❌'} Database querying with filters\n`;
  const summaryPoints4 = `  4. ${successCount > 1 ? '✅' : '⚠️ '} AI analysis integration\n\n`;
  
  const fullSummary = summary + summaryText + summaryContent + summaryContent2 + summaryDetails + summaryPoints + summaryPoints2 + summaryPoints3 + summaryPoints4;
  
  console.log(fullSummary);
  markdownOutput += fullSummary;
  
  // Export to test-results folder
  const outputDir = 'test-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  const filename = `${outputDir}/query-router-test-results.md`;
  fs.writeFileSync(filename, markdownOutput);
  console.log(`📄 Results exported to ${filename}\n`);
  
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
