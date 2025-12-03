✅ Gemini API initialized successfully with model: gemini-3-pro-preview
HomePage.tsx:14 ✅ authService is now available globally as window.authService
HomePage.tsx:15 Try: await window.authService.signIn("test@example.com", "password123")
HomePage.tsx:14 ✅ authService is now available globally as window.authService
HomePage.tsx:15 Try: await window.authService.signIn("test@example.com", "password123")
FindingsPage.tsx:182 Selected findings: []
HomePage.tsx:14 ✅ authService is now available globally as window.authService
HomePage.tsx:15 Try: await window.authService.signIn("test@example.com", "password123")
HomePage.tsx:14 ✅ authService is now available globally as window.authService
HomePage.tsx:15 Try: await window.authService.signIn("test@example.com", "password123")
ChatPage.tsx:122 🚀 Starting Smart Query Router V2 with Transparent Logging
ChatPage.tsx:124 📖 Open DevTools Console (F12 / Ctrl+Shift+I) to see the complete flow
TransparentLogger.ts:199 


TransparentLogger.ts:200 ╔═══════════════════════════════════════════════════════════════════════════════╗
TransparentLogger.ts:201 ║  SMART QUERY ROUTER V2 - TRANSPARENT FLOW                                    ║
TransparentLogger.ts:202 ╚═══════════════════════════════════════════════════════════════════════════════╝
TransparentLogger.ts:203 

TransparentLogger.ts:204 📝 User Query: Show me all IT related findings
TransparentLogger.ts:206 🔑 Session ID: Fkua0rGRNnMHbhgs7lro
TransparentLogger.ts:208 ⏱️  Started at: 5:50:48 PM
TransparentLogger.ts:209 

TransparentLogger.ts:81 
════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:82 ▶ STEP 1: LOCAL MASKING
TransparentLogger.ts:83 ════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:86 Input: {query: 'Show me all IT related findings'}
TransparentLogger.ts:119   → Masking sensitive data...
TransparentLogger.ts:255      No sensitive data detected
TransparentLogger.ts:103 Output: {maskedQuery: 'Show me all IT related findings', tokensCreated: 0}
TransparentLogger.ts:107 ✓ Completed in 1ms
TransparentLogger.ts:81 
════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:82 ▶ STEP 2: INTENT RECOGNITION
TransparentLogger.ts:83 ════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:86 Input: {maskedQuery: 'Show me all IT related findings'}
GeminiService.ts:111 🤔 Generating response with thinking mode: low (no history)
TransparentLogger.ts:119   → Intent recognized
TransparentLogger.ts:283      Intent: Retrieve list of findings related to IT
TransparentLogger.ts:284      Confidence: 100%
TransparentLogger.ts:285      Requires Analysis: No
TransparentLogger.ts:288      Extracted Filters: {keywords: Array(1)}
TransparentLogger.ts:103 Output: {intent: 'Retrieve list of findings related to IT', confidence: 1, filters: {…}}
TransparentLogger.ts:107 ✓ Completed in 19960ms
TransparentLogger.ts:81 
════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:82 ▶ STEP 3: ROUTE DECISION
TransparentLogger.ts:83 ════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:119   → Routing to: SIMPLE
TransparentLogger.ts:299      Reason: Simple data retrieval
TransparentLogger.ts:300      Has Filters: Yes
TransparentLogger.ts:103 Output: {queryType: 'simple', reason: 'Simple data retrieval', hasFilters: true}
TransparentLogger.ts:107 ✓ Completed in 1ms
TransparentLogger.ts:81 
════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:82 ▶ STEP 4: EXECUTE SIMPLE QUERY
TransparentLogger.ts:83 ════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:119   → Querying database...
TransparentLogger.ts:119   → Database query executed
TransparentLogger.ts:310      Filters: {searchText: 'IT'}
TransparentLogger.ts:311      Results: 6 findings
TransparentLogger.ts:312      Duration: 152ms
TransparentLogger.ts:147 ✓ Found 6 findings
TransparentLogger.ts:103 Output: {type: 'simple', findingsCount: 6}
TransparentLogger.ts:107 ✓ Completed in 155ms
TransparentLogger.ts:81 
════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:82 ▶ STEP 5: LOCAL UNMASKING
TransparentLogger.ts:83 ════════════════════════════════════════════════════════════════════════════════
TransparentLogger.ts:119   → Unmasking sensitive data...
TransparentLogger.ts:272      No tokens to restore
TransparentLogger.ts:107 ✓ Completed in 1ms
TransparentLogger.ts:220 


