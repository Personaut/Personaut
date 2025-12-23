# Dev Server Per-Screen Refactor Plan

## Current Issues
1. Dev server starts once for all screens (line 3217)
2. Screenshot capture happens after ALL screens are generated (line 3587-3677)
3. Webpack wait is inside loop but screenshots are batched (line 3575-3585)
4. Compilation errors don't prevent screenshot capture
5. Screenshots may use cached/stale state

## New Flow (Per Screen)

```
FOR EACH SCREEN:
  1. Generate code with AI
  2. Save code to file
  3. Start dev server (fresh)
  4. Wait for webpack compilation
  5. Check for compilation errors
  6. If errors: Repair code (up to 3 attempts)
  7. If successful: Capture screenshot
  8. Stop dev server
  9. Update App.tsx
  10. Save progress to building.json
  NEXT SCREEN
```

## Code Changes Required

### File: BuildModeHandler.ts

#### 1. Remove global dev server start (lines 3203-3268)
- Delete the "Step 1.5d: Start dev server" section
- Remove `activeDevServer` storage

#### 2. Move dev server lifecycle into screen loop
**Location:** After line 3510 (after verification success/failure)

**New code:**
```typescript
// Start dev server for this screen only
const { DevServerManager } = await import('../services/DevServerManager');
const devServer = new DevServerManager();

const serverResult = await devServer.start({
  projectPath,
  framework: framework || 'react',
  port: 3000,
  timeout: 120000,
  onLog: (message) => { /* log */ },
  onReady: () => { /* log */ },
});

if (serverResult.success) {
  // Capture screenshot
  const { ScreenshotService } = await import('../services/ScreenshotService');
  const screenshotService = new ScreenshotService();
  
  await screenshotService.initialize();
  
  const route = i === 0 ? '/' : `/${screen.name.toLowerCase().replace(/\\s+/g, '-')}`;
  const url = `http://localhost:3000${route}`;
  
  const screenshotResult = await screenshotService.capture({
    url,
    viewport: { width: 1280, height: 720 },
    waitForTimeout: 3000,
  });
  
  if (screenshotResult.success && screenshotResult.data) {
    // Save screenshot
    const screenshotPath = await this.stageManager.saveScreenshot(
      projectName,
      iteration,
      screen.name,
      screenshotResult.data
    );
    
    // Log success
  }
  
  await screenshotService.close();
  await devServer.stop();
}
```

#### 3. Remove batch screenshot capture (lines 3575-3677)
- Delete the entire "Wait for webpack" and "Capture screenshots" section
- This is now handled per-screen

#### 4. Update totalSteps calculation
- Remove the "+5" for dev server and screenshots
- Each screen now includes its own screenshot step

### File: BuildModeHandler.test.ts

#### Update tests:
1. `should generate screens and capture screenshots` - Update to expect per-screen dev server lifecycle
2. Add test: `should restart dev server for each screen`
3. Add test: `should skip screenshot if compilation fails`

## Benefits

✅ Fresh dev server per screen (no cache)
✅ Compilation errors prevent screenshots
✅ Easier to debug individual screens
✅ Better error isolation
✅ Cleaner state management

## Risks

⚠️ Slower build (dev server restart overhead)
⚠️ More resource intensive (multiple server starts)
⚠️ Need to ensure proper cleanup on cancellation

## Testing Checklist

- [ ] Build completes successfully with multiple screens
- [ ] Screenshots are captured for each screen
- [ ] Compilation errors are handled correctly
- [ ] Build can be cancelled mid-screen
- [ ] Dev server is properly stopped after each screen
- [ ] Progress is saved after each screen
- [ ] Unit tests pass
