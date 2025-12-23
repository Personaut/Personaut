import { PersonasService } from './PersonasService';
import { PersonaFileStorage } from './PersonaFileStorage';
import { Persona } from '../types/PersonaFileTypes';

// Mock PersonaFileStorage
jest.mock('./PersonaFileStorage');

describe('PersonasService', () => {
  let personasService: PersonasService;
  let mockPersonaStorage: jest.Mocked<PersonaFileStorage>;

  const mockPersona: Persona = {
    id: '123',
    name: 'Test User',
    attributes: {
      age: '30',
      occupation: 'Developer',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versionNumber: 1,
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
      regeneratePersona: jest.fn(),
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      toggleFavorite: jest.fn(),
      getFavorites: jest.fn(),
    } as any;

    personasService = new PersonasService(mockPersonaStorage);
  });

  describe('getPersonas', () => {
    it('should return all personas', async () => {
      const personas = [mockPersona];
      mockPersonaStorage.getAllPersonas.mockResolvedValue(personas);

      const result = await personasService.getPersonas();

      expect(result).toEqual(personas);
      expect(mockPersonaStorage.getAllPersonas).toHaveBeenCalled();
    });
  });

  describe('getPersonaById', () => {
    it('should return persona by id', async () => {
      mockPersonaStorage.getPersonaById.mockResolvedValue(mockPersona);

      const result = await personasService.getPersonaById('123');

      expect(result).toEqual(mockPersona);
      expect(mockPersonaStorage.getPersonaById).toHaveBeenCalledWith('123');
    });

    it('should return null if persona not found', async () => {
      mockPersonaStorage.getPersonaById.mockResolvedValue(null);

      const result = await personasService.getPersonaById('999');

      expect(result).toBeNull();
      expect(mockPersonaStorage.getPersonaById).toHaveBeenCalledWith('999');
    });
  });

  describe('searchPersonas', () => {
    it('should search personas by query', async () => {
      const personas = [mockPersona];
      mockPersonaStorage.searchPersonas.mockResolvedValue(personas);

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

    it('should return null if persona not found', async () => {
      mockPersonaStorage.updatePersona.mockResolvedValue(null);

      const result = await personasService.updatePersona({
        id: '999',
        updates: { name: 'Updated User' },
      });

      expect(result).toBeNull();
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
      const prompt = 'You are Test User, a 30-year-old Developer.';
      mockPersonaStorage.getPersonaById.mockResolvedValue(mockPersona);
      mockPersonaStorage.generatePrompt.mockReturnValue(prompt);

      const result = await personasService.generatePrompt('123');

      expect(result).toBe(prompt);
      expect(mockPersonaStorage.getPersonaById).toHaveBeenCalledWith('123');
      expect(mockPersonaStorage.generatePrompt).toHaveBeenCalledWith(mockPersona);
    });

    it('should return null if persona not found', async () => {
      mockPersonaStorage.getPersonaById.mockResolvedValue(null);

      const result = await personasService.generatePrompt('999');

      expect(result).toBeNull();
    });
  });

  describe('favorites', () => {
    it('should add a favorite', async () => {
      mockPersonaStorage.addFavorite.mockResolvedValue(undefined);

      await personasService.addFavorite('123');

      expect(mockPersonaStorage.addFavorite).toHaveBeenCalledWith('123');
    });

    it('should remove a favorite', async () => {
      mockPersonaStorage.removeFavorite.mockResolvedValue(undefined);

      await personasService.removeFavorite('123');

      expect(mockPersonaStorage.removeFavorite).toHaveBeenCalledWith('123');
    });

    it('should toggle a favorite', async () => {
      mockPersonaStorage.toggleFavorite.mockResolvedValue(true);

      const result = await personasService.toggleFavorite('123');

      expect(result).toBe(true);
      expect(mockPersonaStorage.toggleFavorite).toHaveBeenCalledWith('123');
    });

    it('should get all favorites', async () => {
      const favorites = [mockPersona];
      mockPersonaStorage.getFavorites.mockResolvedValue(favorites);

      const result = await personasService.getFavorites();

      expect(result).toEqual(favorites);
      expect(mockPersonaStorage.getFavorites).toHaveBeenCalled();
    });
  });

  describe('regeneratePersona', () => {
    it('should regenerate a persona with version increment', async () => {
      const regeneratedPersona = { ...mockPersona, versionNumber: 2 };
      mockPersonaStorage.regeneratePersona.mockResolvedValue(regeneratedPersona);

      const result = await personasService.regeneratePersona('123', { name: 'New Name' });

      expect(result).toEqual(regeneratedPersona);
      expect(mockPersonaStorage.regeneratePersona).toHaveBeenCalledWith('123', { name: 'New Name' });
    });

    it('should work without updates', async () => {
      const regeneratedPersona = { ...mockPersona, versionNumber: 2 };
      mockPersonaStorage.regeneratePersona.mockResolvedValue(regeneratedPersona);

      const result = await personasService.regeneratePersona('123');

      expect(result).toEqual(regeneratedPersona);
      expect(mockPersonaStorage.regeneratePersona).toHaveBeenCalledWith('123', {});
    });
  });

  describe('generateBackstory', () => {
    it('should throw if persona not found', async () => {
      mockPersonaStorage.getPersonaById.mockResolvedValue(null);

      await expect(personasService.generateBackstory('999')).rejects.toThrow('Persona with id 999 not found');
    });

    it('should return existing backstory if no agentManager', async () => {
      const personaWithBackstory = { ...mockPersona, backstory: 'Existing backstory' };
      mockPersonaStorage.getPersonaById.mockResolvedValue(personaWithBackstory);

      const result = await personasService.generateBackstory('123');

      expect(result).toBe('Existing backstory');
    });

    it('should return null if no agentManager and no backstory', async () => {
      mockPersonaStorage.getPersonaById.mockResolvedValue(mockPersona);

      const result = await personasService.generateBackstory('123');

      expect(result).toBeNull();
    });
  });
});
