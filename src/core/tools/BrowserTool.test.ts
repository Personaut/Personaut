import { BrowserTool } from './BrowserTool';
import { URLValidator } from '../../shared/services/URLValidator';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

describe('BrowserTool', () => {
  let browserTool: BrowserTool;
  let urlValidator: URLValidator;

  beforeEach(() => {
    browserTool = new BrowserTool();
    urlValidator = new URLValidator();
    browserTool.setContext({ urlValidator });
  });

  afterEach(async () => {
    await browserTool.dispose();
  });

  describe('URL validation', () => {
    it('should reject empty URL', async () => {
      const result = await browserTool.execute({ action: 'launch', url: '' });

      expect(result).toContain('Error: URL is required');
    });

    it('should reject invalid URL format', async () => {
      const result = await browserTool.execute({ action: 'launch', url: 'not-a-url' });

      expect(result).toContain('Error: URL blocked');
    });

    it('should reject internal network addresses by default', async () => {
      const result = await browserTool.execute({ action: 'launch', url: 'http://localhost:3000' });

      expect(result).toContain('Error: URL blocked');
    });
  });

  describe('Action handling', () => {
    it('should reject missing action', async () => {
      const result = await browserTool.execute({});

      expect(result).toContain("Error: Missing 'action' attribute");
    });

    it('should reject unknown action', async () => {
      const result = await browserTool.execute({ action: 'unknown' });

      expect(result).toContain("Error: Unknown action 'unknown'");
    });

    it('should handle close action', async () => {
      const result = await browserTool.execute({ action: 'close' });

      expect(result).toBe('Browser closed.');
    });
  });

  describe('Browser state', () => {
    it('should report browser as closed initially', () => {
      expect(browserTool.isOpen()).toBe(false);
    });
  });
});
