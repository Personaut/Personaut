"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
/**
 * Feature: feature-based-architecture, Property 18: Dependency Injection
 *
 * For any service or handler class, all dependencies should be injected
 * through constructor parameters
 *
 * Validates: Requirements 11.2, 11.3
 */
describe('Property 18: Dependency Injection', () => {
    /**
     * Parse a TypeScript file and extract class information
     */
    function parseTypeScriptFile(filePath) {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
        const classes = [];
        function visit(node) {
            if (ts.isClassDeclaration(node) && node.name) {
                const className = node.name.text;
                const constructorParams = [];
                // Find constructor
                node.members.forEach((member) => {
                    if (ts.isConstructorDeclaration(member)) {
                        member.parameters.forEach((param) => {
                            if (ts.isIdentifier(param.name)) {
                                const paramName = param.name.text;
                                const isPrivate = param.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.PrivateKeyword) ||
                                    false;
                                const isReadonly = param.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword) ||
                                    false;
                                let paramType = 'any';
                                if (param.type) {
                                    paramType = param.type.getText(sourceFile);
                                }
                                constructorParams.push({
                                    name: paramName,
                                    type: paramType,
                                    isPrivate: isPrivate || isReadonly,
                                });
                            }
                        });
                    }
                });
                classes.push({
                    name: className,
                    constructorParams,
                });
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
        return { classes };
    }
    /**
     * Get all TypeScript files in a directory recursively
     */
    function getAllTypeScriptFiles(dir) {
        const files = [];
        function traverse(currentPath) {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isDirectory()) {
                    traverse(fullPath);
                }
                else if (entry.isFile() &&
                    entry.name.endsWith('.ts') &&
                    !entry.name.endsWith('.test.ts')) {
                    files.push(fullPath);
                }
            }
        }
        traverse(dir);
        return files;
    }
    describe('Services should use constructor injection', () => {
        it('should inject all dependencies through constructor parameters in service classes', () => {
            const servicesDir = path.join(__dirname, '../../features');
            const serviceFiles = getAllTypeScriptFiles(servicesDir).filter((file) => file.includes('/services/') && !file.includes('.test.ts'));
            expect(serviceFiles.length).toBeGreaterThan(0);
            serviceFiles.forEach((serviceFile) => {
                const parsed = parseTypeScriptFile(serviceFile);
                parsed.classes.forEach((classInfo) => {
                    // Service classes should have constructor parameters
                    // (unless they're utility classes with no dependencies)
                    if (classInfo.name.endsWith('Service')) {
                        // Check that constructor parameters use private/readonly modifiers
                        // This is the pattern for dependency injection
                        classInfo.constructorParams.forEach((param) => {
                            // Parameters should be marked as private or readonly for DI pattern
                            // Exception: some parameters might be configuration objects
                            if (!param.name.startsWith('_') && !param.type.includes('Config')) {
                                expect(param.isPrivate).toBe(true);
                            }
                        });
                    }
                });
            });
        });
    });
    describe('Handlers should use constructor injection', () => {
        it('should inject all dependencies through constructor parameters in handler classes', () => {
            const handlersDir = path.join(__dirname, '../../features');
            const handlerFiles = getAllTypeScriptFiles(handlersDir).filter((file) => file.includes('/handlers/') && !file.includes('.test.ts'));
            expect(handlerFiles.length).toBeGreaterThan(0);
            handlerFiles.forEach((handlerFile) => {
                const parsed = parseTypeScriptFile(handlerFile);
                parsed.classes.forEach((classInfo) => {
                    if (classInfo.name.endsWith('Handler')) {
                        // Handlers should have at least one dependency (the service)
                        expect(classInfo.constructorParams.length).toBeGreaterThan(0);
                        // Check that constructor parameters use private/readonly modifiers
                        classInfo.constructorParams.forEach((param) => {
                            if (!param.name.startsWith('_')) {
                                expect(param.isPrivate).toBe(true);
                            }
                        });
                    }
                });
            });
        });
    });
    describe('DI Container should be properly configured', () => {
        it('should have a DI container in extension.ts', () => {
            const extensionPath = path.join(__dirname, '../../extension.ts');
            expect(fs.existsSync(extensionPath)).toBe(true);
            const content = fs.readFileSync(extensionPath, 'utf-8');
            // Check that Container is imported
            expect(content).toMatch(/import.*Container.*from.*di/);
            // Check that container is instantiated
            expect(content).toMatch(/new Container\(\)/);
            // Check that services are registered
            expect(content).toMatch(/container\.register/);
        });
        it('should register all required shared services', () => {
            const extensionPath = path.join(__dirname, '../../extension.ts');
            const content = fs.readFileSync(extensionPath, 'utf-8');
            const requiredSharedServices = ['tokenStorageService', 'inputValidator', 'errorSanitizer'];
            requiredSharedServices.forEach((service) => {
                expect(content).toMatch(new RegExp(`container\\.register\\(['"']${service}['"]`));
            });
        });
        it('should register all feature services', () => {
            const extensionPath = path.join(__dirname, '../../extension.ts');
            const content = fs.readFileSync(extensionPath, 'utf-8');
            const requiredFeatureServices = [
                'chatService',
                'personasService',
                'feedbackService',
                'buildModeService',
                'settingsService',
            ];
            requiredFeatureServices.forEach((service) => {
                expect(content).toMatch(new RegExp(`container\\.register\\(['"']${service}['"]`));
            });
        });
        it('should register all feature handlers', () => {
            const extensionPath = path.join(__dirname, '../../extension.ts');
            const content = fs.readFileSync(extensionPath, 'utf-8');
            const requiredHandlers = [
                'chatHandler',
                'personasHandler',
                'feedbackHandler',
                'buildModeHandler',
                'settingsHandler',
            ];
            requiredHandlers.forEach((handler) => {
                expect(content).toMatch(new RegExp(`container\\.register\\(['"']${handler}['"]`));
            });
        });
    });
    describe('No circular dependencies', () => {
        it('should not have circular dependencies between feature modules', () => {
            const featuresDir = path.join(__dirname, '../../features');
            const featureDirs = fs
                .readdirSync(featuresDir, { withFileTypes: true })
                .filter((dirent) => dirent.isDirectory())
                .map((dirent) => dirent.name);
            // Build dependency graph
            const dependencies = new Map();
            featureDirs.forEach((feature) => {
                dependencies.set(feature, new Set());
                const featurePath = path.join(featuresDir, feature);
                const files = getAllTypeScriptFiles(featurePath);
                files.forEach((file) => {
                    const content = fs.readFileSync(file, 'utf-8');
                    // Check for imports from other features
                    featureDirs.forEach((otherFeature) => {
                        if (otherFeature !== feature) {
                            const importPattern = new RegExp(`from ['"].*features/${otherFeature}`);
                            if (importPattern.test(content)) {
                                dependencies.get(feature).add(otherFeature);
                            }
                        }
                    });
                });
            });
            // Check for circular dependencies using DFS
            function hasCycle(node, visited, recStack) {
                visited.add(node);
                recStack.add(node);
                const neighbors = dependencies.get(node) || new Set();
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        if (hasCycle(neighbor, visited, recStack)) {
                            return true;
                        }
                    }
                    else if (recStack.has(neighbor)) {
                        return true;
                    }
                }
                recStack.delete(node);
                return false;
            }
            const visited = new Set();
            for (const feature of featureDirs) {
                if (!visited.has(feature)) {
                    const hasCyclicDependency = hasCycle(feature, visited, new Set());
                    expect(hasCyclicDependency).toBe(false);
                }
            }
        });
    });
});
//# sourceMappingURL=dependency-injection.property.test.js.map