@echo off
echo ========================================
echo Deploying DocAI Firestore Indexes
echo ========================================
echo.

echo This will deploy the following indexes:
echo - doc_sessions (userId + isActive + lastActivityAt)
echo - doc_chat_history (sessionId + timestamp)
echo - doc_query_logs (sessionId + timestamp)
echo.

echo Press any key to continue or Ctrl+C to cancel...
pause > nul

echo.
echo Deploying indexes...
firebase deploy --only firestore:indexes

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo NOTE: Indexes may take 5-10 minutes to build.
echo Check status at: https://console.firebase.google.com/project/first-aid-101112/firestore/indexes
echo.
echo Once indexes are ready, test DocAI again.
echo.
pause
