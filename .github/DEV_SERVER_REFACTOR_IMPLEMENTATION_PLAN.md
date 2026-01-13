# Dev Server Per-Screen Refactor - Detailed Implementation Plan

## Executive Summary

This document provides a comprehensive, step-by-step implementation plan for refactoring the build workflow to use a per-screen dev server lifecycle instead of a global dev server.

**Target File:** `src/features/build-mode/handlers/BuildModeHandler.ts`  
**Target Version:** 0.1.5  
**Estimated Lines Changed:** ~550 lines  
**Risk Level:** Medium-High (touches critical build orchestration)

---

## Current Architecture Analysis

### Current Flow (v0.1.4)
```
1. Initialize project (lines 2969-3164)
   ├─ Create directories
   ├─ Generate package.json
   ├─ Install dependencies
   └─ Create boilerplate

2. Start dev server ONCE (lines 3166-3230) ← REMOVE THIS
   └─ Store in activeDevServer

3. Generate all screens (lines 3234-3493)
   ├─ For each screen:
   │   ├─ Generate code with AI
   │   ├─ Save to file
   │   ├─ Update App.tsx
   │   └─ Attempt code repair (uses global devServer)
   └─ Wait 15 seconds

4. Restart dev server + Batch screenshots (lines 3494-3708) ← REMOVE THIS
   ├─ Stop old server
   ├─ Start fresh server
   ├─ Check compilation
   └─ Capture all screenshots

5. Cleanup (lines 3711-3786)
   └─ Stop dev server
```

### Issues with Current Architecture
1. **Stale Screenshots**: Dev server runs continuously, can cache state
2. **Compilation Blindness**: Screenshots captured even if webpack fails
3. **Poor Error Isolation**: Hard to debug which screen caused issues
4. **Inefficient Repair Loop**: Code repair uses global server (lines 3342-3415)

---

## Target Architecture (v0.1.5)

### New Flow
```
1. Initialize project (UNCHANGED)
   ├─ Create directories
   ├─ Generate package.json
   ├─ Install dependencies
   └─ Create boilerplate

2. Per-Screen Build Loop (NEW)
   For each screen:
     ├─ Step 1: Generate code
     │   ├─ AI generation
     │   ├─ Save to file
     │   └─ Update App.tsx
     │
     ├─ Step 2: Dev server + Compilation + Screenshot
     │   ├─ Start fresh dev server
     │   ├─ Wait for webpack compilation (3s)
     │   ├─ Check for compilation errors
     │   ├─ If errors: Attempt repair (max 3 attempts)
     │   ├─ If success: Capture screenshot
     │   └─ Stop dev server
     │
     └─ Step 3: Cleanup
         └─ Wait for port release (2s)

3. Final cleanup (SIMPLIFIED)
   └─ Save build data
```

---

## Implementation Steps

### STEP 1: Update Total Steps Calculation
**Location:** Line 2957  
**Risk:** Low  
**Testing:** Verify progress bar shows correct total

**Current Code:**
```typescript
const totalSteps = screens.length + 2; // Project init + screens + completion
```

**New Code:**
```typescript
// Calculate total steps for per-screen dev server lifecycle
// Each screen has 3 sub-steps: generate, dev-server+screenshot, cleanup
const stepsPerScreen = 3;
const totalSteps = 3 + (screens.length * stepsPerScreen) + 1;
// Breakdown:
// - 3 init steps (package.json, npm install, boilerplate)
// - screens.length * 3 (per-screen: generate, dev+screenshot, stop)
// - 1 completion step
```

---

### STEP 2: Remove Global Dev Server Start
**Location:** Lines 3166-3230  
**Risk:** Medium  
**Dependencies:** Must ensure no other code references this server

**Lines to DELETE:**
```typescript
// Step 1.5d: Start dev server
currentStep++;
webview.postMessage({
  type: 'building-progress-update',
  step: currentStep,
  totalSteps: totalSteps + 5,
  agentId: 'dev-server',
  status: 'in-progress',
  message: 'Starting development server...',
});

const { DevServerManager } = await import('../services/DevServerManager');
const devServer = new DevServerManager();

const serverResult = await devServer.start({
  projectPath,
  framework: framework || 'react',
  port: 3000,
  timeout: 120000,
  onLog: (message) => { /* ... */ },
  onReady: () => { /* ... */ },
});

// Check if cancelled after dev server start
if (this.buildModeService.isBuildCancelled()) {
  console.log('[BuildModeHandler] Build cancelled after dev server start');
  if (serverResult.success) {
    await devServer.stop();
  }
  return;
}

if (!serverResult.success) {
  webview.postMessage({ /* error message */ });
} else {
  // Store server for cleanup
  (this.buildModeService as any)['activeDevServer'] = devServer;

  // Step 2: Generate code for each screen (one at a time)
```

