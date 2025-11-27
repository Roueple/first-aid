# Retry Handler Visual Guide

## Overview

This guide provides visual representations of how the Retry Handler works, including exponential backoff, operation queue behavior, and error handling flows.

---

## 1. Exponential Backoff Timeline

### Default Retry Options (3 retries, 1s initial, 2x multiplier)

```
Time (ms)    0      1000    3000    7000
             |       |       |       |
Attempt 1 ───┤
             └─ FAIL
                     |
Retry 1 ─────────────┤
                     └─ FAIL
                             |
Retry 2 ─────────────────────┤
                             └─ FAIL
                                     |
Retry 3 ─────────────────────────────┤
                                     └─ SUCCESS or THROW
```

### Network Retry Options (5 retries, 1s initial, 2x multiplier)

```
Time (ms)    0      1000    3000    7000    15000   31000
             |       |       |       |       |       |
Attempt 1 ───┤
             └─ FAIL
                     |
Retry 1 ─────────────┤
                     └─ FAIL
                             |
Retry 2 ─────────────────────┤
                             └─ FAIL
                                     |
Retry 3 ─────────────────────────────┤
                                     └─ FAIL
                                             |
Retry 4 ─────────────────────────────────────┤
                                             └─ FAIL
                                                     |
Retry 5 ─────────────────────────────────────────────┤
                                                     └─ SUCCESS or THROW
```

---

## 2. Operation Queue State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    OPERATION LIFECYCLE                       │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │ ENQUEUE  │
                    └────┬─────┘
                         │
                         ▼
                   ┌──────────┐
              ┌────│ PENDING  │◄────┐
              │    └────┬─────┘     │
              │         │            │
              │         │ Online     │
              │         ▼            │
              │   ┌──────────┐      │
              │   │EXECUTING │      │ Retry
              │   └────┬─────┘      │
              │        │             │
              │        ├─────────────┘
              │        │
    Cancel    │        ├──────────┬──────────┐
              │        │          │          │
              │        ▼          ▼          ▼
              │  ┌──────────┐ ┌──────┐ ┌──────────┐
              └─►│CANCELLED │ │FAILED│ │COMPLETED │
                 └──────────┘ └──────┘ └────┬─────┘
                      │           │          │
                      │           │          │ Auto-remove
                      │           │          │ after 5s
                      ▼           ▼          ▼
                 ┌─────────────────────────────┐
                 │      REMOVED FROM QUEUE     │
                 └─────────────────────────────┘
```

---

## 3. Online/Offline Behavior Flow

### Scenario: User Goes Offline, Performs Actions, Comes Back Online

```
┌─────────────────────────────────────────────────────────────┐
│                    TIMELINE                                  │
└─────────────────────────────────────────────────────────────┘

Time:     0s        5s        10s       15s       20s       25s
          │         │         │         │         │         │
Online ───┤         │         │         │         │         │
          │         │         │         │         │         │
          └─ Offline ────────────────────┐        │         │
                    │         │          │        │         │
                    │         │          └─ Online ─────────┤
                    │         │                   │         │
                    │         │                   │         │
User      │         │         │                   │         │
Actions:  │         │         │                   │         │
          │         │         │                   │         │
          │    Save Finding   │                   │         │
          │         ├─────────┤                   │         │
          │         │ QUEUED  │                   │         │
          │         │         │                   │         │
          │         │    Update Finding           │         │
          │         │         ├───────────────────┤         │
          │         │         │      QUEUED       │         │
          │         │         │                   │         │
          │         │         │              Process Queue  │
          │         │         │                   ├─────────┤
          │         │         │                   │ Execute │
          │         │         │                   │ Op 1    │
          │         │         │                   │ Execute │
          │         │         │                   │ Op 2    │
          │         │         │                   │ Done    │
          │         │         │                   │         │
```

### User Notifications

```
Time:     0s        5s        10s       15s       20s       25s
          │         │         │         │         │         │
          │         │         │         │         │         │
Notify:   │         │         │         │         │         │
          │         │         │         │         │         │
          │    "Connection lost.                  │         │
          │     Operations will be queued"        │         │
          │         │         │                   │         │
          │         │    "Operation queued"       │         │
          │         │         │                   │         │
          │         │         │    "Operation     │         │
          │         │         │     queued"       │         │
          │         │         │                   │         │
          │         │         │         "Connection restored.
          │         │         │          Processing 2 operations"
          │         │         │                   │         │
          │         │         │                   │    "All operations
          │         │         │                   │     completed"
```

---

## 4. Error Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR OCCURS                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Check Error Type     │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Permission  │  │  Network    │  │ AI Service  │
│   Denied    │  │   Error     │  │   Error     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ DON'T RETRY │  │   RETRY     │  │   RETRY     │
│   Throw     │  │  Network    │  │  AI Config  │
│   Error     │  │   Config    │  │             │
└─────────────┘  └──────┬──────┘  └──────┬──────┘
                        │                │
                        │                │
                        ▼                ▼
                 ┌─────────────────────────┐
                 │  Exponential Backoff    │
                 │  with Jitter            │
                 └────────┬────────────────┘
                          │
                          ▼
                 ┌─────────────────────────┐
                 │  Retry Operation        │
                 └────────┬────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ Success │ │  Error  │ │Max Retry│
         │         │ │  Again  │ │ Reached │
         └─────────┘ └────┬────┘ └────┬────┘
                          │           │
                          │           │
                          └───────────┤
                                      │
                                      ▼
                              ┌───────────────┐
                              │ Throw Error   │
                              └───────────────┘
```

---

## 5. Operation Queue UI States

### Empty Queue (Hidden)

```
┌─────────────────────────────────────┐
│  (Component not visible)            │
└─────────────────────────────────────┘
```

