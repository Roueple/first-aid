# Development Conventions

## Documentation Policy

**DO NOT create markdown files or documentation unless explicitly requested by the user.**

This includes:
- No summary files after completing work
- No completion reports
- No changelog files
- No architecture diagrams
- No README files for simple features
- No "COMPLETE.md" or "SUMMARY.md" files

The codebase already has extensive documentation. Focus on writing code, not documentation.

## Testing Policy

**DO NOT create test files unless explicitly requested by the user.**

This includes:
- No unit tests for new services
- No integration tests for new features
- No component tests for new UI
- No test files in `__tests__/` directories

Only create tests when the user specifically asks for them ("add tests for this", "write unit tests", etc.).

## When Documentation IS Appropriate

Only create documentation when:
1. User explicitly asks for it ("document this feature", "create a README", etc.)
2. Adding a new complex feature that requires explanation for future developers
3. Updating existing documentation that is now outdated

## Code Comments

- Use inline comments sparingly - code should be self-documenting
- Add JSDoc comments for public APIs and complex functions
- Explain "why", not "what" in comments

## Commit Messages

Keep commit messages concise and descriptive:
- Good: "Fix query router filter extraction for date ranges"
- Bad: "Updated the query router service to handle edge cases in filter extraction..."

## Work Summary

When completing work, provide a brief verbal summary in chat:
- State what was done in 1-2 sentences
- No bullet points
- No markdown files

Example: "Fixed the department filter to handle null values and added validation. The query router now correctly processes department-based queries."
