@echo off
REM ============================================
REM FIRST-AID Test Suite Runner
REM Task 11: Checkpoint - Run All Tests
REM ============================================

echo.
echo ========================================
echo FIRST-AID - Running All Test Suites
echo ========================================
echo.

REM Create test results directory
if not exist "test-results" mkdir test-results

REM Set timestamp for results
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo [%time%] Starting test execution...
echo.

REM ============================================
REM 1. TypeScript Compilation Check
REM ============================================
echo ========================================
echo 1. TypeScript Compilation Check
echo ========================================
call tsc --noEmit
if %errorlevel% neq 0 (
    echo [ERROR] TypeScript compilation failed!
    echo See errors above.
) else (
    echo [SUCCESS] TypeScript compilation passed!
)
echo.

REM ============================================
REM 2. Run Vitest Unit Tests
REM ============================================
echo ========================================
echo 2. Running Vitest Unit Tests
echo ========================================
call npm test > test-results\vitest-results-%TIMESTAMP%.txt 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Some unit tests failed!
    echo Check test-results\vitest-results-%TIMESTAMP%.txt for details
) else (
    echo [SUCCESS] All unit tests passed!
)
type test-results\vitest-results-%TIMESTAMP%.txt
echo.

REM ============================================
REM 3. Firestore Rules Test
REM ============================================
echo ========================================
echo 3. Firestore Rules Test
echo ========================================
echo Note: Requires Firebase emulators to be running
echo Run manually: npm run test:rules
echo.

REM ============================================
REM 4. Integration Tests (Manual)
REM ============================================
echo ========================================
echo 4. Integration Tests (Manual)
echo ========================================
echo The following integration tests require manual execution:
echo.
echo - tests\integration\audit-results-access.test.mjs
echo - tests\integration\hybrid-rag.test.mjs
echo - tests\integration\query-all-findings.test.mjs
echo - tests\integration\query-router-prod.test.mjs
echo - tests\integration\smart-query-router-unified.test.mjs
echo.
echo Run with: node tests\integration\[test-name].test.mjs
echo.

REM ============================================
REM 5. Manual API Tests
REM ============================================
echo ========================================
echo 5. Manual API Tests
echo ========================================
echo The following tests require API credentials:
echo.
echo - src\services\__tests__\DocAIService.manual.test.ts
echo - src\services\__tests__\QueryRouterService.manual.test.ts
echo.
echo Run with: npm test -- [test-name].manual.test.ts
echo.

REM ============================================
REM Summary
REM ============================================
echo ========================================
echo Test Execution Complete
echo ========================================
echo.
echo Results saved to: test-results\vitest-results-%TIMESTAMP%.txt
echo.
echo Next Steps:
echo 1. Review test results above
echo 2. Fix any failing tests
echo 3. Run integration tests manually if needed
echo 4. Review TASK-11-CHECKPOINT.md for details
echo.
pause