**Replace with:**
```typescript
// Per-Screen Build Loop: Each screen gets fresh dev server
webview.postMessage({
  type: 'build-log',
  projectName,
  entry: {
    timestamp: Date.now(),
    type: 'info',
    message: `🔨 Starting per-screen build for ${screens.length} screen(s)...`,
  },
});
```

---

### STEP 3: Refactor Screen Generation Loop
**Location:** Lines 3234-3493  
**Risk:** High (complex logic changes)  
**Key Changes:**
1. Remove references to global `devServer` variable
2. Keep code generation logic
3. Remove inline repair loop (will move to Step 4)

**Current Structure:**
```typescript
for (let i = 0; i < screens.length; i++) {
  // Generate code (KEEP)
  // Update App.tsx (KEEP)
  // Repair loop using global devServer (REMOVE - will move to Step 4)
}
```

**New Structure:**
```typescript
for (let i = 0; i < screens.length; i++) {
  // Check cancellation
  if (this.buildModeService.isBuildCancelled()) {
    console.log('[BuildModeHandler] Build cancelled, stopping screen generation');
    break;
  }

  const screen = screens[i];
  
  // ============================================
  // SUB-STEP 1: Generate Code (currentStep++)
  // ============================================
  currentStep++;
  this.buildModeService.updateScreenStatus(screen.name, 'in-progress');
  
  webview.postMessage({
    type: 'building-progress-update',
    step: currentStep,
    totalSteps,
    agentId: `screen-${screen.id}-generate`,
    status: 'running',
    message: `[${i+1}/${screens.length}] Generating ${screen.name}...`,
  });

  // AI code generation (EXISTING CODE - lines 3267-3311)
  const codeGenConversationId = `build-screen-${projectName}-${screen.id}-${Date.now()}`;
  
  try {
    // ... existing AI generation code ...
    // ... save file ...
    // ... update App.tsx ...
    
    webview.postMessage({
      type: 'build-log',
      projectName,
      entry: {
        timestamp: Date.now(),
        type: 'success',
        message: `✅ ${screen.name} code generated → ${fileName}`,
      },
    });

    // ============================================
    // SUB-STEP 2: Dev Server + Compile + Screenshot (currentStep++)
    // ============================================
    currentStep++;
    
    webview.postMessage({
      type: 'building-progress-update',
      step: currentStep,
      totalSteps,
      agentId: `screen-${screen.id}-compile`,
      status: 'running',
      message: `[${i+1}/${screens.length}] Compiling ${screen.name}...`,
    });

    // START FRESH DEV SERVER FOR THIS SCREEN
    const { DevServerManager } = await import('../services/DevServerManager');
    const screenDevServer = new DevServerManager();
    
    webview.postMessage({
      type: 'build-log',
      projectName,
      entry: {
        timestamp: Date.now(),
        type: 'info',
        message: `🚀 Starting dev server for ${screen.name}...`,
      },
    });

    const serverResult = await screenDevServer.start({
      projectPath,
      framework: framework || 'react',
      port: 3000,
      timeout: 120000,
      onLog: (message) => {
        // Silent or minimal logging to avoid spam
      },
      onReady: () => {
        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'success',
            message: `✅ Dev server ready for ${screen.name}`,
          },
        });
      },
    });

    // Check cancellation after server start
    if (this.buildModeService.isBuildCancelled()) {
      console.log('[BuildModeHandler] Build cancelled during dev server start');
      if (serverResult.success) {
        await screenDevServer.stop();
      }
      break;
    }

    if (!serverResult.success) {
      webview.postMessage({
        type: 'build-log',
        projectName,
        entry: {
          timestamp: Date.now(),
          type: 'error',
          message: `❌ Dev server failed for ${screen.name}: ${serverResult.error}`,
        },
      });
      
      // Mark screen as failed but continue with others
      this.buildModeService.updateScreenStatus(screen.name, 'failed', serverResult.error);
      currentStep++; // Skip screenshot step
      continue;
    }

    // WAIT FOR WEBPACK COMPILATION
    webview.postMessage({
      type: 'build-log',
      projectName,
      entry: {
        timestamp: Date.now(),
        type: 'info',
        message: `⏳ Waiting for webpack to compile ${screen.name}...`,
      },
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // CHECK FOR COMPILATION ERRORS
    const compilationOutput = screenDevServer.getCompilationOutput() || '';
    const errors = WebpackErrorParser.parseErrors(compilationOutput);

    if (errors.length > 0) {
      // ATTEMPT CODE REPAIR (max 3 attempts)
      const maxRepairAttempts = 3;
      let repairAttempt = 0;
      let finalCode = generatedCode;
      let repairSuccess = false;

      while (repairAttempt < maxRepairAttempts && errors.length > 0) {
        repairAttempt++;
        
        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'warning',
            message: `🔧 Compilation errors in ${screen.name}, attempting repair (${repairAttempt}/${maxRepairAttempts})...`,
          },
        });

        const { CodeRepairService } = await import('../services/CodeRepairService');
        const repairService = new CodeRepairService(this.buildModeService['agentManager']);

        const repairResult = await repairService.repairCode(
          finalCode,
          errors,
          fileName,
          1
        );

        if (repairResult.success && repairResult.repairedCode) {
          finalCode = repairResult.repairedCode;
          await fs.writeFile(filePath, finalCode, 'utf-8');
          
          webview.postMessage({
            type: 'build-log',
            projectName,
            entry: {
              timestamp: Date.now(),
              type: 'success',
              message: `✅ Code repaired for ${screen.name} (attempt ${repairAttempt})`,
            },
          });

          // Wait for recompilation
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Re-check for errors
          const newOutput = screenDevServer.getCompilationOutput() || '';
          const newErrors = WebpackErrorParser.parseErrors(newOutput);
          
          if (newErrors.length === 0) {
            repairSuccess = true;
            break;
          }
        } else {
          webview.postMessage({
            type: 'build-log',
            projectName,
            entry: {
              timestamp: Date.now(),
              type: 'error',
              message: `❌ Repair failed for ${screen.name}: ${repairResult.error}`,
            },
          });
          break;
        }
      }

      if (!repairSuccess) {
        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'error',
            message: `❌ ${screen.name} has compilation errors after ${repairAttempt} repair attempts. Skipping screenshot.`,
          },
        });
        
        // Stop server and mark as failed
        await screenDevServer.stop();
        this.buildModeService.updateScreenStatus(screen.name, 'failed', 'Compilation errors');
        currentStep++; // Skip screenshot step
        continue;
      }
    }

    // COMPILATION SUCCESSFUL - CAPTURE SCREENSHOT
    webview.postMessage({
      type: 'build-log',
      projectName,
      entry: {
        timestamp: Date.now(),
        type: 'info',
        message: `📸 Capturing screenshot for ${screen.name}...`,
      },
    });

    const { ScreenshotService } = await import('../services/ScreenshotService');
    const screenshotService = new ScreenshotService();

    try {
      await screenshotService.initialize();

      const route = i === 0 ? '/' : `/${screen.name.toLowerCase().replace(/\\s+/g, '-')}`;
      const url = `http://localhost:3000${route}`;

      const screenshotResult = await screenshotService.capture({
        url,
        viewport: { width: 1280, height: 720 },
        waitForTimeout: 3000,
      });

      if (screenshotResult.success && screenshotResult.data) {
        // Save to .personaut directory
        const screenshotPath = await this.stageManager.saveScreenshot(
          projectName,
          iteration,
          screen.name,
          screenshotResult.data
        );

        // Also save to project screenshots folder
        const projectScreenshotDir = path.join(projectPath, 'screenshots');
        await fs.mkdir(projectScreenshotDir, { recursive: true });
        await fs.writeFile(
          path.join(projectScreenshotDir, `${screen.name.toLowerCase().replace(/\\s+/g, '-')}.png`),
          screenshotResult.data
        );

        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'success',
            message: `✅ Screenshot saved for ${screen.name}`,
          },
        });
      } else {
        webview.postMessage({
          type: 'build-log',
          projectName,
          entry: {
            timestamp: Date.now(),
            type: 'warning',
            message: `⚠️ Screenshot failed for ${screen.name}: ${screenshotResult.error}`,
          },
        });
      }

      await screenshotService.close();
    } catch (error: any) {
      console.error(`[BuildModeHandler] Screenshot failed for ${screen.name}:`, error);
      webview.postMessage({
        type: 'build-log',
        projectName,
        entry: {
          timestamp: Date.now(),
          type: 'warning',
          message: `⚠️ Screenshot error for ${screen.name}: ${error.message}`,
        },
      });
    }

    // ============================================
    // SUB-STEP 3: Stop Dev Server (currentStep++)
    // ============================================
    currentStep++;
    
    webview.postMessage({
      type: 'build-log',
      projectName,
      entry: {
        timestamp: Date.now(),
        type: 'info',
        message: `🛑 Stopping dev server for ${screen.name}...`,
      },
    });

    await screenDevServer.stop();
    
    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 2000));

    webview.postMessage({
      type: 'building-progress-update',
      step: currentStep,
      totalSteps,
      agentId: `screen-${screen.id}-complete`,
      status: 'complete',
      message: `[${i+1}/${screens.length}] ${screen.name} complete`,
    });

    // Update screen status to complete
    this.buildModeService.updateScreenStatus(screen.name, 'complete');

  } catch (error: any) {
    await this.buildModeService['agentManager'].disposeAgent(codeGenConversationId);
    
    webview.postMessage({
      type: 'build-log',
      projectName,
      entry: {
        timestamp: Date.now(),
        type: 'error',
        message: `❌ Failed to build ${screen.name}: ${error.message}`,
      },
    });

    this.buildModeService.updateScreenStatus(screen.name, 'failed', error.message);
    
    // Skip remaining sub-steps for this screen
    currentStep += 2;
    continue;
  }
}
```

---

### STEP 4: Remove Batch Screenshot Section
**Location:** Lines 3494-3708  
**Risk:** Low (entire section deleted)

**Lines to DELETE:**
```typescript
// Wait for webpack to finish compiling all screens
webview.postMessage({ /* ... */ });
await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds

