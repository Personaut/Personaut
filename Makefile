# Personaut Extension Makefile
# ============================

.PHONY: all install compile build-webview build-css build watch clean package install-ext dev test help

# Default target
all: build

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install

# Compile TypeScript
compile:
	@echo "🔨 Compiling TypeScript..."
	npm run compile

# Build webview bundle
build-webview:
	@echo "🎨 Building webview..."
	npm run build-webview

# Build CSS with Tailwind
build-css:
	@echo "🎨 Building CSS..."
	npm run build-css

# Full build (extension bundle + webview + css)
build: build-extension build-webview build-css
	@echo "✅ Build complete!"

# Build extension bundle
build-extension:
	@echo "📦 Bundling extension..."
	npm run build-extension

# Watch mode for development
watch:
	@echo "👀 Starting watch mode..."
	@echo "Run these in separate terminals:"
	@echo "  make watch-ts"
	@echo "  make watch-webview"
	@echo "  make watch-css"

watch-ts:
	npm run watch

watch-webview:
	npm run watch-webview

watch-css:
	npm run watch-css

# Run tests
test:
	@echo "🧪 Running tests..."
	npm test

# Run tests in watch mode
test-watch:
	@echo "🧪 Running tests in watch mode..."
	npm run test:watch

# Run tests with coverage
test-coverage:
	@echo "🧪 Running tests with coverage..."
	npm run test:coverage

# Lint code
lint:
	@echo "🔍 Linting code..."
	npm run lint

# Fix linting issues
lint-fix:
	@echo "🔧 Fixing linting issues..."
	npm run lint:fix

# Format code
format:
	@echo "✨ Formatting code..."
	npm run format

# Check code formatting
format-check:
	@echo "🔍 Checking code formatting..."
	npm run format:check

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf out/
	rm -rf media/style.css
	rm -f *.vsix
	@echo "✅ Clean complete!"

# Deep clean (including node_modules and coverage)
clean-all: clean
	@echo "🧹 Removing node_modules and coverage..."
	rm -rf node_modules/
	rm -rf coverage/
	@echo "✅ Deep clean complete!"

# Package extension as VSIX
package: build
	@echo "📦 Creating VSIX package..."
	npx @vscode/vsce package --allow-missing-repository --skip-license
	@echo "✅ Package created!"

# Install extension locally in VS Code
install-ext: package
	@echo "✅ Package created: personaut-extension-0.1.1.vsix"
	@echo ""
	@echo "To install in VS Code:"
	@echo "  1. Open VS Code"
	@echo "  2. Press Cmd+Shift+P (or Ctrl+Shift+P)"
	@echo "  3. Type 'Extensions: Install from VSIX...'"
	@echo "  4. Select: $(PWD)/personaut-extension-0.1.1.vsix"

# Development setup (install + build)
dev: install build
	@echo "✅ Development environment ready!"
	@echo "Press F5 in VS Code to launch the extension host."

# Full quality check (lint + format + test)
check: lint format-check test
	@echo "✅ All quality checks passed!"

# Pre-commit checks
pre-commit: lint-fix format test
	@echo "✅ Pre-commit checks complete!"

# Help
help:
	@echo "Personaut Extension - Build Commands"
	@echo "====================================="
	@echo ""
	@echo "Build Commands:"
	@echo "  make install       - Install npm dependencies"
	@echo "  make build         - Full build (compile + webview + css)"
	@echo "  make compile       - Compile TypeScript only"
	@echo "  make build-webview - Build webview bundle only"
	@echo "  make build-css     - Build Tailwind CSS only"
	@echo ""
	@echo "Development Commands:"
	@echo "  make watch         - Show watch mode instructions"
	@echo "  make watch-ts      - Watch TypeScript compilation"
	@echo "  make watch-webview - Watch webview bundle"
	@echo "  make watch-css     - Watch CSS compilation"
	@echo "  make dev           - Full development setup"
	@echo ""
	@echo "Testing Commands:"
	@echo "  make test          - Run all tests"
	@echo "  make test-watch    - Run tests in watch mode"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo ""
	@echo "Code Quality Commands:"
	@echo "  make lint          - Lint code"
	@echo "  make lint-fix      - Fix linting issues"
	@echo "  make format        - Format code with Prettier"
	@echo "  make format-check  - Check code formatting"
	@echo "  make check         - Run all quality checks"
	@echo "  make pre-commit    - Run pre-commit checks"
	@echo ""
	@echo "Packaging Commands:"
	@echo "  make package       - Create VSIX package"
	@echo "  make install-ext   - Package and install in VS Code"
	@echo ""
	@echo "Cleanup Commands:"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make clean-all     - Remove build artifacts + node_modules"
	@echo ""
	@echo "  make help          - Show this help message"

