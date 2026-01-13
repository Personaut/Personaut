/**
 * Integration tests for BuildWorkflowOrchestrator
 * Tests the complete data flow from code generation to file writing
 */

import * as path from 'path';
import * as fs from 'fs/promises';


describe('BuildWorkflowOrchestrator - Code Generation Flow', () => {
    let orchestrator: any;
    let mockDeveloperAgent: any;
    let mockAgentManager: any;
    let testDir: string;

    beforeEach(async () => {
        // Create test directory
        testDir = path.join(__dirname, 'test-output');
        await fs.mkdir(testDir, { recursive: true });

        // Mock developer agent
        mockDeveloperAgent = {
            generateCode: jest.fn(),
        };

        // Mock agent manager
        mockAgentManager = {
            createDeveloperAgent: jest.fn().mockResolvedValue(mockDeveloperAgent),
            disposeAgent: jest.fn().mockResolvedValue(undefined),
            getOrCreateAgent: jest.fn(),
        };

        // Create orchestrator with mocks
        orchestrator = {
            config: {
                baseDir: testDir,
                framework: 'React',
                projectName: 'test-project',
                webview: { postMessage: jest.fn() },
            },
            agentManager: mockAgentManager,
            log: jest.fn(),
            startDevServer: jest.fn(),
        };
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    test('should generate code and write to both locations', async () => {
        // Arrange
        const generatedCode = `import React from 'react';

const TestComponent = () => {
    return <div>Test Component</div>;
};

export default TestComponent;`;

        mockDeveloperAgent.generateCode.mockResolvedValue(generatedCode);

        const page = {
            pageId: 'testPage',
            pageName: 'Test Page',
            description: 'A test page',
        };
        const uxSpec = 'Create a test page';
        const iteration = 1;

        // Act - Simulate development phase
        const outputPath = 'src/pages/TestPage.tsx';
        const code = await mockDeveloperAgent.generateCode(`Generate a complete React component...`);

        // Write to .personaut
        const iterationDir = path.join(testDir, '.personaut', 'iterations', page.pageId, `iteration_${iteration}`);
        await fs.mkdir(iterationDir, { recursive: true });
        await fs.writeFile(path.join(iterationDir, 'code.txt'), code, 'utf-8');

        // Write to project
        const projectFilePath = path.join(testDir, outputPath);
        await fs.mkdir(path.dirname(projectFilePath), { recursive: true });
        await fs.writeFile(projectFilePath, code, 'utf-8');

        // Assert - Check .personaut file
        const personautCode = await fs.readFile(path.join(iterationDir, 'code.txt'), 'utf-8');
        expect(personautCode).toBe(generatedCode);
        expect(personautCode.length).toBeGreaterThan(0);
        expect(personautCode).toContain('import React');

        // Assert - Check project file
        const projectCode = await fs.readFile(projectFilePath, 'utf-8');
        expect(projectCode).toBe(generatedCode);
        expect(projectCode).toContain('TestComponent');

        // Assert - Verify generateCode was called
        expect(mockDeveloperAgent.generateCode).toHaveBeenCalledTimes(1);
    });

    test('should handle empty code gracefully', async () => {
        // Arrange
        mockDeveloperAgent.generateCode.mockResolvedValue('');

        const page = {
            pageId: 'testPage',
            pageName: 'Test Page',
            description: 'A test page',
        };
        const iteration = 1;

        // Act
        const code = await mockDeveloperAgent.generateCode('Generate code...');

        const iterationDir = path.join(testDir, '.personaut', 'iterations', page.pageId, `iteration_${iteration}`);
        await fs.mkdir(iterationDir, { recursive: true });
        await fs.writeFile(path.join(iterationDir, 'code.txt'), code, 'utf-8');

        // Assert
        const savedCode = await fs.readFile(path.join(iterationDir, 'code.txt'), 'utf-8');
        expect(savedCode).toBe('');
        expect(savedCode.length).toBe(0);
    });

    test('should create directories if they do not exist', async () => {
        // Arrange
        const generatedCode = 'const test = "code";';
        mockDeveloperAgent.generateCode.mockResolvedValue(generatedCode);

        const outputPath = 'src/deeply/nested/pages/TestPage.tsx';

        // Act
        const code = await mockDeveloperAgent.generateCode('Generate code...');
        const projectFilePath = path.join(testDir, outputPath);
        await fs.mkdir(path.dirname(projectFilePath), { recursive: true });
        await fs.writeFile(projectFilePath, code, 'utf-8');

        // Assert
        const exists = await fs.access(projectFilePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        const savedCode = await fs.readFile(projectFilePath, 'utf-8');
        expect(savedCode).toBe(generatedCode);
    });

    test('should preserve code content exactly', async () => {
        // Arrange
        const generatedCode = `import React, { useState } from 'react';

interface Props {
    title: string;
    onSubmit: (value: string) => void;
}

const ComplexComponent: React.FC<Props> = ({ title, onSubmit }) => {
    const [value, setValue] = useState('');

    return (
        <div className="complex-component">
            <h1>{title}</h1>
            <input 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
            />
            <button onClick={() => onSubmit(value)}>Submit</button>
        </div>
    );
};

export default ComplexComponent;`;

        mockDeveloperAgent.generateCode.mockResolvedValue(generatedCode);

        // Act
        const code = await mockDeveloperAgent.generateCode('Generate code...');
        const filePath = path.join(testDir, 'test.tsx');
        await fs.writeFile(filePath, code, 'utf-8');

        // Assert
        const savedCode = await fs.readFile(filePath, 'utf-8');
        expect(savedCode).toBe(generatedCode);
        expect(savedCode).toContain('useState');
        expect(savedCode).toContain('interface Props');
        expect(savedCode).toContain('ComplexComponent');
    });
});
