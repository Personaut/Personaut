# Personaut Extension - Refactored Codebase

This directory contains the refactored Personaut extension with a feature-based architecture.

## 🎯 Quick Start

### Get the Extension Working Now

The backend is complete and secure, but the UI needs to be copied from the old implementation:

```bash
# From project root
cp src/webview/App.tsx personaut/src/webview/App.tsx
cp src/webview/UserBaseTab.tsx personaut/src/webview/
cp src/webview/SettingsTab.tsx personaut/src/webview/
cp src/webview/FeedbackTab.tsx personaut/src/webview/
cp src/webview/BuildLogs.tsx personaut/src/webview/

# Rebuild
npm run compile
```

**See:** [Setup Guide](docs/getting-started/setup.mdx) for detailed instructions.

## 📊 Current Status

- ✅ **Backend:** Complete and secure (all tests passing)
- ⚠️ **Frontend:** Needs UI implementation (quick fix available)

**See:** [Roadmap](docs/roadmap.mdx) for status.

## 🔒 Security

All critical security vulnerabilities have been fixed:
- ✅ Path traversal protection
- ✅ Input validation
- ✅ Workspace boundaries
- ✅ Error sanitization

**See:** [Architecture](docs/architecture/overview.mdx) for security details.

## 🐛 Bugs

All critical bugs have been resolved:
- ✅ Message routing complete
- ✅ Handler implementations complete
- ✅ AI provider initialization fixed

**See:** [Roadmap](docs/roadmap.mdx) for issue tracking.

## 📁 Directory Structure

```
personaut/
├── src/
│   ├── core/              # Core services (Agent, Providers, Tools)
│   ├── features/          # Feature modules
│   │   ├── build-mode/    # Build mode feature
│   │   ├── chat/          # Chat feature
│   │   ├── personas/      # Personas feature
│   │   ├── feedback/      # Feedback feature
│   │   └── settings/      # Settings feature
│   ├── shared/            # Shared utilities and services
│   ├── presentation/      # SidebarProvider (routing layer)
│   ├── di/                # Dependency injection
│   ├── webview/           # React UI (needs implementation)
│   └── extension.ts       # Extension entry point
├── __tests__/             # Test files
└── docs/                  # Documentation
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- BuildModeHandler

# Watch mode
npm test -- --watch
```

**Results:** 655 tests passing, 22 test suites passing

## 📚 Documentation

### Essential Reading
1. [Setup & Quick Start](docs/getting-started/setup.mdx) - Get the environment and UI running.
2. [Project Roadmap](docs/roadmap.mdx) - Future plans and status.

### Architecture
- [System Architecture](docs/architecture/overview.mdx)
- [Feature Guide](docs/features/overview.mdx)
- [Project Structure](docs/architecture/structure.mdx)

### Security
- See [Architecture](docs/architecture/overview.mdx) for security overview.

## 🚀 Development

### Build
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Package
```bash
vsce package
```

## 🔧 Architecture Highlights

### Feature-Based Structure
Each feature is self-contained with:
- Handler (message routing)
- Service (business logic)
- Types (TypeScript interfaces)
- Tests (unit + property-based)

### Security First
- Input validation on all handlers
- Path traversal protection
- Workspace boundary enforcement
- Error message sanitization

### Dependency Injection
- Clean service registration
- Easy testing and mocking
- Loose coupling between components

## 📝 Key Files

### Entry Points
- `src/extension.ts` - Extension activation
- `src/presentation/SidebarProvider.ts` - Message routing
- `src/webview/App.tsx` - UI entry point (needs implementation)

### Core Services
- `src/core/agent/Agent.ts` - AI agent
- `src/core/providers/` - AI provider implementations
- `src/di/Container.ts` - Dependency injection

### Feature Handlers
- `src/features/build-mode/handlers/BuildModeHandler.ts`
- `src/features/chat/handlers/ChatHandler.ts`
- `src/features/personas/handlers/PersonasHandler.ts`
- `src/features/feedback/handlers/FeedbackHandler.ts`
- `src/features/settings/handlers/SettingsHandler.ts`

## 🎯 Next Steps

### Immediate
1. Apply quick fix to get UI working
2. Test all features
3. Package extension

### Short-term
1. Add user documentation
2. Performance optimization
3. User feedback collection

### Long-term
1. Create spec for UI refactoring
2. Extract feature components
3. Add UI component tests
4. Implement remaining features

## 🤝 Contributing

See `CONTRIBUTING.md` in the project root.

## 📄 License

See `LICENSE` in the project root.

---

**Need Help?**
- Check [Setup Guide](docs/getting-started/setup.mdx) to get UI working
- Check [Roadmap](docs/roadmap.mdx) for overall status
- Check [Architecture](docs/architecture/overview.mdx) for security info
