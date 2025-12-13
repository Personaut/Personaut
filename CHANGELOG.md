# Changelog

All notable changes to the Personaut extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-12-13

### Fixed
- **Critical**: Fixed message type mismatches causing Build Mode "Checking" state to hang indefinitely
  - Handler sends `project-name-checked` but webview was listening for `project-name-check`
  - Handler sends `build-state` but webview was listening for `build-state-loaded`
  - Handler sends `build-log` but webview was listening for `build-log-loaded`
- Project state now correctly persists and restores when returning to a project
- Build logs now properly load and display when returning to a project

### Added
- New organized file structure for project data:
  - `.personaut/{project-name}/planning/` - Stage files (idea, users, features, etc.)
  - `.personaut/{project-name}/iterations/` - Iteration feedback and screenshots
- Migration support for existing projects to new folder structure
- Iteration data management (feedback, consolidated feedback, screenshots)
- Backward compatibility: reads from both old and new file locations
- Property-based tests for message type fixes and build state restoration

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
