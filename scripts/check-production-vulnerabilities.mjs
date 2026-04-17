#!/usr/bin/env node

/**
 * Check for vulnerabilities in production dependencies only
 * Dev dependencies (electron-builder, to-ico, etc.) are ignored
 */

import { execSync } from 'child_process';

console.log('🔍 Checking production dependencies for vulnerabilities...\n');

try {
  // Run audit for production only
  const result = execSync('npm audit --production --json', { 
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  const audit = JSON.parse(result);
  
  if (audit.metadata.vulnerabilities.total === 0) {
    console.log('✅ No vulnerabilities found in production dependencies!');
    process.exit(0);
  }
  
  console.log('⚠️  Production vulnerabilities found:');
  console.log(`   Total: ${audit.metadata.vulnerabilities.total}`);
  console.log(`   Critical: ${audit.metadata.vulnerabilities.critical}`);
  console.log(`   High: ${audit.metadata.vulnerabilities.high}`);
  console.log(`   Moderate: ${audit.metadata.vulnerabilities.moderate}`);
  console.log(`   Low: ${audit.metadata.vulnerabilities.low}\n`);
  
  console.log('Run: npm audit --production');
  console.log('For details on production vulnerabilities');
  
  process.exit(audit.metadata.vulnerabilities.critical > 0 ? 1 : 0);
  
} catch (error) {
  if (error.status === 1) {
    // Audit found issues, parse the output
    try {
      const audit = JSON.parse(error.stdout);
      console.log('⚠️  Production vulnerabilities found:');
      console.log(`   Total: ${audit.metadata.vulnerabilities.total}`);
      console.log(`   Critical: ${audit.metadata.vulnerabilities.critical}`);
      console.log(`   High: ${audit.metadata.vulnerabilities.high}`);
      console.log(`   Moderate: ${audit.metadata.vulnerabilities.moderate}`);
      console.log(`   Low: ${audit.metadata.vulnerabilities.low}\n`);
      
      process.exit(audit.metadata.vulnerabilities.critical > 0 ? 1 : 0);
    } catch {
      console.error('❌ Error parsing audit output');
      process.exit(1);
    }
  } else {
    console.error('❌ Error running npm audit:', error.message);
    process.exit(1);
  }
}
