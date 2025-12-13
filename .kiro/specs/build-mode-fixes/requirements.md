# Requirements Document

## Introduction

This document specifies the requirements for fixing critical bugs in the Build Mode feature of the Personaut VS Code extension. The Build Mode feature allows users to create projects with a multi-stage workflow (idea, users, features, team, stories, design, building). Currently, there are several critical issues:

1. Message type mismatches between backend handlers and webview frontend prevent proper communication
2. The "Checking" state hangs indefinitely due to message type mismatches
3. Project state does not persist correctly
4. Agent/AI content generation is not implemented (handleGenerateContent is a stub)
5. Demographics-based persona generation does not integrate with PersonasService
6. Stage data saving may not complete properly in all scenarios

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
- **VoltAgent**: An agent coordination system that orchestrates multi-agent workflows, managing agent creation, communication, and state transitions
- **MCP Server**: Model Context Protocol server that provides external capabilities to agents
- **Web Search MCP**: An MCP server that provides web search capabilities to agents for research and information gathering

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

**User Story:** As a user, I want AI-powered content generation to work for all build stages, so that I can generate personas, features, and stories automatically.

#### Acceptance Criteria

1. WHEN the user requests content generation THEN the system SHALL invoke the AgentManager to generate content using AI
2. WHEN content is being generated THEN the system SHALL stream updates to the webview in real-time
3. WHEN generation completes successfully THEN the system SHALL save the generated content to the stage file
4. WHEN generation fails THEN the system SHALL save partial content and mark the stage with an error
5. WHEN the user retries generation THEN the system SHALL resume from partial content if available

### Requirement 9

**User Story:** As a user, I want to generate personas from demographics that integrate with the existing persona system, so that I get fully-featured personas with backstories and tags.

#### Acceptance Criteria

1. WHEN the user enters demographics and clicks generate THEN the system SHALL create 5 unique persona configurations with randomly selected demographic attributes
2. WHEN persona configurations are created THEN the system SHALL use the PersonasService to generate backstories for each persona
3. WHEN personas are generated THEN the system SHALL display name, age, occupation, backstory, and attribute tags for each persona
4. WHEN the user edits a persona field THEN the system SHALL update that persona in the generated personas list
5. WHEN the user clicks regenerate on an individual persona THEN the system SHALL regenerate only that persona's backstory using PersonasService
6. WHEN the user clicks "Reset & Regenerate" THEN the system SHALL clear all generated personas and allow starting over
7. WHEN the user saves generated personas THEN the system SHALL persist them to the users stage file in the proper Persona format

### Requirement 10

**User Story:** As a user, I want to generate features by surveying AI personas about what features would make them use the product, so that I get data-driven feature prioritization.

#### Acceptance Criteria

1. WHEN the user selects "Generate from User Interviews" mode THEN the system SHALL use VoltAgent to coordinate the creation of AI agents for each generated persona
2. WHEN persona agents are created THEN VoltAgent SHALL orchestrate surveying each persona asking what features they would want and how they would rate the idea with and without each feature
3. WHEN all persona surveys are complete THEN VoltAgent SHALL coordinate invoking a consolidator agent to analyze all feedback
4. WHEN the consolidator agent completes THEN the system SHALL generate a feature list with name, description, rating, frequency, priority, and associated personas
5. WHEN features are generated THEN the system SHALL display them in an editable list with all fields editable by the user
6. WHEN the user clicks regenerate on an individual feature THEN the system SHALL regenerate only that feature using the consolidator agent
7. WHEN the user saves generated features THEN the system SHALL persist them to the features stage file with all survey data and consolidated analysis
8. WHEN VoltAgent coordinates the workflow THEN the system SHALL track workflow state and allow resumption if interrupted

### Requirement 11

**User Story:** As a user, I want VoltAgent to coordinate research agents that search the web for competitive products, market trends, and validation data, so that my project is informed by real-world information.

#### Acceptance Criteria

1. WHEN the user is on the idea stage THEN the system SHALL offer a "Research Idea" option that uses VoltAgent to coordinate research
2. WHEN research is initiated THEN VoltAgent SHALL create a research workflow with specialized research agents
3. WHEN research agents are created THEN they SHALL have access to the Web Search MCP server for searching the web
4. WHEN research agents search THEN they SHALL gather information about competitive products, market size, target users, and similar solutions
5. WHEN all research is complete THEN VoltAgent SHALL coordinate a synthesis agent to consolidate findings into a research report
6. WHEN the research report is generated THEN the system SHALL display it with sections for competitive analysis, market validation, and recommendations
7. WHEN research is saved THEN the system SHALL persist the report and all search results to the project files
8. WHEN the user reviews research THEN the system SHALL display all web sources with links for verification

