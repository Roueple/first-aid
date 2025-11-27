/**
 * Updated seed data generator using new findings schema
 * Based on findings-table-structure.md
 */

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Finding } from '../types/finding.types';
import { calculateFindingTotal, calculatePriorityLevel } from '../types/finding.constants';

/**
 * Sample findings data using new schema
 */
const sampleFindings: Omit<Finding, 'id' | 'findingTotal' | 'priorityLevel' | 'creationTimestamp' | 'lastModifiedDate'>[] = [
  {
    auditYear: 2024,
    subholding: 'Jakarta Office',
    projectType: 'Office Building',
    projectName: 'Jakarta Tower',
    findingDepartment: 'IT Infrastructure',
    executor: 'John Doe',
    reviewer: 'Jane Smith',
    manager: 'Bob Johnson',
    controlCategory: 'Detective',
    processArea: 'IT',
    findingTitle: 'Inadequate Access Controls in Production Database',
    findingDescription: 'Production database allows unrestricted access from multiple IP addresses without proper authentication mechanisms. This poses a significant security risk.',
    rootCause: 'Lack of security policy enforcement and inadequate configuration management during initial setup.',
    impactDescription: 'Potential unauthorized access to sensitive data, data breach risk, compliance violations.',
    recommendation: 'Implement IP whitelisting and multi-factor authentication for database access.',
    findingBobot: 4,
    findingKadar: 5,
    primaryTag: 'Access Control',
    secondaryTags: ['Data Security', 'Database Management', 'Password Controls'],
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-15')),
    dateDue: Timestamp.fromDate(new Date('2024-02-15')),
    managementResponse: 'Agreed. Will implement by end of Q1 2024.',
    actionPlan: '1. Review current access list\n2. Implement IP whitelisting\n3. Enable MFA\n4. Conduct security audit',
    evidence: ['security-scan-report.pdf', 'access-log-analysis.xlsx'],
    notes: 'Critical security issue requiring immediate attention.',
    originalSource: 'Q4 2023 Security Audit',
    importBatch: 'manual-seed-2024',
    modifiedBy: 'system',
  },
  {
    auditYear: 2024,
    subholding: 'Jakarta Office',
    projectType: 'Office Building',
    projectName: 'Jakarta Tower',
    findingDepartment: 'Accounting',
    executor: 'Sarah Johnson',
    reviewer: 'Michael Brown',
    manager: 'Alice Williams',
    controlCategory: 'Preventive',
    processArea: 'Finance',
    findingTitle: 'Missing Backup Procedures for Financial Data',
    findingDescription: 'No documented backup and recovery procedures exist for critical financial systems including ERP and accounting software.',
    rootCause: 'Absence of formal business continuity planning and documentation requirements.',
    impactDescription: 'Risk of data loss, inability to recover from system failures, potential financial reporting delays.',
    recommendation: 'Develop and document comprehensive backup procedures with regular testing.',
    findingBobot: 4,
    findingKadar: 3,
    primaryTag: 'Backup & Recovery',
    secondaryTags: ['Financial Reporting', 'Document Control'],
    status: 'In Progress',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-10')),
    dateDue: Timestamp.fromDate(new Date('2024-03-10')),
    managementResponse: 'In progress. Draft procedures under review.',
    actionPlan: '1. Document current backup process\n2. Define RPO/RTO requirements\n3. Test recovery procedures',
    originalSource: 'Annual IT Audit 2024',
    importBatch: 'manual-seed-2024',
    modifiedBy: 'system',
  },
  {
    auditYear: 2024,
    subholding: 'Surabaya Branch',
    projectType: 'Hotel',
    projectName: 'Grand Surabaya Hotel',
    findingDepartment: 'IT Support',
    executor: 'Ahmad Rahman',
    reviewer: 'Siti Nurhaliza',
    manager: 'Budi Santoso',
    controlCategory: 'Corrective',
    processArea: 'IT',
    findingTitle: 'Outdated Software Versions in Use',
    findingDescription: 'Multiple workstations running unsupported operating system versions with known vulnerabilities. Affects approximately 25 workstations.',
    rootCause: 'Lack of patch management policy and insufficient IT resources for regular updates.',
    impactDescription: 'Exposure to known security vulnerabilities, potential malware infections, compliance issues.',
    recommendation: 'Upgrade all systems to supported versions and implement patch management policy.',
    findingBobot: 3,
    findingKadar: 4,
    primaryTag: 'Change Management',
    secondaryTags: ['IT Infrastructure', 'System Integration'],
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-20')),
    dateDue: Timestamp.fromDate(new Date('2024-02-28')),
    originalSource: 'Branch IT Assessment',
    importBatch: 'manual-seed-2024',
    modifiedBy: 'system',
  },
  {
    auditYear: 2024,
    subholding: 'Jakarta Office',
    projectType: 'Office Building',
    projectName: 'Jakarta Tower',
    findingDepartment: 'Vendor Relations',
    executor: 'Lisa Anderson',
    reviewer: 'David Wilson',
    manager: 'Carol Martinez',
    controlCategory: 'Preventive',
    processArea: 'Procurement',
    findingTitle: 'Incomplete Vendor Due Diligence Documentation',
    findingDescription: 'Several third-party vendors lack proper due diligence documentation and risk assessments. Affects 12 out of 45 active vendors.',
    rootCause: 'Inadequate vendor onboarding process and lack of standardized documentation requirements.',
    impactDescription: 'Increased vendor risk, potential compliance violations, reputational damage.',
    recommendation: 'Complete due diligence for all active vendors and establish ongoing review process.',
    findingBobot: 3,
    findingKadar: 2,
    primaryTag: 'Vendor Management',
    secondaryTags: ['Document Retention', 'Regulatory Compliance'],
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-05')),
    dateDue: Timestamp.fromDate(new Date('2024-04-05')),
    managementResponse: 'Acknowledged. Prioritizing high-risk vendors first.',
    originalSource: 'Procurement Audit 2024',
    importBatch: 'manual-seed-2024',
    modifiedBy: 'system',
  },
  {
    auditYear: 2024,
    subholding: 'Bandung Branch',
    projectType: 'Apartment',
    projectName: 'Bandung Heights',
    findingDepartment: 'Accounts Payable',
    executor: 'Robert Chen',
    reviewer: 'Emily Davis',
    manager: 'Frank Thompson',
    controlCategory: 'Preventive',
    processArea: 'Finance',
    findingTitle: 'Lack of Segregation of Duties in Payment Processing',
    findingDescription: 'Single individuals can initiate, approve, and process payments without oversight. Critical control weakness.',
    rootCause: 'Insufficient staffing and lack of system controls for dual authorization.',
    impactDescription: 'High risk of fraud, unauthorized payments, financial loss.',
    recommendation: 'Implement maker-checker controls for all payment transactions above threshold.',
    findingBobot: 4,
    findingKadar: 5,
    primaryTag: 'Segregation of Duties',
    secondaryTags: ['Payment Authorization', 'Dual Authorization', 'Internal Control'],
    status: 'Open',
    dateIdentified: Timestamp.fromDate(new Date('2023-12-20')),
    dateDue: Timestamp.fromDate(new Date('2024-01-20')),
    managementResponse: 'Critical issue. Implementation in progress.',
    actionPlan: '1. Define approval thresholds\n2. Update system workflows\n3. Train staff\n4. Monitor compliance',
    originalSource: 'Financial Controls Review',
    importBatch: 'manual-seed-2024',
    modifiedBy: 'system',
  },
  {
    auditYear: 2024,
    subholding: 'Jakarta Office',
    projectType: 'Mixed-Use Development',
    projectName: 'Central Park Complex',
    findingDepartment: 'HR Operations',
    executor: 'Maria Garcia',
    reviewer: 'Thomas Lee',
    manager: 'Patricia Wong',
    controlCategory: 'Preventive',
    processArea: 'HR',
    findingTitle: 'Inadequate Employee Training on Data Privacy',
    findingDescription: 'Staff handling personal data have not received GDPR/privacy training in the past 12 months.',
    rootCause: 'No formal training program and lack of compliance monitoring.',
    impactDescription: 'Risk of data privacy violations, regulatory fines, reputational damage.',
    recommendation: 'Conduct mandatory data privacy training for all staff handling personal information.',
    findingBobot: 3,
    findingKadar: 2,
    primaryTag: 'Training & Development',
    secondaryTags: ['Regulatory Compliance', 'Policy & Procedure'],
    status: 'In Progress',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-12')),
    dateDue: Timestamp.fromDate(new Date('2024-03-31')),
    managementResponse: 'Training sessions scheduled for February 2024.',
    originalSource: 'Compliance Review 2024',
    importBatch: 'manual-seed-2024',
    modifiedBy: 'system',
  },
  {
    auditYear: 2024,
    subholding: 'Medan Branch',
    projectType: 'Hotel',
    projectName: 'Medan Grand Hotel',
    findingDepartment: 'Application Development',
    executor: 'Daniel Kim',
    reviewer: 'Rachel Green',
    manager: 'Steven Park',
    controlCategory: 'Corrective',
    processArea: 'IT',
    findingTitle: 'Unencrypted Data Transmission',
    findingDescription: 'Internal applications transmit sensitive data over unencrypted HTTP connections.',
    rootCause: 'Legacy applications not updated to modern security standards.',
    impactDescription: 'Data interception risk, compliance violations, security breach potential.',
    recommendation: 'Migrate all applications to HTTPS and disable HTTP access.',
    findingBobot: 3,
    findingKadar: 4,
    primaryTag: 'Data Security',
    secondaryTags: ['Application Controls', 'IT Infrastructure'],
    status: 'Deferred',
    dateIdentified: Timestamp.fromDate(new Date('2024-01-18')),
    dateDue: Timestamp.fromDate(new Date('2024-06-30')),
    managementResponse: 'Deferred to Q3 2024 due to resource constraints.',
    originalSource: 'Network Security Scan',
    importBatch: 'manual-seed-2024',
    modifiedBy: 'system',
  },
  {
    auditYear: 2023,
    subholding: 'Surabaya Branch',
    projectType: 'Mall',
    projectName: 'Surabaya Shopping Center',
    findingDepartment: 'Security',
    executor: 'Thomas Anderson',
    reviewer: 'Patricia Moore',
    manager: 'James Wilson',
    controlCategory: 'Preventive',
    processArea: 'IT',
    findingTitle: 'Weak Password Policy Implementation',
    findingDescription: 'Current password policy allows weak passwords and does not enforce regular changes.',
    rootCause: 'Outdated security policy not aligned with current best practices.',
    impactDescription: 'Increased risk of unauthorized access through password compromise.',
    recommendation: 'Implement strong password policy with complexity requirements and MFA.',
    findingBobot: 3,
    findingKadar: 2,
    primaryTag: 'Password Controls',
    secondaryTags: ['Access Control', 'Multi-Factor Authentication'],
    status: 'Closed',
    dateIdentified: Timestamp.fromDate(new Date('2023-11-15')),
    dateDue: Timestamp.fromDate(new Date('2023-12-31')),
    dateCompleted: Timestamp.fromDate(new Date('2023-12-28')),
    managementResponse: 'Completed. New policy implemented across all systems.',
    actionPlan: 'Policy updated and enforced via Active Directory.',
    originalSource: 'Security Audit Q4 2023',
    importBatch: 'manual-seed-2024',
    modifiedBy: 'system',
  },
];