TransparentLogger.ts:221 ╔═══════════════════════════════════════════════════════════════════════════════╗
TransparentLogger.ts:222 ║  FLOW COMPLETE                                                                ║
TransparentLogger.ts:223 ╚═══════════════════════════════════════════════════════════════════════════════╝
TransparentLogger.ts:224 

TransparentLogger.ts:225 ✓ Total Execution Time: 20141ms
TransparentLogger.ts:226 📊 Query Type: simple
TransparentLogger.ts:228 🎯 Recognized Intent: Retrieve list of findings related to IT
TransparentLogger.ts:229 📈 Confidence: 100%
TransparentLogger.ts:231 ⏱️  Completed at: 5:51:08 PM
TransparentLogger.ts:232 

:5173/chat:1 Access to fetch at 'https://us-central1-first-aid-101112.cloudfunctions.net/logAuditEvent' from origin 'http://localhost:5173' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
AuditService.ts:69  POST https://us-central1-first-aid-101112.cloudfunctions.net/logAuditEvent net::ERR_FAILED
fetchImpl @ firebase_functions.js?v=1a888c0a:267
postJSON @ firebase_functions.js?v=1a888c0a:339
callAtURL @ firebase_functions.js?v=1a888c0a:386
await in callAtURL
call @ firebase_functions.js?v=1a888c0a:377
callable @ firebase_functions.js?v=1a888c0a:316
logEvent @ AuditService.ts:69
logAIQuery @ AuditService.ts:151
handleSendMessage @ ChatPage.tsx:213
await in handleSendMessage
onSendMessage @ ChatInterface.tsx:198
handleSendMessage @ ChatInput.tsx:47
handleKeyDown @ ChatInput.tsx:61
callCallback2 @ chunk-E22KYI7D.js?v=1a888c0a:3680
invokeGuardedCallbackDev @ chunk-E22KYI7D.js?v=1a888c0a:3705
invokeGuardedCallback @ chunk-E22KYI7D.js?v=1a888c0a:3739
invokeGuardedCallbackAndCatchFirstError @ chunk-E22KYI7D.js?v=1a888c0a:3742
executeDispatch @ chunk-E22KYI7D.js?v=1a888c0a:7046
processDispatchQueueItemsInOrder @ chunk-E22KYI7D.js?v=1a888c0a:7066
processDispatchQueue @ chunk-E22KYI7D.js?v=1a888c0a:7075
dispatchEventsForPlugins @ chunk-E22KYI7D.js?v=1a888c0a:7083
(anonymous) @ chunk-E22KYI7D.js?v=1a888c0a:7206
batchedUpdates$1 @ chunk-E22KYI7D.js?v=1a888c0a:18966
batchedUpdates @ chunk-E22KYI7D.js?v=1a888c0a:3585
dispatchEventForPluginEventSystem @ chunk-E22KYI7D.js?v=1a888c0a:7205
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-E22KYI7D.js?v=1a888c0a:5484
dispatchEvent @ chunk-E22KYI7D.js?v=1a888c0a:5478
dispatchDiscreteEvent @ chunk-E22KYI7D.js?v=1a888c0a:5455
AuditService.ts:78 Failed to log audit event: FirebaseError: internal