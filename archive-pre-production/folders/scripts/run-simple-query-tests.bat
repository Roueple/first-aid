@echo off
REM ============================================
REM Simple Query Implementation Test Runner
REM Task 11: Checkpoint - Simple Query Tests
REM ============================================

echo.
echo ========================================
echo Simple Query Implementation Tests
echo ========================================
echo.

REM Create test results directory
if not exist "test-results" mkdir test-results

REM Set timestamp for results
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

set OUTPUT_FILE=test-results\simple-query-tests-%TIMESTAMP%.txt

echo [%time%] Starting Simple Query test execution... > %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

REM ============================================
REM 1. TypeScript Compilation Check
REM ============================================
echo ======================================== >> %OUTPUT_FILE%
echo 1. TypeScript Compilation Check >> %OUTPUT_FILE%
echo ======================================== >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo Running TypeScript compilation check...
call tsc --noEmit >> %OUTPUT_FILE% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] TypeScript compilation failed! >> %OUTPUT_FILE%
    echo [ERROR] TypeScript compilation failed!
) else (
    echo [SUCCESS] TypeScript compilation passed! >> %OUTPUT_FILE%
    echo [SUCCESS] TypeScript compilation passed!
)
echo. >> %OUTPUT_FILE%

REM ============================================
REM 2. Simple Query Configuration Tests
REM ============================================
echo ======================================== >> %OUTPUT_FILE%
echo 2. Simple Query Configuration Tests >> %OUTPUT_FILE%
echo ======================================== >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo Running Simple Query Configuration tests...
call npm test -- src/config/__tests__/simpleQuery.config.test.ts >> %OUTPUT_FILE% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Configuration tests failed! >> %OUTPUT_FILE%
    echo [ERROR] Configuration tests failed!
) else (
    echo [SUCCESS] Configuration tests passed! >> %OUTPUT_FILE%
    echo [SUCCESS] Configuration tests passed!
)
echo. >> %OUTPUT_FILE%

REM ============================================
REM 3. Query Patterns Tests
REM ============================================
echo ======================================== >> %OUTPUT_FILE%
echo 3. Query Patterns Tests >> %OUTPUT_FILE%
echo ======================================== >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo Running Query Patterns tests...
call npm test -- src/services/__tests__/queryPatterns.test.ts >> %OUTPUT_FILE% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Query Patterns tests failed! >> %OUTPUT_FILE%
    echo [ERROR] Query Patterns tests failed!
) else (
    echo [SUCCESS] Query Patterns tests passed! >> %OUTPUT_FILE%
    echo [SUCCESS] Query Patterns tests passed!
)
echo. >> %OUTPUT_FILE%

REM ============================================
REM 4. Simple Query Matcher Tests
REM ============================================
echo ======================================== >> %OUTPUT_FILE%
echo 4. Simple Query Matcher Tests >> %OUTPUT_FILE%
echo ======================================== >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo Running Simple Query Matcher tests...
call npm test -- src/services/__tests__/SimpleQueryMatcher.test.ts >> %OUTPUT_FILE% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Matcher tests failed! >> %OUTPUT_FILE%
    echo [ERROR] Matcher tests failed!
) else (
    echo [SUCCESS] Matcher tests passed! >> %OUTPUT_FILE%
    echo [SUCCESS] Matcher tests passed!
)
echo. >> %OUTPUT_FILE%

REM ============================================
REM 5. Simple Query Executor Tests
REM ============================================
echo ======================================== >> %OUTPUT_FILE%
echo 5. Simple Query Executor Tests >> %OUTPUT_FILE%
echo ======================================== >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo Running Simple Query Executor tests...
call npm test -- src/services/__tests__/SimpleQueryExecutor.test.ts >> %OUTPUT_FILE% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Executor tests failed! >> %OUTPUT_FILE%
    echo [ERROR] Executor tests failed!
) else (
    echo [SUCCESS] Executor tests passed! >> %OUTPUT_FILE%
    echo [SUCCESS] Executor tests passed!
)
echo. >> %OUTPUT_FILE%

REM ============================================
REM 6. Simple Query Service Tests
REM ============================================
echo ======================================== >> %OUTPUT_FILE%
echo 6. Simple Query Service Tests >> %OUTPUT_FILE%
echo ======================================== >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo Running Simple Query Service tests...
call npm test -- src/services/__tests__/SimpleQueryService.test.ts >> %OUTPUT_FILE% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Service tests failed! >> %OUTPUT_FILE%
    echo [ERROR] Service tests failed!
) else (
    echo [SUCCESS] Service tests passed! >> %OUTPUT_FILE%
    echo [SUCCESS] Service tests passed!
)
echo. >> %OUTPUT_FILE%

REM ============================================
REM 7. DocAI Integration Tests (Simple Query)
REM ============================================
echo ======================================== >> %OUTPUT_FILE%
echo 7. DocAI Integration Tests >> %OUTPUT_FILE%
echo ======================================== >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo Running DocAI Integration tests...
call npm test -- src/services/__tests__/DocAIService.integration.test.ts >> %OUTPUT_FILE% 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Integration tests failed! >> %OUTPUT_FILE%
    echo [ERROR] Integration tests failed!
) else (
    echo [SUCCESS] Integration tests passed! >> %OUTPUT_FILE%
    echo [SUCCESS] Integration tests passed!
)
echo. >> %OUTPUT_FILE%

REM ============================================
REM Summary
REM ============================================
echo ======================================== >> %OUTPUT_FILE%
echo Test Execution Complete >> %OUTPUT_FILE%
echo ======================================== >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo Timestamp: %date% %time% >> %OUTPUT_FILE%
echo Results saved to: %OUTPUT_FILE% >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo.
echo ========================================
echo Test Execution Complete
echo ========================================
echo.
echo All results saved to: %OUTPUT_FILE%
echo.
echo You can now review the test results in the file above.
echo.
pause
