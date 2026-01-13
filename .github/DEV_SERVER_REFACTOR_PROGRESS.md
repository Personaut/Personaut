# Dev Server Per-Screen Refactor - Implementation Progress

## Objective
Refactor the build workflow to start/stop the dev server per screen instead of globally.

## Current Status
**Phase:** Planning Complete ✅  
**Implementation:** Paused for Strategy Adjustment ⚠️  
**Branch:** `feature/per-screen-dev-server`

## Implementation Attempts

### Attempt 1: Direct Replacement (Failed)
- **Date:** December 23, 2025
- **Approach:** Tried to remove global dev server section directly
- **Result:** Created 200+ TypeScript errors due to broken code structure
- **Learning:** The code has complex nested blocks and dependencies that require more careful handling

## Revised Strategy

### Problem Analysis
The current code structure has:
1. A global `devServer` variable declared in the outer scope
2. An `if/else` block that stores the server in `activeDevServer`
3. The screen generation loop is **inside** the `else` block
4. The batch screenshot section references the global `devServer`
5. Multiple other sections depend on variables from outer scopes

### Recommended Approach: Incremental Refactoring

Instead of removing large sections at once, we should:

#### Phase 1: Restructure Without Breaking (2-3 hours)
1. **Extract screen loop** - Move the screen generation loop outside the dev server `else` block
2. **Declare variables** - Ensure all needed variables (`projectPath`, `pagesPath`, etc.) are accessible
3. **Test** - Verify build still works with restructured code
4. **Commit** - Save working state

#### Phase 2: Add Per-Screen Dev Server (2-3 hours)
1. **Add per-screen server** - Inside loop, add dev server start/stop per screen
2. **Keep global server** - Don't remove it yet (both will coexist temporarily)
3. **Test** - Verify per-screen approach works
4. **Commit** - Save working state

#### Phase 3: Remove Global Server (1 hour)
1. **Remove global start** - Now safe to remove since per-screen is proven
2. **Remove batch screenshots** - No longer needed
3. **Clean up** - Remove unused variables and code
4. **Test** - Final verification
5. **Commit** - Complete refactor

### Alternative: Feature Flag Approach

Add a feature flag to toggle between old and new behavior:

```typescript
const USE_PER_SCREEN_DEV_SERVER = true; // Toggle for testing

if (USE_PER_SCREEN_DEV_SERVER) {
  // New per-screen logic
  for (screen in screens) {
    const devServer = new DevServerManager();
    await devServer.start();
    // ... compile, screenshot ...
    await devServer.stop();
  }
} else {
  // Old global server logic (existing code)
  const devServer = new DevServerManager();
  await devServer.start();
  // ... generate all screens ...
  // ... batch screenshots ...
  await devServer.stop();
}
```

**Benefits:**
- Can test both approaches side-by-side
- Easy rollback if issues arise
- Gradual migration path
- Less risky

## Recommendation

I recommend **Option 2: Feature Flag Approach** because:

1. **Safer** - Existing code remains intact and working
2. **Testable** - Can compare old vs new behavior
3. **Reversible** - Simple boolean flip to rollback
4. **Cleaner** - Start with fresh code instead of modifying complex nested blocks
5. **Faster** - Less debugging of broken code structure

Once the new approach is proven stable, we can remove the old code path.

## Next Steps

**Option A: Continue with Incremental Approach**
- Follow Phase 1-3 above
- More complex but keeps single code path
- Estimated: 5-7 hours total

**Option B: Implement Feature Flag Approach** ⭐ RECOMMENDED
- Add feature flag and new code path
- Keep existing code as fallback
- Estimated: 3-4 hours total
- Lower risk

**Option C: Pause and Review**
- Review the implementation plan again
- Discuss approach with team
- Consider if refactor is worth the complexity

## Questions for Decision

1. **Risk Tolerance:** How critical is it that builds continue working during development?
2. **Timeline:** Is 3-4 hours (feature flag) vs 5-7 hours (incremental) significant?
3. **Code Cleanliness:** Is it okay to have both code paths temporarily?
4. **Testing Capacity:** Can we thoroughly test both approaches?

## Files Modified
- `src/features/build-mode/handlers/BuildModeHandler.ts` (step calculation only - committed)

## Commits
1. ✅ `d5eeebf` - "refactor: Update step calculation for per-screen dev server lifecycle"

## Target Release
Version 0.1.5 (December 24, 2025)

---

**Status:** Awaiting decision on implementation approach before proceeding.

