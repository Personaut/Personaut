# Webview Implementation

This directory contains the React-based webview implementation for the Personaut extension.

## Structure

```
webview/
├── App.tsx              # Main application component with routing
├── index.tsx            # Entry point
├── style.css            # Global styles
├── App.test.tsx         # App component tests
└── features/            # Feature-based UI components
    ├── chat/            # Chat interface
    ├── personas/        # Persona management
    ├── feedback/        # Feedback generation
    ├── build-mode/      # Build mode workflow
    └── settings/        # Settings configuration
```

## App Component

The `App.tsx` component serves as the main routing layer for the webview. It:

- **Manages view state**: Switches between chat, personas, feedback, build, settings, and history views
- **Handles token usage tracking**: Displays and manages token consumption
- **Provides navigation**: Header with buttons to switch between features
- **Manages conversation history**: Lists and loads previous conversations
- **Communicates with extension**: Uses VS Code API to send/receive messages

### View Routing

The app supports the following views:

- `chat`: Main chat interface (default)
- `personas`: Persona management interface
- `feedback`: Feedback generation interface
- `build`: Build mode workflow interface
- `settings`: Settings configuration interface
- `history`: Conversation history list

### State Management

State is persisted using the VS Code webview state API:

```typescript
vscode.getState()  // Load saved state
vscode.setState()  // Save state
```

Persisted state includes:
- Current view
- Token usage statistics
- Conversation history
- Rate limit settings

### Message Handling

The app listens for messages from the extension:

- `usage-update`: Updates token usage statistics
- `history-updated`: Updates conversation history
- `load-conversation`: Switches to chat view with loaded conversation
- `settings-loaded`: Updates rate limit settings

### Requirements Validation

✅ **Requirement 1.5**: Webview features directory mirrors backend feature structure
- Feature components organized in `features/` directory
- Each feature has its own subdirectory (chat, personas, feedback, build-mode, settings)
- Components imported from feature modules

✅ **Refactored to use feature components**:
- `ChatView` from `./features/chat`
- `PersonasView` from `./features/personas`
- `FeedbackView` from `./features/feedback`
- `BuildView` from `./features/build-mode`
- `SettingsView` from `./features/settings`

✅ **Updated routing logic**:
- View state managed with `useState<View>`
- Conditional rendering based on current view
- Navigation buttons toggle between views

✅ **Updated state management**:
- State persisted with VS Code API
- Message handling for extension communication
- Token usage tracking
- Conversation history management

✅ **Verified UI functionality**:
- Header with navigation buttons
- Token usage display with reset functionality
- View switching between all features
- Conversation history with load/delete actions
- Proper ARIA labels for accessibility

## Feature Components

Each feature component is responsible for its own UI and business logic:

- **ChatView**: Chat interface with message display and input
- **PersonasView**: Persona creation, editing, and management
- **FeedbackView**: Feedback generation with persona selection
- **BuildView**: Build mode workflow with stage management
- **SettingsView**: API configuration and preferences

## Styling

The webview uses CSS custom properties for theming, allowing it to adapt to the VS Code theme:

- `--vscode-editor-background`: Primary background color
- `--vscode-editor-foreground`: Primary text color
- `--vscode-input-background`: Input field background
- `--vscode-focusBorder`: Focus indicator color
- And more...

## Testing

Tests are located in `App.test.tsx` and verify:

- Component rendering
- View routing
- State management
- Message handling
- User interactions

Note: React testing requires a different Jest configuration than the backend tests.

## Development

To work on the webview:

1. Make changes to components in `features/` directories
2. Update `App.tsx` if routing logic changes
3. Test in VS Code by running the extension
4. Verify all views are accessible and functional

## Migration Notes

This implementation is part of the feature-based architecture refactoring. The old monolithic `App.tsx` (5996 lines) has been replaced with this simplified version (~400 lines) that delegates to feature components.

Key improvements:
- **Separation of concerns**: Each feature has its own component
- **Maintainability**: Easier to locate and modify feature-specific code
- **Testability**: Smaller, focused components are easier to test
- **Scalability**: New features can be added without modifying App.tsx
