/**
 * Constants and helper functions for Finding types
 * Based on findings-table-structure.md
 */

/**
 * Complete Tag Library organized by category
 */
export const TAG_LIBRARY = {
  'Financial/Revenue': [
    'NPV & Koridor Discount',
    'Perhitungan Komisi',
    'Pricing & Discounting',
    'Revenue Recognition',
    'Cost Allocation',
    'Down Payment Management',
    'Installment Control',
    'Cash Flow Management',
    'Budget Variance',
  ],
  'Customer/Sales': [
    'Kelengkapan Data Konsumen',
    'Customer Due Diligence',
    'Sales Process',
    'SPPJB (Surat Perjanjian Pengikatan Jual Beli)',
    'Booking Process',
    'Customer Verification',
    'KYC (Know Your Customer)',
    'Customer Complaints',
    'After Sales Service',
  ],
  'Marketing & Promotion': [
    'Barang Promosi',
    'Souvenir',
    'Rumah Contoh (Show Unit)',
    'Digital Marketing',
    'Marketing Materials',
    'Event Management',
    'Advertising Campaign',
    'Social Media Management',
    'Lead Management',
    'Promotional Budget',
  ],
  'Legal & Compliance': [
    'PPATK (Anti Money Laundering)',
    'PBB (Property Tax)',
    'PBG (Building Permit)',
    'Ganti Nama (Title Transfer)',
    'Contract Management',
    'Licensing',
    'Regulatory Compliance',
    'Legal Documentation',
    'IMB (Izin Mendirikan Bangunan)',
    'Certificate Processing',
    'Notary Coordination',
  ],
  'IT Controls': [
    'Access Control',
    'Data Security',
    'System Integration',
    'Change Management',
    'Backup & Recovery',
    'User Management',
    'Password Controls',
    'Superuser Management',
    'Multi-Factor Authentication',
    'Data Exfiltration',
    'Shared Accounts',
    'Application Controls',
    'Database Management',
    'IT Infrastructure',
  ],
  'Operational': [
    'Procurement Process',
    'Vendor Management',
    'Inventory Management',
    'Asset Management',
    'Construction Management',
    'Project Timeline',
    'Quality Control',
    'Maintenance Management',
    'Facility Management',
    'Security Management',
  ],
  'Finance & Accounting': [
    'Journal Entry Controls',
    'Reconciliation',
    'Payment Authorization',
    'Budget Management',
    'Fixed Asset',
    'Accounts Receivable',
    'Accounts Payable',
    'General Ledger',
    'Month-End Closing',
    'Financial Reporting',
  ],
  'HR & Payroll': [
    'Attendance',
    'Payroll Processing',
    'Leave Management',
    'Employee Master Data',
    'Recruitment',
    'Performance Management',
    'Training & Development',
    'Employee Benefits',
  ],
  'Document & Record': [
    'Document Retention',
    'Filing System',
    'Approval Documentation',
    'Supporting Evidence',
    'Archive Management',
    'SOP Compliance',
    'Document Control',
  ],
  'Treasury & Banking': [
    'Bank Reconciliation',
    'Cash Management',
    'Petty Cash',
    'Bank Account Management',
    'Payment Processing',
    'Treasury Controls',
  ],
  'Tax Management': [
    'VAT (PPN)',
    'Income Tax (PPh)',
    'Property Tax (PBB)',
    'Land & Building Tax',
    'Tax Reporting',
    'Tax Compliance',
  ],
  'Project Development': [
    'Land Acquisition',
    'Project Planning',
    'Development Timeline',
    'Contractor Management',
    'Progress Monitoring',
    'Handover Process',
  ],
  'Hotel Operations': [
    'Room Revenue',
    'F&B Operations',
    'Guest Services',
    'Housekeeping',
    'Reservation System',
    'Hotel System Controls',
  ],
  'Property Management': [
    'Tenant Management',
    'Service Charge',
    'Utility Management',
    'Common Area Management',
    'Occupancy Management',
  ],
  'Other': [
    'Lain-lain',
    'Cross-functional',
    'Policy & Procedure',
    'Governance',
    'Segregation of Duties',
    'Dual Authorization',
    'Internal Control',
  ],
} as const;

/**
 * Flatten tag library for easy access
 */
export const ALL_TAGS = Object.values(TAG_LIBRARY).flat();

/**
 * Process areas
 */
export const PROCESS_AREAS = [
  'Sales',
  'Procurement',
  'Finance',
  'HR',
  'IT',
  'Legal',
  'Marketing',
  'Construction',
  'Project Development',
  'Customer Service',
  'Property Management',
] as const;

/**
 * Calculate priority level based on Finding_Total (Bobot × Kadar)
 * @param findingTotal - Combined score (1-20)
 * @returns Priority level
 */
export function calculatePriorityLevel(findingTotal: number): 'Critical' | 'High' | 'Medium' | 'Low' {
  if (findingTotal >= 16) return 'Critical'; // 16-20
  if (findingTotal >= 11) return 'High';     // 11-15
  if (findingTotal >= 6) return 'Medium';    // 6-10
  return 'Low';                               // 1-5
}

/**
 * Calculate Finding_Total from Bobot and Kadar
 * @param bobot - Weight/Severity (1-4)
 * @param kadar - Degree/Intensity (1-5)
 * @returns Combined score (1-20)
 */
export function calculateFindingTotal(bobot: number, kadar: number): number {
  return bobot * kadar;
}

/**
 * Generate Finding ID
 * @param year - Audit year
 * @param sequence - Sequence number
 * @returns Finding ID (e.g., FND-2024-001)
 */
export function generateFindingId(year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `FND-${year}-${paddedSequence}`;
}
