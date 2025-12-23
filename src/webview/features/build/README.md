# Build Feature

The Build feature provides a multi-stage wizard for creating new projects through AI-assisted development.

## Overview

The build mode guides users through the following stages:

1. **Idea** - Define project name and description
2. **Team** - View the development iteration flow
3. **Users** - Define target demographics and generate personas
4. **Features** - Conduct persona interviews to discover features
5. **Stories** - Generate user stories with requirements
6. **Design** - Select framework, generate user flows and screens
7. **Build** - Execute the build with iteration tracking

## Directory Structure

```
features/build/
├── components/           # Reusable UI components
│   ├── BuildLayout.tsx       # Main layout with progress header
│   ├── BuildLogsPanel.tsx    # Collapsible build logs
│   ├── StageProgress.tsx     # Stage navigation header
│   ├── FeatureCard.tsx       # Feature display card
│   ├── UserStoryCard.tsx     # Story display card
│   ├── PersonaCard.tsx       # Persona display card
│   ├── FrameworkSelector.tsx # Framework selection grid
│   ├── UserFlowDisplay.tsx   # User flow visualization
│   ├── ScreenCard.tsx        # Screen preview card
│   └── IterationControls.tsx # Build start/stop controls
├── hooks/                # Custom React hooks
│   ├── useBuildState.ts      # Complete state management
│   ├── useBuildActions.ts    # Extension communication
│   └── useBuildPersistence.ts# Debounced file saving
├── stages/               # Stage components
│   ├── IdeaStage.tsx         # Project definition
│   ├── TeamStage.tsx         # Development flow display
│   ├── UsersStage.tsx        # Demographics & personas
│   ├── FeaturesStage.tsx     # Feature discovery
│   ├── StoriesStage.tsx      # User story generation
│   ├── DesignStage.tsx       # UX design & screens
│   └── BuildStage.tsx        # Build execution
├── types/                # TypeScript definitions
│   └── index.ts              # All build types
├── utils/                # Utility functions
│   └── stageFiles.ts         # Stage file utilities
└── index.ts              # Feature exports
```

## Usage

### Basic Usage

```tsx
import { BuildLayout, StageProgress, useBuildState } from '@/features/build';

function BuildView() {
  const {
    currentStage,
    completedStages,
    setCurrentStage,
    projectName,
    setProjectName,
  } = useBuildState();

  return (
    <BuildLayout
      currentStage={currentStage}
      completedStages={completedStages}
      onStageClick={setCurrentStage}
    >
      {currentStage === 'idea' && (
        <IdeaStage
          projectName={projectName}
          onProjectNameChange={setProjectName}
          onNext={() => setCurrentStage('team')}
        />
      )}
      {/* ... other stages */}
    </BuildLayout>
  );
}
```

### Using Persistence

```tsx
import { useBuildPersistence } from '@/features/build';

function UsersStage() {
  const { saveStageData, saveStageDataImmediate } = useBuildPersistence();

  // Debounced save on changes (500ms delay)
  const handleDemographicsChange = (demographics) => {
    setDemographics(demographics);
    saveStageData('users', { demographics });
  };

  // Immediate save on stage completion
  const handleComplete = () => {
    saveStageDataImmediate('users', { demographics, personas });
    goToNextStage();
  };
}
```

## Types

### BuildStage

```typescript
type BuildStage = 'idea' | 'team' | 'users' | 'features' | 'stories' | 'design' | 'build';
```

### Key Interfaces

- `BuildState` - Complete application state
- `GeneratedPersona` - AI-generated persona
- `GeneratedFeature` - Feature from interviews
- `UserStory` - Story with requirements
- `UserFlow` - UX flow with steps
- `Screen` - Screen design

## Stage Data Persistence

Each stage saves its data to a JSON file in the project directory:

- `idea.json` - Project name and description
- `users.json` - Demographics and generated personas
- `features.json` - Generated features and survey responses
- `stories.json` - User stories with requirements
- `design.json` - User flows, screens, and framework

## Screenshots

[Build Mode Overview](./screenshots/build-overview.png)
[Stage Progress](./screenshots/stage-progress.png)
[Features Stage](./screenshots/features-stage.png)

## Requirements

- **Requirements 13.2** - Build mode UI components
- **Requirements 15.1-15.7** - Stage-specific functionality
- **Requirements 32.1-32.3** - Stage progress display
- **Requirements 35.1-35.4** - Stage data persistence
- **Requirements 36.1-36.3** - Stage navigation
- **Requirements 37.1-37.4** - Save/load operations
