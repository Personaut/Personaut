# Contributing to Personaut

Thank you for your interest in contributing to Personaut! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- VS Code version and OS information
- Extension version
- Relevant error messages or logs

### Suggesting Features

Feature requests are welcome! Please include:

- A clear description of the feature
- The problem it solves or use case
- Any alternative solutions you've considered

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- VS Code 1.80+
- npm or yarn

### Installation

```bash
git clone https://github.com/your-username/personaut.git
cd personaut
npm install
```

### Building

```bash
npm run compile
```

### Testing

```bash
npm test
```

### Running Locally

1. Open the project in VS Code
2. Press F5 to launch the Extension Development Host
3. The extension will be available in the new VS Code window

## Code Organization and Architecture

Personaut uses a **feature-based architecture**. Please familiarize yourself with the structure before contributing:

### Directory Structure

```
src/
├── core/           # Core AI infrastructure (agent, providers, tools)
├── features/       # Feature modules (chat, personas, feedback, etc.)
├── shared/         # Shared utilities and services
├── presentation/   # Presentation layer (SidebarProvider)
└── webview/        # React UI components
```

### Feature Module Structure

Each feature follows this structure:

```
features/[feature-name]/
├── services/       # Business logic
├── handlers/       # Message handlers
├── types/          # TypeScript interfaces
└── index.ts        # Barrel export
```

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

For a guide on adding new features, see [FEATURE_GUIDE.md](FEATURE_GUIDE.md).

## Code Style and Naming Conventions

### Directory Naming
- Use **kebab-case** for all directories: `build-mode`, `chat-service`

### File Naming
- **Components/Classes**: PascalCase - `UserProfile.tsx`, `ChatService.ts`
- **Utilities**: camelCase - `formatters.ts`, `stringUtils.ts`
- **Tests**: Match source file with `.test.ts` suffix - `ChatService.test.ts`
- **Configuration**: kebab-case - `api-config.json`

### Code Naming
- **Functions/Methods**: camelCase with verb-noun - `getUserProfile()`, `calculateTotal()`
- **Variables**: camelCase - `userName`, `totalCount`
- **Constants**: SCREAMING_SNAKE_CASE - `MAX_RETRIES`, `API_TIMEOUT`
- **Booleans**: camelCase with verb prefix - `isLoading`, `hasError`, `canSubmit`
- **Interfaces/Types**: PascalCase without `I` prefix - `User`, `ChatMessage`

### Code Formatting
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes (except JSX/JSON)
- **Semicolons**: Required at end of statements
- **Line Length**: Maximum 100 characters
- **Trailing Commas**: Required in multiline arrays/objects
- **Brace Style**: K&R (opening brace on same line)

### Code Organization
- Use barrel exports (`index.ts`) for clean imports
- Group imports: external, shared, feature-local
- Include JSDoc comments for public APIs
- Colocate tests with source files

Run formatters before committing:
```bash
npm run format      # Format code
npm run lint        # Check linting
npm run lint:fix    # Fix linting issues
```

## Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove)
- Reference issues when applicable (#123)
- Examples:
  - `Add chat message validation`
  - `Fix memory leak in conversation manager`
  - `Update persona generation prompt`

## Testing Guidelines

### Unit Tests
- Write tests for all new functionality
- Test files should be colocated with source files
- Use descriptive test names
- Focus on core functional logic
- Ensure existing tests pass before submitting

### Property-Based Tests
- Use `fast-check` for property-based testing
- Minimum 100 iterations per property test
- Tag tests with design document references
- Format: `**Feature: {feature_name}, Property {number}: {property_text}**`

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```

## Dependency Injection

- Inject dependencies through constructor parameters
- Avoid circular dependencies between features
- Use the DI container in `src/di/Container.ts`
- Example:
```typescript
export class ChatService {
  constructor(
    private readonly agent: Agent,
    private readonly conversationManager: ConversationManager
  ) {}
}
```

## Security

- Never commit API keys or secrets
- Use `TokenStorageService` for secure credential storage
- Validate all user input using `InputValidator`
- Sanitize errors using `ErrorSanitizer`
- Report security vulnerabilities privately to security@personaut.dev

## Documentation

- Update relevant documentation when adding features
- Include JSDoc comments for public APIs
- Update ARCHITECTURE.md for architectural changes
- Update FEATURE_GUIDE.md when adding new feature patterns

## Questions?

Feel free to open an issue or discussion for any questions about contributing.
