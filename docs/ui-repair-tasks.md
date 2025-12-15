# UI Repair Tasks

This document summarizes the UI changes that were attempted and need to be properly implemented/repaired.

## Session Date: 2025-12-14

---

## 1. Build Stage UI Refinements

### 1.1 Page Cards - Clickable & Expandable
**Status:** Partially implemented, may need repair
- [ ] Page cards in the Building stage should be clickable to expand/collapse
- [ ] Show expand arrow indicator that rotates when expanded
- [ ] Expanded view shows:
  - Current step (for active pages)
  - Iteration counter (e.g., "1/5")
  - Steps visualization: UX → Dev → Feedback

### 1.2 First Pending Page Highlighted
**Status:** Partially implemented
- [ ] When not building, first pending page shows blue highlight with ▶ icon
- [ ] Badge shows "Next" instead of "Pending"
- [ ] Distinct styling: `bg-blue-900/20 border-blue-500/40`

### 1.3 Dismissable Success Toast
**Status:** Implemented
- [x] Shows "✓ Starting build for X pages" when iteration starts
- [x] Auto-dismisses after 5 seconds
- [x] Can be manually dismissed with × button
- [x] Green color scheme

### 1.4 Remove Redundant UI Elements
**Status:** Partially done
- [ ] Remove "Start Building" button (redundant)
- [ ] Remove "ITERATION LOOP ACTIVE" header banner
- [ ] Remove floating empty block at top of building stage

---

## 2. Navigation Buttons (Cancel / Save / Save & Next)

### 2.1 Replace Single Button with Three Buttons
**Status:** BROKEN - syntax errors introduced
- [ ] For all stages EXCEPT "building", show three buttons:
  - **Cancel**: Navigate to previous stage without saving
  - **Save**: Save current stage data, stay on same stage
  - **Save & Next**: Save and advance to next stage
- [ ] Proper disabled state for "idea" stage validation
- [ ] Styling: Cancel = gray, Save = accent, Save & Next = accent bold

### 2.2 Helper Function
**Status:** User added manually
- [x] `getPreviousStage(current: StageName): StageName` - returns previous stage in workflow

---

## 3. Project Loading Fix

### 3.1 Prevent Auto-Save During Project Load
**Status:** Implemented
- [x] Added `isLoadingProjectRef` flag
- [x] Set to `true` when switching projects (before clearing state)
- [x] `saveCurrentStageData()` checks flag and skips saving while loading
- [x] Flag clears after 500ms when stage files finish loading

### 3.2 Stage File Loading
**Status:** User fixed in BuildModeHandler.ts
- [x] `handleLoadStageFile` now returns full StageFile object (not just inner data)
- [x] Webview receives `data.data` for content, `data.completed` for status

---

## 4. State Persistence

### 4.1 Add `userFlows` to vscode.setState
**Status:** Implemented
- [x] Added `userFlows` to the state object saved to vscode.setState
- [x] Added to dependency array

### 4.2 Mode Switching on Load
**Status:** User added
- [x] If personas loaded with data, switch to `demographics` mode
- [x] If features loaded with data, switch to `generate` mode
- [x] Load `devFlowOrder` from saved data (or derive from team)

---

## 5. Team Stage Simplification

### 5.1 Remove Team Role Editing
**Status:** User removed
- [x] Removed `MANDATORY_ROLES` constant
- [x] Removed `newTeamMember` state
- [x] Removed `draggedFlowItem` state
- [x] Team stage now shows read-only "Development Iteration Flow"

---

## 6. Missing Features to Add

### 6.1 Research Button on Idea Stage
**Status:** NOT IMPLEMENTED
- [ ] Add a "Research" button in the idea stage UI
- [ ] Wire to existing research handler
- [ ] Should help user research their idea before proceeding

### 6.2 User Stories Limit Setting
**Status:** NOT IMPLEMENTED
- [ ] Add a numeric input for "Max stories to display"
- [ ] This is a display ceiling, NOT a generation limit
- [ ] User can adjust how many stories are shown in the UI
- [ ] Does not affect how many stories are actually generated

---

## 7. Header Changes

### 7.1 Two-Row Header
**Status:** Previously implemented
- [x] Logo + Personaut AI + action buttons on top row
- [x] Token usage bar below

### 7.2 Panel Title
**Status:** Implemented
- [x] VS Code panel shows "Personaut: AI"

---

## Priority Order for Repair

1. **HIGH** - Fix Navigation Buttons (Cancel/Save/Save & Next) - currently has syntax errors
2. **HIGH** - Verify project loading works correctly after fixes
3. **MEDIUM** - Add Research button to idea stage
4. **MEDIUM** - Add user stories display limit setting
5. **LOW** - Verify all stage file loading/saving works correctly

---

## Files Modified

- `/src/webview/App.tsx` - Main webview UI (most changes)
- `/src/features/build-mode/handlers/BuildModeHandler.ts` - Stage file loading fix
- `/package.json` - Panel title change

---

## Notes

- The `git checkout` command at one point reverted changes, requiring restoration
- Multiple syntax errors were introduced in the button replacement code
- The user manually fixed several issues directly in the files
