# Dev Server Refactor - Visual Flow Comparison

## Current Flow (v0.1.4)

```
┌─────────────────────────────────────────────────────────────┐
│ INITIALIZATION PHASE                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Create project directories                              │
│ 2. Generate package.json                                   │
│ 3. Install dependencies (npm install)                      │
│ 4. Create boilerplate (index.html, App.tsx, etc.)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ GLOBAL DEV SERVER START ⚠️ ISSUE: Runs continuously        │
├─────────────────────────────────────────────────────────────┤
│ • Start dev server on port 3000                            │
│ • Wait for webpack compilation                             │
│ • Store in activeDevServer                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ SCREEN GENERATION LOOP                                      │
├─────────────────────────────────────────────────────────────┤
│ For each screen:                                           │
│   ┌───────────────────────────────────────────────────┐   │
│   │ 1. Generate code with AI                          │   │
│   │ 2. Save to file                                   │   │
│   │ 3. Update App.tsx                                 │   │
│   │ 4. Attempt repair (uses global devServer) ⚠️      │   │
│   │    - Wait 3s for compilation                      │   │
│   │    - Check errors                                 │   │
│   │    - Repair if needed                             │   │
│   └───────────────────────────────────────────────────┘   │
│                                                             │
│ ⚠️ ISSUE: All screens use same dev server                  │
│ ⚠️ ISSUE: Can accumulate cached state                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Wait 15 seconds for webpack to finish                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BATCH SCREENSHOT PHASE ⚠️ ISSUE: Stale screenshots         │
├─────────────────────────────────────────────────────────────┤
│ 1. Stop old dev server                                     │
│ 2. Wait 2s for port release                                │
│ 3. Start FRESH dev server                                  │
│ 4. Check compilation errors                                │
│ 5. For each screen:                                        │
│    • Capture screenshot                                    │
│    • Save to disk                                          │
│                                                             │
│ ⚠️ ISSUE: Screenshots captured even if compilation failed  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CLEANUP                                                     │
├─────────────────────────────────────────────────────────────┤
│ • Stop dev server                                          │
│ • Save build data                                          │
│ • Mark complete                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## New Flow (v0.1.5) ✅

```
┌─────────────────────────────────────────────────────────────┐
│ INITIALIZATION PHASE (UNCHANGED)                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Create project directories                              │
│ 2. Generate package.json                                   │
│ 3. Install dependencies (npm install)                      │
│ 4. Create boilerplate (index.html, App.tsx, etc.)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PER-SCREEN BUILD LOOP ✅ NEW APPROACH                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ╔═══════════════════════════════════════════════════════╗ │
│ ║ SCREEN 1                                              ║ │
│ ╠═══════════════════════════════════════════════════════╣ │
│ ║ Step 1: Generate Code                                 ║ │
│ ║   • AI generation                                     ║ │
│ ║   • Save to file                                      ║ │
│ ║   • Update App.tsx                                    ║ │
│ ╠═══════════════════════════════════════════════════════╣ │
│ ║ Step 2: Dev Server + Compile + Screenshot             ║ │
│ ║   • Start FRESH dev server ✅                         ║ │
│ ║   • Wait 3s for webpack                               ║ │
│ ║   • Check compilation errors                          ║ │
│ ║   • If errors: Repair (max 3 attempts)                ║ │
│ ║   • If success: Capture screenshot ✅                 ║ │
│ ║   • If failed: Skip screenshot ✅                     ║ │
│ ╠═══════════════════════════════════════════════════════╣ │
│ ║ Step 3: Cleanup                                       ║ │
│ ║   • Stop dev server ✅                                ║ │
│ ║   • Wait 2s for port release                          ║ │
│ ║   • Mark screen complete                              ║ │
│ ╚═══════════════════════════════════════════════════════╝ │
│                            ↓                                │
│ ╔═══════════════════════════════════════════════════════╗ │
│ ║ SCREEN 2                                              ║ │
│ ╠═══════════════════════════════════════════════════════╣ │
│ ║ Step 1: Generate Code                                 ║ │
│ ║ Step 2: Dev Server + Compile + Screenshot             ║ │
│ ║ Step 3: Cleanup                                       ║ │
│ ╚═══════════════════════════════════════════════════════╝ │
│                            ↓                                │
│ ╔═══════════════════════════════════════════════════════╗ │
│ ║ SCREEN 3                                              ║ │
│ ╠═══════════════════════════════════════════════════════╣ │
│ ║ Step 1: Generate Code                                 ║ │
│ ║ Step 2: Dev Server + Compile + Screenshot             ║ │
│ ║ Step 3: Cleanup                                       ║ │
│ ╚═══════════════════════════════════════════════════════╝ │
│                                                             │
│ ✅ BENEFIT: Each screen gets fresh dev server              │
│ ✅ BENEFIT: No cached state between screens                │
│ ✅ BENEFIT: Compilation errors prevent screenshots         │
│ ✅ BENEFIT: Easy to debug individual screens               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FINAL CLEANUP (SIMPLIFIED)                                  │
├─────────────────────────────────────────────────────────────┤
│ • Save build data                                          │
│ • Mark complete                                            │
│ • (No dev server to stop - already done per-screen)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Progress Steps Comparison