// Step 1.5e: Capture screenshots
currentStep++;
// ... entire screenshot batch logic ...
```

**Why Safe to Delete:**
- Screenshots now captured per-screen in Step 3
- No other code depends on this section

---

### STEP 5: Update Completion Logic
**Location:** Lines 3711-3786  
**Risk:** Low  
**Changes:** Remove dev server cleanup (no longer needed)

**Current Code:**
```typescript
// Clean up dev server
const activeDevServer = (this.buildModeService as any)['activeDevServer'];
if (activeDevServer) {
  activeDevServer.stop();
  delete (this.buildModeService as any)['activeDevServer'];
  webview.postMessage({ /* ... */ });
}
```

**New Code:**
```typescript
// No dev server cleanup needed - already stopped per-screen
```

---

### STEP 6: Update Cancellation Handling
**Location:** Throughout the screen loop  
**Risk:** Medium  
**Key Points:**
- Add cancellation checks after dev server start
- Ensure dev server is stopped if cancelled mid-process
- Clean up screenshot service if cancelled

**Pattern to Add:**
```typescript
// After dev server start
if (this.buildModeService.isBuildCancelled()) {
  console.log('[BuildModeHandler] Build cancelled during dev server');
  if (screenDevServer) {
    await screenDevServer.stop();
  }
  break;
}
```

---

## Testing Strategy

### Unit Tests
1. **Test Step Calculation**
   - Verify `totalSteps` formula is correct
   - Test with 1, 3, 5 screens

2. **Test Dev Server Lifecycle**
   - Mock `DevServerManager`
   - Verify start/stop called per screen
   - Verify port release delay

3. **Test Compilation Error Handling**
   - Mock compilation errors
   - Verify repair attempts
   - Verify screenshot skipped on failure

### Integration Tests
1. **Single Screen Build**
   - Generate 1 screen
   - Verify dev server starts/stops
   - Verify screenshot captured

2. **Multi-Screen Build**
   - Generate 3 screens
   - Verify each gets fresh dev server
   - Verify all screenshots captured

3. **Cancellation Tests**
   - Cancel during code generation
   - Cancel during dev server start
   - Cancel during screenshot
   - Verify cleanup in all cases

4. **Error Handling Tests**
   - Compilation error on screen 2
   - Dev server fails to start
   - Screenshot service fails
   - Verify build continues with other screens

### Manual Testing Checklist
- [ ] Build with 1 screen - verify success
- [ ] Build with 3 screens - verify all complete
- [ ] Cancel during code gen - verify cleanup
- [ ] Cancel during dev server - verify server stopped
- [ ] Introduce syntax error - verify repair attempts
- [ ] Check progress bar accuracy
- [ ] Verify screenshot freshness (no caching)
- [ ] Check build logs for clarity

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback**
   ```bash
   git checkout dev-0.1.4 -- src/features/build-mode/handlers/BuildModeHandler.ts
   ```

2. **Partial Rollback**
   - Keep step calculation changes
   - Revert dev server lifecycle changes
   - Use feature flag to toggle behavior

3. **Feature Flag Approach** (Future)
   ```typescript
   const USE_PER_SCREEN_DEV_SERVER = process.env.PERSONAUT_PER_SCREEN_SERVER === 'true';
   
   if (USE_PER_SCREEN_DEV_SERVER) {
     // New per-screen logic
   } else {
     // Old global server logic
   }
   ```

---

## Performance Considerations

### Expected Impact
- **Build Time Increase:** ~10-15 seconds per screen
  - Dev server start: ~5-8s
  - Port release wait: ~2s
  - Compilation wait: ~3s

### For 3 Screens:
- **Before:** ~60 seconds total
- **After:** ~90-105 seconds total
- **Increase:** ~50-75% longer

### Mitigation Strategies
1. **Reduce Port Release Wait**
   - Test with 1s instead of 2s
   - Use port checking instead of fixed delay

2. **Parallel Screenshot Capture** (Future)
   - Use different ports for each screen
   - Capture screenshots in parallel
   - Requires significant refactoring

3. **Smart Compilation Detection** (Future)
   - Parse webpack output for "Compiled successfully"
   - Reduce wait time from 3s to actual compile time

---

## Success Criteria

### Must Have
- ✅ All screens build successfully
- ✅ Screenshots are fresh (no caching)
- ✅ Compilation errors prevent screenshots
- ✅ Progress bar is accurate
- ✅ Cancellation works at all points
- ✅ Build logs are clear and helpful

### Nice to Have
- ✅ Build time increase < 60 seconds for 3 screens
- ✅ Error messages are actionable
- ✅ Memory usage is stable

### Failure Conditions
- ❌ Any screen fails to build that worked before
- ❌ Screenshots show cached/stale content
- ❌ Dev server port conflicts
- ❌ Memory leaks from unclosed servers
- ❌ Build hangs indefinitely

---

## Timeline

### Phase 1: Preparation (30 min)
- Review this plan
- Set up test project
- Create test screens

### Phase 2: Implementation (2-3 hours)
- Step 1: Update calculations (15 min)
- Step 2: Remove global server (30 min)
- Step 3: Refactor screen loop (90 min)
- Step 4: Remove batch screenshots (15 min)
- Step 5: Update completion (15 min)
- Step 6: Add cancellation (30 min)

### Phase 3: Testing (1-2 hours)
- Unit tests (30 min)
- Integration tests (30 min)
- Manual testing (30-60 min)

### Phase 4: Documentation (30 min)
- Update changelog
- Update build mode docs
- Add code comments

**Total Estimated Time:** 4-6 hours

---

## Next Steps

1. **Review this plan** - Confirm approach is sound
2. **Create feature branch** - `git checkout -b feature/per-screen-dev-server`
3. **Implement Step 1** - Start with step calculation
4. **Test incrementally** - Verify each step before proceeding
5. **Document changes** - Update changelog and docs
6. **Create PR** - Request review before merging

---

## Questions for Review

1. **Performance:** Is 50-75% build time increase acceptable?
2. **Error Handling:** Should we continue with other screens if one fails?
3. **Port Release:** Is 2 seconds enough wait time?
4. **Repair Attempts:** Keep max 3 attempts or adjust?
5. **Screenshot Failures:** Should screenshot failure fail the entire screen?

---

## References

- Issue: `.github/ISSUE_DEV_SERVER_REFACTOR.md`
- KI: `build_mode_orchestration_patterns`
- Current Implementation: `BuildModeHandler.ts` lines 2900-3800