/**
 * Seeds the Firestore database with sample findings using new schema
 */
export async function seedNewFindings(): Promise<void> {
  console.log('🌱 Starting to seed findings with NEW schema...');
  
  try {
    const findingsCollection = collection(db, 'findings');
    let successCount = 0;
    let errorCount = 0;

    for (const findingData of sampleFindings) {
      try {
        // Calculate auto-generated fields
        const findingTotal = calculateFindingTotal(findingData.findingBobot, findingData.findingKadar);
        const priorityLevel = calculatePriorityLevel(findingTotal);
        const now = Timestamp.now();
        
        const finding: Omit<Finding, 'id'> = {
          ...findingData,
          findingTotal,
          priorityLevel,
          creationTimestamp: now,
          lastModifiedDate: now,
        };

        const docRef = await addDoc(findingsCollection, finding);
        console.log(`✅ Added: ${finding.findingTitle} (ID: ${docRef.id})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed: ${findingData.findingTitle}`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Successfully added: ${successCount} findings`);
    console.log(`   ❌ Failed: ${errorCount} findings`);
    console.log(`   📈 Total: ${sampleFindings.length} findings`);
    console.log('\n🎉 New schema data seeding complete!');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

/**
 * Expose seeding function globally for console access
 */
if (typeof window !== 'undefined') {
  (window as any).seedNewFindings = seedNewFindings;
}
