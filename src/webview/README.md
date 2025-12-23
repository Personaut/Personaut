# Webview Documentation

Comprehensive documentation for the Personaut webview architecture.

## Overview

The Personaut webview provides a React-based UI for:
- **Chat**: Interactive conversations with AI personas
- **Build**: Multi-stage application generation workflow
- **Feedback**: Persona-based feedback on screenshots

## Architecture

```
src/webview/
├── shared/                    # Shared code across features
│   ├── components/               # Reusable UI components
│   │   ├── layout/                  # Layout components (Stack, Card, Grid, AppLayout)
│   │   ├── ui/                      # UI components (Button, Input, Select)
│   │   └── messages/                # Message display components
│   ├── hooks/                    # Shared hooks
│   │   └── useVSCode.ts             # VS Code API integration
│   ├── theme/                    # Design system
│   │   ├── theme.ts                 # Token definitions
│   │   ├── ThemeProvider.tsx        # Context provider
│   │   └── utils.ts                 # Color utilities
│   ├── types/                    # TypeScript types
│   │   └── messages.ts              # Message type definitions
│   └── utils/                    # Utility functions
│       ├── messageRouter.ts         # Message routing
│       ├── streamingHandler.ts      # Streaming updates
│       └── stateManager.ts          # State persistence
├── features/                  # Feature modules
│   ├── build/                    # Build mode feature
│   │   ├── stages/                  # Build stages (7 stages)
│   │   ├── components/              # Build-specific components
│   │   ├── hooks/                   # Build state management
│   │   └── types/                   # Build types
│   ├── feedback/                 # Feedback feature
│   │   ├── components/              # Feedback components
│   │   ├── hooks/                   # Feedback state
│   │   └── types/                   # Feedback types
│   ├── chat/                     # Chat feature
│   ├── personas/                 # Persona management
│   ├── settings/                 # Settings feature
│   └── userbase/                 # UserBase feature
└── App.tsx                    # Main application shell
```

## Design System

### Theme Tokens

All styling uses design tokens for consistency:

```tsx
import { colors, spacing, typography, borderRadius } from '@/shared/theme';

const style = {
  backgroundColor: colors.background.primary,
  padding: spacing.md,
  fontSize: typography.fontSize.md,
  borderRadius: borderRadius.lg,
};
```

### Color Contrast

All colors meet WCAG 2.1 AA standards:
- Text: 4.5:1 minimum contrast ratio
- UI Components: 3:1 minimum contrast ratio

### Spacing Scale

Based on 4px unit:
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `2xl`: 32px

## Message Routing

Messages from VS Code extension are routed by type:

```tsx
import { createMessageRouter } from '@/shared/utils';

const router = createMessageRouter({
  chat: [handleChatMessage],
  build: [handleBuildMessage],
  feedback: [handleFeedbackMessage],
  global: [logAllMessages],
});
```

## State Persistence

State is persisted via VS Code's webview state API:

```tsx
import { createStateManager } from '@/shared/utils';

const stateManager = createStateManager(getState, setState);

// Get feature state
const buildState = stateManager.getFeatureState('buildState');

// Update feature state
stateManager.setFeatureState('buildState', newBuildState);
```

## Streaming Updates

Real-time LLM responses are handled with streaming:

```tsx
import { createStreamingHandler } from '@/shared/utils';

const handleStream = createStreamingHandler({
  onStart: (id) => setLoading(true),
  onChunk: (id, chunk, content) => setResponse(content),
  onEnd: (id, content) => setLoading(false),
  onError: (id, error) => setError(error),
});
```

## Component Patterns

### Using Theme Tokens

```tsx
import { colors, spacing } from '@/shared/theme';

const MyComponent = () => (
  <div style={{ 
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
  }}>
    Content
  </div>
);
```

### Using Layout Components

```tsx
import { Stack, Card } from '@/shared/components';

const MyComponent = () => (
  <Stack spacing="md">
    <Card variant="elevated">
      <Card.Body>Content</Card.Body>
    </Card>
  </Stack>
);
```

### Using UI Components

```tsx
import { Button, Input } from '@/shared/components';

const MyComponent = () => (
  <form>
    <Input label="Name" value={name} onChange={setName} />
    <Button variant="primary" onClick={handleSubmit}>
      Submit
    </Button>
  </form>
);
```

## Feature Documentation

- [Build Feature](./features/build/README.md)
- [Feedback Feature](./features/feedback/README.md)

## Screenshots

[App Architecture](./docs/screenshots/app-architecture.png)
[Component Hierarchy](./docs/screenshots/component-hierarchy.png)
[Chat View](./docs/screenshots/chat-view.png)
[Build Overview](./docs/screenshots/build-overview.png)
[Feedback View](./docs/screenshots/feedback-view.png)
