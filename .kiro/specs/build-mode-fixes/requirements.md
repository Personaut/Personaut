# Requirements Document

## Introduction

This document specifies the requirements for fixing critical bugs in the Build Mode feature of the Personaut VS Code extension. The Build Mode feature allows users to create projects with a multi-stage workflow (idea, users, features, team, stories, design, building). Currently, there are message type mismatches between the backend handlers and the webview frontend that prevent proper communication, causing the "Checking" state to hang indefinitely and project state to not persist correctly.

## Glossary

- **Build Mode**: A feature mode in Personaut that guides users through creating a project via multiple stages
- **Webview**: The VS Code webview panel that renders the Personaut UI
- **Handler**: Backend TypeScript class that processes messages from the webview
- **Message Type**: A string identifier used to route messages between webview and handler
- **Project Name**: A sanitized, kebab-case identifier derived from the project title
- **Project Title**: The human-readable name entered by the user for their project
- **Stage**: One of the build workflow steps (idea, users, features, team, stories, design, building)
- **Session State**: Temporary state stored in the webview via `vscode.getState()`/`vscode.setState()`
- **.personaut folder**: The workspace directory where project files are persisted

## Requirements

### Requirement 1

**User Story:** As a user, I want to enter a project title and have it validated correctly, so that I can proceed with creating my project.

#### Acceptance Criteria

1. WHEN the user enters a project title THEN the BuildModeHandler SHALL send a response with type `project-name-checked`
2. WHEN the webview receives a project name validation response THEN the webview SHALL listen for message type `project-name-checked`
3. WHEN the project name validation succeeds THEN the system SHALL display the sanitized project name to the user
4. WHEN the project name already exists THEN the system SHALL display an error message indicating the name is taken
5. IF the project name validation fails THEN the system SHALL prevent the user from proceeding to the next step

### Requirement 2

**User Story:** As a user, I want my project state to be loaded correctly when I return to a project, so that I can continue where I left off.

#### Acceptance Criteria

1. WHEN the handler sends build state data THEN the handler SHALL use message type `build-state`
2. WHEN the webview receives build state data THEN the webview SHALL listen for message type `build-state` (matching the handler)
3. WHEN build state is loaded THEN the system SHALL restore the project title from the persisted state
4. WHEN build state is loaded THEN the system SHALL restore the completed stages from the persisted state
5. WHEN build state is loaded THEN the system SHALL derive the current step from completed stages

### Requirement 3

**User Story:** As a user, I want my build logs to be loaded correctly when I return to a project, so that I can see the history of my build process.

#### Acceptance Criteria

1. WHEN the handler sends build log data THEN the handler SHALL use message type `build-log`
2. WHEN the webview receives build log data THEN the webview SHALL listen for message type `build-log` (matching the handler)
3. WHEN build log is loaded THEN the system SHALL convert persisted entries to UI log format
4. WHEN build log is loaded THEN the system SHALL display the log entries in the Build Output panel

### Requirement 4

**User Story:** As a user, I want my project data to persist in a well-organized folder structure, so that my work is saved and easy to navigate.

#### Acceptance Criteria

1. WHEN a project is initialized THEN the system SHALL create the .personaut/{project-name} directory
2. WHEN a project is initialized THEN the system SHALL create a build-state.json file in the project directory
3. WHEN stage data is saved THEN the system SHALL write the data to .personaut/{project-name}/planning/{stage-name}.json
4. WHEN the webview is recreated (session invalid) THEN the system SHALL restore project state from disk files

### Requirement 5

**User Story:** As a user, I want my iteration data to be organized by iteration number, so that I can track the evolution of my project through feedback cycles.

#### Acceptance Criteria

1. WHEN an iteration begins THEN the system SHALL create the .personaut/{project-name}/iterations/{iteration-number}/ directory
2. WHEN user feedback is collected THEN the system SHALL save raw feedback to .personaut/{project-name}/iterations/{iteration-number}/feedback.json
3. WHEN feedback is consolidated THEN the system SHALL save the consolidated feedback to .personaut/{project-name}/iterations/{iteration-number}/consolidated-feedback.md
4. WHEN a page screenshot is captured THEN the system SHALL save the screenshot to .personaut/{project-name}/iterations/{iteration-number}/{page-name}.png
5. WHEN loading iteration data THEN the system SHALL read from the appropriate iteration directory based on iteration number

### Requirement 6

**User Story:** As a user, I want my in-progress project data to be cached during the active session, so that I don't lose my work when switching views.

#### Acceptance Criteria

1. WHILE the webview session is active THEN the system SHALL preserve project title, project name, and build data in session state
2. WHEN the user switches between views (chat, feedback, build) THEN the system SHALL maintain the build mode state
3. WHEN the user navigates away from the idea step THEN the system SHALL preserve the entered project title and idea
4. IF the session becomes invalid THEN the system SHALL attempt to restore state from persisted files
5. WHEN session state is restored THEN the system SHALL NOT reset project-related fields (projectName, projectTitle, buildData)

### Requirement 7

**User Story:** As a user with existing projects, I want my old project data to be migrated to the new folder structure, so that I can continue using my projects without data loss.

#### Acceptance Criteria

1. WHEN the system detects an existing project with old file structure THEN the system SHALL migrate files to the new planning/ subdirectory
2. WHEN migration begins THEN the system SHALL create a backup of the original files before moving
3. IF migration fails THEN the system SHALL restore from backup and log the error
4. WHEN migration completes successfully THEN the system SHALL update build-state.json paths to reflect new locations
5. WHEN reading stage files THEN the system SHALL check new location first, then fall back to old location for unmigrated projects

### Requirement 8

**User Story:** As a user, I want to generate personas from demographics that integrate with the existing persona system, so that I get fully-featured personas with backstories and tags.

#### Acceptance Criteria

1. WHEN the user enters demographics and clicks generate THEN the system SHALL create 5 unique persona configurations with randomly selected demographic attributes
2. WHEN persona configurations are created THEN the system SHALL use the PersonasService to generate backstories for each persona
3. WHEN personas are generated THEN the system SHALL display name, age, occupation, backstory, and attribute tags for each persona
4. WHEN the user edits a persona field THEN the system SHALL update that persona in the generated personas list
5. WHEN the user clicks regenerate on an individual persona THEN the system SHALL regenerate only that persona's backstory using PersonasService
6. WHEN the user clicks "Reset & Regenerate" THEN the system SHALL clear all generated personas and allow starting over
7. WHEN the user saves generated personas THEN the system SHALL persist them to the users stage file in the proper Persona format

### Requirement 9

**User Story:** As a developer, I want an end-to-end integration test for the build flow, so that I can verify the complete user journey works correctly.

#### Acceptance Criteria

1. WHEN running integration tests THEN the system SHALL test the complete flow from project creation to state restoration
2. WHEN testing project creation THEN the system SHALL verify the .personaut folder and all required files are created
3. WHEN testing state restoration THEN the system SHALL verify project data is correctly loaded after session invalidation
4. WHEN testing iteration data THEN the system SHALL verify feedback, consolidated feedback, and screenshots are saved and loaded correctly
