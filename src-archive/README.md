# Archived Source Code

This directory contains archived/deprecated source code that has been replaced by newer implementations.

## Archived Services (2024-12-09)

### Old Query Services (Replaced by DocAISimpleQueryService)

**Archived Files:**
- `services/DocAIFilterService.ts` - Old filter service with manual confirmation flow
- `services/SimpleQueryService.ts` - Pattern-based query matching service
- `services/SimpleQueryExecutor.ts` - Query executor for pattern-based queries
- `services/SimpleQueryMatcher.ts` - Pattern matcher
- `services/queryPatterns.ts` - Predefined query patterns
- `components/DocAIFilterMode.tsx` - Old filter mode UI component
- `config/simpleQuery.config.ts` - Old configuration

**Reason for Archival:**
These services were replaced by the new AI-driven query system:
- `DocAISimpleQueryService.ts` - Core orchestration with AI interpretation
- `DocAIQueryBuilder.ts` - Builds Firebase queries from extracted filters
- `DocAIFilterExtractor.ts` - LLM-based filter extraction
- `DocAIResultFormatter.ts` - Result formatting and Excel export

**Key Improvements in New System:**
- ✅ AI interprets user intent instead of pattern matching
- ✅ Year always handled as string ("2024")
- ✅ Department filter joins with normalized departments table
- ✅ Better confirmation flow with 5-minute expiry
- ✅ Indonesian language support
- ✅ Database info queries ("apa saja departemen?")
- ✅ Unified UI (no separate filter/analyze modes)

## Related Documentation

Archived documentation moved to `docs-archive/archived-features/`:
- `docai-filter-mode.md`
- `docai-filter-mode-quick-start.md`
- `DOCAI-FILTER-MODE-IMPLEMENTATION.md`
- `DOCAI-FILTER-INTEGRATED.md`
- `simple-query-configuration.md`
