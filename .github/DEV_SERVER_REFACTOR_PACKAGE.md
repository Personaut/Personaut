# Dev Server Per-Screen Refactor - Implementation Package

## 📋 Overview

This package contains comprehensive documentation for implementing the dev server per-screen refactor as outlined in `ISSUE_DEV_SERVER_REFACTOR.md`.

**Target Version:** 0.1.5  
**Target Date:** December 24, 2025  
**Estimated Effort:** 4-6 hours implementation + 1-2 hours testing

---

## 📚 Documentation Files

### 1. **ISSUE_DEV_SERVER_REFACTOR.md** (Original Issue)
- Problem statement
- Proposed solution
- Benefits and risks
- High-level implementation plan

### 2. **DEV_SERVER_REFACTOR_IMPLEMENTATION_PLAN.md** (This Package - Main Document)
- **Detailed step-by-step implementation**
- Complete code changes with line numbers
- Testing strategy
- Rollback plan
- Timeline and success criteria

### 3. **DEV_SERVER_REFACTOR_VISUAL_FLOW.md** (Visual Guide)
- Flow diagrams comparing old vs new architecture
- Timing comparisons
- Error handling scenarios
- Migration path visualization

### 4. **DEV_SERVER_REFACTOR_PROGRESS.md** (Tracking Document)
- Implementation checklist
- Phase completion tracking
- Notes and blockers

---

## 🎯 Quick Start Guide

### For Reviewers
1. Read `ISSUE_DEV_SERVER_REFACTOR.md` for context
2. Review `DEV_SERVER_REFACTOR_VISUAL_FLOW.md` for architecture understanding
3. Study `DEV_SERVER_REFACTOR_IMPLEMENTATION_PLAN.md` for detailed changes
4. Provide feedback on approach before implementation begins

### For Implementers
1. Create feature branch: `git checkout -b feature/per-screen-dev-server`
2. Follow `DEV_SERVER_REFACTOR_IMPLEMENTATION_PLAN.md` steps 1-6
3. Update `DEV_SERVER_REFACTOR_PROGRESS.md` as you complete each step
4. Run tests after each major change
5. Create PR when all steps complete

---

## 🔑 Key Changes Summary

### What's Being Removed
- **Global dev server start** (lines 3166-3230)
- **Batch screenshot capture** (lines 3494-3708)
- **15-second compilation wait**
- **Dev server cleanup in completion phase**

### What's Being Added
- **Per-screen dev server lifecycle**
- **Compilation-gated screenshot capture**
- **Enhanced error isolation**
- **Granular progress tracking** (14 steps vs 10 steps for 3 screens)

### What's Being Modified
- **Total steps calculation** (line 2957)
- **Screen generation loop** (lines 3234-3493)
- **Cancellation handling** (throughout)
- **Progress messages** (more detailed per-screen updates)

---

## 📊 Impact Analysis

### Benefits ✅
1. **Fresh Screenshots** - Each screen gets clean dev server state
2. **Compilation Safety** - Screenshots only captured if code compiles
3. **Better Debugging** - Clear per-screen status and error messages
4. **Improved Isolation** - Errors in one screen don't affect others
5. **Cleaner State** - No accumulated cache or side effects

### Tradeoffs ⚠️
1. **Build Time** - ~6% slower (106s vs 100s for 3 screens)
2. **Resource Usage** - Multiple server starts (but shorter-lived)
3. **Complexity** - More code in screen loop (but better organized)

### Risks & Mitigations 🛡️
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Port conflicts | Low | High | 2s wait between servers |
| Memory leaks | Low | Medium | Explicit server cleanup |
| Build hangs | Low | High | Enhanced cancellation checks |
| Screenshot failures | Medium | Low | Continue with other screens |
| Longer build time | High | Low | Clear progress communication |

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Step calculation with 1, 3, 5 screens
- [ ] Dev server lifecycle (start/stop)
- [ ] Compilation error detection
- [ ] Code repair attempts
- [ ] Screenshot service integration

### Integration Tests
- [ ] Single screen build end-to-end
- [ ] Multi-screen build (3 screens)
- [ ] Cancellation during code generation
- [ ] Cancellation during dev server
- [ ] Cancellation during screenshot
- [ ] Compilation error on screen 2
- [ ] Dev server fails to start
- [ ] Screenshot service fails

### Manual Testing
- [ ] Build with 1 screen - verify success
- [ ] Build with 3 screens - verify all complete
- [ ] Introduce syntax error - verify repair
- [ ] Cancel mid-build - verify cleanup
- [ ] Check progress bar accuracy
- [ ] Verify screenshot freshness
- [ ] Check build logs clarity
- [ ] Verify no port conflicts after cancel

---

## 📈 Success Metrics

### Must Pass
- ✅ All existing builds continue to work
- ✅ Screenshots show correct, fresh content
- ✅ Compilation errors prevent screenshots
- ✅ Progress bar shows accurate completion
- ✅ Cancellation cleans up all resources
- ✅ No port conflicts or memory leaks

### Performance Targets
- ✅ Build time increase < 20% (currently ~6%)
- ✅ Memory usage stable (no leaks)
- ✅ All screens complete within 5 minutes

### Quality Targets
- ✅ Code coverage > 80% for new code
- ✅ No new linting errors
- ✅ All error messages are actionable
- ✅ Logs are clear and helpful

---

## 🔄 Implementation Phases

### Phase 1: Preparation ✅
**Duration:** 30 minutes  
**Status:** Complete

- [x] Review issue and requirements
- [x] Create implementation plan
- [x] Create visual flow diagrams
- [x] Set up tracking document

