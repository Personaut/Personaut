"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PersonasService_1 = require("./PersonasService");
// Mock PersonaStorage
jest.mock('../../../shared/services', () => ({
    PersonaStorage: jest.fn(),
    Persona: jest.fn(),
}));
describe('PersonasService', () => {
    let personasService;
    let mockPersonaStorage;
    let mockAiProvider;
    const mockPersona = {
        id: '123',
        name: 'Test User',
        attributes: {
            age: '30',
            occupation: 'Developer',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    beforeEach(() => {
        mockPersonaStorage = {
            getAllPersonas: jest.fn(),
            getPersonaById: jest.fn(),
            searchPersonas: jest.fn(),
            createPersona: jest.fn(),
            updatePersona: jest.fn(),
            deletePersona: jest.fn(),
            generatePrompt: jest.fn(),
        };
        mockAiProvider = {
            chat: jest.fn(),
        };
        personasService = new PersonasService_1.PersonasService(mockPersonaStorage, mockAiProvider);
    });
    describe('getPersonas', () => {
        it('should return all personas', async () => {
            const personas = [mockPersona];
            mockPersonaStorage.getAllPersonas.mockReturnValue(personas);
            const result = await personasService.getPersonas();
            expect(result).toEqual(personas);
            expect(mockPersonaStorage.getAllPersonas).toHaveBeenCalled();
        });
    });
    describe('getPersonaById', () => {
        it('should return a persona by ID', async () => {
            mockPersonaStorage.getPersonaById.mockReturnValue(mockPersona);
            const result = await personasService.getPersonaById('123');
            expect(result).toEqual(mockPersona);
            expect(mockPersonaStorage.getPersonaById).toHaveBeenCalledWith('123');
        });
        it('should return undefined if persona not found', async () => {
            mockPersonaStorage.getPersonaById.mockReturnValue(undefined);
            const result = await personasService.getPersonaById('999');
            expect(result).toBeUndefined();
            expect(mockPersonaStorage.getPersonaById).toHaveBeenCalledWith('999');
        });
    });
    describe('searchPersonas', () => {
        it('should search personas by query', async () => {
            const personas = [mockPersona];
            mockPersonaStorage.searchPersonas.mockReturnValue(personas);
            const result = await personasService.searchPersonas({ query: 'Test' });
            expect(result).toEqual(personas);
            expect(mockPersonaStorage.searchPersonas).toHaveBeenCalledWith('Test');
        });
    });
    describe('createPersona', () => {
        it('should create a new persona', async () => {
            mockPersonaStorage.createPersona.mockResolvedValue(mockPersona);
            const result = await personasService.createPersona({
                name: 'Test User',
                attributes: { age: '30', occupation: 'Developer' },
            });
            expect(result).toEqual(mockPersona);
            expect(mockPersonaStorage.createPersona).toHaveBeenCalledWith('Test User', {
                age: '30',
                occupation: 'Developer',
            });
        });
    });
    describe('updatePersona', () => {
        it('should update an existing persona', async () => {
            const updatedPersona = { ...mockPersona, name: 'Updated User' };
            mockPersonaStorage.updatePersona.mockResolvedValue(updatedPersona);
            const result = await personasService.updatePersona({
                id: '123',
                updates: { name: 'Updated User' },
            });
            expect(result).toEqual(updatedPersona);
            expect(mockPersonaStorage.updatePersona).toHaveBeenCalledWith('123', {
                name: 'Updated User',
            });
        });
        it('should return undefined if persona not found', async () => {
            mockPersonaStorage.updatePersona.mockResolvedValue(undefined);
            const result = await personasService.updatePersona({
                id: '999',
                updates: { name: 'Updated User' },
            });
            expect(result).toBeUndefined();
        });
    });
    describe('deletePersona', () => {
        it('should delete a persona', async () => {
            mockPersonaStorage.deletePersona.mockResolvedValue(true);
            const result = await personasService.deletePersona({ id: '123' });
            expect(result).toBe(true);
            expect(mockPersonaStorage.deletePersona).toHaveBeenCalledWith('123');
        });
        it('should return false if persona not found', async () => {
            mockPersonaStorage.deletePersona.mockResolvedValue(false);
            const result = await personasService.deletePersona({ id: '999' });
            expect(result).toBe(false);
        });
    });
    describe('generatePrompt', () => {
        it('should generate a prompt for a persona', async () => {
            const prompt = 'Create a backstory for Test User';
            mockPersonaStorage.getPersonaById.mockReturnValue(mockPersona);
            mockPersonaStorage.generatePrompt.mockReturnValue(prompt);
            const result = await personasService.generatePrompt('123');
            expect(result).toBe(prompt);
            expect(mockPersonaStorage.getPersonaById).toHaveBeenCalledWith('123');
            expect(mockPersonaStorage.generatePrompt).toHaveBeenCalledWith(mockPersona);
        });
        it('should throw error if persona not found', async () => {
            mockPersonaStorage.getPersonaById.mockReturnValue(undefined);
            await expect(personasService.generatePrompt('999')).rejects.toThrow('Persona with id 999 not found');
        });
    });
    describe('generateBackstory', () => {
        it('should generate a backstory using AI', async () => {
            const prompt = 'Create a backstory for Test User';
            const backstory = 'This is a generated backstory';
            mockPersonaStorage.getPersonaById.mockReturnValue(mockPersona);
            mockPersonaStorage.generatePrompt.mockReturnValue(prompt);
            mockAiProvider.chat.mockResolvedValue({ text: backstory });
            mockPersonaStorage.updatePersona.mockResolvedValue({
                ...mockPersona,
                backstory,
            });
            const result = await personasService.generateBackstory('123');
            expect(result).toBe(backstory);
            expect(mockAiProvider.chat).toHaveBeenCalled();
            expect(mockPersonaStorage.updatePersona).toHaveBeenCalledWith('123', {
                backstory,
            });
        });
        it('should throw error if persona not found', async () => {
            mockPersonaStorage.getPersonaById.mockReturnValue(undefined);
            await expect(personasService.generateBackstory('999')).rejects.toThrow('Persona with id 999 not found');
        });
    });
});
//# sourceMappingURL=PersonasService.test.js.map