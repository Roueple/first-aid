import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Finding } from '../types/finding.types';

/**
 * Sample findings data for testing the dashboard
 * Updated to use new Finding schema
 */
const sampleFindings: Omit<Finding, 'id'>[] = [
  {
    // Core Identification
    auditYear: 2024,
    
    // Organizational Structure
    subholding: 'Jakarta Head Office',
    projectType: 'Office Building',
    projectName: 'HQ Operations',
    findingDepartment: 'Infrastructure',
    
    // Audit Team
    executor: 'John Doe',
    reviewer: 'Jane Smith',
    manager: 'Director IT',
    
    // Finding Classification
    controlCategory: 'Detective',
    processArea: 'Information Security',
    
    // Finding Details
    findingTitle: 'Inadequate Access Controls in Production Database',
    findingDescription: 'Production database allows unrestricted access from multiple IP addresses without proper authentication mechanisms.',
    rootCause: 'Lack of proper access control configuration during initial setup',
    impactDescription: 'Potential unauthorized access to sensitive production data',
    recommendation: 'Implement IP whitelisting and multi-factor authentication for database access.',
    
    // Severity & Priority
    findingBobot: 4,
    findingKadar: 5,
    findingTotal: 20,
    priorityLevel: 'Critical',
    
    // Tags
    primaryTag: 'security',
    secondaryTags: ['database', 'critical', 'access-control'],
    
    // Metadata
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    notes: 'High priority security issue',
    
    // Status
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-15')),
    dateDue: Timestamp.fromDate(new Date('2024-02-15')),
    
    // Management Response
    managementResponse: 'Agreed. Will implement by end of Q1 2024.',
    actionPlan: '1. Review current access list\n2. Implement IP whitelisting\n3. Enable MFA\n4. Conduct security audit',
    
    // Import tracking
    originalSource: 'Q4 2023 Security Audit',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2024,
    subholding: 'Jakarta Head Office',
    projectType: 'Office Building',
    projectName: 'HQ Operations',
    findingDepartment: 'Accounting',
    executor: 'Sarah Johnson',
    reviewer: 'Michael Brown',
    manager: 'CFO',
    controlCategory: 'Preventive',
    processArea: 'Business Continuity',
    findingTitle: 'Missing Backup Procedures for Financial Data',
    findingDescription: 'No documented backup and recovery procedures exist for critical financial systems.',
    rootCause: 'Lack of formal documentation and testing procedures',
    impactDescription: 'Risk of data loss in case of system failure',
    recommendation: 'Develop and document comprehensive backup procedures with regular testing.',
    findingBobot: 3,
    findingKadar: 5,
    findingTotal: 15,
    priorityLevel: 'High',
    primaryTag: 'backup',
    secondaryTags: ['finance', 'high-priority', 'documentation'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'In Progress',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-10')),
    dateDue: Timestamp.fromDate(new Date('2024-03-10')),
    managementResponse: 'In progress. Draft procedures under review.',
    actionPlan: '1. Document current backup process\n2. Define RPO/RTO requirements\n3. Test recovery procedures',
    originalSource: 'Annual IT Audit 2024',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2024,
    subholding: 'Surabaya Branch',
    projectType: 'Office Building',
    projectName: 'Branch Operations',
    findingDepartment: 'IT Support',
    executor: 'Ahmad Rahman',
    reviewer: 'System Admin',
    manager: 'Branch Manager',
    controlCategory: 'Preventive',
    processArea: 'Information Security',
    findingTitle: 'Outdated Software Versions in Use',
    findingDescription: 'Multiple workstations running unsupported operating system versions with known vulnerabilities.',
    rootCause: 'Lack of patch management policy and procedures',
    impactDescription: 'Exposure to known security vulnerabilities',
    recommendation: 'Upgrade all systems to supported versions and implement patch management policy.',
    findingBobot: 3,
    findingKadar: 4,
    findingTotal: 12,
    priorityLevel: 'High',
    primaryTag: 'security',
    secondaryTags: ['patch-management', 'compliance', 'infrastructure'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-20')),
    dateDue: Timestamp.fromDate(new Date('2024-02-28')),
    originalSource: 'Branch IT Assessment',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2024,
    subholding: 'Jakarta Head Office',
    projectType: 'Office Building',
    projectName: 'HQ Operations',
    findingDepartment: 'Vendor Relations',
    executor: 'Lisa Anderson',
    reviewer: 'David Wilson',
    manager: 'Procurement Head',
    controlCategory: 'Detective',
    processArea: 'Vendor Management',
    findingTitle: 'Incomplete Vendor Due Diligence Documentation',
    findingDescription: 'Several third-party vendors lack proper due diligence documentation and risk assessments.',
    rootCause: 'Inadequate vendor onboarding process',
    impactDescription: 'Potential vendor-related risks not properly assessed',
    recommendation: 'Complete due diligence for all active vendors and establish ongoing review process.',
    findingBobot: 2,
    findingKadar: 3,
    findingTotal: 6,
    priorityLevel: 'Medium',
    primaryTag: 'vendor',
    secondaryTags: ['compliance', 'documentation', 'risk-management'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-05')),
    dateDue: Timestamp.fromDate(new Date('2024-04-05')),
    managementResponse: 'Acknowledged. Prioritizing high-risk vendors first.',
    originalSource: 'Procurement Audit 2024',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2024,
    subholding: 'Bandung Branch',
    projectType: 'Office Building',
    projectName: 'Branch Operations',
    findingDepartment: 'Accounts Payable',
    executor: 'Robert Chen',
    reviewer: 'Emily Davis',
    manager: 'Finance Manager',
    controlCategory: 'Preventive',
    processArea: 'Financial Controls',
    findingTitle: 'Lack of Segregation of Duties in Payment Processing',
    findingDescription: 'Single individuals can initiate, approve, and process payments without oversight.',
    rootCause: 'Insufficient controls in payment processing workflow',
    impactDescription: 'High risk of fraud and unauthorized payments',
    recommendation: 'Implement maker-checker controls for all payment transactions above threshold.',
    findingBobot: 4,
    findingKadar: 5,
    findingTotal: 20,
    priorityLevel: 'Critical',
    primaryTag: 'finance',
    secondaryTags: ['critical', 'fraud-risk', 'controls'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2023-12-20')),
    dateDue: Timestamp.fromDate(new Date('2024-01-20')),
    managementResponse: 'Critical issue. Implementation in progress.',
    actionPlan: '1. Define approval thresholds\n2. Update system workflows\n3. Train staff\n4. Monitor compliance',
    originalSource: 'Financial Controls Review',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2024,
    subholding: 'Jakarta Head Office',
    projectType: 'Office Building',
    projectName: 'HQ Operations',
    findingDepartment: 'HR Operations',
    executor: 'Maria Garcia',
    reviewer: 'HR Manager',
    manager: 'CHRO',
    controlCategory: 'Preventive',
    processArea: 'Compliance',
    findingTitle: 'Inadequate Employee Training on Data Privacy',
    findingDescription: 'Staff handling personal data have not received GDPR/privacy training in the past 12 months.',
    rootCause: 'Lack of regular training schedule and tracking',
    impactDescription: 'Risk of data privacy violations and regulatory penalties',
    recommendation: 'Conduct mandatory data privacy training for all staff handling personal information.',
    findingBobot: 2,
    findingKadar: 4,
    findingTotal: 8,
    priorityLevel: 'Medium',
    primaryTag: 'training',
    secondaryTags: ['privacy', 'compliance', 'GDPR'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'In Progress',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-12')),
    dateDue: Timestamp.fromDate(new Date('2024-03-31')),
    managementResponse: 'Training sessions scheduled for February 2024.',
    originalSource: 'Compliance Review 2024',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2024,
    subholding: 'Jakarta Head Office',
    projectType: 'Office Building',
    projectName: 'HQ Operations',
    findingDepartment: 'Infrastructure',
    executor: 'Kevin Martinez',
    reviewer: 'Jennifer Lee',
    manager: 'IT Director',
    controlCategory: 'Detective',
    processArea: 'Business Continuity',
    findingTitle: 'Missing Disaster Recovery Plan Testing',
    findingDescription: 'Disaster recovery plan has not been tested in over 18 months.',
    rootCause: 'Lack of regular testing schedule',
    impactDescription: 'Uncertainty about recovery capabilities in case of disaster',
    recommendation: 'Conduct full disaster recovery test and update plan based on findings.',
    findingBobot: 3,
    findingKadar: 5,
    findingTotal: 15,
    priorityLevel: 'High',
    primaryTag: 'disaster-recovery',
    secondaryTags: ['testing', 'high-priority', 'BCP'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-08')),
    dateDue: Timestamp.fromDate(new Date('2024-02-29')),
    originalSource: 'BCP Assessment 2024',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2023,
    subholding: 'Surabaya Branch',
    projectType: 'Office Building',
    projectName: 'Branch Operations',
    findingDepartment: 'Security',
    executor: 'Thomas Anderson',
    reviewer: 'Patricia Moore',
    manager: 'IT Manager',
    controlCategory: 'Preventive',
    processArea: 'Information Security',
    findingTitle: 'Weak Password Policy Implementation',
    findingDescription: 'Current password policy allows weak passwords and does not enforce regular changes.',
    rootCause: 'Outdated password policy configuration',
    impactDescription: 'Increased risk of unauthorized access',
    recommendation: 'Implement strong password policy with complexity requirements and MFA.',
    findingBobot: 2,
    findingKadar: 3,
    findingTotal: 6,
    priorityLevel: 'Medium',
    primaryTag: 'security',
    secondaryTags: ['password', 'completed', 'authentication'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'Closed',
    dateIdentified: Timestamp.fromDate(new Date('2023-11-15')),
    dateDue: Timestamp.fromDate(new Date('2023-12-31')),
    dateCompleted: Timestamp.fromDate(new Date('2023-12-28')),
    managementResponse: 'Completed. New policy implemented across all systems.',
    actionPlan: 'Policy updated and enforced via Active Directory.',
    originalSource: 'Security Audit Q4 2023',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2024,
    subholding: 'Medan Branch',
    projectType: 'Office Building',
    projectName: 'Branch Operations',
    findingDepartment: 'Application Development',
    executor: 'Daniel Kim',
    reviewer: 'Security Team',
    manager: 'IT Manager',
    controlCategory: 'Preventive',
    processArea: 'Information Security',
    findingTitle: 'Unencrypted Data Transmission',
    findingDescription: 'Internal applications transmit sensitive data over unencrypted HTTP connections.',
    rootCause: 'Legacy applications not updated to use HTTPS',
    impactDescription: 'Risk of data interception and unauthorized access',
    recommendation: 'Migrate all applications to HTTPS and disable HTTP access.',
    findingBobot: 3,
    findingKadar: 4,
    findingTotal: 12,
    priorityLevel: 'High',
    primaryTag: 'security',
    secondaryTags: ['encryption', 'deferred', 'network'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'Deferred',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-18')),
    dateDue: Timestamp.fromDate(new Date('2024-06-30')),
    managementResponse: 'Deferred to Q3 2024 due to resource constraints.',
    originalSource: 'Network Security Scan',
    importBatch: 'manual-seed-2024',
  },
  {
    auditYear: 2024,
    subholding: 'Jakarta Head Office',
    projectType: 'Office Building',
    projectName: 'HQ Operations',
    findingDepartment: 'Asset Management',
    executor: 'Nancy White',
    reviewer: 'Asset Manager',
    manager: 'Operations Manager',
    controlCategory: 'Detective',
    processArea: 'Asset Management',
    findingTitle: 'Incomplete Asset Inventory',
    findingDescription: 'IT asset register is outdated and missing approximately 30% of deployed hardware.',
    rootCause: 'Lack of automated asset tracking system',
    impactDescription: 'Inability to properly manage and secure IT assets',
    recommendation: 'Conduct comprehensive asset audit and implement automated tracking system.',
    findingBobot: 1,
    findingKadar: 3,
    findingTotal: 3,
    priorityLevel: 'Low',
    primaryTag: 'asset-management',
    secondaryTags: ['inventory', 'low-priority', 'tracking'],
    creationTimestamp: Timestamp.now(),
    lastModifiedDate: Timestamp.now(),
    modifiedBy: 'system',
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-22')),
    dateDue: Timestamp.fromDate(new Date('2024-05-31')),
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
        console.log(`✅ Added finding: ${finding.findingTitle} (ID: ${docRef.id})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to add finding: ${finding.findingTitle}`, error);
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