### Current (v0.1.4)
```
Total Steps: screens.length + 2

Example with 3 screens:
Step 1: Initialize project
Step 2: Generate package.json
Step 3: Install dependencies
Step 4: Create boilerplate
Step 5: Start dev server          ← REMOVED
Step 6: Generate Screen 1
Step 7: Generate Screen 2
Step 8: Generate Screen 3
Step 9: Capture screenshots        ← REMOVED
Step 10: Complete

Total: 10 steps
```

### New (v0.1.5)
```
Total Steps: 3 + (screens.length * 3) + 1

Example with 3 screens:
Step 1: Initialize project
Step 2: Generate package.json
Step 3: Install dependencies
Step 4: Create boilerplate

Step 5: Screen 1 - Generate code
Step 6: Screen 1 - Dev server + compile + screenshot
Step 7: Screen 1 - Stop server

Step 8: Screen 2 - Generate code
Step 9: Screen 2 - Dev server + compile + screenshot
Step 10: Screen 2 - Stop server

Step 11: Screen 3 - Generate code
Step 12: Screen 3 - Dev server + compile + screenshot
Step 13: Screen 3 - Stop server

Step 14: Complete

Total: 14 steps (more granular, better progress visibility)
```

---

## Timing Comparison

### Current (v0.1.4) - 3 Screens
```
┌──────────────────────────┬──────────┐
│ Phase                    │ Duration │
├──────────────────────────┼──────────┤
│ Initialization           │ ~20s     │
│ Dev server start         │ ~8s      │
│ Screen 1 generation      │ ~10s     │
│ Screen 2 generation      │ ~10s     │
│ Screen 3 generation      │ ~10s     │
│ Wait for compilation     │ ~15s     │
│ Dev server restart       │ ~10s     │
│ Screenshot all screens   │ ~15s     │
│ Cleanup                  │ ~2s      │
├──────────────────────────┼──────────┤
│ TOTAL                    │ ~100s    │
└──────────────────────────┴──────────┘
```

### New (v0.1.5) - 3 Screens
```
┌──────────────────────────┬──────────┐
│ Phase                    │ Duration │
├──────────────────────────┼──────────┤
│ Initialization           │ ~20s     │
│                          │          │
│ Screen 1:                │          │
│   - Generate code        │ ~10s     │
│   - Start dev server     │ ~8s      │
│   - Compile + check      │ ~3s      │
│   - Screenshot           │ ~5s      │
│   - Stop server          │ ~2s      │
│                          │          │
│ Screen 2:                │          │
│   - Generate code        │ ~10s     │
│   - Start dev server     │ ~8s      │
│   - Compile + check      │ ~3s      │
│   - Screenshot           │ ~5s      │
│   - Stop server          │ ~2s      │
│                          │          │
│ Screen 3:                │          │
│   - Generate code        │ ~10s     │
│   - Start dev server     │ ~8s      │
│   - Compile + check      │ ~3s      │
│   - Screenshot           │ ~5s      │
│   - Stop server          │ ~2s      │
│                          │          │
│ Cleanup                  │ ~2s      │
├──────────────────────────┼──────────┤
│ TOTAL                    │ ~106s    │
└──────────────────────────┴──────────┘

Increase: ~6 seconds (~6% slower)
Reason: Slightly more overhead from multiple server starts,
        but removed 15s wait and batch processing
```

