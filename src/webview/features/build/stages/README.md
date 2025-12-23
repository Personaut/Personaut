# Build Stages

This directory contains the stage components for the Build mode wizard.

## Stages Overview

### 1. IdeaStage

The initial stage where users define their project:
- Project name with validation
- Project description/idea
- Project history selection

**File:** `IdeaStage.tsx`

### 2. TeamStage

Displays the development iteration flow:
- UX Agent → Developer Agent → User Feedback
- Read-only display of the workflow

**File:** `TeamStage.tsx`

### 3. UsersStage

Define target users and generate personas:
- Demographics input (age, income, gender, location, education, occupation)
- AI-powered persona generation
- Persona cards with backstories

**File:** `UsersStage.tsx`

### 4. FeaturesStage

Discover features through persona interviews:
- Conduct AI interviews with personas
- Display discovered features with scores
- Priority badges (high/medium/low)

**File:** `FeaturesStage.tsx`

### 5. StoriesStage

Generate user stories from features:
- Story cards with title and description
- Requirements list
- Acceptance criteria
- Clarifying questions

**File:** `StoriesStage.tsx`

### 6. DesignStage

Create UX designs:
- Framework selection (React, Next.js, Vue, Flutter, HTML)
- User flow generation
- Screen design generation

**File:** `DesignStage.tsx`

### 7. BuildStage

Execute the build:
- Build configuration summary
- Progress tracking
- Start/stop controls
- Completion status

**File:** `BuildStage.tsx`

## Common Props

All stages share these common props:

```typescript
interface StageBaseProps {
  onNext: () => void;      // Proceed to next stage
  onBack: () => void;      // Return to previous stage
  isLoading?: boolean;     // Loading state
}
```

## Usage Example

```tsx
import { IdeaStage, TeamStage, UsersStage } from '@/features/build/stages';

function BuildWizard() {
  const { currentStage, goToNextStage, goToPreviousStage } = useBuildState();

  switch (currentStage) {
    case 'idea':
      return <IdeaStage {...ideaProps} onNext={goToNextStage} />;
    case 'team':
      return <TeamStage {...teamProps} onNext={goToNextStage} onBack={goToPreviousStage} />;
    case 'users':
      return <UsersStage {...usersProps} onNext={goToNextStage} onBack={goToPreviousStage} />;
    // ...
  }
}
```

## Screenshots

[Idea Stage](./screenshots/idea-stage.png)
[Users Stage](./screenshots/users-stage.png)
[Features Stage](./screenshots/features-stage.png)
[Design Stage](./screenshots/design-stage.png)
[Build Stage](./screenshots/build-stage.png)
