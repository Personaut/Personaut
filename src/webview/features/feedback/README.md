# Feedback Feature

The Feedback feature enables persona-based feedback generation for UI screenshots.

## Overview

Users can upload screenshots or capture URLs, select personas, and receive AI-generated feedback from the perspective of those personas.

## Directory Structure

```
features/feedback/
├── components/                    # UI components
│   ├── ScreenshotCapture.tsx         # Screenshot capture UI
│   ├── PersonaMultiSelect.tsx        # Persona selection
│   ├── FeedbackDisplay.tsx           # Generated feedback display
│   ├── FeedbackHistoryComponent.tsx  # Feedback history
│   └── index.ts                      # Component exports
├── hooks/                         # Custom hooks
│   ├── useFeedbackState.ts           # State management
│   └── index.ts                      # Hook exports
├── types/                         # TypeScript types
│   └── index.ts                      # All feedback types
├── __tests__/                     # Unit tests
├── FeedbackView.tsx               # Main view component
├── index.ts                       # Feature exports
└── README.md                      # This file
```

## Usage

### Basic Usage

```tsx
import { FeedbackView } from '@/features/feedback';

function App() {
  const handleGenerate = async (screenshot, personaIds, context) => {
    // Call AI service with screenshot and personas
    const feedback = await generateFeedback(screenshot, personaIds, context);
    // Handle feedback response
  };

  return (
    <FeedbackView
      personas={availablePersonas}
      onGenerateFeedback={handleGenerate}
      onCaptureUrl={handleUrlCapture}
    />
  );
}
```

### Using State Hook

```tsx
import { useFeedbackState } from '@/features/feedback';

function CustomFeedbackUI() {
  const {
    state,
    setScreenshot,
    togglePersonaSelection,
    setContext,
    canGenerateFeedback,
  } = useFeedbackState();

  return (
    <div>
      <div>Screenshot: {state.screenshot ? 'Captured' : 'None'}</div>
      <div>Selected: {state.selectedPersonaIds.length} personas</div>
      <button disabled={!canGenerateFeedback}>
        Generate
      </button>
    </div>
  );
}
```

## Components

### ScreenshotCapture

Captures screenshots from three sources:
- **URL**: Enter a URL and capture a screenshot
- **File**: Upload or drag-and-drop an image file
- **Clipboard**: Paste an image with Ctrl/Cmd+V

```tsx
<ScreenshotCapture
  screenshot={screenshot}
  onCapture={setScreenshot}
  onCaptureUrl={handleCaptureUrl}
  isLoading={isCapturing}
/>
```

### PersonaMultiSelect

Select up to 5 personas for feedback:

```tsx
<PersonaMultiSelect
  personas={availablePersonas}
  selectedIds={selectedPersonaIds}
  onToggle={togglePersonaSelection}
  maxSelection={5}
/>
```

### FeedbackDisplay

Display generated feedback with summary:

```tsx
<FeedbackDisplay
  feedback={generatedFeedback}
  consolidated={consolidatedSummary}
  onCopy={handleCopy}
  onClear={handleClear}
/>
```

### FeedbackHistory

View past feedback with search and sort:

```tsx
<FeedbackHistory
  entries={feedbackHistory}
  onDelete={handleDelete}
  onView={handleView}
/>
```

## Types

### FeedbackEntry

```typescript
interface FeedbackEntry {
  id: string;
  personaId: string;
  personaName: string;
  rating: number;           // 1-5
  comment: string;
  screenshotUrl?: string;
  context?: string;
  timestamp: number;
}
```

### ScreenshotData

```typescript
interface ScreenshotData {
  url: string;              // Data URL or source URL
  source: 'url' | 'file' | 'clipboard';
  fileName?: string;
  capturedAt: number;
}
```

### ConsolidatedFeedback

```typescript
interface ConsolidatedFeedback {
  averageRating: number;
  totalCount: number;
  themes: string[];
  positives: string[];
  improvements: string[];
  actionItems: string[];
}
```

## State Persistence

The feedback state is persisted via VS Code's webview state API:

- `screenshot` - Current screenshot data
- `selectedPersonaIds` - Selected persona IDs
- `context` - Additional context text
- `feedbackHistory` - Past feedback entries

## Screenshots

[Feedback View](./screenshots/feedback-view.png)
[Screenshot Capture](./screenshots/screenshot-capture.png)
[Feedback Results](./screenshots/feedback-results.png)

## Requirements

- **Requirements 4.4** - Feedback generation via Persona
- **Requirements 13.3** - Feedback feature UI components
- **Requirements 8.1** - Error boundary integration
