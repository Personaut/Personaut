## Dev Server Per-Screen Implementation

Due to the complexity and risk of breaking existing functionality, I recommend we implement this change in phases:

### Phase 1: Immediate Fix (Recommended)
**Goal:** Capture screenshots immediately after each screen is generated

**Changes:**
1. Move screenshot capture inside the screen loop (after line 3553)
2. Start/stop dev server per screen
3. Remove batch screenshot section (lines 3575-3677)

**Benefits:**
- Fresh screenshots per screen
- Compilation errors prevent screenshots
- Easier to debug

**Risks:**
- Slower build time (dev server restart overhead)
- More complex error handling

### Phase 2: Optimization (Future)
- Cache node_modules between dev server restarts
- Parallel screenshot capture for independent screens
- Better webpack compilation detection

## Recommendation

Given the time constraints and complexity, I suggest:

**Option A:** Implement Phase 1 now (2-3 hours of work + testing)
**Option B:** Keep current flow but add compilation error detection (30 minutes)
**Option C:** Document the issue and schedule for next sprint

Which would you prefer?
