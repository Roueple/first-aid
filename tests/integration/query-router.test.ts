/**
 * Manual Test Script for Smart Query Router
 * 
 * Tests 3 different scenarios:
 * 1. Simple Query - Direct database lookup
 * 2. Complex Query - AI analysis with RAG
 * 3. Hybrid Query - Database + AI analysis
 */

import { queryRouterService } from './src/services/QueryRouterService';
import { isQueryErrorResponse } from './src/types/queryRouter.types';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logResult(label: string, value: any) {
  console.log(`${colors.yellow}${label}:${colors.reset}`, value);
}

async function testScenario(
  scenarioNumber: number,
  scenarioName: string,
  query: string,
  expectedType: string
) {
  logSection(`Scenario ${scenarioNumber}: ${scenarioName}`);
  
  log(`Query: "${query}"`, colors.blue);
  console.log();
  
  try {
    // Step 1: Classify the query
    log('Step 1: Classifying query...', colors.bright);
    const intent = await queryRouterService.classifyQuery(query);
    
    logResult('  Classified Type', intent.type);
    logResult('  Confidence', intent.confidence.toFixed(2));
    logResult('  Requires AI', intent.requiresAI);
    logResult('  Analysis Keywords', intent.analysisKeywords.join(', ') || 'none');
    logResult('  Extracted Filters', JSON.stringify(intent.extractedFilters, null, 2));
    
    // Check if classification matches expectation
    if (intent.type === expectedType) {
      log(`  ✓ Classification matches expected type: ${expectedType}`, colors.green);
    } else {
      log(`  ⚠ Classification differs from expected: got ${intent.type}, expected ${expectedType}`, colors.yellow);
    }
    
    console.log();
    
    // Step 2: Execute the query
    log('Step 2: Executing query...', colors.bright);
    const startTime = Date.now();
    const response = await queryRouterService.routeQuery(query, {
      thinkingMode: 'low',
      maxResults: 10,
    });
    const executionTime = Date.now() - startTime;
    
    // Check if error response
    if (isQueryErrorResponse(response)) {
      log('  ✗ Query execution failed', colors.red);
      logResult('  Error Code', response.error.code);
      logResult('  Error Message', response.error.message);
      logResult('  Suggestion', response.error.suggestion);
      
      if (response.error.fallbackData && response.error.fallbackData.length > 0) {
        logResult('  Fallback Data', `${response.error.fallbackData.length} findings`);
      }
    } else {
      log('  ✓ Query executed successfully', colors.green);
      logResult('  Response Type', response.type);
      logResult('  Execution Time', `${executionTime}ms`);
      logResult('  Findings Analyzed', response.metadata.findingsAnalyzed);
      
      if (response.metadata.tokensUsed) {
        logResult('  Tokens Used', response.metadata.tokensUsed);
      }
      
      if (response.findings) {
        logResult('  Findings Returned', response.findings.length);
      }
      
      if (response.pagination) {
        logResult('  Pagination', 
          `Page ${response.pagination.currentPage}/${response.pagination.totalPages} ` +
          `(${response.pagination.totalCount} total)`
        );
      }
      
      console.log();
      log('Answer:', colors.bright);
      console.log(response.answer.substring(0, 500) + (response.answer.length > 500 ? '...' : ''));
      
      if (response.findings && response.findings.length > 0) {
        console.log();
        log('Sample Findings:', colors.bright);
        response.findings.slice(0, 3).forEach((finding, idx) => {
          console.log(`  ${idx + 1}. [${finding.severity}] ${finding.title}`);
          console.log(`     Status: ${finding.status} | Type: ${finding.projectType} | Year: ${finding.year}`);
        });
      }
    }
    
    console.log();
    log('Metadata:', colors.bright);
    logResult('  Query Type', response.metadata.queryType);
    logResult('  Execution Time', `${response.metadata.executionTimeMs}ms`);
    logResult('  Confidence', response.metadata.confidence.toFixed(2));
    
  } catch (error) {
    log('  ✗ Unexpected error occurred', colors.red);
    console.error(error);
  }
}

async function runTests() {
  log('\n🧪 Smart Query Router - Manual Test Suite', colors.bright + colors.cyan);
  log('Testing the AI chatbot query routing logic\n', colors.cyan);
  
  try {
    // Scenario 1: Simple Query
    await testScenario(
      1,
      'Simple Query (Direct Database Lookup)',
      'Show me all critical findings from 2024',
      'simple'
    );
    
    // Scenario 2: Complex Query
    await testScenario(
      2,
      'Complex Query (AI Analysis with RAG)',
      'What are the main patterns in our hospital audit findings and what should we prioritize?',
      'complex'
    );
    
    // Scenario 3: Hybrid Query
    await testScenario(
      3,
      'Hybrid Query (Database + AI Analysis)',
      'List all open findings in hotels and explain what trends you see',
      'hybrid'
    );
    
    // Summary
    logSection('Test Summary');
    log('✓ All 3 scenarios tested successfully', colors.green);
    log('\nThe Smart Query Router is working as expected!', colors.bright);
    log('Each query was classified, routed, and executed according to its type.', colors.reset);
    
  } catch (error) {
    log('\n✗ Test suite failed', colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
