# Indonesian Real Estate Domain Knowledge Integration

## Overview

The AI chatbot now has built-in domain knowledge about Indonesian real estate terminology. This enables it to understand queries using Indonesian terms and automatically expand them for better semantic search results.

## Problem Solved

**Before**: Query "show me findings about PPJB in 2024" would return 0 results because:
- The AI didn't understand what PPJB means
- It couldn't connect PPJB to related concepts in the database
- Semantic search couldn't find relevant findings

**After**: The same query now:
1. Recognizes PPJB as "Perjanjian Pengikatan Jual Beli" (Binding Sale and Purchase Agreement)
2. Expands keywords to include: ["PPJB", "Perjanjian Pengikatan Jual Beli", "binding sale agreement", "purchase agreement"]
3. Uses semantic search to find all related findings
4. Returns relevant results even if exact term doesn't match

## Indonesian Real Estate Terms Supported

### Legal Documents
- **PPJB** (Perjanjian Pengikatan Jual Beli): Binding Sale and Purchase Agreement
- **AJB** (Akta Jual Beli): Final Sale and Purchase Deed
- **SHM** (Sertifikat Hak Milik): Freehold Certificate
- **SHGB** (Sertifikat Hak Guna Bangunan): Building Use Rights Certificate

### Permits & Taxes
- **IMB** (Izin Mendirikan Bangunan): Building Permit
- **PBB** (Pajak Bumi dan Bangunan): Land and Building Tax
- **BPHTB** (Bea Perolehan Hak atas Tanah dan Bangunan): Land Acquisition Duty

### Financial
- **KPR** (Kredit Pemilikan Rumah): Home Ownership Credit/Mortgage
- **DP** (Down Payment): Uang Muka

### Property Types
- **Kavling**: Land plot/lot
- **Rumah Tapak**: Landed house
- **Apartemen**: Apartment
- **Indent**: Pre-order/booking system

## Dictionary Integration

The AI now references a comprehensive dictionary file located at:
```
C:\Users\IA-GERALDI\WORKPAPER\Proyek\Ongoing\IA2025\FIRST-AID\dictionary.md
```

This dictionary contains **200+ Indonesian real estate terms** organized into 10 sections:
1. General Real Estate Terms (Land Rights, Area Measurements)
2. Landed House (Perumahan) - Property types, components, facilities
3. Apartment (Apartemen) - Unit types, building classification
4. Hotel - Classifications, room types, operations, MICE
5. Hospital (Rumah Sakit) - Types, departments, operations
6. Clinic (Klinik) - Types, services, licensing
7. School (Sekolah) - Levels, facilities, academic terms
8. University (Universitas) - Types, structure, facilities
9. Financial & Accounting Terms - Revenue, costs, ratios
10. Legal & Compliance Terms - Permits, licenses, regulations

The AI is instructed to:
- Reference this dictionary for any unknown Indonesian terms
- Assume unfamiliar terms are likely defined in the dictionary
- Automatically expand terms for semantic search
- Enable semantic search for better results

## How It Works

### 1. Intent Recognition with Domain Context

When a user sends a query, the `IntentRecognitionService` now:

```typescript
// User query: "show me findings about PPJB in 2024"

// Step 1: AI receives domain context
const prompt = `
You are analyzing queries for a Real Estate company in Indonesia.

DOMAIN CONTEXT:
- PPJB = Perjanjian Pengikatan Jual Beli (Binding Sale Agreement)
- [other terms...]

When you see PPJB:
1. Understand it means Binding Sale Agreement
2. Extract keywords: ["PPJB", "Perjanjian Pengikatan Jual Beli", "binding sale agreement"]
3. Enable semantic search (requiresAnalysis: true)
`;

// Step 2: AI extracts intent
{
  "intent": "Find findings about PPJB agreements",
  "filters": {
    "keywords": ["PPJB", "Perjanjian Pengikatan Jual Beli", "binding sale agreement"],
    "year": 2024
  },
  "requiresAnalysis": true  // Enables semantic search
}
```

### 2. Semantic Search with Expanded Keywords

