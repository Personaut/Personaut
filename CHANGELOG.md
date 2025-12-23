# Changelog

All notable changes to the Personaut extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2025-12-23

### Fixed
- **Build Mode File Naming**: Fixed critical file naming mismatch causing webpack compilation errors
  - Files now use `screen.name` consistently for both creation and imports
  - Resolved "Module not found" errors (e.g., `home-feed.tsx` vs `homefeed.tsx`)
  - Webpack can now correctly resolve all generated screen files
- **Dev Server Screenshot Caching**: Added dev server restart before screenshot capture
  - Dev server now stops and restarts fresh before capturing screenshots
  - Eliminates cached/stale screenshots from previous compilations
  - 2-second wait added for port release between restarts
- **Compilation Error Detection**: Screenshots no longer captured when webpack fails
  - Added compilation output checking before screenshot capture
  - Build skips screenshots and shows clear error message on webpack failure
  - Prevents screenshots of broken applications
- **Token Counter Display Issues**: Complete overhaul of token usage tracking and display
  - Fixed token counter showing conversation-specific counts instead of global totals
  - Removed token usage from persisted state to prevent stale data on webview reload
  - Added visibility change handler to refresh token counts when switching views
  - Token counter now consistently shows global usage across all sessions
  - Conversation-specific token updates are now properly filtered out from header display
- **Conversation History Token Counts**: Token usage now displays correctly in chat history
  - Fixed `handleGetSessionHistory` hardcoded zeros for token fields
  - Added token data enrichment from TokenMonitor for all conversation history items
  - Each conversation card now shows accurate In/Out/Total token counts
  - Token counts persist correctly across sessions and view switches
- **Persona Backstory Generation**: Improved quality and system cleanliness
  - Enhanced backstory prompt to generate detailed 500-750 word stories with core memories
  - Fixed backstory generation creating unwanted entries in chat history
  - Backstory generation now uses direct provider call instead of full agent conversation
  - Token usage for persona generation is still tracked but doesn't clutter conversation list
- **Persona Regenerate Button**: Added visual loading indicator
  - Fixed missing CSS `@keyframes spin` animation for loading spinner
  - Regenerate button now shows animated spinner and is disabled during generation
  - Clear visual feedback when backstory is being regenerated
- **Feedback Form State**: Fixed form caching between sessions
  - Screenshot and selected personas now automatically clear after feedback generation
  - Fresh state for each new feedback session
  - Prevents confusion from stale selections

### Added
- **Comprehensive Documentation**: Major README improvements for v0.1.4
  - Added AI provider configuration instructions with step-by-step setup
  - Added system requirements (VS Code 1.90.0+, Node.js v18+, npm)
  - Added supported frameworks list (React, Next.js, Vue.js, Flutter)
  - Added persona chat usage instructions
  - Added data storage locations and privacy information
  - Added experimental warnings for Build Mode
  - Added migration notes for users upgrading from v0.1.2 or earlier
- **Material Design 3 Icons**: Consistent icon styling across the entire UI
  - All icons updated from `strokeWidth="2"` to `strokeWidth="1.5"` for lighter, modern appearance
  - Icons updated in: ChatHistoryPanel, ChatInput, ChatHeader, Button component
  - Consistent Material 3 aesthetic with rounded line caps and joins
  - Better visual hierarchy with lighter icons that don't compete with content
- **Detailed Token Display in History**: Enhanced conversation history with granular token information
  - Each conversation card shows: `In: X · Out: Y · Total: Z`
  - Token counts displayed at bottom right of each card, next to delete button
  - Always visible (not just on hover) for quick reference
  - Formatted numbers with commas for readability
  - Total count highlighted in primary color with medium font weight
- **Conversation Memory**: Fixed agent context retention across messages
  - Added `currentConversationId` state tracking in `useChatState`
  - Messages now include conversation ID to maintain continuity
  - Agent reuses existing conversation instead of creating new ones for each message
  - Proper conversation history maintained throughout chat sessions
- **File Upload Support**: Added ability to upload images and text files to chat
  - File upload button with paperclip icon in chat input
  - Supports images (vision analysis) and text files (.txt, .md, .json, .csv, .log)
  - Images converted to base64 and passed to vision-capable models
  - Text files read and added to conversation context
  - Context files displayed in chat with remove option
- **Configurable Conversation Limit**: Added user setting for conversation history size
  - New `maxStoredConversations` setting in VS Code preferences
  - Default: 1000 conversations (up from hardcoded 20)
  - Prevents VS Code globalState bloat while giving users control
  - Dynamic limit retrieval from settings instead of hardcoded constant

### Changed
- **Token Monitoring Architecture**: Improved accuracy and reliability
  - Removed optimistic token updates that caused double-counting
  - Token counter now updates with final accurate values after AI response
  - Eliminated "flashing" behavior where counter would show incorrect then correct values
  - Eventual consistency approach prioritizes accuracy over immediate feedback