### Requirement 12

**User Story:** As a user, I want a standardized team workflow (UX → Developer → User Feedback) coordinated by VoltAgent, so that features are built iteratively with proper design, implementation, and validation.

#### Acceptance Criteria

1. WHEN the team stage is initialized THEN the system SHALL set the standard team as UX, Developer, and User Feedback (non-editable)
2. WHEN the building stage begins THEN VoltAgent SHALL coordinate a serial workflow: UX agent → Developer agent → User Feedback agents (parallel)
3. WHEN the UX agent executes THEN the agent SHALL write design requirements and specifications for the Developer agent based on user stories
4. WHEN the Developer agent executes THEN the agent SHALL implement the feature, spin up a dev server, and capture a screenshot of the result
5. WHEN the screenshot is captured THEN the system SHALL provide it to the User Feedback agents and UX agent for review
6. WHEN User Feedback agents execute THEN they SHALL run in parallel (one per persona) and provide feedback based on the screenshot
7. WHEN all User Feedback is collected THEN the system SHALL aggregate feedback and make it available to the UX agent for the next iteration
8. WHEN an iteration completes THEN VoltAgent SHALL coordinate the next iteration starting with the UX agent reviewing feedback
9. WHEN the user wants to pause THEN the system SHALL save workflow state and allow resumption later

### Requirement 13

**User Story:** As a user, I want a UX agent to generate user stories based on features and user feedback, so that I have clear, actionable stories for development.

#### Acceptance Criteria

1. WHEN the stories stage begins THEN the system SHALL invoke a UX agent to generate user stories based on features and user personas
2. WHEN generating user stories THEN the agent SHALL consider feature requirements, persona needs, and user feedback patterns
3. WHEN user stories are generated THEN each story SHALL include title, description, acceptance criteria, and clarifying questions
4. WHEN user stories are displayed THEN the user SHALL be able to edit any field (title, description, criteria, questions)
5. WHEN the user clicks regenerate on a story THEN the system SHALL regenerate only that story using the UX agent
6. WHEN the user adds a clarifying question answer THEN the system SHALL save it with the story
7. WHEN user stories are saved THEN the system SHALL persist them to the stories stage file

### Requirement 14

**User Story:** As a user, I want a UX agent to generate a comprehensive design with pages, user flows, and UI elements, so that I have a complete blueprint for development.

#### Acceptance Criteria

1. WHEN the design stage begins THEN the system SHALL invoke a UX agent to generate user flows and page designs based on user stories
2. WHEN generating user flows THEN the agent SHALL create flows showing how users navigate through the application to complete each user story
3. WHEN generating pages THEN the agent SHALL define each unique page/screen with purpose, UI elements, and user actions
4. WHEN pages are generated THEN each page SHALL include name, purpose, UI elements list, and user actions list
5. WHEN the design is displayed THEN the user SHALL see user flows with page navigation and detailed page specifications
6. WHEN the user edits a page THEN the system SHALL update that page's details (purpose, UI elements, user actions)
7. WHEN the user clicks "Generate Flows" THEN the system SHALL regenerate user flows based on current user stories
8. WHEN the design is saved THEN the system SHALL persist user flows and pages to the design stage file
9. WHEN the design includes framework selection THEN the system SHALL save the selected framework (React, Vue, Next.js, HTML, Flutter) for the building stage

### Requirement 15

**User Story:** As a developer, I want an end-to-end integration test for the build flow, so that I can verify the complete user journey works correctly.

#### Acceptance Criteria

1. WHEN running integration tests THEN the system SHALL test the complete flow from project creation to state restoration
2. WHEN testing project creation THEN the system SHALL verify the .personaut folder and all required files are created
3. WHEN testing state restoration THEN the system SHALL verify project data is correctly loaded from disk
4. WHEN testing iteration data THEN the system SHALL verify feedback, consolidated feedback, and screenshots are saved and loaded correctly
5. WHEN testing feature generation THEN the system SHALL verify persona surveys and consolidation produce valid feature data
6. WHEN testing web search integration THEN the system SHALL verify agents can access and use the Web Search MCP server
7. WHEN testing building workflow THEN the system SHALL verify VoltAgent coordinates UX → Developer → User Feedback flow with screenshot capture
8. WHEN testing stories generation THEN the system SHALL verify UX agent generates user stories from features and personas
9. WHEN testing design generation THEN the system SHALL verify UX agent generates user flows and page designs from user stories
