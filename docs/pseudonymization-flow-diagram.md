# Pseudonymization Flow Diagram

## Session-Based Pseudonymization Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER STARTS CHAT                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Create Session ID            │
                    │  session_123_user1            │
                    └───────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MESSAGE 1: "Show John Doe's findings"           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │ Pseudonymize Query  │         │ Pseudonymize        │
        │ sessionId: session_ │         │ Findings            │
        │         123_user1   │         │ sessionId: session_ │
        └─────────────────────┘         │         123_user1   │
                    │                   └─────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │ "Show Person_A's    │         │ John Doe → Person_A │
        │  findings"          │         │ (encrypted: abc123) │
        └─────────────────────┘         └─────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │  Store in Firestore:          │
                    │  mappings/                    │
                    │  {                            │
                    │    sessionId: "session_123_   │
                    │               user1",         │
                    │    originalValue: "abc123...",│
                    │    pseudonymValue: "Person_A" │
                    │  }                            │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Send to LLM API              │
                    │  {                            │
                    │    messages: [                │
                    │      {                        │
                    │        role: "user",          │
                    │        content: "Show         │
                    │                 Person_A's    │
                    │                 findings"     │
                    │      }                        │
                    │    ],                         │
                    │    context: [pseudonymized    │
                    │              findings]        │
                    │  }                            │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  LLM Response:                │
                    │  "Person_A has 5 high-risk    │
                    │   findings..."                │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Depseudonymize Response      │
                    │  sessionId: session_123_user1 │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Retrieve from Firestore:     │
                    │  WHERE sessionId =            │
                    │        "session_123_user1"    │
                    │  → Person_A = "John Doe"      │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Show to User:                │
                    │  "John Doe has 5 high-risk    │
                    │   findings..."                │
                    └───────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    MESSAGE 2: "What about Jane Smith?"                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │ Pseudonymize Query  │         │ Pseudonymize        │
        │ sessionId: session_ │         │ Findings            │
        │         123_user1   │         │ sessionId: session_ │
        │ (SAME SESSION!)     │         │         123_user1   │
        └─────────────────────┘         │ (SAME SESSION!)     │
                    │                   └─────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │ "What about         │         │ Jane Smith→Person_B │
        │  Person_B?"         │         │ (encrypted: def456) │
        │                     │         │                     │
        │ (Person_A already   │         │ John Doe → Person_A │
        │  in session, reused)│         │ (REUSED from        │
        └─────────────────────┘         │  session!)          │
                                        └─────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │  Send to LLM API              │
                                    │  {                            │
                                    │    messages: [                │
                                    │      {                        │
                                    │        role: "user",          │
                                    │        content: "Show         │
                                    │                 Person_A's    │
                                    │                 findings"     │
                                    │      },                       │
                                    │      {                        │
                                    │        role: "assistant",     │
                                    │        content: "Person_A     │
                                    │                 has 5..."     │
                                    │      },                       │
                                    │      {                        │
                                    │        role: "user",          │
                                    │        content: "What about   │
                                    │                 Person_B?"    │
                                    │      }                        │
                                    │    ]                          │
                                    │  }                            │
                                    │  ↑                            │
                                    │  FULL CONVERSATION HISTORY    │
                                    │  (LLM is stateless!)          │
                                    └───────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │  LLM Response:                │
                                    │  "Person_B has 3 findings.    │
                                    │   Compared to Person_A..."    │
                                    │  ↑                            │
                                    │  LLM understands context!     │
                                    └───────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │  Depseudonymize Response      │
                                    │  sessionId: session_123_user1 │
                                    │  Person_A → John Doe          │
                                    │  Person_B → Jane Smith        │
                                    └───────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │  Show to User:                │
                                    │  "Jane Smith has 3 findings.  │
                                    │   Compared to John Doe..."    │
                                    └───────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    DIFFERENT USER, SAME DATA                            │