- **Conversation History Display**: Enhanced UI for better information density
  - Token counts moved from inline badges to dedicated bottom row
  - Delete button and token counts share bottom row with proper spacing
  - Token counts use smaller font size for compact display
  - Improved visual hierarchy with muted colors for secondary information

### Known Issues
- **Build Mode - New Projects Only**: Build Mode currently only supports creating new projects from scratch
  - Cannot add generated code to existing projects
  - Workaround: Create new project, then manually integrate code
  - Existing project support planned for future release
- **Screenshot Caching** (Partial Fix): Dev server restart improves freshness but full per-screen restart planned
  - Current: Dev server restarts once before all screenshots
  - Planned (v0.1.5): Dev server restarts per screen for maximum freshness
  - Scheduled for December 24, 2025

### Technical Improvements
- **Code Quality**: Enhanced type safety and error handling
  - Added null checks for token usage data with fallback to 0
  - Improved TypeScript typing for conversation enrichment
  - Better separation of concerns between global and conversation-specific token tracking
- **Performance**: Optimized state management and data flow
  - Reduced unnecessary state persistence for frequently-changing data
  - More efficient token data fetching on visibility changes
  - Cleaner message handling with proper filtering of update types


## [0.1.3] - 2025-12-14

### Fixed
- **Token Tracking**: Fixed token usage not updating during persona interviews
  - AgentManager now passes TokenMonitor to Agent instances
  - All AI interactions now properly track and display token consumption
- **Interview Error Handling**: Enhanced error handling in interview workflow
  - Silent failures now properly logged and reported to UI
  - Individual interview responses saved as they complete
  - "No response received" cases handled explicitly
- **User Stories Display**: Fixed user stories not appearing in UI after generation
  - Added `setStoriesLoading(false)` to the `user-stories-generated` handler
- **Design Stage Display**: Fixed screens and user flows not appearing in UI
  - Added JSON parsing for `screens` array in AI responses
  - Added JSON parsing for `userFlows`/`flows` array in AI responses
- **Design Stage Order**: Fixed duplicate User Flows section in Design stage
  - Corrected order: Framework → Key Screens → User Flows
- **Project File Location**: Fixed files being created in workspace root instead of `.personaut/`
  - StageManager and BuildLogManager now correctly use `.personaut/` subdirectory
- **Iteration Loop Premature Completion**: Fixed UX/Developer steps marking complete immediately
  - Removed premature `isTyping`-based completion timer
  - Steps now only complete on COORDINATOR signal or completion phrases
- **Screenshot After Developer**: Developer completion now triggers automatic screenshot capture
- **Console Logging**: Reduced excessive AgentManager cleanup logs
- **JSON Parsing**: Robust JSON parsing for LLM outputs that handles markdown code blocks and common formatting issues
- **Conversation Title Preservation**: Fixed titles being lost when messages are trimmed for storage optimization
- **Iteration Flow Skipping Steps**: Fixed build iteration immediately jumping to User Feedback
  - Added `setIsTyping(true)` to `sendBuildMessage` to prevent premature step completion
  - UX → Developer → User Feedback flow now waits for actual AI responses
- **Building Stage Accessibility**: Updated colors to be WCAG AA compliant for low-vision users
  - Increased font sizes from `text-[10px]` to `text-sm`/`text-base`
  - Solid background colors instead of transparent overlays (4.5:1+ contrast ratio)
  - High-contrast text colors (white, yellow-300) on dark backgrounds
  - Thicker borders (2px) and bold font weights for visibility
- **User Flows Persistence**: Fixed user flows not being saved/loaded properly
  - Regenerated flows now save to design stage file (was only sending to webview)
  - Handle alternative key names from AI responses (`flows` → `userFlows`, `screens` → `pages`)
  - Normalize page fields (`description` → `purpose`, `elements` → `uiElements`, etc.)

### Added
- **Build Permission Dialog**: Added permission check before starting build
  - Checks if `autoRead` and `autoWrite` are enabled before building
  - Shows dialog if permissions missing, with option to grant and start
  - Ensures developer agent can write files without "Permission Denied" errors
  - Force-enables permissions for build mode messages
- **Natural Language Persona Interviews**: Complete redesign of persona feedback collection
  - Personas now respond conversationally like real users (no JSON output)
  - Each persona asked to suggest 4-5 specific features with personal reasoning
  - Raw interview transcripts preserved in `surveys.json`
  - Separate consolidator agent extracts structured features from natural language
  - Features grouped by similarity with quotes from multiple users
- **Building Stage Redesign**: New page-centric UI for the Building stage
  - Build folder created as initialization step (`.personaut/{project}/building/`)
  - Framework auto-initialization if no `package.json` exists (React, Next.js, Vue, Flutter)
  - Page cards showing each screen with iteration status and progress
  - Status indicators: Locked, Pending, Building, Complete
  - Iteration tracking per page (e.g., "Iteration 2/5")
  - Progress steps visualization: UX → Dev → Feedback
- **Project Folder Name**: Added ability to specify a subdirectory for generated code
  - New "📁 Project Folder" input field in Design stage
  - Code is generated in the specified subdirectory (e.g., `./my-app/src/components/...`)
  - Framework initialization runs inside the subdirectory
  - Leave empty to use workspace root (backwards compatible)
