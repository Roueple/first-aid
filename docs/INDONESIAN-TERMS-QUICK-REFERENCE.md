# Indonesian Real Estate Terms - Quick Reference

## 🎯 Quick Test Queries

Copy and paste these into the chatbot to test:

```
show me findings about PPJB in 2024
issues with IMB permits
SHM certificate problems in 2023
KPR mortgage findings
BPHTB tax issues
AJB deed problems
```

## 📚 Term Dictionary

**Full Dictionary Available**: `dictionary.md` (200+ terms across 10 categories)

### Quick Reference (Most Common Terms)

| Acronym | Indonesian Full Name | English Translation | Category |
|---------|---------------------|---------------------|----------|
| **PPJB** | Perjanjian Pengikatan Jual Beli | Binding Sale and Purchase Agreement | Legal |
| **AJB** | Akta Jual Beli | Final Sale and Purchase Deed | Legal |
| **SHM** | Sertifikat Hak Milik | Freehold Certificate | Legal |
| **SHGB** | Sertifikat Hak Guna Bangunan | Building Use Rights Certificate | Legal |
| **SHMSRS** | - | Strata Title Certificate | Legal |
| **IMB** | Izin Mendirikan Bangunan | Building Permit | Permit |
| **PBG** | Persetujuan Bangunan Gedung | Building Approval | Permit |
| **SLF** | Sertifikat Laik Fungsi | Functional Worthiness Certificate | Permit |
| **PBB** | Pajak Bumi dan Bangunan | Land and Building Tax | Tax |
| **BPHTB** | Bea Perolehan Hak atas Tanah dan Bangunan | Land Acquisition Duty | Tax |
| **KPR** | Kredit Pemilikan Rumah | Home Ownership Credit/Mortgage | Financial |
| **DP** | Down Payment | Uang Muka | Financial |
| **UTJ** | Uang Tanda Jadi | Earnest Money | Financial |
| **IPL** | Iuran Pengelolaan Lingkungan | Service/Maintenance Charge | Financial |
| **IGD** | Instalasi Gawat Darurat | Emergency Department | Hospital |
| **ICU** | Intensive Care Unit | Critical Care | Hospital |
| **BPJS** | BPJS Kesehatan | National Health Insurance | Hospital |
| **BOR** | Bed Occupancy Rate | Occupancy Rate | Hospital |
| **ADR** | Average Daily Rate | Average Room Rate | Hotel |
| **RevPAR** | Revenue Per Available Room | Revenue Efficiency | Hotel |
| **GOP** | Gross Operating Profit | Operating Profit | Hotel |
| **MICE** | Meetings, Incentives, Conferences, Events | Business Events | Hotel |
| **SKS** | Satuan Kredit Semester | Credit Hours | Education |
| **IPK** | Indeks Prestasi Kumulatif | GPA | Education |
| **UKT** | Uang Kuliah Tunggal | Single Tuition | Education |

**Note**: The AI references the full `dictionary.md` file which contains comprehensive definitions for all business units (Landed House, Apartment, Hotel, Hospital, Clinic, School, University) plus financial and legal terms.

## 🔍 How It Works

### Example: PPJB Query

**User Input:**
```
show me findings about PPJB in 2024
```

**AI Processing:**
1. Recognizes "PPJB" as Indonesian term
2. Understands: PPJB = Binding Sale and Purchase Agreement
3. Expands keywords:
   - PPJB
   - Perjanjian Pengikatan Jual Beli
   - binding sale agreement
   - purchase agreement
4. Enables semantic search
5. Searches for all related concepts

**Result:**
- Finds exact matches: "PPJB"
- Finds full term: "Perjanjian Pengikatan Jual Beli"
- Finds concepts: "sale agreement", "binding contract", "purchase agreement"
- Returns all relevant findings from 2024

## ✅ What Changed

### Before
```
Query: "show me findings about PPJB in 2024"
Result: 0 findings ❌
Reason: AI didn't understand PPJB
```

### After
```
Query: "show me findings about PPJB in 2024"
Result: All relevant findings ✅
Reason: AI understands PPJB and searches semantically
```

## 🚀 Usage Tips

### 1. Use Indonesian Terms Naturally
```
✅ "show me PPJB findings"
✅ "issues with IMB"
✅ "SHM problems"
```

### 2. Combine with Filters
```
✅ "critical PPJB findings in 2024"
✅ "open IMB issues in hotels"
✅ "SHM certificate problems in apartments"
```

### 3. Ask for Analysis
```
✅ "analyze PPJB trends"
✅ "what are common IMB issues?"
✅ "summarize SHM problems"
```

## 🧪 Testing

### Run Manual Tests
```bash
npm test -- QueryRouterService.manual.test.ts
```

### Expected Output
```
Scenario 4: Indonesian Real Estate Terms
  ✓ should understand Indonesian term: "show me findings about PPJB in 2024"
  ✓ should understand Indonesian term: "issues with IMB permits"
  ✓ should understand Indonesian term: "SHM certificate problems in 2023"
  ✓ should execute PPJB query with semantic search
```

## 📖 Full Documentation

For complete details, see:
- [Indonesian Real Estate Domain Knowledge Guide](./docs/indonesian-real-estate-domain-knowledge.md)
- [Implementation Summary](./INDONESIAN-DOMAIN-KNOWLEDGE-SUMMARY.md)

## 🔧 Adding New Terms

### Step 1: Update AI Prompt
File: `src/services/IntentRecognitionService.ts`

```typescript
COMMON INDONESIAN REAL ESTATE TERMS:
- NEW_TERM (Full Indonesian Name): English Definition
```

### Step 2: Update Fallback Dictionary
```typescript
const indonesianTerms: Record<string, string[]> = {
  'new_term': ['NEW_TERM', 'Full Indonesian Name', 'english translation'],
};
```

### Step 3: Test
```bash
npm test -- QueryRouterService.manual.test.ts
```

## 💡 Key Benefits

1. **No More Zero Results** - Indonesian terms now return relevant findings
2. **Semantic Search** - Finds related concepts, not just exact matches
3. **User-Friendly** - Use familiar Indonesian terminology
4. **Automatic Expansion** - AI expands acronyms automatically
5. **Robust Fallback** - Works even if AI service is down

## 📞 Support

If a term isn't recognized:
1. Check spelling (case-insensitive)
2. Add to dictionary (see "Adding New Terms")
3. Test with manual test suite

---

**Last Updated**: December 4, 2025  
**Status**: ✅ Implemented and Tested
