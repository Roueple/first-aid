import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Finding } from '../types/finding.types';

/**
 * Sample findings data for testing the dashboard
 */
const sampleFindings: Omit<Finding, 'id'>[] = [
  {
    title: 'Inadequate Access Controls in Production Database',
    description: 'Production database allows unrestricted access from multiple IP addresses without proper authentication mechanisms.',
    severity: 'Critical',
    status: 'Open',
    category: 'Information Security',
    subcategory: 'Access Control',
    location: 'Jakarta Head Office',
    branch: 'IT Department',
    department: 'Infrastructure',
    responsiblePerson: 'John Doe',
    reviewerPerson: 'Jane Smith',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-15')),
    dateDue: Timestamp.fromDate(new Date('2024-02-15')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Implement IP whitelisting and multi-factor authentication for database access.',
    managementResponse: 'Agreed. Will implement by end of Q1 2024.',
    actionPlan: '1. Review current access list\n2. Implement IP whitelisting\n3. Enable MFA\n4. Conduct security audit',
    tags: ['security', 'database', 'critical'],
    riskLevel: 9,
    originalSource: 'Q4 2023 Security Audit',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Missing Backup Procedures for Financial Data',
    description: 'No documented backup and recovery procedures exist for critical financial systems.',
    severity: 'High',
    status: 'In Progress',
    category: 'Business Continuity',
    subcategory: 'Data Backup',
    location: 'Jakarta Head Office',
    branch: 'Finance Department',
    department: 'Accounting',
    responsiblePerson: 'Sarah Johnson',
    reviewerPerson: 'Michael Brown',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-10')),
    dateDue: Timestamp.fromDate(new Date('2024-03-10')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Develop and document comprehensive backup procedures with regular testing.',
    managementResponse: 'In progress. Draft procedures under review.',
    actionPlan: '1. Document current backup process\n2. Define RPO/RTO requirements\n3. Test recovery procedures',
    tags: ['backup', 'finance', 'high-priority'],
    riskLevel: 8,
    originalSource: 'Annual IT Audit 2024',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Outdated Software Versions in Use',
    description: 'Multiple workstations running unsupported operating system versions with known vulnerabilities.',
    severity: 'High',
    status: 'Open',
    category: 'Information Security',
    subcategory: 'Patch Management',
    location: 'Surabaya Branch',
    branch: 'Operations',
    department: 'IT Support',
    responsiblePerson: 'Ahmad Rahman',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-20')),
    dateDue: Timestamp.fromDate(new Date('2024-02-28')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Upgrade all systems to supported versions and implement patch management policy.',
    tags: ['security', 'patch-management', 'compliance'],
    riskLevel: 7,
    originalSource: 'Branch IT Assessment',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Incomplete Vendor Due Diligence Documentation',
    description: 'Several third-party vendors lack proper due diligence documentation and risk assessments.',
    severity: 'Medium',
    status: 'Open',
    category: 'Vendor Management',
    subcategory: 'Due Diligence',
    location: 'Jakarta Head Office',
    branch: 'Procurement',
    department: 'Vendor Relations',
    responsiblePerson: 'Lisa Anderson',
    reviewerPerson: 'David Wilson',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-05')),
    dateDue: Timestamp.fromDate(new Date('2024-04-05')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Complete due diligence for all active vendors and establish ongoing review process.',
    managementResponse: 'Acknowledged. Prioritizing high-risk vendors first.',
    tags: ['vendor', 'compliance', 'documentation'],
    riskLevel: 5,
    originalSource: 'Procurement Audit 2024',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Lack of Segregation of Duties in Payment Processing',
    description: 'Single individuals can initiate, approve, and process payments without oversight.',
    severity: 'Critical',
    status: 'Open',
    category: 'Financial Controls',
    subcategory: 'Segregation of Duties',
    location: 'Bandung Branch',
    branch: 'Finance',
    department: 'Accounts Payable',
    responsiblePerson: 'Robert Chen',
    reviewerPerson: 'Emily Davis',
    dateIdentified: Timestamp.fromDate(new Date('2023-12-20')),
    dateDue: Timestamp.fromDate(new Date('2024-01-20')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Implement maker-checker controls for all payment transactions above threshold.',
    managementResponse: 'Critical issue. Implementation in progress.',
    actionPlan: '1. Define approval thresholds\n2. Update system workflows\n3. Train staff\n4. Monitor compliance',
    tags: ['finance', 'critical', 'fraud-risk'],
    riskLevel: 10,
    originalSource: 'Financial Controls Review',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Inadequate Employee Training on Data Privacy',
    description: 'Staff handling personal data have not received GDPR/privacy training in the past 12 months.',
    severity: 'Medium',
    status: 'In Progress',
    category: 'Compliance',
    subcategory: 'Training',
    location: 'Jakarta Head Office',
    branch: 'Human Resources',
    department: 'HR Operations',
    responsiblePerson: 'Maria Garcia',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-12')),
    dateDue: Timestamp.fromDate(new Date('2024-03-31')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Conduct mandatory data privacy training for all staff handling personal information.',
    managementResponse: 'Training sessions scheduled for February 2024.',
    tags: ['training', 'privacy', 'compliance'],
    riskLevel: 6,
    originalSource: 'Compliance Review 2024',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Missing Disaster Recovery Plan Testing',
    description: 'Disaster recovery plan has not been tested in over 18 months.',
    severity: 'High',
    status: 'Open',
    category: 'Business Continuity',
    subcategory: 'Disaster Recovery',
    location: 'Jakarta Head Office',
    branch: 'IT Department',
    department: 'Infrastructure',
    responsiblePerson: 'Kevin Martinez',
    reviewerPerson: 'Jennifer Lee',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-08')),
    dateDue: Timestamp.fromDate(new Date('2024-02-29')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Conduct full disaster recovery test and update plan based on findings.',
    tags: ['disaster-recovery', 'testing', 'high-priority'],
    riskLevel: 8,
    originalSource: 'BCP Assessment 2024',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Weak Password Policy Implementation',
    description: 'Current password policy allows weak passwords and does not enforce regular changes.',
    severity: 'Medium',
    status: 'Closed',
    category: 'Information Security',
    subcategory: 'Authentication',
    location: 'Surabaya Branch',
    branch: 'IT Department',
    department: 'Security',
    responsiblePerson: 'Thomas Anderson',
    reviewerPerson: 'Patricia Moore',
    dateIdentified: Timestamp.fromDate(new Date('2023-11-15')),
    dateDue: Timestamp.fromDate(new Date('2023-12-31')),
    dateCompleted: Timestamp.fromDate(new Date('2023-12-28')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Implement strong password policy with complexity requirements and MFA.',
    managementResponse: 'Completed. New policy implemented across all systems.',
    actionPlan: 'Policy updated and enforced via Active Directory.',
    tags: ['security', 'password', 'completed'],
    riskLevel: 5,
    originalSource: 'Security Audit Q4 2023',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Unencrypted Data Transmission',
    description: 'Internal applications transmit sensitive data over unencrypted HTTP connections.',
    severity: 'High',
    status: 'Deferred',
    category: 'Information Security',
    subcategory: 'Encryption',
    location: 'Medan Branch',
    branch: 'IT Department',
    department: 'Application Development',
    responsiblePerson: 'Daniel Kim',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-18')),
    dateDue: Timestamp.fromDate(new Date('2024-06-30')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Migrate all applications to HTTPS and disable HTTP access.',
    managementResponse: 'Deferred to Q3 2024 due to resource constraints.',
    tags: ['security', 'encryption', 'deferred'],
    riskLevel: 7,
    originalSource: 'Network Security Scan',
    importBatch: 'manual-seed-2024',
  },
  {
    title: 'Incomplete Asset Inventory',
    description: 'IT asset register is outdated and missing approximately 30% of deployed hardware.',
    severity: 'Low',
    status: 'Open',
    category: 'Asset Management',
    subcategory: 'Inventory',
    location: 'Jakarta Head Office',
    branch: 'IT Department',
    department: 'Asset Management',
    responsiblePerson: 'Nancy White',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-22')),
    dateDue: Timestamp.fromDate(new Date('2024-05-31')),
    dateCreated: Timestamp.now(),
    dateUpdated: Timestamp.now(),
    recommendation: 'Conduct comprehensive asset audit and implement automated tracking system.',
    tags: ['asset-management', 'inventory', 'low-priority'],
    riskLevel: 3,
    originalSource: 'Asset Management Review',
    importBatch: 'manual-seed-2024',
  },
];

/**
 * Seeds the Firestore database with sample findings data
 */
export async function seedSampleFindings(): Promise<void> {
  console.log('🌱 Starting to seed sample findings data...');
  
  try {
    const findingsCollection = collection(db, 'findings');
    let successCount = 0;
    let errorCount = 0;

    for (const finding of sampleFindings) {
      try {
        const docRef = await addDoc(findingsCollection, finding);
        console.log(`✅ Added finding: ${finding.title} (ID: ${docRef.id})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to add finding: ${finding.title}`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Successfully added: ${successCount} findings`);
    console.log(`   ❌ Failed: ${errorCount} findings`);
    console.log(`   📈 Total: ${sampleFindings.length} findings`);
    console.log('\n🎉 Sample data seeding complete!');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

/**
 * Expose seeding function globally for console access
 */
if (typeof window !== 'undefined') {
  (window as any).seedSampleFindings = seedSampleFindings;
}
