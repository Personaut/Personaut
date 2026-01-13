# STEERING FOR BUILD MODE

**Comprehensive Guide to Personaut Build Feature Architecture**

---

## Table of Contents

1. [Overview](#overview)
2. [Build Stages](#build-stages)
3. [Workflow Architecture](#workflow-architecture)
4. [Agent System](#agent-system)
5. [Iteration Cycle](#iteration-cycle)
6. [File Structure](#file-structure)
7. [Data Flow](#data-flow)
8. [Key Services](#key-services)
9. [Error Handling](#error-handling)
10. [Debugging Guide](#debugging-guide)

---

## Overview

The **Build Mode** is a multi-agent system that orchestrates the complete process of building a web application from user requirements to working code. It uses specialized AI agents to design, develop, review, and iterate on pages until they meet user expectations.

### Core Concept

```
User Requirements → Design → Development → Review → Consolidation → User Decision → Iterate/Next Page
```

### Key Features

- **Multi-Agent Orchestration**: Specialized agents for design, development, and review
- **Iterative Development**: Continuous refinement based on persona feedback
- **Parallel Processing**: Concurrent persona reviews for faster iteration
- **Framework Support**: React, Next.js, Vue, Flutter, HTML/CSS/JS
- **Screenshot Verification**: Visual validation of generated pages
- **Persona-Based Feedback**: Multiple user perspectives for comprehensive review

---

## Build Stages

The build process consists of **7 sequential stages**:

### 1. **Idea Stage**
- **Purpose**: Define the core application concept
- **User Input**: Application name, description, purpose
- **Output**: Project metadata
- **File**: `idea.json`

### 2. **Team Stage**
- **Purpose**: Define the development workflow
- **User Input**: Development iteration flow configuration
- **Output**: Team structure and workflow
- **File**: `team.json`

### 3. **Users Stage**
- **Purpose**: Define target user personas
- **User Input**: Demographics, user types
- **Agent**: `ResearchAgent`
- **Output**: Generated personas with backstories
- **File**: `users.json`

### 4. **Features Stage**
- **Purpose**: Define application features
- **User Input**: Feature descriptions
- **Agent**: `DesignerAgent`
- **Output**: Feature specifications with user stories
- **File**: `features.json`

### 5. **Stories Stage**
- **Purpose**: Break down features into user stories
- **User Input**: Review and refine stories
- **Output**: Detailed user stories
- **File**: `stories.json`

### 6. **Design Stage**
- **Purpose**: Design page layouts and user flows
- **User Input**: Page definitions, user flows
- **Agent**: `DesignerAgent`
- **Output**: Screen designs, user flows
- **File**: `design.json`

### 7. **Building Stage** ⭐ (Main Build Workflow)
- **Purpose**: Build, review, and iterate on pages
- **Agents**: `DesignerAgent`, `DeveloperAgent`, `ReviewerAgent`, `SummarizerAgent`
- **Output**: Working application code
- **File**: `building.json`

---

## Workflow Architecture

### Main Orchestrator: `BuildWorkflowOrchestrator`

**Location**: `src/features/build-mode/services/BuildWorkflowOrchestrator.ts`

**Responsibilities**:
1. Orchestrate the complete build workflow across all pages
2. Manage sequential page processing
3. Coordinate Design → Development → Review → Consolidation cycle
4. Handle framework initialization (first page only)
5. Manage workflow state and checkpoints
6. Handle user decisions (iterate/move to next page)

### Workflow Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   BuildWorkflowOrchestrator                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Framework Initialization (First Page Only)      │
│  - Create React/Next.js/Vue project                         │
│  - Install dependencies                                      │
│  - Set up project structure                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Process Pages Sequentially                │
│  For each page:                                              │
│    1. Design Phase                                           │
│    2. Development Phase                                      │
│    3. Review Phase                                           │
│    4. Consolidation Phase                                    │
│    5. User Decision                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent System

### Agent Hierarchy

```
BaseAgent (Abstract)
├── ChatAgent
│   ├── PersonaAgent
│   └── AssistantAgent
├── DesignerAgent
├── DeveloperAgent
├── ResearchAgent
├── ReviewerAgent
└── SummarizerAgent
```

### Specialized Build Agents

#### 1. **DesignerAgent**

**Purpose**: Generate UX specifications and design documentation

**Capabilities**:
- UX/UI design
- User flow creation
- Screen layout design
- Design system creation

**Used In**: Design Phase

**Input**:
- Page description
- User stories
- User flows
- Framework

**Output**:
- Detailed UX specification (Markdown)
- Component breakdown
- Layout structure
- Interaction patterns

**System Prompt**: `src/core/prompts/DesignPrompts.ts`

---

#### 2. **DeveloperAgent**

**Purpose**: Generate production-ready code

**Capabilities**:
- Framework-specific code generation
- Component implementation
- Best practices enforcement
- Code structure

**Used In**: Development Phase

**Input**:
- UX specification
- Framework
- Project path

**Output**:
- Complete React/Vue/etc. component code
- Imports and dependencies
- Styling (CSS/Tailwind)
- State management

**Key Method**: `generateCode(spec: string): Promise<string>`

**System Prompt**: `src/core/prompts/CodePrompts.ts`

**Code Generation Flow**:
```typescript
1. Receive UX spec
2. Build comprehensive prompt
3. Call LLM via chat()
4. Extract code from messageHistory
5. Return generated code
```

---

#### 3. **ReviewerAgent (PersonaAgent)**

**Purpose**: Provide persona-based feedback on implementations

**Capabilities**:
- Visual design review
- UX evaluation
- Persona-specific feedback
- Rating (1-10)

**Used In**: Review Phase

**Input**:
- Screenshot of implementation
- Page description
- User flow context
- Persona backstory

**Output**:
- Detailed feedback text
- Rating (1-10)
- Specific suggestions

**System Prompt**: Dynamically generated with persona backstory

**Review Prompt Structure**:
```
You are [Persona Name], a [Persona Role].

Backstory: [Persona backstory]

Look at the screenshot and provide feedback on:
- Visual design
- Usability
- Alignment with user needs
- Specific improvements

Rate the implementation from 1-10.
```

---

#### 4. **SummarizerAgent**

**Purpose**: Consolidate feedback from multiple personas

**Capabilities**:
- Feedback synthesis
- Theme identification
- Actionable recommendations
- Average rating calculation

**Used In**: Consolidation Phase

**Input**:
- Array of persona feedback
- Individual ratings

**Output**:
- Consolidated feedback (Markdown)
- Common themes
- Strengths and concerns
- Actionable recommendations
- Average rating

**System Prompt**: `src/core/prompts/FeedbackPrompts.ts`

---

## Iteration Cycle

### Complete Iteration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        ITERATION START                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      1. DESIGN PHASE                         │
│  Agent: DesignerAgent                                        │
│  Input: Page description, user stories, user flows           │
│  Process:                                                    │
│    - Create conversation ID: designer-{project}-{page}-iter{n}│
│    - Generate UX specification                               │
│    - Save to: .personaut/iterations/{pageId}/iteration_{n}/ux-spec.md│
│  Output: UX Specification (Markdown)                         │
│  Duration: ~30-60 seconds                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   2. DEVELOPMENT PHASE                       │
│  Agent: DeveloperAgent                                       │
│  Input: UX specification, framework                          │
│  Process:                                                    │
│    - Create conversation ID: developer-{project}-{page}-iter{n}│
│    - Generate code via generateCode()                        │
│    - Save to: .personaut/iterations/{pageId}/iteration_{n}/code.txt│
│    - Write to project: src/pages/{PageName}.tsx              │
│    - Start dev server (if not running)                       │
│    - Wait for server ready                                   │
│    - Capture screenshot via Puppeteer                        │
│    - Save to: .personaut/iterations/{pageId}/iteration_{n}/screenshot.png│
│  Output: Code + Screenshot                                   │
│  Duration: ~60-90 seconds                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     3. REVIEW PHASE                          │
│  Agent: ReviewerAgent (PersonaAgent) - Parallel Execution    │
│  Input: Screenshot, page context, persona backstory          │
│  Process:                                                    │
│    - For each persona (in parallel batches):                 │
│      * Create conversation ID: persona-{personaId}-{page}-iter{n}│
│      * Send screenshot as image to chat()                    │
│      * Retrieve feedback from conversation                   │
│      * Parse rating from feedback text                       │
│      * Save to: .personaut/iterations/{pageId}/iteration_{n}/feedback_{personaId}.json│
│  Output: Array of persona feedback                           │
│  Duration: ~20-40 seconds (parallel)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  4. CONSOLIDATION PHASE                      │
│  Agent: SummarizerAgent                                      │
│  Input: Array of persona feedback                            │
│  Process:                                                    │
│    - Create conversation ID: summarizer-consolidation-{timestamp}│
│    - Consolidate feedback                                    │
│    - Calculate average rating                                │
│    - Save to: .personaut/iterations/{pageId}/iteration_{n}/feedback_consolidated.md│
│  Output: Consolidated feedback + average rating              │
│  Duration: ~20-30 seconds                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     5. USER DECISION                         │
│  UI: Webview displays iteration summary                      │
│  Options:                                                    │
│    - Iterate Again: Run another iteration on same page       │
│    - Move to Next Page: Accept and move to next page         │
│    - Cancel: Stop the build                                  │
│  Timeout: 5 minutes (configurable)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
            Iterate Again    Move to Next Page
                    │               │
                    │               └──────────────┐
                    └──────────────┐               │
                                   ▼               ▼
                            Next Iteration    Next Page
```

---

## File Structure

### Project Structure

```
project-root/
├── .personaut/
│   ├── iterations/
│   │   ├── {pageId}/
│   │   │   ├── iteration_1/
│   │   │   │   ├── ux-spec.md
│   │   │   │   ├── code.txt
│   │   │   │   ├── screenshot.png
│   │   │   │   ├── feedback_{personaId}.json
│   │   │   │   ├── feedback_consolidated.md
│   │   │   │   └── plan.json
│   │   │   ├── iteration_2/
│   │   │   └── ...
│   │   └── {anotherPageId}/
│   ├── planning/
│   │   ├── idea.json
│   │   ├── team.json
│   │   ├── users.json
│   │   ├── features.json
│   │   ├── stories.json
│   │   ├── design.json
│   │   └── building.json
│   └── build-log.json
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ProductPage.tsx
│   │   └── ...
│   ├── components/
│   ├── styles/
│   └── App.tsx
├── package.json
└── ...
```

### Iteration Plan Structure

**File**: `.personaut/iterations/{pageId}/iteration_{n}/plan.json`

```json
{
  "pageId": "homePage",
  "pageName": "Home Page",
  "iteration": 1,
  "status": "completed",
  "createdAt": "2026-01-09T15:16:52.370Z",
  "updatedAt": "2026-01-09T15:17:57.935Z",
  "steps": [
    {
      "id": "design",
      "name": "Design Phase",
      "status": "completed",
      "startedAt": "2026-01-09T15:16:52.371Z",
      "completedAt": "2026-01-09T15:17:30.046Z",
      "artifacts": {
        "uxSpec": "ux-spec.md"
      },
      "error": null
    },
    {
      "id": "development",
      "name": "Development Phase",
      "status": "completed",
      "startedAt": "2026-01-09T15:17:30.047Z",
      "completedAt": "2026-01-09T15:17:35.829Z",
      "artifacts": {
        "code": "code.txt",
        "screenshot": "screenshot.png"
      },
      "error": null
    },
    {
      "id": "review",
      "name": "Review Phase",
      "status": "completed",
      "startedAt": "2026-01-09T15:17:35.829Z",
      "completedAt": "2026-01-09T15:17:45.978Z",
      "artifacts": {
        "feedbackFiles": ["feedback_{personaId}.json"]
      },
      "error": null,
      "progress": {
        "total": 3,
        "completed": 3,
        "failed": 0
      }
    },
    {
      "id": "consolidation",
      "name": "Consolidation Phase",
      "status": "completed",
      "startedAt": "2026-01-09T15:17:45.980Z",
      "completedAt": "2026-01-09T15:17:57.931Z",
      "artifacts": {
        "consolidated": "feedback_consolidated.md",
        "averageRating": 7.5
      },
      "error": null
    },
    {
      "id": "save-feedback",
      "name": "Save Feedback",
      "status": "completed",
      "startedAt": "2026-01-09T15:17:57.933Z",
      "completedAt": "2026-01-09T15:17:57.935Z",
      "artifacts": {},
      "error": null
    }
  ]
}
```

---

## Data Flow

### Message Flow Between Components

```
┌──────────────────────────────────────────────────────────────┐
│                         WEBVIEW (UI)                          │
│  - User interactions                                          │
│  - Display iteration results                                  │
│  - Request user decisions                                     │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Messages (vscode.postMessage)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    BuildModeHandler                           │
│  - Receives webview messages                                  │
│  - Routes to appropriate handlers                             │
│  - Sends responses back to webview                            │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Delegates to
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              WorkflowOrchestratorHandler                      │
│  - Manages workflow lifecycle                                 │
│  - Creates BuildWorkflowOrchestrator                          │
│  - Handles user decisions                                     │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Orchestrates
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              BuildWorkflowOrchestrator                        │
│  - Executes iteration cycle                                   │
│  - Manages agent lifecycle                                    │
│  - Coordinates phases                                         │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Uses
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                      AgentManager                             │
│  - Creates specialized agents                                 │
│  - Manages agent lifecycle                                    │
│  - Handles conversation persistence                           │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Creates
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Specialized Agents                               │
│  - DesignerAgent                                              │
│  - DeveloperAgent                                             │
│  - ReviewerAgent                                              │
│  - SummarizerAgent                                            │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Calls
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    LLM Provider                               │
│  - GeminiProvider                                             │
│  - BedrockProvider                                            │
│  - NativeIDEProvider                                          │
└──────────────────────────────────────────────────────────────┘
```

### Agent Communication Pattern

```
Agent.chat(prompt, contextFiles, settings, systemInstruction, isPersonaChat, images)
    │
    ├─> Add user message to messageHistory
    │
    ├─> Call onDidUpdateMessages(messageHistory)  [Saves to disk]
    │
    ├─> ensureInitialized()  [Initialize provider]
    │
    ├─> runLoop(settings)
    │   │
    │   ├─> buildSystemPrompt()
    │   │
    │   ├─> provider.chat(messageHistory, systemPrompt)
    │   │   │
    │   │   └─> LLM API Call
    │   │
    │   ├─> Add model response to messageHistory
    │   │
    │   ├─> Call onDidUpdateMessages(messageHistory)  [Saves to disk]
    │   │
    │   └─> handleToolCalls(responseText, settings)
    │
    └─> Return (Promise<void>)

After chat() completes:
    - messageHistory contains both user and model messages
    - Conversation is persisted to disk
    - Can access last model message via messageHistory[messageHistory.length - 1]
```

---

## Key Services

### 1. **WorkflowStateManager**

**Purpose**: Manage workflow state and checkpoints

**Location**: `src/features/build-mode/services/WorkflowStateManager.ts`

**Responsibilities**:
- Track current page and iteration
- Save/load workflow state
- Create checkpoints for recovery
- Manage workflow status

### 2. **ParallelReviewerExecutor**

**Purpose**: Execute persona reviews in parallel batches

**Location**: `src/features/build-mode/services/ParallelReviewerExecutor.ts`

**Features**:
- Batch processing (default: 3 concurrent reviews)
- Error handling per persona
- Progress tracking
- Result aggregation

**Execution Flow**:
```typescript
1. Split personas into batches
2. For each batch:
   - Execute reviews in parallel
   - Wait for all to complete
   - Collect results
3. Aggregate all results
4. Return combined feedback array
```

### 3. **DevServerManager**

**Purpose**: Manage development server lifecycle

**Location**: `src/features/build-mode/services/DevServerManager.ts`

**Features**:
- Start dev server (React/Next.js/Vue)
- Wait for server ready
- Monitor server health
- Stop server on cleanup

**Server Detection**:
```typescript
- Watches stdout for "compiled successfully" or "ready"
- Polls localhost:3000 for HTTP 200
- Timeout: 60 seconds
```

### 4. **ScreenshotService**

**Purpose**: Capture screenshots using Puppeteer

**Location**: `src/features/build-mode/services/ScreenshotService.ts`

**Features**:
- Launch headless browser
- Navigate to URL
- Wait for page load
- Capture screenshot
- Save to file

**Configuration**:
```typescript
- Viewport: 1280x720
- Format: PNG
- Timeout: 30 seconds
```

### 5. **IterationPlan**

**Purpose**: Track iteration progress and artifacts

**Location**: `src/features/build-mode/services/IterationPlan.ts`

**Features**:
- Step tracking (design, development, review, consolidation)
- Status management (pending, in-progress, completed, failed)
- Artifact tracking
- Error logging
- Persistence to disk

---

## Error Handling

### Error Recovery Strategies

#### 1. **Agent Creation Failures**
```typescript
try {
    agent = await agentManager.createDeveloperAgent(...);
} catch (error) {
    console.error('[BuildWorkflowOrchestrator] Agent creation failed:', error);
    // Mark step as failed
    // Continue to next step or abort
}
```

#### 2. **LLM API Failures**
```typescript
try {
    await agent.chat(prompt);
} catch (error) {
    console.error('[Agent] Chat error:', error);
    // Retry logic (up to 3 times)
    // Fallback to default response
    // Mark step as failed
}
```

#### 3. **File System Failures**
```typescript
try {
    await fs.writeFile(path, content);
} catch (error) {
    console.error('[BuildWorkflowOrchestrator] File write failed:', error);
    // Retry with different path
    // Create missing directories
    // Log error and continue
}
```

#### 4. **Dev Server Failures**
```typescript
try {
    await devServerManager.start();
} catch (error) {
    console.error('[DevServerManager] Server start failed:', error);
    // Kill existing processes on port
    // Retry with different port
    // Abort if still fails
}
```

#### 5. **Screenshot Failures**
```typescript
try {
    await screenshotService.capture(url);
} catch (error) {
    console.error('[ScreenshotService] Screenshot failed:', error);
    // Retry navigation
    // Use default screenshot
    // Continue without screenshot
}
```

---

## Debugging Guide

### Console Log Patterns

#### Design Phase
```
[BuildWorkflowOrchestrator] ✏️ Starting design phase...
[BuildWorkflowOrchestrator] ✏️ Creating UX specification for {pageName} (Iteration {n})...
[AgentManager] Creating new agent: { conversationId, agentType: 'designer' }
[Personaut] Core tools initialized: Array(5)
[AgentManager] Agent created successfully
[Agent] chat called with settings: Object
[Agent] Message added to history: { conversationId, totalMessages, imageCount }
[GeminiProvider] chat called with: { historyLength, systemPromptLength }
[GeminiProvider] Sending to API: { contentsCount, hasSystemPrompt }
[GeminiProvider] Making API call to: https://aiplatform.googleapis.com/...
[GeminiProvider] API response status: 200
[GeminiProvider] Extracted text length: 15741
[BuildWorkflowOrchestrator] UX spec saved: .personaut/iterations/{pageId}/iteration_{n}/ux-spec.md
[BuildWorkflowOrchestrator] Design phase complete
```

#### Development Phase
```
[BuildWorkflowOrchestrator] 💻 Starting development phase...
[BuildWorkflowOrchestrator] 💻 Implementing code for {pageName} (Iteration {n})...
[DeveloperAgent] generateCode called
[DeveloperAgent] Spec length: 15741
[DeveloperAgent] Sending chat...
[developer] chat called with settings: Object
[developer] runLoop called
[developer] Abort controller: { exists: true, aborted: false }
[developer] System prompt length: 5432
[GeminiProvider] Making API call...
[GeminiProvider] API response status: 200
[GeminiProvider] Extracted text length: 5234
[DeveloperAgent] Chat completed
[DeveloperAgent] Code extracted: 5234 bytes
[DevelopmentPhase] Code received: { length: 5234, preview: 'import React...' }
[DevelopmentPhase] Writing code to: .personaut/iterations/{pageId}/iteration_{n}/code.txt
[DevelopmentPhase] Code written successfully
[DevelopmentPhase] Writing code to project: src/pages/{PageName}.tsx
[DevelopmentPhase] Project file written successfully
[DevServer] Starting react development server on port 3000...
[DevServer] ✅ Server ready on http://localhost:3000
[ScreenshotService] Navigating to http://localhost:3000/{pageName}
[ScreenshotService] Capturing screenshot
[BuildWorkflowOrchestrator] Screenshot saved
[BuildWorkflowOrchestrator] Development phase complete
```

#### Review Phase
```
[BuildWorkflowOrchestrator] 💬 Starting review phase...
[BuildWorkflowOrchestrator] 💬 Collecting feedback from {n} personas...
[ParallelReviewerExecutor] Starting parallel execution: { totalPersonas, batchSize }
[ParallelReviewerExecutor] Executing batch: { batchNumber, personaCount }
[ReviewPhase] Sending chat to {personaName}...
[Agent] chat called with settings: { hasImages: true }
[GeminiProvider] Making API call...
[ReviewPhase] Chat completed for {personaName}
[ReviewPhase] Retrieving conversation {conversationId}...
[ReviewPhase] Conversation retrieved: { exists: true, messageCount: 2 }
[ReviewPhase] Model messages: 1
[ReviewPhase] Last message: { exists: true, hasText: true, textLength: 523 }
[ReviewPhase] Feedback text length: 523
[ReviewPhase] Parsed rating: 8
[ParallelReviewerExecutor] Batch complete
[BuildWorkflowOrchestrator] Review phase complete
```

#### Consolidation Phase
```
[BuildWorkflowOrchestrator] 📊 Starting consolidation phase...
[BuildWorkflowOrchestrator] 📊 Consolidating feedback from {n} personas...
[GeminiProvider] Making API call...
[BuildWorkflowOrchestrator] Consolidation phase complete
[BuildWorkflowOrchestrator] Feedback saved
[BuildWorkflowOrchestrator] ✅ Iteration {n} complete! Rating: {rating}/10
```

### Common Issues and Solutions

#### Issue 1: Empty code.txt
**Symptoms**:
```
[DeveloperAgent] Code length: 0
[DeveloperAgent] No code generated!
```

**Causes**:
1. Abort controller aborted before LLM call
2. LLM response not captured
3. messageHistory not accessible

**Solution**:
- Check `[developer] runLoop called` log
- Check `[developer] Abort controller: { aborted: true/false }`
- Verify `[GeminiProvider] Making API call` appears
- Check `[DeveloperAgent] Code extracted` log

#### Issue 2: Placeholder feedback
**Symptoms**:
```
[ReviewPhase] Feedback text length: 22
feedback: "Feedback from {personaName}"
```

**Causes**:
1. Conversation not retrieved
2. No model messages in conversation
3. Feedback extraction failed

**Solution**:
- Check `[ReviewPhase] Conversation retrieved: { exists: true }`
- Check `[ReviewPhase] Model messages: 1` (should be > 0)
- Verify screenshot was passed as image

#### Issue 3: Screenshot shows default app
**Symptoms**:
- Screenshot exists but shows React logo

**Causes**:
1. Code not written to project
2. Dev server not reloaded
3. Wrong URL navigated

**Solution**:
- Check `[DevelopmentPhase] Project file written successfully`
- Verify `src/pages/{PageName}.tsx` exists
- Check dev server logs for compilation

#### Issue 4: Token count not increasing
**Symptoms**:
- No token usage updates
- LLM not being called

**Causes**:
1. runLoop() exiting early
2. Provider not initialized
3. API key missing

**Solution**:
- Check `[developer] runLoop called`
- Check `[developer] Abort signal detected` (should NOT appear)
- Verify `[GeminiProvider] Making API call` appears
- Check API key configuration

---

## Configuration

### Build Workflow Configuration

```typescript
interface BuildWorkflowConfig {
    projectName: string;           // Project name
    framework: string;             // 'react' | 'nextjs' | 'vue' | 'flutter' | 'html'
    pages: Array<{                 // Pages to build
        pageId: string;
        pageName: string;
        description: string;
    }>;
    personas: Array<{              // Personas for review
        personaId: string;
        personaName: string;
        personaRole: string;
    }>;
    maxIterationsPerPage: number;  // Max iterations per page (default: 5)
    baseDir: string;               // Project base directory
    webview?: any;                 // Optional webview for logging
    onLog?: (message: string, level?: 'info' | 'success' | 'error') => void;
}
```

### Agent Configuration

```typescript
// DesignerAgent
{
    conversationId: 'designer-{projectName}-{pageId}-iter{n}',
    mode: 'build',
    framework: 'react'
}

// DeveloperAgent
{
    conversationId: 'developer-{projectName}-{pageId}-iter{n}',
    mode: 'build',
    framework: 'react',
    projectPath: '/path/to/project'
}

// ReviewerAgent (PersonaAgent)
{
    conversationId: 'persona-{personaId}-{pageId}-iter{n}',
    mode: 'feedback',
    persona: {
        personaId: string,
        personaName: string,
        personaRole: string,
        backstory: string
    }
}

// SummarizerAgent
{
    conversationId: 'summarizer-consolidation-{timestamp}',
    mode: 'build'
}
```

---

## Performance Metrics

### Typical Iteration Timing

| Phase | Duration | Agent | LLM Calls |
|-------|----------|-------|-----------|
| Design | 30-60s | DesignerAgent | 1 |
| Development | 60-90s | DeveloperAgent | 1 |
| Review (3 personas) | 20-40s | ReviewerAgent x3 | 3 (parallel) |
| Consolidation | 20-30s | SummarizerAgent | 1 |
| **Total** | **2-4 minutes** | **5 agents** | **6 LLM calls** |

### Token Usage (Approximate)

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| Design | 2,000 | 3,000 | 5,000 |
| Development | 3,000 | 2,000 | 5,000 |
| Review (per persona) | 1,500 | 500 | 2,000 |
| Consolidation | 2,000 | 1,000 | 3,000 |
| **Per Iteration** | **~10,000** | **~7,500** | **~17,500** |

---

## Future Enhancements

### Planned Features

1. **Context Management**
   - Sliding window context across iterations
   - Context compression for long conversations
   - Relevant context retrieval

2. **Handoff Validation**
   - SHA-256 checksums for artifacts
   - Validation between phases
   - Integrity verification

3. **Advanced Iteration**
   - Targeted iteration (specific components)
   - Partial regeneration
   - Incremental updates

4. **Multi-Framework Support**
   - Next.js App Router
   - Vue 3 Composition API
   - Flutter widgets
   - Svelte components

5. **Enhanced Review**
   - Accessibility checks
   - Performance analysis
   - Security scanning
   - Code quality metrics

---

## Summary

The Build Mode is a sophisticated multi-agent system that orchestrates the complete application development lifecycle. It leverages specialized AI agents for design, development, and review, with parallel processing for efficiency and iterative refinement for quality.

**Key Takeaways**:
- ✅ Multi-agent orchestration with specialized roles
- ✅ Iterative development with persona-based feedback
- ✅ Parallel processing for faster reviews
- ✅ Comprehensive state management and recovery
- ✅ Framework-agnostic architecture
- ✅ Visual verification via screenshots
- ✅ Detailed logging for debugging

**For Developers**:
- Start with `BuildWorkflowOrchestrator.ts` to understand the flow
- Review agent implementations in `src/core/agent/build/`
- Check console logs for debugging
- Use iteration plans for state tracking
- Leverage parallel execution for performance

**For Users**:
- Define clear page descriptions
- Create diverse personas for comprehensive feedback
- Review iteration results carefully
- Iterate until satisfied with quality
- Monitor progress in the webview UI

---

**Last Updated**: 2026-01-10  
**Version**: 0.1.5  
**Status**: Production