└─────────────────────────────────────────────────────────────────────────┘

        User 1 (session_123_user1)          User 2 (session_456_user2)
                    │                                   │
                    ▼                                   ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │ "John Doe"          │         │ "John Doe"          │
        │       ↓             │         │       ↓             │
        │ Person_A            │         │ Person_A            │
        │ (encrypted: abc123) │         │ (encrypted: xyz789) │
        └─────────────────────┘         └─────────────────────┘
                    │                                   │
                    ▼                                   ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │ Firestore:          │         │ Firestore:          │
        │ mappings/doc1       │         │ mappings/doc2       │
        │ {                   │         │ {                   │
        │   sessionId:        │         │   sessionId:        │
        │   "session_123_     │         │   "session_456_     │
        │    user1",          │         │    user2",          │
        │   originalValue:    │         │   originalValue:    │
        │   "abc123...",      │         │   "xyz789...",      │
        │   pseudonymValue:   │         │   pseudonymValue:   │
        │   "Person_A"        │         │   "Person_A"        │
        │ }                   │         │ }                   │
        └─────────────────────┘         └─────────────────────┘
                    │                                   │
                    ▼                                   ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │ ✅ ISOLATED         │         │ ✅ ISOLATED         │
        │ User 1 cannot see   │         │ User 2 cannot see   │
        │ User 2's data       │         │ User 1's data       │
        └─────────────────────┘         └─────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW SUMMARY                               │
└─────────────────────────────────────────────────────────────────────────┘

1. CREATE SESSION
   └─> Unique sessionId per chat

2. PSEUDONYMIZE
   └─> Extract sensitive data
   └─> Check existing mappings in session
   └─> Create new mappings if needed
   └─> Encrypt original values (AES-256-GCM)
   └─> Store in Firestore with sessionId
   └─> Replace sensitive data with pseudonyms

3. SEND TO LLM
   └─> Include full conversation history (stateless API)
   └─> Send pseudonymized data
   └─> LLM processes without seeing real data

4. DEPSEUDONYMIZE
   └─> Retrieve mappings by sessionId
   └─> Decrypt original values
   └─> Replace pseudonyms with real data
   └─> Show to user

5. CLEANUP
   └─> Mappings expire after 30 days
   └─> Daily scheduled cleanup
   └─> Audit logs maintained


┌─────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Session Isolation                                              │
│ • Each session has unique encrypted mappings                            │
│ • Cross-session data leakage prevented                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 2: Encryption at Rest                                             │
│ • AES-256-GCM encryption for all original values                        │
│ • Unique IV per encryption                                              │
│ • Authentication tag prevents tampering                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 3: Access Control                                                 │
│ • Firestore rules: Server-side only access                              │
│ • Authentication required for all operations                            │
│ • User ID tracked in all operations                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 4: Audit Trail                                                    │
│ • All operations logged                                                 │
│ • Usage count tracked per mapping                                       │
│ • Last accessed timestamp recorded                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 5: Automatic Cleanup                                              │
│ • 30-day expiry for all mappings                                        │
│ • Daily scheduled cleanup                                               │
│ • Reduces data retention risk                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Session Isolation

```
Session A: "John Doe" → Person_A (encrypted: abc123...)
Session B: "John Doe" → Person_A (encrypted: xyz789...)
                                   ↑
                            DIFFERENT ENCRYPTED VALUES
                            = PRIVACY PROTECTED
```

### Consistency Within Session

```
Session A, Message 1: "John Doe" → Person_A
Session A, Message 2: "John Doe" → Person_A (REUSED)
Session A, Message 3: "John Doe" → Person_A (REUSED)
                                    ↑
                            SAME PSEUDONYM IN SESSION
                            = LLM CONTEXT MAINTAINED
```

### LLM Stateless API

```
Message 1:
{
  messages: [
    { role: "user", content: "Show Person_A" }
  ]
}

Message 2:
{
  messages: [
    { role: "user", content: "Show Person_A" },      ← Previous message
    { role: "assistant", content: "Person_A..." },   ← Previous response
    { role: "user", content: "What about Person_B?" } ← New message
  ]
}
↑
MUST INCLUDE FULL HISTORY
(LLM doesn't remember previous messages)
```

## Implementation Checklist

- [x] Create unique sessionId per chat
- [x] Use same sessionId throughout conversation
- [x] Pseudonymize with sessionId
- [x] Send full history to LLM
- [x] Depseudonymize with same sessionId
- [x] Store sessionId with chat session
- [x] Monitor audit logs
- [x] Set up automatic cleanup
