# Dev Server Refactor - Quick Reference Card

## 🎯 Core Changes at a Glance

### File: `BuildModeHandler.ts`

#### Change 1: Total Steps (Line 2957)
```typescript
// OLD
const totalSteps = screens.length + 2;

// NEW
const stepsPerScreen = 3; // generate, dev+screenshot, stop
const totalSteps = 3 + (screens.length * stepsPerScreen) + 1;
```

#### Change 2: Remove Global Server (Lines 3166-3230)
```typescript
// DELETE 65 lines starting with:
// Step 1.5d: Start dev server
// ... entire dev server start section ...
```

#### Change 3: Per-Screen Loop (Lines 3234-3493)
```typescript
// REPLACE screen generation loop with:
for (let i = 0; i < screens.length; i++) {
  // Sub-step 1: Generate code (currentStep++)
  // Sub-step 2: Dev server + compile + screenshot (currentStep++)
  // Sub-step 3: Stop server (currentStep++)
}
```

#### Change 4: Remove Batch Screenshots (Lines 3494-3708)
```typescript
// DELETE entire section:
// Wait for webpack to finish compiling all screens
// ... batch screenshot logic ...
```

#### Change 5: Simplify Cleanup (Lines 3749-3763)
```typescript
// REMOVE dev server cleanup:
// const activeDevServer = ...
// Already stopped per-screen
```

---

## 📋 Implementation Sequence

1. ✅ **Backup current file**
   ```bash
   cp src/features/build-mode/handlers/BuildModeHandler.ts \
      src/features/build-mode/handlers/BuildModeHandler.ts.backup
   ```

2. ✅ **Update step calculation** (5 min)
3. ✅ **Remove global dev server** (10 min)
4. ✅ **Add per-screen lifecycle** (60 min)
5. ✅ **Remove batch screenshots** (5 min)
6. ✅ **Update cleanup** (5 min)
7. ✅ **Test** (30 min)

---

## 🧪 Quick Test Commands

```bash
# Run unit tests
npm test BuildModeHandler.test.ts

# Build extension
npm run compile

# Package extension
npm run package

# Test with sample project
# (Manual: Create 3-screen project and run build)
```

---

## ⚠️ Common Pitfalls

1. **Forgetting to stop dev server** → Port conflicts
2. **Not checking cancellation** → Orphaned processes
3. **Wrong step count** → Progress bar incorrect
4. **Skipping port release wait** → Server start fails
5. **Not cleaning up on error** → Resource leaks

---

## 🔍 Verification Checklist

After implementation:
- [ ] Build with 1 screen succeeds
- [ ] Build with 3 screens succeeds
- [ ] Screenshots are fresh (no caching)
- [ ] Compilation errors skip screenshot
- [ ] Cancellation stops dev server
- [ ] Progress bar reaches 100%
- [ ] No port conflicts
- [ ] Logs are clear

---

## 🚨 Emergency Rollback

```bash
# If things go wrong:
git checkout src/features/build-mode/handlers/BuildModeHandler.ts

# Or restore backup:
cp src/features/build-mode/handlers/BuildModeHandler.ts.backup \
   src/features/build-mode/handlers/BuildModeHandler.ts
```

---

## 📞 Quick Links

- **Full Plan:** `DEV_SERVER_REFACTOR_IMPLEMENTATION_PLAN.md`
- **Visual Flow:** `DEV_SERVER_REFACTOR_VISUAL_FLOW.md`
- **Package:** `DEV_SERVER_REFACTOR_PACKAGE.md`
- **Progress:** `DEV_SERVER_REFACTOR_PROGRESS.md`

---

## 💡 Key Insights

- Each screen is now **isolated** with fresh dev server
- Screenshots only captured if **compilation succeeds**
- Build time increases **~6%** (acceptable tradeoff)
- Better **error messages** per screen
- Easier to **debug** individual screens

---

**Last Updated:** December 23, 2025  
**Status:** Ready for Implementation