The expanded keywords enable semantic search to find:
- Exact matches: "PPJB"
- Full term matches: "Perjanjian Pengikatan Jual Beli"
- Concept matches: "binding sale agreement", "purchase agreement"
- Related findings: "sale contract", "buyer agreement", etc.

### 3. Fallback Support

Even if the AI service is unavailable, the system has fallback pattern matching:

```typescript
const indonesianTerms = {
  'ppjb': ['PPJB', 'Perjanjian Pengikatan Jual Beli', 'binding sale agreement'],
  'ajb': ['AJB', 'Akta Jual Beli', 'sale deed'],
  // ... more terms
};
```

## Example Queries

### Query 1: PPJB Findings
```
User: "show me findings about PPJB in 2024"

AI Understanding:
- Term: PPJB = Binding Sale and Purchase Agreement
- Keywords: ["PPJB", "Perjanjian Pengikatan Jual Beli", "binding sale agreement"]
- Year: 2024
- Search Type: Semantic (hybrid)

Results: All findings related to sale agreements, binding contracts, PPJB documents in 2024
```

### Query 2: Building Permits
```
User: "issues with IMB permits"

AI Understanding:
- Term: IMB = Izin Mendirikan Bangunan (Building Permit)
- Keywords: ["IMB", "Izin Mendirikan Bangunan", "building permit"]
- Search Type: Semantic (hybrid)

Results: All findings about building permits, IMB issues, construction permits
```

### Query 3: Freehold Certificates
```
User: "SHM certificate problems in 2023"

AI Understanding:
- Term: SHM = Sertifikat Hak Milik (Freehold Certificate)
- Keywords: ["SHM", "Sertifikat Hak Milik", "freehold certificate", "ownership certificate"]
- Year: 2023
- Search Type: Semantic (hybrid)

Results: All findings about ownership certificates, SHM issues, freehold problems in 2023
```

## Technical Implementation

### Files Modified

1. **src/services/IntentRecognitionService.ts**
   - Added Indonesian real estate domain context to AI prompt
   - Added term expansion rules
   - Added fallback pattern matching for Indonesian terms
   - Enhanced keyword extraction

### Key Changes

```typescript
// Before: Generic intent recognition
buildIntentPrompt(query: string) {
  return `You are an intent recognition system...`;
}

// After: Domain-aware intent recognition
buildIntentPrompt(query: string) {
  return `You are an intent recognition system for a Real Estate company in Indonesia.
  
  DOMAIN CONTEXT - Indonesian Real Estate:
  - PPJB (Perjanjian Pengikatan Jual Beli): Binding Sale Agreement
  - [full term definitions...]
  
  When you see Indonesian terms:
  1. Understand the definition
  2. Expand to related keywords
  3. Enable semantic search
  `;
}
```

## Benefits

1. **Better Search Results**: Queries with Indonesian terms now return relevant results
2. **Semantic Understanding**: AI understands concepts, not just exact text matches
3. **User-Friendly**: Users can use familiar Indonesian terminology
4. **Robust**: Works even if AI service is unavailable (fallback patterns)
5. **Expandable**: Easy to add more terms to the dictionary

## Adding New Terms

To add new Indonesian real estate terms:

1. **Update the AI prompt** in `IntentRecognitionService.ts`:
```typescript
COMMON INDONESIAN REAL ESTATE TERMS:
- YOUR_TERM (Full Indonesian Name): English Definition
```

2. **Update the fallback dictionary**:
```typescript
const indonesianTerms: Record<string, string[]> = {
  'your_term': ['YOUR_TERM', 'Full Indonesian Name', 'english translation'],
};
```

## Testing

Test queries to verify:
- ✅ "show me findings about PPJB in 2024"
- ✅ "issues with IMB permits"
- ✅ "SHM certificate problems"
- ✅ "KPR mortgage findings"
- ✅ "BPHTB tax issues 2023"

All should return relevant results using semantic search.

## Related Documentation

- [Smart Query Router V2 Integration](./smart-query-router-v2-integration.md)
- [Hybrid RAG Implementation](./hybrid-rag-implementation.md)
- [Intent Recognition Service](../src/services/IntentRecognitionService.ts)