---

## Error Handling Comparison

### Current (v0.1.4)
```
Compilation Error Scenario:
┌─────────────────────────────────────┐
│ Screen 2 has syntax error           │
├─────────────────────────────────────┤
│ 1. All screens generated            │
│ 2. Dev server shows error overlay   │
│ 3. Screenshot captures ERROR PAGE   │ ❌
│ 4. User sees broken screenshot      │
│ 5. Hard to identify which screen    │
└─────────────────────────────────────┘
```

### New (v0.1.5)
```
Compilation Error Scenario:
┌─────────────────────────────────────┐
│ Screen 2 has syntax error           │
├─────────────────────────────────────┤
│ 1. Screen 1 builds successfully     │ ✅
│ 2. Screen 2 code generated          │
│ 3. Dev server starts for Screen 2   │
│ 4. Compilation error detected       │ ✅
│ 5. Attempt repair (3 attempts)      │ ✅
│ 6. If repair fails:                 │
│    - Skip screenshot                │ ✅
│    - Mark screen as failed          │ ✅
│    - Continue with Screen 3         │ ✅
│ 7. Screen 3 builds successfully     │ ✅
│                                     │
│ Result: 2 good screenshots,         │
│         1 failed screen clearly     │
│         identified in logs          │
└─────────────────────────────────────┘
```

---

## Cancellation Handling

### Current (v0.1.4)
```
Cancellation Points:
├─ After initialization
├─ After dev server start
├─ After each screen generation
└─ (Dev server may be left running) ⚠️
```

### New (v0.1.5)
```
Cancellation Points (Enhanced):
├─ After initialization
├─ Before each screen
├─ After code generation
├─ After dev server start ✅
├─ After screenshot ✅
└─ (Dev server always stopped) ✅

Cleanup on Cancel:
• Stop active dev server
• Close screenshot service
• Save partial progress
• Mark as cancelled
```

---

## Key Improvements Summary

| Aspect | Before | After | Benefit |
|--------|--------|-------|---------|
| **Screenshot Freshness** | May be cached | Always fresh | ✅ Accurate visuals |
| **Compilation Errors** | Screenshots captured anyway | Screenshots skipped | ✅ No broken images |
| **Error Isolation** | Hard to identify problem screen | Clear per-screen status | ✅ Easy debugging |
| **Progress Visibility** | Coarse (10 steps) | Granular (14 steps) | ✅ Better UX |
| **Cancellation** | May leave server running | Always clean | ✅ No port conflicts |
| **Build Time** | ~100s | ~106s | ⚠️ 6% slower (acceptable) |
| **Resource Usage** | 1 long-running server | 3 short-lived servers | ✅ Better isolation |

---

## Migration Path

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Preparation                                        │
├─────────────────────────────────────────────────────────────┤
│ • Review implementation plan                                │
│ • Create feature branch                                     │
│ • Set up test project with 3 screens                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Implementation (Incremental)                       │
├─────────────────────────────────────────────────────────────┤
│ Commit 1: Update step calculations                          │
│ Commit 2: Remove global dev server start                    │
│ Commit 3: Add per-screen dev server lifecycle               │
│ Commit 4: Remove batch screenshot section                   │
│ Commit 5: Update cleanup and cancellation                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Testing                                            │
├─────────────────────────────────────────────────────────────┤
│ • Unit tests for each component                             │
│ • Integration test with 1 screen                            │
│ • Integration test with 3 screens                           │
│ • Cancellation tests                                        │
│ • Error handling tests                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: Documentation & Release                            │
├─────────────────────────────────────────────────────────────┤
│ • Update changelog                                          │
│ • Update build mode documentation                           │
│ • Create PR for review                                      │
│ • Merge to dev-0.1.5                                        │
└─────────────────────────────────────────────────────────────┘
```
