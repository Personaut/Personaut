# Dev Server Per-Screen Refactor

## Issue
Currently, the dev server starts once for all screens during the build process, which can lead to:
- Cached/stale screenshots
- Screenshots being captured even when webpack compilation fails
- Difficulty debugging individual screen issues

## Proposed Solution
Refactor the build workflow to start/stop the dev server per screen:

```
FOR EACH SCREEN:
  1. Generate code with AI
  2. Save code to file
  3. Start dev server (fresh)
  4. Wait for webpack compilation
  5. Check for compilation errors
  6. If successful: Capture screenshot
  7. Stop dev server
  8. Update App.tsx
  9. Save progress to building.json
  NEXT SCREEN
```

## Benefits
- ✅ Fresh screenshots per screen (no cache)
- ✅ Compilation errors prevent screenshots
- ✅ Easier to debug individual screens
- ✅ Better error isolation
- ✅ Cleaner state management

## Risks
- ⚠️ Slower build time (dev server restart overhead ~10-15s per screen)
- ⚠️ More resource intensive (multiple server starts)
- ⚠️ Need to ensure proper cleanup on cancellation

## Implementation Plan

### Phase 1: Preparation
- [ ] Create comprehensive unit tests for current build flow
- [ ] Document current dev server lifecycle
- [ ] Identify all cancellation points

### Phase 2: Refactor
- [ ] Remove global dev server start (line 3203-3268 in BuildModeHandler.ts)
- [ ] Move dev server lifecycle into screen loop (after line 3553)
- [ ] Add compilation error detection before screenshot capture
- [ ] Remove batch screenshot section (lines 3575-3677)
- [ ] Update totalSteps calculation

### Phase 3: Testing
- [ ] Test build with multiple screens
- [ ] Test cancellation during dev server startup
- [ ] Test cancellation during screenshot capture
- [ ] Test compilation error handling
- [ ] Test progress persistence

### Phase 4: Optimization (Future)
- [ ] Cache node_modules between restarts
- [ ] Parallel screenshot capture for independent screens
- [ ] Better webpack compilation detection

## Files to Modify
- `src/features/build-mode/handlers/BuildModeHandler.ts` (primary)
- `src/features/build-mode/handlers/BuildModeHandler.test.ts` (tests)

## Target Release
Version 0.1.5 (December 24, 2025)

## Related Issues
- Screenshots captured with stale state
- Webpack compilation errors don't prevent screenshots
- Dev server running continuously in background

## Estimated Effort
- Implementation: 4-6 hours
- Testing: 2-3 hours
- Total: 6-9 hours
