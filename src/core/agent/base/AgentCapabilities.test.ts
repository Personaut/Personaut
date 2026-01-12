import { CapabilityRegistry, AGENT_CAPABILITIES } from './AgentCapabilities';

describe('AgentCapabilities', () => {
    describe('AGENT_CAPABILITIES', () => {
        it('should have all predefined capabilities', () => {
            expect(AGENT_CAPABILITIES.CONVERSATION).toBeDefined();
            expect(AGENT_CAPABILITIES.PERSONA_CHAT).toBeDefined();
            expect(AGENT_CAPABILITIES.TOOL_EXECUTION).toBeDefined();
            expect(AGENT_CAPABILITIES.CODE_GENERATION).toBeDefined();
            expect(AGENT_CAPABILITIES.CODE_REPAIR).toBeDefined();
            expect(AGENT_CAPABILITIES.UX_DESIGN).toBeDefined();
            expect(AGENT_CAPABILITIES.RESEARCH).toBeDefined();
            expect(AGENT_CAPABILITIES.FEEDBACK_COLLECTION).toBeDefined();
            expect(AGENT_CAPABILITIES.FEEDBACK_SYNTHESIS).toBeDefined();
        });

        it('should have correct structure for each capability', () => {
            const capability = AGENT_CAPABILITIES.CONVERSATION;

            expect(capability).toHaveProperty('name');
            expect(capability).toHaveProperty('description');
            expect(capability).toHaveProperty('tools');
            expect(capability).toHaveProperty('prompts');
            expect(Array.isArray(capability.tools)).toBe(true);
            expect(Array.isArray(capability.prompts)).toBe(true);
        });

        it('should have unique capability names', () => {
            const names = Object.values(AGENT_CAPABILITIES).map(cap => cap.name);
            const uniqueNames = new Set(names);

            expect(uniqueNames.size).toBe(names.length);
        });
    });

    describe('CapabilityRegistry', () => {
        let registry: CapabilityRegistry;

        beforeEach(() => {
            registry = new CapabilityRegistry();
        });

        describe('register', () => {
            it('should register a capability for an agent', () => {
                const agentId = 'test-agent-1';
                const capability = AGENT_CAPABILITIES.CONVERSATION;

                registry.register(agentId, capability);

                const capabilities = registry.getCapabilities(agentId);
                expect(capabilities).toHaveLength(1);
                expect(capabilities[0]).toEqual(capability);
            });

            it('should not register duplicate capabilities', () => {
                const agentId = 'test-agent-2';
                const capability = AGENT_CAPABILITIES.CONVERSATION;

                registry.register(agentId, capability);
                registry.register(agentId, capability); // Duplicate

                const capabilities = registry.getCapabilities(agentId);
                expect(capabilities).toHaveLength(1);
            });

            it('should allow multiple different capabilities for same agent', () => {
                const agentId = 'test-agent-3';

                registry.register(agentId, AGENT_CAPABILITIES.CONVERSATION);
                registry.register(agentId, AGENT_CAPABILITIES.TOOL_EXECUTION);

                const capabilities = registry.getCapabilities(agentId);
                expect(capabilities).toHaveLength(2);
            });
        });

        describe('registerMultiple', () => {
            it('should register multiple capabilities at once', () => {
                const agentId = 'test-agent-4';
                const capabilities = [
                    AGENT_CAPABILITIES.CONVERSATION,
                    AGENT_CAPABILITIES.TOOL_EXECUTION,
                ];

                registry.registerMultiple(agentId, capabilities);

                const registered = registry.getCapabilities(agentId);
                expect(registered).toHaveLength(2);
            });
        });

        describe('hasCapability', () => {
            it('should return true for registered capability', () => {
                const agentId = 'test-agent-5';
                registry.register(agentId, AGENT_CAPABILITIES.CODE_GENERATION);

                expect(registry.hasCapability(agentId, 'code-generation')).toBe(true);
            });

            it('should return false for unregistered capability', () => {
                const agentId = 'test-agent-6';

                expect(registry.hasCapability(agentId, 'code-generation')).toBe(false);
            });

            it('should return false for non-existent agent', () => {
                expect(registry.hasCapability('non-existent', 'conversation')).toBe(false);
            });
        });

        describe('getTools', () => {
            it('should return all tools from registered capabilities', () => {
                const agentId = 'test-agent-7';
                registry.register(agentId, AGENT_CAPABILITIES.CODE_GENERATION);

                const tools = registry.getTools(agentId);

                expect(Array.isArray(tools)).toBe(true);
                expect(tools.length).toBeGreaterThan(0);
            });

            it('should return empty array for agent with no capabilities', () => {
                const tools = registry.getTools('no-capabilities');

                expect(tools).toEqual([]);
            });

            it('should aggregate tools from multiple capabilities', () => {
                const agentId = 'test-agent-8';
                registry.register(agentId, AGENT_CAPABILITIES.CODE_GENERATION);
                registry.register(agentId, AGENT_CAPABILITIES.UX_DESIGN);

                const tools = registry.getTools(agentId);

                // Should have tools from both capabilities
                expect(tools.length).toBeGreaterThan(0);
            });
        });

        describe('getPrompts', () => {
            it('should return all prompts from registered capabilities', () => {
                const agentId = 'test-agent-9';
                registry.register(agentId, AGENT_CAPABILITIES.PERSONA_CHAT);

                const prompts = registry.getPrompts(agentId);

                expect(Array.isArray(prompts)).toBe(true);
                expect(prompts).toContain('generatePersonaPrompt');
            });

            it('should return unique prompts only', () => {
                const agentId = 'test-agent-10';
                // Register capabilities that might share prompts
                registry.register(agentId, AGENT_CAPABILITIES.CONVERSATION);
                registry.register(agentId, AGENT_CAPABILITIES.TOOL_EXECUTION);

                const prompts = registry.getPrompts(agentId);
                const uniquePrompts = new Set(prompts);

                expect(prompts.length).toBe(uniquePrompts.size);
            });
        });

        describe('clear', () => {
            it('should remove all capabilities for an agent', () => {
                const agentId = 'test-agent-11';
                registry.register(agentId, AGENT_CAPABILITIES.CONVERSATION);
                registry.register(agentId, AGENT_CAPABILITIES.TOOL_EXECUTION);

                registry.clear(agentId);

                const capabilities = registry.getCapabilities(agentId);
                expect(capabilities).toEqual([]);
            });

            it('should not affect other agents', () => {
                const agent1 = 'agent-1';
                const agent2 = 'agent-2';

                registry.register(agent1, AGENT_CAPABILITIES.CONVERSATION);
                registry.register(agent2, AGENT_CAPABILITIES.CODE_GENERATION);

                registry.clear(agent1);

                expect(registry.getCapabilities(agent1)).toEqual([]);
                expect(registry.getCapabilities(agent2)).toHaveLength(1);
            });
        });

        describe('clearAll', () => {
            it('should remove all capabilities for all agents', () => {
                registry.register('agent-1', AGENT_CAPABILITIES.CONVERSATION);
                registry.register('agent-2', AGENT_CAPABILITIES.CODE_GENERATION);

                registry.clearAll();

                expect(registry.getCapabilities('agent-1')).toEqual([]);
                expect(registry.getCapabilities('agent-2')).toEqual([]);
                expect(registry.getAgentIds()).toEqual([]);
            });
        });

        describe('getAgentIds', () => {
            it('should return all registered agent IDs', () => {
                registry.register('agent-1', AGENT_CAPABILITIES.CONVERSATION);
                registry.register('agent-2', AGENT_CAPABILITIES.CODE_GENERATION);

                const ids = registry.getAgentIds();

                expect(ids).toContain('agent-1');
                expect(ids).toContain('agent-2');
                expect(ids).toHaveLength(2);
            });

            it('should return empty array when no agents registered', () => {
                const ids = registry.getAgentIds();

                expect(ids).toEqual([]);
            });
        });
    });
});
