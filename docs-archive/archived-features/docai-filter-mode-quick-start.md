# DocAI:2 Filter Mode - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Open Filter Mode

1. Go to **Doc Assistant** page
2. Click the **purple "Filter Mode"** button in the header

![Filter Mode Button Location]
```
┌─────────────────────────────────────────────────┐
│ Doc Assistant                    [New Chat] [Filter Mode] │
└─────────────────────────────────────────────────┘
                                              ↑
                                    Click this purple button
```

### Step 2: Enter Your Query

Type what you want to find in natural language:

**Examples:**
```
✅ "Show all IT related findings in 2024"
✅ "Find critical findings with risk score above 15"
✅ "Get all Finance department findings from last year"
✅ "Show me findings for Grand Hotel Jakarta"
```

### Step 3: Confirm & View Results

1. AI shows interpretation → Click **"Confirm & Execute"**
2. View results (first 10 shown)
3. Click **"Export XLSX"** to download all results

---

## 📊 Understanding Results

### Risk Level Badges

| Badge | Risk Score | Meaning |
|-------|------------|---------|
| 🔴 **CRITICAL** | 16-25 | Immediate action required |
| 🟠 **HIGH** | 11-15 | High priority |
| 🟡 **MEDIUM** | 6-10 | Moderate priority |
| 🟢 **LOW** | 0-5 | Low priority |

### Result Display

```
1. CWSACCF01 🔴 CRITICAL
   Project: Citra World Surabaya
   Department: Accounting | Year: 2024
   Risk Score: 20/25 (Bobot: 4, Kadar: 5)
   Type: Finding
   Description: Lack of segregation of duties in payment processing...
```

---

## 💡 Query Examples by Use Case

### By Department
```
"Show all IT findings"
"Find HR department findings"
"Get Finance findings from 2024"
```

### By Risk Level
```
"Show critical findings"
"Find high risk findings"
"Get findings with risk score above 15"
```

### By Project
```
"Show findings for Grand Hotel Jakarta"
"Find all findings for Citra World Surabaya"
```

### By Year
```
"Show findings from 2024"
"Get last year's findings"
"Find 2023 findings"
```

### Combined Filters
```
"Show critical IT findings from 2024"
"Find high risk Finance findings"
"Get IT and HR findings from last year"
```

### Text Search
```
"Find findings about security"
"Search for access control issues"
"Show findings mentioning compliance"
```

---

## 📥 Exporting Results

### XLSX Export Includes:

- ✅ All results (not just first 10)
- ✅ Complete details for each finding
- ✅ Risk level calculations
- ✅ Auto-sized columns
- ✅ Professional formatting

### File Format:

```
audit-results-2024-12-08T14-30-45.xlsx
```

### Columns:
1. Audit Result ID
2. Year
3. Subholding
4. Project Name
5. Department
6. Risk Area
7. Description
8. Code
9. Bobot
10. Kadar
11. Nilai (Risk Score)
12. Risk Level

---

## ⚡ Tips for Best Results

### ✅ DO:
- Be specific about what you want
- Include year when relevant
- Use department names correctly
- Mention risk levels clearly

### ❌ DON'T:
- Use vague terms like "some" or "maybe"
- Mix multiple unrelated criteria
- Forget to confirm interpretation
- Ignore low confidence scores

---

## 🔍 Understanding AI Interpretation

### Confidence Score

```
┌─────────────────────────────────────┐
│ Confidence: ████████░░ 85%          │
└─────────────────────────────────────┘
```

| Score | Meaning | Action |
|-------|---------|--------|
| 90-100% | Very confident | Safe to proceed |
| 70-89% | Confident | Review interpretation |
| 50-69% | Uncertain | Check carefully |
| <50% | Low confidence | Refine query |

### Filter Tags

Visual representation of extracted filters:

```
┌─────────────────────────────────────┐
│ 📋 Query Filters:                   │
│                                     │
│ Year: [2024]                        │
│ Department: [IT]                    │
│ Min Risk Score: [15]                │
│ [Only Findings]                     │
└─────────────────────────────────────┘
```

---

## 🎯 Common Scenarios

### Scenario 1: Monthly Review
**Goal**: Review all findings from current month

**Query**: "Show all findings from December 2024"

**Result**: All findings from specified period

---

### Scenario 2: Department Audit
**Goal**: Prepare for IT department audit

**Query**: "Show all IT findings from 2024"

**Result**: Complete IT findings list for review

---

### Scenario 3: Risk Assessment
**Goal**: Identify critical issues

**Query**: "Find critical findings with risk score above 15"

**Result**: High-priority items requiring immediate attention

---

### Scenario 4: Project Review
**Goal**: Review specific project findings

**Query**: "Show findings for Grand Hotel Jakarta"

**Result**: All findings related to that project

---

## 🛠️ Troubleshooting

### Problem: No results found

**Possible Causes:**
- Filters too restrictive
- Typo in department/project name
- No data matching criteria

**Solution:**
1. Click "← Back"
2. Try broader criteria
3. Check spelling
4. Remove some filters

---

### Problem: Wrong interpretation

**Possible Causes:**
- Ambiguous query
- Multiple interpretations possible

**Solution:**
1. Click "← Back"
2. Be more specific
3. Add more context (year, department)
4. Use exact names

---

### Problem: Low confidence score

**Possible Causes:**
- Unclear query
- Missing information

**Solution:**
1. Review interpretation carefully
2. Add more details
3. Use clearer language
4. Break into simpler query

---

## 📚 Quick Reference

### Available Departments
- IT
- HR
- Finance
- Sales
- Procurement
- Legal
- Marketing
- Accounting
- Operations

### Risk Score Ranges
- **Critical**: 16-25
- **High**: 11-15
- **Medium**: 6-10
- **Low**: 0-5

### Year Range
- 2020-2025 (current data)

### Finding Types
- **Finding**: Has code (F01, F02, etc.)
- **Non-Finding**: Empty code

---

## 🎓 Learning Path

### Beginner
1. Start with simple queries: "Show IT findings"
2. Add year filter: "Show IT findings from 2024"
3. Try risk filters: "Show critical IT findings"

### Intermediate
1. Combine multiple filters
2. Use text search
3. Export results to XLSX

### Advanced
1. Complex multi-criteria queries
2. Understand confidence scores
3. Refine queries based on results

---

## 📞 Need Help?

### Common Questions

**Q: Can I search multiple departments?**  
A: Yes! "Show IT and HR findings"

**Q: Can I search by date range?**  
A: Currently year-based only. Use "2024" or "last year"

**Q: How many results can I export?**  
A: All results! No limit on XLSX export

**Q: Can I save queries?**  
A: Not yet, but coming in future version

---

## ✨ Pro Tips

1. **Start Broad**: Begin with simple query, then refine
2. **Check Interpretation**: Always review before confirming
3. **Use Export**: Download XLSX for detailed analysis
4. **Be Specific**: Include year and department for best results
5. **Learn from Examples**: Try the provided examples first

---

**Ready to start?** Click the purple "Filter Mode" button and try your first query! 🚀