### Queue with Pending Operations (Offline)

```
┌─────────────────────────────────────┐
│ Operation Queue          [Offline]  │
├─────────────────────────────────────┤
│ 2 pending                           │
├─────────────────────────────────────┤
│ ⏳ PENDING                          │
│ Save user data                      │
│ Created: 10:30:45                   │
│                          [Cancel]   │
├─────────────────────────────────────┤
│ ⏳ PENDING                          │
│ Update finding                      │
│ Created: 10:31:02                   │
│                          [Cancel]   │
├─────────────────────────────────────┤
│ Operations will be executed when    │
│ connection is restored              │
└─────────────────────────────────────┘
```

### Queue Processing (Online)

```
┌─────────────────────────────────────┐
│ Operation Queue                     │
├─────────────────────────────────────┤
│ 1 executing  1 pending              │
├─────────────────────────────────────┤
│ ⚙️ EXECUTING                        │
│ Save user data                      │
│ Created: 10:30:45  Retries: 1       │
├─────────────────────────────────────┤
│ ⏳ PENDING                          │
│ Update finding                      │
│ Created: 10:31:02                   │
│                          [Cancel]   │
└─────────────────────────────────────┘
```

### Queue with Failed Operation

```
┌─────────────────────────────────────┐
│ Operation Queue              [Clear]│
├─────────────────────────────────────┤
│ 1 failed                            │
├─────────────────────────────────────┤
│ ❌ FAILED                           │
│ Save user data                      │
│ Created: 10:30:45  Retries: 5       │
│ Error: Network timeout              │
└─────────────────────────────────────┘
```

### Queue with Completed Operation (Auto-removes after 5s)

```
┌─────────────────────────────────────┐
│ Operation Queue              [Clear]│
├─────────────────────────────────────┤
│ ✅ COMPLETED                        │
│ Save user data                      │
│ Created: 10:30:45                   │
│                                     │
│ (Removing in 5 seconds...)          │
└─────────────────────────────────────┘
```

---

## 6. Retry Handler Integration Flow

### Component Using Retry Handler

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT COMPONENT                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ useRetryHandler()
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RETRY HANDLER HOOK                        │
│  - retry()                                                   │
│  - retryNetwork()                                            │
│  - retryAI()                                                 │
│  - queueOperation()                                          │
│  - queuedOperations                                          │
│  - isOnline                                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Retry     │  │  Operation  │  │   Online/   │
│   Logic     │  │    Queue    │  │   Offline   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────┐
│         RETRY HANDLER UTILITY                   │
│  - executeWithRetry()                           │
│  - operationQueue                               │
│  - Error detection functions                    │
└────────────────────────┬────────────────────────┘
                         │
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                  │
│  - Firebase (Database)                          │
│  - OpenAI (AI Service)                          │
│  - Gemini (AI Service)                          │
│  - Network APIs                                 │
└─────────────────────────────────────────────────┘
```

---

## 7. Jitter Visualization

### Without Jitter (Thundering Herd Problem)

```
Time:     0s        1s        3s        7s
          │         │         │         │
Client 1 ─┤         ├─────────├─────────├─────────►
Client 2 ─┤         ├─────────├─────────├─────────►
Client 3 ─┤         ├─────────├─────────├─────────►
Client 4 ─┤         ├─────────├─────────├─────────►
Client 5 ─┤         ├─────────├─────────├─────────►
          │         │         │         │
          └─────────┴─────────┴─────────┴─────────►
                    ▲         ▲         ▲
                    │         │         │
              All clients retry at same time!
              Server gets overwhelmed!
```

### With Jitter (Distributed Load)

```
Time:     0s        1s        3s        7s
          │         │         │         │
Client 1 ─┤         ├─────────├─────────├─────────►
Client 2 ─┤          ├─────────├────────├─────────►
Client 3 ─┤           ├────────├─────────├────────►
Client 4 ─┤         ├──────────├────────├─────────►
Client 5 ─┤          ├────────├──────────├────────►
          │         │         │         │
          └─────────┴─────────┴─────────┴─────────►
                    ▲         ▲         ▲
                    │         │         │
              Retries spread out over time
              Server load is distributed
```

---

## 8. Complete User Journey Example

### Scenario: User Saves Finding While Offline

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User clicks "Save" button                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Component calls queueOperation()                    │
│         - Operation added to queue                          │
│         - Status: PENDING                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: User sees notification                              │
│         "Operation queued. It will be executed when         │
│          connection is restored."                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: OperationQueueStatus shows pending operation        │
│         ⏳ PENDING                                          │
│         Save finding                                        │
│         [Cancel]                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ (User continues working...)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Connection restored                                 │
│         - operationQueue.setOnlineStatus(true)              │
│         - Queue starts processing                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: User sees notification                              │
│         "Connection restored. Processing 1 queued           │
│          operation..."                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Operation executes with retry logic                 │
│         - Status: EXECUTING                                 │
│         - Retries if needed                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Success    │  │   Retry     │  │   Failed    │
│  (1st try)  │  │  (2nd try)  │  │ (all tries) │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Final status                                        │
│         Success: ✅ COMPLETED (auto-removed after 5s)       │
│         Failed:  ❌ FAILED (stays in queue)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

The Retry Handler provides:

1. **Exponential Backoff**: Increasing delays between retries to avoid overwhelming services
2. **Jitter**: Random variation to prevent thundering herd problem
3. **Smart Error Detection**: Only retries recoverable errors
4. **Operation Queue**: Stores operations when offline, executes when online
5. **Visual Feedback**: UI component shows queue status and progress
6. **Configurable**: Different retry strategies for different scenarios
7. **User-Friendly**: Clear notifications and status updates

This ensures reliable operation even in challenging network conditions while providing excellent user experience.
