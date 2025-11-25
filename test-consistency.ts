/**
 * Consistency Test Script
 * Tests that findings data is consistent between Firebase, FindingsTable, and Dashboard
 */

import findingsService from './src/services/FindingsService';
import { Timestamp } from 'firebase/firestore';

async function testConsistency() {
  console.log('🔍 Testing Consistency Between Firebase, FindingsTable, and Dashboard\n');

  try {
    // 1. Fetch all findings from Firebase
    console.log('1️⃣ Fetching all findings from Firebase...');
    const allFindings = await findingsService.getFindings(undefined, {
      page: 1,
      pageSize: 10000,
    });
    console.log(`   ✓ Found ${allFindings.items.length} total findings\n`);

    // 2. Test computed fields consistency
    console.log('2️⃣ Testing computed fields (isOverdue, daysOpen)...');
    const now = new Date();
    let computedFieldErrors = 0;

    allFindings.items.forEach((finding) => {
      // Test isOverdue calculation
      const expectedOverdue = 
        finding.dateDue && 
        finding.status !== 'Closed' && 
        finding.dateDue.toDate() < now;
      
      if (finding.isOverdue !== expectedOverdue) {
        console.error(`   ✗ Finding ${finding.id}: isOverdue mismatch`);
        console.error(`     Expected: ${expectedOverdue}, Got: ${finding.isOverdue}`);
        computedFieldErrors++;
      }

      // Test daysOpen calculation
      if (finding.dateIdentified) {
        const identifiedDate = finding.dateIdentified.toDate();
        const endDate = finding.dateCompleted ? finding.dateCompleted.toDate() : now;
        const expectedDaysOpen = Math.floor((endDate.getTime() - identifiedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (finding.daysOpen !== expectedDaysOpen) {
          console.error(`   ✗ Finding ${finding.id}: daysOpen mismatch`);
          console.error(`     Expected: ${expectedDaysOpen}, Got: ${finding.daysOpen}`);
          computedFieldErrors++;
        }
      }
    });

    if (computedFieldErrors === 0) {
      console.log('   ✓ All computed fields are consistent\n');
    } else {
      console.log(`   ✗ Found ${computedFieldErrors} computed field errors\n`);
    }

    // 3. Test dashboard statistics
    console.log('3️⃣ Testing dashboard statistics...');
    
    const total = allFindings.items.length;
    const open = allFindings.items.filter(
      (f) => f.status === 'Open' || f.status === 'In Progress'
    ).length;
    const highRisk = allFindings.items.filter(
      (f) => f.severity === 'Critical' || f.severity === 'High'
    ).length;
    const overdue = allFindings.items.filter((f) => f.isOverdue).length;

    console.log(`   Total Findings: ${total}`);
    console.log(`   Open Findings: ${open}`);
    console.log(`   High-Risk Findings: ${highRisk}`);
    console.log(`   Overdue Findings: ${overdue}\n`);

    // 4. Test filter consistency
    console.log('4️⃣ Testing filter consistency...');
    
    // Test severity filter
    const criticalFindings = await findingsService.getFindings(
      { severity: ['Critical'] },
      { page: 1, pageSize: 10000 }
    );
    const manualCriticalCount = allFindings.items.filter(f => f.severity === 'Critical').length;
    
    if (criticalFindings.items.length === manualCriticalCount) {
      console.log(`   ✓ Severity filter: ${criticalFindings.items.length} Critical findings`);
    } else {
      console.error(`   ✗ Severity filter mismatch: Service=${criticalFindings.items.length}, Manual=${manualCriticalCount}`);
    }

    // Test status filter
    const openFindings = await findingsService.getFindings(
      { status: ['Open'] },
      { page: 1, pageSize: 10000 }
    );
    const manualOpenCount = allFindings.items.filter(f => f.status === 'Open').length;
    
    if (openFindings.items.length === manualOpenCount) {
      console.log(`   ✓ Status filter: ${openFindings.items.length} Open findings`);
    } else {
      console.error(`   ✗ Status filter mismatch: Service=${openFindings.items.length}, Manual=${manualOpenCount}`);
    }

    // Test overdue filter
    const overdueFindings = await findingsService.getOverdueFindings({
      page: 1,
      pageSize: 10000,
    });
    const manualOverdueCount = allFindings.items.filter(f => f.isOverdue).length;
    
    if (overdueFindings.items.length === manualOverdueCount) {
      console.log(`   ✓ Overdue filter: ${overdueFindings.items.length} Overdue findings\n`);
    } else {
      console.error(`   ✗ Overdue filter mismatch: Service=${overdueFindings.items.length}, Manual=${manualOverdueCount}\n`);
    }

    // 5. Test search consistency
    console.log('5️⃣ Testing search consistency...');
    const searchResults = await findingsService.searchFindings('security', undefined, {
      page: 1,
      pageSize: 10000,
    });
    
    const manualSearchCount = allFindings.items.filter(f => 
      f.title.toLowerCase().includes('security') ||
      f.description.toLowerCase().includes('security') ||
      f.responsiblePerson.toLowerCase().includes('security')
    ).length;
    
    if (searchResults.items.length === manualSearchCount) {
      console.log(`   ✓ Search: Found ${searchResults.items.length} results for "security"\n`);
    } else {
      console.error(`   ✗ Search mismatch: Service=${searchResults.items.length}, Manual=${manualSearchCount}\n`);
    }

    // 6. Test data type consistency
    console.log('6️⃣ Testing data type consistency...');
    let typeErrors = 0;

    allFindings.items.forEach((finding) => {
      // Check Timestamp types
      if (!(finding.dateIdentified instanceof Timestamp)) {
        console.error(`   ✗ Finding ${finding.id}: dateIdentified is not a Timestamp`);
        typeErrors++;
      }
      if (finding.dateDue && !(finding.dateDue instanceof Timestamp)) {
        console.error(`   ✗ Finding ${finding.id}: dateDue is not a Timestamp`);
        typeErrors++;
      }
      if (finding.dateCompleted && !(finding.dateCompleted instanceof Timestamp)) {
        console.error(`   ✗ Finding ${finding.id}: dateCompleted is not a Timestamp`);
        typeErrors++;
      }
      if (!(finding.dateCreated instanceof Timestamp)) {
        console.error(`   ✗ Finding ${finding.id}: dateCreated is not a Timestamp`);
        typeErrors++;
      }
      if (!(finding.dateUpdated instanceof Timestamp)) {
        console.error(`   ✗ Finding ${finding.id}: dateUpdated is not a Timestamp`);
        typeErrors++;
      }

      // Check required fields
      if (!finding.id || !finding.title || !finding.description) {
        console.error(`   ✗ Finding ${finding.id}: Missing required fields`);
        typeErrors++;
      }

      // Check enum values
      if (!['Critical', 'High', 'Medium', 'Low'].includes(finding.severity)) {
        console.error(`   ✗ Finding ${finding.id}: Invalid severity: ${finding.severity}`);
        typeErrors++;
      }
      if (!['Open', 'In Progress', 'Closed', 'Deferred'].includes(finding.status)) {
        console.error(`   ✗ Finding ${finding.id}: Invalid status: ${finding.status}`);
        typeErrors++;
      }

      // Check risk level range
      if (finding.riskLevel < 1 || finding.riskLevel > 10) {
        console.error(`   ✗ Finding ${finding.id}: Invalid riskLevel: ${finding.riskLevel}`);
        typeErrors++;
      }
    });

    if (typeErrors === 0) {
      console.log('   ✓ All data types are consistent\n');
    } else {
      console.log(`   ✗ Found ${typeErrors} type errors\n`);
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`   Total Findings: ${total}`);
    console.log(`   Computed Field Errors: ${computedFieldErrors}`);
    console.log(`   Type Errors: ${typeErrors}`);
    
    if (computedFieldErrors === 0 && typeErrors === 0) {
      console.log('\n✅ All consistency checks passed!');
      return true;
    } else {
      console.log('\n❌ Some consistency checks failed!');
      return false;
    }

  } catch (error) {
    console.error('❌ Error during consistency test:', error);
    return false;
  }
}

// Run the test
testConsistency()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
