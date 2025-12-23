/**
 * Unit tests for PackageJsonGenerator
 */

import { PackageJsonGenerator, PackageJsonConfig } from '../PackageJsonGenerator';

describe('PackageJsonGenerator', () => {
    let generator: PackageJsonGenerator;

    beforeEach(() => {
        generator = new PackageJsonGenerator();
    });

    describe('generate', () => {
        it('should generate React package.json', () => {
            const config: PackageJsonConfig = {
                projectName: 'my-react-app',
                framework: 'react',
            };

            const result = generator.generate(config);

            expect(result.name).toBe('my-react-app');
            expect(result.version).toBe('1.0.0');
            expect(result.private).toBe(true);
            expect(result.scripts.start).toBe('react-scripts start');
            expect(result.dependencies.react).toBeDefined();
            expect(result.dependencies['react-dom']).toBeDefined();
            expect(result.dependencies['react-scripts']).toBeDefined();
            expect(result.devDependencies?.typescript).toBe('^4.9.5'); // Compatible with react-scripts
        });

        it('should generate Next.js package.json', () => {
            const config: PackageJsonConfig = {
                projectName: 'my-nextjs-app',
                framework: 'nextjs',
            };

            const result = generator.generate(config);

            expect(result.name).toBe('my-nextjs-app');
            expect(result.scripts.dev).toBe('next dev');
            expect(result.scripts.build).toBe('next build');
            expect(result.dependencies.next).toBeDefined();
            expect(result.dependencies.react).toBeDefined();
            expect(result.devDependencies?.typescript).toBeDefined();
        });

        it('should generate Vue package.json', () => {
            const config: PackageJsonConfig = {
                projectName: 'my-vue-app',
                framework: 'vue',
            };

            const result = generator.generate(config);

            expect(result.name).toBe('my-vue-app');
            expect(result.scripts.dev).toBe('vite');
            expect(result.scripts.build).toBe('vite build');
            expect(result.dependencies.vue).toBeDefined();
            expect(result.devDependencies?.vite).toBeDefined();
        });

        it('should generate HTML package.json', () => {
            const config: PackageJsonConfig = {
                projectName: 'my-html-site',
                framework: 'html',
            };

            const result = generator.generate(config);

            expect(result.name).toBe('my-html-site');
            expect(result.scripts.dev).toContain('live-server');
            expect(result.devDependencies?.['live-server']).toBeDefined();
        });

        it('should generate Flutter package.json (minimal)', () => {
            const config: PackageJsonConfig = {
                projectName: 'my-flutter-app',
                framework: 'flutter',
            };

            const result = generator.generate(config);

            expect(result.name).toBe('my-flutter-app');
            expect(result.scripts.dev).toContain('Flutter');
        });

        it('should throw error for unsupported framework', () => {
            const config: PackageJsonConfig = {
                projectName: 'test',
                framework: 'angular' as any,
            };

            expect(() => generator.generate(config)).toThrow('Unsupported framework');
        });

        it('should use custom version and description', () => {
            const config: PackageJsonConfig = {
                projectName: 'test-app',
                framework: 'react',
                version: '2.0.0',
                description: 'Custom description',
            };

            const result = generator.generate(config);

            expect(result.version).toBe('2.0.0');
            expect(result.description).toBe('Custom description');
        });

        it('should sanitize project name with spaces', () => {
            const config: PackageJsonConfig = {
                projectName: 'My Cool App',
                framework: 'react',
            };

            const result = generator.generate(config);

            expect(result.name).toBe('my-cool-app');
        });

        it('should sanitize project name with special characters', () => {
            const config: PackageJsonConfig = {
                projectName: 'App@#$%Name!!!',
                framework: 'react',
            };

            const result = generator.generate(config);

            expect(result.name).toBe('app----name');
        });

        it('should remove leading and trailing hyphens', () => {
            const config: PackageJsonConfig = {
                projectName: '---app-name---',
                framework: 'react',
            };

            const result = generator.generate(config);

            expect(result.name).toBe('app-name');
        });

        it('should truncate long names to 214 characters', () => {
            const longName = 'a'.repeat(300);
            const config: PackageJsonConfig = {
                projectName: longName,
                framework: 'react',
            };

            const result = generator.generate(config);

            expect(result.name.length).toBeLessThanOrEqual(214);
        });
    });

    describe('stringify', () => {
        it('should convert package.json to formatted JSON string', () => {
            const config: PackageJsonConfig = {
                projectName: 'test-app',
                framework: 'react',
            };

            const packageJson = generator.generate(config);
            const jsonString = generator.stringify(packageJson);

            expect(jsonString).toContain('"name": "test-app"');
            expect(jsonString).toContain('"version": "1.0.0"');
            expect(jsonString).toContain('"react"');

            // Should be formatted with 2-space indentation
            expect(jsonString).toContain('  "name"');
        });

        it('should produce valid JSON', () => {
            const config: PackageJsonConfig = {
                projectName: 'test-app',
                framework: 'nextjs',
            };

            const packageJson = generator.generate(config);
            const jsonString = generator.stringify(packageJson);

            // Should be parseable
            expect(() => JSON.parse(jsonString)).not.toThrow();

            const parsed = JSON.parse(jsonString);
            expect(parsed.name).toBe('test-app');
            expect(parsed.dependencies.next).toBeDefined();
        });
    });
});
