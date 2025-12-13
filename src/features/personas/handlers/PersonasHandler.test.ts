import * as vscode from 'vscode';
import { PersonasHandler } from './PersonasHandler';
import { PersonasService } from '../services/PersonasService';
import { InputValidator } from '../../../shared/services';
import { Persona } from '../../../shared/services';

// Mock dependencies
jest.mock('../services/PersonasService');

describe('PersonasHandler', () => {
  let personasHandler: PersonasHandler;
  let mockPersonasService: jest.Mocked<PersonasService>;
  let mockInputValidator: jest.Mocked<InputValidator>;
  let mockWebview: jest.Mocked<vscode.Webview>;

  const mockPersona: Persona = {
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
    mockPersonasService = {
      getPersonas: jest.fn(),
      getPersonaById: jest.fn(),
      searchPersonas: jest.fn(),
      createPersona: jest.fn(),
      updatePersona: jest.fn(),
      deletePersona: jest.fn(),
      generatePrompt: jest.fn(),
      generateBackstory: jest.fn(),
    } as any;

    mockInputValidator = {
      validateInput: jest.fn().mockReturnValue({ valid: true }),
    } as any;

    mockWebview = {
      postMessage: jest.fn(),
    } as any;

    personasHandler = new PersonasHandler(mockPersonasService, mockInputValidator);
  });

  describe('handle - get-personas', () => {
    it('should get all personas', async () => {
      const personas = [mockPersona];
      mockPersonasService.getPersonas.mockResolvedValue(personas);

      await personasHandler.handle({ type: 'get-personas' }, mockWebview);

      expect(mockPersonasService.getPersonas).toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'personas-loaded',
        personas,
      });
    });
  });

  describe('handle - get-persona', () => {
    it('should get a persona by ID', async () => {
      mockPersonasService.getPersonaById.mockResolvedValue(mockPersona);

      await personasHandler.handle({ type: 'get-persona', id: '123' }, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('123');
      expect(mockPersonasService.getPersonaById).toHaveBeenCalledWith('123');
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'persona-details',
        persona: mockPersona,
      });
    });

    it('should handle invalid persona ID', async () => {
      mockInputValidator.validateInput.mockReturnValue({
        valid: false,
        reason: 'Invalid ID',
      });

      await personasHandler.handle({ type: 'get-persona', id: '' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });

    it('should handle persona not found', async () => {
      mockPersonasService.getPersonaById.mockResolvedValue(undefined);

      await personasHandler.handle({ type: 'get-persona', id: '999' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('handle - search-personas', () => {
    it('should search personas by query', async () => {
      const personas = [mockPersona];
      mockPersonasService.searchPersonas.mockResolvedValue(personas);

      await personasHandler.handle({ type: 'search-personas', query: 'Test' }, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('Test');
      expect(mockPersonasService.searchPersonas).toHaveBeenCalledWith({ query: 'Test' });
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'personas-search-results',
        personas,
      });
    });

    it('should handle invalid search query', async () => {
      mockInputValidator.validateInput.mockReturnValue({
        valid: false,
        reason: 'Invalid query',
      });

      await personasHandler.handle({ type: 'search-personas', query: '' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('handle - create-persona', () => {
    it('should create a new persona', async () => {
      const data = {
        name: 'Test User',
        attributes: { age: '30', occupation: 'Developer' },
      };
      mockPersonasService.createPersona.mockResolvedValue(mockPersona);

      await personasHandler.handle({ type: 'create-persona', data }, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('Test User');
      expect(mockPersonasService.createPersona).toHaveBeenCalledWith(data);
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'persona-created',
        persona: mockPersona,
      });
    });

    it('should handle invalid persona name', async () => {
      mockInputValidator.validateInput.mockReturnValue({
        valid: false,
        reason: 'Invalid name',
      });

      await personasHandler.handle(
        {
          type: 'create-persona',
          data: { name: '', attributes: {} },
        },
        mockWebview
      );

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });

    it('should handle invalid attributes', async () => {
      await personasHandler.handle(
        {
          type: 'create-persona',
          data: { name: 'Test', attributes: null },
        },
        mockWebview
      );

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('handle - update-persona', () => {
    it('should update an existing persona', async () => {
      const updates = { name: 'Updated User' };
      const updatedPersona = { ...mockPersona, name: 'Updated User' };
      mockPersonasService.updatePersona.mockResolvedValue(updatedPersona);

      await personasHandler.handle({ type: 'update-persona', id: '123', updates }, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('123');
      expect(mockPersonasService.updatePersona).toHaveBeenCalledWith({
        id: '123',
        updates,
      });
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'persona-updated',
        persona: updatedPersona,
      });
    });

    it('should handle invalid persona ID', async () => {
      mockInputValidator.validateInput.mockReturnValue({
        valid: false,
        reason: 'Invalid ID',
      });

      await personasHandler.handle({ type: 'update-persona', id: '', updates: {} }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });

    it('should handle persona not found', async () => {
      mockPersonasService.updatePersona.mockResolvedValue(undefined);

      await personasHandler.handle({ type: 'update-persona', id: '999', updates: {} }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('handle - delete-persona', () => {
    it('should delete a persona', async () => {
      mockPersonasService.deletePersona.mockResolvedValue(true);

      await personasHandler.handle({ type: 'delete-persona', id: '123' }, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('123');
      expect(mockPersonasService.deletePersona).toHaveBeenCalledWith({ id: '123' });
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'persona-deleted',
        id: '123',
      });
    });

    it('should handle invalid persona ID', async () => {
      mockInputValidator.validateInput.mockReturnValue({
        valid: false,
        reason: 'Invalid ID',
      });

      await personasHandler.handle({ type: 'delete-persona', id: '' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });

    it('should handle persona not found', async () => {
      mockPersonasService.deletePersona.mockResolvedValue(false);

      await personasHandler.handle({ type: 'delete-persona', id: '999' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('handle - generate-persona-prompt', () => {
    it('should generate a prompt for a persona', async () => {
      const prompt = 'Create a backstory for Test User';
      mockPersonasService.generatePrompt.mockResolvedValue(prompt);

      await personasHandler.handle({ type: 'generate-persona-prompt', id: '123' }, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('123');
      expect(mockPersonasService.generatePrompt).toHaveBeenCalledWith('123');
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'persona-prompt-generated',
        id: '123',
        prompt,
      });
    });

    it('should handle invalid persona ID', async () => {
      mockInputValidator.validateInput.mockReturnValue({
        valid: false,
        reason: 'Invalid ID',
      });

      await personasHandler.handle({ type: 'generate-persona-prompt', id: '' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('handle - generate-persona-backstory', () => {
    it('should generate a backstory for a persona', async () => {
      const backstory = 'This is a generated backstory';
      const mockPersona = {
        id: '123',
        name: 'Test User',
        attributes: { age: '30' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        backstory,
      };
      
      mockPersonasService.generateBackstory.mockResolvedValue(backstory);
      mockPersonasService.getPersonaById.mockResolvedValue(mockPersona);

      await personasHandler.handle({ type: 'generate-persona-backstory', id: '123' }, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('123');
      expect(mockPersonasService.generateBackstory).toHaveBeenCalledWith('123');
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'backstory-generated',
        id: '123',
        backstory,
        persona: mockPersona,
      });
    });

    it('should handle invalid persona ID', async () => {
      mockInputValidator.validateInput.mockReturnValue({
        valid: false,
        reason: 'Invalid ID',
      });

      await personasHandler.handle({ type: 'generate-persona-backstory', id: '' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('handle - generate-backstory (alias)', () => {
    it('should generate a backstory for a persona using the generate-backstory alias', async () => {
      const backstory = 'This is a generated backstory';
      const mockPersona = {
        id: '123',
        name: 'Test User',
        attributes: { age: '30' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        backstory,
      };
      
      mockPersonasService.generateBackstory.mockResolvedValue(backstory);
      mockPersonasService.getPersonaById.mockResolvedValue(mockPersona);

      await personasHandler.handle({ type: 'generate-backstory', id: '123' }, mockWebview);

      expect(mockInputValidator.validateInput).toHaveBeenCalledWith('123');
      expect(mockPersonasService.generateBackstory).toHaveBeenCalledWith('123');
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'backstory-generated',
        id: '123',
        backstory,
        persona: mockPersona,
      });
    });
  });

  describe('handle - unknown message type', () => {
    it('should handle unknown message type', async () => {
      await personasHandler.handle({ type: 'unknown-type' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('error handling', () => {
    it('should sanitize and send errors to webview', async () => {
      mockPersonasService.getPersonas.mockRejectedValue(new Error('Database error'));

      await personasHandler.handle({ type: 'get-personas' }, mockWebview);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'error',
        message: expect.any(String),
      });
    });
  });
});