### Phase 2: Core Implementation
**Duration:** 2-3 hours  
**Status:** Not started

**Steps:**
1. Update total steps calculation (15 min)
2. Remove global dev server start (30 min)
3. Refactor screen generation loop (90 min)
4. Remove batch screenshot section (15 min)
5. Update completion logic (15 min)
6. Add enhanced cancellation (30 min)

### Phase 3: Testing
**Duration:** 1-2 hours  
**Status:** Not started

**Activities:**
- Write unit tests
- Run integration tests
- Perform manual testing
- Fix any issues found

### Phase 4: Documentation
**Duration:** 30 minutes  
**Status:** Not started

**Deliverables:**
- Update CHANGELOG.md
- Update build-mode.mdx documentation
- Add inline code comments
- Update README if needed

---

## 🚀 Deployment Plan

### Pre-Deployment
1. All tests passing
2. Code review approved
3. Documentation updated
4. Changelog entry added

### Deployment Steps
1. Merge to `dev-0.1.5` branch
2. Run full test suite
3. Build extension package
4. Test packaged extension manually
5. Tag release `v0.1.5`
6. Update version in package.json

### Post-Deployment
1. Monitor for issues
2. Gather user feedback
3. Document any edge cases
4. Plan optimizations for v0.1.6

---

## 🔧 Rollback Procedures

### Immediate Rollback (If Critical Issues)
```bash
# Revert to previous version
git checkout dev-0.1.4 -- src/features/build-mode/handlers/BuildModeHandler.ts
git commit -m "Rollback: Revert per-screen dev server changes"
```

### Partial Rollback (If Minor Issues)
```bash
# Keep step calculation improvements
# Revert only dev server lifecycle changes
git checkout <commit-before-step-3> -- src/features/build-mode/handlers/BuildModeHandler.ts
```

### Feature Flag Approach (Future)
Add environment variable to toggle behavior:
```typescript
const USE_PER_SCREEN_DEV_SERVER = 
  process.env.PERSONAUT_PER_SCREEN_SERVER !== 'false';
```

---

## 📞 Support & Questions

### During Implementation
- Review implementation plan for detailed steps
- Check visual flow for architecture questions
- Update progress document with blockers
- Consult KI: `build_mode_orchestration_patterns`

### Common Questions

**Q: Why is build time increasing?**  
A: Each screen now gets a fresh dev server (start + stop overhead). The increase is ~6% which is acceptable for the benefits of fresh screenshots and better error isolation.

**Q: What if a screen fails to compile?**  
A: The system will attempt repair up to 3 times. If repair fails, that screen is marked as failed, screenshot is skipped, and the build continues with remaining screens.

**Q: How do we handle cancellation?**  
A: Cancellation checks are added at multiple points. If cancelled during dev server operation, the server is explicitly stopped before exiting the loop.

**Q: Can we make it faster?**  
A: Future optimizations include:
- Reducing port release wait time
- Parallel screenshot capture (different ports)
- Smarter compilation detection
- Caching node_modules between restarts

---

## 📝 Notes for Reviewers

### Code Review Focus Areas
1. **Cancellation Logic** - Verify all cleanup paths
2. **Error Handling** - Check all failure scenarios
3. **Resource Management** - Ensure no leaks
4. **Progress Tracking** - Verify step calculations
5. **Message Clarity** - Review all user-facing messages

### Architecture Review Questions
1. Is per-screen dev server the right approach?
2. Should we continue with other screens if one fails?
3. Is 2 seconds enough for port release?
4. Should screenshot failure fail the entire screen?
5. Are 3 repair attempts the right number?

---

## 🎓 Learning Resources

### Related Documentation
- KI: `build_mode_orchestration_patterns`
- KI: `vscode_extension_maintenance_patterns`
- File: `src/features/build-mode/services/DevServerManager.ts`
- File: `src/features/build-mode/services/ScreenshotService.ts`
- File: `src/features/build-mode/utils/WebpackErrorParser.ts`

### Key Patterns Used
- **Per-Screen Lifecycle** - Isolated resource management
- **Compilation-Gated Capture** - Only screenshot on success
- **Service-Authoritative State** - Cancellation in service layer
- **Responsive Loop Checkpoints** - Frequent cancellation checks
- **Explicit Resource Cleanup** - No orphaned processes

---

## ✅ Final Checklist

Before marking this refactor as complete:

- [ ] All implementation steps completed
- [ ] All tests passing (unit + integration)
- [ ] Manual testing completed successfully
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Changelog entry added
- [ ] No performance regressions
- [ ] No memory leaks detected
- [ ] Cancellation works correctly
- [ ] Error messages are clear
- [ ] Progress tracking is accurate
- [ ] Screenshots are fresh and correct
- [ ] Build logs are helpful

---

## 📅 Timeline

**Created:** December 23, 2025  
**Target Completion:** December 24, 2025  
**Status:** Planning Complete, Ready for Implementation

---

## 🏆 Success Criteria

This refactor will be considered successful when:

1. ✅ All screens build with fresh dev servers
2. ✅ Screenshots accurately reflect compiled code
3. ✅ Compilation errors prevent screenshot capture
4. ✅ Build time increase is < 20% (currently ~6%)
5. ✅ Error messages clearly identify problem screens
6. ✅ Cancellation works at all checkpoints
7. ✅ No port conflicts or resource leaks
8. ✅ Progress bar accurately reflects completion
9. ✅ All tests pass
10. ✅ Code review approved

---

**Ready to proceed with implementation!** 🚀