- **Modern Framework Commands**: Updated framework initialization to use Vite
  - React: `npm create vite@latest . -- --template react-ts`
  - Vue: `npm create vite@latest . -- --template vue-ts`
  - Faster, modern tooling with TypeScript support by default
- **Storage Optimization**: Prevent VS Code globalState bloat warning
  - Max 20 conversations stored in globalState
  - Max 100 messages per conversation
  - Automatic pruning of old conversations on save
  - TODO: Future file-based storage with user-configurable path
- **Workflow Pause/Resume**: Added ability to pause building workflows (Task 21.11)
  - "Pause Workflow" button replaces "Stop Loop" button
  - Pause icon in Build Mode UI
  - Message handlers for `building-workflow-paused` and `building-workflow-resumed`
- **Survey Response Persistence**: Individual interview responses now saved to `surveys.json`
  - New `save-survey-response` handler in BuildModeHandler
  - Progress updates include individual response data
- **User Flow Generation**: Enhanced Design stage with user flow generation
  - "Generate Flows" button when no flows exist
  - "Regenerate" button when flows already exist
  - `flows-updated` message handler for UI updates
- **AI User Stories**: Verified existing implementation for AI-generated user stories (Task 23)
  - `handleGenerateUserStories` with `USER_STORY_PROMPT`
  - Stories in "As a X, I want Y, so that Z" format
- **Build Log Download**: Added download button to export build logs as `.log` file
- **Bug Report Button**: Added bug icon linking to GitHub issues page
- **Manual Screenshot Upload**: Added ability to upload screenshots when auto-capture fails
  - File picker accepts any image format
  - Screenshot required before proceeding to User Feedback
  - Auto-advances to User Feedback after successful upload

### Changed
- **Test File Naming**: Updated property tests to support `__tests__/` directory structure
  - Tests for files in `__tests__/` now check sibling directories (services, handlers, types)
- **Iteration Loop Screenshot Flow**: Users must provide screenshot (auto or manual) before User Feedback
  - Added "Upload Screenshot" option when auto-capture fails
  - Removed "Skip to User Feedback" option
- **Persona Interview Prompts**: Now explicitly request 4-5 specific features per user
- **Feature Consolidation**: Consolidator now groups similar features and tracks which users mentioned each

## [0.1.2] - 2025-12-13

### Fixed
- **Critical**: Fixed message type mismatches causing Build Mode "Checking" state to hang indefinitely
  - Handler sends `project-name-checked` but webview was listening for `project-name-check`
  - Handler sends `build-state` but webview was listening for `build-state-loaded`
  - Handler sends `build-log` but webview was listening for `build-log-loaded`
- Project state now correctly persists and restores when returning to a project
- Build logs now properly load and display when returning to a project
- **Data Persistence**: `surveyResponses` and `userFlows` now correctly restore when loading stage files (fixed state hydration logic)
- Fixed `setPages` error in Design stage loading
- Fixed duplicate switch cases in `BuildModeHandler`
- Fixed syntax errors in `BuildModeService`

### Added
- New organized file structure for project data:
  - `.personaut/{project-name}/planning/` - Stage files (idea, users, features, etc.)
  - `.personaut/{project-name}/iterations/` - Iteration feedback and screenshots
- Migration support for existing projects to new folder structure
- Iteration data management (feedback, consolidated feedback, screenshots)
- **Feature Generation**: Implemented multi-agent interview workflow (Persona Agents + Consolidator)
- **User Flows**: Added visual rendering of generated User Flows in Design stage
- Backward compatibility: reads from both old and new file locations
- Property-based tests for message type fixes and build state restoration
- Progress streaming updates during consolidated feature interviews

### Changed
- Stage files now stored in `planning/` subdirectory instead of project root
- Build state restoration now correctly derives current step from completed stages

## [0.1.1] - 2025-12-13

### Fixed
- API key inputs (Gemini, AWS) now save properly when clicking Save immediately after typing
- Settings changes are now synced on every keystroke instead of only on blur

### Added
- Toast notification when settings are saved successfully (auto-dismisses after 2.5 seconds)
- Visual confirmation for data reset operations

## [0.0.1] - 2025-12-07

### Added
- AI-powered coding assistant with multiple provider support (Gemini, Bedrock, OpenAI, Native IDE)
- Persona-based feedback system for targeted code reviews
- Build mode for automated task execution
- MCP (Model Context Protocol) server integration
- Browser automation tool for web interactions
- File system operations with workspace sandboxing
- Terminal command execution with security controls
- Conversation history management
- Token usage tracking and cost calculation

### Security
- Secure API key storage using VS Code SecretStorage API
- Command injection prevention and sanitization
- File system sandboxing to workspace boundaries
- URL validation and internal network blocking
- Input validation and XSS prevention
- Error message sanitization
- Rate limiting for command execution

### Documentation
- README with feature overview
- Contributing guidelines
- Code of conduct
- Privacy policy
